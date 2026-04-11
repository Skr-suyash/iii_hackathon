"""NovaTrade — Market data service with yfinance + caching."""

import time
import threading
from typing import Optional
import yfinance as yf
import pandas as pd

from config import STOCK_UNIVERSE, MARKET_CACHE_TTL

# In-memory cache: { symbol: { data: {...}, timestamp: float } }
_cache: dict = {}
_cache_lock = threading.Lock()


def _get_cached(symbol: str) -> Optional[dict]:
    with _cache_lock:
        entry = _cache.get(symbol)
        if entry and (time.time() - entry["timestamp"]) < MARKET_CACHE_TTL:
            return entry["data"]
    return None


def _set_cache(symbol: str, data: dict):
    with _cache_lock:
        _cache[symbol] = {"data": data, "timestamp": time.time()}


def fetch_stock_data(symbol: str) -> dict:
    """Fetch full stock data with indicators. Returns cached if fresh."""
    cached = _get_cached(symbol)
    if cached:
        return cached

    info = STOCK_UNIVERSE.get(symbol)
    if not info:
        return {"error": f"Unknown symbol: {symbol}"}

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="3mo")

        if hist.empty:
            return {"error": f"No market data available for {symbol}"}

        current_price = float(hist["Close"].iloc[-1])
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current_price
        change_pct = round(((current_price - prev_close) / prev_close) * 100, 2)

        # Technical indicators
        rsi = _compute_rsi(hist["Close"])
        sma_50 = float(hist["Close"].rolling(window=50).mean().iloc[-1]) if len(hist) >= 50 else None
        ema_12 = float(hist["Close"].ewm(span=12).mean().iloc[-1])
        ema_26 = float(hist["Close"].ewm(span=26).mean().iloc[-1])

        # Ticker info (may fail for some symbols)
        try:
            fast_info = ticker.fast_info
            volume = int(fast_info.get("lastVolume", 0))
            market_cap = int(fast_info.get("marketCap", 0))
        except Exception:
            volume = int(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else 0
            market_cap = 0

        # Build history for charts (last 60 days)
        history_list = []
        for date, row in hist.tail(60).iterrows():
            history_list.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        data = {
            "symbol": symbol,
            "name": info["name"],
            "sector": info["sector"],
            "price": round(current_price, 2),
            "change_pct": change_pct,
            "day_high": round(float(hist["High"].iloc[-1]), 2),
            "day_low": round(float(hist["Low"].iloc[-1]), 2),
            "volume": volume,
            "market_cap": market_cap,
            "rsi": round(rsi, 2) if rsi else None,
            "sma_50": round(sma_50, 2) if sma_50 else None,
            "ema_12": round(ema_12, 2),
            "ema_26": round(ema_26, 2),
            "history": history_list,
        }

        _set_cache(symbol, data)
        return data

    except Exception as e:
        return {"error": f"Failed to fetch data for {symbol}: {str(e)}"}


def fetch_chart_data(symbol: str, period: str = "6mo", interval: str = "auto") -> list[dict]:
    """Fetch OHLCV data formatted for KlineChart (timestamps in milliseconds)."""
    info = STOCK_UNIVERSE.get(symbol)
    if not info:
        return []
        
    if interval == "auto":
        # Smallest optimal intervals according to Yahoo Finance restrictions
        if period in ["1d", "5d"]:
            interval = "1m"
        elif period == "1mo":
            interval = "2m"
        elif period in ["3mo", "6mo", "1y"]:
            interval = "1h"
        else:
            interval = "1d"

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        if hist.empty:
            return []
            
        data = []
        for date, row in hist.iterrows():
            data.append({
                "timestamp": int(date.timestamp() * 1000),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        return data
    except Exception as e:
        print(f"Chart data error for {symbol}: {e}")
        return []


def fetch_all_prices() -> list[dict]:
    """Fetch summary prices for all stocks in the universe."""
    results = []
    for symbol in STOCK_UNIVERSE:
        data = fetch_stock_data(symbol)
        if "error" not in data:
            results.append({
                "symbol": data["symbol"],
                "name": data["name"],
                "price": data["price"],
                "change_pct": data["change_pct"],
                "sector": data["sector"],
            })
    return results


def get_indicator_value(symbol: str, indicator: str) -> Optional[float]:
    """Get a specific indicator value for condition monitoring."""
    data = fetch_stock_data(symbol)
    if "error" in data:
        return None

    if indicator == "price":
        return data["price"]
    elif indicator == "rsi":
        return data["rsi"]
    elif indicator == "sma":
        return data["sma_50"]
    elif indicator == "ema_crossover":
        # Return the difference EMA(12) - EMA(26)
        if data["ema_12"] and data["ema_26"]:
            return data["ema_12"] - data["ema_26"]
        return None
    return None


def _compute_rsi(closes: pd.Series, period: int = 14) -> Optional[float]:
    """Compute RSI using Wilder's smoothing method."""
    if len(closes) < period + 1:
        return None

    delta = closes.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.rolling(window=period).mean().iloc[-1]
    avg_loss = loss.rolling(window=period).mean().iloc[-1]

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))
