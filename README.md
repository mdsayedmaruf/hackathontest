# 🤖 AI Chatbot — React + FastAPI + OpenRouter

A full-stack streaming chatbot. React (Vite) frontend, FastAPI (Python) backend, powered by the [OpenRouter](https://openrouter.ai) API. Dockerized, and ready to deploy to **Vercel** (frontend) + **Render** (backend).

```
hackathonproj/
├── backend/            FastAPI app (OpenRouter proxy, SSE streaming)
│   ├── app/
│   │   ├── main.py     API routes: /api/chat, /api/chat/stream, /api/health
│   │   ├── openrouter.py
│   │   ├── config.py
│   │   └── models.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/           React + Vite chat UI
│   ├── src/            App.jsx, api.js, styles
│   ├── Dockerfile      (multi-stage build → nginx)
│   └── vercel.json
├── docker-compose.yml  run the whole stack locally
└── render.yaml         Render Blueprint for the backend
```

---

## 1. Prerequisites

- An **OpenRouter API key** → https://openrouter.ai/keys
- Either Docker, **or** Python 3.12+ and Node 20+ for local dev.

---

## 2. Run with Docker (easiest)

```bash
# 1. Add your key
cp backend/.env.example backend/.env
#   then edit backend/.env and set OPENROUTER_API_KEY=...

# 2. Build & run
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend  → http://localhost:8000 (docs at http://localhost:8000/docs)

---

## 3. Run locally without Docker

**Backend**

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then set OPENROUTER_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Frontend** (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend on :8000, so no extra config needed.

---

## 4. Deploy

### Backend → Render

1. Push this repo to GitHub.
2. Render dashboard → **New + → Blueprint**, select the repo (it reads `render.yaml`).
3. Set the `OPENROUTER_API_KEY` env var (marked secret).
4. After deploy you get a URL like `https://chatbot-backend.onrender.com`.
5. Set `CORS_ORIGINS` to your Vercel domain once you have it.

> No Blueprint? Create a **Web Service**, root dir `backend`, runtime **Docker**, health check `/api/health`, and add the env vars manually.

### Frontend → Vercel

1. Vercel → **New Project**, import the repo, set **Root Directory** to `frontend`.
2. Framework auto-detects as **Vite** (config in `vercel.json`).
3. Add an env var:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://chatbot-backend.onrender.com`)
4. Deploy. Update the backend's `CORS_ORIGINS` to include your Vercel URL.

---

## 5. Configuration

Backend env vars (`backend/.env`):

| Variable             | Default                  | Description                          |
| -------------------- | ------------------------ | ------------------------------------ |
| `OPENROUTER_API_KEY` | —                        | **Required.** Your OpenRouter key.   |
| `OPENROUTER_MODEL`   | `openai/gpt-4o-mini`     | Any OpenRouter model slug.           |
| `SYSTEM_PROMPT`      | helpful assistant prompt | System message for every chat.       |
| `CORS_ORIGINS`       | `*`                      | Comma-separated allowed origins.     |

Frontend env var (`frontend/.env`): `VITE_API_URL` — backend base URL (blank for local).

---

## API

| Method | Path                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| GET    | `/api/health`       | Health + config status              |
| POST   | `/api/chat`         | Full (non-streaming) reply          |
| POST   | `/api/chat/stream`  | SSE token stream                    |

Request body: `{ "messages": [{ "role": "user", "content": "Hi" }] }`

# hackathontest
