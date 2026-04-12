"""NovaTrade — ML-powered portfolio risk scoring using K-Means + PCA.

Replaces the naive sector-count + max-holding risk score with a data-driven
approach that clusters stocks by actual price behavior, then measures
portfolio concentration across behavioral clusters using HHI.
"""

import time
import threading
import logging
import numpy as np
import pandas as pd
import yfinance as yf
from collections import Counter
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from config import STOCK_UNIVERSE

logger = logging.getLogger("novatrade.risk")

# ---------------------------------------------------------------------------
# Cache the cluster model (recompute every 5 minutes)
# ---------------------------------------------------------------------------
_cluster_cache: dict = {"model": None, "timestamp": 0}
_cluster_lock = threading.Lock()
CLUSTER_CACHE_TTL = 300  # seconds


# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------
def _fetch_universe_prices(period: str = "1y") -> pd.DataFrame:
    """Fetch adjusted close prices for all stocks in the universe."""
    tickers = list(STOCK_UNIVERSE.keys())
    data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        prices = data["Close"]
    else:
        prices = data[["Close"]]
        prices.columns = tickers
    return prices.ffill().dropna()


# ---------------------------------------------------------------------------
# Clustering engine
# ---------------------------------------------------------------------------
def _cluster_universe(period: str = "1y") -> dict:
    """Cluster all stocks by behavioral similarity using K-Means + PCA.

    Returns a cached model dict with:
    - stock_to_cluster: {ticker: cluster_id}
    - stock_positions:  {ticker: {x, y}} (PCA 2-D coordinates)
    - clusters:         {cluster_id: {name, stocks, color, centroid_2d}}
    - centroids_3d:     raw KMeans centroids
    """
    with _cluster_lock:
        if (
            _cluster_cache["model"] is not None
            and time.time() - _cluster_cache["timestamp"] < CLUSTER_CACHE_TTL
        ):
            return _cluster_cache["model"]

    logger.info("Recomputing stock clusters …")
    prices = _fetch_universe_prices(period)
    returns = prices.pct_change().dropna()

    # Transpose so stocks = rows, dates = features
    X = returns.T
    valid_tickers = list(X.index)

    # Standardize + PCA
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    n_components_3d = min(3, len(valid_tickers) - 1)
    pca_3d = PCA(n_components=n_components_3d)
    X_pca_3d = pca_3d.fit_transform(X_scaled)

    pca_2d = PCA(n_components=2)
    X_pca_2d = pca_2d.fit_transform(X_scaled)

    # K-Means
    n_clusters = min(5, len(valid_tickers))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_pca_3d)

    stock_to_cluster = dict(zip(valid_tickers, [int(c) for c in cluster_labels]))
    stock_positions = {
        ticker: {"x": float(X_pca_2d[i, 0]), "y": float(X_pca_2d[i, 1])}
        for i, ticker in enumerate(valid_tickers)
    }

    # Build per-cluster metadata
    cluster_colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"]
    clusters: dict = {}
    for c_id in range(n_clusters):
        stocks_in = [t for t, c in stock_to_cluster.items() if c == c_id]
        if not stocks_in:
            continue
        centroid_2d = np.mean(
            [list(stock_positions[s].values()) for s in stocks_in], axis=0
        )
        clusters[str(c_id)] = {
            "name": _name_cluster(stocks_in, returns),
            "stocks": stocks_in,
            "color": cluster_colors[c_id % len(cluster_colors)],
            "centroid_2d": centroid_2d.tolist(),
        }

    model = {
        "stock_to_cluster": stock_to_cluster,
        "stock_positions": stock_positions,
        "clusters": clusters,
        "centroids_3d": kmeans.cluster_centers_.tolist(),
    }

    with _cluster_lock:
        _cluster_cache["model"] = model
        _cluster_cache["timestamp"] = time.time()

    logger.info("Clustering complete — %d clusters from %d stocks", n_clusters, len(valid_tickers))
    return model


def _name_cluster(stocks: list[str], returns: pd.DataFrame) -> str:
    """Auto-name a cluster by its dominant sector + volatility descriptor."""
    if not stocks:
        return "Empty"

    sectors = [STOCK_UNIVERSE.get(s, {}).get("sector", "Unknown") for s in stocks]
    dominant_sector = Counter(sectors).most_common(1)[0][0]

    # Average daily volatility of cluster members
    avg_vol = float(returns[stocks].std().mean()) if stocks else 0

    if avg_vol > 0.025:
        prefix = "High-Growth"
    elif avg_vol < 0.015:
        prefix = "Defensive"
    else:
        prefix = ""

    return f"{prefix} {dominant_sector}".strip()


# ---------------------------------------------------------------------------
# HHI-based risk score
# ---------------------------------------------------------------------------
def _compute_hhi_risk_score(
    user_holdings: dict[str, float],
    stock_to_cluster: dict[str, int],
) -> tuple[int, float, dict]:
    """Compute risk score from cluster concentration using HHI.

    Returns
    -------
    risk_score : int
        0-100 (higher = riskier / more concentrated).
    diversification_score : float
        0-1 (higher = more diversified).
    cluster_weights : dict
        {cluster_id: {"weight": float, "holdings": [str]}}
    """
    total_value = sum(user_holdings.values())
    if total_value == 0:
        return 0, 1.0, {}

    cluster_values: dict[int, float] = {}
    cluster_holdings: dict[int, list] = {}
    for symbol, value in user_holdings.items():
        cluster_id = stock_to_cluster.get(symbol)
        if cluster_id is not None:
            cluster_values[cluster_id] = cluster_values.get(cluster_id, 0) + value
            cluster_holdings.setdefault(cluster_id, []).append(symbol)

    # HHI = sum of squared cluster weight fractions
    cluster_weights: dict = {}
    hhi = 0.0
    for c_id, val in cluster_values.items():
        weight = val / total_value
        cluster_weights[str(c_id)] = {
            "weight": round(weight, 4),
            "holdings": cluster_holdings.get(c_id, []),
        }
        hhi += weight ** 2

    diversification_score = round(1.0 - hhi, 4)

    # Scale HHI → 0-100 risk score
    n_clusters = len(set(stock_to_cluster.values()))
    min_hhi = 1.0 / n_clusters if n_clusters > 0 else 0
    denom = 1.0 - min_hhi
    risk_score = int(((hhi - min_hhi) / denom) * 100) if denom > 0 else 0
    risk_score = max(0, min(100, risk_score))

    return risk_score, diversification_score, cluster_weights


# ---------------------------------------------------------------------------
# Advisor logic
# ---------------------------------------------------------------------------
def _generate_advice(
    user_holdings: dict[str, float],
    cluster_model: dict,
    risk_score: int,
    cluster_weights: dict,
) -> list[dict]:
    """Generate personalized portfolio advice based on cluster analysis."""
    advice: list[dict] = []
    clusters = cluster_model["clusters"]
    total_value = sum(user_holdings.values())
    if total_value == 0 or not cluster_weights:
        return advice

    # --- 1. Over-concentration warning ---
    heaviest_id = max(cluster_weights, key=lambda k: cluster_weights[k]["weight"])
    heaviest_weight = cluster_weights[heaviest_id]["weight"]
    heaviest_name = clusters.get(heaviest_id, {}).get("name", f"Cluster {heaviest_id}")
    heaviest_stocks = cluster_weights[heaviest_id]["holdings"]

    if heaviest_weight > 0.5:
        advice.append({
            "type": "warning",
            "title": f"Over-Concentrated in {heaviest_name} ({int(heaviest_weight * 100)}%)",
            "message": (
                f"Your portfolio is {int(heaviest_weight * 100)}% concentrated in assets "
                f"that move like {heaviest_name} ({', '.join(heaviest_stocks)}). "
                f"A single sector downturn could hit hard."
            ),
            "severity": "high",
        })

    # --- 2. Find empty clusters and suggest the most distant one ---
    empty_clusters = [
        c_id
        for c_id in clusters
        if c_id not in cluster_weights or cluster_weights.get(c_id, {}).get("weight", 0) == 0
    ]

    best_cluster = None
    if empty_clusters:
        heaviest_centroid = np.array(
            clusters.get(heaviest_id, {}).get("centroid_2d", [0, 0])
        )
        max_dist = -1.0
        for c_id in empty_clusters:
            centroid = np.array(clusters[c_id].get("centroid_2d", [0, 0]))
            dist = float(np.linalg.norm(centroid - heaviest_centroid))
            if dist > max_dist:
                max_dist = dist
                best_cluster = c_id

        if best_cluster:
            distant_name = clusters[best_cluster]["name"]
            distant_stocks = clusters[best_cluster]["stocks"][:3]
            advice.append({
                "type": "suggestion",
                "title": f"Add {distant_name} Exposure",
                "message": (
                    f"Consider adding {' or '.join(distant_stocks)} — these have "
                    f"historically moved independently of your current holdings."
                ),
                "tickers": distant_stocks,
                "severity": "medium",
            })

    # --- 3. Wildcard: another uncovered cluster ---
    for c_id in empty_clusters:
        if c_id == best_cluster:
            continue
        cluster_name = clusters[c_id]["name"]
        cluster_stocks = clusters[c_id]["stocks"][:2]
        if cluster_stocks:
            advice.append({
                "type": "wildcard",
                "title": f"Zero {cluster_name} Exposure",
                "message": (
                    f"You have no exposure to {cluster_name}. A small position in "
                    f"{' or '.join(cluster_stocks)} could improve risk-adjusted returns."
                ),
                "tickers": cluster_stocks,
                "severity": "low",
            })
            break  # Only one wildcard

    return advice


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def analyze_portfolio_risk(
    user_holdings: dict[str, float],
    period: str = "1y",
) -> dict:
    """Full ML risk analysis: clustering, HHI scoring, and personalized advice.

    Parameters
    ----------
    user_holdings : dict
        Mapping of ticker → dollar value currently held.
    period : str
        yfinance lookback window for price data.

    Returns
    -------
    dict with risk_score, risk_label, diversification_score, clusters,
    portfolio_cluster_weights, stock_positions, and advice.
    """
    if not user_holdings:
        return {
            "risk_score": 0,
            "risk_label": "N/A",
            "diversification_score": 1.0,
            "clusters": {},
            "portfolio_cluster_weights": {},
            "stock_positions": [],
            "advice": [],
        }

    # Cluster the full universe
    cluster_model = _cluster_universe(period)

    # Compute concentration-based risk score
    risk_score, div_score, cluster_weights = _compute_hhi_risk_score(
        user_holdings, cluster_model["stock_to_cluster"]
    )

    # Generate natural-language advice
    advice = _generate_advice(user_holdings, cluster_model, risk_score, cluster_weights)

    # Risk label
    if risk_score <= 33:
        risk_label = "Low"
    elif risk_score <= 66:
        risk_label = "Moderate"
    else:
        risk_label = "High"

    # Build scatter-plot data
    stock_positions = []
    for ticker, pos in cluster_model["stock_positions"].items():
        stock_positions.append({
            "ticker": ticker,
            "x": round(pos["x"], 4),
            "y": round(pos["y"], 4),
            "cluster": cluster_model["stock_to_cluster"].get(ticker, -1),
            "in_portfolio": ticker in user_holdings,
        })

    return {
        "risk_score": risk_score,
        "risk_label": risk_label,
        "diversification_score": div_score,
        "clusters": cluster_model["clusters"],
        "portfolio_cluster_weights": cluster_weights,
        "stock_positions": stock_positions,
        "advice": advice,
    }
