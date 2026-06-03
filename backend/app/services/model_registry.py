from __future__ import annotations

from app.config import settings
from app.ml.efficientnet_detector import EfficientNetDeepfakeDetector

_detector: EfficientNetDeepfakeDetector | None = None


def get_detector() -> EfficientNetDeepfakeDetector:
    if _detector is None:
        raise RuntimeError("Detection model is not loaded. Server may still be starting.")
    return _detector


def load_detector() -> EfficientNetDeepfakeDetector:
    global _detector
    _detector = EfficientNetDeepfakeDetector(
        weights_path=settings.model_weights_path,
        weights_url=settings.model_weights_url,
        device=settings.model_device,
        use_imagenet_normalize=settings.use_imagenet_normalize,
    )
    return _detector


def unload_detector() -> None:
    global _detector
    _detector = None
