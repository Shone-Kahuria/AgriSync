import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.agents.agronomist import run_agronomist
from app.schemas.models import DiagnoseRequest, DiagnoseResponse
from app.limiter import limiter
from app.services import farmer_service

logger = logging.getLogger("agrisync")
router = APIRouter(prefix="/diagnose", tags=["diagnosis"])


@router.post("", response_model=DiagnoseResponse)
@limiter.limit("10/minute")
async def diagnose(request: Request, req: DiagnoseRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await run_agronomist(req.image_base64, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # Non-blocking history recording when phone is provided
    if req.phone and not result.uncertain:
        try:
            farmer = await farmer_service.get_farmer_by_phone(req.phone, db)
            if farmer:
                treatment = result.recommendations[0].name if result.recommendations else None
                await farmer_service.record_diagnosis(
                    farmer_id=farmer.id,
                    disease_name=result.disease_name,
                    confidence=result.confidence,
                    severity=result.severity,
                    crop_type=req.crop_type,
                    treatment_given=treatment,
                    db=db,
                )
                await db.commit()
        except Exception as exc:
            logger.warning("History recording failed (non-fatal): %s", exc)

    return result
