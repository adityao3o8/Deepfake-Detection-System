from io import BytesIO

import torch
from PIL import Image
from torchvision import transforms

# ImageNet stats used with EfficientNet-B0 (ImageNet-pretrained backbone).
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

INPUT_SIZE = 224


def build_preprocess_transform(use_imagenet_normalize: bool = True) -> transforms.Compose:
    steps: list[transforms.Transform] = [
        transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
        transforms.ToTensor(),
    ]
    if use_imagenet_normalize:
        steps.append(transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD))
    return transforms.Compose(steps)


def load_image_from_bytes(data: bytes) -> Image.Image:
    image = Image.open(BytesIO(data))
    return image.convert("RGB")


def preprocess_image(
    data: bytes,
    *,
    use_imagenet_normalize: bool = True,
) -> torch.Tensor:
    """Return a single batched float tensor shaped (1, 3, 224, 224)."""
    image = load_image_from_bytes(data)
    transform = build_preprocess_transform(use_imagenet_normalize)
    tensor = transform(image)
    return tensor.unsqueeze(0)
