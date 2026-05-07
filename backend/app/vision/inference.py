"""
Vision inference — supports two real-model paths:
  • llama32 : meta-llama/Llama-3.2-11B-Vision-Instruct  (Track 3 primary, ROCm-optimised)
  • llava   : YuchengShi/LLaVA-v1.5-7B (fallback / domain-finetuned)

Set USE_MOCK_VISION=false and VISION_MODEL=llama32|llava on the AMD MI300X node.
In mock mode: deterministic response from image hash, no GPU needed.
"""
import base64
import hashlib
import io
import logging
import time
import asyncio
from collections import deque
from typing import Optional

from app.config import settings

logger = logging.getLogger("agrisync.vision")

# ---- shared state ----
_last_inference_ms: float = 0.0
_inference_count: int = 0
_recent_inference_ms = deque(maxlen=50)
_gpu_label: str = "mock"

# ---- LLaVA-v1.5 state ----
_llava_model = None
_llava_processor = None

# ---- Llama 3.2 Vision state ----
_llama_model = None
_llama_processor = None


def last_inference_ms() -> float:
    return _last_inference_ms


def record_inference(elapsed_ms: float) -> None:
    global _last_inference_ms, _inference_count
    _last_inference_ms = elapsed_ms
    _inference_count += 1
    _recent_inference_ms.append(elapsed_ms)


def inference_count() -> int:
    return _inference_count


def avg_inference_ms() -> float:
    if not _recent_inference_ms:
        return 0.0
    return sum(_recent_inference_ms) / len(_recent_inference_ms)


def model_loaded() -> bool:
    return _llava_model is not None or _llama_model is not None


# ---------------------------------------------------------------------------
# Model loaders
# ---------------------------------------------------------------------------

def _load_llava():
    global _llava_model, _llava_processor, _gpu_label
    if _llava_model is not None:
        return
    import torch
    from transformers import LlavaProcessor, LlavaForConditionalGeneration

    device = "cuda" if torch.cuda.is_available() else "cpu"
    _gpu_label = "AMD MI300X (ROCm)" if torch.cuda.is_available() else "CPU"
    logger.info("Loading LLaVA-v1.5 on %s", _gpu_label)
    _llava_processor = LlavaProcessor.from_pretrained(settings.llava_model_id)
    _llava_model = LlavaForConditionalGeneration.from_pretrained(
        settings.llava_model_id,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        device_map=device,
    )
    logger.info("LLaVA-v1.5 loaded on %s", _gpu_label)


def _load_llama32():
    global _llama_model, _llama_processor, _gpu_label
    if _llama_model is not None:
        return
    import torch
    from transformers import MllamaForConditionalGeneration, AutoProcessor

    device = "cuda" if torch.cuda.is_available() else "cpu"
    _gpu_label = "AMD MI300X (ROCm)" if torch.cuda.is_available() else "CPU"

    kwargs = {"token": settings.huggingface_token} if settings.huggingface_token else {}
    logger.info("Loading Llama-3.2-11B-Vision-Instruct on %s", _gpu_label)
    _llama_processor = AutoProcessor.from_pretrained(settings.llama32_model_id, **kwargs)
    _llama_model = MllamaForConditionalGeneration.from_pretrained(
        settings.llama32_model_id,
        torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
        device_map=device,
        **kwargs,
    )
    logger.info("Llama-3.2-11B-Vision loaded on %s", _gpu_label)


# ---------------------------------------------------------------------------
# Mock diseases — deterministic by image hash
# ---------------------------------------------------------------------------

_MOCK_DISEASES = [
    {
        "disease_name": "Tomato Late Blight",
        "confidence": 0.91,
        "symptoms": "Dark brown lesions on leaves, white mold on underside, rapid defoliation, fruit rot.",
        "severity": "high",
    },
    {
        "disease_name": "Maize Gray Leaf Spot",
        "confidence": 0.84,
        "symptoms": "Rectangular tan-to-gray lesions running parallel to leaf veins, premature death of lower leaves.",
        "severity": "medium",
    },
    {
        "disease_name": "Bean Angular Leaf Spot",
        "confidence": 0.78,
        "symptoms": "Angular water-soaked lesions bounded by leaf veins, turning brown with yellow halo.",
        "severity": "medium",
    },
    {
        "disease_name": "Potato Late Blight",
        "confidence": 0.88,
        "symptoms": "Water-soaked pale green to brown leaf spots, white mycelium on underside, tuber rot.",
        "severity": "high",
    },
]


def _mock_infer(image_b64: str) -> dict:
    try:
        image_bytes = base64.b64decode(image_b64 + "==")[:256]
    except Exception:
        image_bytes = image_b64[:256].encode()
    idx = int(hashlib.md5(image_bytes).hexdigest(), 16) % len(_MOCK_DISEASES)

    t0 = time.time()
    time.sleep(1.4)  # simulate MI300X inference latency
    record_inference((time.time() - t0) * 1000)

    model_label = (
        "Llama-3.2-11B-Vision-Instruct" if settings.vision_model == "llama32"
        else "LLaVA-v1.5-7B"
    )
    return _MOCK_DISEASES[idx] | {"gpu_used": f"mock ({model_label} — no AMD MI300X)"}


# ---------------------------------------------------------------------------
# Real inference — LLaVA-v1.5
# ---------------------------------------------------------------------------

def _real_infer_llava(image_b64: str) -> dict:
    import torch
    from PIL import Image

    _load_llava()

    image = Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("RGB")
    prompt = (
        "<image>\nYou are an expert plant pathologist. "
        "Identify the disease visible in this crop leaf image. "
        "Return: disease name, visible symptoms, and severity (low/medium/high)."
    )
    inputs = _llava_processor(prompt, image, return_tensors="pt").to(_llava_model.device)

    t0 = time.time()
    with torch.no_grad():
        output = _llava_model.generate(**inputs, max_new_tokens=256, temperature=0.1)
    elapsed_ms = (time.time() - t0) * 1000
    record_inference(elapsed_ms)

    raw = _llava_processor.decode(output[0], skip_special_tokens=True)
    logger.info("LLaVA inference done in %.2fs on %s", elapsed_ms / 1000, _gpu_label)
    return _build_result(raw, "LLaVA-v1.5-7B")


# ---------------------------------------------------------------------------
# Real inference — Llama 3.2 Vision (Track 3 primary)
# ---------------------------------------------------------------------------

def _real_infer_llama32(image_b64: str) -> dict:
    import torch
    from PIL import Image

    _load_llama32()

    image = Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("RGB")

    messages = [
        {"role": "user", "content": [
            {"type": "image"},
            {"type": "text", "text": (
                "You are an expert plant pathologist. Analyze this crop leaf image carefully. "
                "Identify: 1) Disease name, 2) Visible symptoms, 3) Severity (low/medium/high). "
                "Be specific and concise."
            )},
        ]}
    ]
    input_text = _llama_processor.apply_chat_template(messages, add_generation_prompt=True)
    inputs = _llama_processor(image, input_text, return_tensors="pt").to(_llama_model.device)

    t0 = time.time()
    with torch.no_grad():
        output = _llama_model.generate(**inputs, max_new_tokens=300, temperature=0.1)
    elapsed_ms = (time.time() - t0) * 1000
    record_inference(elapsed_ms)

    raw = _llama_processor.decode(output[0], skip_special_tokens=True)
    logger.info("Llama-3.2-Vision inference done in %.2fs on %s", elapsed_ms / 1000, _gpu_label)
    return _build_result(raw, "Llama-3.2-11B-Vision-Instruct")


# ---------------------------------------------------------------------------
# Shared output parser
# ---------------------------------------------------------------------------

def _build_result(raw: str, model_tag: str) -> dict:
    return {
        "disease_name": _extract_field(raw, "disease") or "Unknown Disease",
        "confidence": _estimate_confidence(raw),
        "symptoms": _extract_field(raw, "symptoms") or raw[:200],
        "severity": _extract_severity(raw),
        "gpu_used": f"{_gpu_label} ({model_tag})",
    }


def _extract_field(text: str, keyword: str) -> Optional[str]:
    lower = text.lower()
    idx = lower.find(keyword)
    if idx == -1:
        return None
    segment = text[idx:idx + 200]
    for sep in [":", "-", "is"]:
        if sep in segment:
            return segment.split(sep, 1)[1].strip().split("\n")[0]
    return None


def _extract_severity(text: str) -> str:
    lower = text.lower()
    if "high" in lower or "severe" in lower:
        return "high"
    if "low" in lower or "mild" in lower:
        return "low"
    return "medium"


def _estimate_confidence(text: str) -> float:
    for token in text.split():
        try:
            v = float(token.strip("%").strip())
            if 50 < v <= 100:
                return round(v / 100, 2)
        except ValueError:
            pass
    return 0.82


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_inference(image_b64: str) -> dict:
    if settings.use_mock_vision:
        return _mock_infer(image_b64)
    if settings.vision_model == "llama32":
        return _real_infer_llama32(image_b64)
    return _real_infer_llava(image_b64)


async def warmup() -> None:
    if settings.use_mock_vision:
        logger.info("Skipping vision model warmup in mock mode")
        return

    blank_png_b64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8"
        "/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
    )
    started = time.perf_counter()
    await asyncio.to_thread(run_inference, blank_png_b64)
    logger.info("Vision model warmed up in %.2fs", time.perf_counter() - started)
