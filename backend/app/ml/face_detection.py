from __future__ import annotations

import logging
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.ml.preprocess import load_image_from_bytes

logger = logging.getLogger(__name__)

NO_FACE_WARNING = (
    "No face detected - deepfake analysis requires a face to be present"
)

YUNET_MODEL_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)
DEFAULT_MODEL_CACHE = Path.home() / ".cache" / "deepfake" / "face_detection_yunet_2023mar.onnx"


@dataclass(frozen=True)
class FaceBox:
    x_min: int
    y_min: int
    x_max: int
    y_max: int

    @property
    def area(self) -> int:
        return max(0, self.x_max - self.x_min) * max(0, self.y_max - self.y_min)


class FaceDetector:
    """OpenCV YuNet face detection with cropping for downstream inference."""

    def __init__(
        self,
        *,
        model_path: str | None = None,
        score_threshold: float = 0.6,
        padding_ratio: float = 0.2,
    ) -> None:
        self._padding_ratio = padding_ratio
        self._score_threshold = score_threshold
        resolved_path = self._resolve_model_path(model_path)
        self._detector = cv2.FaceDetectorYN.create(
            str(resolved_path),
            "",
            (320, 320),
            score_threshold,
            0.3,
            5000,
        )
        logger.info("OpenCV YuNet face detector loaded from %s", resolved_path)

    @staticmethod
    def _resolve_model_path(model_path: str | None) -> Path:
        path = Path(model_path) if model_path else DEFAULT_MODEL_CACHE
        if path.is_file():
            return path

        path.parent.mkdir(parents=True, exist_ok=True)
        import urllib.request

        logger.info("Downloading YuNet face model to %s", path)
        urllib.request.urlretrieve(YUNET_MODEL_URL, path)
        return path

    def close(self) -> None:
        """No persistent resources to release for OpenCV YuNet."""

    def detect_largest_face(self, image: Image.Image) -> FaceBox | None:
        rgb = np.asarray(image.convert("RGB"))
        height, width = rgb.shape[:2]
        self._detector.setInputSize((width, height))

        _, faces = self._detector.detect(rgb)
        if faces is None or len(faces) == 0:
            return None

        best = max(faces, key=lambda face: float(face[2]) * float(face[3]))
        x, y, w, h = best[:4]
        return FaceBox(
            x_min=int(x),
            y_min=int(y),
            x_max=int(x + w),
            y_max=int(y + h),
        )

    def crop_face(
        self,
        image: Image.Image,
        face: FaceBox,
        *,
        padding_ratio: float | None = None,
    ) -> Image.Image:
        padding = (
            self._padding_ratio if padding_ratio is None else padding_ratio
        )
        width, height = image.size
        box_w = face.x_max - face.x_min
        box_h = face.y_max - face.y_min
        pad_w = int(box_w * padding)
        pad_h = int(box_h * padding)

        x_min = max(0, face.x_min - pad_w)
        y_min = max(0, face.y_min - pad_h)
        x_max = min(width, face.x_max + pad_w)
        y_max = min(height, face.y_max + pad_h)

        if x_max <= x_min or y_max <= y_min:
            return image

        return image.crop((x_min, y_min, x_max, y_max))

    def crop_face_to_jpeg(self, image_bytes: bytes) -> bytes | None:
        """Return JPEG bytes of the largest detected face crop, or None."""
        image = load_image_from_bytes(image_bytes)
        face = self.detect_largest_face(image)
        if face is None:
            return None

        cropped = self.crop_face(image, face)
        buffer = BytesIO()
        cropped.save(buffer, format="JPEG", quality=90)
        return buffer.getvalue()

    def has_face(self, image_bytes: bytes) -> bool:
        image = load_image_from_bytes(image_bytes)
        return self.detect_largest_face(image) is not None
