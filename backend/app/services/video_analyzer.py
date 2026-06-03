from __future__ import annotations

from dataclasses import dataclass

from app.config import settings
from app.ml.efficientnet_detector import EfficientNetDeepfakeDetector, InferenceScores
from app.ml.face_detection import FaceDetector, NO_FACE_WARNING
from app.ml.video import VideoFrame, VideoMetadata, extract_frames


@dataclass(frozen=True)
class VideoAnalysisResult:
    scores: InferenceScores | None
    gradcam_image: str | None
    frames_analyzed: int
    frames_sampled: int
    metadata: VideoMetadata
    gradcam_frame_index: int | None
    gradcam_timestamp_seconds: float | None
    face_detected: bool
    warning: str | None = None


def analyze_video(
    detector: EfficientNetDeepfakeDetector,
    face_detector: FaceDetector,
    video_bytes: bytes,
    *,
    max_frames: int | None = None,
    include_gradcam: bool = True,
) -> VideoAnalysisResult:
    frame_limit = max_frames or settings.video_max_frames
    frames, metadata = extract_frames(video_bytes, max_frames=frame_limit)
    frames_sampled = len(frames)

    frame_scores: list[tuple[VideoFrame, InferenceScores]] = []

    for frame in frames:
        face_crop = face_detector.crop_face_to_jpeg(frame.jpeg_bytes)
        if face_crop is None:
            continue

        scores, _ = detector.predict_with_gradcam(
            face_crop,
            include_gradcam=False,
        )
        frame_scores.append((frame, scores))

    if not frame_scores:
        return VideoAnalysisResult(
            scores=None,
            gradcam_image=None,
            frames_analyzed=0,
            frames_sampled=frames_sampled,
            metadata=metadata,
            gradcam_frame_index=None,
            gradcam_timestamp_seconds=None,
            face_detected=False,
            warning=NO_FACE_WARNING,
        )

    mean_real = sum(item[1].real_confidence for item in frame_scores) / len(
        frame_scores
    )
    mean_fake = sum(item[1].fake_confidence for item in frame_scores) / len(
        frame_scores
    )
    aggregated = InferenceScores(real_confidence=mean_real, fake_confidence=mean_fake)

    gradcam_image: str | None = None
    gradcam_frame_index: int | None = None
    gradcam_timestamp: float | None = None

    if include_gradcam:
        key_frame, _ = max(
            frame_scores,
            key=lambda item: item[1].fake_confidence,
        )
        key_crop = face_detector.crop_face_to_jpeg(key_frame.jpeg_bytes)
        if key_crop is not None:
            _, gradcam_image = detector.predict_with_gradcam(
                key_crop,
                include_gradcam=True,
            )
            gradcam_frame_index = key_frame.index
            gradcam_timestamp = key_frame.timestamp_seconds

    return VideoAnalysisResult(
        scores=aggregated,
        gradcam_image=gradcam_image,
        frames_analyzed=len(frame_scores),
        frames_sampled=frames_sampled,
        metadata=metadata,
        gradcam_frame_index=gradcam_frame_index,
        gradcam_timestamp_seconds=gradcam_timestamp,
        face_detected=True,
    )
