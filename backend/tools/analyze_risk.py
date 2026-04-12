"""Tool: analyze_risk — ML-powered portfolio risk analysis via copilot."""

from sqlalchemy.orm import Session
from models import User, Holding
from services.risk_scoring_service import analyze_portfolio_risk
from services.market_service import fetch_stock_data


def run(db: Session, user: User) -> dict:
    """Run ML risk analysis on the user's current portfolio.

    Returns a simplified summary suitable for LLM consumption:
    risk score, diversification, cluster breakdown, and top advice.
    """
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()

    if not holdings:
        return {
            "risk_score": 0,
            "message": "No holdings to analyze. Portfolio is 100% cash — zero market risk.",
        }

    # Build {symbol: dollar_value} map
    user_values: dict = {}
    for h in holdings:
        data = fetch_stock_data(h.symbol)
        price = data.get("price", h.avg_buy_price)
        user_values[h.symbol] = price * h.quantity

    result = analyze_portfolio_risk(user_values)

    # Format for LLM readability
    summary: dict = {
        "risk_score": f"{result['risk_score']}/100",
        "risk_level": result["risk_label"],
        "diversification_score": f"{result['diversification_score'] * 100:.0f}%",
    }

    # Cluster breakdown (simplified)
    cluster_summary = []
    for c_id, info in result.get("portfolio_cluster_weights", {}).items():
        cluster_name = result.get("clusters", {}).get(c_id, {}).get("name", f"Cluster {c_id}")
        weight = info["weight"]
        if weight > 0:
            cluster_summary.append(
                f"{cluster_name}: {weight * 100:.0f}% ({', '.join(info['holdings'])})"
            )
    summary["cluster_breakdown"] = cluster_summary

    # Top advice (simplified for LLM)
    advice_items = []
    for a in result.get("advice", [])[:3]:
        advice_items.append(f"[{a['type'].upper()}] {a['title']}: {a['message']}")
    summary["advice"] = advice_items

    return summary
