-- Seed: goals, skill levels, skills, resources, one sample learning path

INSERT INTO goals (slug, title, description) VALUES
    ('career_change', 'Сменить карьеру', 'Полный переход в frontend-разработку с нуля до первой работы'),
    ('level_up',      'Прокачаться',     'Углубить навыки и вырасти в текущей роли'),
    ('freelance',     'Начать фриланс',  'Научиться брать проекты и работать с клиентами'),
    ('explore',       'Просто попробовать', 'Без давления — понять, нравится ли frontend');

INSERT INTO skill_levels (slug, title, order_index, description) VALUES
    ('complete_beginner', 'Полный новичок',   1, 'Никогда не писал код или минимальный опыт'),
    ('some_experience',   'Немного опыта',    2, 'Знаю основы HTML/CSS/JS, делал простые страницы'),
    ('intermediate',      'Средний уровень',  3, 'Работаю с React/Vue, понимаю state и API'),
    ('advanced',          'Продвинутый',      4, 'Опытный разработчик, хочу углубиться');

INSERT INTO skills (slug, title, category) VALUES
    ('html',       'HTML',              'fundamentals'),
    ('css',        'CSS',               'fundamentals'),
    ('javascript', 'JavaScript',        'fundamentals'),
    ('git',        'Git & GitHub',      'tools'),
    ('react',      'React',             'framework'),
    ('typescript', 'TypeScript',        'framework'),
    ('react-native', 'React Native',    'framework'),
    ('portfolio',  'Portfolio',         'career'),
    ('freelance-biz', 'Freelance basics', 'career');

INSERT INTO resources (title, url, resource_type, language, estimated_hours, difficulty, source_name, summary) VALUES
    ('Introduction to HTML', 'https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML', 'article', 'en', 3, 1, 'MDN', 'What HTML is and how to write your first page'),
    ('CSS basics', 'https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/CSS_basics', 'article', 'en', 4, 1, 'MDN', 'Colors, fonts, and layout basics'),
    ('JavaScript first steps', 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps', 'article', 'en', 8, 2, 'MDN', 'Variables, functions, and DOM'),
    ('Learn Git Branching', 'https://learngitbranching.js.org/', 'exercise', 'en', 2, 2, 'PCottle', 'Interactive Git tutorial'),
    ('React Quick Start', 'https://react.dev/learn', 'course', 'en', 10, 2, 'React', 'Official React tutorial'),
    ('Frontend Mentor', 'https://www.frontendmentor.io/challenges', 'exercise', 'en', 5, 3, 'Frontend Mentor', 'Real-world UI challenges for portfolio'),
    ('Flexbox Froggy', 'https://flexboxfroggy.com/', 'exercise', 'en', 1, 1, 'Flexbox Froggy', 'Learn flexbox through a game'),
    ('roadmap.sh Frontend', 'https://roadmap.sh/frontend', 'article', 'en', 1, 1, 'roadmap.sh', 'Visual roadmap of frontend skills');

-- career_change + complete_beginner path
INSERT INTO learning_paths (goal_id, skill_level_id, title, description)
SELECT g.id, sl.id,
       'Frontend с нуля до первой работы',
       'Пошаговый план для смены карьеры: от HTML до portfolio и поиска работы'
FROM goals g, skill_levels sl
WHERE g.slug = 'career_change' AND sl.slug = 'complete_beginner';

INSERT INTO learning_path_steps (path_id, order_index, title, skill_id, resource_id, project_brief, estimated_days)
SELECT
    lp.id,
    v.order_index,
    v.title,
    v.skill_id,
    v.resource_id,
    v.project_brief,
    v.estimated_days
FROM learning_paths lp
JOIN goals g ON g.id = lp.goal_id AND g.slug = 'career_change'
JOIN skill_levels sl ON sl.id = lp.skill_level_id AND sl.slug = 'complete_beginner'
CROSS JOIN (VALUES
    (1,  'Что такое frontend-разработка', NULL::uuid, (SELECT id FROM resources WHERE url LIKE '%roadmap.sh%'), NULL::text, 1),
    (2,  'HTML: структура страницы',      (SELECT id FROM skills WHERE slug = 'html'),       (SELECT id FROM resources WHERE url LIKE '%Introduction_to_HTML%'), NULL::text, 3),
    (3,  'CSS: стили и layout',           (SELECT id FROM skills WHERE slug = 'css'),        (SELECT id FROM resources WHERE url LIKE '%CSS_basics%'), NULL::text, 4),
    (4,  'Flexbox на практике',           (SELECT id FROM skills WHERE slug = 'css'),        (SELECT id FROM resources WHERE url LIKE '%flexboxfroggy%'), NULL::text, 1),
    (5,  'JavaScript основы',             (SELECT id FROM skills WHERE slug = 'javascript'), (SELECT id FROM resources WHERE url LIKE '%JavaScript/First_steps%'), NULL::text, 7),
    (6,  'Git и GitHub',                  (SELECT id FROM skills WHERE slug = 'git'),        (SELECT id FROM resources WHERE url LIKE '%learngitbranching%'), NULL::text, 2),
    (7,  'Проект: landing page',          (SELECT id FROM skills WHERE slug = 'html'),       NULL::uuid, 'Сверстай одностраничный сайт о себе. Задеплой на GitHub Pages.', 5),
    (8,  'React: первые компоненты',      (SELECT id FROM skills WHERE slug = 'react'),      (SELECT id FROM resources WHERE url LIKE '%react.dev/learn%'), NULL::text, 10),
    (9,  'Проект: todo-приложение',       (SELECT id FROM skills WHERE slug = 'react'),      NULL::uuid, 'Todo app на React с localStorage. Код на GitHub.', 7),
    (10, 'Portfolio challenge',           (SELECT id FROM skills WHERE slug = 'portfolio'),  (SELECT id FROM resources WHERE url LIKE '%frontendmentor%'), 'Сделай 2–3 challenge с Frontend Mentor для portfolio.', 14)
) AS v(order_index, title, skill_id, resource_id, project_brief, estimated_days);
