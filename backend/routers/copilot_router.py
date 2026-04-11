"""NovaTrade — Copilot router: AI chat endpoint."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import get_current_user
from services.copilot_service import chat

router = APIRouter(prefix="/api/copilot", tags=["copilot"])


class ChatRequest(BaseModel):
    message: str
    conversation: list[dict] = []


@router.post("/chat")
async def copilot_chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await chat(db, user, req.message, req.conversation)
    return result
