"""NovaTrade — News router."""

import time
import asyncio
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import yfinance as yf
import uuid

from database import get_db
from models import User, Holding
from auth import get_current_user
from config import STOCK_UNIVERSE

router = APIRouter(prefix="/api/news", tags=["news"])

_news_cache = {}
CACHE_TTL = 900  # 15 minutes


async def fetch_ticker_news_async(symbol: str) -> list:
    """Fetch and normalize news for a given ticker."""
    try:
        def fetch():
            ticker = yf.Ticker(symbol)
            return ticker.news
        
        news_items = await asyncio.to_thread(fetch)
        normalized = []
        
        for item in news_items:
            url = ""
            thumbnail = ""
            published_at = 0
            
            if "content" in item:
                content_data = item.get("content") or {}
                title = content_data.get("title", "")
                provider = content_data.get("provider") or {}
                publisher = provider.get("displayName", "")
                canonical_url = content_data.get("canonicalUrl") or {}
                url = canonical_url.get("url", "")
                if not url:
                    click_url = content_data.get("clickThroughUrl") or {}
                    url = click_url.get("url", "")
                published_at = content_data.get("pubDate", "")
                
                resolutions_data = content_data.get("thumbnail") or {}
                resolutions = resolutions_data.get("resolutions", [])
                if resolutions:
                    thumbnail = resolutions[0].get("url", "")
            else:
                title = item.get("title", "")
                publisher = item.get("publisher", "")
                url = item.get("link", "")
                published_at = item.get("providerPublishTime", 0)
                
                thumbnail_data = item.get("thumbnail") or {}
                resolutions = thumbnail_data.get("resolutions", [])
                if resolutions:
                    thumbnail = resolutions[0].get("url", "")

            # Ensure we have a unix timestamp approx
            if isinstance(published_at, str):
                # Try converting ISO string to timestamp or fallback
                try:
                    import dateutil.parser
                    dt = dateutil.parser.isoparse(published_at)
                    published_at = dt.timestamp()
                except Exception:
                    published_at = time.time()
                    
            if not url and item.get("link"):
                url = item.get("link")

            if title:
                item_id = str(uuid.uuid4())
                content_safe = item.get("content") or {}
                if "content" in item and content_safe.get("id"):
                    item_id = content_safe.get("id")
                elif item.get("uuid"):
                    item_id = item.get("uuid")

                normalized.append({
                    "id": item_id,
                    "title": title,
                    "publisher": publisher,
                    "url": url,
                    "thumbnail": thumbnail,
                    "published_at": int(published_at),
                    "related_symbol": symbol
                })
        return normalized
    except Exception as e:
        print(f"Error fetching news for {symbol}: {e}")
        return []


@router.get("")
async def get_news(
    filter_type: str = Query("market", description="Either 'market', 'portfolio', or a specific ticker"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get latest news based on the filter requested."""
    cache_key = f"{user.id}_{filter_type}"
    now = time.time()
    
    cached = _news_cache.get(cache_key)
    if cached and (now - cached["timestamp"]) < CACHE_TTL:
        return {"items": cached["data"]}

    tickers_to_fetch = []
    
    if filter_type == "portfolio":
        holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
        tickers_to_fetch = [h.symbol for h in holdings]
        if not tickers_to_fetch:
            # Fallback to market if no holdings
            tickers_to_fetch = ["SPY", "QQQ"]
    elif filter_type == "market":
        tickers_to_fetch = ["SPY", "QQQ"]
    else:
        # A specific ticker
        symbol = filter_type.upper()
        if symbol in STOCK_UNIVERSE:
            tickers_to_fetch = [symbol]
        else:
            tickers_to_fetch = ["SPY"]

    # Gather asynchronously
    tasks = [fetch_ticker_news_async(t) for t in tickers_to_fetch]
    results = await asyncio.gather(*tasks)
    
    combined_news = []
    seen_titles = set()
    
    for news_list in results:
        for article in news_list:
            if article["title"] not in seen_titles:
                combined_news.append(article)
                seen_titles.add(article["title"])
                
    # Sort from newest to oldest
    combined_news.sort(key=lambda x: x["published_at"], reverse=True)
    
    # Take top 30
    final_results = combined_news[:30]

    _news_cache[cache_key] = {
        "timestamp": now,
        "data": final_results
    }

    return {"items": final_results}
