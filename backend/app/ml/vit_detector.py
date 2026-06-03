from __future__ import annotations

import logging

import torch
import torch.nn as nn
from transformers import AutoImageProcessor, AutoModelForImageClassification

from app.ml.gradcam import compute_vit_gradcam, gradcam_to_base64
from app.ml.inference_scores import CLASS_FAKE, CLASS_REAL, InferenceScores
from app.ml.preprocess import load_image_from_bytes

logger = logging.getLogger(__name__)

DEFAULT_HF_MODEL_ID = "dima806/deepfake_vs_real_image_detection"


class ViTDeepfakeDetector:
    """ViT classifier (Hugging Face) for real vs deepfake face images."""

    def __init__(
        self,
        *,
        model_id: str = DEFAULT_HF_MODEL_ID,
        device: str | None = None,
    ) -> None:
        self._model_id = model_id
        self._device = torch.device(
            device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self._processor = AutoImageProcessor.from_pretrained(model_id)
        self._model = AutoModelForImageClassification.from_pretrained(model_id)
        self._model.to(self._device)
        self._model.eval()

        self._id2label = {
            int(k): v.lower() for k, v in self._model.config.id2label.items()
        }
        logger.info(
            "ViT deepfake detector loaded (%s) on %s",
            model_id,
            self._device,
        )

    def _preprocess(self, image_bytes: bytes) -> torch.Tensor:
        image = load_image_from_bytes(image_bytes)
        inputs = self._processor(images=image, return_tensors="pt")
        return inputs["pixel_values"].to(self._device)

    def _scores_from_logits(self, logits: torch.Tensor) -> InferenceScores:
        probabilities = torch.softmax(logits, dim=-1)[0]
        label_to_index = {
            self._id2label[i]: i for i in range(len(self._id2label))
        }
        real_idx = label_to_index.get("real", CLASS_REAL)
        fake_idx = label_to_index.get("fake", CLASS_FAKE)
        return InferenceScores(
            real_confidence=float(probabilities[real_idx].item()),
            fake_confidence=float(probabilities[fake_idx].item()),
        )

    def _gradcam_target_layer(self) -> nn.Module:
        return self._model.vit.layernorm

    def predict(self, image_bytes: bytes) -> InferenceScores:
        scores, _ = self.predict_with_gradcam(image_bytes, include_gradcam=False)
        return scores

    def predict_with_gradcam(
        self,
        image_bytes: bytes,
        *,
        include_gradcam: bool = True,
    ) -> tuple[InferenceScores, str | None]:
        pixel_values = self._preprocess(image_bytes)

        if not include_gradcam:
            with torch.no_grad():
                outputs = self._model(pixel_values=pixel_values)
            return self._scores_from_logits(outputs.logits), None

        pixel_values = pixel_values.requires_grad_(True)
        target_layer = self._gradcam_target_layer()
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
            outputs = self._model(pixel_values=pixel_values)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=-1)[0]
            target_class = int(torch.argmax(probabilities).item())
            logits[0, target_class].backward()

            if activations is None or gradients is None:
                raise RuntimeError("Grad-CAM hooks did not capture ViT tensors.")

            cam = compute_vit_gradcam(activations, gradients)
            heatmap = gradcam_to_base64(image_bytes, cam)
            return self._scores_from_logits(logits), heatmap
        finally:
            forward_handle.remove()
            backward_handle.remove()
