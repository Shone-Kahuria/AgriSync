"""
LLaVA-v1.5-7B plant disease inference.

On AMD MI300X: set USE_MOCK_VISION=false — model runs via ROCm.
On any other machine: mock mode returns a deterministic response based on
image content hash so the same photo always returns the same disease.
"""
import base64
import hashlib
import io
import time
from typing import Optional

from app.config import settings

_model = None
_processor = None
_gpu_label = "mock"
_last_inference_ms: float = 0.0


def last_inference_ms() -> float:
    return _last_inference_ms


def _load_model():
    global _model, _processor, _gpu_label
    if _model is not None:
        return

    import torch
    # LLaVA-v1.5 uses LlavaProcessor / LlavaForConditionalGeneration
    # (LlavaNext* classes are for v1.6 — wrong for this model)
    from transformers import LlavaProcessor, LlavaForConditionalGeneration

    device = "cuda" if torch.cuda.is_available() else "cpu"
    _gpu_label = "AMD MI300X (ROCm)" if torch.cuda.is_available() else "CPU"

    print(f"[AgriSync] Loading LLaVA on {_gpu_label}...")
    _processor = LlavaProcessor.from_pretrained(settings.llava_model_id)
    _model = LlavaForConditionalGeneration.from_pretrained(
        settings.llava_model_id,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        device_map=device,
    )
    print(f"[AgriSync] LLaVA loaded on {_gpu_label}.")


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
    global _last_inference_ms
    # Deterministic: same image always returns same disease
    # Use first 256 bytes of decoded image as hash seed
    try:
        image_bytes = base64.b64decode(image_b64 + "==")[:256]
    except Exception:
        image_bytes = image_b64[:256].encode()
    idx = int(hashlib.md5(image_bytes).hexdigest(), 16) % len(_MOCK_DISEASES)

    t0 = time.time()
    time.sleep(1.4)  # simulate MI300X inference latency
    _last_inference_ms = (time.time() - t0) * 1000

    return _MOCK_DISEASES[idx] | {"gpu_used": "mock (no AMD MI300X detected)"}


def _real_infer(image_b64: str) -> dict:
    import torch
    from PIL import Image

    _load_model()

    image_bytes = base64.b64decode(image_b64)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    prompt = (
        "<image>\nYou are an expert plant pathologist. "
        "Identify the disease visible in this crop leaf image. "
        "Return: disease name, visible symptoms, and severity (low/medium/high)."
    )

    inputs = _processor(prompt, image, return_tensors="pt").to(_model.device)

    t0 = time.time()
    with torch.no_grad():
        output = _model.generate(**inputs, max_new_tokens=256, temperature=0.1)
    global _last_inference_ms
    _last_inference_ms = (time.time() - t0) * 1000
    elapsed = _last_inference_ms / 1000

    raw = _processor.decode(output[0], skip_special_tokens=True)
    # Parse structured fields from model output
    disease_name = _extract_field(raw, "disease") or "Unknown Disease"
    symptoms = _extract_field(raw, "symptoms") or raw[:200]
    severity = _extract_severity(raw)
    confidence = _estimate_confidence(raw)

    print(f"[AgriSync] Inference done in {elapsed:.2f}s on {_gpu_label}")
    return {
        "disease_name": disease_name,
        "confidence": confidence,
        "symptoms": symptoms,
        "severity": severity,
        "gpu_used": _gpu_label,
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


def run_inference(image_b64: str) -> dict:
    if settings.use_mock_vision:
        return _mock_infer(image_b64)
    return _real_infer(image_b64)
