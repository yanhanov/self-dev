-- Stage 0: Data Analyst profession, skills, neutral levels, knowledge base

-- ── Profession ─────────────────────────────────────────────────────

INSERT INTO professions (slug, title, description) VALUES
    (
        'data_analyst',
        'Data Analyst',
        'SQL, Excel, статистика, визуализация и бизнес-мышление для карьерного перехода в аналитику данных'
    )
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- ── Neutral skill levels (profession-agnostic wording) ─────────────

UPDATE skill_levels SET
    title = 'Полный новичок',
    description = 'Почти нет опыта в этой области — начинаем с основ'
WHERE slug = 'complete_beginner';

UPDATE skill_levels SET
    title = 'Немного опыта',
    description = 'Знакомы с базовыми понятиями, делали простые задачи'
WHERE slug = 'some_experience';

UPDATE skill_levels SET
    title = 'Средний уровень',
    description = 'Уверенно решаете типовые задачи, хотите закрыть пробелы'
WHERE slug = 'intermediate';

UPDATE skill_levels SET
    title = 'Продвинутый',
    description = 'Сильная база — углубляем слабые зоны и готовим к работе'
WHERE slug = 'advanced';

-- ── Data Analyst skills ────────────────────────────────────────────

INSERT INTO skills (slug, title, category) VALUES
    ('sql',               'SQL',               'data'),
    ('excel',             'Excel',             'data'),
    ('statistics',        'Statistics',        'data'),
    ('python-data',       'Python',            'data'),
    ('visualization',     'Visualization',     'data'),
    ('business-thinking', 'Business Thinking', 'career')
ON CONFLICT (slug) DO NOTHING;

-- Link skills to profession via profession_skills
CREATE TABLE IF NOT EXISTS profession_skills (
    profession_id UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
    skill_id      UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    order_index   INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (profession_id, skill_id)
);

INSERT INTO profession_skills (profession_id, skill_id, order_index)
SELECT p.id, s.id, v.ord
FROM professions p
CROSS JOIN (VALUES
    ('sql', 1),
    ('excel', 2),
    ('statistics', 3),
    ('python-data', 4),
    ('visualization', 5),
    ('business-thinking', 6)
) AS v(slug, ord)
JOIN skills s ON s.slug = v.slug
WHERE p.slug = 'data_analyst'
ON CONFLICT DO NOTHING;

-- ── Knowledge sources for DA ───────────────────────────────────────

INSERT INTO knowledge_sources (slug, name, base_url, description) VALUES
    ('mode_sql', 'Mode SQL Tutorial', 'https://mode.com/sql-tutorial', 'Practical SQL for analysts'),
    ('sqlite_docs', 'SQLite Docs', 'https://www.sqlite.org/lang.html', 'SQL language reference'),
    ('pandas_docs', 'Pandas Docs', 'https://pandas.pydata.org/docs', 'Python data analysis library'),
    ('statquest', 'Statistics Fundamentals', 'https://www.statology.org', 'Intro statistics for analysts'),
    ('plotly', 'Plotly Docs', 'https://plotly.com/python', 'Data visualization'),
    ('excel_guide', 'Excel for Analysts', 'https://support.microsoft.com/excel', 'Spreadsheets for analysis')
ON CONFLICT (slug) DO NOTHING;

-- ── DA knowledge documents & chunks ────────────────────────────────

-- SQL SELECT / WHERE
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000001'::uuid, s.id, p.id,
       'SQL: SELECT, WHERE, ORDER BY',
       'https://mode.com/sql-tutorial/sql-select',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mode_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000001', 1, 'SELECT basics',
 'SELECT retrieves columns from a table. Use SELECT column1, column2 FROM table_name. SELECT * returns all columns but is discouraged in production queries. Alias columns with AS for clearer result headers. Always name only the columns you need.'),
('b1000001-0000-4000-8000-000000000001', 2, 'WHERE filters',
 'WHERE filters rows before aggregation. Compare with =, !=, <, >, <=, >=. Combine conditions with AND / OR. Use IN for lists, BETWEEN for ranges, LIKE for patterns, IS NULL / IS NOT NULL for missing values. String literals use single quotes.'),
('b1000001-0000-4000-8000-000000000001', 3, 'ORDER BY and LIMIT',
 'ORDER BY sorts results ascending (ASC, default) or descending (DESC). Multiple columns define sort priority. LIMIT n returns the first n rows after sorting — useful for top-N analysis. OFFSET skips rows for pagination.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- SQL JOINs
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000002'::uuid, s.id, p.id,
       'SQL: JOINs',
       'https://mode.com/sql-tutorial/sql-joins',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mode_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000002', 1, 'INNER JOIN',
 'INNER JOIN returns only rows that match in both tables on the join key. Example: SELECT o.id, c.name FROM orders o INNER JOIN customers c ON o.customer_id = c.id. Prefer explicit JOIN syntax over comma-style joins.'),
('b1000001-0000-4000-8000-000000000002', 2, 'LEFT JOIN',
 'LEFT JOIN (LEFT OUTER JOIN) keeps all rows from the left table and matching rows from the right. Non-matching right columns are NULL. Use LEFT JOIN when you need every left-side entity even without a match — e.g. all customers including those with zero orders.'),
('b1000001-0000-4000-8000-000000000002', 3, 'JOIN pitfalls',
 'Common mistakes: confusing LEFT and INNER JOIN, joining on the wrong key, accidental row multiplication from one-to-many joins, and filtering right-table columns in WHERE after a LEFT JOIN (which turns it into an INNER JOIN). Put right-side filters in the ON clause when preserving left rows.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- SQL aggregation
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000003'::uuid, s.id, p.id,
       'SQL: GROUP BY and aggregates',
       'https://mode.com/sql-tutorial/sql-group-by',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mode_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000003', 1, 'Aggregate functions',
 'COUNT, SUM, AVG, MIN, MAX summarize groups of rows. COUNT(*) counts rows; COUNT(column) ignores NULLs. Aggregates without GROUP BY return one row for the whole table.'),
('b1000001-0000-4000-8000-000000000003', 2, 'GROUP BY',
 'GROUP BY collapses rows that share the same key values. Every non-aggregated SELECT column must appear in GROUP BY. HAVING filters after aggregation; WHERE filters before. Example: SELECT region, SUM(revenue) FROM sales GROUP BY region HAVING SUM(revenue) > 1000.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Excel
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000004'::uuid, s.id, p.id,
       'Excel for data analysis',
       'https://support.microsoft.com/excel',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'excel_guide' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000004', 1, 'Tables and cleaning',
 'Convert ranges to Excel Tables (Ctrl+T) for structured references and auto-expanding ranges. Clean data with TRIM, CLEAN, Text to Columns, Remove Duplicates, and Find/Replace. Keep one header row and consistent column types.'),
('b1000001-0000-4000-8000-000000000004', 2, 'Formulas analysts use',
 'VLOOKUP/XLOOKUP join tables by key. SUMIF/COUNTIF/AVERAGEIF conditional aggregates. IF and nested IF (or IFS) encode business rules. Pivot Tables summarize large sheets without writing formulas.'),
('b1000001-0000-4000-8000-000000000004', 3, 'Pivot Tables',
 'Pivot Tables group rows by dimensions and aggregate values. Drag fields to Rows, Columns, Values, and Filters. Change Value Field Settings for Sum/Count/Average. Refresh after source data changes. Pivots are often faster than manual formulas for exploration.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Statistics
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000005'::uuid, s.id, p.id,
       'Statistics for analysts',
       'https://www.statology.org',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'statquest' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000005', 1, 'Descriptive stats',
 'Mean is the average; median is the middle value and is robust to outliers; mode is the most frequent value. Variance and standard deviation measure spread. Always check distribution shape before trusting the mean alone.'),
('b1000001-0000-4000-8000-000000000005', 2, 'Correlation vs causation',
 'Correlation measures linear association between two variables (−1 to 1). Correlation does not imply causation — a third variable or coincidence may explain the link. Analysts state associations carefully and look for confounding factors.'),
('b1000001-0000-4000-8000-000000000005', 3, 'Percentages and baselines',
 'Always report the baseline when showing percent change. A 50% increase from 2 to 3 is tiny in absolute terms. Prefer absolute counts alongside percentages. Watch for small-sample noise and Simpson''s paradox when aggregating groups.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Python / pandas
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000006'::uuid, s.id, p.id,
       'Python pandas basics',
       'https://pandas.pydata.org/docs/user_guide/10min.html',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'pandas_docs' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000006', 1, 'DataFrame basics',
 'A pandas DataFrame is a labeled 2D table. Load CSV with pd.read_csv. Inspect with head(), info(), describe(). Select columns with df["col"] or df[["a","b"]]. Filter rows with boolean masks: df[df["revenue"] > 100].'),
('b1000001-0000-4000-8000-000000000006', 2, 'Groupby and merge',
 'df.groupby("region")["revenue"].sum() aggregates like SQL GROUP BY. pd.merge(left, right, on="id", how="left") joins tables. Prefer explicit how= for clarity. Handle missing values with isna(), fillna(), dropna().')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Visualization
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000007'::uuid, s.id, p.id,
       'Choosing charts',
       'https://plotly.com/python/basic-charts/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'plotly' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000007', 1, 'Chart types',
 'Bar charts compare categories. Line charts show trends over time. Scatter plots show relationships between two numeric variables. Histograms show distributions. Pie charts are rarely best — prefer bars for part-to-whole with many categories.'),
('b1000001-0000-4000-8000-000000000007', 2, 'Visualization hygiene',
 'Label axes, include units, start bar baselines at zero for magnitude comparisons, avoid dual axes that mislead, and keep color meaningful. Title should state the insight, not just the metric name.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Business thinking
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000008'::uuid, s.id, p.id,
       'Business reasoning for analysts',
       'https://mode.com/sql-tutorial',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mode_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000008', 1, 'From metric to decision',
 'Good analysis starts from a business question, not a dataset. Define the metric, the time window, the segment, and the decision the result should inform. Recommend actions with clear owners and expected impact.'),
('b1000001-0000-4000-8000-000000000008', 2, 'Root cause framing',
 'When a KPI drops, decompose it: volume vs price, new vs returning users, channel mix, seasonality. Compare to a prior period and a control segment. Present 2–3 plausible drivers with evidence, not a single speculative story.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Tag chunks with skills
INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN professions p ON p.id = d.profession_id AND p.slug = 'data_analyst'
JOIN skills s ON s.slug = CASE
    WHEN d.title ILIKE '%JOIN%' OR d.title ILIKE '%SELECT%' OR d.title ILIKE '%GROUP BY%' THEN 'sql'
    WHEN d.title ILIKE '%Excel%' THEN 'excel'
    WHEN d.title ILIKE '%Statistics%' THEN 'statistics'
    WHEN d.title ILIKE '%pandas%' OR d.title ILIKE '%Python%' THEN 'python-data'
    WHEN d.title ILIKE '%chart%' OR d.title ILIKE '%Choosing%' THEN 'visualization'
    WHEN d.title ILIKE '%Business%' THEN 'business-thinking'
    ELSE 'sql'
END
ON CONFLICT DO NOTHING;
