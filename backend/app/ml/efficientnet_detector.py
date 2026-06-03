from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models

from app.ml.gradcam import compute_gradcam, gradcam_to_base64
from app.ml.preprocess import preprocess_image

logger = logging.getLogger(__name__)

# FaceForensics++ C23 EfficientNet-B0 (Xicor9 / University of Strathclyde).
DEFAULT_WEIGHTS_URL = (
    "https://huggingface.co/Xicor9/efficientnet-b0-ffpp-c23/"
    "resolve/main/efficientnet_b0_ffpp_c23.pth"
)

CLASS_REAL = 0
CLASS_FAKE = 1


@dataclass(frozen=True)
class InferenceScores:
    real_confidence: float
    fake_confidence: float

    @property
    def is_deepfake(self) -> bool:
        return self.fake_confidence >= self.real_confidence

    @property
    def confidence(self) -> float:
        return max(self.real_confidence, self.fake_confidence)

    @property
    def label(self) -> str:
        return "fake" if self.is_deepfake else "real"


class EfficientNetDeepfakeDetector:
    """EfficientNet-B0 binary classifier trained on FaceForensics++ (C23)."""

    def __init__(
        self,
        *,
        weights_path: str | None = None,
        weights_url: str = DEFAULT_WEIGHTS_URL,
        device: str | None = None,
        use_imagenet_normalize: bool = False,
    ) -> None:
        self._weights_path = Path(weights_path) if weights_path else None
        self._weights_url = weights_url
        self._use_imagenet_normalize = use_imagenet_normalize
        self._device = torch.device(
            device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self._model = self._build_model()
        self._load_weights()
        self._model.to(self._device)
        self._model.eval()
        logger.info("EfficientNet-B0 FF++ detector loaded on %s", self._device)

    def _build_model(self) -> nn.Module:
        model = models.efficientnet_b0(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, 2)
        return model

    def _load_weights(self) -> None:
        if self._weights_path and self._weights_path.is_file():
            try:
                state_dict = torch.load(
                    self._weights_path, map_location="cpu", weights_only=True
                )
            except TypeError:
                state_dict = torch.load(self._weights_path, map_location="cpu")
        else:
            state_dict = torch.hub.load_state_dict_from_url(
                self._weights_url,
                map_location="cpu",
                progress=True,
            )

        self._model.load_state_dict(state_dict)

    def predict(self, image_bytes: bytes) -> InferenceScores:
        scores, _ = self.predict_with_gradcam(
            image_bytes, include_gradcam=False
        )
        return scores

    def predict_with_gradcam(
        self,
        image_bytes: bytes,
        *,
        include_gradcam: bool = True,
    ) -> tuple[InferenceScores, str | None]:
        tensor = preprocess_image(
            image_bytes,
            use_imagenet_normalize=self._use_imagenet_normalize,
        ).to(self._device)

        if not include_gradcam:
            with torch.no_grad():
                logits = self._model(tensor)
                probabilities = torch.softmax(logits, dim=1)[0]
            return self._scores_from_probabilities(probabilities), None

        tensor.requires_grad_(True)
        target_layer = self._model.features[-1]
        activations: torch.Tensor | None = None
        gradients: torch.Tensor | None = None

        def forward_hook(
            _module: torch.nn.Module,
            _inputs: tuple[torch.Tensor, ...],
            output: torch.Tensor,
        ) -> None:
            nonlocal activations
            activations = output

        def backward_hook(
            _module: torch.nn.Module,
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
            probabilities = torch.softmax(logits, dim=1)[0]
            target_class = int(torch.argmax(logits, dim=1).item())
            logits[0, target_class].backward()

            if activations is None or gradients is None:
                raise RuntimeError("Grad-CAM hooks did not capture tensors.")

            cam = compute_gradcam(activations, gradients)
            heatmap = gradcam_to_base64(image_bytes, cam)
            return self._scores_from_probabilities(probabilities), heatmap
        finally:
            forward_handle.remove()
            backward_handle.remove()

    @staticmethod
    def _scores_from_probabilities(
        probabilities: torch.Tensor,
    ) -> InferenceScores:
        return InferenceScores(
            real_confidence=float(probabilities[CLASS_REAL].item()),
            fake_confidence=float(probabilities[CLASS_FAKE].item()),
        )
