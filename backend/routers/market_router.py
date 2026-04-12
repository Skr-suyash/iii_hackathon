"""NovaTrade — Market data router."""

from fastapi import APIRouter, Depends
from models import User
from auth import get_current_user
from services.market_service import fetch_all_prices, fetch_stock_data, fetch_chart_data, fetch_latest_tick

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/prices")
def get_prices(user: User = Depends(get_current_user)):
    stocks = fetch_all_prices()
    return {"stocks": stocks}


@router.get("/{symbol}/chart")
def get_chart_data(
    symbol: str,
    period: str = "6mo",
    interval: str = "auto",
    user: User = Depends(get_current_user),
):
    data = fetch_chart_data(symbol.upper(), period, interval)
    return {"symbol": symbol.upper(), "period": period, "interval": interval, "data": data}

@router.get("/{symbol}/chart/latest")
def get_chart_latest_tick(
    symbol: str,
    period: str = "6mo",
    interval: str = "auto",
    user: User = Depends(get_current_user),
):
    """Returns a single live mathematical latest tick."""
    data = fetch_latest_tick(symbol.upper(), period, interval)
    if "error" in data:
        return data
    return {"tick": data}


@router.get("/{symbol}")
def get_stock(symbol: str, user: User = Depends(get_current_user)):
    data = fetch_stock_data(symbol.upper())
    if "error" in data:
        return data
    return data
