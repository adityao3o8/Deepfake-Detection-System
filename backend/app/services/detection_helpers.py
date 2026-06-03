from app.ml.face_detection import NO_FACE_WARNING
from app.models.detection import DetectionResult, MediaType


def no_face_result(
    *,
    filename: str,
    media_type: MediaType,
    frames_sampled: int | None = None,
    video_duration_seconds: float | None = None,
) -> DetectionResult:
    message = NO_FACE_WARNING
    if media_type == MediaType.video and frames_sampled is not None:
        message = (
            f"{NO_FACE_WARNING} (checked {frames_sampled} sampled frames)."
        )

    return DetectionResult(
        filename=filename,
        media_type=media_type,
        face_detected=False,
        analysis_performed=False,
        warning=NO_FACE_WARNING,
        is_deepfake=False,
        label="unavailable",
        confidence=0.0,
        real_confidence=0.0,
        fake_confidence=0.0,
        message=message,
        gradcam_image=None,
        frames_analyzed=0,
        frames_sampled=frames_sampled,
        video_duration_seconds=video_duration_seconds,
    )
