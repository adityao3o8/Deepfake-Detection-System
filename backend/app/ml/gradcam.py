from __future__ import annotations

import base64
from io import BytesIO

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

from app.ml.preprocess import INPUT_SIZE, load_image_from_bytes


def _apply_jet_colormap(grayscale: np.ndarray) -> np.ndarray:
    """Map normalized CAM values in [0, 1] to an RGB uint8 heatmap."""
    grayscale = np.clip(grayscale, 0.0, 1.0)
    r = np.clip(1.5 - np.abs(4.0 * grayscale - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * grayscale - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * grayscale - 1.0), 0.0, 1.0)
    return (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)


def _overlay_heatmap(
    original: Image.Image,
    cam: np.ndarray,
    *,
    alpha: float = 0.45,
) -> Image.Image:
    original = original.resize((INPUT_SIZE, INPUT_SIZE), Image.Resampling.BILINEAR)
    orig_rgb = np.asarray(original.convert("RGB"), dtype=np.float32)

    cam_resized = np.asarray(
        Image.fromarray((cam * 255).astype(np.uint8)).resize(
            (INPUT_SIZE, INPUT_SIZE), Image.Resampling.BILINEAR
        ),
        dtype=np.float32,
    ) / 255.0

    heatmap_rgb = _apply_jet_colormap(cam_resized).astype(np.float32)
    blended = (alpha * heatmap_rgb + (1.0 - alpha) * orig_rgb).astype(np.uint8)
    return Image.fromarray(blended)


def compute_gradcam(
    activations: torch.Tensor,
    gradients: torch.Tensor,
) -> np.ndarray:
    """Build a normalized Grad-CAM map (H, W) from hooked feature maps."""
    grads = gradients[0]
    acts = activations[0]
    weights = grads.mean(dim=(1, 2))
    cam = (weights[:, None, None] * acts).sum(dim=0)
    cam = F.relu(cam)
    cam = cam.detach().cpu().numpy()
    return (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)


def gradcam_to_base64(image_bytes: bytes, cam: np.ndarray) -> str:
    """Encode a Grad-CAM overlay PNG as a base64 data URL."""
    original = load_image_from_bytes(image_bytes)
    overlay = _overlay_heatmap(original, cam)
    buffer = BytesIO()
    overlay.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"
