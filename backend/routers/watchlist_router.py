"""NovaTrade — Watchlist router."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Watchlist
from auth import get_current_user
from services.market_service import fetch_stock_data
from services.sentiment_service import get_sentiment
from config import STOCK_UNIVERSE

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


class WatchlistAdd(BaseModel):
    symbol: str


@router.get("")
async def get_watchlist(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items = db.query(Watchlist).filter(Watchlist.user_id == user.id).all()
    result = []
    for item in items:
        data = fetch_stock_data(item.symbol)
        sentiment = await get_sentiment(item.symbol)
        result.append({
            "symbol": item.symbol,
            "name": STOCK_UNIVERSE.get(item.symbol, {}).get("name", item.symbol),
            "price": data.get("price", 0),
            "change_pct": data.get("change_pct", 0),
            "sentiment": sentiment.get("sentiment", "neutral"),
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
