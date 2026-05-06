import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import DiagnosisFeedback
from app.limiter import limiter
from app.schemas.models import DiagnosisFeedbackRequest

logger = logging.getLogger("agrisync.feedback")
router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/diagnosis", status_code=201)
@limiter.limit("20/minute")
async def report_diagnosis(
    request: Request,
    req: DiagnosisFeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Farmer reports a wrong or uncertain AI diagnosis. Logged for agronomist review."""
    entry = DiagnosisFeedback(
        phone=req.phone,
        ai_disease_name=req.ai_disease_name,
        actual_disease=req.actual_disease,
        ai_confidence=req.ai_confidence,
        image_hash=req.image_hash,
        notes=req.notes,
    )
    db.add(entry)
    try:
        await db.commit()
    except Exception as exc:
        logger.error("Failed to save feedback: %s", exc)
        raise HTTPException(status_code=500, detail="Could not save feedback.")

    logger.info(
        "Feedback recorded: ai=%r actual=%r phone=%s",
        req.ai_disease_name, req.actual_disease, req.phone,
    )
    return {"status": "recorded", "message": "Thank you — your feedback helps improve AgriSync."}
