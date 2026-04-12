"""NovaTrade — Cron endpoint for Vercel Scheduler."""

import os
import logging
from fastapi import APIRouter, HTTPException, Depends, Header
from database import SessionLocal
from services.condition_monitor import _check_all_orders

logger = logging.getLogger("novatrade.cron")

router = APIRouter(prefix="/api/cron", tags=["cron"])

# Optional security token for cron. Vercel sends CRON_SECRET if configured.
CRON_SECRET = os.getenv("CRON_SECRET", "")

@router.get("/process-orders")
async def process_orders(authorization: str = Header(None)):
    """Triggered by Vercel Cron every minute."""
    if CRON_SECRET:
        if authorization != f"Bearer {CRON_SECRET}":
            logger.warning("Unauthorized cron trigger attempt.")
            raise HTTPException(status_code=401, detail="Unauthorized")
    
    logger.info("Executing scheduled cron job for pending orders...")
    try:
        await _check_all_orders()
        return {"status": "success", "message": "Orders processed"}
    except Exception as e:
        logger.error(f"Cron execution failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error executing cron")
