-- Stages 1–2: Skill assessment, user_skills, curriculum modules

CREATE TYPE assessment_item_type AS ENUM (
    'multiple_choice',
    'sql_result',
    'short_text'
);

CREATE TYPE skill_score_source AS ENUM (
    'assessment',
    'mission',
    'project',
    'manual'
);

CREATE TYPE module_intensity AS ENUM (
    'skip',
    'light',
    'practice',
    'intensive'
);

-- ── Assessments ────────────────────────────────────────────────────

CREATE TABLE assessments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profession_id  UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
    slug           TEXT NOT NULL UNIQUE,
    title          TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    estimated_minutes SMALLINT NOT NULL DEFAULT 20,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assessment_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    skill_id        UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    order_index     INT  NOT NULL,
    item_type       assessment_item_type NOT NULL DEFAULT 'multiple_choice',
    prompt          TEXT NOT NULL,
    options         JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index   INT,
    correct_answer  TEXT,
    explanation     TEXT NOT NULL DEFAULT '',
    weight          NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    dataset_sql     TEXT,
    expected_result JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assessment_id, order_index)
);

CREATE TABLE user_assessment_attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'submitted', 'scored')),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at    TIMESTAMPTZ,
    skill_scores    JSONB NOT NULL DEFAULT '{}'::jsonb,
    overall_score   NUMERIC(5,2)
);

CREATE TABLE user_assessment_answers (
    attempt_id      UUID NOT NULL REFERENCES user_assessment_attempts(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
    selected_index  INT,
    answer_text     TEXT,
    is_correct      BOOLEAN,
    answered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (attempt_id, item_id)
);

-- ── User skill graph ───────────────────────────────────────────────

CREATE TABLE user_skills (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    score       NUMERIC(5,2) NOT NULL DEFAULT 0
                    CHECK (score >= 0 AND score <= 100),
    confidence  NUMERIC(5,2) NOT NULL DEFAULT 0.5
                    CHECK (confidence >= 0 AND confidence <= 1),
    source      skill_score_source NOT NULL DEFAULT 'assessment',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE user_skill_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    delta       NUMERIC(5,2),
    detail      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_skill_events_user ON user_skill_events (user_id, created_at DESC);

-- ── Authored curriculum modules (gap-based roadmap) ────────────────

CREATE TABLE curriculum_modules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profession_id   UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
    skill_id        UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL DEFAULT '',
    order_index     INT  NOT NULL,
    -- If user score >= skip_below, module can be skipped
    skip_threshold  NUMERIC(5,2) NOT NULL DEFAULT 75,
    -- If score < intensive_below, mark intensive
    intensive_threshold NUMERIC(5,2) NOT NULL DEFAULT 40,
    estimated_minutes INT NOT NULL DEFAULT 30,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES curriculum_modules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS intensity module_intensity;

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS readiness_score NUMERIC(5,2);

-- ── Seed: DA assessment ────────────────────────────────────────────

INSERT INTO assessments (id, profession_id, slug, title, description, estimated_minutes)
SELECT 'c1000001-0000-4000-8000-000000000001'::uuid, p.id,
       'da_baseline',
       'Data Analyst — проверка навыков',
       'Короткий тест: SQL, Excel, статистика, визуализация и бизнес-мышление. ~20 минут.',
       20
FROM professions p
WHERE p.slug = 'data_analyst'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO assessment_items (
    assessment_id, skill_id, order_index, item_type, prompt, options, correct_index, explanation
)
SELECT a.id, s.id, v.ord, 'multiple_choice'::assessment_item_type, v.prompt,
       v.options::jsonb, v.correct, v.explanation
FROM (
    VALUES
    -- SQL (1-4)
    (1, 'sql',
     'Какой запрос вернёт все строки из таблицы orders?',
     '["SELECT * FROM orders","GET * FROM orders","FIND orders","SHOW orders ALL"]',
     0,
     'SELECT * FROM table — базовый способ прочитать все столбцы.'),
    (2, 'sql',
     'Чем LEFT JOIN отличается от INNER JOIN?',
     '["LEFT оставляет все строки левой таблицы даже без совпадений","LEFT быстрее INNER","LEFT удаляет дубликаты","Разницы нет"]',
     0,
     'LEFT JOIN сохраняет все строки слева; INNER — только совпадения.'),
    (3, 'sql',
     'Что делает GROUP BY region вместе с SUM(revenue)?',
     '["Считает сумму revenue по каждому region","Сортирует region","Удаляет region","Объединяет таблицы"]',
     0,
     'GROUP BY агрегирует строки с одинаковым ключом.'),
    (4, 'sql',
     'В каком случае фильтр в WHERE после LEFT JOIN «ломает» LEFT?',
     '["Когда условие на правой таблице отбрасывает NULL-совпадения","Когда есть ORDER BY","Когда SELECT *","Когда LIMIT 10"]',
     0,
     'Фильтр правой таблицы в WHERE превращает LEFT в INNER; переносите его в ON.'),
    -- Excel (5-7)
    (5, 'excel',
     'Для чего обычно используют Pivot Table?',
     '["Быстро сгруппировать и агрегировать данные","Рисовать 3D-графики","Писать макросы","Хранить пароли"]',
     0,
     'Сводные таблицы — главный инструмент exploratory analysis в Excel.'),
    (6, 'excel',
     'Какая функция лучше подходит для поиска значения по ключу в современной Excel?',
     '["XLOOKUP","CONCAT","RAND","TODAY"]',
     0,
     'XLOOKUP (или VLOOKUP) ищет значение по ключу в другой таблице.'),
    (7, 'excel',
     'Зачем превращать диапазон в Excel Table (Ctrl+T)?',
     '["Структурированные ссылки и авторасширение","Только ради цвета","Чтобы удалить формулы","Это обязательно для CSV"]',
     0,
     'Таблицы дают стабильные ссылки и растут вместе с данными.'),
    -- Statistics (8-10)
    (8, 'statistics',
     'Когда медиану предпочтительнее среднего?',
     '["Когда есть сильные выбросы","Когда все значения одинаковы","Только для текста","Никогда"]',
     0,
     'Медиана устойчива к outliers; среднее — нет.'),
    (9, 'statistics',
     'Корреляция 0.9 между рекламой и продажами означает:',
     '["Сильную линейную связь, но не обязательно причинность","Что реклама точно вызывает продажи","Что данных мало","Ошибку измерения"]',
     0,
     'Correlation ≠ causation.'),
    (10, 'statistics',
     'Выручка выросла на 100% (с 10 до 20). Что важно указать?',
     '["Базу сравнения и абсолютные значения","Только процент","Только график","Ничего"]',
     0,
     'Проценты без базы вводят в заблуждение.'),
    -- Visualization (11-12)
    (11, 'visualization',
     'Какой график лучше для сравнения категорий?',
     '["Столбчатый (bar)","Круговая с 12 сегментами","3D pie","Радар без подписей"]',
     0,
     'Bar charts читаются быстрее pie при многих категориях.'),
    (12, 'visualization',
     'Почему ось Y для bar chart обычно начинают с 0?',
     '["Иначе различия величины искажаются","Так требует SQL","Только для красоты","Не нужно"]',
     0,
     'Обрезанная ось преувеличивает разницу.'),
    -- Business (13-14)
    (13, 'business-thinking',
     'KPI выручки упал на 12%. Какой первый шаг аналитика?',
     '["Разложить метрику на драйверы (объём, цена, сегменты)","Сразу винить маркетинг","Удалить данные","Пересчитать в Excel дважды без вопроса"]',
     0,
     'Сначала декомпозиция и гипотезы с доказательствами.'),
    (14, 'business-thinking',
     'Хорошая рекомендация в отчёте содержит:',
     '["Действие, владельца и ожидаемый эффект","Только красивый график","Только SQL-запрос","Список всех столбцов"]',
     0,
     'Анализ должен вести к решению.'),
    -- Python (15)
    (15, 'python-data',
     'В pandas как отфильтровать строки, где revenue > 100?',
     '["df[df.revenue > 100]","df.filter(revenue > 100)","SELECT * FROM df WHERE revenue > 100","df.where.revenue"]',
     0,
     'Булева маска — основной способ фильтрации DataFrame.')
) AS v(ord, skill_slug, prompt, options, correct, explanation)
JOIN assessments a ON a.slug = 'da_baseline'
JOIN skills s ON s.slug = v.skill_slug
ON CONFLICT (assessment_id, order_index) DO NOTHING;

-- ── Seed: DA curriculum modules ────────────────────────────────────

INSERT INTO curriculum_modules (
    profession_id, skill_id, slug, title, summary, order_index,
    skip_threshold, intensive_threshold, estimated_minutes
)
SELECT p.id, s.id, v.slug, v.title, v.summary, v.ord, v.skip_t, v.int_t, v.mins
FROM professions p
CROSS JOIN (VALUES
    ('sql-select', 'sql', 'SQL: выборка и фильтры', 'SELECT, WHERE, ORDER BY, LIMIT', 1, 80, 35, 30),
    ('sql-joins', 'sql', 'SQL: JOIN', 'INNER vs LEFT, ключи и типичные ошибки', 2, 75, 40, 30),
    ('sql-agg', 'sql', 'SQL: агрегации', 'GROUP BY, HAVING, COUNT/SUM/AVG', 3, 75, 40, 30),
    ('excel-basics', 'excel', 'Excel: таблицы и формулы', 'Tables, XLOOKUP, SUMIF', 4, 80, 40, 25),
    ('excel-pivot', 'excel', 'Excel: Pivot Tables', 'Срезы, агрегации, refresh', 5, 75, 40, 25),
    ('stats-desc', 'statistics', 'Статистика: описательные меры', 'Mean, median, spread', 6, 75, 40, 25),
    ('stats-corr', 'statistics', 'Статистика: связь и проценты', 'Correlation, baselines, pitfalls', 7, 70, 35, 25),
    ('viz-charts', 'visualization', 'Визуализация: выбор графика', 'Bar, line, scatter, hygiene', 8, 75, 40, 25),
    ('python-df', 'python-data', 'Python: DataFrame', 'Чтение, фильтры, describe', 9, 70, 35, 30),
    ('biz-metrics', 'business-thinking', 'Бизнес: метрики и рекомендации', 'Вопрос → анализ → действие', 10, 70, 35, 25),
    ('capstone-revenue', 'business-thinking', 'Проект: E-commerce Revenue Analysis', 'Найти причины падения выручки на 12%', 11, 101, 0, 90)
) AS v(slug, skill_slug, title, summary, ord, skip_t, int_t, mins)
JOIN skills s ON s.slug = v.skill_slug
WHERE p.slug = 'data_analyst'
ON CONFLICT (slug) DO NOTHING;
