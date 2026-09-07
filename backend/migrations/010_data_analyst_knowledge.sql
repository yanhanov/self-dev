-- Expanded Data Analyst knowledge base (unique IDs — avoid clash with 005 UX b1000001-* )

-- ── Additional trusted sources ─────────────────────────────────────

INSERT INTO knowledge_sources (slug, name, base_url, description) VALUES
    ('postgresql_tutorial', 'PostgreSQL Tutorial', 'https://www.postgresql.org/docs/current/tutorial.html', 'Official PostgreSQL SQL tutorial'),
    ('w3_sql', 'W3Schools SQL', 'https://www.w3schools.com/sql', 'Accessible SQL reference for beginners'),
    ('real_python', 'Real Python', 'https://realpython.com', 'Practical Python for data work'),
    ('ms_learn_excel', 'Microsoft Learn Excel', 'https://learn.microsoft.com/excel', 'Official Excel learning paths'),
    ('storytelling_data', 'Storytelling with Data', 'https://www.storytellingwithdata.com', 'Chart choice and communication'),
    ('khan_stats', 'Khan Academy Statistics', 'https://www.khanacademy.org/math/statistics-probability', 'Foundational statistics'),
    ('google_analytics', 'Analytics literacy', 'https://support.google.com/analytics', 'Metrics, funnels, and measurement')
ON CONFLICT (slug) DO NOTHING;

-- Helper: profession id
-- Documents use d2000001-* namespace

-- ═══════════════════════════════════════════════════════════════════
-- SQL — SELECT depth
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000001'::uuid, s.id, p.id,
       'SQL SELECT deep dive',
       'https://mode.com/sql-tutorial/sql-select-statement',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mode_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000001', 1, 'Column projection',
 'Project only needed columns: SELECT order_id, amount FROM orders. Aliases improve readability: SELECT amount AS revenue. DISTINCT removes duplicate rows after projection. Column order in SELECT defines result column order.'),
('d2000001-0000-4000-8000-000000000001', 2, 'Expressions in SELECT',
 'SELECT can compute expressions: quantity * unit_price AS line_total, UPPER(name), COALESCE(discount, 0). Use ROUND for currency display. Keep heavy logic readable with aliases.'),
('d2000001-0000-4000-8000-000000000001', 3, 'NULL behavior',
 'NULL means unknown, not zero. Comparisons with NULL yield unknown (not true), so use IS NULL / IS NOT NULL. Aggregates ignore NULL except COUNT(*). COALESCE(a, b) returns the first non-null value.'),
('d2000001-0000-4000-8000-000000000001', 4, 'CASE expressions',
 'CASE WHEN status = ''paid'' THEN amount ELSE 0 END builds conditional metrics in SQL. Searched CASE and simple CASE both work. Prefer CASE over fragile nested IFs for analyst reporting.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- SQL WHERE / filtering
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000002'::uuid, s.id, p.id,
       'SQL filtering patterns',
       'https://www.w3schools.com/sql/sql_where.asp',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'w3_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000002', 1, 'Predicate logic',
 'Combine filters with AND (stricter) and OR (broader). Use parentheses: WHERE (region = ''EU'' OR region = ''US'') AND status = ''paid''. NOT negates a condition. Prefer positive filters when clearer.'),
('d2000001-0000-4000-8000-000000000002', 2, 'IN BETWEEN LIKE',
 'IN (''a'',''b'') matches a set. BETWEEN x AND y is inclusive on both ends for numbers and dates. LIKE ''A%'' matches prefix; ''%shop%'' contains; underscore matches one character. Escape wildcards when searching literal %.'),
('d2000001-0000-4000-8000-000000000002', 3, 'Date filters',
 'Filter dates with comparisons or date functions. Prefer explicit ranges: order_date >= ''2024-01-01'' AND order_date < ''2024-02-01'' for a month. Avoid wrapping indexed columns in functions when possible.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- SQL JOINs advanced
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000003'::uuid, s.id, p.id,
       'SQL JOIN mastery for analysts',
       'https://mode.com/sql-tutorial/sql-joins',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mode_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000003', 1, 'Join keys',
 'Join on stable identifiers (customer_id, order_id), not display names. Always alias tables (o, c, oi). Qualify columns as o.id to avoid ambiguity. Document grain: one order has many items.'),
('d2000001-0000-4000-8000-000000000003', 2, 'INNER vs LEFT decision',
 'Use INNER JOIN when you only care about matches (paid orders with customers). Use LEFT JOIN from the entity you must keep (all customers, including those with zero orders). RIGHT JOIN is rarely needed — swap table order and use LEFT.'),
('d2000001-0000-4000-8000-000000000003', 3, 'Fan-out multiplication',
 'Joining orders to order_items multiplies order-level rows. Summing order.total after that join double-counts. Aggregate at the correct grain first, or sum item-level amounts only.'),
('d2000001-0000-4000-8000-000000000003', 4, 'LEFT JOIN filter trap',
 'After LEFT JOIN, putting right-table filters in WHERE drops non-matches (NULL fails the predicate) and effectively becomes INNER JOIN. Put right-side filters in ON, or filter after wrapping in a subquery.'),
('d2000001-0000-4000-8000-000000000003', 5, 'Multi-table joins',
 'Chain joins: customers → orders → order_items. Keep paid filters near orders. Example: FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = ''paid'' JOIN order_items oi ON oi.order_id = o.id.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- SQL GROUP BY / window intro
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000004'::uuid, s.id, p.id,
       'SQL aggregation and HAVING',
       'https://www.postgresql.org/docs/current/tutorial-agg.html',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'postgresql_tutorial' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000004', 1, 'GROUP BY rules',
 'Every non-aggregated column in SELECT must appear in GROUP BY. Group by dimension keys (region, product, month). Multiple keys create finer grains: GROUP BY region, product.'),
('d2000001-0000-4000-8000-000000000004', 2, 'WHERE vs HAVING',
 'WHERE filters rows before grouping. HAVING filters groups after aggregation: HAVING SUM(revenue) > 1000. Do not put aggregate conditions in WHERE.'),
('d2000001-0000-4000-8000-000000000004', 3, 'COUNT nuances',
 'COUNT(*) counts rows including nulls in other columns. COUNT(column) ignores NULLs for that column. COUNT(DISTINCT customer_id) counts unique customers — common for active-user metrics.'),
('d2000001-0000-4000-8000-000000000004', 4, 'Revenue patterns',
 'Typical paid revenue: SUM(quantity * unit_price) with JOIN to paid orders. Always state currency and period. Compare cohorts with GROUP BY period using date_trunc or strftime depending on engine.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000005'::uuid, s.id, p.id,
       'SQL subqueries and CTEs',
       'https://mode.com/sql-tutorial/sql-sub-queries',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mode_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000005', 1, 'Subqueries',
 'A subquery is a query inside another. In WHERE: customer_id IN (SELECT id FROM vip). In FROM: treat a subquery as a derived table with an alias. Scalar subqueries return one value.'),
('d2000001-0000-4000-8000-000000000005', 2, 'CTEs WITH',
 'WITH monthly AS (SELECT ... GROUP BY month) SELECT * FROM monthly WHERE revenue > 0 makes multi-step analysis readable. CTEs improve clarity for analyst workflows versus deeply nested subqueries.'),
('d2000001-0000-4000-8000-000000000005', 3, 'Window functions intro',
 'Window functions like ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) compute per-row analytics without collapsing groups. SUM(amount) OVER (PARTITION BY region) adds running or partitioned totals. Use after mastering GROUP BY.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Excel
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000006'::uuid, s.id, p.id,
       'Excel data cleanup for analysts',
       'https://learn.microsoft.com/en-us/excel/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'ms_learn_excel' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000006', 1, 'Tabular hygiene',
 'One header row, no merged cells in the data range, consistent types per column, no blank rows inside the table. Convert to Table (Ctrl/Cmd+T) so formulas and pivots expand automatically.'),
('d2000001-0000-4000-8000-000000000006', 2, 'Cleaning functions',
 'TRIM removes extra spaces, CLEAN removes non-printable characters, VALUE / DATEVALUE coerce text numbers and dates. Text to Columns splits delimited fields. Remove Duplicates only after confirming the unique key.'),
('d2000001-0000-4000-8000-000000000006', 3, 'Data validation',
 'Use filters to spot blanks and outliers. Conditional formatting highlights negatives or duplicates. Keep a raw sheet immutable and clean on a working copy.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000007'::uuid, s.id, p.id,
       'Excel lookups and conditional math',
       'https://support.microsoft.com/en-us/office/xlookup-function',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'excel_guide' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000007', 1, 'XLOOKUP',
 'XLOOKUP(lookup_value, lookup_array, return_array) finds a related field by key and works left or right. Prefer XLOOKUP over VLOOKUP when available. Handle not-found with if_not_found argument.'),
('d2000001-0000-4000-8000-000000000007', 2, 'SUMIF family',
 'SUMIF(range, criteria, sum_range) and SUMIFS with multiple criteria aggregate conditionally — Excel''s cousin to SQL SUM + WHERE. COUNTIF/COUNTIFS count matches. AVERAGEIF averages matching rows.'),
('d2000001-0000-4000-8000-000000000007', 3, 'IF and IFS',
 'IF(condition, true_value, false_value) encodes business rules. IFS handles multiple branches cleanly. Avoid deeply nested IF when a lookup table would be clearer.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000008'::uuid, s.id, p.id,
       'Excel Pivot Tables for exploration',
       'https://support.microsoft.com/en-us/office/create-a-pivottable',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'excel_guide' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000008', 1, 'Pivot layout',
 'Rows = dimensions, Values = aggregates, Filters/Slicers = interactive cuts, Columns = secondary dimensions (use sparingly). Start with one question: revenue by region, then add product.'),
('d2000001-0000-4000-8000-000000000008', 2, 'Value settings',
 'Change Value Field Settings between Sum, Count, Average, % of Grand Total. Show Values As helps mix and contribution analysis. Refresh the pivot after source updates.'),
('d2000001-0000-4000-8000-000000000008', 3, 'Pivot pitfalls',
 'Blank headers break pivots. Mixed text/numbers in a value column coerce badly. Do not paste pivot values as the only source of truth without documenting refresh date and filters.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Statistics
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000009'::uuid, s.id, p.id,
       'Descriptive statistics for analysts',
       'https://www.khanacademy.org/math/statistics-probability',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'khan_stats' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000009', 1, 'Center',
 'Mean is sensitive to outliers; median is robust; mode is rare for continuous metrics. Report mean and median together when distributions are skewed (e.g. income, order value).'),
('d2000001-0000-4000-8000-000000000009', 2, 'Spread',
 'Range, IQR, variance, and standard deviation describe dispersion. High variance means averages hide heterogeneity — segment before concluding.'),
('d2000001-0000-4000-8000-000000000009', 3, 'Distributions',
 'Skewed right (long high tail) is common for revenue. Histograms and box plots reveal shape. Do not assume normality for small samples or count data.'),
('d2000001-0000-4000-8000-000000000009', 4, 'Outliers',
 'Investigate outliers before dropping them: fraud, logging bugs, true whales. Document treatment. Winsorizing or separate VIP segments often beat silent deletion.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-00000000000a'::uuid, s.id, p.id,
       'Association, experiments, and pitfalls',
       'https://www.statology.org/correlation-vs-causation/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'statquest' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-00000000000a', 1, 'Correlation',
 'Pearson correlation measures linear association from −1 to 1. Zero correlation does not mean independence for non-linear relationships. Always plot scatterplots alongside the coefficient.'),
('d2000001-0000-4000-8000-00000000000a', 2, 'Causation caution',
 'Observational data supports association, not proof of cause. Confounders, reverse causality, and selection bias mislead. Language: ''associated with'', not ''causes'', unless you have a valid experiment.'),
('d2000001-0000-4000-8000-00000000000a', 3, 'Percent change',
 'Percent change = (new − old) / old. Tiny bases inflate percentages. Always show absolute delta and the baseline period. Watch mix shifts (Simpson''s paradox) when aggregates move opposite to every segment.'),
('d2000001-0000-4000-8000-00000000000a', 4, 'Sampling',
 'Small n yields noisy rates. Prefer confidence intervals or at least sample sizes next to conversion rates. Seasonality and day-of-week effects need comparable windows.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Python / pandas
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-00000000000b'::uuid, s.id, p.id,
       'Pandas for analysts',
       'https://pandas.pydata.org/docs/user_guide/10min.html',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'pandas_docs' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-00000000000b', 1, 'IO and inspect',
 'pd.read_csv / read_parquet load data. Use head(), tail(), sample(), info(), describe(), dtypes, and shape in the first minutes of any analysis. Parse dates with parse_dates or pd.to_datetime.'),
('d2000001-0000-4000-8000-00000000000b', 2, 'Select and filter',
 'Columns: df["col"] or df[["a","b"]]. Rows: boolean masks df[df["status"] == "paid"]. Combine masks with & | and parentheses. Prefer .loc for label-based selection.'),
('d2000001-0000-4000-8000-00000000000b', 3, 'Assign and derive',
 'df["revenue"] = df["quantity"] * df["unit_price"]. Use .assign for chained pipelines. astype converts types; mistakes here break groupby and merges.'),
('d2000001-0000-4000-8000-00000000000b', 4, 'Missing data',
 'isna() / notna() detect nulls. dropna() removes; fillna() imputes. Decide per column: drop rare null keys, fill metrics carefully, never silently fill IDs.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-00000000000c'::uuid, s.id, p.id,
       'Pandas groupby merge reshape',
       'https://realpython.com/pandas-groupby/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'real_python' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-00000000000c', 1, 'Groupby',
 'df.groupby("region")["revenue"].sum() mirrors SQL GROUP BY. agg({"revenue":"sum","orders":"count"}) computes multiple metrics. reset_index() flattens for charts and exports.'),
('d2000001-0000-4000-8000-00000000000c', 2, 'Merge join',
 'pd.merge(left, right, on="customer_id", how="left") is SQL JOIN. how: inner, left, right, outer. Validate row counts before/after to catch fan-out. indicator=True helps debug unmatched keys.'),
('d2000001-0000-4000-8000-00000000000c', 3, 'Reshape',
 'pivot_table builds spreadsheet-like summaries. melt goes wide→long for plotting. sort_values and nlargest cover top-N analysis quickly.'),
('d2000001-0000-4000-8000-00000000000c', 4, 'Method chaining',
 'Readable pipelines: (df.query("status == ''paid''").assign(revenue=...).groupby(...).agg(...).reset_index()). Prefer clear steps over clever one-liners in shared notebooks.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Visualization
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-00000000000d'::uuid, s.id, p.id,
       'Choosing the right chart',
       'https://www.storytellingwithdata.com/blog/2020/6/4/so-what-chart-should-i-use',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'storytelling_data' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-00000000000d', 1, 'Match chart to question',
 'Comparison → bar. Trend over time → line. Relationship → scatter. Distribution → histogram/box. Part-to-whole with few categories → stacked bar or careful pie; many categories → bar.'),
('d2000001-0000-4000-8000-00000000000d', 2, 'Bars beat pies',
 'Human perception compares length better than angle/area. Prefer horizontal bars for long category labels. Sort bars by value unless order is meaningful (time, funnel stage).'),
('d2000001-0000-4000-8000-00000000000d', 3, 'Line chart rules',
 'Use lines for continuous time. Keep intervals consistent. Multiple series need a clear legend and limited colors. Annotate shocks (launches, outages) on the chart.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-00000000000e'::uuid, s.id, p.id,
       'Visualization hygiene and ethics',
       'https://plotly.com/python/basic-charts/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'plotly' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-00000000000e', 1, 'Axes and baselines',
 'For bar magnitude comparisons, start the value axis at zero. Truncated axes exaggerate differences. Label units. Dual axes often mislead — prefer indexed series or two charts.'),
('d2000001-0000-4000-8000-00000000000e', 2, 'Titles that say the insight',
 'Title: ''EU revenue fell 12% while US held flat'' beats ''Revenue by region''. Subtitle can hold period, filters, and source. Remove chartjunk: heavy gridlines, 3D effects, decorative icons.'),
('d2000001-0000-4000-8000-00000000000e', 3, 'Color',
 'Use color for meaning (category or alert), not decoration. Ensure contrast for accessibility. Consistent colors across a dashboard build trust.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Business thinking / metrics
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-00000000000f'::uuid, s.id, p.id,
       'Metrics and business questions',
       'https://support.google.com/analytics/answer/1033861',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'google_analytics' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-00000000000f', 1, 'Start from the decision',
 'Write the business question, the decision owner, and the metric definition before querying. Example: ''Why did paid revenue drop MoM, and should we cut or scale channel X?'''),
('d2000001-0000-4000-8000-00000000000f', 2, 'Metric definition',
 'Define numerator, denominator, time zone, inclusion rules (paid only?), and grain. Ambiguous KPIs create conflicting dashboards. Version the definition in the report.'),
('d2000001-0000-4000-8000-00000000000f', 3, 'Funnel thinking',
 'Break journeys into stages: visit → signup → activation → purchase → retention. Locate the largest drop-off before optimizing vanity top-of-funnel metrics.'),
('d2000001-0000-4000-8000-00000000000f', 4, 'North star vs diagnostics',
 'One outcome metric (e.g. weekly retained users) plus a few diagnostic metrics (activation rate, latency). Too many KPIs dilute action.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000010'::uuid, s.id, p.id,
       'Root cause and recommendations',
       'https://mode.com/sql-tutorial',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mode_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000010', 1, 'Decompose the KPI',
 'Revenue = users × conversion × AOV (or volume × price). Decompose geographically, by product, channel, and new vs returning. Find which slice moved.'),
('d2000001-0000-4000-8000-000000000010', 2, 'Compare fairly',
 'Use the same period length, comparable weekdays, and note launches/outages. MoM without seasonality adjustment misleads retail and education metrics.'),
('d2000001-0000-4000-8000-000000000010', 3, 'Recommendation structure',
 'Evidence → interpretation → recommendation → owner → expected impact → how we will measure. Avoid ''look into it'' as a final ask — propose a test or decision.'),
('d2000001-0000-4000-8000-000000000010', 4, 'Portfolio narrative',
 'Strong analyst case studies show the question, method, SQL/Python proof, chart, and business outcome. Quantify impact even if directional.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'd2000001-0000-4000-8000-000000000011'::uuid, s.id, p.id,
       'E-commerce analysis patterns',
       'https://mode.com/sql-tutorial/sql-joins',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mode_sql' AND p.slug = 'data_analyst'
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('d2000001-0000-4000-8000-000000000011', 1, 'Orders grain',
 'E-commerce schemas usually have customers, orders, order_items. Revenue almost always lives at item level (qty * price) filtered to paid/completed statuses. Cancelled orders must be excluded explicitly.'),
('d2000001-0000-4000-8000-000000000011', 2, 'Product and region cuts',
 'When revenue drops, check product mix (high-AOV SKU decline), region mix, and cancelled share. A rising cancel rate can look like demand drop if you forget status filters.'),
('d2000001-0000-4000-8000-000000000011', 3, 'Cohorts lite',
 'Group customers by first-order month and track repeat purchase. Even a simple first_order_month cohort table beats vanity totals for retention stories.')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Skill tags for all new DA chunks
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN professions p ON p.id = d.profession_id AND p.slug = 'data_analyst'
JOIN skills s ON s.slug = 'sql'
WHERE d.id IN (
  'd2000001-0000-4000-8000-000000000001',
  'd2000001-0000-4000-8000-000000000002',
  'd2000001-0000-4000-8000-000000000003',
  'd2000001-0000-4000-8000-000000000004',
  'd2000001-0000-4000-8000-000000000005',
  'd2000001-0000-4000-8000-000000000011',
  'b1000001-0000-4000-8000-000000000001',
  'b1000001-0000-4000-8000-000000000002',
  'b1000001-0000-4000-8000-000000000003'
)
ON CONFLICT DO NOTHING;

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN professions p ON p.id = d.profession_id AND p.slug = 'data_analyst'
JOIN skills s ON s.slug = 'excel'
WHERE d.id IN (
  'd2000001-0000-4000-8000-000000000006',
  'd2000001-0000-4000-8000-000000000007',
  'd2000001-0000-4000-8000-000000000008',
  'b1000001-0000-4000-8000-000000000004'
)
ON CONFLICT DO NOTHING;

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN professions p ON p.id = d.profession_id AND p.slug = 'data_analyst'
JOIN skills s ON s.slug = 'statistics'
WHERE d.id IN (
  'd2000001-0000-4000-8000-000000000009',
  'd2000001-0000-4000-8000-00000000000a',
  'b1000001-0000-4000-8000-000000000005'
)
ON CONFLICT DO NOTHING;

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN professions p ON p.id = d.profession_id AND p.slug = 'data_analyst'
JOIN skills s ON s.slug = 'python-data'
WHERE d.id IN (
  'd2000001-0000-4000-8000-00000000000b',
  'd2000001-0000-4000-8000-00000000000c',
  'b1000001-0000-4000-8000-000000000006'
)
ON CONFLICT DO NOTHING;

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN professions p ON p.id = d.profession_id AND p.slug = 'data_analyst'
JOIN skills s ON s.slug = 'visualization'
WHERE d.id IN (
  'd2000001-0000-4000-8000-00000000000d',
  'd2000001-0000-4000-8000-00000000000e',
  'b1000001-0000-4000-8000-000000000007'
)
ON CONFLICT DO NOTHING;

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN professions p ON p.id = d.profession_id AND p.slug = 'data_analyst'
JOIN skills s ON s.slug = 'business-thinking'
WHERE d.id IN (
  'd2000001-0000-4000-8000-00000000000f',
  'd2000001-0000-4000-8000-000000000010',
  'd2000001-0000-4000-8000-000000000011',
  'b1000001-0000-4000-8000-000000000008'
)
ON CONFLICT DO NOTHING;

-- Re-link any DA docs from 006 that lost profession due to id clash with UX seed:
-- If b1000001-* docs belong to ui_ux, insert parallel DA copies were skipped.
-- Ensure DA profession has enough fallback chunks via d2000001-* above.
