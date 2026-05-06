import logging
from fastapi import APIRouter, Form, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.sms_service import parse_and_respond

logger = logging.getLogger("agrisync.sms")
router = APIRouter(prefix="/sms", tags=["sms"])


@router.post("")
async def incoming_sms(
    From: str = Form(..., alias="from"),
    text: str = Form(...),
    to: str = Form(...),
    date: str = Form(default=""),
    id: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Africa's Talking inbound SMS webhook. No API key required."""
    logger.info("SMS from=%s id=%s text=%r", From, id, text[:80])
    reply = await parse_and_respond(phone=From, text=text, db=db)
    logger.info("SMS reply to=%s: %r", From, reply)
    return reply
