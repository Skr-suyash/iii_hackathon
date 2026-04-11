"""NovaTrade — Demo account seeder. Run before demo."""

import sys
import os
from datetime import datetime, timedelta

# Add parent dir to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, SessionLocal
from models import User, Holding, Transaction, Watchlist, PendingOrder
from auth import hash_password


def seed():
    """Create demo account with realistic portfolio data."""
    init_db()
    db = SessionLocal()

    try:
        # Check if demo user already exists
        existing = db.query(User).filter(User.email == "demo@novatrade.ai").first()
        if existing:
            print("Demo user already exists. Deleting and re-seeding...")
            # Clean up
            db.query(PendingOrder).filter(PendingOrder.user_id == existing.id).delete()
            db.query(Watchlist).filter(Watchlist.user_id == existing.id).delete()
            db.query(Transaction).filter(Transaction.user_id == existing.id).delete()
            db.query(Holding).filter(Holding.user_id == existing.id).delete()
            db.delete(existing)
            db.commit()

        # Create demo user
        user = User(
            username="demo",
            email="demo@novatrade.ai",
            password_hash=hash_password("demo123"),
            balance=352_168.00,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created demo user (id={user.id})")

        # Holdings — mix of profit and loss positions
        holdings = [
            ("AAPL", 150, 172.50),
            ("NVDA", 50, 680.00),
            ("TSLA", 80, 265.00),
            ("GOOGL", 60, 165.00),
            ("DIS", 200, 118.50),
        ]
        for symbol, qty, avg_price in holdings:
            h = Holding(
                user_id=user.id,
                symbol=symbol,
                quantity=qty,
                avg_buy_price=avg_price,
            )
            db.add(h)
        print(f"Added {len(holdings)} holdings")

        # Transaction history (last 7 days)
        transactions = [
            ("AAPL", "BUY", 100, 168.20, 7),
            ("NVDA", "BUY", 50, 680.00, 5),
            ("AAPL", "BUY", 50, 180.10, 3),
            ("TSLA", "BUY", 80, 265.00, 2),
            ("GOOGL", "BUY", 60, 165.00, 2),
            ("DIS", "BUY", 200, 118.50, 1),
        ]
        for symbol, action, qty, price, days_ago in transactions:
            t = Transaction(
                user_id=user.id,
                symbol=symbol,
                type=action,
                quantity=qty,
                price=price,
                total=round(qty * price, 2),
                timestamp=datetime.utcnow() - timedelta(days=days_ago),
            )
            db.add(t)
        print(f"Added {len(transactions)} transactions")

        # Watchlist
        watchlist_symbols = ["MSFT", "AMZN", "JPM", "NFLX"]
        for symbol in watchlist_symbols:
            w = Watchlist(user_id=user.id, symbol=symbol)
            db.add(w)
        print(f"Added {len(watchlist_symbols)} watchlist items")

        # Pending conditional order (close to triggering for demo)
        order = PendingOrder(
            user_id=user.id,
            symbol="AAPL",
            action="buy",
            quantity=25,
            indicator="rsi",
            condition="below",
            value=35,
            order_type="conditional",
            status="pending",
        )
        db.add(order)
        print("Added 1 pending conditional order")

        db.commit()
        print("\n[OK] Demo data seeded successfully!")
        print("   Login: demo@novatrade.ai / demo123")
        print(f"   Balance: ${user.balance:,.2f}")
        print(f"   Holdings: {len(holdings)} positions")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
