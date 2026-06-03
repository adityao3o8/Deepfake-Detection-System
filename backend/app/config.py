from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.ml.efficientnet_detector import DEFAULT_WEIGHTS_URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Deepfake Detection API"
    debug: bool = False
    cors_origins: list[str] | str = "http://localhost:3000"

    model_weights_path: str | None = None
    model_weights_url: str = DEFAULT_WEIGHTS_URL
    model_device: str | None = None
    use_imagenet_normalize: bool = False

    preload_model_on_startup: bool = True

    max_image_upload_bytes: int = 10 * 1024 * 1024
    max_video_upload_bytes: int = 100 * 1024 * 1024
    video_max_frames: int = 32

    face_model_path: str | None = None
    face_score_threshold: float = 0.6
    face_crop_padding_ratio: float = 0.2
    preload_face_detector_on_startup: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, list):
            return value
        raw = value.strip()
        if raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    @property
    def cors_allow_credentials(self) -> bool:
        return "*" not in self.cors_origins


settings = Settings()
