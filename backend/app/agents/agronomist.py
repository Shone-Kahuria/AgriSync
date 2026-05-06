"""
Agronomist Agent — two-stage vision pipeline
=============================================
Stage 1: PlantVillage specialist classifier (fast, ~50 ms, ~95% accuracy for
         Tomato / Maize / Potato). Handles 14 of our 12 crops.
Stage 2: LLaVA / Llama-3.2-Vision (general, slower, covers all crops including
         Coffee, Cassava, Banana, Sorghum — not in PlantVillage).

Decision logic:
  classifier confidence >= 0.65  → use classifier result + DB chemical recs
  classifier confidence < 0.65   → fall through to LLaVA/Llama
  either model < 0.50 overall    → uncertain response (no chemical recs)
  severity == high OR conf < 0.75 → requires_expert_review = True
"""
import asyncio
import hashlib

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.models import Disease, DiseaseChemical, Chemical
from app.schemas.models import ChemicalRec, DiagnoseResponse
from app.vision.inference import run_inference
from app.vision.plant_classifier import classify_disease

_DISCLAIMER = (
    "AgriSync provides decision-support only. Always confirm diagnosis "
    "with a licensed agronomist before applying chemicals."
)


async def run_agronomist(image_b64: str, db: AsyncSession) -> DiagnoseResponse:
    # ---- Stage 1: PlantVillage specialist classifier ----
    cls = await asyncio.to_thread(classify_disease, image_b64)

    if cls["confidence"] >= settings.classifier_confidence_threshold:
        if cls["is_healthy"]:
            return _healthy_response(cls)

        disease_name = cls["db_name"] or cls["disease_name"]
        disease, recs = await _db_lookup(disease_name, db)

        if disease:
            return _build_response(
                disease_name=disease.name,
                confidence=cls["confidence"],
                symptoms=disease.symptoms or cls["disease_name"],
                severity=disease.severity or "unknown",
                recs=recs,
                gpu_used=cls["gpu_used"],
            )

        # Classifier is confident but disease not in our DB — run LLaVA for symptoms
        llava = await asyncio.to_thread(run_inference, image_b64)
        return _build_response(
            disease_name=disease_name,
            confidence=cls["confidence"],
            symptoms=llava.get("symptoms", "Refer to agronomist for detailed symptoms."),
            severity=llava.get("severity", "unknown"),
            recs=[],
            gpu_used=cls["gpu_used"],
            requires_expert_review=True,
        )

    # ---- Stage 2: LLaVA / Llama-3.2-Vision fallback ----
    llava = await asyncio.to_thread(run_inference, image_b64)
    confidence = llava["confidence"]

    if confidence < settings.confidence_threshold:
        conf_pct = int(confidence * 100)
        return DiagnoseResponse(
            disease_name="Uncertain — Image Unclear",
            confidence=confidence,
            symptoms=llava.get("symptoms", "Image quality insufficient for reliable diagnosis."),
            severity="unknown",
            recommendations=[],
            swahili_summary=(
                f"Picha haikuwa wazi vya kutosha (uhakika {conf_pct}%). "
                "Tafadhali piga picha nyingine kwenye mwanga mzuri, au "
                "wasiliana na mtaalamu wa kilimo."
            ),
            gpu_used=llava["gpu_used"],
            uncertain=True,
            requires_expert_review=True,
            disclaimer=_DISCLAIMER,
        )

    disease_name = llava["disease_name"]
    disease, recs = await _db_lookup(disease_name, db)

    return _build_response(
        disease_name=disease.name if disease else disease_name,
        confidence=confidence,
        symptoms=disease.symptoms if disease else llava.get("symptoms", ""),
        severity=disease.severity if disease else llava.get("severity", "unknown"),
        recs=recs,
        gpu_used=llava["gpu_used"],
    )


async def _db_lookup(disease_name: str, db: AsyncSession):
    """Returns (Disease | None, list[ChemicalRec])."""
    stmt = (
        select(Disease)
        .where(Disease.name == disease_name)
        .options(selectinload(Disease.chemicals).selectinload(DiseaseChemical.chemical))
    )
    result = await db.execute(stmt)
    disease = result.scalar_one_or_none()
    if disease is None:
        return None, []

    recs = [
        ChemicalRec(
            name=dc.chemical.name,
            active_ingredient=dc.chemical.active_ingredient,
            dosage=dc.chemical.dosage,
            application=dc.chemical.application,
            price_kes=dc.chemical.price_kes,
            in_stock=dc.chemical.stock_units > 0,
            pcpb_status=dc.chemical.pcpb_status,
            safety_note=dc.chemical.safety_note,
        )
        for dc in disease.chemicals
    ]
    return disease, recs


def _build_response(
    disease_name: str,
    confidence: float,
    symptoms: str,
    severity: str,
    recs: list[ChemicalRec],
    gpu_used: str,
    requires_expert_review: bool = False,
) -> DiagnoseResponse:
    # Flag for expert review: high-severity disease OR low-medium confidence
    expert_review = requires_expert_review or severity == "high" or confidence < 0.75

    severity_sw = {"high": "kali sana", "medium": "wastani", "low": "ndogo"}.get(severity, severity)
    chem_sw = recs[0].name if recs else "dawa inayofaa"
    swahili = (
        f"Mmea wako una ugonjwa wa {disease_name}. "
        f"Ukali wa ugonjwa ni {severity_sw}. "
        f"Tumia {chem_sw} kwa mujibu wa maelekezo haraka iwezekanavyo."
    )
    if expert_review:
        swahili += " Wasiliana na mtaalamu wa kilimo kuthibitisha."

    return DiagnoseResponse(
        disease_name=disease_name,
        confidence=confidence,
        symptoms=symptoms,
        severity=severity,
        recommendations=recs,
        swahili_summary=swahili,
        gpu_used=gpu_used,
        requires_expert_review=expert_review,
        disclaimer=_DISCLAIMER,
    )


def _healthy_response(cls: dict) -> DiagnoseResponse:
    return DiagnoseResponse(
        disease_name="Healthy Plant",
        confidence=cls["confidence"],
        symptoms="No disease symptoms detected. Plant appears healthy.",
        severity="low",
        recommendations=[],
        swahili_summary=(
            f"Mmea wako unaonekana kuwa na afya nzuri (uhakika {int(cls['confidence']*100)}%). "
            "Endelea na utunzaji mzuri wa kawaida."
        ),
        gpu_used=cls["gpu_used"],
        requires_expert_review=False,
        disclaimer=_DISCLAIMER,
    )
