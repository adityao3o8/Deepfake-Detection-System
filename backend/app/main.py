from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import detection
from app.routes import health as health_routes
from app.services.face_registry import load_face_detector, unload_face_detector
from app.services.model_registry import load_detector, unload_detector


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.preload_face_detector_on_startup:
        load_face_detector()
    if settings.preload_model_on_startup:
        load_detector()
    yield
    unload_detector()
    unload_face_detector()


app = FastAPI(
    title="Deepfake Detection API",
    description="Backend API for the Deepfake Detection System",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"(chrome-extension://.*|https://.*\.vercel\.app)",
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_routes.router, prefix="/api", tags=["health"])
app.include_router(detection.router, prefix="/api", tags=["detection"])
