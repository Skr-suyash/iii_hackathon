"""NovaTrade — Orders router: conditional + limit orders."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, PendingOrder
from auth import get_current_user
from config import STOCK_UNIVERSE

router = APIRouter(prefix="/api/orders", tags=["orders"])


class OrderCreate(BaseModel):
    symbol: str
    action: str
    quantity: int
    indicator: str
    condition: str
    value: float


@router.get("")
def get_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    orders = (
        db.query(PendingOrder)
        .filter(PendingOrder.user_id == user.id)
        .order_by(PendingOrder.created_at.desc())
        .all()
    )
    return {
        "orders": [
            {
                "id": o.id,
                "symbol": o.symbol,
                "action": o.action,
                "quantity": o.quantity,
                "indicator": o.indicator,
                "condition": o.condition,
                "value": o.value,
                "order_type": o.order_type,
                "status": o.status,
                "created_at": o.created_at.isoformat(),
                "filled_at": o.filled_at.isoformat() if o.filled_at else None,
                "filled_price": o.filled_price,
            }
            for o in orders
        ]
    }


@router.post("")
def create_order(
    req: OrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    symbol = req.symbol.upper()
    if symbol not in STOCK_UNIVERSE:
        raise HTTPException(status_code=400, detail=f"Unknown symbol: {symbol}")

    order = PendingOrder(
        user_id=user.id,
        symbol=symbol,
        action=req.action.lower(),
        quantity=req.quantity,
        indicator=req.indicator,
        condition=req.condition,
        value=req.value,
        order_type="conditional",
        status="pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "order_id": order.id,
        "message": f"Conditional order created: {req.action.upper()} {req.quantity} {symbol} when {req.indicator} {req.condition} {req.value}",
    }


@router.delete("/{order_id}")
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = (
        db.query(PendingOrder)
        .filter(PendingOrder.id == order_id, PendingOrder.user_id == user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot cancel {order.status} order")

    order.status = "cancelled"
    db.commit()
    return {"success": True}
