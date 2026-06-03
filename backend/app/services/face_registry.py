from __future__ import annotations

from app.config import settings
from app.ml.face_detection import FaceDetector

_detector: FaceDetector | None = None


def get_face_detector() -> FaceDetector:
    global _detector
    if _detector is None:
        _detector = FaceDetector(
            model_path=settings.face_model_path,
            score_threshold=settings.face_score_threshold,
            padding_ratio=settings.face_crop_padding_ratio,
        )
    return _detector


def load_face_detector() -> FaceDetector:
    return get_face_detector()


def unload_face_detector() -> None:
    global _detector
    if _detector is not None:
        _detector.close()
        _detector = None
