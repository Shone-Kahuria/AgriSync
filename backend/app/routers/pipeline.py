"""
POST /analyze — full end-to-end pipeline in one request.
Accepts an image + crop/volume and runs all three agents sequentially.
Designed for the hackathon demo: judges can curl this single endpoint
and see the entire AgriSync system working.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.db.database import get_db
from app.agents.agronomist import run_agronomist
from app.agents.arbitrage import run_arbitrage
from app.agents.orchestrator import run_orchestrator
from app.schemas.models import (
    ArbitrageRequest, DiagnoseResponse, ArbitrageResponse, ReportResponse,
)
from app.vision.inference import last_inference_ms

router = APIRouter(prefix="/analyze", tags=["pipeline"])


class AnalyzeRequest(BaseModel):
    image_base64: str
    crop: str = "Maize"
    volume_kg: float = 500.0
    origin_city: str = "Nakuru"
    farmer_name: Optional[str] = None
    phone: Optional[str] = None


class AnalyzeResponse(BaseModel):
    diagnose: DiagnoseResponse
    arbitrage: ArbitrageResponse
    report: ReportResponse
    inference_ms: float


@router.post("", response_model=AnalyzeResponse)
async def full_pipeline(req: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    try:
        diag = await run_agronomist(req.image_base64, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Diagnosis failed: {exc}")

    try:
        arb = await run_arbitrage(
            ArbitrageRequest(
                crop=req.crop,
                volume_kg=req.volume_kg,
                origin_city=req.origin_city,
            ),
            db,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Arbitrage failed: {exc}")

    try:
        report = await run_orchestrator(
            diag=diag,
            arb=arb,
            farmer_name=req.farmer_name,
            phone=req.phone,
            send_sms=bool(req.phone),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}")

    return AnalyzeResponse(
        diagnose=diag,
        arbitrage=arb,
        report=report,
        inference_ms=round(last_inference_ms(), 1),
    )
