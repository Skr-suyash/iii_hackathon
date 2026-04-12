"""NovaTrade — Portfolio optimization & risk analysis router."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
import json

from database import get_db
from models import User, Holding
from auth import get_current_user
from services.optimization_service import optimize_portfolio, generate_efficient_frontier
from services.risk_scoring_service import analyze_portfolio_risk
from services.market_service import fetch_stock_data
from services.trade_service import execute_trade
from groq import AsyncGroq
from config import GROQ_API_KEY, GROQ_MODEL, GROQ_TEMPERATURE

router = APIRouter(prefix="/api", tags=["optimization"])


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------
class OptimizeRequest(BaseModel):
    tickers: list[str]
    objective: str = "max_sharpe"
    target_return: Optional[float] = None
    risk_free_rate: float = 0.02


class FrontierRequest(BaseModel):
    tickers: list[str]
    n_points: int = 50


class RebalanceRequest(BaseModel):
    tickers: list[str]
    objective: str = "max_sharpe"
    target_return: Optional[float] = None


# ---------------------------------------------------------------------------
# Optimization endpoints
# ---------------------------------------------------------------------------
@router.post("/optimize")
def run_optimization(
    req: OptimizeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Read-only optimization: compute optimal weights without executing trades."""
    # Gather current portfolio context
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

    # Also need prices for tickers not currently held
    for ticker in req.tickers:
        if ticker not in current_prices:
            data = fetch_stock_data(ticker)
            if "error" not in data:
                current_prices[ticker] = data["price"]

    result = optimize_portfolio(
        tickers=[t.upper() for t in req.tickers],
        objective=req.objective,
        target_return=req.target_return,
        total_value=total_value,
        current_holdings=current_holdings,
        current_prices=current_prices,
        risk_free_rate=req.risk_free_rate,
    )
    return result


@router.post("/optimize/frontier")
def get_frontier(
    req: FrontierRequest,
    user: User = Depends(get_current_user),
):
    """Return the efficient frontier curve for charting."""
    return generate_efficient_frontier(
        tickers=[t.upper() for t in req.tickers],
        n_points=req.n_points,
    )


@router.post("/optimize/rebalance")
def execute_rebalance(
    req: RebalanceRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Compute optimal weights and execute all rebalance trades."""
    # Get current state
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

    for ticker in req.tickers:
        if ticker not in current_prices:
            data = fetch_stock_data(ticker)
            if "error" not in data:
                current_prices[ticker] = data["price"]

    # Optimize
    opt_result = optimize_portfolio(
        tickers=[t.upper() for t in req.tickers],
        objective=req.objective,
        target_return=req.target_return,
        total_value=total_value,
        current_holdings=current_holdings,
        current_prices=current_prices,
    )

    if "error" in opt_result:
        return opt_result

    # Execute trades: sells first, then buys
    trades = opt_result.get("rebalance_trades", [])
    executed: list[dict] = []
    errors: list[dict] = []

    for trade in trades:
        try:
            result = execute_trade(
                db, user,
                symbol=trade["symbol"],
                action=trade["action"],
                quantity=trade["quantity"],
                price=current_prices.get(trade["symbol"]),
            )
            if result.get("success"):
                executed.append({**trade, "status": "filled", "message": result["message"]})
            else:
                errors.append({**trade, "status": "failed", "message": result.get("message", "")})
        except Exception as e:
            errors.append({**trade, "status": "error", "message": str(e)})

    return {
        "success": len(errors) == 0,
        "trades_executed": len(executed),
        "trades_failed": len(errors),
        "executed": executed,
        "errors": errors,
        "new_balance": user.balance,
        "optimal_weights": opt_result["weights"],
        "performance": opt_result["performance"],
    }


# ---------------------------------------------------------------------------
# Risk analysis endpoints
# ---------------------------------------------------------------------------
@router.get("/risk-analysis")
def get_risk_analysis(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Full ML risk analysis using current holdings."""
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()

    user_values: dict = {}
    for h in holdings:
        data = fetch_stock_data(h.symbol)
        price = data.get("price", h.avg_buy_price)
        user_values[h.symbol] = price * h.quantity

    return analyze_portfolio_risk(user_values)


@router.get("/risk-analysis/clusters")
def get_clusters(
    user: User = Depends(get_current_user),
):
    """Return the cluster model only (for visualization)."""
    from services.risk_scoring_service import _cluster_universe
    return _cluster_universe()


# ---------------------------------------------------------------------------
# AI Advisor Stream
# ---------------------------------------------------------------------------
class AdvisorRequest(BaseModel):
    objective: str
    tickers: list[str]
    opt_result: dict
    risk_data: dict

@router.post("/optimize/advisor")
async def get_optimization_advisor_stream(
    req: AdvisorRequest,
    user: User = Depends(get_current_user)
):
    """Stream a live assessment of the selected optimization strategy from Groq."""
    
    prompt = f"""You are NovaTrade AI, an elite quantitative portfolio analyst.
The user just generated a new portfolio optimization.
Objective Chosen: {req.objective.upper()}
Tickers: {', '.join(req.tickers)}

Optimization Results:
{json.dumps(req.opt_result, indent=2)}

Risk Analysis ML Data (Clusters & Diversification):
{json.dumps(req.risk_data, indent=2)}

Analyze this specific optimization result. 
- Is this a good mix? 
- Did the selected objective heavily concentrate the portfolio or balance it across clusters?
- Keep it concise, professional, and actionable (max 3 short paragraphs).
Format with bolding where appropriate. DO NOT USE MARKDOWN HEADINGS (e.g. # or ##).
"""

    async def generate():
        try:
            client = AsyncGroq(api_key=GROQ_API_KEY)
            stream = await client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "system", "content": prompt}],
                temperature=GROQ_TEMPERATURE,
                stream=True
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield f"data: {json.dumps({'content': content})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(generate(), media_type="text/event-stream")
