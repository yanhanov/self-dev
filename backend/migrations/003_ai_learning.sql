-- AI personalized learning: professions, courses, lessons, quiz, daily plans

CREATE TYPE generation_status AS ENUM (
    'pending', 'generating', 'ready', 'failed'
);

CREATE TYPE lesson_status AS ENUM (
    'locked', 'ready', 'generating', 'in_progress', 'completed'
);

CREATE TYPE block_type AS ENUM (
    'theory', 'practice'
);

CREATE TYPE task_status AS ENUM (
    'todo', 'done', 'skipped'
);

CREATE TYPE job_type AS ENUM (
    'course_outline', 'lesson', 'daily_plan'
);

CREATE TYPE job_status AS ENUM (
    'queued', 'running', 'done', 'failed'
);

-- ── Professions (replaces goals for new flows) ─────────────────────

CREATE TABLE professions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO professions (slug, title, description) VALUES
    ('frontend', 'Frontend Developer', 'HTML, CSS, JavaScript, React и современные веб-интерфейсы'),
    ('ui_ux_design', 'UI/UX Designer', 'Исследование пользователей, wireframes, UI-системы и прототипы');

-- ── Rebuild user_profiles around professions ───────────────────────

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_goal_id_fkey;

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS profession_id UUID REFERENCES professions(id),
    ADD COLUMN IF NOT EXISTS generation_status generation_status NOT NULL DEFAULT 'pending';

-- Keep goal_id nullable for legacy rows
ALTER TABLE user_profiles ALTER COLUMN goal_id DROP NOT NULL;

-- ── Personal courses ───────────────────────────────────────────────

CREATE TABLE courses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profession_id  UUID NOT NULL REFERENCES professions(id),
    skill_level_id UUID NOT NULL REFERENCES skill_levels(id),
    title          TEXT NOT NULL,
    summary        TEXT NOT NULL DEFAULT '',
    total_lessons  INT  NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

CREATE TABLE lessons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    order_index INT  NOT NULL,
    title       TEXT NOT NULL,
    summary     TEXT NOT NULL DEFAULT '',
    status      lesson_status NOT NULL DEFAULT 'locked',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_id, order_index)
);

CREATE TABLE lesson_blocks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id        UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    block_type       block_type NOT NULL,
    content_markdown TEXT NOT NULL DEFAULT '',
    order_index      INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id     UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    order_index   INT  NOT NULL DEFAULT 0,
    question      TEXT NOT NULL,
    options       JSONB NOT NULL,
    correct_index INT  NOT NULL,
    explanation   TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_quiz_answers (
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id  UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_index INT NOT NULL,
    is_correct   BOOLEAN NOT NULL,
    answered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, question_id)
);

-- ── Daily plans ────────────────────────────────────────────────────

CREATE TABLE daily_plans (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    summary    TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, plan_date)
);

CREATE TABLE daily_tasks (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_plan_id     UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
    order_index       INT  NOT NULL DEFAULT 0,
    title             TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    estimated_minutes SMALLINT,
    status            task_status NOT NULL DEFAULT 'todo',
    lesson_id         UUID REFERENCES lessons(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Generation jobs ────────────────────────────────────────────────

CREATE TABLE generation_jobs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_type   job_type NOT NULL,
    status     job_status NOT NULL DEFAULT 'queued',
    payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
    result     JSONB,
    error      TEXT,
    lesson_id  UUID REFERENCES lessons(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_user ON courses (user_id);
CREATE INDEX idx_lessons_course_order ON lessons (course_id, order_index);
CREATE INDEX idx_lesson_blocks_lesson ON lesson_blocks (lesson_id);
CREATE INDEX idx_quiz_questions_lesson ON quiz_questions (lesson_id);
CREATE INDEX idx_daily_plans_user_date ON daily_plans (user_id, plan_date);
CREATE INDEX idx_generation_jobs_user ON generation_jobs (user_id, status);
