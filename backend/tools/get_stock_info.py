"""Tool: get_stock_info — Get price, indicators, and stats for a stock."""

from services.market_service import fetch_stock_data


def run(symbol: str) -> dict:
    symbol = symbol.upper()
    data = fetch_stock_data(symbol)

    if "error" in data:
        return data

    # Return without full history (too large for LLM context)
    return {
        "symbol": data["symbol"],
        "name": data["name"],
        "sector": data["sector"],
        "price": data["price"],
        "change_pct": data["change_pct"],
        "day_high": data["day_high"],
        "day_low": data["day_low"],
        "volume": data["volume"],
        "market_cap": data["market_cap"],
        "rsi": data["rsi"],
        "sma_50": data["sma_50"],
        "ema_12": data["ema_12"],
        "ema_26": data["ema_26"],
    }
