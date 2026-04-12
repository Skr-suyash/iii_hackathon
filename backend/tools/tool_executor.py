"""NovaTrade — Tool executor: routes tool_calls to implementations."""

import asyncio
from sqlalchemy.orm import Session
from models import User


async def execute_tool(db: Session, user: User, tool_name: str, args: dict) -> dict:
    """Route a tool call to its implementation and return the result."""

    if tool_name == "execute_trade":
        from tools.execute_trade import run
        return await asyncio.to_thread(run, db, user, **args)

    elif tool_name == "get_stock_info":
        from tools.get_stock_info import run
        return await asyncio.to_thread(run, **args)

    elif tool_name == "scan_market":
        from tools.scan_market import run
        return await asyncio.to_thread(run, **args)

    elif tool_name == "get_sentiment":
        from tools.get_sentiment import run
        return await run(**args)

    elif tool_name == "analyze_portfolio":
        from tools.analyze_portfolio import run
        return await asyncio.to_thread(run, db, user)

    elif tool_name == "set_price_alert":
        from tools.set_price_alert import run
        return await asyncio.to_thread(run, db, user, **args)

    elif tool_name == "create_conditional_order":
        from tools.create_conditional_order import run
        return await asyncio.to_thread(run, db, user, **args)

    elif tool_name == "optimize_portfolio":
        from tools.optimize_portfolio import run
        return await asyncio.to_thread(run, db, user, **args)

    elif tool_name == "analyze_risk":
        from tools.analyze_risk import run
        return await asyncio.to_thread(run, db, user)

    elif tool_name == "edit_conditional_order":
        from tools.edit_conditional_order import run
        return await asyncio.to_thread(run, db, user, **args)

    elif tool_name == "cancel_order":
        from tools.cancel_order import run
        return await asyncio.to_thread(run, db, user, **args)

    elif tool_name == "get_recent_news":
        from tools.get_recent_news import run
        return await run(**args)

    else:
        return {"error": f"Unknown tool: {tool_name}"}
