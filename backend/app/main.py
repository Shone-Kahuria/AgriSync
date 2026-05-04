from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine
from app.db.models import Base
from app.routers import diagnose, arbitrage, inventory, report, pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="AgriSync API",
    description="Agricultural intelligence platform — AMD MI300X × CrewAI × LLaVA-v1.5-7B",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diagnose.router)
app.include_router(arbitrage.router)
app.include_router(inventory.router)
app.include_router(report.router)
app.include_router(pipeline.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AgriSync API", "version": "1.0.0"}


@app.get("/gpu-info")
async def gpu_info():
    from app.vision.inference import last_inference_ms
    info = {
        "gpu": "none",
        "memory_gb": 0,
        "backend": "cpu (mock mode active)",
        "last_inference_ms": round(last_inference_ms(), 1),
    }
    try:
        import torch
        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            info.update({
                "gpu": torch.cuda.get_device_name(0),
                "memory_gb": props.total_memory // (1024 ** 3),
                "backend": "ROCm",
                "utilization_pct": _rocm_util(),
            })
    except Exception:
        pass
    return info


def _rocm_util() -> int:
    """Read GPU utilization via rocm-smi if available."""
    try:
        import subprocess
        out = subprocess.check_output(
            ["rocm-smi", "--showuse", "--csv"], timeout=2, text=True
        )
        for line in out.splitlines():
            parts = line.split(",")
            if len(parts) >= 2:
                return int(float(parts[1].strip().rstrip("%")))
    except Exception:
        pass
    return 0
