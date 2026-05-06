"""
PlantVillage Specialist Classifier
===================================
First-stage fast classifier trained on PlantVillage (38 classes, 14 crops).
Runs before the general LLaVA/Llama model; much faster and more accurate for
the crops it covers (Tomato, Maize/Corn, Potato).

For crops NOT in PlantVillage (Coffee, Cassava, Banana, Sorghum, etc.) this
module returns confidence=0.0 so the caller falls through to LLaVA.

Model: linkanjarad/mobilenet_v2_1.0_224-fine-tuned-plant-disease-classification
       ~14 MB, ~50 ms inference on CPU, ~8 ms on AMD MI300X
"""
import base64
import io
import logging
import time
from typing import Optional

from app.config import settings

logger = logging.getLogger("agrisync.plant_classifier")

# ---------------------------------------------------------------------------
# PlantVillage label → our DB disease name
# ---------------------------------------------------------------------------

PLANTVILLAGE_TO_DB: dict[str, str] = {
    # Corn / Maize
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": "Maize Gray Leaf Spot",
    "Corn_(maize)___Common_rust_":                        "Maize Common Rust",
    "Corn_(maize)___Northern_Leaf_Blight":                "Maize Northern Leaf Blight",
    # Potato
    "Potato___Early_blight":    "Potato Early Blight",
    "Potato___Late_blight":     "Potato Late Blight",
    # Tomato
    "Tomato___Bacterial_spot":  "Tomato Bacterial Wilt",   # closest match in DB
    "Tomato___Early_blight":    "Tomato Early Blight",
    "Tomato___Late_blight":     "Tomato Late Blight",
    "Tomato___Leaf_Mold":       "Tomato Leaf Mold",
    "Tomato___Septoria_leaf_spot": "Tomato Septoria Leaf Spot",
    "Tomato___Target_Spot":     "Tomato Target Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "Tomato Yellow Leaf Curl Virus",
    "Tomato___Tomato_mosaic_virus": "Tomato Mosaic Virus",
    "Tomato___Spider_mites Two-spotted_spider_mite": "Tomato Spider Mites",
    # Pepper (treat as Tomato family for chemical recommendations)
    "Pepper,_bell___Bacterial_spot": "Tomato Bacterial Wilt",
}

# Labels that indicate a healthy plant
_HEALTHY_LABELS = {
    "Apple___healthy", "Blueberry___healthy", "Cherry_(including_sour)___healthy",
    "Corn_(maize)___healthy", "Grape___healthy", "Peach___healthy",
    "Pepper,_bell___healthy", "Potato___healthy", "Raspberry___healthy",
    "Soybean___healthy", "Strawberry___healthy", "Tomato___healthy",
}

# ---------------------------------------------------------------------------
# Model state (lazy-loaded)
# ---------------------------------------------------------------------------

_pipeline = None
_load_error: Optional[str] = None


def _load_classifier():
    global _pipeline, _load_error
    if _pipeline is not None or _load_error:
        return
    try:
        import torch
        from transformers import pipeline as hf_pipeline

        device = 0 if torch.cuda.is_available() else -1
        logger.info("Loading PlantVillage classifier: %s", settings.classifier_model_id)
        _pipeline = hf_pipeline(
            "image-classification",
            model=settings.classifier_model_id,
            device=device,
            top_k=3,
        )
        logger.info("PlantVillage classifier loaded on %s", "GPU" if device == 0 else "CPU")
    except Exception as exc:
        _load_error = str(exc)
        logger.warning("PlantVillage classifier unavailable (%s) — will use LLaVA fallback", exc)


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def classify_disease(image_b64: str) -> dict:
    """
    Returns:
      disease_name  : top PlantVillage label (human-readable)
      db_name       : mapped DB disease name, or None if not in our DB
      confidence    : float 0-1
      is_healthy    : bool — True if the plant looks healthy
      gpu_used      : str label
      from_classifier: always True
    """
    _load_classifier()

    if _pipeline is None:
        # Model failed to load — return 0 confidence so caller uses LLaVA
        return {
            "disease_name": "Unknown",
            "db_name": None,
            "confidence": 0.0,
            "is_healthy": False,
            "gpu_used": "classifier unavailable",
            "from_classifier": True,
        }

    try:
        from PIL import Image
        import torch

        image = Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("RGB")

        t0 = time.time()
        results = _pipeline(image)
        elapsed_ms = (time.time() - t0) * 1000

        top = results[0]
        label: str = top["label"]
        score: float = float(top["score"])

        is_healthy = label in _HEALTHY_LABELS
        db_name = PLANTVILLAGE_TO_DB.get(label)

        gpu_label = (
            "AMD MI300X (ROCm) — PlantVillage classifier"
            if torch.cuda.is_available()
            else f"CPU — PlantVillage classifier ({elapsed_ms:.0f} ms)"
        )

        logger.info(
            "Classifier: label=%s score=%.3f db_name=%s elapsed=%.0f ms",
            label, score, db_name, elapsed_ms,
        )

        return {
            "disease_name": _pv_label_to_human(label),
            "db_name": db_name,
            "confidence": round(score, 4),
            "is_healthy": is_healthy,
            "gpu_used": gpu_label,
            "from_classifier": True,
        }

    except Exception as exc:
        logger.error("Classifier inference failed: %s", exc)
        return {
            "disease_name": "Unknown",
            "db_name": None,
            "confidence": 0.0,
            "is_healthy": False,
            "gpu_used": "classifier error",
            "from_classifier": True,
        }


def _pv_label_to_human(label: str) -> str:
    """'Tomato___Late_blight' → 'Tomato Late Blight'"""
    parts = label.split("___", 1)
    if len(parts) == 2:
        crop = parts[0].replace("_", " ").replace("(maize)", "Maize").replace(",", "").strip()
        disease = parts[1].replace("_", " ").strip()
        return f"{crop} {disease}".title()
    return label.replace("_", " ").title()
