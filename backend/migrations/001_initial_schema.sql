-- SelfDev: learning paths for frontend developers
-- PostgreSQL 16+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Reference data ──────────────────────────────────────────────

CREATE TABLE goals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE skill_levels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    order_index INT  NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'general',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE resource_type AS ENUM (
    'article', 'video', 'course', 'exercise', 'project', 'book'
);

CREATE TABLE resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    url             TEXT NOT NULL,
    resource_type   resource_type NOT NULL DEFAULT 'article',
    language        TEXT NOT NULL DEFAULT 'en',
    is_free         BOOLEAN NOT NULL DEFAULT true,
    estimated_hours NUMERIC(4,1),
    difficulty      SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
    source_name     TEXT,
    summary         TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resource_skills (
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (resource_id, skill_id)
);

-- ── Learning paths ────────────────────────────────────────────────

CREATE TABLE learning_paths (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id        UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    skill_level_id UUID NOT NULL REFERENCES skill_levels(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (goal_id, skill_level_id)
);

CREATE TABLE learning_path_steps (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id        UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    order_index    INT  NOT NULL,
    title          TEXT NOT NULL,
    skill_id       UUID REFERENCES skills(id) ON DELETE SET NULL,
    resource_id    UUID REFERENCES resources(id) ON DELETE SET NULL,
    project_brief  TEXT,
    estimated_days SMALLINT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (path_id, order_index)
);

-- ── Users & progress ──────────────────────────────────────────────

CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_profiles (
    user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    goal_id            UUID NOT NULL REFERENCES goals(id),
    skill_level_id     UUID NOT NULL REFERENCES skill_levels(id),
    weekly_hours       SMALLINT CHECK (weekly_hours BETWEEN 1 AND 80),
    preferred_language TEXT NOT NULL DEFAULT 'ru',
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE step_status AS ENUM (
    'not_started', 'in_progress', 'done', 'skipped'
);

CREATE TABLE user_step_progress (
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_id      UUID NOT NULL REFERENCES learning_path_steps(id) ON DELETE CASCADE,
    status       step_status NOT NULL DEFAULT 'not_started',
    completed_at TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, step_id)
);

-- ── Indexes ───────────────────────────────────────────────────────

CREATE INDEX idx_learning_paths_goal_level ON learning_paths (goal_id, skill_level_id);
CREATE INDEX idx_path_steps_path_order     ON learning_path_steps (path_id, order_index);
CREATE INDEX idx_resources_type            ON resources (resource_type);
CREATE INDEX idx_user_progress_user        ON user_step_progress (user_id);
