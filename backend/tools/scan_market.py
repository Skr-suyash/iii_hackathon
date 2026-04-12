"""Tool: scan_market — Scan stocks by price, sector, or condition."""

from services.market_service import fetch_stock_data
from config import STOCK_UNIVERSE


def run(
    max_price: str | float | None = None,
    sector: str = None,
    condition: str = None,
) -> dict:
    if max_price is not None:
        try:
            max_price = float(max_price)
        except ValueError:
            max_price = None

    results = []

    for symbol, info in STOCK_UNIVERSE.items():
        # Sector filter
        if sector and info["sector"].lower() != sector.lower():
            continue

        data = fetch_stock_data(symbol)
        if "error" in data:
            continue

        # Price filter
        if max_price and data["price"] > max_price:
            continue

        # Condition filter
        if condition:
            if condition == "oversold" and (data["rsi"] is None or data["rsi"] > 30):
                continue
            elif condition == "overbought" and (data["rsi"] is None or data["rsi"] < 70):
                continue
            # bullish/bearish sentiment — include all for now, let copilot handle

        results.append({
            "symbol": data["symbol"],
            "name": data["name"],
            "sector": data["sector"],
            "price": data["price"],
            "change_pct": data["change_pct"],
            "rsi": data["rsi"],
        })

    return {
        "count": len(results),
        "stocks": results[:10],  # Limit to 10 for LLM context
        "filters_applied": {
            "max_price": max_price,
            "sector": sector,
            "condition": condition,
        },
    }
