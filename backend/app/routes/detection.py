from fastapi import APIRouter, File, UploadFile

from app.models.detection import DetectionResult
from app.services.detection_service import DetectionService

router = APIRouter()
detection_service = DetectionService()


@router.post("/detect", response_model=DetectionResult)
async def detect_deepfake(file: UploadFile = File(...)) -> DetectionResult:
    """Analyze an uploaded image or video and return detection results."""
    return await detection_service.analyze(file)
