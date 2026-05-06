from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Crop, Disease
from app.schemas.models import CropListItem, DiseaseListItem

router = APIRouter(tags=["catalog"])


@router.get("/crops", response_model=list[CropListItem])
async def list_crops(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Crop).order_by(Crop.name))
    return [CropListItem.model_validate(c) for c in r.scalars().all()]


@router.get("/diseases", response_model=list[DiseaseListItem])
async def list_diseases(
    crop_id: Optional[int] = Query(None, description="Filter by crop ID"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Disease).order_by(Disease.name)
    if crop_id is not None:
        stmt = stmt.where(Disease.crop_id == crop_id)
    r = await db.execute(stmt)
    return [DiseaseListItem.model_validate(d) for d in r.scalars().all()]
