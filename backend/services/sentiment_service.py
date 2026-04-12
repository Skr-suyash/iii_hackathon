"""NovaTrade — Sentiment analysis service via ProsusAI/FinBERT.

Replaces the previous Ollama/Gemma 4 approach with a lightweight, purpose-built
financial sentiment classification model (~210 MB, <100 ms per batch).
"""

import logging
import time
import asyncio

import yfinance as yf
from config import STOCK_UNIVERSE

logger = logging.getLogger("novatrade.sentiment")

# ---------------------------------------------------------------------------
# Lazy-loaded FinBERT pipeline (singleton, stays resident after first call)
# ---------------------------------------------------------------------------
_finbert_pipeline = None

LABEL_MAP = {
    "positive": "bullish",
    "negative": "bearish",
    "neutral":  "neutral",
}


def _get_pipeline():
    """Load FinBERT on first use.  Kept out of module-level so the import
    doesn't block server startup while weights are downloading."""
    global _finbert_pipeline
    if _finbert_pipeline is None:
        logger.info("Loading ProsusAI/FinBERT model (first call — may download ~210 MB)…")
        from transformers import pipeline as hf_pipeline
        try:
            _finbert_pipeline = hf_pipeline(
                "sentiment-analysis",
                model="ProsusAI/finbert",
                device=0,          # GPU if available
                truncation=True,
            )
        except Exception:
            # Fallback to CPU if CUDA unavailable
            logger.warning("GPU unavailable, loading FinBERT on CPU.")
            _finbert_pipeline = hf_pipeline(
                "sentiment-analysis",
                model="ProsusAI/finbert",
                device=-1,
                truncation=True,
            )
        logger.info("FinBERT loaded successfully.")
    return _finbert_pipeline


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_sentiment_cache: dict = {}
CACHE_TTL = 1800  # 30 minutes


# ---------------------------------------------------------------------------
# Public API — identical return shape to the old Ollama-based service
# ---------------------------------------------------------------------------
async def get_sentiment(symbol: str) -> dict:
    """Classify recent news headlines for *symbol* using FinBERT.

    Returns: {"symbol", "sentiment", "confidence", "summary"}
    """
    now = time.time()
    cached = _sentiment_cache.get(symbol)
    if cached and (now - cached["timestamp"]) < CACHE_TTL:
        # Skip placeholder entries written by the watchlist router —
        # these must NOT short-circuit the actual FinBERT classification.
        if cached["data"].get("sentiment") != "loading":
            return cached["data"]

    info = STOCK_UNIVERSE.get(symbol)
    if not info:
        return {"symbol": symbol, "sentiment": "neutral", "confidence": 0, "summary": "Unknown stock"}

    # ---- 1. Fetch headlines via yfinance (in a thread to avoid blocking) ----
    headlines = await asyncio.to_thread(_fetch_headlines, symbol)

    if not headlines:
        fallback = {
            "symbol": symbol,
            "sentiment": "neutral",
            "confidence": 0.0,
            "summary": f"No recent news available for {info['name']}.",
        }
        _sentiment_cache[symbol] = {"data": fallback, "timestamp": time.time()}
        return fallback

    # ---- 2. Classify all headlines in one FinBERT batch ----
    result = await asyncio.to_thread(_classify_headlines, headlines)

    output = {
        "symbol": symbol,
        "sentiment": result["sentiment"],
        "confidence": result["confidence"],
        "summary": result["summary"],
    }
    _sentiment_cache[symbol] = {"data": output, "timestamp": time.time()}
    return output


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _fetch_headlines(symbol: str) -> list[str]:
    """Pull up to 8 headline strings from yfinance."""
    try:
        ticker = yf.Ticker(symbol)
        news_items = ticker.news or []
        titles = []
        for item in news_items[:8]:
            if "content" in item:
                title = (item.get("content") or {}).get("title", "")
            else:
                title = item.get("title", "")
            if title:
                titles.append(title)
        return titles
    except Exception as e:
        logger.error("Error fetching headlines for %s: %s", symbol, e)
        return []


def _classify_headlines(headlines: list[str]) -> dict:
    """Run FinBERT on a batch of headlines and aggregate the results."""
    pipe = _get_pipeline()
    results = pipe(headlines)  # [{label, score}, …]

    # Count weighted votes — dampen neutral heavily so directional signals surface.
    # FinBERT is conservative; most factual headlines score "neutral".
    # For a hackathon trading copilot demo, we want it to be highly sensitive
    # to directional signals (bullish/bearish), so we scale neutral votes down to 15%.
    NEUTRAL_DAMPEN = 0.15
    scores = {"bullish": 0.0, "bearish": 0.0, "neutral": 0.0}
    for i, res in enumerate(results):
        mapped = LABEL_MAP.get(res["label"], "neutral")
        # Weight more recent headlines slightly higher (first = newest)
        weight = 1.0 + (len(results) - i) * 0.1
        effective = res["score"] * weight
        if mapped == "neutral":
            effective *= NEUTRAL_DAMPEN
        scores[mapped] += effective

    # Winner takes all
    winner = max(scores, key=scores.get)

    # Confidence = normalised share of the winning label
    total = sum(scores.values()) or 1.0
    confidence = round(scores[winner] / total, 2)

    # Build a compact human-readable summary
    bull_count = sum(1 for r in results if LABEL_MAP.get(r["label"]) == "bullish")
    bear_count = sum(1 for r in results if LABEL_MAP.get(r["label"]) == "bearish")
    neut_count = len(results) - bull_count - bear_count

    summary = (
        f"Analyzed {len(results)} recent headlines: "
        f"{bull_count} bullish, {bear_count} bearish, {neut_count} neutral. "
        f"Overall sentiment is {winner} with {confidence:.0%} confidence."
    )

    return {"sentiment": winner, "confidence": confidence, "summary": summary}
