"""NovaTrade — Sentiment analysis service via Gemma 4 or fallback."""

import httpx
from config import OLLAMA_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, STOCK_UNIVERSE


async def get_sentiment(symbol: str) -> dict:
    """Get AI-analyzed sentiment for a stock. Uses Gemma 4 via Ollama and yfinance news."""
    info = STOCK_UNIVERSE.get(symbol)
    if not info:
        return {"sentiment": "neutral", "confidence": 0, "summary": "Unknown stock"}

    news_text = ""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        news_items = ticker.news
        if news_items:
            for item in news_items[:8]:
                title = item.get("title", "")
                publisher = item.get("publisher", "")
                news_text += f"- [{publisher}] {title}\n"
    except Exception as e:
        print(f"Error fetching news for {symbol}: {e}")

    prompt = f"""Analyze the current market sentiment for {info['name']} ({symbol}) in the {info['sector']} sector.

Recent News:
{news_text if news_text else "No recent news available."}

Based on your knowledge and the news provided above, provide:
1. Overall sentiment: bullish, bearish, or neutral
2. Confidence: high, medium, or low
3. Brief 1-sentence summary summarizing the sentiment and news.

Respond in this exact JSON format only:
{{"sentiment": "bullish|bearish|neutral", "confidence": "high|medium|low", "summary": "..."}}"""

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {"temperature": 0, "num_ctx": 2048},
                },
            )
            response.raise_for_status()
            result = response.json()
            content = result.get("message", {}).get("content", "")

            # Try to parse JSON from response
            import json
            # Find JSON in response
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end > start:
                parsed = json.loads(content[start:end])
                return {
                    "symbol": symbol,
                    "sentiment": parsed.get("sentiment", "neutral"),
                    "confidence": parsed.get("confidence", "medium"),
                    "summary": parsed.get("summary", "No summary available"),
                }

    except Exception:
        pass

    # Fallback — return neutral sentiment
    return {
        "symbol": symbol,
        "sentiment": "neutral",
        "confidence": "low",
        "summary": f"Unable to analyze sentiment for {symbol} at this time.",
    }
