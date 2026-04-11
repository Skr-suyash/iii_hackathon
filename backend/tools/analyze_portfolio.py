"""Tool: analyze_portfolio — Full portfolio analysis with P&L and risk."""

from sqlalchemy.orm import Session
from models import User
from services.trade_service import get_portfolio


def run(db: Session, user: User) -> dict:
    return get_portfolio(db, user)
