import asyncio
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, UploadFile

from app.config import settings
from app.models.detection import DetectionResult, MediaType
from app.services.detection_helpers import no_face_result
from app.services.face_registry import get_face_detector
from app.services.model_registry import get_detector
from app.services.video_analyzer import analyze_video

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
}

ALLOWED_CONTENT_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mkv"}


def _guess_media_type(filename: str | None, content_type: str | None) -> MediaType | None:
    if content_type in ALLOWED_IMAGE_TYPES:
        return MediaType.image
    if content_type in ALLOWED_VIDEO_TYPES:
        return MediaType.video

    if not filename:
        return None

    suffix = filename.lower().rsplit(".", maxsplit=1)[-1]
    ext = f".{suffix}"
    if ext in IMAGE_EXTENSIONS:
        return MediaType.image
    if ext in VIDEO_EXTENSIONS:
        return MediaType.video
    return None


def _filename_from_url(url: str) -> str:
    path = urlparse(url).path
    name = path.rsplit("/", maxsplit=1)[-1] if path else ""
    return name or "image-from-url"


class DetectionService:
    """Orchestrates face detection, cropping, and EfficientNet-B0 inference."""

    async def analyze_url(self, url: str) -> DetectionResult:
        parsed = urlparse(url.strip())
        if parsed.scheme not in {"http", "https"}:
            raise HTTPException(
                status_code=400,
                detail="Only http:// and https:// image URLs are supported.",
            )

        filename = _filename_from_url(url)
        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=30.0,
            ) as client:
                response = await client.get(url)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Could not download image: {exc}",
            ) from exc

        if response.status_code >= 400:
            raise HTTPException(
                status_code=400,
                detail=f"Could not download image (HTTP {response.status_code}).",
            )

        content = response.content
        if not content:
            raise HTTPException(status_code=400, detail="Downloaded image is empty.")

        if len(content) > settings.max_image_upload_bytes:
            limit_mb = settings.max_image_upload_bytes / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"Image exceeds the {limit_mb:.0f} MB limit.",
            )

        content_type = response.headers.get("content-type", "").split(";")[0].strip()
        media_type = _guess_media_type(filename, content_type or None)
        if media_type != MediaType.image:
            raise HTTPException(
                status_code=415,
                detail="URL must point to a supported image (JPEG, PNG, WebP, BMP, or TIFF).",
            )

        try:
            return await self._analyze_image(content, filename)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Could not process image: {exc}",
            ) from exc

    async def analyze(self, file: UploadFile) -> DetectionResult:
        media_type = _guess_media_type(file.filename, file.content_type)
        if media_type is None:
            allowed = ", ".join(sorted(ALLOWED_CONTENT_TYPES))
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported media type: {file.content_type}. Allowed: {allowed}",
            )

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")

        max_bytes = (
            settings.max_video_upload_bytes
            if media_type == MediaType.video
            else settings.max_image_upload_bytes
        )
        if len(content) > max_bytes:
            limit_mb = max_bytes / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds the {limit_mb:.0f} MB limit for {media_type.value} uploads.",
            )

        filename = file.filename or "unknown"

        try:
            if media_type == MediaType.image:
                return await self._analyze_image(content, filename)
            return await self._analyze_video(content, filename)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Could not process {media_type.value}: {exc}",
            ) from exc

    async def _analyze_image(self, content: bytes, filename: str) -> DetectionResult:
        face_crop = await asyncio.to_thread(
            get_face_detector().crop_face_to_jpeg,
            content,
        )
        if face_crop is None:
            return no_face_result(filename=filename, media_type=MediaType.image)

        scores, gradcam_image = await asyncio.to_thread(
            get_detector().predict_with_gradcam,
            face_crop,
            include_gradcam=True,
        )
        return DetectionResult(
            filename=filename,
            media_type=MediaType.image,
            face_detected=True,
            analysis_performed=True,
            is_deepfake=scores.is_deepfake,
            label=scores.label,
            confidence=scores.confidence,
            real_confidence=scores.real_confidence,
            fake_confidence=scores.fake_confidence,
            message="Image analysis complete (face region).",
            gradcam_image=gradcam_image,
        )

    async def _analyze_video(self, content: bytes, filename: str) -> DetectionResult:
        analysis = await asyncio.to_thread(
            analyze_video,
            get_detector(),
            get_face_detector(),
            content,
            include_gradcam=True,
        )
        duration = round(analysis.metadata.duration_seconds, 2)

        if not analysis.face_detected or analysis.scores is None:
            return no_face_result(
                filename=filename,
                media_type=MediaType.video,
                frames_sampled=analysis.frames_sampled,
                video_duration_seconds=duration,
            )

        scores = analysis.scores
        return DetectionResult(
            filename=filename,
            media_type=MediaType.video,
            face_detected=True,
            analysis_performed=True,
            is_deepfake=scores.is_deepfake,
            label=scores.label,
            confidence=scores.confidence,
            real_confidence=scores.real_confidence,
            fake_confidence=scores.fake_confidence,
            message=(
                f"Video analysis complete across {analysis.frames_analyzed} "
                f"face frames (from {analysis.frames_sampled} sampled)."
            ),
            gradcam_image=analysis.gradcam_image,
            frames_analyzed=analysis.frames_analyzed,
            frames_sampled=analysis.frames_sampled,
            video_duration_seconds=duration,
            gradcam_frame_index=analysis.gradcam_frame_index,
            gradcam_timestamp_seconds=analysis.gradcam_timestamp_seconds,
        )
