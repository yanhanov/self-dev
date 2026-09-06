-- Stage 6: Portfolio projects + readiness tracking

CREATE TYPE project_status AS ENUM (
    'locked',
    'available',
    'submitted',
    'scored'
);

CREATE TABLE portfolio_projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profession_id   UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
    challenge_id    UUID REFERENCES practice_challenges(id) ON DELETE SET NULL,
    module_id       UUID REFERENCES curriculum_modules(id) ON DELETE SET NULL,
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    brief_markdown  TEXT NOT NULL,
    rubric_markdown TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id      UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    status          project_status NOT NULL DEFAULT 'locked',
    sql_submission  TEXT,
    reasoning_text  TEXT,
    sql_score       NUMERIC(5,2),
    reasoning_score NUMERIC(5,2),
    overall_score   NUMERIC(5,2),
    ai_feedback     TEXT NOT NULL DEFAULT '',
    skills_earned   JSONB NOT NULL DEFAULT '[]'::jsonb,
    submitted_at    TIMESTAMPTZ,
    scored_at       TIMESTAMPTZ,
    UNIQUE (user_id, project_id)
);

CREATE TABLE readiness_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall         NUMERIC(5,2) NOT NULL,
    technical       NUMERIC(5,2) NOT NULL DEFAULT 0,
    projects        NUMERIC(5,2) NOT NULL DEFAULT 0,
    consistency     NUMERIC(5,2) NOT NULL DEFAULT 0,
    gaps            JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_readiness_user ON readiness_snapshots (user_id, created_at DESC);

INSERT INTO portfolio_projects (
    id, profession_id, challenge_id, module_id, slug, title, brief_markdown, rubric_markdown
)
SELECT
    'e1000001-0000-4000-8000-000000000001'::uuid,
    p.id,
    c.id,
    m.id,
    'ecommerce-revenue-analysis',
    'E-commerce Revenue Analysis',
    E'## Задача\n\nВыручка компании **упала на 12%**. Найдите причины и подготовьте рекомендации.\n\n### Данные\n\nТаблицы `customers`, `orders`, `order_items` (мини-набор e-commerce).\n\n### Что сделать\n\n1. Посчитайте выручку по продуктам только для **paid** заказов.\n2. Кратко (5–8 предложений) опишите:\n   - что вы видите в данных;\n   - 2–3 возможные причины просадки;\n   - 1–2 конкретные рекомендации.\n\n### Результат для портфолио\n\n- SQL-запрос с корректной агрегацией\n- Письменный business reasoning',
    E'## Rubric\n\n- SQL correctness (0–60): joins, paid filter, aggregation, sort\n- Business reasoning (0–40): decomposition, evidence, actionable recommendations'
FROM professions p
LEFT JOIN practice_challenges c ON c.slug = 'sql-capstone-product-revenue'
LEFT JOIN curriculum_modules m ON m.slug = 'capstone-revenue'
WHERE p.slug = 'data_analyst'
ON CONFLICT (slug) DO NOTHING;
