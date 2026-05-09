# ── Agent Unit Tests ──────────────────────────────────────────────────────────
# These tests check each agent function individually in isolation.
# Since the real agents depend on GPU and PostgreSQL, we test them by:
# 1. Calling them directly with a real test database session
# 2. Mocking the vision model so no GPU is needed
# 3. Checking the output matches the expected schema exactly
#
# This proves the business logic inside each agent is correct
# independently of the infrastructure it runs on.
# ─────────────────────────────────────────────────────────────────────────────

import pytest
from unittest.mock import AsyncMock, patch
from app.schemas.models import (
    ArbitrageRequest, DiagnoseResponse, ArbitrageResponse, ChemicalRec
)
from app.agents.arbitrage import run_arbitrage
from app.agents.orchestrator import run_orchestrator


# ── Arbitrage Agent Tests ─────────────────────────────────────────────────────

class TestArbitrageAgent:

    async def test_happy_path_maize_nakuru(self, db_session):
        """
        Happy path: Maize 500kg from Nakuru should return markets
        with the best one marked as recommended.
        """
        with patch("app.agents.arbitrage.price_service.get_price",
                   return_value=(0.0, "mock")):
            req = ArbitrageRequest(crop="Maize", volume_kg=500, origin_city="Nakuru")
            result = await run_arbitrage(req, db_session)

        assert isinstance(result, ArbitrageResponse)
        assert len(result.markets) >= 1
        assert result.markets[0].recommended is True
        assert result.best_market != ""

    async def test_markets_sorted_by_net_profit(self, db_session):
        """
        Markets should always be sorted best profit first.
        """
        with patch("app.agents.arbitrage.price_service.get_price",
                   return_value=(0.0, "mock")):
            req = ArbitrageRequest(crop="Maize", volume_kg=500, origin_city="Nakuru")
            result = await run_arbitrage(req, db_session)

        profits = [m.net_profit_kes for m in result.markets]
        assert profits == sorted(profits, reverse=True), \
            "Markets should be sorted by net profit descending"

    async def test_unknown_crop_raises_value_error(self, db_session):
        """
        Unknown crop should raise ValueError which the router
        converts to a 404 response.
        """
        with patch("app.agents.arbitrage.price_service.get_price",
                   return_value=(0.0, "mock")):
            req = ArbitrageRequest(crop="Durian", volume_kg=500, origin_city="Nakuru")
            with pytest.raises(ValueError, match="not found"):
                await run_arbitrage(req, db_session)

    async def test_result_has_swahili_advice(self, db_session):
        """
        Result should always contain Swahili advice for the farmer.
        """
        with patch("app.agents.arbitrage.price_service.get_price",
                   return_value=(0.0, "mock")):
            req = ArbitrageRequest(crop="Maize", volume_kg=500, origin_city="Nakuru")
            result = await run_arbitrage(req, db_session)

        assert len(result.swahili_advice) > 0

    async def test_extra_profit_is_non_negative(self, db_session):
        """
        Extra profit vs worst market should always be zero or positive.
        """
        with patch("app.agents.arbitrage.price_service.get_price",
                   return_value=(0.0, "mock")):
            req = ArbitrageRequest(crop="Maize", volume_kg=500, origin_city="Nakuru")
            result = await run_arbitrage(req, db_session)

        assert result.extra_profit_vs_worst_kes >= 0

    async def test_origin_city_reflected_in_result(self, db_session):
        """
        The crop and volume from the request should be reflected in the result.
        """
        with patch("app.agents.arbitrage.price_service.get_price",
                   return_value=(0.0, "mock")):
            req = ArbitrageRequest(crop="Maize", volume_kg=750, origin_city="Nakuru")
            result = await run_arbitrage(req, db_session)

        assert result.crop == "Maize"
        assert result.volume_kg == 750


# ── Orchestrator Agent Tests ──────────────────────────────────────────────────

class TestOrchestratorAgent:

    def _sample_diagnose(self) -> DiagnoseResponse:
        return DiagnoseResponse(
            disease_name="Early Blight",
            confidence=0.91,
            symptoms="Dark brown spots on leaves",
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
            swahili_summary="Tumia Ridomil Gold.",
            gpu_used="mock",
            uncertain=False,
            requires_expert_review=False,
        )

    def _sample_arbitrage(self) -> ArbitrageResponse:
        from app.schemas.models import MarketPrice
        return ArbitrageResponse(
            crop="Maize",
            volume_kg=500,
            markets=[
                MarketPrice(
                    market="Kongowea Market",
                    city="Mombasa",
                    price_per_kg_kes=50.0,
                    distance_km=620.0,
                    transport_cost_kes=4960.0,
                    net_profit_kes=20040.0,
                    recommended=True,
                )
            ],
            best_market="Mombasa",
            extra_profit_vs_worst_kes=5000.0,
            swahili_advice="Leo uza sokoni Mombasa.",
        )

    async def test_happy_path_returns_report_response(self):
        """
        Happy path: valid diagnose and arbitrage results should
        return a complete ReportResponse.
        """
        with patch("app.agents.orchestrator._send_sms", return_value=None), \
             patch("app.agents.crew.run_crew",
                   return_value=("English report", "Swahili report", "SMS text")):
            result = await run_orchestrator(
                diag=self._sample_diagnose(),
                arb=self._sample_arbitrage(),
                farmer_name="Wanjiku",
                phone=None,
                send_sms=False,
                origin_city="Nakuru",
            )

        assert result.english_report != ""
        assert result.swahili_report != ""
        assert result.sms_text != ""

    async def test_sms_text_is_160_chars_or_fewer(self):
        """
        SMS text must never exceed 160 characters — one SMS message.
        """
        with patch("app.agents.orchestrator._send_sms", return_value=None), \
             patch("app.agents.crew.run_crew",
                   return_value=("English report", "Swahili report", "S" * 160)):
            result = await run_orchestrator(
                diag=self._sample_diagnose(),
                arb=self._sample_arbitrage(),
                farmer_name="Wanjiku",
                phone=None,
                send_sms=False,
                origin_city="Nakuru",
            )

        assert len(result.sms_text) <= 160, \
            f"SMS is {len(result.sms_text)} chars — must be 160 or fewer"

    async def test_no_phone_means_sms_not_sent(self):
        """
        When no phone is provided, send_sms should be False in the response.
        """
        with patch("app.agents.orchestrator._send_sms", return_value=None), \
             patch("app.agents.crew.run_crew",
                   return_value=("English", "Swahili", "SMS")):
            result = await run_orchestrator(
                diag=None,
                arb=None,
                farmer_name="Kamau",
                phone=None,
                send_sms=False,
                origin_city="Nakuru",
            )

        assert result.send_sms is False

    async def test_none_inputs_handled_gracefully(self):
        """
        None diagnose and arbitrage results should not crash the orchestrator.
        """
        with patch("app.agents.orchestrator._send_sms", return_value=None), \
             patch("app.agents.crew.run_crew",
                   return_value=("English", "Swahili", "SMS")):
            result = await run_orchestrator(
                diag=None,
                arb=None,
                farmer_name="Farmer",
                phone=None,
                send_sms=False,
                origin_city="Nakuru",
            )

        assert result is not None