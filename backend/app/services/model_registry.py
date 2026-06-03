from __future__ import annotations

from app.config import settings
from app.ml.vit_detector import ViTDeepfakeDetector

_detector: ViTDeepfakeDetector | None = None


def get_detector() -> ViTDeepfakeDetector:
    if _detector is None:
        raise RuntimeError("Detection model is not loaded. Server may still be starting.")
    return _detector


def load_detector() -> ViTDeepfakeDetector:
    global _detector
    _detector = ViTDeepfakeDetector(
        model_id=settings.hf_model_id,
        device=settings.model_device,
    )
    return _detector


def unload_detector() -> None:
    global _detector
    _detector = None
