# Deepfake Detection System

[![Repository](https://img.shields.io/badge/GitHub-Deepfake--Detection--System-131a43?style=flat&logo=github)](https://github.com/adityao3o8/Deepfake-Detection-System)

A monorepo for detecting AI-generated or manipulated media (images and video). The system combines a web frontend for uploads and results with a FastAPI backend for analysis and model serving.

## Project structure

```
deepfake/
├── frontend/          # Next.js 14 + TypeScript + Tailwind + shadcn/ui
├── backend/           # FastAPI (routes, models, services)
└── README.md
```

## Frontend (`frontend/`)

- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/)
- **Purpose:** User interface for uploading media, viewing detection scores, and managing analysis history.

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `frontend/.env.local.example` to `frontend/.env.local` (defaults to `http://localhost:8000`).

The UI lets you upload an image or video, calls `POST /api/detect`, and shows real/fake confidence scores plus a Grad-CAM heatmap overlay. **OpenCV YuNet** detects and crops the face before inference; if no face is found, a warning is returned without running the model. Videos are analyzed by sampling up to 32 frames (face-cropped) and averaging predictions.

Add shadcn components as needed:

```bash
npx shadcn@latest add card input
```

## Backend (`backend/`)

- **Stack:** FastAPI, PyTorch, EfficientNet-B0, Uvicorn
- **Model:** EfficientNet-B0 fine-tuned on [FaceForensics++ (C23)](https://huggingface.co/Xicor9/efficientnet-b0-ffpp-c23) (class 0 = real, 1 = fake)
- **Layout:**
  - `app/routes/` — HTTP endpoints
  - `app/models/` — request/response schemas
  - `app/services/` — detection orchestration
  - `app/ml/` — preprocessing and PyTorch inference

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On first start, weights (~16 MB) download from Hugging Face into the PyTorch hub cache.

**Environment variables** (optional `.env` in `backend/`):

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_WEIGHTS_PATH` | — | Local `.pth` checkpoint path |
| `MODEL_DEVICE` | `cuda` or `cpu` | Inference device |
| `USE_IMAGENET_NORMALIZE` | `false` | Apply ImageNet mean/std (enable only if your weights expect it) |

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

| Endpoint        | Method | Description              |
|----------------|--------|--------------------------|
| `/api/health`  | GET    | Service health check     |
| `/api/detect`  | POST   | Upload an image or video (MP4/WebM/MOV, etc.) for analysis |

**Example response:**

```json
{
  "filename": "clip.mp4",
  "media_type": "video",
  "is_deepfake": false,
  "label": "real",
  "confidence": 0.91,
  "real_confidence": 0.91,
  "fake_confidence": 0.09,
  "message": "Video analysis complete across 32 sampled frames.",
  "gradcam_image": "data:image/png;base64,...",
  "frames_analyzed": 32,
  "video_duration_seconds": 12.5,
  "gradcam_frame_index": 120,
  "gradcam_timestamp_seconds": 4.0
}
```

## Development workflow

1. Start the backend on port `8000`.
2. Start the frontend on port `3000` (CORS is configured for local dev).
3. Wire the frontend to `POST /api/detect` when building the upload flow.

## Deploying on an external server

See [DEPLOYMENT.md](DEPLOYMENT.md) for fixing unstyled pages, `localhost` API errors, CORS, and Docker Compose.

## License

Add your license here.
