"""Tool: get_recent_news — Fetch real news headlines for the Copilot."""

from routers.news_router import fetch_ticker_news_async

async def run(symbol: str) -> dict:
    news = await fetch_ticker_news_async(symbol)
    if "error" in news:
        return {"error": news["error"]}
        
    if not news:
        return {"message": "No recent news found."}
        
    # Simplify the news payload for the LLM token limit window
    formatted_news = []
    # Take max 5 articles to prevent context window overflow
    for article in news[:5]:
        formatted_news.append({
            "title": article.get("title"),
            "publisher": article.get("publisher"),
            "time_published": article.get("providerPublishTime"),
        })

    return {
        "success": True,
        "symbol": symbol,
        "recent_news": formatted_news
    }
