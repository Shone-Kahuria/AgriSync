"""
Farmer Service — phone-based registration and history tracking.
No passwords. Phone number is the unique identifier.
"""
import logging
import re
from datetime import datetime
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Farmer, DiagnosisHistory, MarketQuery

logger = logging.getLogger("agrisync.farmer_service")


def normalise_phone(phone: str) -> str:
    """
    Normalise a Kenyan phone number to E.164 format (+254XXXXXXXXX).
    Accepts: 07XXXXXXXX, 7XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX
    Raises ValueError for unrecognisable format.
    """
    clean = re.sub(r"[\s\-\(\)]", "", phone)
    if clean.startswith("+254"):
        normalised = clean
    elif clean.startswith("254"):
        normalised = "+" + clean
    elif clean.startswith("0") and len(clean) == 10:
        normalised = "+254" + clean[1:]
    elif re.match(r"^[7][0-9]{8}$", clean):
        normalised = "+254" + clean
    else:
        raise ValueError(
            f"Unrecognised phone format: '{phone}'. "
            "Expected formats: 0712345678, +254712345678, 254712345678"
        )
    if not re.match(r"^\+254[0-9]{9}$", normalised):
        raise ValueError(f"Phone number '{phone}' does not match Kenyan format (+254 + 9 digits).")
    return normalised


async def register_or_update_farmer(
    phone: str,
    name: str,
    county: Optional[str],
    primary_crop: Optional[str],
    db: AsyncSession,
) -> Farmer:
    """Register a new farmer or update an existing one by phone. Returns the Farmer object."""
    normalised = normalise_phone(phone)
    now = datetime.utcnow()
    r = await db.execute(select(Farmer).where(Farmer.phone == normalised))
    farmer = r.scalars().first()
    if farmer:
        farmer.name = name
        if county:
            farmer.county = county
        if primary_crop:
            farmer.primary_crop = primary_crop
        farmer.last_seen_at = now
    else:
        farmer = Farmer(
            phone=normalised,
            name=name,
            county=county,
            primary_crop=primary_crop,
            registered_at=now,
            last_seen_at=now,
        )
        db.add(farmer)
    await db.flush()
    return farmer


async def get_farmer_by_phone(phone: str, db: AsyncSession) -> Optional[Farmer]:
    try:
        normalised = normalise_phone(phone)
    except ValueError:
        return None
    r = await db.execute(select(Farmer).where(Farmer.phone == normalised))
    return r.scalars().first()


async def record_diagnosis(
    farmer_id: int,
    disease_name: str,
    confidence: float,
    severity: str,
    crop_type: Optional[str],
    treatment_given: Optional[str],
    db: AsyncSession,
) -> DiagnosisHistory:
    entry = DiagnosisHistory(
        farmer_id=farmer_id,
        disease_name=disease_name,
        confidence=confidence,
        severity=severity,
        crop_type=crop_type,
        treatment_given=treatment_given,
        queried_at=datetime.utcnow(),
    )
    db.add(entry)
    await db.flush()
    return entry


async def record_market_query(
    farmer_id: int,
    crop: str,
    volume_kg: float,
    origin_city: str,
    best_market: str,
    net_profit_kes: float,
    db: AsyncSession,
) -> MarketQuery:
    entry = MarketQuery(
        farmer_id=farmer_id,
        crop=crop,
        volume_kg=volume_kg,
        origin_city=origin_city,
        best_market_recommended=best_market,
        net_profit_kes=net_profit_kes,
        queried_at=datetime.utcnow(),
    )
    db.add(entry)
    await db.flush()
    return entry


async def get_farmer_history(
    phone: str,
    db: AsyncSession,
    limit: int = 20,
) -> Optional[dict]:
    """Returns farmer profile + recent diagnoses + recent market queries, or None if not found."""
    farmer = await get_farmer_by_phone(phone, db)
    if not farmer:
        return None

    diag_r = await db.execute(
        select(DiagnosisHistory)
        .where(DiagnosisHistory.farmer_id == farmer.id)
        .order_by(DiagnosisHistory.queried_at.desc())
        .limit(limit)
    )
    diagnoses = diag_r.scalars().all()

    mq_r = await db.execute(
        select(MarketQuery)
        .where(MarketQuery.farmer_id == farmer.id)
        .order_by(MarketQuery.queried_at.desc())
        .limit(limit)
    )
    market_queries = mq_r.scalars().all()

    count_d = await db.execute(
        select(func.count()).select_from(DiagnosisHistory).where(DiagnosisHistory.farmer_id == farmer.id)
    )
    count_m = await db.execute(
        select(func.count()).select_from(MarketQuery).where(MarketQuery.farmer_id == farmer.id)
    )

    return {
        "farmer": farmer,
        "recent_diagnoses": list(diagnoses),
        "recent_market_queries": list(market_queries),
        "total_diagnoses": count_d.scalar_one(),
        "total_market_queries": count_m.scalar_one(),
    }
