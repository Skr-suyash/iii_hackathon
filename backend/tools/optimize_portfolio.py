"""Tool: optimize_portfolio — MPT portfolio optimization via copilot."""

from sqlalchemy.orm import Session
from models import User, Holding
from services.optimization_service import optimize_portfolio
from services.market_service import fetch_stock_data


def run(
    db: Session,
    user: User,
    objective: str = "max_sharpe",
    tickers: list[str] | None = None,
    target_return: float | None = None,
) -> dict:
    """Run Modern Portfolio Theory optimization.

    If tickers is empty/None, uses the user's current holdings.
    Returns a simplified summary suitable for LLM consumption.
    """
    # Get current portfolio state
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()

    current_holdings: dict = {}
    current_prices: dict = {}
    total_invested = 0.0

    for h in holdings:
        data = fetch_stock_data(h.symbol)
        price = data.get("price", h.avg_buy_price)
        current_holdings[h.symbol] = h.quantity
        current_prices[h.symbol] = price
        total_invested += price * h.quantity

    total_value = total_invested + user.balance

    # If no tickers specified, use current holdings
    if not tickers:
        tickers = list(current_holdings.keys())

    if len(tickers) < 2:
        return {"error": "Need at least 2 tickers for optimization. Current holdings have fewer."}

    # Fetch prices for any tickers not in current holdings
    for ticker in tickers:
        if ticker not in current_prices:
            data = fetch_stock_data(ticker.upper())
            if "error" not in data:
                current_prices[ticker] = data["price"]

    result = optimize_portfolio(
        tickers=[t.upper() for t in tickers],
        objective=objective,
        target_return=target_return,
        total_value=total_value,
        current_holdings=current_holdings,
        current_prices=current_prices,
    )

    if "error" in result:
        return result

    # Format for LLM readability
    weights = result.get("weights", {})
    perf = result.get("performance", {})
    trades = result.get("rebalance_trades", [])

    summary = {
        "objective": objective,
        "optimal_allocation": {
            k: f"{v * 100:.1f}%" for k, v in weights.items() if v > 0
        },
        "expected_annual_return": f"{perf.get('expected_annual_return', 0) * 100:.1f}%",
        "annual_volatility": f"{perf.get('annual_volatility', 0) * 100:.1f}%",
        "sharpe_ratio": f"{perf.get('sharpe_ratio', 0):.2f}",
        "rebalance_trades_needed": len(trades),
        "trades": [
            f"{t['action'].upper()} {t['quantity']} {t['symbol']}"
            for t in trades[:5]  # Limit for token efficiency
        ],
    }

    if result.get("current_vs_optimal"):
        changes = []
        for sym, comp in result["current_vs_optimal"].items():
            delta = comp["delta_pct"]
            if abs(delta) > 0.01:
                direction = "increase" if delta > 0 else "decrease"
                changes.append(f"{sym}: {direction} by {abs(delta) * 100:.1f}%")
        summary["weight_changes"] = changes[:5]

    return summary
