"""NovaTrade — FastAPI application entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from services.condition_monitor import run_condition_monitor, trigger_order_manually
from routers import (
    auth_router,
    market_router,
    trade_router,
    watchlist_router,
    orders_router,
    copilot_router,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("novatrade")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    # Startup
    logger.info("Initializing database...")
    init_db()
    logger.info("Starting Condition Monitor background task...")
    monitor_task = asyncio.create_task(run_condition_monitor())
    logger.info("NovaTrade backend ready!")
    yield
    # Shutdown
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass
    logger.info("NovaTrade backend shut down.")


app = FastAPI(
    title="NovaTrade API",
    description="AI-Powered Trading Copilot",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router.router)
app.include_router(market_router.router)
app.include_router(trade_router.router)
app.include_router(watchlist_router.router)
app.include_router(orders_router.router)
app.include_router(copilot_router.router)


# Debug endpoint — force-trigger a pending order (for demo)
@app.post("/api/debug/trigger-order/{order_id}")
async def debug_trigger(order_id: int):
    result = await trigger_order_manually(order_id)
    return result


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "NovaTrade API"}
