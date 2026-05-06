from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

# ~8 MB binary → ~10.7 MB base64; 15 MB base64 cap prevents trivial DoS
_MAX_IMAGE_B64 = 15 * 1024 * 1024


class DiagnoseRequest(BaseModel):
    image_base64: str = Field(..., max_length=_MAX_IMAGE_B64)
    crop_type: Optional[str] = None
    phone: Optional[str] = None           # optional — enables history recording


class ChemicalRec(BaseModel):
    name: str
    active_ingredient: str
    dosage: str
    application: str
    price_kes: int
    in_stock: bool
    pcpb_status: str = "unverified"        # "approved" | "restricted" | "unverified"
    safety_note: Optional[str] = None


class DiagnoseResponse(BaseModel):
    disease_name: str
    confidence: float
    symptoms: str
    severity: str                          # low / medium / high / unknown
    recommendations: list[ChemicalRec]
    swahili_summary: str
    gpu_used: str                          # e.g. "AMD MI300X" or "mock"
    uncertain: bool = False                # True when confidence < threshold
    requires_expert_review: bool = False   # True for high-severity or low-confidence
    disclaimer: str = (
        "AgriSync provides decision-support only. Always confirm diagnosis "
        "with a licensed agronomist before applying chemicals."
    )


# ---------------------------------------------------------------------------
# Feedback schema
# ---------------------------------------------------------------------------

class DiagnosisFeedbackRequest(BaseModel):
    ai_disease_name: str
    actual_disease: Optional[str] = None
    ai_confidence: Optional[float] = None
    image_hash: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class MarketPrice(BaseModel):
    market: str
    city: str
    price_per_kg_kes: float
    distance_km: float
    transport_cost_kes: float
    net_profit_kes: float
    recommended: bool


class ArbitrageRequest(BaseModel):
    crop: str
    volume_kg: float
    origin_city: str = "Nakuru"
    phone: Optional[str] = None           # optional — enables history recording


class ArbitrageResponse(BaseModel):
    crop: str
    volume_kg: float
    markets: list[MarketPrice]
    best_market: str
    extra_profit_vs_worst_kes: float
    swahili_advice: str


class InventoryItem(BaseModel):
    chemical_name: str
    sku: str
    stock_units: int
    unit_price_kes: int
    supplier: str


class ReportRequest(BaseModel):
    diagnose_result: Optional[DiagnoseResponse] = None
    arbitrage_result: Optional[ArbitrageResponse] = None
    farmer_name: Optional[str] = None
    phone: Optional[str] = None
    origin_city: Optional[str] = "Nakuru"


class ReportResponse(BaseModel):
    english_report: str
    swahili_report: str
    sms_text: str                          # ≤160 chars, Swahili
    send_sms: bool


# ---------------------------------------------------------------------------
# Farmer schemas
# ---------------------------------------------------------------------------

class FarmerRegisterRequest(BaseModel):
    phone: str = Field(..., min_length=9, max_length=15)
    name: str = Field(..., min_length=2, max_length=200)
    county: Optional[str] = None
    primary_crop: Optional[str] = None


class FarmerResponse(BaseModel):
    id: int
    phone: str
    name: str
    county: Optional[str]
    primary_crop: Optional[str]
    registered_at: datetime
    last_seen_at: datetime

    class Config:
        from_attributes = True


class DiagnosisHistoryItem(BaseModel):
    disease_name: str
    confidence: float
    severity: str
    crop_type: Optional[str]
    treatment_given: Optional[str]
    queried_at: datetime

    class Config:
        from_attributes = True


class MarketQueryHistoryItem(BaseModel):
    crop: str
    volume_kg: float
    origin_city: str
    best_market_recommended: Optional[str]
    net_profit_kes: Optional[float]
    queried_at: datetime

    class Config:
        from_attributes = True


class FarmerHistoryResponse(BaseModel):
    farmer: FarmerResponse
    recent_diagnoses: list[DiagnosisHistoryItem]
    recent_market_queries: list[MarketQueryHistoryItem]
    total_diagnoses: int
    total_market_queries: int


# ---------------------------------------------------------------------------
# Catalog schemas
# ---------------------------------------------------------------------------

class CropListItem(BaseModel):
    id: int
    name: str
    name_sw: Optional[str]

    class Config:
        from_attributes = True


class DiseaseListItem(BaseModel):
    id: int
    name: str
    name_sw: Optional[str]
    crop_id: int
    severity: str

    class Config:
        from_attributes = True
