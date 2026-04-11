"""Tool: execute_trade — Execute a market or limit order."""

from sqlalchemy.orm import Session
from models import User, PendingOrder
from services.trade_service import execute_trade as exec_trade
from services.market_service import fetch_stock_data


def run(
    db: Session,
    user: User,
    symbol: str,
    action: str,
    quantity: int,
    order_type: str = "market",
    limit_price: float = None,
) -> dict:
    symbol = symbol.upper()

    if order_type == "limit":
        if limit_price is None:
            return {"error": "limit_price is required for limit orders"}
        # Create a pending limit order
        order = PendingOrder(
            user_id=user.id,
            symbol=symbol,
            action=action.lower(),
            quantity=quantity,
            indicator="price",
            condition="below" if action.lower() == "buy" else "above",
            value=limit_price,
            order_type="limit",
            status="pending",
        )
        db.add(order)
        db.commit()
        return {
            "success": True,
            "order_id": order.id,
            "message": f"Limit order created: {action.upper()} {quantity} {symbol} at ${limit_price:,.2f}",
        }

    # Market order — execute immediately
    result = exec_trade(db, user, symbol, action.lower(), quantity)
    return result
