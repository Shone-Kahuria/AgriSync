# ── Test Configuration & Fixtures ─────────────────────────────────────────────
# This file is the backbone of our entire test suite.
# It sets up everything tests need before they run:
#
# 1. Environment variables — force mock mode so no real GPU is needed
# 2. In-memory SQLite database — fast, disposable, no PostgreSQL needed
# 3. Seeded data — realistic Kenyan crops, markets, chemicals loaded once
# 4. Mocked vision — fake agronomist responses so tests don't need a real image
# 5. Async HTTP client — sends fake requests to FastAPI without a real server
#
# Every fixture here is shared across all three test files automatically.
# ─────────────────────────────────────────────────────────────────────────────

import pytest
import os

# ── Force mock mode before any app code is imported ──────────────────────────
os.environ["USE_MOCK_VISION"] = "true"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_agrisync.db"
os.environ["ENVIRONMENT"] = "development"
os.environ["API_KEY"] = ""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from httpx import AsyncClient, ASGITransport

from app.db.database import Base, get_db
from app.db.models import (
    Crop, Market, CropPrice, MarketDistance,
    Chemical, Disease, DiseaseChemical
)
from app.main import app

# ── Test Database ─────────────────────────────────────────────────────────────

TEST_DB_URL = "sqlite+aiosqlite:///./test_agrisync.db"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, expire_on_commit=False)


# ── Create tables and seed data once for the whole test session ───────────────

@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    """
    Creates all database tables and fills them with realistic mock data.
    Runs once before any test, tears down after all tests are done.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSession() as db:
        # ── Crops ─────────────────────────────────────────────────────────────
        maize  = Crop(name="Maize",  name_sw="Mahindi")
        tomato = Crop(name="Tomato", name_sw="Nyanya")
        potato = Crop(name="Potato", name_sw="Viazi")
        db.add_all([maize, tomato, potato])
        await db.flush()

        # ── Markets ───────────────────────────────────────────────────────────
        wakulima = Market(name="Wakulima Market",   city="Nairobi")
        kongowea = Market(name="Kongowea Market",   city="Mombasa")
        nakuru_m = Market(name="Nakuru ASK Market", city="Nakuru")
        db.add_all([wakulima, kongowea, nakuru_m])
        await db.flush()

        # ── Crop Prices ───────────────────────────────────────────────────────
        db.add_all([
            CropPrice(crop_id=maize.id,  market_id=wakulima.id, price_per_kg_kes=45.0),
            CropPrice(crop_id=maize.id,  market_id=kongowea.id, price_per_kg_kes=50.0),
            CropPrice(crop_id=maize.id,  market_id=nakuru_m.id, price_per_kg_kes=40.0),
            CropPrice(crop_id=tomato.id, market_id=wakulima.id, price_per_kg_kes=80.0),
            CropPrice(crop_id=tomato.id, market_id=kongowea.id, price_per_kg_kes=90.0),
            CropPrice(crop_id=potato.id, market_id=wakulima.id, price_per_kg_kes=60.0),
        ])
        await db.flush()

        # ── Market Distances ──────────────────────────────────────────────────
        db.add_all([
            MarketDistance(origin_city="Nakuru", market_id=wakulima.id, distance_km=160.0, transport_cost_per_kg_kes=2.5),
            MarketDistance(origin_city="Nakuru", market_id=kongowea.id, distance_km=620.0, transport_cost_per_kg_kes=8.0),
            MarketDistance(origin_city="Nakuru", market_id=nakuru_m.id, distance_km=0.0,   transport_cost_per_kg_kes=0.0),
            MarketDistance(origin_city="Nairobi", market_id=wakulima.id, distance_km=0.0,  transport_cost_per_kg_kes=0.0),
            MarketDistance(origin_city="Nairobi", market_id=kongowea.id, distance_km=480.0, transport_cost_per_kg_kes=6.0),
        ])
        await db.flush()

        # ── Chemicals ─────────────────────────────────────────────────────────
        ridomil = Chemical(
            name="Ridomil Gold",
            sku="RDM-002",
            active_ingredient="Mefenoxam",
            dosage="25g per 20L water",
            application="Foliar spray",
            price_kes=520,
            supplier="Syngenta Kenya",
            stock_units=80,
            pcpb_status="approved",
        )
        mancozeb = Chemical(
            name="Mancozeb WP",
            sku="MCZ-001",
            active_ingredient="Mancozeb",
            dosage="50g per 20L water",
            application="Foliar spray",
            price_kes=350,
            supplier="Juanco Kenya",
            stock_units=120,
            pcpb_status="approved",
        )
        db.add_all([ridomil, mancozeb])
        await db.flush()

        # ── Diseases ──────────────────────────────────────────────────────────
        early_blight = Disease(
            name="Early Blight",
            name_sw="Ugonjwa wa Mapema",
            crop_id=tomato.id,
            symptoms="Dark brown spots with concentric rings on lower leaves",
            severity="medium",
        )
        mlnd = Disease(
            name="Maize Lethal Necrosis",
            name_sw="Ugonjwa wa Mahindi",
            crop_id=maize.id,
            symptoms="Yellowing and death of leaves starting from edges",
            severity="high",
        )
        db.add_all([early_blight, mlnd])
        await db.flush()

        # ── Disease-Chemical links ────────────────────────────────────────────
        db.add_all([
            DiseaseChemical(disease_id=early_blight.id, chemical_id=ridomil.id),
            DiseaseChemical(disease_id=mlnd.id,         chemical_id=mancozeb.id),
        ])
        await db.commit()

    yield

    # Teardown — drop all tables after tests finish
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── Database session override ─────────────────────────────────────────────────

@pytest.fixture()
async def db_session() -> AsyncSession:
    """Provides a fresh async database session for each test."""
    async with TestSession() as session:
        yield session


@pytest.fixture(autouse=True)
def override_db(db_session):
    """
    Replaces the real PostgreSQL database with our test SQLite database
    for every test automatically. The app never touches real data.
    """
    async def _get_test_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


# ── Mock vision model ─────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_vision(mocker):
    """
    Replaces the real vision model with a fake one for all tests.
    Returns a realistic DiagnoseResponse without needing a GPU.
    """
    from app.schemas.models import DiagnoseResponse, ChemicalRec

    fake_response = DiagnoseResponse(
        disease_name="Early Blight",
        confidence=0.91,
        symptoms="Dark brown spots with concentric rings on lower leaves",
        severity="medium",
        recommendations=[
            ChemicalRec(
                name="Ridomil Gold",
                active_ingredient="Mefenoxam",
                dosage="25g per 20L water",
                application="Foliar spray",
                price_kes=520,
                in_stock=True,
                pcpb_status="approved",
            )
        ],
        swahili_summary="Mmea wako una ugonjwa wa Early Blight. Tumia Ridomil Gold.",
        gpu_used="mock",
        uncertain=False,
        requires_expert_review=False,
    )

    mocker.patch(
        "app.agents.agronomist.run_agronomist",
        return_value=fake_response
    )
    mocker.patch(
        "app.agents.agronomist.classify_disease",
        return_value={
            "confidence": 0.91,
            "is_healthy": False,
            "disease_name": "Early Blight",
            "db_name": "Early Blight",
            "gpu_used": "mock",
        }
    )
    mocker.patch(
        "app.agents.agronomist.run_inference",
        return_value={
            "disease_name": "Early Blight",
            "confidence": 0.91,
            "symptoms": "Dark brown spots",
            "severity": "medium",
            "gpu_used": "mock",
        }
    )


# ── Mock SMS ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_sms(mocker):
    """Prevents real SMS from being sent during tests."""
    mocker.patch("app.agents.orchestrator._send_sms", return_value=None)


# ── Mock price service ────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_price_service(mocker):
    """
    Prevents real WFP API calls during tests.
    Returns 0 so the agent falls back to seed data prices.
    """
    mocker.patch(
        "app.agents.arbitrage.price_service.get_price",
        return_value=(0.0, "mock")
    )


# ── Async HTTP client ─────────────────────────────────────────────────────────

@pytest.fixture()
async def async_client() -> AsyncClient:
    """
    Provides an async HTTP client that talks directly to the FastAPI app.
    No real server needed — perfect for testing all endpoints.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client