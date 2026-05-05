from pydantic import BaseModel, Field
from typing import Optional

# ~8 MB binary → ~10.7 MB base64; 15 MB base64 cap prevents trivial DoS
_MAX_IMAGE_B64 = 15 * 1024 * 1024


class DiagnoseRequest(BaseModel):
    image_base64: str = Field(..., max_length=_MAX_IMAGE_B64)
    crop_type: Optional[str] = None


class ChemicalRec(BaseModel):
    name: str
    active_ingredient: str
    dosage: str
    application: str
    price_kes: int
    in_stock: bool


class DiagnoseResponse(BaseModel):
    disease_name: str
    confidence: float
    symptoms: str
    severity: str                          # low / medium / high
    recommendations: list[ChemicalRec]
    swahili_summary: str
    gpu_used: str                          # e.g. "AMD MI300X" or "mock"


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


class ReportResponse(BaseModel):
    english_report: str
    swahili_report: str
    sms_text: str                          # ≤160 chars, Swahili
    send_sms: bool
