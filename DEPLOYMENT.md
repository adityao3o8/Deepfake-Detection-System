# Deploying on an external server

## Common issues

### 1. Page looks unstyled (plain HTML, broken text)

This usually means CSS/JS from `/_next/static/` is not loading. Fix:

- Run the **Next.js server**, not a static HTML export:
  ```bash
  cd frontend && npm run build && npm run start
  ```
- Bind to all interfaces (already set in `package.json`):
  ```bash
  npm run dev    # development on 0.0.0.0:3000
  npm run start  # production on 0.0.0.0:3000
  ```
- If using **nginx**, proxy both the app and static assets:
  ```nginx
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
  ```

Google Fonts were removed so text renders correctly on servers without outbound internet.

### 2. API points to `localhost:8000`

Browsers on other machines cannot reach your server's backend via `localhost`.

**Default fix (no rebuild):** The frontend proxies API calls through the same host:

- Browser calls: `http://YOUR_SERVER:3000/api/proxy/detect`
- Next.js forwards to: `http://127.0.0.1:8000/api/detect` (or `BACKEND_INTERNAL_URL`)

Set on the server before starting the frontend:

```bash
export BACKEND_INTERNAL_URL=http://127.0.0.1:8000
cd frontend && npm run start
```

### 3. Backend not reachable from the network

Start FastAPI on all interfaces:

```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Allow CORS from your frontend origin:

```bash
# In backend/.env
CORS_ORIGINS=http://YOUR_SERVER_IP:3000,http://YOUR_DOMAIN:3000
# Or allow all (no credentials):
CORS_ORIGINS=*
```

## Quick start (two terminals on the server)

```bash
# Terminal 1 — backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — frontend
cd frontend
npm install
export BACKEND_INTERNAL_URL=http://127.0.0.1:8000
npm run build && npm run start
```

Open: `http://YOUR_SERVER_IP:3000`

## Docker Compose

```bash
docker compose up --build
```

Then open `http://YOUR_SERVER_IP:3000`.

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `BACKEND_INTERNAL_URL` | frontend (server) | Where Next.js proxies `/api/proxy/*` |
| `NEXT_PUBLIC_API_URL` | frontend (build) | Optional direct API URL (skip proxy) |
| `CORS_ORIGINS` | backend | Comma-separated origins or `*` |
| `NEXT_BASE_PATH` | frontend | If served under a subpath (e.g. `/deepfake`) |
