from fastapi import APIRouter, File, UploadFile

from app.models.detection import DetectUrlRequest, DetectionResult
from app.services.detection_service import DetectionService

router = APIRouter()
detection_service = DetectionService()


@router.post("/detect", response_model=DetectionResult)
async def detect_deepfake(file: UploadFile = File(...)) -> DetectionResult:
    """Analyze an uploaded image or video and return detection results."""
    return await detection_service.analyze(file)


@router.post("/detect-url", response_model=DetectionResult)
async def detect_deepfake_from_url(body: DetectUrlRequest) -> DetectionResult:
    """Download an image from a URL and return detection results (for browser extensions)."""
    return await detection_service.analyze_url(body.url)
