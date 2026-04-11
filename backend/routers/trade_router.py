"""NovaTrade — Trade router: execute trades, portfolio, transactions."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from database import get_db
from models import User, Transaction
from auth import get_current_user
from services.trade_service import execute_trade, get_portfolio

router = APIRouter(prefix="/api", tags=["trade"])


class TradeRequest(BaseModel):
    symbol: str
    action: str
    quantity: int
    order_type: Optional[str] = "market"
    limit_price: Optional[float] = None


@router.post("/trade")
def trade(
    req: TradeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if req.order_type == "limit" and req.limit_price:
        from tools.execute_trade import run
        return run(db, user, req.symbol, req.action, req.quantity, req.order_type, req.limit_price)

    result = execute_trade(db, user, req.symbol.upper(), req.action.lower(), req.quantity)
    return result


@router.get("/portfolio")
def portfolio(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_portfolio(db, user)


@router.get("/transactions")
def transactions(
    symbol: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Transaction).filter(Transaction.user_id == user.id)

    if symbol:
        query = query.filter(Transaction.symbol == symbol.upper())
    if type:
        query = query.filter(Transaction.type == type.upper())

    txns = query.order_by(Transaction.timestamp.desc()).limit(limit).all()

    return {
        "transactions": [
            {
                "id": t.id,
                "symbol": t.symbol,
                "type": t.type,
                "quantity": t.quantity,
                "price": t.price,
                "total": t.total,
                "timestamp": t.timestamp.isoformat(),
            }
            for t in txns
        ]
    }
