"""Tool: set_price_alert — Set a notification alert at a price threshold."""

from sqlalchemy.orm import Session
from models import User, PendingOrder


def run(db: Session, user: User, symbol: str, target_price: float, direction: str) -> dict:
    symbol = symbol.upper()

    # Store as a pending order with indicator="price" and quantity=0 (alert only)
    alert = PendingOrder(
        user_id=user.id,
        symbol=symbol,
        action="alert",
        quantity=0,
        indicator="price",
        condition=direction,
        value=target_price,
        order_type="alert",
        status="pending",
    )
    db.add(alert)
    db.commit()

    return {
        "success": True,
        "alert_id": alert.id,
        "message": f"Price alert set: notify when {symbol} goes {direction} ${target_price:,.2f}",
    }
