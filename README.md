# Hangar

A self-hosted wardrobe manager that uses AI to catalogue your clothes and suggest outfits based on the weather.

[![CI](https://github.com/Gurshaan-Deol/Hangar/actions/workflows/ci.yml/badge.svg)](https://github.com/Gurshaan-Deol/Hangar/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://www.python.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## Screenshots

### Login
![Login page showing GitHub and Google OAuth buttons on a dark background](docs/screenshots/login.png)
*Clean OAuth login — no passwords to manage*

### Wardrobe
![Wardrobe grid showing clothing cards with AI-extracted details and category filters](docs/screenshots/wardrobe.png)
*Your wardrobe at a glance — AI fills in the details automatically*

### Upload & Analysis
![Upload zone with drag-and-drop interface and live AI analysis status](docs/screenshots/upload.png)
*Drop a photo and the AI takes care of the rest*

### Outfit Recommendations
![Recommendations page showing weather widget, occasion selector, and AI-generated outfit](docs/screenshots/recommendations.png)
*Daily outfit suggestions matched to real weather data*

### Saved Outfits
![Outfit history page showing saved outfits with star ratings and wear count](docs/screenshots/outfits.png)
*Track what you wear, rate your outfits, and build a history over time*

---

## What it does

You upload a photo of a piece of clothing. An AI model running in the background figures out what it is — the category, colour, style, and what season it works for — and saves all of that to your wardrobe automatically. Once you have enough items, you can ask for an outfit recommendation. The app pulls today's real weather data and asks the AI to put together a combination of items that make sense for the conditions and occasion. Everything is saved locally, nothing goes to a third-party service, and you can run the whole thing with a single Docker command.

**Key features:**
- Photo-based wardrobe cataloguing with automatic AI tagging
- Daily outfit suggestions matched to live weather data from Open-Meteo
- Supports OpenAI, Google Gemini, Ollama (free, runs locally), or any OpenAI-compatible API
- Sign in with GitHub or Google — no passwords
- Outfit history with star ratings and wear tracking
- Fully self-hosted — your photos and data stay on your machine

---

## Quick Start

```bash
git clone https://github.com/Gurshaan-Deol/hangar.git
cd hangar
cp .env.example .env
```

Open `.env` and fill in your credentials (see [OAuth Setup](#oauth-setup) and [AI Configuration](#ai-configuration) below), then:

```bash
docker compose up -d
docker compose exec backend alembic upgrade head
```

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| API docs | http://localhost:8000/docs |

---

## OAuth Setup

You need credentials from at least one provider. Both are free.

### GitHub

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Set **Homepage URL** to `http://localhost:3000`
3. Set **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`
4. Copy the **Client ID** and generate a **Client Secret**
5. Add to `.env`:

```env
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

### Google

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project → **APIs & Services** → **Credentials** → **Create OAuth client ID**
2. Set application type to **Web application**
3. Add `http://localhost:3000/api/auth/callback/google` as an authorised redirect URI
4. Copy the **Client ID** and **Client Secret**
5. Add to `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

You only need one provider to get started.

---

## AI Configuration

Pick one provider and set the relevant block in your `.env`.

### OpenAI

```env
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_VISION_MODEL=gpt-4o
AI_TEXT_MODEL=gpt-4o
```

### Google Gemini

```env
AI_PROVIDER=google
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_API_KEY=AIza...
AI_VISION_MODEL=gemini-1.5-pro
AI_TEXT_MODEL=gemini-1.5-pro
```

### Ollama (free, runs locally)

[Install Ollama](https://ollama.com), pull a vision-capable model, then point the app at it.

```bash
ollama pull gemma3:latest
```

```env
AI_PROVIDER=ollama
AI_BASE_URL=http://host.docker.internal:11434/v1
AI_API_KEY=not-needed
AI_VISION_MODEL=gemma3:latest
AI_TEXT_MODEL=gemma3:latest
```

Note: smaller local models like `gemma3` are slower and less accurate than GPT-4o or Gemini. Analysis can take 30–60 seconds per item on CPU.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP
┌─────────────────────▼───────────────────────────────────┐
│            Frontend — Next.js 14 (:3000)                │
│  • App Router + TypeScript                              │
│  • NextAuth.js v5 (GitHub / Google OAuth)               │
│  • TanStack Query for server state                      │
│  • Proxies /api/v1/* to backend with auth token         │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────────┐
│             Backend — FastAPI (:8000)                   │
│  • Async SQLAlchemy + Pydantic v2                       │
│  • JWT auth via NextAuth secret                         │
│  • Clothing CRUD + file upload                          │
│  • Outfit recommendations + history                     │
└──────┬──────────────┬────────────────┬──────────────────┘
       │              │                │
┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼────────────────────┐
│ PostgreSQL  │ │  Redis 7   │ │      arq Worker           │
│     15      │ │            │ │  • Picks up analysis jobs │
│             │ │ Job queue  │ │  • Preprocesses images    │
│ Users       │ │ Weather    │ │  • Calls AI provider      │
│ Clothing    │ │ cache      │ │  • Updates item status    │
│ Outfits     │ │            │ │  • Retries on failure     │
└─────────────┘ └────────────┘ └───────────────────────────┘
                                          │
                               ┌──────────▼────────────────┐
                               │      AI Provider          │
                               │  OpenAI / Gemini / Ollama │
                               └───────────────────────────┘
```

Photo uploads are analysed by an arq background worker so the HTTP request returns immediately. The frontend polls the item's status field (`pending` → `analyzing` → `ready`) to show live progress without blocking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, TanStack Query v5, Tailwind CSS, shadcn/ui |
| Backend | FastAPI 0.111, SQLAlchemy 2.0 (async), Pydantic v2, Python 3.11+ |
| Database | PostgreSQL 15 |
| Cache + Queue | Redis 7 + arq |
| Auth | NextAuth.js v5 — GitHub and Google OAuth |
| AI | Any OpenAI-compatible API |
| Weather | [Open-Meteo](https://open-meteo.com) — free, no API key needed |
| Deployment | Docker + Docker Compose |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_URL` | Yes | Frontend URL — `http://localhost:3000` in dev |
| `NEXTAUTH_SECRET` | Yes | Random string, 32+ characters. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `POSTGRES_USER` | Yes | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `POSTGRES_DB` | Yes | PostgreSQL database name |
| `DATABASE_URL` | Yes | Full async connection string — must match the postgres vars above |
| `REDIS_URL` | Yes | Redis connection — `redis://redis:6379` inside Docker |
| `GITHUB_CLIENT_ID` | OAuth | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | OAuth | GitHub OAuth app client secret |
| `GOOGLE_CLIENT_ID` | OAuth | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth | Google OAuth app client secret |
| `AI_PROVIDER` | Yes | `openai`, `google`, or `ollama` |
| `AI_BASE_URL` | Yes | API base URL for your chosen provider |
| `AI_API_KEY` | Yes* | API key — use `not-needed` for Ollama |
| `AI_VISION_MODEL` | Yes | Model used for image analysis |
| `AI_TEXT_MODEL` | Yes | Model used for outfit recommendations |
| `WEATHER_LAT` | Yes | Default latitude for weather lookups |
| `WEATHER_LON` | Yes | Default longitude for weather lookups |
| `UPLOAD_DIR` | Yes | Path inside the container where photos are stored |
| `MAX_UPLOAD_SIZE_MB` | Yes | Maximum upload file size in MB |
| `ALLOWED_ORIGINS` | Yes | CORS allowed origins — `http://localhost:3000` in dev |

---

## Development

Start all services with hot reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Tail logs:

```bash
docker compose logs -f frontend backend worker
```

Run tests:

```bash
docker compose exec backend pytest tests/ -v
docker compose exec frontend npm test -- --watchAll=false
```

Lint and type check:

```bash
docker compose exec backend ruff check app/
docker compose exec frontend npx tsc --noEmit
```

Stop everything:

```bash
docker compose down
```

---

## Requirements

- Docker Desktop
- 4 GB RAM minimum — 8 GB if running Ollama locally
- A GitHub or Google account for OAuth (both are free)
- An AI provider — Ollama runs entirely on your own hardware at no cost; OpenAI and Gemini are pay-per-use

---

## Contributing

Contributions are welcome. To get started:

```bash
git clone https://github.com/Gurshaan-Deol/hangar.git
cd hangar
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Please open an issue before submitting a large PR. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org).

---

## Troubleshooting

**`docker compose up` fails with a database error**

Run the migrations manually:
```bash
docker compose exec backend alembic upgrade head
```

**AI analysis always fails**

Check the worker logs first:
```bash
docker compose logs worker --tail=50
```
The most common causes are a wrong `AI_API_KEY`, a model that hasn't been pulled in Ollama, or `AI_BASE_URL` being unreachable from inside the Docker network. For Ollama, make sure you have run `ollama pull gemma3:latest` on the host machine before starting the stack.

**OAuth login fails with a "Configuration" error**

Check that `NEXTAUTH_SECRET` is at least 32 characters and that `NEXTAUTH_URL` exactly matches the URL you are using to access the app.

**Photos not loading after upload**

Photos are served through an authenticated API endpoint rather than as static files. If images aren't loading, make sure you are signed in and check the backend logs:
```bash
docker compose logs backend --tail=20
```

---

## License

[MIT](LICENSE)

<!-- Suggested GitHub topics: wardrobe ai self-hosted nextjs fastapi docker ollama openai outfit-recommendations -->
