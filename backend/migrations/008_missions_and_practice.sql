-- Stages 3–4: Daily missions + SQL practice datasets/grader fixtures

CREATE TYPE mission_phase AS ENUM (
    'concept',
    'guided',
    'challenge',
    'feedback'
);

CREATE TYPE mission_status AS ENUM (
    'available',
    'in_progress',
    'completed',
    'skipped'
);

-- ── Practice datasets (client-side SQL execution) ───────────────────

CREATE TABLE practice_datasets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    -- SQL to create + seed tables in DuckDB/sql.js
    setup_sql    TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE practice_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id      UUID NOT NULL REFERENCES practice_datasets(id) ON DELETE CASCADE,
    skill_id        UUID REFERENCES skills(id) ON DELETE SET NULL,
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    prompt          TEXT NOT NULL,
    difficulty      SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    starter_sql     TEXT NOT NULL DEFAULT '',
    -- Canonical solution (not shown to user by default)
    solution_sql    TEXT NOT NULL,
    -- Expected result rows as JSON array of objects (order-sensitive unless sort_ignore)
    expected_result JSONB NOT NULL,
    sort_ignore     BOOLEAN NOT NULL DEFAULT false,
    hints           JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE practice_attempts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id  UUID NOT NULL REFERENCES practice_challenges(id) ON DELETE CASCADE,
    submitted_sql TEXT NOT NULL,
    result_rows   JSONB,
    is_correct    BOOLEAN NOT NULL DEFAULT false,
    feedback      TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_practice_attempts_user ON practice_attempts (user_id, created_at DESC);

-- ── Missions ───────────────────────────────────────────────────────

CREATE TABLE missions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profession_id       UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    module_id           UUID REFERENCES curriculum_modules(id) ON DELETE SET NULL,
    challenge_id        UUID REFERENCES practice_challenges(id) ON DELETE SET NULL,
    slug                TEXT NOT NULL UNIQUE,
    title               TEXT NOT NULL,
    goal                TEXT NOT NULL DEFAULT '',
    estimated_minutes   SMALLINT NOT NULL DEFAULT 30,
    concept_markdown    TEXT NOT NULL DEFAULT '',
    guided_markdown     TEXT NOT NULL DEFAULT '',
    order_index         INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_missions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_id      UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    plan_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    status          mission_status NOT NULL DEFAULT 'available',
    current_phase   mission_phase NOT NULL DEFAULT 'concept',
    challenge_passed BOOLEAN NOT NULL DEFAULT false,
    ai_feedback     TEXT NOT NULL DEFAULT '',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    UNIQUE (user_id, mission_id, plan_date)
);

ALTER TABLE daily_tasks
    ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS phase mission_phase;

-- ── Seed dataset: ecommerce mini ───────────────────────────────────

INSERT INTO practice_datasets (id, slug, title, description, setup_sql) VALUES
(
    'd1000001-0000-4000-8000-000000000001'::uuid,
    'ecommerce_mini',
    'E-commerce mini',
    'Customers, orders, order_items for JOIN and aggregation practice',
    $sql$
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);
INSERT INTO customers (id, name, region) VALUES
  (1, 'Alice', 'EU'),
  (2, 'Bob', 'US'),
  (3, 'Carla', 'EU'),
  (4, 'Diego', 'APAC');
INSERT INTO orders (id, customer_id, order_date, status) VALUES
  (101, 1, '2024-01-05', 'paid'),
  (102, 1, '2024-02-10', 'paid'),
  (103, 2, '2024-01-15', 'cancelled'),
  (104, 2, '2024-03-01', 'paid'),
  (105, 3, '2024-02-20', 'paid');
INSERT INTO order_items (id, order_id, product, quantity, unit_price) VALUES
  (1, 101, 'Laptop', 1, 1200),
  (2, 101, 'Mouse', 2, 25),
  (3, 102, 'Keyboard', 1, 80),
  (4, 103, 'Laptop', 1, 1200),
  (5, 104, 'Monitor', 1, 300),
  (6, 105, 'Mouse', 3, 25),
  (7, 105, 'Laptop', 1, 1100);
$sql$
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO practice_challenges (
    id, dataset_id, skill_id, slug, title, prompt, difficulty,
    starter_sql, solution_sql, expected_result, sort_ignore, hints
)
SELECT
    'd1000001-0000-4000-8000-000000000011'::uuid,
    d.id,
    s.id,
    'sql-paid-orders',
    'Оплаченные заказы',
    'Верните id и customer_id всех заказов со status = ''paid''. Отсортируйте по id.',
    1,
    'SELECT id, customer_id FROM orders',
    'SELECT id, customer_id FROM orders WHERE status = ''paid'' ORDER BY id',
    '[{"id":101,"customer_id":1},{"id":102,"customer_id":1},{"id":104,"customer_id":2},{"id":105,"customer_id":3}]'::jsonb,
    false,
    '["Фильтруйте WHERE status = ''paid''","Добавьте ORDER BY id"]'::jsonb
FROM practice_datasets d, skills s
WHERE d.slug = 'ecommerce_mini' AND s.slug = 'sql'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO practice_challenges (
    id, dataset_id, skill_id, slug, title, prompt, difficulty,
    starter_sql, solution_sql, expected_result, sort_ignore, hints
)
SELECT
    'd1000001-0000-4000-8000-000000000012'::uuid,
    d.id,
    s.id,
    'sql-left-join-customers',
    'Клиенты и заказы (LEFT JOIN)',
    'Для каждого клиента верните name и количество заказов (включая 0). Колонки: name, order_count. Сортировка по name.',
    2,
    'SELECT c.name, COUNT(o.id) AS order_count
FROM customers c
',
    'SELECT c.name, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.name
ORDER BY c.name',
    '[{"name":"Alice","order_count":2},{"name":"Bob","order_count":2},{"name":"Carla","order_count":1},{"name":"Diego","order_count":0}]'::jsonb,
    false,
    '["Используйте LEFT JOIN, чтобы Diego остался","COUNT(o.id), не COUNT(*)","GROUP BY c.name"]'::jsonb
FROM practice_datasets d, skills s
WHERE d.slug = 'ecommerce_mini' AND s.slug = 'sql'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO practice_challenges (
    id, dataset_id, skill_id, slug, title, prompt, difficulty,
    starter_sql, solution_sql, expected_result, sort_ignore, hints
)
SELECT
    'd1000001-0000-4000-8000-000000000013'::uuid,
    d.id,
    s.id,
    'sql-revenue-by-region',
    'Выручка по регионам',
    'Посчитайте суммарную выручку (quantity * unit_price) только по paid-заказам, сгруппируйте по region. Колонки: region, revenue. Сортировка по region.',
    3,
    'SELECT c.region, SUM(oi.quantity * oi.unit_price) AS revenue
FROM customers c
',
    'SELECT c.region, SUM(oi.quantity * oi.unit_price) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id AND o.status = ''paid''
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.region
ORDER BY c.region',
    '[{"region":"EU","revenue":2555.0},{"region":"US","revenue":300.0}]'::jsonb,
    false,
    '["Берите только paid заказы","JOIN order_items","SUM(quantity * unit_price)"]'::jsonb
FROM practice_datasets d, skills s
WHERE d.slug = 'ecommerce_mini' AND s.slug = 'sql'
ON CONFLICT (slug) DO NOTHING;

-- Capstone challenge (portfolio)
INSERT INTO practice_challenges (
    id, dataset_id, skill_id, slug, title, prompt, difficulty,
    starter_sql, solution_sql, expected_result, sort_ignore, hints
)
SELECT
    'd1000001-0000-4000-8000-000000000014'::uuid,
    d.id,
    s.id,
    'sql-capstone-product-revenue',
    'Выручка по продуктам (paid)',
    'Для портфолио-проекта: суммарная выручка по product только для paid заказов. Колонки: product, revenue. Сортировка по revenue DESC.',
    3,
    'SELECT oi.product, SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
',
    'SELECT oi.product, SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id AND o.status = ''paid''
GROUP BY oi.product
ORDER BY revenue DESC',
    '[{"product":"Laptop","revenue":2300.0},{"product":"Monitor","revenue":300.0},{"product":"Mouse","revenue":125.0},{"product":"Keyboard","revenue":80.0}]'::jsonb,
    false,
    '["Исключите cancelled через JOIN на orders","ORDER BY revenue DESC"]'::jsonb
FROM practice_datasets d, skills s
WHERE d.slug = 'ecommerce_mini' AND s.slug = 'sql'
ON CONFLICT (slug) DO NOTHING;

-- ── Seed missions ──────────────────────────────────────────────────

INSERT INTO missions (
    profession_id, skill_id, module_id, challenge_id, slug, title, goal,
    estimated_minutes, concept_markdown, guided_markdown, order_index
)
SELECT p.id, s.id, m.id, c.id, v.slug, v.title, v.goal, v.mins, v.concept, v.guided, v.ord
FROM (
    VALUES
    (
        'mission-sql-select', 'sql', 'sql-select', 'sql-paid-orders',
        'Научиться фильтровать строки в SQL',
        'Выбрать оплаченные заказы за ~30 минут',
        30, 1,
        E'## SELECT и WHERE\n\n`SELECT` выбирает столбцы, `WHERE` — строки.\n\n```sql\nSELECT id, customer_id\nFROM orders\nWHERE status = ''paid''\nORDER BY id;\n```\n\nСравнивайте строки в одинарных кавычках. `ORDER BY` задаёт порядок.',
        E'## Guided practice\n\n1. Откройте таблицу `orders`.\n2. Добавьте `WHERE status = ''paid''`.\n3. Отсортируйте по `id`.\n\nПроверьте, что cancelled-заказ 103 не попал в результат.'
    ),
    (
        'mission-sql-joins', 'sql', 'sql-joins', 'sql-left-join-customers',
        'Научиться использовать LEFT JOIN',
        'Посчитать заказы по клиентам, включая нули',
        30, 2,
        E'## INNER vs LEFT JOIN\n\n**INNER JOIN** — только совпадения.\n**LEFT JOIN** — все строки слева + совпадения справа (иначе NULL).\n\nТипичная ошибка: фильтровать правую таблицу в `WHERE` после LEFT JOIN — это превращает его в INNER.',
        E'## Guided practice\n\nСвяжите `customers` и `orders` через `LEFT JOIN`.\nИспользуйте `COUNT(o.id)` и `GROUP BY c.name`.\nDiego должен получить 0 заказов.'
    ),
    (
        'mission-sql-agg', 'sql', 'sql-agg', 'sql-revenue-by-region',
        'Научиться считать выручку с GROUP BY',
        'Агрегировать revenue по region',
        30, 3,
        E'## GROUP BY\n\nАгрегаты (`SUM`, `COUNT`, `AVG`) сворачивают группы строк.\nВсе неагрегированные столбцы в SELECT должны быть в `GROUP BY`.\n`HAVING` фильтрует уже после агрегации.',
        E'## Guided practice\n\nСоедините customers → orders (paid) → order_items.\nПосчитайте `SUM(quantity * unit_price)` по `region`.'
    )
) AS v(slug, skill_slug, module_slug, challenge_slug, title, goal, mins, ord, concept, guided)
JOIN professions p ON p.slug = 'data_analyst'
JOIN skills s ON s.slug = v.skill_slug
LEFT JOIN curriculum_modules m ON m.slug = v.module_slug
LEFT JOIN practice_challenges c ON c.slug = v.challenge_slug
ON CONFLICT (slug) DO NOTHING;
