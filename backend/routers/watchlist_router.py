"""NovaTrade — Watchlist router."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import time
import asyncio

from database import get_db
from models import User, Watchlist
from auth import get_current_user
from services.market_service import fetch_stock_data
from services.sentiment_service import get_sentiment, _sentiment_cache, CACHE_TTL
from config import STOCK_UNIVERSE

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])

def run_sentiment_bg(symbol: str):
    asyncio.run(get_sentiment(symbol))


class WatchlistAdd(BaseModel):
    symbol: str


@router.get("")
async def get_watchlist(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items = db.query(Watchlist).filter(Watchlist.user_id == user.id).all()
    result = []
    now = time.time()
    for item in items:
        data = fetch_stock_data(item.symbol)
        
        cached = _sentiment_cache.get(item.symbol)
        if cached and (now - cached["timestamp"]) < CACHE_TTL:
            sentiment_val = cached["data"].get("sentiment", "neutral")
        else:
            sentiment_val = "loading"
            background_tasks.add_task(run_sentiment_bg, item.symbol)

        result.append({
            "symbol": item.symbol,
            "name": STOCK_UNIVERSE.get(item.symbol, {}).get("name", item.symbol),
            "price": data.get("price", 0),
            "change_pct": data.get("change_pct", 0),
            "sentiment": sentiment_val,
        })
    return {"items": result}


@router.post("")
def add_to_watchlist(
    req: WatchlistAdd,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    symbol = req.symbol.upper()
    if symbol not in STOCK_UNIVERSE:
        raise HTTPException(status_code=400, detail=f"Unknown symbol: {symbol}")

    existing = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == user.id, Watchlist.symbol == symbol)
        .first()
    )
    if existing:
        return {"success": True, "message": f"{symbol} already in watchlist"}

    item = Watchlist(user_id=user.id, symbol=symbol)
    db.add(item)
    db.commit()
    return {"success": True}


@router.delete("/{symbol}")
def remove_from_watchlist(
    symbol: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    symbol = symbol.upper()
    item = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == user.id, Watchlist.symbol == symbol)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail=f"{symbol} not in watchlist")

    db.delete(item)
    db.commit()
    return {"success": True}
