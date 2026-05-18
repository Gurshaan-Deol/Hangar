# Hangar

**Self-hosted AI wardrobe manager. Snap your clothes, get outfit suggestions.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://www.python.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com)

---

## Features

- 📸 **Photo-based wardrobe** — Upload photos, AI extracts clothing type, colour, style, and season automatically
- 🌤️ **Smart recommendations** — Outfits matched to today's weather and occasion via Open-Meteo
- 🤖 **Works with any AI** — OpenAI, Google Gemini, Ollama (free local), or any OpenAI-compatible API
- 🔐 **OAuth login** — Sign in with GitHub or Google, no passwords to manage
- 🐳 **One-command setup** — Docker Compose brings up the entire stack
- 🔒 **Fully self-hosted** — Your photos and data never leave your machine

---

## Quick Start

```bash
git clone https://github.com/Gurshaan-Deol/Hangar.git
cd hangar
cp .env.example .env
```

Open `.env` and fill in your credentials (see [AI Configuration](#ai-configuration) and [Requirements](#requirements) below), then:

```bash
docker compose up -d
docker compose exec backend alembic upgrade head
```

| Service            | URL                        |
| ------------------ | -------------------------- |
| Frontend           | http://localhost:3000      |
| API docs (Swagger) | http://localhost:8000/docs |

---

## AI Configuration

Pick one provider and set the corresponding block in your `.env`.

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

[Install Ollama](https://ollama.com), then pull a vision model:

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

---

## Architecture

```
Browser
  │
  ▼
Frontend (Next.js :3000)
  │  rewrites /api/v1/* → backend
  ▼
Backend (FastAPI :8000)
  ├── PostgreSQL 15   (user accounts, wardrobe items, outfits)
  ├── Redis 7         (job queue for background AI analysis)
  └── AI Provider     (image analysis + outfit recommendations)
```

Photo uploads are analysed in the background by an **arq worker** so the HTTP request returns immediately. The frontend polls the item's `status` field (`pending` → `ready`) to show a loading state.

---

## Tech Stack

| Layer         | Technology                                                         |
| ------------- | ------------------------------------------------------------------ |
| Frontend      | Next.js 14, TypeScript, TanStack Query v5, Tailwind CSS, shadcn/ui |
| Backend       | FastAPI 0.111, SQLAlchemy 2.0 (async), Pydantic v2, Python 3.11+   |
| Database      | PostgreSQL 15                                                      |
| Cache + Queue | Redis 7 + arq                                                      |
| Auth          | NextAuth.js v5 (GitHub + Google OAuth)                             |
| AI            | Any OpenAI-compatible API (OpenAI, Gemini, Ollama, …)              |
| Weather       | [Open-Meteo](https://open-meteo.com) — free, no API key needed     |
| Deployment    | Docker + Docker Compose                                            |

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

Lint the backend:

```bash
docker compose exec backend ruff check app/
```

Stop everything:

```bash
docker compose down
```

---

## Requirements

- **Docker Desktop** (includes Docker Compose)
- **4 GB RAM** minimum — 8 GB recommended if running Ollama locally
- **GitHub or Google account** — for OAuth (both are free)
- **An AI provider** — Ollama is free and runs entirely on your machine; OpenAI and Google Gemini have pay-per-use APIs

---

## License

[MIT](LICENSE)
