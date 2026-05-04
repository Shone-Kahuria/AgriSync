"""
Agronomist Agent
Input : vision inference result + disease name
Output: list of chemical recommendations with stock status
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import Disease, DiseaseChemical, Chemical
from app.schemas.models import ChemicalRec, DiagnoseResponse
from app.vision.inference import run_inference


async def run_agronomist(image_b64: str, db: AsyncSession) -> DiagnoseResponse:
    vision_result = run_inference(image_b64)
    disease_name = vision_result["disease_name"]

    stmt = (
        select(Disease)
        .where(Disease.name == disease_name)
        .options(selectinload(Disease.chemicals).selectinload(DiseaseChemical.chemical))
    )
    result = await db.execute(stmt)
    disease = result.scalar_one_or_none()

    if disease is None:
        recs = []
    else:
        recs = [
            ChemicalRec(
                name=dc.chemical.name,
                active_ingredient=dc.chemical.active_ingredient,
                dosage=dc.chemical.dosage,
                application=dc.chemical.application,
                price_kes=dc.chemical.price_kes,
                in_stock=dc.chemical.stock_units > 0,
            )
            for dc in disease.chemicals
        ]

    swahili = _swahili_summary(disease_name, vision_result["severity"], recs)

    return DiagnoseResponse(
        disease_name=disease_name,
        confidence=vision_result["confidence"],
        symptoms=vision_result["symptoms"],
        severity=vision_result["severity"],
        recommendations=recs,
        swahili_summary=swahili,
        gpu_used=vision_result["gpu_used"],
    )


def _swahili_summary(disease: str, severity: str, recs: list[ChemicalRec]) -> str:
    severity_sw = {"high": "kali sana", "medium": "wastani", "low": "ndogo"}.get(severity, severity)
    chem_sw = recs[0].name if recs else "dawa inayofaa"
    return (
        f"Mmea wako una ugonjwa wa {disease}. "
        f"Ukali wa ugonjwa ni {severity_sw}. "
        f"Tumia {chem_sw} kwa mujibu wa maelekezo haraka iwezekanavyo."
    )
