"""
Seed realistic Kenyan mock data.
Safe to run multiple times — skips records that already exist.
Run: `python -m app.db.seed`
"""
import asyncio
import logging
from sqlalchemy import select

logger = logging.getLogger("agrisync.seed")
from app.db.database import engine, AsyncSessionLocal
from app.db.models import Base, Market, Crop, CropPrice, MarketDistance, Disease, Chemical, DiseaseChemical


MARKETS = [
    {"name": "Nairobi Wakulima Market", "city": "Nairobi"},
    {"name": "Mombasa Kongowea Market", "city": "Mombasa"},
    {"name": "Kisumu Kibuye Market",    "city": "Kisumu"},
    {"name": "Nakuru Mawe Mbili",       "city": "Nakuru"},
]

CROPS = [
    {"name": "Maize",  "name_sw": "Mahindi"},
    {"name": "Tomato", "name_sw": "Nyanya"},
    {"name": "Beans",  "name_sw": "Maharagwe"},
    {"name": "Potato", "name_sw": "Viazi"},
]

PRICES = {
    ("Maize",  "Nairobi"):  55,  ("Maize",  "Mombasa"):  62,
    ("Maize",  "Kisumu"):   48,  ("Maize",  "Nakuru"):   44,
    ("Tomato", "Nairobi"):  90,  ("Tomato", "Mombasa"):  105,
    ("Tomato", "Kisumu"):   75,  ("Tomato", "Nakuru"):   68,
    ("Beans",  "Nairobi"):  120, ("Beans",  "Mombasa"):  135,
    ("Beans",  "Kisumu"):   100, ("Beans",  "Nakuru"):   95,
    ("Potato", "Nairobi"):  45,  ("Potato", "Mombasa"):  55,
    ("Potato", "Kisumu"):   40,  ("Potato", "Nakuru"):   35,
}

# (origin, market_city, km, KES/kg) — Kenya MoA 2023 transport avg: ~1.2 KES/kg/100km
DISTANCES = [
    ("Nakuru",  "Nairobi",  160, 1.92), ("Nakuru",  "Mombasa",  490, 5.88),
    ("Nakuru",  "Kisumu",   180, 2.16), ("Nakuru",  "Nakuru",     0, 0.00),
    ("Kisumu",  "Nairobi",  340, 4.08), ("Kisumu",  "Mombasa",  680, 8.16),
    ("Kisumu",  "Kisumu",     0, 0.00), ("Kisumu",  "Nakuru",   180, 2.16),
    ("Nairobi", "Nairobi",    0, 0.00), ("Nairobi", "Mombasa",  488, 5.86),
    ("Nairobi", "Kisumu",   340, 4.08), ("Nairobi", "Nakuru",   160, 1.92),
]

DISEASES = [
    {"name": "Tomato Late Blight",          "name_sw": "Ugonjwa wa Kuoza kwa Nyanya",         "crop": "Tomato", "severity": "high",   "symptoms": "Dark brown lesions on leaves, white mold on underside, rapid defoliation, fruit rot.",          "chemicals": ["Ridomil Gold MZ", "Mancozeb 80WP"]},
    {"name": "Tomato Early Blight",         "name_sw": "Madoa ya Mapema ya Nyanya",            "crop": "Tomato", "severity": "medium", "symptoms": "Concentric ring spots on older leaves, yellowing around lesions, stem collar rot.",               "chemicals": ["Mancozeb 80WP", "Copper Oxychloride"]},
    {"name": "Maize Lethal Necrosis",       "name_sw": "Ugonjwa wa Kufa kwa Mahindi",          "crop": "Maize",  "severity": "high",   "symptoms": "Chlorotic mottling from leaf tips, premature ear tip dieback, plant death within 3 weeks.",      "chemicals": ["Thiamethoxam 25WG", "Imidacloprid 70WS"]},
    {"name": "Maize Gray Leaf Spot",        "name_sw": "Madoa ya Kijivu ya Mahindi",           "crop": "Maize",  "severity": "medium", "symptoms": "Rectangular tan to gray lesions running parallel to leaf veins, premature death of lower leaves.", "chemicals": ["Propiconazole EC", "Mancozeb 80WP"]},
    {"name": "Bean Angular Leaf Spot",      "name_sw": "Madoa ya Pembetatu ya Maharagwe",      "crop": "Beans",  "severity": "medium", "symptoms": "Angular water-soaked lesions bounded by leaf veins, turning brown with yellow halo.",              "chemicals": ["Copper Oxychloride", "Mancozeb 80WP"]},
    {"name": "Bean Anthracnose",            "name_sw": "Ugonjwa wa Antraknoze ya Maharagwe",   "crop": "Beans",  "severity": "high",   "symptoms": "Sunken dark brown lesions on pods, stems and leaves; salmon-colored spore masses in wet weather.", "chemicals": ["Chlorothalonil 75WP", "Mancozeb 80WP"]},
    {"name": "Potato Late Blight",          "name_sw": "Ugonjwa wa Kuoza kwa Viazi",           "crop": "Potato", "severity": "high",   "symptoms": "Water-soaked pale green to brown leaf spots, white mycelium on underside, tuber rot.",             "chemicals": ["Ridomil Gold MZ", "Dithane M-45"]},
    {"name": "Potato Common Scab",          "name_sw": "Ugonjwa wa Waa wa Viazi",              "crop": "Potato", "severity": "low",    "symptoms": "Rough corky lesions on tuber surface, slight pitting, reduced marketability.",                     "chemicals": ["Sulfur 80WP"]},
]

CHEMICALS = [
    {"name": "Ridomil Gold MZ",    "sku": "RGM-001", "active_ingredient": "Metalaxyl-M 4% + Mancozeb 64%",  "dosage": "2.5 g/L water",    "application": "Foliar spray every 10–14 days",       "price_kes": 850, "supplier": "Syngenta Kenya",      "stock_units": 240},
    {"name": "Mancozeb 80WP",      "sku": "MCZ-002", "active_ingredient": "Mancozeb 80%",                    "dosage": "2 g/L water",      "application": "Foliar spray every 7–10 days",        "price_kes": 320, "supplier": "UPL Kenya",            "stock_units": 510},
    {"name": "Copper Oxychloride", "sku": "COC-003", "active_ingredient": "Copper oxychloride 50%",          "dosage": "3 g/L water",      "application": "Foliar spray, pre-infection",          "price_kes": 280, "supplier": "BASF East Africa",    "stock_units": 380},
    {"name": "Chlorothalonil 75WP","sku": "CLT-004", "active_ingredient": "Chlorothalonil 75%",              "dosage": "2 g/L water",      "application": "Foliar spray every 7 days",           "price_kes": 420, "supplier": "Corteva Kenya",        "stock_units": 155},
    {"name": "Propiconazole EC",   "sku": "PPZ-005", "active_ingredient": "Propiconazole 25%",               "dosage": "0.5 ml/L water",   "application": "Foliar spray at first sign",           "price_kes": 650, "supplier": "Syngenta Kenya",      "stock_units": 90},
    {"name": "Thiamethoxam 25WG",  "sku": "TMX-006", "active_ingredient": "Thiamethoxam 25%",                "dosage": "0.4 g/L water",    "application": "Soil drench or foliar",               "price_kes": 720, "supplier": "Syngenta Kenya",      "stock_units": 70},
    {"name": "Imidacloprid 70WS",  "sku": "IMD-007", "active_ingredient": "Imidacloprid 70%",                "dosage": "4 g/kg seed",      "application": "Seed treatment",                      "price_kes": 550, "supplier": "Bayer East Africa",   "stock_units": 200},
    {"name": "Dithane M-45",       "sku": "DTH-008", "active_ingredient": "Mancozeb 80%",                    "dosage": "2 g/L water",      "application": "Foliar spray every 7 days",           "price_kes": 340, "supplier": "Dow AgroSciences",    "stock_units": 430},
    {"name": "Sulfur 80WP",        "sku": "SUL-009", "active_ingredient": "Elemental sulfur 80%",            "dosage": "3 g/L water",      "application": "Foliar spray or soil incorporation",  "price_kes": 180, "supplier": "AIMCO Kenya",          "stock_units": 600},
    {"name": "Cymoxanil 45WP",     "sku": "CYM-010", "active_ingredient": "Cymoxanil 45%",                   "dosage": "1.5 g/L water",    "application": "Curative foliar spray",               "price_kes": 490, "supplier": "FMC Kenya",            "stock_units": 120},
    {"name": "Azoxystrobin 25SC",  "sku": "AZO-011", "active_ingredient": "Azoxystrobin 25%",                "dosage": "1 ml/L water",     "application": "Foliar spray, preventive",            "price_kes": 780, "supplier": "Syngenta Kenya",      "stock_units": 85},
    {"name": "Tebuconazole 25EW",  "sku": "TEB-012", "active_ingredient": "Tebuconazole 25%",                "dosage": "1 ml/L water",     "application": "Foliar spray at flag leaf stage",     "price_kes": 620, "supplier": "Bayer East Africa",   "stock_units": 110},
]


async def seed():
    # Create tables only (never drop — backend may already be running)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Skip if already seeded
        existing = await db.execute(select(Market))
        if existing.scalars().first():
            logger.info("Database already seeded — skipping.")
            return

        market_map = {}
        for m in MARKETS:
            obj = Market(**m)
            db.add(obj)
            await db.flush()
            market_map[m["city"]] = obj

        crop_map = {}
        for c in CROPS:
            obj = Crop(**c)
            db.add(obj)
            await db.flush()
            crop_map[c["name"]] = obj

        for (crop_name, city), price in PRICES.items():
            db.add(CropPrice(
                crop_id=crop_map[crop_name].id,
                market_id=market_map[city].id,
                price_per_kg_kes=price,
            ))

        for origin, city, km, cost in DISTANCES:
            db.add(MarketDistance(
                origin_city=origin,
                market_id=market_map[city].id,
                distance_km=km,
                transport_cost_per_kg_kes=cost,
            ))

        chemical_map = {}
        for c in CHEMICALS:
            obj = Chemical(**c)
            db.add(obj)
            await db.flush()
            chemical_map[c["name"]] = obj

        for d in DISEASES:
            disease_obj = Disease(
                name=d["name"], name_sw=d["name_sw"],
                crop_id=crop_map[d["crop"]].id,
                symptoms=d["symptoms"], severity=d["severity"],
            )
            db.add(disease_obj)
            await db.flush()
            for chem_name in d["chemicals"]:
                db.add(DiseaseChemical(
                    disease_id=disease_obj.id,
                    chemical_id=chemical_map[chem_name].id,
                ))

        await db.commit()
        logger.info("Database seeded with Kenyan mock data.")


if __name__ == "__main__":
    asyncio.run(seed())
