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
    indicator: str,
    condition: str,
    value: float,
) -> dict:
    symbol = symbol.upper()

    if symbol not in STOCK_UNIVERSE:
        return {"error": f"Unknown symbol: {symbol}"}

    if action not in ("buy", "sell"):
        return {"error": f"Invalid action: {action}"}

    if indicator not in ("price", "rsi", "sma", "ema_crossover"):
        return {"error": f"Invalid indicator: {indicator}"}

    if condition not in ("above", "below", "crosses_above", "crosses_below"):
        return {"error": f"Invalid condition: {condition}"}

    order = PendingOrder(
        user_id=user.id,
        symbol=symbol,
        action=action.lower(),
        quantity=quantity,
        indicator=indicator,
        condition=condition,
        value=value,
        order_type="conditional",
        status="pending",
    )
    db.add(order)
    db.commit()

    # Build human-readable description
    indicator_labels = {
        "price": f"${value:,.2f}",
        "rsi": f"RSI {value}",
        "sma": f"SMA({int(value)})",
        "ema_crossover": f"EMA crossover at {value}",
    }

    return {
        "success": True,
        "order_id": order.id,
        "message": (
            f"Conditional order created: {action.upper()} {quantity} {symbol} "
            f"when {indicator} {condition.replace('_', ' ')} {indicator_labels.get(indicator, str(value))}"
        ),
    }
