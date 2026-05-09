from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Crop, Disease, DiseaseChemical
from app.schemas.models import CropListItem, DiseaseListItem, ChemicalBrief

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
    stmt = (
        select(Disease)
        .options(
            selectinload(Disease.crop),
            selectinload(Disease.chemicals).selectinload(DiseaseChemical.chemical),
        )
        .order_by(Disease.name)
    )
    if crop_id is not None:
        stmt = stmt.where(Disease.crop_id == crop_id)

    r = await db.execute(stmt)
    diseases = r.scalars().all()

    result = []
    for d in diseases:
        treatments = [
            ChemicalBrief(name=dc.chemical.name, pcpb_status=dc.chemical.pcpb_status)
            for dc in d.chemicals
            if dc.chemical
        ]
        result.append(DiseaseListItem(
            id=d.id,
            name=d.name,
            name_sw=d.name_sw,
            crop_id=d.crop_id,
            crop_name=d.crop.name if d.crop else "",
            severity=d.severity or "medium",
            symptoms=d.symptoms,
            treatments=treatments,
        ))
    return result
