"""
Seed realistic Kenyan agricultural data.
Safe to run multiple times — delta-upserts only add missing records.
Run: `python -m app.db.seed`
"""
import asyncio
import logging
from sqlalchemy import select

logger = logging.getLogger("agrisync.seed")
from app.db.database import engine, AsyncSessionLocal
from app.db.models import (
    Base, Market, Crop, CropPrice, MarketDistance,
    Disease, Chemical, DiseaseChemical,
)

# ---------------------------------------------------------------------------
# MARKETS (12)
# ---------------------------------------------------------------------------
MARKETS = [
    {"name": "Nairobi Wakulima Market",   "city": "Nairobi"},
    {"name": "Mombasa Kongowea Market",   "city": "Mombasa"},
    {"name": "Kisumu Kibuye Market",      "city": "Kisumu"},
    {"name": "Nakuru Mawe Mbili",         "city": "Nakuru"},
    {"name": "Eldoret Huruma Market",     "city": "Eldoret"},
    {"name": "Meru Town Market",          "city": "Meru"},
    {"name": "Nyeri Municipal Market",    "city": "Nyeri"},
    {"name": "Thika Town Market",         "city": "Thika"},
    {"name": "Kakamega Amalemba Market",  "city": "Kakamega"},
    {"name": "Machakos Cleansing Market", "city": "Machakos"},
    {"name": "Kitale Municipal Market",   "city": "Kitale"},
    {"name": "Embu Town Market",          "city": "Embu"},
]

# ---------------------------------------------------------------------------
# CROPS (12)
# ---------------------------------------------------------------------------
CROPS = [
    {"name": "Maize",        "name_sw": "Mahindi"},
    {"name": "Tomato",       "name_sw": "Nyanya"},
    {"name": "Beans",        "name_sw": "Maharagwe"},
    {"name": "Potato",       "name_sw": "Viazi"},
    {"name": "Cassava",      "name_sw": "Muhogo"},
    {"name": "Coffee",       "name_sw": "Kahawa"},
    {"name": "Kale",         "name_sw": "Sukuma Wiki"},
    {"name": "Sweet Potato", "name_sw": "Viazi Vitamu"},
    {"name": "Sorghum",      "name_sw": "Mtama"},
    {"name": "Banana",       "name_sw": "Ndizi"},
    {"name": "Wheat",        "name_sw": "Ngano"},
    {"name": "Onion",        "name_sw": "Vitunguu"},
]

# ---------------------------------------------------------------------------
# PRICES — (crop, city): KES/kg  (2024-25 WFP/KACE estimates)
# ---------------------------------------------------------------------------
PRICES = {
    # Maize
    ("Maize", "Nairobi"): 55,  ("Maize", "Mombasa"): 62,
    ("Maize", "Kisumu"):  48,  ("Maize", "Nakuru"):  44,
    ("Maize", "Eldoret"): 46,  ("Maize", "Meru"):    50,
    ("Maize", "Nyeri"):   52,  ("Maize", "Thika"):   54,
    ("Maize", "Kakamega"):42,  ("Maize", "Machakos"):51,
    ("Maize", "Kitale"):  40,  ("Maize", "Embu"):    49,
    # Tomato
    ("Tomato", "Nairobi"): 90,  ("Tomato", "Mombasa"): 105,
    ("Tomato", "Kisumu"):  75,  ("Tomato", "Nakuru"):   68,
    ("Tomato", "Eldoret"): 72,  ("Tomato", "Meru"):     95,
    ("Tomato", "Nyeri"):   85,  ("Tomato", "Thika"):    88,
    ("Tomato", "Kakamega"):70,  ("Tomato", "Machakos"): 82,
    ("Tomato", "Kitale"):  65,  ("Tomato", "Embu"):     92,
    # Beans
    ("Beans", "Nairobi"): 120, ("Beans", "Mombasa"): 135,
    ("Beans", "Kisumu"):  100, ("Beans", "Nakuru"):    95,
    ("Beans", "Eldoret"):  98, ("Beans", "Meru"):     110,
    ("Beans", "Nyeri"):   108, ("Beans", "Thika"):    115,
    ("Beans", "Kakamega"): 92, ("Beans", "Machakos"): 105,
    ("Beans", "Kitale"):   90, ("Beans", "Embu"):     112,
    # Potato
    ("Potato", "Nairobi"): 45, ("Potato", "Mombasa"): 55,
    ("Potato", "Kisumu"):  40, ("Potato", "Nakuru"):   35,
    ("Potato", "Eldoret"): 38, ("Potato", "Meru"):     42,
    ("Potato", "Nyeri"):   44, ("Potato", "Thika"):    43,
    ("Potato", "Kakamega"):37, ("Potato", "Machakos"): 41,
    ("Potato", "Kitale"):  33, ("Potato", "Embu"):     43,
    # Cassava
    ("Cassava", "Nairobi"): 35, ("Cassava", "Mombasa"): 40,
    ("Cassava", "Kisumu"):  28, ("Cassava", "Nakuru"):   30,
    ("Cassava", "Eldoret"): 29, ("Cassava", "Meru"):     32,
    ("Cassava", "Nyeri"):   33, ("Cassava", "Thika"):    34,
    ("Cassava", "Kakamega"):26, ("Cassava", "Machakos"): 31,
    ("Cassava", "Kitale"):  25, ("Cassava", "Embu"):     33,
    # Coffee (green bean KES/kg farmgate approximation)
    ("Coffee", "Nairobi"): 180, ("Coffee", "Mombasa"): 170,
    ("Coffee", "Kisumu"):  155, ("Coffee", "Nakuru"):   150,
    ("Coffee", "Eldoret"): 148, ("Coffee", "Meru"):     185,
    ("Coffee", "Nyeri"):   190, ("Coffee", "Thika"):    175,
    ("Coffee", "Kakamega"):142, ("Coffee", "Machakos"): 160,
    ("Coffee", "Kitale"):  140, ("Coffee", "Embu"):     182,
    # Kale
    ("Kale", "Nairobi"): 25, ("Kale", "Mombasa"): 30,
    ("Kale", "Kisumu"):  20, ("Kale", "Nakuru"):   18,
    ("Kale", "Eldoret"): 19, ("Kale", "Meru"):     22,
    ("Kale", "Nyeri"):   23, ("Kale", "Thika"):    24,
    ("Kale", "Kakamega"):17, ("Kale", "Machakos"): 21,
    ("Kale", "Kitale"):  16, ("Kale", "Embu"):     22,
    # Sweet Potato
    ("Sweet Potato", "Nairobi"): 38, ("Sweet Potato", "Mombasa"): 45,
    ("Sweet Potato", "Kisumu"):  30, ("Sweet Potato", "Nakuru"):   28,
    ("Sweet Potato", "Eldoret"): 29, ("Sweet Potato", "Meru"):     35,
    ("Sweet Potato", "Nyeri"):   36, ("Sweet Potato", "Thika"):    37,
    ("Sweet Potato", "Kakamega"):26, ("Sweet Potato", "Machakos"): 33,
    ("Sweet Potato", "Kitale"):  25, ("Sweet Potato", "Embu"):     35,
    # Sorghum
    ("Sorghum", "Nairobi"): 42, ("Sorghum", "Mombasa"): 48,
    ("Sorghum", "Kisumu"):  35, ("Sorghum", "Nakuru"):   33,
    ("Sorghum", "Eldoret"): 34, ("Sorghum", "Meru"):     38,
    ("Sorghum", "Nyeri"):   39, ("Sorghum", "Thika"):    41,
    ("Sorghum", "Kakamega"):31, ("Sorghum", "Machakos"): 37,
    ("Sorghum", "Kitale"):  30, ("Sorghum", "Embu"):     38,
    # Banana
    ("Banana", "Nairobi"): 60, ("Banana", "Mombasa"): 70,
    ("Banana", "Kisumu"):  50, ("Banana", "Nakuru"):   45,
    ("Banana", "Eldoret"): 47, ("Banana", "Meru"):     55,
    ("Banana", "Nyeri"):   58, ("Banana", "Thika"):    59,
    ("Banana", "Kakamega"):43, ("Banana", "Machakos"): 52,
    ("Banana", "Kitale"):  40, ("Banana", "Embu"):     56,
    # Wheat
    ("Wheat", "Nairobi"): 65, ("Wheat", "Mombasa"): 72,
    ("Wheat", "Kisumu"):  58, ("Wheat", "Nakuru"):   55,
    ("Wheat", "Eldoret"): 56, ("Wheat", "Meru"):     60,
    ("Wheat", "Nyeri"):   62, ("Wheat", "Thika"):    64,
    ("Wheat", "Kakamega"):53, ("Wheat", "Machakos"): 59,
    ("Wheat", "Kitale"):  52, ("Wheat", "Embu"):     61,
    # Onion
    ("Onion", "Nairobi"): 75, ("Onion", "Mombasa"): 85,
    ("Onion", "Kisumu"):  62, ("Onion", "Nakuru"):   58,
    ("Onion", "Eldoret"): 60, ("Onion", "Meru"):     68,
    ("Onion", "Nyeri"):   70, ("Onion", "Thika"):    73,
    ("Onion", "Kakamega"):56, ("Onion", "Machakos"): 65,
    ("Onion", "Kitale"):  54, ("Onion", "Embu"):     69,
}

# ---------------------------------------------------------------------------
# DISTANCES — (origin, market_city, km, KES/kg) at ~1.2 KES/kg/100km
# ---------------------------------------------------------------------------
DISTANCES = [
    # Origin: Nakuru
    ("Nakuru", "Nairobi",   160, 1.92), ("Nakuru", "Mombasa",   490, 5.88),
    ("Nakuru", "Kisumu",    180, 2.16), ("Nakuru", "Nakuru",      0, 0.00),
    ("Nakuru", "Eldoret",   155, 1.86), ("Nakuru", "Meru",       367, 4.40),
    ("Nakuru", "Nyeri",     175, 2.10), ("Nakuru", "Thika",      190, 2.28),
    ("Nakuru", "Kakamega",  248, 2.98), ("Nakuru", "Machakos",   285, 3.42),
    ("Nakuru", "Kitale",    221, 2.65), ("Nakuru", "Embu",       320, 3.84),
    # Origin: Kisumu
    ("Kisumu", "Nairobi",   340, 4.08), ("Kisumu", "Mombasa",    680, 8.16),
    ("Kisumu", "Kisumu",      0, 0.00), ("Kisumu", "Nakuru",     180, 2.16),
    ("Kisumu", "Eldoret",   111, 1.33), ("Kisumu", "Meru",       474, 5.69),
    ("Kisumu", "Nyeri",     391, 4.69), ("Kisumu", "Thika",      356, 4.27),
    ("Kisumu", "Kakamega",   54, 0.65), ("Kisumu", "Machakos",   415, 4.98),
    ("Kisumu", "Kitale",    166, 1.99), ("Kisumu", "Embu",       450, 5.40),
    # Origin: Nairobi
    ("Nairobi", "Nairobi",    0, 0.00), ("Nairobi", "Mombasa",   488, 5.86),
    ("Nairobi", "Kisumu",   340, 4.08), ("Nairobi", "Nakuru",    160, 1.92),
    ("Nairobi", "Eldoret",  314, 3.77), ("Nairobi", "Meru",      237, 2.84),
    ("Nairobi", "Nyeri",    154, 1.85), ("Nairobi", "Thika",      45, 0.54),
    ("Nairobi", "Kakamega", 378, 4.54), ("Nairobi", "Machakos",   66, 0.79),
    ("Nairobi", "Kitale",   379, 4.55), ("Nairobi", "Embu",      140, 1.68),
    # Origin: Eldoret
    ("Eldoret", "Nairobi",  314, 3.77), ("Eldoret", "Mombasa",   750, 9.00),
    ("Eldoret", "Kisumu",   111, 1.33), ("Eldoret", "Nakuru",    155, 1.86),
    ("Eldoret", "Eldoret",    0, 0.00), ("Eldoret", "Meru",      441, 5.29),
    ("Eldoret", "Nyeri",    285, 3.42), ("Eldoret", "Thika",     330, 3.96),
    ("Eldoret", "Kakamega",  72, 0.86), ("Eldoret", "Machakos",  395, 4.74),
    ("Eldoret", "Kitale",    66, 0.79), ("Eldoret", "Embu",      390, 4.68),
    # Origin: Meru
    ("Meru", "Nairobi",    237, 2.84), ("Meru", "Mombasa",    597, 7.16),
    ("Meru", "Kisumu",     474, 5.69), ("Meru", "Nakuru",     367, 4.40),
    ("Meru", "Eldoret",    441, 5.29), ("Meru", "Meru",         0, 0.00),
    ("Meru", "Nyeri",       74, 0.89), ("Meru", "Thika",      155, 1.86),
    ("Meru", "Kakamega",   520, 6.24), ("Meru", "Machakos",   295, 3.54),
    ("Meru", "Kitale",     480, 5.76), ("Meru", "Embu",        61, 0.73),
    # Origin: Nyeri
    ("Nyeri", "Nairobi",   154, 1.85), ("Nyeri", "Mombasa",   496, 5.95),
    ("Nyeri", "Kisumu",    391, 4.69), ("Nyeri", "Nakuru",    175, 2.10),
    ("Nyeri", "Eldoret",   285, 3.42), ("Nyeri", "Meru",       74, 0.89),
    ("Nyeri", "Nyeri",       0, 0.00), ("Nyeri", "Thika",      72, 0.86),
    ("Nyeri", "Kakamega",  440, 5.28), ("Nyeri", "Machakos",  212, 2.54),
    ("Nyeri", "Kitale",    380, 4.56), ("Nyeri", "Embu",       60, 0.72),
    # Origin: Kakamega
    ("Kakamega", "Nairobi",   378, 4.54), ("Kakamega", "Mombasa",   800, 9.60),
    ("Kakamega", "Kisumu",     54, 0.65), ("Kakamega", "Nakuru",    248, 2.98),
    ("Kakamega", "Eldoret",    72, 0.86), ("Kakamega", "Meru",      520, 6.24),
    ("Kakamega", "Nyeri",     440, 5.28), ("Kakamega", "Thika",     394, 4.73),
    ("Kakamega", "Kakamega",    0, 0.00), ("Kakamega", "Machakos",  462, 5.54),
    ("Kakamega", "Kitale",     55, 0.66), ("Kakamega", "Embu",      470, 5.64),
    # Origin: Kitale
    ("Kitale", "Nairobi",   379, 4.55), ("Kitale", "Mombasa",   816, 9.79),
    ("Kitale", "Kisumu",    166, 1.99), ("Kitale", "Nakuru",    221, 2.65),
    ("Kitale", "Eldoret",    66, 0.79), ("Kitale", "Meru",      480, 5.76),
    ("Kitale", "Nyeri",     380, 4.56), ("Kitale", "Thika",     395, 4.74),
    ("Kitale", "Kakamega",   55, 0.66), ("Kitale", "Machakos",  463, 5.56),
    ("Kitale", "Kitale",      0, 0.00), ("Kitale", "Embu",      430, 5.16),
]

# ---------------------------------------------------------------------------
# CHEMICALS (25)
# ---------------------------------------------------------------------------
CHEMICALS = [
    # Original 12
    {"name": "Ridomil Gold MZ",     "sku": "RGM-001", "active_ingredient": "Metalaxyl-M 4% + Mancozeb 64%",  "dosage": "2.5 g/L water",   "application": "Foliar spray every 10–14 days",      "price_kes": 850, "supplier": "Syngenta Kenya",       "stock_units": 240, "pcpb_status": "approved",    "safety_note": None},
    {"name": "Mancozeb 80WP",       "sku": "MCZ-002", "active_ingredient": "Mancozeb 80%",                    "dosage": "2 g/L water",     "application": "Foliar spray every 7–10 days",       "price_kes": 320, "supplier": "UPL Kenya",             "stock_units": 510, "pcpb_status": "approved",    "safety_note": "Pre-harvest interval 7 days. Wear gloves and mask."},
    {"name": "Copper Oxychloride",  "sku": "COC-003", "active_ingredient": "Copper oxychloride 50%",          "dosage": "3 g/L water",     "application": "Foliar spray, pre-infection",         "price_kes": 280, "supplier": "BASF East Africa",     "stock_units": 380, "pcpb_status": "approved",    "safety_note": None},
    {"name": "Chlorothalonil 75WP", "sku": "CLT-004", "active_ingredient": "Chlorothalonil 75%",              "dosage": "2 g/L water",     "application": "Foliar spray every 7 days",          "price_kes": 420, "supplier": "Corteva Kenya",         "stock_units": 155, "pcpb_status": "approved",    "safety_note": "Pre-harvest interval 7 days. Avoid inhalation."},
    {"name": "Propiconazole EC",    "sku": "PPZ-005", "active_ingredient": "Propiconazole 25%",               "dosage": "0.5 ml/L water",  "application": "Foliar spray at first sign",          "price_kes": 650, "supplier": "Syngenta Kenya",       "stock_units": 90,  "pcpb_status": "approved",    "safety_note": None},
    {"name": "Thiamethoxam 25WG",   "sku": "TMX-006", "active_ingredient": "Thiamethoxam 25%",                "dosage": "0.4 g/L water",   "application": "Soil drench or foliar",              "price_kes": 720, "supplier": "Syngenta Kenya",       "stock_units": 70,  "pcpb_status": "approved",    "safety_note": "Harmful to bees — do not spray during flowering."},
    {"name": "Imidacloprid 70WS",   "sku": "IMD-007", "active_ingredient": "Imidacloprid 70%",                "dosage": "4 g/kg seed",     "application": "Seed treatment",                     "price_kes": 550, "supplier": "Bayer East Africa",    "stock_units": 200, "pcpb_status": "approved",    "safety_note": "Seed treatment only. Harmful to bees — do not use near flowering crops."},
    {"name": "Dithane M-45",        "sku": "DTH-008", "active_ingredient": "Mancozeb 80%",                    "dosage": "2 g/L water",     "application": "Foliar spray every 7 days",          "price_kes": 340, "supplier": "Dow AgroSciences",     "stock_units": 430, "pcpb_status": "approved",    "safety_note": "Pre-harvest interval 7 days. Wear gloves and mask."},
    {"name": "Sulfur 80WP",         "sku": "SUL-009", "active_ingredient": "Elemental sulfur 80%",            "dosage": "3 g/L water",     "application": "Foliar spray or soil incorporation", "price_kes": 180, "supplier": "AIMCO Kenya",           "stock_units": 600, "pcpb_status": "approved",    "safety_note": None},
    {"name": "Cymoxanil 45WP",      "sku": "CYM-010", "active_ingredient": "Cymoxanil 45%",                   "dosage": "1.5 g/L water",   "application": "Curative foliar spray",              "price_kes": 490, "supplier": "FMC Kenya",             "stock_units": 120, "pcpb_status": "approved",    "safety_note": None},
    {"name": "Azoxystrobin 25SC",   "sku": "AZO-011", "active_ingredient": "Azoxystrobin 25%",                "dosage": "1 ml/L water",    "application": "Foliar spray, preventive",           "price_kes": 780, "supplier": "Syngenta Kenya",       "stock_units": 85,  "pcpb_status": "approved",    "safety_note": None},
    {"name": "Tebuconazole 25EW",   "sku": "TEB-012", "active_ingredient": "Tebuconazole 25%",                "dosage": "1 ml/L water",    "application": "Foliar spray at flag leaf stage",    "price_kes": 620, "supplier": "Bayer East Africa",    "stock_units": 110, "pcpb_status": "approved",    "safety_note": None},
    # New 13
    {"name": "Chlorpyrifos 48EC",         "sku": "CLP-013", "active_ingredient": "Chlorpyrifos 48%",               "dosage": "2 ml/L water",   "application": "Soil/stem drench for weevils",              "price_kes": 380, "supplier": "Dow AgroSciences",      "stock_units": 160, "pcpb_status": "restricted",  "safety_note": "RESTRICTED — Class II. Full PPE required. Pre-harvest interval 14 days. Keep children and livestock away from treated areas."},
    {"name": "Iprodione 50WP",            "sku": "IPR-014", "active_ingredient": "Iprodione 50%",                   "dosage": "1.5 g/L water",  "application": "Foliar spray for Botrytis/Alternaria",      "price_kes": 520, "supplier": "Bayer East Africa",     "stock_units": 95,  "pcpb_status": "approved",    "safety_note": "Pre-harvest interval 7 days."},
    {"name": "Thiram 80WP",               "sku": "THI-015", "active_ingredient": "Thiram 80%",                      "dosage": "3 g/kg seed",    "application": "Seed treatment against damping-off",        "price_kes": 210, "supplier": "AIMCO Kenya",           "stock_units": 310, "pcpb_status": "restricted",  "safety_note": "RESTRICTED — Wear gloves and mask. Possible carcinogen (IARC Group 3). Seed treatment only — not for food contact."},
    {"name": "Kasugamycin 2SL",           "sku": "KAS-016", "active_ingredient": "Kasugamycin 2%",                  "dosage": "2 ml/L water",   "application": "Foliar spray for bacterial diseases",       "price_kes": 680, "supplier": "Agro-Chemical Food Co", "stock_units": 75,  "pcpb_status": "approved",    "safety_note": None},
    {"name": "Carboxin 75WP",             "sku": "CBX-017", "active_ingredient": "Carboxin 75%",                    "dosage": "2.5 g/kg seed",  "application": "Seed treatment for smut/bunts",             "price_kes": 340, "supplier": "Syngenta Kenya",        "stock_units": 140, "pcpb_status": "approved",    "safety_note": "Seed treatment only. Wear gloves."},
    {"name": "Metalaxyl 35WS",            "sku": "MET-018", "active_ingredient": "Metalaxyl 35%",                   "dosage": "6 g/kg seed",    "application": "Seed treatment for Pythium/Phytophthora",   "price_kes": 460, "supplier": "Syngenta Kenya",        "stock_units": 105, "pcpb_status": "approved",    "safety_note": None},
    {"name": "Trichoderma 1WP",           "sku": "TRI-019", "active_ingredient": "Trichoderma viride 1%",           "dosage": "5 g/L water",    "application": "Soil drench or seed treatment, biological", "price_kes": 180, "supplier": "Real IPM Kenya",        "stock_units": 280, "pcpb_status": "approved",    "safety_note": "Biological product — safe for use near water. No PPE required."},
    {"name": "Imidacloprid 35SC",         "sku": "IMS-020", "active_ingredient": "Imidacloprid 35%",                "dosage": "0.5 ml/L water", "application": "Foliar spray for sucking pests",            "price_kes": 490, "supplier": "Bayer East Africa",     "stock_units": 175, "pcpb_status": "approved",    "safety_note": "Harmful to bees — do not spray during flowering."},
    {"name": "Dimethoate 40EC",           "sku": "DIM-021", "active_ingredient": "Dimethoate 40%",                  "dosage": "1.5 ml/L water", "application": "Foliar spray for aphids/thrips",            "price_kes": 280, "supplier": "UPL Kenya",             "stock_units": 220, "pcpb_status": "restricted",  "safety_note": "RESTRICTED — Class II. Wear gloves, mask, and eye protection. Pre-harvest interval 7 days. Toxic to bees — avoid spraying during flowering."},
    {"name": "Emamectin Benzoate 5WG",    "sku": "EMA-022", "active_ingredient": "Emamectin benzoate 5%",           "dosage": "0.4 g/L water",  "application": "Foliar spray for caterpillars/leafminers",  "price_kes": 750, "supplier": "Syngenta Kenya",        "stock_units": 60,  "pcpb_status": "approved",    "safety_note": "Pre-harvest interval 3 days."},
    {"name": "Cymoxanil+Mancozeb 72WP",   "sku": "CMM-023", "active_ingredient": "Cymoxanil 8% + Mancozeb 64%",    "dosage": "2.5 g/L water",  "application": "Curative + protectant foliar spray",        "price_kes": 420, "supplier": "FMC Kenya",             "stock_units": 190, "pcpb_status": "approved",    "safety_note": "Pre-harvest interval 7 days. Wear gloves and mask."},
    {"name": "Actellic 50EC",             "sku": "ACT-024", "active_ingredient": "Pirimiphos-methyl 50%",           "dosage": "2 ml/L water",   "application": "Grain store insecticide spray",             "price_kes": 310, "supplier": "Syngenta Kenya",        "stock_units": 145, "pcpb_status": "approved",    "safety_note": "Grain storage use only. Ventilate store 48 hours before entry. Wear respirator."},
    {"name": "Difenoconazole 25EC",       "sku": "DIF-025", "active_ingredient": "Difenoconazole 25%",              "dosage": "0.5 ml/L water", "application": "Foliar spray for foliar diseases",          "price_kes": 690, "supplier": "Syngenta Kenya",        "stock_units": 80,  "pcpb_status": "approved",    "safety_note": None},
]

# ---------------------------------------------------------------------------
# DISEASES (50+) — name, name_sw, crop, severity, symptoms, chemicals
# ---------------------------------------------------------------------------
DISEASES = [
    # ---- Tomato ----
    {"name": "Tomato Late Blight",     "name_sw": "Ugonjwa wa Kuoza kwa Nyanya",          "crop": "Tomato", "severity": "high",
     "symptoms": "Dark brown lesions on leaves, white mold on underside, rapid defoliation, fruit rot.",
     "chemicals": ["Ridomil Gold MZ", "Mancozeb 80WP"]},
    {"name": "Tomato Early Blight",    "name_sw": "Madoa ya Mapema ya Nyanya",             "crop": "Tomato", "severity": "medium",
     "symptoms": "Concentric ring spots on older leaves, yellowing around lesions, stem collar rot.",
     "chemicals": ["Mancozeb 80WP", "Copper Oxychloride"]},
    {"name": "Tomato Bacterial Wilt",  "name_sw": "Unyauko wa Bakteria wa Nyanya",         "crop": "Tomato", "severity": "high",
     "symptoms": "Sudden wilting of entire plant without yellowing, milky bacterial streaming in water from cut stem, brown vascular ring.",
     "chemicals": ["Copper Oxychloride", "Kasugamycin 2SL"]},
    {"name": "Tomato Fusarium Wilt",   "name_sw": "Unyauko wa Fusarium ya Nyanya",         "crop": "Tomato", "severity": "high",
     "symptoms": "Yellowing and wilting of lower leaves, brown discolouration of vascular tissue visible in stem cross-section, progressive plant death.",
     "chemicals": ["Azoxystrobin 25SC", "Trichoderma 1WP"]},
    # ---- Maize ----
    {"name": "Maize Lethal Necrosis",  "name_sw": "Ugonjwa wa Kufa kwa Mahindi",           "crop": "Maize",  "severity": "high",
     "symptoms": "Chlorotic mottling from leaf tips, premature ear tip dieback, plant death within 3 weeks.",
     "chemicals": ["Thiamethoxam 25WG", "Imidacloprid 70WS"]},
    {"name": "Maize Gray Leaf Spot",   "name_sw": "Madoa ya Kijivu ya Mahindi",            "crop": "Maize",  "severity": "medium",
     "symptoms": "Rectangular tan to gray lesions running parallel to leaf veins, premature death of lower leaves.",
     "chemicals": ["Propiconazole EC", "Mancozeb 80WP"]},
    {"name": "Maize Common Rust",      "name_sw": "Kutu ya Kawaida ya Mahindi",            "crop": "Maize",  "severity": "medium",
     "symptoms": "Brick-red oval pustules on both leaf surfaces, turning black with maturity, most severe in cool wet highland conditions.",
     "chemicals": ["Propiconazole EC", "Azoxystrobin 25SC"]},
    {"name": "Maize Ear Rot",          "name_sw": "Kuoza kwa Masikio ya Mahindi",          "crop": "Maize",  "severity": "high",
     "symptoms": "Pink-red or white mould on ear, shrivelled kernels, mycotoxin contamination risk, stalk rot may accompany.",
     "chemicals": ["Tebuconazole 25EW", "Difenoconazole 25EC"]},
    {"name": "Maize Streak Virus",     "name_sw": "Virusi ya Kupiga Mistari ya Mahindi",   "crop": "Maize",  "severity": "high",
     "symptoms": "Pale yellow streaks running length of leaves, severe stunting, transmitted by leafhopper, total crop failure possible.",
     "chemicals": ["Imidacloprid 35SC", "Dimethoate 40EC"]},
    # ---- Beans ----
    {"name": "Bean Angular Leaf Spot", "name_sw": "Madoa ya Pembetatu ya Maharagwe",       "crop": "Beans",  "severity": "medium",
     "symptoms": "Angular water-soaked lesions bounded by leaf veins, turning brown with yellow halo.",
     "chemicals": ["Copper Oxychloride", "Mancozeb 80WP"]},
    {"name": "Bean Anthracnose",       "name_sw": "Antraknoze ya Maharagwe",               "crop": "Beans",  "severity": "high",
     "symptoms": "Sunken dark brown lesions on pods, stems and leaves; salmon-colored spore masses in wet weather.",
     "chemicals": ["Chlorothalonil 75WP", "Mancozeb 80WP"]},
    {"name": "Bean Root Rot",          "name_sw": "Kuoza kwa Mizizi ya Maharagwe",         "crop": "Beans",  "severity": "high",
     "symptoms": "Dark brown discolouration of roots and lower stem, stunted yellowing plants, wilting during hot part of day, damping off.",
     "chemicals": ["Thiram 80WP", "Metalaxyl 35WS"]},
    {"name": "Bean Rust",              "name_sw": "Kutu ya Maharagwe",                     "crop": "Beans",  "severity": "medium",
     "symptoms": "Red-brown powdery pustules on underside of leaves with yellow halos on upper surface, premature defoliation.",
     "chemicals": ["Propiconazole EC", "Mancozeb 80WP"]},
    # ---- Potato ----
    {"name": "Potato Late Blight",     "name_sw": "Ugonjwa wa Kuoza kwa Viazi",            "crop": "Potato", "severity": "high",
     "symptoms": "Water-soaked pale green to brown leaf spots, white mycelium on underside, tuber rot.",
     "chemicals": ["Ridomil Gold MZ", "Dithane M-45"]},
    {"name": "Potato Common Scab",     "name_sw": "Ugonjwa wa Waa wa Viazi",               "crop": "Potato", "severity": "low",
     "symptoms": "Rough corky lesions on tuber surface, slight pitting, reduced marketability.",
     "chemicals": ["Sulfur 80WP"]},
    {"name": "Potato Early Blight",    "name_sw": "Madoa ya Mapema ya Viazi",              "crop": "Potato", "severity": "medium",
     "symptoms": "Circular dark brown target-board lesions with yellow halo on older leaves, defoliation, shallow surface lesions on tubers.",
     "chemicals": ["Mancozeb 80WP", "Chlorothalonil 75WP"]},
    {"name": "Potato Bacterial Wilt",  "name_sw": "Unyauko wa Bakteria wa Viazi",          "crop": "Potato", "severity": "high",
     "symptoms": "Wilting shoots in hot midday sun, brown ring in tuber cross-section, milky slime from infected tuber, soil-borne pathogen.",
     "chemicals": ["Copper Oxychloride", "Kasugamycin 2SL"]},
    # ---- Cassava ----
    {"name": "Cassava Mosaic Disease",    "name_sw": "Ugonjwa wa Mosaic ya Muhogo",        "crop": "Cassava", "severity": "high",
     "symptoms": "Yellow-green mosaic pattern on leaves, leaf distortion and reduction in size, stunted plant growth, significant tuber yield reduction.",
     "chemicals": ["Thiamethoxam 25WG", "Imidacloprid 35SC"]},
    {"name": "Cassava Brown Streak",      "name_sw": "Mishipa ya Kahawia ya Muhogo",       "crop": "Cassava", "severity": "high",
     "symptoms": "Brown streaking on stems, necrotic yellow patches on leaves, internal brown corky necrosis of tuber flesh making it inedible.",
     "chemicals": ["Thiamethoxam 25WG", "Imidacloprid 70WS"]},
    {"name": "Cassava Bacterial Blight",  "name_sw": "Blight ya Bakteria ya Muhogo",      "crop": "Cassava", "severity": "medium",
     "symptoms": "Angular water-soaked leaf spots turning brown, leaf blight, die-back of shoot tips, milky bacterial exudate on cut stems.",
     "chemicals": ["Copper Oxychloride", "Kasugamycin 2SL"]},
    # ---- Coffee ----
    {"name": "Coffee Berry Disease",   "name_sw": "Ugonjwa wa Matunda ya Kahawa",          "crop": "Coffee", "severity": "high",
     "symptoms": "Dark sunken lesions on green berries, mummified black berries on tree, severe crop loss especially in wet seasons.",
     "chemicals": ["Copper Oxychloride", "Chlorothalonil 75WP"]},
    {"name": "Coffee Leaf Rust",       "name_sw": "Kutu ya Majani ya Kahawa",              "crop": "Coffee", "severity": "high",
     "symptoms": "Orange-yellow powdery pustules on underside of leaves, premature leaf drop, defoliation of upper canopy.",
     "chemicals": ["Copper Oxychloride", "Propiconazole EC"]},
    {"name": "Coffee Wilt Disease",    "name_sw": "Ugonjwa wa Unyauko wa Kahawa",          "crop": "Coffee", "severity": "high",
     "symptoms": "Sudden wilting of branches, yellowing then browning of leaves which remain attached, brown discolouration of vascular tissue.",
     "chemicals": ["Trichoderma 1WP", "Copper Oxychloride"]},
    # ---- Kale ----
    {"name": "Kale Black Rot",         "name_sw": "Kuoza Cheusi ya Sukuma Wiki",           "crop": "Kale",  "severity": "high",
     "symptoms": "V-shaped yellow lesions from leaf margins, blackening of leaf veins, wilting and collapse, foul smell from rotting tissue.",
     "chemicals": ["Copper Oxychloride", "Mancozeb 80WP"]},
    {"name": "Kale Downy Mildew",      "name_sw": "Ukungu wa Sukuma Wiki",                 "crop": "Kale",  "severity": "medium",
     "symptoms": "Yellow angular patches on upper leaf surface, white to grey cottony growth on underside, rapid spread in humid conditions.",
     "chemicals": ["Ridomil Gold MZ", "Mancozeb 80WP"]},
    {"name": "Kale Club Root",         "name_sw": "Uvimbe wa Mizizi ya Sukuma Wiki",       "crop": "Kale",  "severity": "high",
     "symptoms": "Wilting during day, pale yellowing foliage, swollen malformed roots when pulled, soil-borne — crop rotation essential.",
     "chemicals": ["Azoxystrobin 25SC", "Trichoderma 1WP"]},
    # ---- Sweet Potato ----
    {"name": "Sweet Potato Virus Disease", "name_sw": "Virusi vya Viazi Vitamu",          "crop": "Sweet Potato", "severity": "high",
     "symptoms": "Feathery mottle pattern on leaves, vein chlorosis, stunting of vines, small distorted tubers, yield loss up to 90%.",
     "chemicals": ["Thiamethoxam 25WG", "Dimethoate 40EC"]},
    {"name": "Sweet Potato Weevil",        "name_sw": "Funza wa Viazi Vitamu",            "crop": "Sweet Potato", "severity": "high",
     "symptoms": "Tunnelling in stems and tubers, black frass, vines wilt at soil level, infested tubers bitter and inedible.",
     "chemicals": ["Chlorpyrifos 48EC", "Imidacloprid 70WS"]},
    {"name": "Sweet Potato Scab",          "name_sw": "Ukurutu wa Viazi Vitamu",          "crop": "Sweet Potato", "severity": "medium",
     "symptoms": "Circular scabby lesions on tuber surface, rough corky patches, reduced marketability though flesh edible.",
     "chemicals": ["Mancozeb 80WP", "Sulfur 80WP"]},
    # ---- Sorghum ----
    {"name": "Sorghum Head Smut",      "name_sw": "Smati ya Mtama",                        "crop": "Sorghum", "severity": "high",
     "symptoms": "Entire seed head replaced by dark brown-black mass of fungal spores at harvest, grains destroyed, smut balls dispersing at maturity.",
     "chemicals": ["Carboxin 75WP", "Tebuconazole 25EW"]},
    {"name": "Sorghum Anthracnose",    "name_sw": "Antraknoze ya Mtama",                   "crop": "Sorghum", "severity": "medium",
     "symptoms": "Circular red-brown to tan lesions with dark borders on leaves and stalk, stalk rot at advanced stage.",
     "chemicals": ["Propiconazole EC", "Azoxystrobin 25SC"]},
    {"name": "Sorghum Ergot",          "name_sw": "Ergoti ya Mtama",                       "crop": "Sorghum", "severity": "medium",
     "symptoms": "Pink-red sticky honeydew exuding from florets instead of grain, shrivelled grains, affected grain toxic to livestock.",
     "chemicals": ["Copper Oxychloride", "Propiconazole EC"]},
    # ---- Banana ----
    {"name": "Banana Fusarium Wilt",   "name_sw": "Ugonjwa wa Panama wa Ndizi",            "crop": "Banana", "severity": "high",
     "symptoms": "Yellowing of oldest leaves from margins, progressive wilting and collapse, brown discolouration of pseudostem internal tissue, no cure once infected.",
     "chemicals": ["Trichoderma 1WP", "Copper Oxychloride"]},
    {"name": "Banana Black Sigatoka",  "name_sw": "Sigatoka Nyeusi ya Ndizi",              "crop": "Banana", "severity": "high",
     "symptoms": "Small pale green to yellow streaks enlarging to dark brown-black elliptical spots with yellow halos, premature leaf death, poor fruit fill.",
     "chemicals": ["Propiconazole EC", "Azoxystrobin 25SC"]},
    {"name": "Banana Xanthomonas Wilt","name_sw": "Unyauko wa Xanthomonas wa Ndizi",       "crop": "Banana", "severity": "high",
     "symptoms": "Internal yellowing of fruit, uneven ripening, wilting of male bud, bacterial ooze from cut pseudostem, entire mat eventually dies.",
     "chemicals": ["Copper Oxychloride", "Kasugamycin 2SL"]},
    # ---- Wheat ----
    {"name": "Wheat Stem Rust",        "name_sw": "Kutu ya Mashina ya Ngano",              "crop": "Wheat", "severity": "high",
     "symptoms": "Brick-red elongated pustules on stems and leaves, turning black at maturity, lodging and severe grain shrivelling.",
     "chemicals": ["Tebuconazole 25EW", "Propiconazole EC"]},
    {"name": "Wheat Yellow Rust",      "name_sw": "Kutu ya Njano ya Ngano",                "crop": "Wheat", "severity": "high",
     "symptoms": "Yellow-orange powdery pustules in stripe pattern along veins on leaves and glumes, up to 70% yield loss, most damaging in cool highlands.",
     "chemicals": ["Propiconazole EC", "Azoxystrobin 25SC"]},
    {"name": "Wheat Septoria Blotch",  "name_sw": "Madoa ya Septoria ya Ngano",            "crop": "Wheat", "severity": "medium",
     "symptoms": "Tan blotches with yellow margins on lower leaves, small black pycnidia within lesions, progresses upward in wet conditions.",
     "chemicals": ["Azoxystrobin 25SC", "Tebuconazole 25EW"]},
    # ---- Onion ----
    {"name": "Onion Purple Blotch",    "name_sw": "Madoa ya Zambarau ya Vitunguu",         "crop": "Onion", "severity": "medium",
     "symptoms": "Small white lesions with purple centre on leaves and stalks, lesions expand with concentric zones, leaf collapse in severe cases.",
     "chemicals": ["Iprodione 50WP", "Mancozeb 80WP"]},
    {"name": "Onion Downy Mildew",     "name_sw": "Ukungu wa Vitunguu",                    "crop": "Onion", "severity": "medium",
     "symptoms": "Pale oval areas on leaves, violet fuzzy growth on lesion surface, leaves collapse and dry, bulb fill reduced.",
     "chemicals": ["Ridomil Gold MZ", "Mancozeb 80WP"]},
    {"name": "Onion Basal Rot",        "name_sw": "Kuoza kwa Msingi wa Vitunguu",          "crop": "Onion", "severity": "high",
     "symptoms": "Water-soaked basal plate rot, inner scales turn pink-brown, plant collapses at soil level, white mycelium at bulb base.",
     "chemicals": ["Iprodione 50WP", "Thiram 80WP"]},
]


# ---------------------------------------------------------------------------
# Delta-upsert helpers
# ---------------------------------------------------------------------------

async def _get_or_create_market(db, m: dict) -> Market:
    r = await db.execute(select(Market).where(Market.city == m["city"]))
    obj = r.scalars().first()
    if not obj:
        obj = Market(**m)
        db.add(obj)
        await db.flush()
    return obj


async def _get_or_create_crop(db, c: dict) -> Crop:
    r = await db.execute(select(Crop).where(Crop.name == c["name"]))
    obj = r.scalars().first()
    if not obj:
        obj = Crop(**c)
        db.add(obj)
        await db.flush()
    return obj


async def _get_or_create_chemical(db, c: dict) -> Chemical:
    r = await db.execute(select(Chemical).where(Chemical.sku == c["sku"]))
    obj = r.scalars().first()
    if not obj:
        obj = Chemical(**c)
        db.add(obj)
        await db.flush()
    return obj


# ---------------------------------------------------------------------------
# Main seed function
# ---------------------------------------------------------------------------

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Markets
        market_map: dict[str, Market] = {}
        for m in MARKETS:
            market_map[m["city"]] = await _get_or_create_market(db, m)

        # Crops
        crop_map: dict[str, Crop] = {}
        for c in CROPS:
            crop_map[c["name"]] = await _get_or_create_crop(db, c)

        # Prices — upsert per (crop, market) pair
        for (crop_name, city), price in PRICES.items():
            crop_obj = crop_map.get(crop_name)
            market_obj = market_map.get(city)
            if not crop_obj or not market_obj:
                continue
            r = await db.execute(
                select(CropPrice).where(
                    CropPrice.crop_id == crop_obj.id,
                    CropPrice.market_id == market_obj.id,
                )
            )
            if not r.scalars().first():
                db.add(CropPrice(
                    crop_id=crop_obj.id,
                    market_id=market_obj.id,
                    price_per_kg_kes=price,
                ))

        # Distances — upsert per (origin, market) pair
        for origin, city, km, cost in DISTANCES:
            market_obj = market_map.get(city)
            if not market_obj:
                continue
            r = await db.execute(
                select(MarketDistance).where(
                    MarketDistance.origin_city == origin,
                    MarketDistance.market_id == market_obj.id,
                )
            )
            if not r.scalars().first():
                db.add(MarketDistance(
                    origin_city=origin,
                    market_id=market_obj.id,
                    distance_km=km,
                    transport_cost_per_kg_kes=cost,
                ))

        # Chemicals
        chemical_map: dict[str, Chemical] = {}
        for c in CHEMICALS:
            chemical_map[c["name"]] = await _get_or_create_chemical(db, c)

        # Diseases + disease-chemical links
        for d in DISEASES:
            crop_obj = crop_map.get(d["crop"])
            if not crop_obj:
                logger.warning("Crop not found for disease %s — skipping", d["name"])
                continue
            r = await db.execute(select(Disease).where(Disease.name == d["name"]))
            disease_obj = r.scalars().first()
            if not disease_obj:
                disease_obj = Disease(
                    name=d["name"], name_sw=d["name_sw"],
                    crop_id=crop_obj.id,
                    symptoms=d["symptoms"], severity=d["severity"],
                )
                db.add(disease_obj)
                await db.flush()
                for chem_name in d["chemicals"]:
                    chem_obj = chemical_map.get(chem_name)
                    if chem_obj:
                        db.add(DiseaseChemical(
                            disease_id=disease_obj.id,
                            chemical_id=chem_obj.id,
                        ))

        await db.commit()
        logger.info(
            "Seed complete: %d markets, %d crops, %d diseases, %d chemicals.",
            len(market_map), len(crop_map), len(DISEASES), len(CHEMICALS),
        )


if __name__ == "__main__":
    asyncio.run(seed())
