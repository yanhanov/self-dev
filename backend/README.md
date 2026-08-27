# SelfDev Backend

Rust API (Axum + SQLx) with **PostgreSQL** and an **AI sidecar** for personalized courses.

## Quick start (Docker)

From the project root:

```bash
cp .env.example .env
docker compose up -d --build
# or
make up
```

Services:

- API: `http://localhost:3000`
- AI: `http://localhost:3001`
- DB: `localhost:5432`

## Personalized learning API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/professions` | Frontend / UI/UX Design |
| GET | `/api/skill-levels` | 4 skill levels |
| POST | `/api/users` | Create or upsert user |
| POST | `/api/users/{id}/onboard` | Start AI course generation |
| GET | `/api/users/{id}/course` | Course + lessons + generation status |
| GET | `/api/lessons/{id}` | Theory, practice, quiz |
| POST | `/api/lessons/{id}/complete` | Submit quiz + complete lesson |
| GET | `/api/users/{id}/today` | Daily AI plan |
| PUT | `/api/users/{id}/today/tasks/{task_id}/done` | Mark task done |

Migrations in `migrations/` run automatically on startup (including `003_ai_learning.sql`).
