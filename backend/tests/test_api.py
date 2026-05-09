# ── API Integration Tests ─────────────────────────────────────────────────────
# These tests check every API endpoint from the outside — exactly like
# a judge or the frontend would interact with the system.
# We test every route checking:
# 1. Happy path — valid input returns expected output with correct fields
# 2. Missing fields — FastAPI returns 422 (Unprocessable Entity)
# 3. Bad input — returns 400/404, never crashes with 500
# ─────────────────────────────────────────────────────────────────────────────

import pytest


# ── /health ───────────────────────────────────────────────────────────────────

class TestHealth:

    async def test_health_returns_ok(self, async_client):
        """Health endpoint should return status ok with HTTP 200."""
        response = await async_client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data

    async def test_health_returns_service_name(self, async_client):
        """Health endpoint should identify the service."""
        response = await async_client.get("/health")
        data = response.json()

        assert "service" in data
        assert len(data["service"]) > 0


# ── /gpu-info ─────────────────────────────────────────────────────────────────

class TestGpuInfo:

    async def test_gpu_info_returns_200(self, async_client):
        """GPU info endpoint should return HTTP 200."""
        response = await async_client.get("/gpu-info")

        assert response.status_code == 200

    async def test_gpu_info_has_required_fields(self, async_client):
        """GPU info should return all fields defined in GpuInfoResponse."""
        response = await async_client.get("/gpu-info")
        data = response.json()

        assert "backend" in data
        assert "gpu" in data
        assert "model_loaded" in data
        assert "inference_count" in data

    async def test_gpu_info_backend_is_known_value(self, async_client):
        """Backend field should always be a known value."""
        response = await async_client.get("/gpu-info")
        data = response.json()

        assert data["backend"] in [
            "mock", "ROCm", "CUDA", "cpu (mock mode active)", "CPU", "unknown"
        ]


# ── /inventory ────────────────────────────────────────────────────────────────

class TestInventory:

    async def test_inventory_returns_list(self, async_client):
        """Inventory should return a list of chemicals."""
        response = await async_client.get("/inventory")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_inventory_items_have_required_fields(self, async_client):
        """Each inventory item should have all required fields."""
        response = await async_client.get("/inventory")
        data = response.json()

        assert len(data) > 0
        for item in data:
            assert "chemical_name" in item
            assert "sku" in item
            assert "stock_units" in item
            assert "unit_price_kes" in item
            assert "supplier" in item

    async def test_inventory_stock_units_are_non_negative(self, async_client):
        """Stock units should never be negative."""
        response = await async_client.get("/inventory")
        data = response.json()

        for item in data:
            assert item["stock_units"] >= 0


# ── /diagnose ─────────────────────────────────────────────────────────────────

class TestDiagnose:

    async def test_valid_image_returns_200(self, async_client):
        """Valid base64 image should return HTTP 200."""
        response = await async_client.post("/diagnose", json={
            "image_base64": "ZmFrZWltYWdl",
            "crop_type": "Tomato"
        })

        assert response.status_code == 200

    async def test_valid_image_returns_disease_name(self, async_client):
        """Response should contain a non-empty disease_name field."""
        response = await async_client.post("/diagnose", json={
            "image_base64": "ZmFrZWltYWdl",
            "crop_type": "Tomato"
        })
        data = response.json()

        assert "disease_name" in data
        assert len(data["disease_name"]) > 0

    async def test_valid_image_returns_confidence(self, async_client):
        """Response should contain a confidence score between 0 and 1."""
        response = await async_client.post("/diagnose", json={
            "image_base64": "ZmFrZWltYWdl",
        })
        data = response.json()

        assert "confidence" in data
        assert 0.0 <= data["confidence"] <= 1.0

    async def test_valid_image_returns_swahili_summary(self, async_client):
        """Response should always contain a Swahili summary."""
        response = await async_client.post("/diagnose", json={
            "image_base64": "ZmFrZWltYWdl",
        })
        data = response.json()

        assert "swahili_summary" in data
        assert len(data["swahili_summary"]) > 0

    async def test_valid_image_returns_severity(self, async_client):
        """Response should contain a severity field."""
        response = await async_client.post("/diagnose", json={
            "image_base64": "ZmFrZWltYWdl",
        })
        data = response.json()

        assert "severity" in data
        assert data["severity"] in ["low", "medium", "high", "unknown"]

    async def test_missing_image_returns_422(self, async_client):
        """Missing image_base64 should return 422."""
        response = await async_client.post("/diagnose", json={
            "crop_type": "Tomato"
        })

        assert response.status_code == 422

    async def test_response_has_disclaimer(self, async_client):
        """Response should always include the safety disclaimer."""
        response = await async_client.post("/diagnose", json={
            "image_base64": "ZmFrZWltYWdl",
        })
        data = response.json()

        assert "disclaimer" in data
        assert len(data["disclaimer"]) > 0


# ── /arbitrage ────────────────────────────────────────────────────────────────

class TestArbitrage:

    async def test_valid_request_returns_200(self, async_client):
        """Valid arbitrage request should return HTTP 200."""
        response = await async_client.post("/arbitrage", json={
            "crop": "Maize",
            "volume_kg": 500,
            "origin_city": "Nakuru"
        })

        assert response.status_code == 200

    async def test_valid_request_returns_markets(self, async_client):
        """Response should contain a non-empty markets list."""
        response = await async_client.post("/arbitrage", json={
            "crop": "Maize",
            "volume_kg": 500,
            "origin_city": "Nakuru"
        })
        data = response.json()

        assert "markets" in data
        assert len(data["markets"]) >= 1

    async def test_response_has_best_market(self, async_client):
        """Response should identify the best market."""
        response = await async_client.post("/arbitrage", json={
            "crop": "Maize",
            "volume_kg": 500,
            "origin_city": "Nakuru"
        })
        data = response.json()

        assert "best_market" in data
        assert len(data["best_market"]) > 0

    async def test_response_has_swahili_advice(self, async_client):
        """Response should contain Swahili advice."""
        response = await async_client.post("/arbitrage", json={
            "crop": "Maize",
            "volume_kg": 500,
            "origin_city": "Nakuru"
        })
        data = response.json()

        assert "swahili_advice" in data
        assert len(data["swahili_advice"]) > 0

    async def test_first_market_is_recommended(self, async_client):
        """The best market should have recommended set to True."""
        response = await async_client.post("/arbitrage", json={
            "crop": "Maize",
            "volume_kg": 500,
            "origin_city": "Nakuru"
        })
        data = response.json()

        assert data["markets"][0]["recommended"] is True

    async def test_unknown_crop_returns_404(self, async_client):
        """Unknown crop should return 404, not crash with 500."""
        response = await async_client.post("/arbitrage", json={
            "crop": "Durian",
            "volume_kg": 500,
            "origin_city": "Nakuru"
        })

        assert response.status_code == 404

    async def test_missing_crop_returns_422(self, async_client):
        """Missing crop field should return 422."""
        response = await async_client.post("/arbitrage", json={
            "volume_kg": 500,
            "origin_city": "Nakuru"
        })

        assert response.status_code == 422

    async def test_missing_volume_returns_422(self, async_client):
        """Missing volume_kg should return 422."""
        response = await async_client.post("/arbitrage", json={
            "crop": "Maize",
            "origin_city": "Nakuru"
        })

        assert response.status_code == 422


# ── /report ───────────────────────────────────────────────────────────────────

class TestReport:

    async def test_valid_report_returns_200(self, async_client):
        """Valid report request should return HTTP 200."""
        response = await async_client.post("/report", json={
            "diagnose_result": {
                "disease_name": "Early Blight",
                "confidence": 0.91,
                "symptoms": "Dark brown spots on leaves",
                "severity": "medium",
                "recommendations": [
                    {
                        "name": "Ridomil Gold",
                        "active_ingredient": "Mefenoxam",
                        "dosage": "25g per 20L water",
                        "application": "Foliar spray",
                        "price_kes": 520,
                        "in_stock": True,
                        "pcpb_status": "approved"
                    }
                ],
                "swahili_summary": "Tumia Ridomil Gold.",
                "gpu_used": "mock",
                "uncertain": False,
                "requires_expert_review": False
            },
            "arbitrage_result": {
                "crop": "Maize",
                "volume_kg": 500,
                "markets": [
                    {
                        "market": "Kongowea Market",
                        "city": "Mombasa",
                        "price_per_kg_kes": 50.0,
                        "distance_km": 620.0,
                        "transport_cost_kes": 4960.0,
                        "net_profit_kes": 20040.0,
                        "recommended": True
                    }
                ],
                "best_market": "Mombasa",
                "extra_profit_vs_worst_kes": 5000.0,
                "swahili_advice": "Leo uza sokoni Mombasa."
            },
            "farmer_name": "Wanjiku",
            "origin_city": "Nakuru"
        })

        assert response.status_code == 200

    async def test_report_has_sms_text(self, async_client):
        """Report should contain sms_text under 160 characters."""
        response = await async_client.post("/report", json={
            "diagnose_result": None,
            "arbitrage_result": None,
            "farmer_name": "Kamau",
            "origin_city": "Nakuru"
        })

        assert response.status_code == 200
        data = response.json()
        assert "sms_text" in data
        assert len(data["sms_text"]) <= 160

    async def test_report_has_english_and_swahili(self, async_client):
        """Report should contain both English and Swahili reports."""
        response = await async_client.post("/report", json={
            "diagnose_result": None,
            "arbitrage_result": None,
            "farmer_name": "Kamau",
            "origin_city": "Nakuru"
        })
        data = response.json()

        assert "english_report" in data
        assert "swahili_report" in data


# ── /analyze ──────────────────────────────────────────────────────────────────

class TestAnalyze:

    async def test_full_pipeline_returns_200(self, async_client):
        """Full pipeline should return HTTP 200."""
        response = await async_client.post("/analyze", json={
            "image_base64": "ZmFrZWltYWdl",
            "crop": "Maize",
            "volume_kg": 500,
            "origin_city": "Nakuru",
            "farmer_name": "Wanjiku"
        })

        assert response.status_code == 200

    async def test_full_pipeline_has_all_sections(self, async_client):
        """Full pipeline response should contain diagnose, arbitrage and report."""
        response = await async_client.post("/analyze", json={
            "image_base64": "ZmFrZWltYWdl",
            "crop": "Maize",
            "volume_kg": 500,
            "origin_city": "Nakuru",
            "farmer_name": "Wanjiku"
        })
        data = response.json()

        assert "diagnose" in data
        assert "arbitrage" in data
        assert "report" in data

    async def test_full_pipeline_has_inference_ms(self, async_client):
        """Full pipeline should report inference time."""
        response = await async_client.post("/analyze", json={
            "image_base64": "ZmFrZWltYWdl",
            "crop": "Maize",
            "volume_kg": 500,
            "origin_city": "Nakuru"
        })
        data = response.json()

        assert "inference_ms" in data
        assert data["inference_ms"] >= 0

    async def test_full_pipeline_missing_image_returns_422(self, async_client):
        """Missing image in full pipeline should return 422."""
        response = await async_client.post("/analyze", json={
            "crop": "Maize",
            "volume_kg": 500,
            "origin_city": "Nakuru"
        })

        assert response.status_code == 422