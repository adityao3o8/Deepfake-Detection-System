#!/usr/bin/env python3
"""Fine-tune EfficientNet-B0 on real vs fake faces from CSV splits."""

from __future__ import annotations

import csv
import time
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from torchvision.models import EfficientNet_B0_Weights

# --- Dataset paths ---
DATASET_ROOT = Path("/Users/adityasingh/Downloads/archive-2")
IMAGES_ROOT = DATASET_ROOT / "real_vs_fake"
TRAIN_CSV = DATASET_ROOT / "train.csv"
VALID_CSV = DATASET_ROOT / "valid.csv"
TEST_CSV = DATASET_ROOT / "test.csv"

# --- Training config ---
BATCH_SIZE = 32
EPOCHS = 15
NUM_WORKERS = 4
OUTPUT_PATH = Path("deepfake_efficientnet.pth")
IMAGE_SIZE = 224

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def get_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def resolve_image_path(images_root: Path, relative_path: str) -> Path:
    """Resolve CSV path relative to real_vs_fake (handles real-vs-fake/ subfolder)."""
    rel = Path(relative_path.strip())
    candidates = [
        images_root / rel,
        images_root / "real-vs-fake" / rel,
    ]
    for path in candidates:
        if path.is_file():
            return path
    return candidates[0]


class CsvImageDataset(Dataset):
    """PyTorch dataset that reads image paths and labels from a CSV file."""

    def __init__(
        self,
        csv_path: Path,
        images_root: Path,
        transform: transforms.Compose | None = None,
    ) -> None:
        self.images_root = images_root
        self.transform = transform
        self.samples: list[tuple[Path, int]] = []

        with csv_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames is None or "path" not in reader.fieldnames:
                raise ValueError(f"{csv_path} must contain a 'path' column.")
            if "label" not in reader.fieldnames:
                raise ValueError(f"{csv_path} must contain a 'label' column.")

            for row in reader:
                image_path = resolve_image_path(images_root, row["path"])
                label = int(row["label"])  # 1=real, 0=fake
                self.samples.append((image_path, label))

        if not self.samples:
            raise ValueError(f"No samples found in {csv_path}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        image_path, label = self.samples[index]
        image = Image.open(image_path).convert("RGB")
        if self.transform is not None:
            image = self.transform(image)
        return image, torch.tensor(label, dtype=torch.long)


def build_transforms(train: bool) -> transforms.Compose:
    if train:
        return transforms.Compose(
            [
                transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
                transforms.RandomHorizontalFlip(),
                transforms.ColorJitter(
                    brightness=0.1, contrast=0.1, saturation=0.1
                ),
                transforms.ToTensor(),
                transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
            ]
        )
    return transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def build_model(device: torch.device) -> nn.Module:
    weights = EfficientNet_B0_Weights.IMAGENET1K_V1
    model = models.efficientnet_b0(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, 2)
    return model.to(device)


def run_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
) -> tuple[float, float]:
    is_train = optimizer is not None
    model.train(is_train)

    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)

        if is_train:
            optimizer.zero_grad()

        logits = model(images)
        loss = criterion(logits, labels)

        if is_train:
            loss.backward()
            optimizer.step()

        total_loss += loss.item() * images.size(0)
        preds = logits.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += images.size(0)

    return total_loss / total, correct / total


def main() -> None:
    device = get_device()
    print(f"Device: {device}")
    print(f"Dataset root: {DATASET_ROOT}")
    print(f"Images root: {IMAGES_ROOT}")

    train_dataset = CsvImageDataset(
        TRAIN_CSV, IMAGES_ROOT, transform=build_transforms(train=True)
    )
    valid_dataset = CsvImageDataset(
        VALID_CSV, IMAGES_ROOT, transform=build_transforms(train=False)
    )
    test_dataset = CsvImageDataset(
        TEST_CSV, IMAGES_ROOT, transform=build_transforms(train=False)
    )

    print(f"Train samples: {len(train_dataset):,}")
    print(f"Valid samples: {len(valid_dataset):,}")
    print(f"Test samples:  {len(test_dataset):,}")

    # MPS on macOS is more stable with num_workers=0
    num_workers = 0 if device.type == "mps" else NUM_WORKERS
    pin_memory = device.type == "cuda"
    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=pin_memory,
    )
    valid_loader = DataLoader(
        valid_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
    )

    model = build_model(device)
    criterion = nn.CrossEntropyLoss()

    backbone_params = list(model.features.parameters())
    head_params = list(model.classifier.parameters())
    optimizer = torch.optim.Adam(
        [
            {"params": backbone_params, "lr": 1e-4},
            {"params": head_params, "lr": 1e-3},
        ]
    )
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)

    best_val_acc = 0.0
    start = time.time()

    for epoch in range(1, EPOCHS + 1):
        train_loss, train_acc = run_epoch(
            model, train_loader, criterion, optimizer, device
        )
        val_loss, val_acc = run_epoch(
            model, valid_loader, criterion, None, device
        )
        scheduler.step()

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), OUTPUT_PATH)
            print(f"  -> Saved best model to {OUTPUT_PATH.resolve()} (val_acc={val_acc:.4f})")

    model.load_state_dict(torch.load(OUTPUT_PATH, map_location=device, weights_only=True))
    test_loss, test_acc = run_epoch(model, test_loader, criterion, None, device)
    elapsed = time.time() - start

    print(
        f"\nDone in {elapsed / 60:.1f} min | "
        f"best_val_acc={best_val_acc:.4f} | "
        f"test_loss={test_loss:.4f} test_acc={test_acc:.4f}"
    )
    print(f"Best weights: {OUTPUT_PATH.resolve()}")


if __name__ == "__main__":
    main()
