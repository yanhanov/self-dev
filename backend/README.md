# SelfDev Backend

Rust API (Axum + SQLx) with **PostgreSQL**.

## Why PostgreSQL

Relational data fits this product well: goals, skill levels, learning paths, steps, users, and progress are naturally linked. PostgreSQL gives constraints, enums, and easy querying for the 4×4 matrix.

## Quick start (Docker — recommended)

From the project root:

```bash
docker compose up -d --build
```

This starts PostgreSQL and the API. Migrations run automatically on backend startup.

- API: `http://localhost:3000`
- DB: `localhost:5432` (user/password/db: `selfdev`)

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/api/paths?goal=career_change&level=complete_beginner"
```

Stop:

```bash
docker compose down
```

## Local development (without Docker for backend)

```bash
docker compose up -d db
cp .env.example .env
cargo run
```

Use `DATABASE_URL=postgres://selfdev:selfdev@localhost:5432/selfdev` in `.env`.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/goals` | All user goals |
| GET | `/api/skill-levels` | All skill levels |
| GET | `/api/paths?goal=career_change&level=complete_beginner` | Learning paths |
| GET | `/api/paths/{id}/steps` | Steps for a path |
| POST | `/api/users` | Create user `{ "email", "name?" }` |
| PUT | `/api/users/{id}/profile` | Set goal + level |

## Database schema

- `goals` — career_change, level_up, freelance, explore
- `skill_levels` — complete_beginner → advanced
- `skills`, `resources`, `resource_skills`
- `learning_paths`, `learning_path_steps`
- `users`, `user_profiles`, `user_step_progress`

Migrations live in `migrations/` and run automatically on startup.
