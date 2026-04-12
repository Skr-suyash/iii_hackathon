"""Tool: create_conditional_order — Create indicator-triggered order."""

from sqlalchemy.orm import Session
from models import User, PendingOrder
from config import STOCK_UNIVERSE


def run(
    db: Session,
    user: User,
    symbol: str,
    action: str,
    quantity: int,
    conditions: list[dict],
) -> dict:
    symbol = symbol.upper()

    if symbol not in STOCK_UNIVERSE:
        return {"error": f"Unknown symbol: {symbol}"}

    if action not in ("buy", "sell"):
        return {"error": f"Invalid action: {action}"}

    import json
    order = PendingOrder(
        user_id=user.id,
        symbol=symbol,
        action=action.lower(),
        quantity=quantity,
        conditions=json.dumps(conditions),
        order_type="conditional",
        status="pending",
    )
    db.add(order)
    db.commit()

    return {
        "success": True,
        "order_id": order.id,
        "message": f"Conditional order created: {action.upper()} {quantity} {symbol} monitoring {len(conditions)} condition(s).",
    }
