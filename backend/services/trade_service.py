"""NovaTrade — Trade execution service."""

from datetime import datetime
from sqlalchemy.orm import Session

from models import User, Holding, Transaction
from services.market_service import fetch_stock_data
from config import STOCK_UNIVERSE


def execute_trade(
    db: Session,
    user: User,
    symbol: str,
    action: str,
    quantity: int,
    price: float = None,
) -> dict:
    """Execute a market trade (buy or sell) at given or current price."""
    if symbol not in STOCK_UNIVERSE:
        return {"success": False, "message": f"Unknown symbol: {symbol}"}

    if quantity <= 0:
        return {"success": False, "message": "Quantity must be positive"}

    # Get current price if not provided
    if price is None:
        data = fetch_stock_data(symbol)
        if "error" in data:
            return {"success": False, "message": data["error"]}
        price = data["price"]

    total = round(price * quantity, 2)

    if action == "buy":
        return _execute_buy(db, user, symbol, quantity, price, total)
    elif action == "sell":
        return _execute_sell(db, user, symbol, quantity, price, total)
    else:
        return {"success": False, "message": f"Invalid action: {action}"}


def _execute_buy(
    db: Session, user: User, symbol: str, quantity: int, price: float, total: float
) -> dict:
    if user.balance < total:
        return {
            "success": False,
            "message": f"Insufficient balance. Need ${total:,.2f}, have ${user.balance:,.2f}",
        }

    # Deduct balance
    user.balance = round(user.balance - total, 2)

    # Update or create holding
    holding = (
        db.query(Holding)
        .filter(Holding.user_id == user.id, Holding.symbol == symbol)
        .first()
    )
    if holding:
        # Weighted average price
        total_qty = holding.quantity + quantity
        holding.avg_buy_price = round(
            (holding.avg_buy_price * holding.quantity + price * quantity) / total_qty, 2
        )
        holding.quantity = total_qty
    else:
        holding = Holding(
            user_id=user.id,
            symbol=symbol,
            quantity=quantity,
            avg_buy_price=price,
        )
        db.add(holding)

    # Record transaction
    txn = Transaction(
        user_id=user.id,
        symbol=symbol,
        type="BUY",
        quantity=quantity,
        price=price,
        total=total,
        timestamp=datetime.utcnow(),
    )
    db.add(txn)
    db.commit()

    return {
        "success": True,
        "filled_price": price,
        "new_balance": user.balance,
        "message": f"Bought {quantity} shares of {symbol} at ${price:,.2f} for ${total:,.2f}",
    }


def _execute_sell(
    db: Session, user: User, symbol: str, quantity: int, price: float, total: float
) -> dict:
    holding = (
        db.query(Holding)
        .filter(Holding.user_id == user.id, Holding.symbol == symbol)
        .first()
    )
    if not holding or holding.quantity < quantity:
        available = holding.quantity if holding else 0
        return {
            "success": False,
            "message": f"Insufficient holdings. Have {available} shares of {symbol}",
        }

    # Credit balance
    user.balance = round(user.balance + total, 2)

    # Update holding
    holding.quantity -= quantity
    if holding.quantity == 0:
        db.delete(holding)

    # Record transaction
    txn = Transaction(
        user_id=user.id,
        symbol=symbol,
        type="SELL",
        quantity=quantity,
        price=price,
        total=total,
        timestamp=datetime.utcnow(),
    )
    db.add(txn)
    db.commit()

    return {
        "success": True,
        "filled_price": price,
        "new_balance": user.balance,
        "message": f"Sold {quantity} shares of {symbol} at ${price:,.2f} for ${total:,.2f}",
    }


def get_portfolio(db: Session, user: User) -> dict:
    """Get full portfolio with P&L, risk score, and sector breakdown."""
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()

    holdings_data = []
    total_value = 0
    total_cost = 0
    sector_values = {}

    for h in holdings:
        data = fetch_stock_data(h.symbol)
        current_price = data.get("price", h.avg_buy_price)
        value = round(current_price * h.quantity, 2)
        cost = round(h.avg_buy_price * h.quantity, 2)
        pnl = round(value - cost, 2)
        pnl_pct = round((pnl / cost) * 100, 2) if cost > 0 else 0

        total_value += value
        total_cost += cost

        sector = STOCK_UNIVERSE.get(h.symbol, {}).get("sector", "Unknown")
        sector_values[sector] = sector_values.get(sector, 0) + value

        holdings_data.append({
            "symbol": h.symbol,
            "name": STOCK_UNIVERSE.get(h.symbol, {}).get("name", h.symbol),
            "quantity": h.quantity,
            "avg_price": h.avg_buy_price,
            "current_price": current_price,
            "value": value,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
        })

    portfolio_value = total_value + user.balance
    total_pnl = round(total_value - total_cost, 2)
    total_pnl_pct = round((total_pnl / total_cost) * 100, 2) if total_cost > 0 else 0

    # Sector breakdown
    sector_breakdown = []
    for sector, val in sector_values.items():
        pct = round((val / total_value) * 100, 1) if total_value > 0 else 0
        sector_breakdown.append({"sector": sector, "pct": pct})

    # Risk score (simple: based on concentration + volatility)
    risk_score = _compute_risk_score(holdings_data, sector_breakdown)

    return {
        "cash": user.balance,
        "total_value": round(portfolio_value, 2),
        "total_pnl": total_pnl,
        "pnl_pct": total_pnl_pct,
        "holdings": holdings_data,
        "risk_score": risk_score,
        "sector_breakdown": sector_breakdown,
    }


def _compute_risk_score(holdings: list, sectors: list) -> int:
    """Simple risk score 0-100 based on concentration and diversification."""
    if not holdings:
        return 0

    # Concentration risk: largest holding % of total
    total_val = sum(h["value"] for h in holdings)
    if total_val == 0:
        return 0

    max_pct = max(h["value"] / total_val for h in holdings) * 100

    # Diversification: fewer sectors = higher risk
    num_sectors = len(sectors)
    sector_risk = max(0, 50 - num_sectors * 10)

    # Combine
    score = int(max_pct * 0.6 + sector_risk * 0.4)
    return min(100, max(0, score))
