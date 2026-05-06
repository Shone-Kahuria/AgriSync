"""
SMS Service — keyword-based parsing for feature-phone farmers.
Accepts plain Swahili/English SMS text and returns a ≤160-char Swahili reply.
"""
import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Disease, Chemical, DiseaseChemical, Crop, CropPrice, Market, MarketDistance

logger = logging.getLogger("agrisync.sms_service")

# ---------------------------------------------------------------------------
# Keyword dictionaries
# ---------------------------------------------------------------------------

DISEASE_KEYWORDS: dict[str, list[str]] = {
    # Swahili symptoms
    "kuoza":    ["Tomato Late Blight", "Potato Late Blight", "Bean Root Rot"],
    "madoa":    ["Maize Gray Leaf Spot", "Tomato Early Blight", "Bean Angular Leaf Spot"],
    "njano":    ["Wheat Yellow Rust", "Coffee Leaf Rust", "Maize Streak Virus"],
    "mosaic":   ["Cassava Mosaic Disease", "Sweet Potato Virus Disease"],
    "kunyauka": ["Tomato Bacterial Wilt", "Banana Fusarium Wilt", "Potato Bacterial Wilt"],
    "ukungu":   ["Kale Downy Mildew", "Onion Downy Mildew"],
    "kutu":     ["Maize Common Rust", "Bean Rust", "Coffee Leaf Rust", "Wheat Stem Rust"],
    "smut":     ["Sorghum Head Smut"],
    "sigatoka": ["Banana Black Sigatoka"],
    "mosaic":   ["Cassava Mosaic Disease"],
    # English symptoms
    "blight":   ["Tomato Late Blight", "Potato Late Blight"],
    "rust":     ["Maize Common Rust", "Bean Rust", "Wheat Stem Rust"],
    "wilt":     ["Tomato Bacterial Wilt", "Banana Fusarium Wilt"],
    "rot":      ["Bean Root Rot", "Onion Basal Rot"],
    "mold":     ["Maize Ear Rot"],
    "spot":     ["Maize Gray Leaf Spot", "Bean Angular Leaf Spot"],
    "streak":   ["Maize Streak Virus", "Cassava Brown Streak"],
}

CROP_KEYWORDS: dict[str, str] = {
    "mahindi": "Maize",    "maize": "Maize",     "corn": "Maize",
    "nyanya":  "Tomato",   "tomato": "Tomato",
    "maharagwe": "Beans",  "beans": "Beans",      "bean": "Beans",
    "viazi":   "Potato",   "potato": "Potato",
    "muhogo":  "Cassava",  "cassava": "Cassava",
    "kahawa":  "Coffee",   "coffee": "Coffee",
    "sukuma":  "Kale",     "kale": "Kale",
    "ndizi":   "Banana",   "banana": "Banana",
    "ngano":   "Wheat",    "wheat": "Wheat",
    "mtama":   "Sorghum",  "sorghum": "Sorghum",
    "vitamu":  "Sweet Potato", "sweet": "Sweet Potato",
    "vitunguu": "Onion",   "onion": "Onion",
}

MARKET_KEYWORDS = {"soko", "uza", "bei", "market", "price", "sell", "selling"}
HELP_KEYWORDS    = {"msaada", "help", "agrisync", "habari", "hello", "hi"}

SEVERITY_SW = {"high": "kali sana", "medium": "wastani", "low": "ndogo", "unknown": "?"}


# ---------------------------------------------------------------------------
# Response templates (all ≤160 chars when formatted with short values)
# ---------------------------------------------------------------------------

_DISEASE_TMPL = (
    "AgriSync: {disease_sw} ({crop_sw}). "
    "Ukali: {severity_sw}. "
    "Tumia {chemical} {dosage}. "
    "KES {price}."
)
_MARKET_TMPL = (
    "AgriSync: Uza {crop_sw} {best_market}. "
    "KES {price}/kg. "
    "Faida zaidi KES {extra} vs {worst_market}."
)
_HELP_TMPL = (
    "AgriSync: Tuma 'mahindi madoa' (ugonjwa) au "
    "'uza mahindi nakuru 100' (soko bora). "
    "Wasiliana: 0800AGRISYNC"
)


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _tokenise(text: str) -> list[str]:
    return text.lower().replace(",", " ").replace(".", " ").split()


def _detect_crop(tokens: list[str]) -> Optional[str]:
    for token in tokens:
        if token in CROP_KEYWORDS:
            return CROP_KEYWORDS[token]
    return None


def _detect_disease_name(tokens: list[str]) -> Optional[str]:
    for token in tokens:
        if token in DISEASE_KEYWORDS:
            return DISEASE_KEYWORDS[token][0]
    return None


def _detect_volume(tokens: list[str]) -> Optional[float]:
    for token in tokens:
        try:
            v = float(token)
            if 0 < v < 100000:
                return v
        except ValueError:
            pass
    return None


def _detect_origin(tokens: list[str]) -> str:
    cities = {
        "nakuru", "kisumu", "nairobi", "eldoret",
        "meru", "nyeri", "kakamega", "kitale",
        "mombasa", "thika", "embu", "machakos",
    }
    for t in tokens:
        if t in cities:
            return t.capitalize()
    return "Nakuru"


# ---------------------------------------------------------------------------
# DB lookup helpers
# ---------------------------------------------------------------------------

async def _get_disease_treatment(disease_name: str, db: AsyncSession) -> Optional[dict]:
    r = await db.execute(
        select(Disease).where(Disease.name == disease_name)
    )
    disease = r.scalars().first()
    if not disease:
        return None
    r2 = await db.execute(
        select(Chemical)
        .join(DiseaseChemical, DiseaseChemical.chemical_id == Chemical.id)
        .where(DiseaseChemical.disease_id == disease.id)
        .order_by(Chemical.price_kes)
        .limit(1)
    )
    chem = r2.scalars().first()
    return {
        "disease": disease,
        "chemical": chem,
    }


async def _get_best_market(crop_name: str, origin: str, db: AsyncSession) -> Optional[dict]:
    r = await db.execute(
        select(
            Market.city,
            CropPrice.price_per_kg_kes,
            MarketDistance.transport_cost_per_kg_kes,
        )
        .join(CropPrice, CropPrice.market_id == Market.id)
        .join(Crop, Crop.id == CropPrice.crop_id)
        .outerjoin(
            MarketDistance,
            (MarketDistance.market_id == Market.id) & (MarketDistance.origin_city == origin),
        )
        .where(Crop.name == crop_name)
        .order_by(
            (CropPrice.price_per_kg_kes - MarketDistance.transport_cost_per_kg_kes).desc()
        )
    )
    rows = r.all()
    if not rows:
        return None
    best = rows[0]
    worst = rows[-1]
    best_net = best[1] - (best[2] or 0)
    worst_net = worst[1] - (worst[2] or 0)
    return {
        "best_market": best[0],
        "best_price": best[1],
        "best_net": best_net,
        "extra": best_net - worst_net,
        "worst_market": worst[0],
    }


# ---------------------------------------------------------------------------
# Main public function
# ---------------------------------------------------------------------------

async def parse_and_respond(phone: str, text: str, db: AsyncSession) -> str:
    """Parse an incoming SMS and return a Swahili reply ≤160 chars."""
    tokens = _tokenise(text)

    # Help / unknown
    if any(t in HELP_KEYWORDS for t in tokens) and len(tokens) <= 2:
        return _HELP_TMPL[:160]

    is_market_query = any(t in MARKET_KEYWORDS for t in tokens)
    crop = _detect_crop(tokens)

    # --- Market query ---
    if is_market_query and crop:
        origin = _detect_origin(tokens)
        mkt = await _get_best_market(crop, origin, db)
        if mkt:
            r = await db.execute(select(Crop).where(Crop.name == crop))
            crop_obj = r.scalars().first()
            crop_sw = crop_obj.name_sw if crop_obj else crop
            reply = _MARKET_TMPL.format(
                crop_sw=crop_sw,
                best_market=mkt["best_market"],
                price=int(mkt["best_price"]),
                extra=int(mkt["extra"]),
                worst_market=mkt["worst_market"],
            )
            return reply[:160]

    # --- Disease query ---
    disease_name = _detect_disease_name(tokens)
    if disease_name:
        info = await _get_disease_treatment(disease_name, db)
        if info:
            disease = info["disease"]
            chem = info["chemical"]
            r = await db.execute(select(Crop).where(Crop.id == disease.crop_id))
            crop_obj = r.scalars().first()
            crop_sw = crop_obj.name_sw if crop_obj else (crop or "mmea")
            severity_sw = SEVERITY_SW.get(disease.severity or "unknown", "?")
            if chem:
                dosage_short = chem.dosage.split(" ")[0] + " " + chem.dosage.split(" ")[1] if chem.dosage else ""
                reply = _DISEASE_TMPL.format(
                    disease_sw=disease.name_sw or disease.name,
                    crop_sw=crop_sw,
                    severity_sw=severity_sw,
                    chemical=chem.name,
                    dosage=dosage_short,
                    price=chem.price_kes,
                )
            else:
                reply = (
                    f"AgriSync: {disease.name_sw or disease.name} ({crop_sw}). "
                    f"Ukali: {severity_sw}. Wasiliana na mtaalamu wa kilimo."
                )
            return reply[:160]

    # Fallback
    return _HELP_TMPL[:160]
