# AgriSync

AgriSync is an AI farm advisor for smallholder farmers in Kenya. A farmer uploads a crop leaf photo, enters harvest volume, and receives a practical advisory that combines disease diagnosis, treatment recommendations, market arbitrage, and a short Swahili SMS.

Built for the AMD Developer Hackathon, AgriSync targets:

- Track 1: AI Agents and Agentic Workflows
- Track 3: Vision and Multimodal AI

## Problem

Smallholder farmers often face two urgent decisions at the same time:

1. What is damaging my crop, and what treatment should I use?
2. Where should I sell my harvest for the best net return after transport?

These decisions are usually fragmented across agronomists, agro-vet shops, market brokers, and informal price updates. Delays can mean crop loss, bad chemical choices, or selling into a low-margin market.

AgriSync turns those scattered decisions into one workflow: diagnose, treat, compare markets, and generate an advisory the farmer can act on immediately.

## User

Primary user: a Kenyan smallholder farmer or farmer-group field officer using a low-cost smartphone.

The interface is mobile-first because the target workflow happens in the field: take a photo of the affected leaf, enter harvest volume, then share or send the advisory by SMS.

## What It Does

- Uploads a crop leaf image for disease diagnosis.
- Uses a vision model path designed for AMD MI300X/ROCm inference.
- Looks up recommended agro-chemical treatments and stock availability.
- Compares crop prices across Kenyan markets.
- Calculates net profit after transport cost.
- Runs an agentic advisory workflow with agronomist, market analyst, and bilingual orchestrator roles.
- Produces English and Swahili reports plus a 160-character SMS preview.
- Exposes GPU/backend telemetry through `/gpu-info`.

## Architecture

```text
Farmer mobile UI
    |
    | image, crop, volume, origin city
    v
React + Vite frontend
    |
    | /api proxy
    v
FastAPI backend
    |
    +-- Vision inference
    |     +-- Mock mode for local demos
    |     +-- Llama 3.2 Vision or LLaVA on AMD MI300X/ROCm
    |
    +-- Agronomist agent
    |     +-- Disease result
    |     +-- TreatmentProtocolTool
    |     +-- Chemical inventory lookup
    |
    +-- Market arbitrage agent
    |     +-- Crop price lookup
    |     +-- Transport cost calculation
    |     +-- Best market ranking
    |
    +-- Bilingual orchestrator agent
    |     +-- English advisory
    |     +-- Swahili advisory
    |     +-- SMS text
    |
    v
PostgreSQL
    +-- markets
    +-- crops
    +-- crop prices
    +-- distances
    +-- diseases
    +-- chemicals
```

## AMD Stack

AgriSync is designed to run the heavy AI path on AMD Developer Cloud using AMD MI300X GPUs and ROCm.

AMD-relevant components:

- AMD MI300X target hardware for multimodal and LLM inference.
- ROCm PyTorch build for GPU acceleration.
- `/gpu-info` endpoint to expose detected backend, device name, memory, utilization, inference count, rolling latency, model-loaded state, and ROCm version when available.
- Vision inference path using `torch.cuda.is_available()` under ROCm, where AMD GPUs are exposed through the CUDA-compatible PyTorch API.
- Real vision warmup during FastAPI startup when `USE_MOCK_VISION=false`.
- `backend/benchmark.py` for mock, real GPU, classifier, and combined pipeline latency numbers.
- Model cache volume in Docker for Hugging Face downloads.

Local development defaults to mock mode so judges and contributors can run the product without GPU access. Hackathon evaluation should use `USE_MOCK_VISION=false` on an AMD GPU node.

## Models

Configured model options:

- Primary vision model: `meta-llama/Llama-3.2-11B-Vision-Instruct`
- Domain vision fallback: `YuchengShi/LLaVA-v1.5-7B-Plant-Leaf-Diseases-Detection`
- Agent/report model: `mistralai/Mistral-7B-Instruct-v0.2`
- Local deterministic fallback: `AgriSyncMockLLM`

The mock path is intentionally deterministic for stable demos. The real path is intended for AMD MI300X/ROCm execution.

## Agent Workflow

AgriSync uses a three-agent advisory flow:

1. Agronomist Agent

   Takes the disease diagnosis, checks treatment protocols, verifies inventory, and recommends the most useful available chemical.

2. Market Arbitrage Agent

   Looks up crop prices across Kenyan markets, subtracts transport cost, ranks markets by net return, and recommends the best destination.

3. Bilingual Orchestrator Agent

   Combines diagnosis, treatment, and market guidance into farmer-friendly English and Swahili. It also creates a short Swahili SMS suitable for feature-phone delivery.

For hackathon demos, the `/analyze` endpoint runs the full sequence in one request.

## Tech Stack

- Frontend: React, Vite, mobile-first UI
- Backend: FastAPI, Pydantic, SQLAlchemy async
- Database: PostgreSQL in Docker, SQLite-compatible code path for development
- Agents: CrewAI
- AI/ML: PyTorch, Transformers, Hugging Face models
- Deployment: Docker Compose, Nginx frontend proxy
- Optional messaging: Africa's Talking SMS API

## Repository Layout

```text
.
|-- backend/
|   |-- app/
|   |   |-- agents/       # CrewAI agents, tools, LLM wrappers
|   |   |-- db/           # SQLAlchemy models, database connection, seed data
|   |   |-- routers/      # FastAPI routes
|   |   |-- schemas/      # Pydantic request/response models
|   |   `-- vision/       # Vision model loading and inference
|   |-- Dockerfile
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- screens/
|   |   `-- api/
|   |-- Dockerfile
|   `-- vite.config.js
|-- docker-compose.yml
`-- SETUP.md
```

## Setup

### Local Development

Local mode uses deterministic mock vision so the app can run without an AMD GPU.

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
python -m app.db.seed
uvicorn app.main:app --reload
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

On Windows PowerShell, if script execution blocks `npm`, use:

```powershell
npm.cmd run dev
```

### Docker Compose

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Open:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

The seed service populates the demo database once.

### AMD MI300X / ROCm Mode

On an AMD Developer Cloud node:

1. Copy the environment file.

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env`.

   ```env
   USE_MOCK_VISION=false
   VISION_MODEL=llama32
   HUGGINGFACE_TOKEN=<token if required by selected model>
   ROCM_VISIBLE_DEVICES=0
   ```

3. Install ROCm PyTorch in the backend environment.

   ```bash
   pip install torch --index-url https://download.pytorch.org/whl/rocm6.0
   ```

4. Confirm the GPU is visible.

   ```bash
   rocminfo
   python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
   ```

5. Start the app and verify `/gpu-info`.

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   curl http://localhost:8000/gpu-info
   ```

6. Run benchmark outputs for slides.

   ```bash
   cd backend
   python benchmark.py --mode mock
   python benchmark.py --mode real
   python benchmark.py --mode both
   python benchmark.py --mode classifier
   ```

   Results are saved to `tasks/benchmark_results.json`. Real hardware notes and
   command output should be recorded in `tasks/AMD_SETUP_VERIFIED.md`.

Expected real-mode signal:

```json
{
  "backend": "ROCm",
  "gpu": "...",
  "memory_gb": 192,
  "utilization_pct": 0,
  "inference_count": 1,
  "avg_inference_ms": 340.0,
  "model_loaded": true,
  "rocm_version": "..."
}
```

## API Demo

Health check:

```bash
curl http://localhost:8000/health
```

Market arbitrage:

```bash
curl -X POST http://localhost:8000/arbitrage \
  -H "Content-Type: application/json" \
  -d "{\"crop\":\"Maize\",\"volume_kg\":500,\"origin_city\":\"Nakuru\"}"
```

Inventory:

```bash
curl http://localhost:8000/inventory
```

Full pipeline:

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\":\"<base64-leaf-image>\",\"crop\":\"Maize\",\"volume_kg\":500,\"origin_city\":\"Nakuru\",\"farmer_name\":\"Wanjiku\"}"
```

## Judge Demo Steps

1. Open the mobile UI.

   Show that this is built for a farmer or field officer in the field, not a back-office dashboard.

2. Upload a crop leaf image.

   The app returns disease name, confidence, severity, symptoms, Swahili summary, and treatment recommendations.

3. Point out the AMD panel.

   In real mode, show ROCm/MI300X backend, GPU memory, utilization, and inference latency from `/gpu-info`.

4. Enter market details.

   Example: `Maize`, `500 kg`, origin `Nakuru`.

5. Show ranked markets.

   Explain that AgriSync ranks markets by net profit after transport, not just top-line price.

6. Generate the report.

   Show English advisory, Swahili advisory, and SMS preview.

7. Explain the agent workflow.

   Agronomist agent handles treatment, market agent handles arbitrage, orchestrator agent turns both into farmer-ready advice.

8. Close with business value.

   AgriSync compresses expert diagnosis, agro-vet guidance, and market decision support into one low-friction workflow.

## Hackathon Judging Fit

### Application of Technology

AgriSync combines multimodal crop diagnosis, agentic workflows, GPU-aware deployment, market optimization, and bilingual generation. The AMD path is designed around ROCm and MI300X acceleration.

### Presentation

The demo is simple: image in, diagnosis out; harvest details in, best market out; final report generated in English, Swahili, and SMS form.

### Business Value

The product targets crop loss, poor treatment access, and market inefficiency for smallholder farmers. It can extend toward agro-vet partnerships, farmer cooperatives, county agriculture offices, and market information services.

### Originality

AgriSync does not stop at image classification. It connects plant health, inventory, price arbitrage, language localization, and SMS delivery into one advisory workflow.

## Current Limitations

- Market prices, inventory, diseases, and treatments are demo seed data, not a live production feed.
- Treatment guidance should be validated by local agronomists before real-world use.
- The SMS integration is optional and falls back to mock logging when Africa's Talking credentials are absent.
- Real Llama 3.2 Vision use may require Hugging Face access approval and a token.
- AMD GPU execution must be verified on the target AMD Developer Cloud environment before judging.
- Docker GPU passthrough may need environment-specific ROCm device settings on the final cloud node.
- The current prototype supports a small set of crops, diseases, and Kenyan markets.

## Roadmap

- Replace demo price data with a live market data source.
- Add agronomist-reviewed treatment safety constraints.
- Expand crop and disease coverage using East African datasets.
- Persist farmer reports and diagnostic history.
- Add cooperative/admin dashboards.
- Add offline-first SMS and WhatsApp delivery paths.
- Benchmark MI300X inference latency and throughput against CPU/mock mode.

## Links

- AMD Developer Hackathon page: https://lablab.ai/ai-hackathons/amd-developer
- AMD hackathon article: https://www.amd.com/en/developer/resources/technical-articles/2026/build-across-the-ai-stack--join-the-amd-x-lablab-ai-hackathon-.html
