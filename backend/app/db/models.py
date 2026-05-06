from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base


class Market(Base):
    __tablename__ = "markets"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    prices = relationship("CropPrice", back_populates="market")
    distances = relationship("MarketDistance", back_populates="market", foreign_keys="MarketDistance.market_id")


class Crop(Base):
    __tablename__ = "crops"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)          # e.g. "Maize"
    name_sw = Column(String(100))                       # Swahili: "Mahindi"
    prices = relationship("CropPrice", back_populates="crop")
    diseases = relationship("Disease", back_populates="crop")


class CropPrice(Base):
    __tablename__ = "crop_prices"
    id = Column(Integer, primary_key=True)
    crop_id = Column(Integer, ForeignKey("crops.id"))
    market_id = Column(Integer, ForeignKey("markets.id"))
    price_per_kg_kes = Column(Float, nullable=False)
    crop = relationship("Crop", back_populates="prices")
    market = relationship("Market", back_populates="prices")


class MarketDistance(Base):
    __tablename__ = "market_distances"
    id = Column(Integer, primary_key=True)
    origin_city = Column(String(100), nullable=False)
    market_id = Column(Integer, ForeignKey("markets.id"))
    distance_km = Column(Float, nullable=False)
    transport_cost_per_kg_kes = Column(Float, nullable=False)
    market = relationship("Market", back_populates="distances", foreign_keys=[market_id])


class Disease(Base):
    __tablename__ = "diseases"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    name_sw = Column(String(200))
    crop_id = Column(Integer, ForeignKey("crops.id"))
    symptoms = Column(Text)
    severity = Column(String(20))                       # low / medium / high
    crop = relationship("Crop", back_populates="diseases")
    chemicals = relationship("DiseaseChemical", back_populates="disease")


class Chemical(Base):
    __tablename__ = "chemicals"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(50), unique=True, nullable=False)
    active_ingredient = Column(String(200))
    dosage = Column(String(200))
    application = Column(Text)
    price_kes = Column(Integer)
    supplier = Column(String(200))
    stock_units = Column(Integer, default=0)
    # "approved" | "restricted" | "unverified" — Kenya PCPB registration status
    pcpb_status = Column(String(20), nullable=False, default="unverified")
    safety_note = Column(Text, nullable=True)
    diseases = relationship("DiseaseChemical", back_populates="chemical")


class DiseaseChemical(Base):
    __tablename__ = "disease_chemicals"
    id = Column(Integer, primary_key=True)
    disease_id = Column(Integer, ForeignKey("diseases.id"))
    chemical_id = Column(Integer, ForeignKey("chemicals.id"))
    disease = relationship("Disease", back_populates="chemicals")
    chemical = relationship("Chemical", back_populates="diseases")


class Farmer(Base):
    __tablename__ = "farmers"
    id = Column(Integer, primary_key=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    county = Column(String(100))
    primary_crop = Column(String(100))
    registered_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_seen_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    diagnoses = relationship("DiagnosisHistory", back_populates="farmer")
    market_queries = relationship("MarketQuery", back_populates="farmer")


class DiagnosisHistory(Base):
    __tablename__ = "diagnosis_history"
    id = Column(Integer, primary_key=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, index=True)
    disease_name = Column(String(200), nullable=False)
    confidence = Column(Float, nullable=False)
    severity = Column(String(20), nullable=False)
    crop_type = Column(String(100))
    treatment_given = Column(String(200))
    queried_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    farmer = relationship("Farmer", back_populates="diagnoses")


class MarketQuery(Base):
    __tablename__ = "market_queries"
    id = Column(Integer, primary_key=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, index=True)
    crop = Column(String(100), nullable=False)
    volume_kg = Column(Float, nullable=False)
    origin_city = Column(String(100), nullable=False)
    best_market_recommended = Column(String(100))
    net_profit_kes = Column(Float)
    queried_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    farmer = relationship("Farmer", back_populates="market_queries")


class PriceCache(Base):
    __tablename__ = "price_cache"
    id = Column(Integer, primary_key=True)
    crop_name = Column(String(100), nullable=False, index=True)
    market_city = Column(String(100), nullable=False, index=True)
    price_per_kg_kes = Column(Float, nullable=False)
    source = Column(String(50), nullable=False, default="seed_data")
    fetched_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    __table_args__ = (
        UniqueConstraint("crop_name", "market_city", name="uq_price_cache_crop_market"),
    )


class DiagnosisFeedback(Base):
    __tablename__ = "diagnosis_feedback"
    id = Column(Integer, primary_key=True)
    phone = Column(String(20), nullable=True, index=True)
    ai_disease_name = Column(String(200), nullable=False)
    actual_disease = Column(String(200), nullable=True)    # farmer's correction
    ai_confidence = Column(Float, nullable=True)
    image_hash = Column(String(64), nullable=True)         # sha256[:16] for dedup
    notes = Column(Text, nullable=True)
    reported_at = Column(DateTime, nullable=False, default=datetime.utcnow)
