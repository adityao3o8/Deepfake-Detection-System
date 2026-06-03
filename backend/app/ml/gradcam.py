from __future__ import annotations

import base64
import math
from io import BytesIO

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from app.ml.preprocess import INPUT_SIZE, load_image_from_bytes


def _apply_jet_colormap(grayscale: np.ndarray) -> np.ndarray:
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

    cam_uint8 = (np.clip(cam, 0.0, 1.0) * 255).astype(np.uint8)
    cam_resized = np.asarray(
        Image.fromarray(cam_uint8).resize(
            (INPUT_SIZE, INPUT_SIZE), Image.Resampling.BILINEAR
        ),
        dtype=np.float32,
    ) / 255.0

    heatmap_rgb = _apply_jet_colormap(cam_resized).astype(np.float32)
    blended = (alpha * heatmap_rgb + (1.0 - alpha) * orig_rgb).astype(np.uint8)
    return Image.fromarray(blended)


def _normalize_cam(cam: np.ndarray) -> np.ndarray:
    cam = np.maximum(cam, 0.0)
    return (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)


def compute_gradcam(
    activations: torch.Tensor,
    gradients: torch.Tensor,
) -> np.ndarray:
    """Grad-CAM for CNN feature maps shaped (B, C, H, W)."""
    grads = gradients[0]
    acts = activations[0]
    weights = grads.mean(dim=(1, 2))
    cam = (weights[:, None, None] * acts).sum(dim=0)
    cam = F.relu(cam)
    return _normalize_cam(cam.detach().cpu().numpy())


def compute_vit_gradcam(
    activations: torch.Tensor,
    gradients: torch.Tensor,
) -> np.ndarray:
    """Grad-CAM for ViT hidden states shaped (B, seq_len, hidden_dim)."""
    acts = activations[0, 1:, :]
    grads = gradients[0, 1:, :]
    weights = grads.mean(dim=0)
    cam = (acts * weights).sum(dim=-1)
    cam = F.relu(cam)

    num_patches = cam.shape[0]
    grid = int(math.sqrt(num_patches))
    if grid * grid != num_patches:
        raise ValueError(f"Unexpected ViT patch count: {num_patches}")

    cam = cam.reshape(grid, grid).detach().cpu().numpy()
    return _normalize_cam(cam)


def gradcam_to_base64(image_bytes: bytes, cam: np.ndarray) -> str:
    original = load_image_from_bytes(image_bytes)
    overlay = _overlay_heatmap(original, cam)
    buffer = BytesIO()
    overlay.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"
