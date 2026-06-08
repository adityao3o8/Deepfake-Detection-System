# Deepfake Detection System

[![Repository](https://img.shields.io/badge/GitHub-Deepfake--Detection--System-131a43?style=flat&logo=github)](https://github.com/adityao3o8/Deepfake-Detection-System)

A monorepo for detecting AI-generated or manipulated media (images and video). The system combines a web frontend for uploads and results, a FastAPI backend with a self-trained EfficientNet-B0 model, and a Chrome extension for right-click analysis on any website.

## Project structure

```
deepfake/
├── frontend/          # Next.js 14 + TypeScript + Tailwind + shadcn/ui
├── backend/           # FastAPI (routes, models, services, ML inference)
│   └── deepfake_efficientnet.pth   # Trained model weights (~16 MB)
├── extension/         # Chrome extension (Manifest V3)
├── train.py           # Fine-tune EfficientNet-B0 on a CSV dataset
├── docker-compose.yml
└── README.md
```

## Features

- **Image & video detection** — upload media via the web UI or Chrome extension
- **Face-first pipeline** — OpenCV YuNet detects and crops the largest face before inference; no face → warning, no model run
- **Grad-CAM heatmaps** — visual explanation of model attention on face regions
- **Self-trained model** — EfficientNet-B0 fine-tuned for real vs fake classification
- **Chrome extension** — right-click any image → "Check for Deepfake"
- **Docker support** — backend image bundles model weights for deployment

## Quick start

**Terminal 1 — backend**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

Copy `frontend/.env.local.example` to `frontend/.env.local` if needed (defaults proxy to `http://127.0.0.1:8000`).

## Frontend (`frontend/`)

- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/), Framer Motion
- **Purpose:** Upload media, view detection scores, Grad-CAM overlays, and scroll-animated results

The UI calls `POST /api/detect` (via same-origin proxy `/api/proxy/detect` in production) and displays real/fake confidence bars plus a Grad-CAM heatmap. Videos are analyzed by sampling up to 32 frames (face-cropped) and averaging predictions.

```bash
cd frontend && npm run dev    # http://localhost:3000
```

## Backend (`backend/`)

- **Stack:** FastAPI, PyTorch, torchvision, OpenCV, Uvicorn
- **Model:** EfficientNet-B0 with `nn.Sequential(nn.Dropout(0.3), nn.Linear(1280, 1))`
- **Weights:** `backend/deepfake_efficientnet.pth` (loaded at startup)
- **Layout:**
  - `app/routes/` — HTTP endpoints
  - `app/models/` — request/response schemas
  - `app/services/` — detection orchestration
  - `app/ml/` — preprocessing, face detection, Grad-CAM, inference

**Environment variables** (optional `.env` in `backend/`):

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_WEIGHTS_PATH` | `deepfake_efficientnet.pth` | Path to `.pth` checkpoint |
| `MODEL_DEVICE` | `cuda`, `mps`, or `cpu` | Inference device (auto-detected) |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated origins or `*` |
| `PRELOAD_MODEL_ON_STARTUP` | `true` | Load model when server starts |
| `MAX_IMAGE_UPLOAD_BYTES` | `10485760` | Image upload limit (10 MB) |
| `MAX_VIDEO_UPLOAD_BYTES` | `104857600` | Video upload limit (100 MB) |
| `VIDEO_MAX_FRAMES` | `32` | Max frames sampled per video |

### API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Service health check |
| `/api/detect` | POST | Upload an image or video (multipart) for analysis |
| `/api/detect-url` | POST | Analyze an image from a public URL (for Chrome extension) |

**Example `POST /api/detect` response:**

```json
{
  "filename": "clip.mp4",
  "media_type": "video",
  "face_detected": true,
  "analysis_performed": true,
  "is_deepfake": false,
  "label": "real",
  "confidence": 0.91,
  "real_confidence": 0.91,
  "fake_confidence": 0.09,
  "message": "Video analysis complete across 28 face frames (from 32 sampled).",
  "gradcam_image": "data:image/png;base64,...",
  "frames_analyzed": 28,
  "frames_sampled": 32,
  "video_duration_seconds": 12.5,
  "gradcam_frame_index": 120,
  "gradcam_timestamp_seconds": 4.0
}
```

**Example `POST /api/detect-url` request:**

```json
{ "url": "https://example.com/photo.jpg" }
```

## Chrome extension (`extension/`)

Right-click any image on a webpage and choose **Check for Deepfake**. The extension sends the image URL to the backend and shows the verdict in a popup.

**Load in Chrome:**

1. Start the backend on port `8000`
2. Open `chrome://extensions` → enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Right-click an image → **Check for Deepfake**

Configure the API URL in the extension popup footer. For production, update `extension/api-config.json` and run `node sync-manifest.mjs` to sync host permissions and CSP.

## Training (`train.py`)

Fine-tune EfficientNet-B0 on a CSV-split dataset (expects `train.csv`, `valid.csv`, `test.csv` with `path` and `label` columns; labels `1=real`, `0=fake`).

```bash
# Edit DATASET_ROOT in train.py, then:
source backend/.venv/bin/activate
python train.py
```

Saves the best checkpoint as `deepfake_efficientnet.pth` (copy to `backend/` for inference). Uses MPS on Apple Silicon when available.

## Docker

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The backend Dockerfile copies `deepfake_efficientnet.pth` into the image at `/app/deepfake_efficientnet.pth`.

For external servers, see [DEPLOYMENT.md](DEPLOYMENT.md) (CORS, API proxy, nginx, binding to `0.0.0.0`).

## Development workflow

1. Start the backend on port `8000`.
2. Start the frontend on port `3000`.
3. Upload an image or video in the UI, or use the Chrome extension.
4. Retrain with `train.py` and replace `backend/deepfake_efficientnet.pth` to update the model.
