from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.limiter import limiter
from app.schemas.models import (
    FarmerRegisterRequest, FarmerResponse,
    FarmerHistoryResponse, DiagnosisHistoryItem, MarketQueryHistoryItem,
)
from app.services import farmer_service

router = APIRouter(prefix="/farmers", tags=["farmers"])


@router.post("/register", response_model=FarmerResponse, status_code=201)
@limiter.limit("20/minute")
async def register_farmer(
    request: Request,
    req: FarmerRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        farmer = await farmer_service.register_or_update_farmer(
            phone=req.phone,
            name=req.name,
            county=req.county,
            primary_crop=req.primary_crop,
            db=db,
        )
        await db.commit()
        await db.refresh(farmer)
        return farmer
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{phone}/history", response_model=FarmerHistoryResponse)
@limiter.limit("30/minute")
async def get_history(
    request: Request,
    phone: str,
    db: AsyncSession = Depends(get_db),
):
    history = await farmer_service.get_farmer_history(phone, db)
    if not history:
        raise HTTPException(status_code=404, detail=f"Farmer with phone '{phone}' not found.")
    return FarmerHistoryResponse(
        farmer=FarmerResponse.model_validate(history["farmer"]),
        recent_diagnoses=[DiagnosisHistoryItem.model_validate(d) for d in history["recent_diagnoses"]],
        recent_market_queries=[MarketQueryHistoryItem.model_validate(m) for m in history["recent_market_queries"]],
        total_diagnoses=history["total_diagnoses"],
        total_market_queries=history["total_market_queries"],
    )
