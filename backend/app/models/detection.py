from enum import Enum

from pydantic import BaseModel, Field


class MediaType(str, Enum):
    image = "image"
    video = "video"


class DetectionResult(BaseModel):
    filename: str
    media_type: MediaType = MediaType.image
    face_detected: bool = True
    analysis_performed: bool = True
    warning: str | None = Field(
        default=None,
        description="Warning when face detection or analysis cannot proceed",
    )
    is_deepfake: bool
    label: str = Field(description="Predicted class: 'real' or 'fake'")
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence of the predicted class",
    )
    real_confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Probability the media is authentic",
    )
    fake_confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Probability the media is a deepfake",
    )
    message: str
    gradcam_image: str | None = Field(
        default=None,
        description="Base64 data URL of Grad-CAM heatmap overlay",
    )
    frames_analyzed: int | None = Field(
        default=None,
        description="Number of video frames with faces used for inference",
    )
    frames_sampled: int | None = Field(
        default=None,
        description="Total number of video frames sampled for face detection",
    )
    video_duration_seconds: float | None = Field(
        default=None,
        description="Duration of the analyzed video in seconds",
    )
    gradcam_frame_index: int | None = Field(
        default=None,
        description="Video frame index used for the Grad-CAM heatmap",
    )
    gradcam_timestamp_seconds: float | None = Field(
        default=None,
        description="Timestamp in the video used for the Grad-CAM heatmap",
    )
