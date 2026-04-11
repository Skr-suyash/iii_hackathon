"""NovaTrade — Condition Monitor background task."""

import asyncio
import logging
from datetime import datetime

from sqlalchemy.orm import Session
from database import SessionLocal
from models import PendingOrder, User
from services.market_service import get_indicator_value
from services.trade_service import execute_trade
from config import CONDITION_MONITOR_INTERVAL

logger = logging.getLogger("novatrade.condition_monitor")

# Track previous indicator values for crossover detection
_previous_values: dict[str, dict[str, float]] = {}


async def run_condition_monitor():
    """Background task — checks pending orders every N seconds."""
    logger.info("Condition Monitor started (interval=%ds)", CONDITION_MONITOR_INTERVAL)
    while True:
        try:
            await _check_all_orders()
        except Exception as e:
            logger.error("Condition Monitor error: %s", e)
        await asyncio.sleep(CONDITION_MONITOR_INTERVAL)


async def _check_all_orders():
    """Evaluate all pending orders against current indicator values."""
    db: Session = SessionLocal()
    try:
        orders = db.query(PendingOrder).filter(PendingOrder.status == "pending").all()
        for order in orders:
            triggered = _evaluate_order(order)
            if triggered:
                logger.info(
                    "Order #%d TRIGGERED: %s %d %s (indicator=%s %s %s)",
                    order.id, order.action, order.quantity, order.symbol,
                    order.indicator, order.condition, order.value,
                )
                user = db.query(User).filter(User.id == order.user_id).first()
                if user:
                    result = execute_trade(
                        db, user, order.symbol, order.action, int(order.quantity)
                    )
                    if result["success"]:
                        order.status = "filled"
                        order.filled_at = datetime.utcnow()
                        order.filled_price = result["filled_price"]
                        db.commit()
                        logger.info("Order #%d filled at $%.2f", order.id, result["filled_price"])
                    else:
                        logger.warning("Order #%d fill failed: %s", order.id, result["message"])
    finally:
        db.close()


def _evaluate_order(order: PendingOrder) -> bool:
    """Check if an order's condition is met."""
    current = get_indicator_value(order.symbol, order.indicator)
    if current is None:
        return False

    # For crossover detection, we need the previous value
    key = f"{order.symbol}:{order.indicator}"
    prev = _previous_values.get(key)
    _previous_values[key] = {"value": current}

    if order.condition == "above":
        return current > order.value
    elif order.condition == "below":
        return current < order.value
    elif order.condition == "crosses_above":
        if prev is None:
            return False
        return prev["value"] <= order.value and current > order.value
    elif order.condition == "crosses_below":
        if prev is None:
            return False
        return prev["value"] >= order.value and current < order.value

    return False


async def trigger_order_manually(order_id: int) -> dict:
    """Debug endpoint — force-trigger an order regardless of condition."""
    db: Session = SessionLocal()
    try:
        order = db.query(PendingOrder).filter(PendingOrder.id == order_id).first()
        if not order:
            return {"success": False, "message": "Order not found"}
        if order.status != "pending":
            return {"success": False, "message": f"Order is already {order.status}"}

        user = db.query(User).filter(User.id == order.user_id).first()
        if not user:
            return {"success": False, "message": "User not found"}

        result = execute_trade(db, user, order.symbol, order.action, int(order.quantity))
        if result["success"]:
            order.status = "filled"
            order.filled_at = datetime.utcnow()
            order.filled_price = result["filled_price"]
            db.commit()
            return {"success": True, "filled_price": result["filled_price"]}
        return {"success": False, "message": result["message"]}
    finally:
        db.close()
