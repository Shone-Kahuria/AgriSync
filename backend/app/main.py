import asyncio
import logging
import logging.config
from contextlib import asynccontextmanager

logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)r}',
            "datefmt": "%Y-%m-%dT%H:%M:%SZ",
        }
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"level": "INFO", "handlers": ["console"]},
    "loggers": {
        "agrisync": {"level": "INFO", "propagate": True},
        "uvicorn.access": {"level": "INFO", "propagate": True},
    },
})

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.auth import require_api_key
from app.limiter import limiter
from app.db.database import engine
from app.db.models import Base
from app.routers import diagnose, arbitrage, inventory, report, pipeline, farmers, sms, catalog, feedback
from app.schemas.models import GpuInfoResponse

logger = logging.getLogger("agrisync")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Production safety: mock vision must be disabled in production
    if settings.environment == "production" and settings.use_mock_vision:
        logger.error(
            "CRITICAL: USE_MOCK_VISION=true in production environment. "
            "All diagnoses would be fake. Set USE_MOCK_VISION=false before deploying."
        )
        raise RuntimeError("Mock vision is enabled in production — refusing to start.")
    if settings.environment == "production" and not settings.api_key:
        logger.warning("WARNING: API_KEY is empty in production — all endpoints are unauthenticated.")
    if not settings.use_mock_vision:
        from app.vision.inference import warmup

        await warmup()
    yield


app = FastAPI(
    title="AgriSync API",
    description="Agricultural intelligence platform — AMD MI300X × CrewAI × LLaVA-v1.5-7B",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — restrict to configured origin(s) in production
_origins = [o.strip() for o in settings.frontend_url.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_auth = [Depends(require_api_key)]
app.include_router(diagnose.router,   dependencies=_auth)
app.include_router(arbitrage.router,  dependencies=_auth)
app.include_router(inventory.router,  dependencies=_auth)
app.include_router(report.router,     dependencies=_auth)
app.include_router(pipeline.router,   dependencies=_auth)
app.include_router(farmers.router,    dependencies=_auth)
app.include_router(catalog.router,    dependencies=_auth)
app.include_router(feedback.router,   dependencies=_auth)
app.include_router(sms.router)  # public — AT webhook has no API key


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AgriSync API", "version": "1.0.0"}


@app.get("/gpu-info", response_model=GpuInfoResponse)
@limiter.limit("60/minute")
async def gpu_info(request: Request):
    from app.vision.inference import (
        avg_inference_ms,
        inference_count,
        last_inference_ms,
        model_loaded,
    )
    info = {
        "gpu": "none",
        "memory_gb": 0,
        "backend": "cpu (mock mode active)",
        "last_inference_ms": round(last_inference_ms(), 1),
        "utilization_pct": 0,
        "inference_count": inference_count(),
        "avg_inference_ms": round(avg_inference_ms(), 1),
        "model_loaded": model_loaded(),
        "rocm_version": await asyncio.to_thread(_rocm_version),
    }
    try:
        import torch
        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            util = await asyncio.to_thread(_rocm_util)
            info.update({
                "gpu": torch.cuda.get_device_name(0),
                "memory_gb": props.total_memory // (1024 ** 3),
                "backend": "ROCm",
                "utilization_pct": util,
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


def _rocm_version() -> str | None:
    """Return ROCm version if available, otherwise None."""
    import os

    version = os.getenv("ROCM_VERSION")
    if version:
        return version

    try:
        import subprocess

        out = subprocess.check_output(
            ["rocm-smi", "--showdriverversion", "--csv"],
            timeout=2,
            text=True,
        )
        for line in out.splitlines():
            if "Driver version" in line:
                parts = [part.strip() for part in line.split(",") if part.strip()]
                if parts:
                    return parts[-1]
    except Exception:
        pass

    try:
        import subprocess

        out = subprocess.check_output(["rocminfo"], timeout=2, text=True)
        for line in out.splitlines():
            if "ROCm Version" in line:
                return line.split(":", 1)[-1].strip() or None
    except Exception:
        pass

    return None
