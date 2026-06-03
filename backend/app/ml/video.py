from __future__ import annotations

import tempfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import cv2
from PIL import Image

@dataclass(frozen=True)
class VideoFrame:
    index: int
    timestamp_seconds: float
    jpeg_bytes: bytes


@dataclass(frozen=True)
class VideoMetadata:
    duration_seconds: float
    fps: float
    total_frames: int


def _frame_to_jpeg_bytes(frame_bgr) -> bytes:
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    image = Image.fromarray(frame_rgb)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


def extract_frames(
    video_bytes: bytes,
    *,
    max_frames: int = 32,
    target_size: int | None = None,
) -> tuple[list[VideoFrame], VideoMetadata]:
    """Sample frames evenly across the video at native resolution."""
    if max_frames < 1:
        raise ValueError("max_frames must be at least 1")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = Path(tmp.name)

    try:
        capture = cv2.VideoCapture(str(tmp_path))
        if not capture.isOpened():
            raise ValueError("Could not open video file.")

        total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
        if total_frames <= 0 or fps <= 0:
            raise ValueError("Video has no readable frames.")

        duration_seconds = total_frames / fps
        sample_count = min(max_frames, total_frames)
        frame_indices = [
            int(i * (total_frames - 1) / max(sample_count - 1, 1))
            for i in range(sample_count)
        ]

        frames: list[VideoFrame] = []
        for frame_index in frame_indices:
            capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ok, frame_bgr = capture.read()
            if not ok or frame_bgr is None:
                continue

            if target_size:
                frame_bgr = cv2.resize(
                    frame_bgr,
                    (target_size, target_size),
                    interpolation=cv2.INTER_AREA,
                )

            frames.append(
                VideoFrame(
                    index=frame_index,
                    timestamp_seconds=frame_index / fps,
                    jpeg_bytes=_frame_to_jpeg_bytes(frame_bgr),
                )
            )

        capture.release()

        if not frames:
            raise ValueError("No frames could be extracted from the video.")

        metadata = VideoMetadata(
            duration_seconds=duration_seconds,
            fps=fps,
            total_frames=total_frames,
        )
        return frames, metadata
    finally:
        tmp_path.unlink(missing_ok=True)
