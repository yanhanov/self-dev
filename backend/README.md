# SelfDev Backend

Rust API (Axum + SQLx) with **PostgreSQL**.

## Why PostgreSQL

Relational data fits this product well: goals, skill levels, learning paths, steps, users, and progress are naturally linked. PostgreSQL gives constraints, enums, and easy querying for the 4×4 matrix.

## Quick start

```bash
# 1. Start database
docker compose up -d

# 2. Configure env
cp .env.example .env

# 3. Run API (applies migrations on startup)
cargo run
```

Server: `http://localhost:3000`

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
