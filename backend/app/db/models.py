from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text
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
    diseases = relationship("DiseaseChemical", back_populates="chemical")


class DiseaseChemical(Base):
    __tablename__ = "disease_chemicals"
    id = Column(Integer, primary_key=True)
    disease_id = Column(Integer, ForeignKey("diseases.id"))
    chemical_id = Column(Integer, ForeignKey("chemicals.id"))
    disease = relationship("Disease", back_populates="chemicals")
    chemical = relationship("Chemical", back_populates="diseases")
