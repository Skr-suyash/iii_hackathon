"""Tool: get_sentiment — Get AI-analyzed sentiment for a stock."""

from services.sentiment_service import get_sentiment as _get_sentiment


async def run(symbol: str) -> dict:
    symbol = symbol.upper()
    return await _get_sentiment(symbol)
