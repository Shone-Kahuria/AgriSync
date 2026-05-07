# AgriSync — Quick Start

## Local development (mock mode — no GPU needed)

```bash
cd backend
cp .env.example .env          # USE_MOCK_VISION=true by default
pip install -r requirements.txt
uvicorn app.main:app --reload  # API at http://localhost:8000

python -m app.db.seed          # seed Kenyan mock data (run once)
```

```bash
cd frontend
npm install
npm run dev                    # UI at http://localhost:5173
```

## Docker (all services)

```bash
cp backend/.env.example backend/.env
docker compose up --build
# API  → http://localhost:8000
# UI   → http://localhost:3000
# Seed → runs once automatically
```

## AMD MI300X (hackathon node)

1. Edit `backend/.env`: set `USE_MOCK_VISION=false`
2. Install ROCm PyTorch: `pip install torch --index-url https://download.pytorch.org/whl/rocm6.0`
3. Run `rocminfo` to confirm GPU visibility before starting
4. Start the API and verify `curl http://localhost:8000/gpu-info`
5. Run benchmark outputs for the presentation:

```bash
cd backend
python benchmark.py --mode mock
python benchmark.py --mode real
python benchmark.py --mode both
python benchmark.py --mode classifier
```

Benchmark output is saved to `tasks/benchmark_results.json`.
Real AMD setup notes should be recorded in `tasks/AMD_SETUP_VERIFIED.md`.

Models will be auto-downloaded from HuggingFace on first inference:
- `YuchengShi/LLaVA-v1.5-7B-Plant-Leaf-Diseases-Detection`
- `mistralai/Mistral-7B-Instruct-v0.2`

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/diagnose` | Image → disease diagnosis + treatment |
| POST | `/arbitrage` | Crop + volume → best market ranking |
| GET | `/inventory` | Agro-chemical stock levels |
| POST | `/report` | Combined bilingual PDF/SMS report |
| GET | `/gpu-info` | AMD MI300X utilisation info |
| GET | `/health` | Service health check |

## Quick curl test

```bash
# Arbitrage
curl -X POST http://localhost:8000/arbitrage \
  -H "Content-Type: application/json" \
  -d '{"crop":"Maize","volume_kg":500,"origin_city":"Nakuru"}'

# Inventory
curl http://localhost:8000/inventory
```
