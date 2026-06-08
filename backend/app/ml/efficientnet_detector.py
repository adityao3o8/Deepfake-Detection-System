from __future__ import annotations

import logging
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models

from app.ml.gradcam import compute_gradcam, gradcam_to_base64
from app.ml.inference_scores import InferenceScores
from app.ml.preprocess import preprocess_image

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WEIGHTS_PATH = BACKEND_ROOT / "deepfake_efficientnet.pth"


def _resolve_device(device: str | None) -> torch.device:
    if device:
        return torch.device(device)
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def build_efficientnet_b0() -> nn.Module:
    model = models.efficientnet_b0(weights=None)
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(1280, 1),
    )
    return model


class EfficientNetDeepfakeDetector:
    """EfficientNet-B0 binary classifier for real vs deepfake face images."""

    def __init__(
        self,
        *,
        weights_path: str | Path | None = None,
        device: str | None = None,
    ) -> None:
        self._weights_path = (
            Path(weights_path) if weights_path else DEFAULT_WEIGHTS_PATH
        )
        self._device = _resolve_device(device)
        self._model = build_efficientnet_b0()
        self._load_weights()
        self._model.to(self._device)
        self._model.eval()
        logger.info(
            "EfficientNet-B0 deepfake detector loaded from %s on %s",
            self._weights_path,
            self._device,
        )

    def _load_weights(self) -> None:
        if not self._weights_path.is_file():
            raise FileNotFoundError(
                f"Model weights not found: {self._weights_path}"
            )
        try:
            state_dict = torch.load(
                self._weights_path, map_location="cpu", weights_only=True
            )
        except TypeError:
            state_dict = torch.load(self._weights_path, map_location="cpu")
        self._model.load_state_dict(state_dict)

    def _scores_from_logits(self, logits: torch.Tensor) -> InferenceScores:
        # Training labels: 1=real, 0=fake — sigmoid output is P(real).
        real_confidence = float(torch.sigmoid(logits[0, 0]).item())
        return InferenceScores(
            real_confidence=real_confidence,
            fake_confidence=1.0 - real_confidence,
        )

    def predict(self, image_bytes: bytes) -> InferenceScores:
        scores, _ = self.predict_with_gradcam(image_bytes, include_gradcam=False)
        return scores

    def predict_with_gradcam(
        self,
        image_bytes: bytes,
        *,
        include_gradcam: bool = True,
    ) -> tuple[InferenceScores, str | None]:
        tensor = preprocess_image(image_bytes).to(self._device)

        if not include_gradcam:
            with torch.no_grad():
                logits = self._model(tensor)
            return self._scores_from_logits(logits), None

        tensor.requires_grad_(True)
        target_layer = self._model.features[-1]
        activations: torch.Tensor | None = None
        gradients: torch.Tensor | None = None

        def forward_hook(
            _module: nn.Module,
            _inputs: tuple[torch.Tensor, ...],
            output: torch.Tensor,
        ) -> None:
            nonlocal activations
            activations = output

        def backward_hook(
            _module: nn.Module,
            _grad_input: tuple[torch.Tensor | None, ...],
            grad_output: tuple[torch.Tensor, ...],
        ) -> None:
            nonlocal gradients
            gradients = grad_output[0]

        forward_handle = target_layer.register_forward_hook(forward_hook)
        backward_handle = target_layer.register_full_backward_hook(backward_hook)

        try:
            self._model.zero_grad(set_to_none=True)
            logits = self._model(tensor)
            logits[0, 0].backward()

            if activations is None or gradients is None:
                raise RuntimeError("Grad-CAM hooks did not capture tensors.")

            cam = compute_gradcam(activations, gradients)
            heatmap = gradcam_to_base64(image_bytes, cam)
            return self._scores_from_logits(logits), heatmap
        finally:
            forward_handle.remove()
            backward_handle.remove()
