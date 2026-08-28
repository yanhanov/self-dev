-- Seed: trusted sources + verified knowledge chunks for frontend & UI/UX

-- ── Sources ────────────────────────────────────────────────────────

INSERT INTO knowledge_sources (slug, name, base_url, description) VALUES
    ('mdn', 'MDN Web Docs', 'https://developer.mozilla.org', 'Canonical web platform documentation'),
    ('react', 'React Docs', 'https://react.dev', 'Official React documentation'),
    ('webdev', 'web.dev', 'https://web.dev', 'Google web platform best practices'),
    ('wcag', 'W3C WCAG', 'https://www.w3.org/WAI/WCAG21', 'Web Content Accessibility Guidelines'),
    ('nngroup', 'Nielsen Norman Group', 'https://www.nngroup.com', 'Evidence-based UX research'),
    ('material', 'Material Design', 'https://m3.material.io', 'Google design system principles'),
    ('gitbranch', 'Learn Git Branching', 'https://learngitbranching.js.org', 'Interactive Git education'),
    ('typescript', 'TypeScript Handbook', 'https://www.typescriptlang.org/docs', 'Official TypeScript documentation'),
    ('figma', 'Figma Help', 'https://help.figma.com', 'Official Figma product documentation');

-- Helper: resolve profession / source / skill ids in CTEs below

-- ═══════════════════════════════════════════════════════════════════
-- FRONTEND DOCUMENTS & CHUNKS
-- ═══════════════════════════════════════════════════════════════════

-- HTML
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-000000000001'::uuid, s.id, p.id,
       'HTML: structure and semantics',
       'https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mdn' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-000000000001', 1, 'What is HTML',
 'HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of a page using elements wrapped in tags. Browsers parse HTML and render the Document Object Model (DOM). HTML is not a programming language; it defines content structure and meaning, while CSS handles presentation and JavaScript handles behavior.'),
('a1000001-0000-4000-8000-000000000001', 2, 'Document structure',
 'Every HTML document should start with <!DOCTYPE html>, then an <html> root with lang attribute, a <head> for metadata (charset, viewport, title, links), and a <body> for visible content. Use UTF-8 charset and a viewport meta tag for responsive pages. The title appears in browser tabs and search results.'),
('a1000001-0000-4000-8000-000000000001', 3, 'Semantic elements',
 'Semantic HTML uses elements that convey meaning: <header>, <nav>, <main>, <article>, <section>, <aside>, <footer>. Prefer <button> for actions and <a> for navigation. Use heading hierarchy h1–h6 without skipping levels. Semantic markup improves accessibility, SEO, and maintainability compared to nested <div> soup.'),
('a1000001-0000-4000-8000-000000000001', 4, 'Links and images',
 'The <a> element creates hyperlinks with href. Use descriptive link text, not "click here". The <img> element requires an alt attribute describing the image for screen readers; decorative images may use empty alt="". Prefer modern formats (WebP/AVIF) when supported, and always include width/height or CSS sizing to reduce layout shift.');

-- CSS basics
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-000000000002'::uuid, s.id, p.id,
       'CSS: cascade, box model, layout',
       'https://developer.mozilla.org/en-US/docs/Learn/CSS',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mdn' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-000000000002', 1, 'Cascade and specificity',
 'CSS applies styles through the cascade: origin, importance, specificity, and source order. Specificity ranks inline styles > IDs > classes/attributes/pseudo-classes > elements. Avoid !important except for utility overrides. Prefer class-based selectors over deep nesting. Inheritance passes some properties (color, font) to children; layout properties generally do not inherit.'),
('a1000001-0000-4000-8000-000000000002', 2, 'Box model',
 'Every element is a rectangular box. The box model includes content, padding, border, and margin. With box-sizing: border-box (recommended via universal reset), width includes padding and border. Margin collapses vertically between block siblings. Use margin for spacing between elements and padding for space inside an element.'),
('a1000001-0000-4000-8000-000000000002', 3, 'Flexbox',
 'CSS Flexbox lays out items in one dimension (row or column). Set display: flex on a container. Main axis is controlled by flex-direction; cross axis by align-items. Use justify-content for main-axis distribution, gap for spacing, and flex-grow/shrink/basis (or flex shorthand) on children. Flexbox is ideal for navbars, toolbars, and centering.'),
('a1000001-0000-4000-8000-000000000002', 4, 'CSS Grid',
 'CSS Grid creates two-dimensional layouts with rows and columns. Use display: grid, define tracks with grid-template-columns/rows (fr units, minmax, repeat). Place items with grid-column/grid-row or named areas via grid-template-areas. Grid and Flexbox complement each other: Grid for page structure, Flex for component internals.'),
('a1000001-0000-4000-8000-000000000002', 5, 'Responsive design',
 'Responsive design adapts layouts to viewport sizes. Use relative units (%, rem, fr), flexible images (max-width: 100%), and media queries (@media (min-width: ...)). Mobile-first means base styles for small screens, then enhance for larger breakpoints. Prefer rem for typography and container queries where component-level responsiveness is needed.');

-- web.dev responsive / modern CSS
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-000000000003'::uuid, s.id, p.id,
       'Modern CSS practices',
       'https://web.dev/learn/css',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'webdev' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-000000000003', 1, 'Custom properties',
 'CSS custom properties (variables) are defined with --name and used via var(--name). They cascade and can be updated at runtime with JavaScript. Define a design-token layer (:root) for colors, spacing, and radii. Prefer custom properties over scattered magic numbers for theming and dark mode.'),
('a1000001-0000-4000-8000-000000000003', 2, 'Logical properties',
 'Logical properties (margin-inline, padding-block, inset-inline-start) map to writing modes instead of physical left/right. They improve internationalization for RTL languages. Prefer logical spacing when building reusable components that must work across locales.');

-- JavaScript
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-000000000004'::uuid, s.id, p.id,
       'JavaScript fundamentals',
       'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mdn' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-000000000004', 1, 'Types and values',
 'JavaScript has primitive types: string, number, bigint, boolean, undefined, symbol, and null. Objects include arrays, functions, dates, and plain objects. Prefer const by default; use let when reassignment is needed; avoid var. Strict equality (===) compares value and type without coercion. NaN is the only value not equal to itself.'),
('a1000001-0000-4000-8000-000000000004', 2, 'Functions',
 'Functions are first-class values. Prefer arrow functions for short callbacks and function declarations for named top-level APIs. Parameters can have defaults. Rest (...args) collects remaining arguments; spread expands arrays/objects. Closures capture outer lexical scope and enable encapsulation of private state.'),
('a1000001-0000-4000-8000-000000000004', 3, 'DOM basics',
 'The DOM represents the page as a tree of nodes. Query with document.querySelector / querySelectorAll. Create elements with createElement, set text via textContent (safer than innerHTML for untrusted data). Listen with addEventListener; remove listeners to avoid leaks. Prefer event delegation on a parent for dynamic lists.'),
('a1000001-0000-4000-8000-000000000004', 4, 'Async JavaScript',
 'Asynchronous work uses callbacks, Promises, and async/await. A Promise is pending, fulfilled, or rejected. async functions return Promises; await pauses until settlement. Always handle errors with try/catch or .catch. Prefer Promise.all for parallel independent requests; Promise.allSettled when partial failures are acceptable.'),
('a1000001-0000-4000-8000-000000000004', 5, 'Modules',
 'ES modules use import/export. Each module has its own scope. Default export exports one primary value; named exports export multiple. Browsers load modules as deferred and strict by default. Bundlers (Vite, webpack) resolve modules for production. Avoid circular dependencies; keep modules focused.');

-- React
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-000000000005'::uuid, s.id, p.id,
       'React: components and hooks',
       'https://react.dev/learn',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'react' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-000000000005', 1, 'Components and JSX',
 'React apps are trees of components. A component is a function that returns JSX describing the UI. JSX looks like HTML but compiles to React.createElement calls. Components must return a single root (or Fragment). Props pass data from parent to child and are read-only. Keys help React identify list items across updates.'),
('a1000001-0000-4000-8000-000000000005', 2, 'State with useState',
 'useState declares component state. Calling the setter queues a re-render with the new value. State updates may be asynchronous and batched. When next state depends on previous, use the functional updater form setX(prev => ...). Do not mutate state objects/arrays in place; create new copies. Lift state up to share between siblings.'),
('a1000001-0000-4000-8000-000000000005', 3, 'Effects with useEffect',
 'useEffect synchronizes with external systems (network, DOM APIs, subscriptions). The dependency array controls when the effect re-runs. Empty deps run once after mount; omit deps only deliberately. Always return a cleanup function for subscriptions and timers. Prefer deriving values during render over putting them in effects when possible.'),
('a1000001-0000-4000-8000-000000000005', 4, 'Props and composition',
 'Pass data via props; pass callbacks for child-to-parent communication. Composition (children, slots) is preferred over deep inheritance. Conditional rendering uses && or ternaries. Lists map arrays to elements with stable keys. Controlled inputs bind value to state and update via onChange.'),
('a1000001-0000-4000-8000-000000000005', 5, 'Thinking in React',
 'Break UI into a component hierarchy, build a static version, identify minimal state, decide where state lives, and add inverse data flow. Keep components pure: same props/state → same output. Side effects belong in event handlers or Effects. Prefer local state until multiple components need the same data.');

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-000000000006'::uuid, s.id, p.id,
       'React: advanced patterns',
       'https://react.dev/reference/react',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'react' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-000000000006', 1, 'useRef and useMemo',
 'useRef holds a mutable value that persists across renders without causing re-renders; commonly used for DOM nodes. useMemo caches expensive calculations between renders based on dependencies. useCallback memoizes function identity. Memoization is an optimization—measure first; do not premature-optimize every value.'),
('a1000001-0000-4000-8000-000000000006', 2, 'Context',
 'React Context provides data to a subtree without prop drilling. Create a context, wrap a provider with a value, and consume with useContext. Context is ideal for theme, locale, and auth session. Avoid putting rapidly changing values in context without splitting providers, or many consumers will re-render often.');

-- Git
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-000000000007'::uuid, s.id, p.id,
       'Git basics',
       'https://learngitbranching.js.org/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'gitbranch' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-000000000007', 1, 'Commits and history',
 'Git stores snapshots (commits) linked in a directed history. Each commit has a parent, message, and unique hash. Working directory → staging area (index) → repository. Use git status, git add, git commit. Write clear commit messages describing why. Never rewrite shared history on main without team agreement.'),
('a1000001-0000-4000-8000-000000000007', 2, 'Branches and merge',
 'A branch is a movable pointer to a commit. Create feature branches for isolated work, then merge back to main. Fast-forward merges move the pointer; three-way merges create a merge commit when histories diverge. Resolve conflicts by editing conflicted files, then git add and continue. Prefer short-lived branches.'),
('a1000001-0000-4000-8000-000000000007', 3, 'Remote workflows',
 'Remotes (origin) track shared repositories. git push uploads commits; git pull fetches and integrates. Clone copies a remote repo. Protect main with reviews. Rebase rewrites local commits onto a new base for a linear history—avoid rebasing commits already pushed to shared branches.');

-- TypeScript
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-000000000008'::uuid, s.id, p.id,
       'TypeScript basics',
       'https://www.typescriptlang.org/docs/handbook/2/basic-types.html',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'typescript' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-000000000008', 1, 'Types vs interfaces',
 'TypeScript adds static types erased at compile time. interface declares object shapes and supports declaration merging; type aliases can represent unions, intersections, and primitives. Prefer interface for public object APIs and type for unions/tuples. Both can describe React props. Start with inference; annotate public boundaries.'),
('a1000001-0000-4000-8000-000000000008', 2, 'Unions and narrowing',
 'Union types (string | number) require narrowing before use via typeof checks, equality, or type predicates. Discriminated unions use a shared literal field (kind) for safe pattern matching. unknown is the type-safe counterpart of any—must narrow before use. Avoid any unless bridging untyped code.'),
('a1000001-0000-4000-8000-000000000008', 3, 'Generics',
 'Generics parameterize types (Array<T>, Promise<T>). Functions can infer type parameters from arguments. Constraints (T extends ...) limit what can be passed. Generics enable reusable typed utilities without losing specificity. Prefer concrete types when only one shape is needed.');

-- Accessibility (frontend-facing)
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-000000000009'::uuid, s.id, p.id,
       'Web accessibility for frontend',
       'https://developer.mozilla.org/en-US/docs/Web/Accessibility',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mdn' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-000000000009', 1, 'Keyboard and focus',
 'All interactive controls must be reachable and operable via keyboard. Visible focus indicators are required. Use native elements (<button>, <a>, <input>) which provide keyboard behavior by default. If building custom widgets, implement roving tabindex and ARIA roles carefully. Never remove outline without a replacement focus style.'),
('a1000001-0000-4000-8000-000000000009', 2, 'ARIA basics',
 'ARIA supplements semantics when HTML alone is insufficient. Prefer native HTML first. Common patterns: aria-label / aria-labelledby for accessible names, aria-expanded for disclosure, role="dialog" with focus trap for modals. Incorrect ARIA is worse than no ARIA. Test with screen readers and axe/lighthouse.');

-- More frontend: fetch, forms, performance
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-00000000000a'::uuid, s.id, p.id,
       'Networking and forms',
       'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mdn' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-00000000000a', 1, 'Fetch API',
 'fetch(url, options) returns a Promise of Response. Check response.ok before parsing JSON. Handle network errors in catch and HTTP errors via status codes. Set Content-Type for JSON bodies. AbortController cancels in-flight requests. Prefer relative URLs behind the same origin or configure CORS on the server.'),
('a1000001-0000-4000-8000-00000000000a', 2, 'Forms and validation',
 'HTML form controls provide built-in validation (required, type=email, pattern, min/max). Use label elements associated via for/id. Prevent default submit to handle with JS. Constraint Validation API exposes checkValidity and setCustomValidity. Always validate on the server—client validation is UX, not security.'),
('a1000001-0000-4000-8000-00000000000a', 3, 'Web performance basics',
 'Core Web Vitals include LCP (loading), INP (interactivity), and CLS (visual stability). Optimize images, defer non-critical JS, avoid large layout shifts, and minimize main-thread work. Use code splitting and lazy loading for routes. Measure with Lighthouse and Real User Monitoring rather than guessing.');

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-00000000000b'::uuid, s.id, p.id,
       'CSS layout deep dive',
       'https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'mdn' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-00000000000b', 1, 'Positioning',
 'position: static is the default flow. relative offsets without removing from flow. absolute positions relative to the nearest positioned ancestor. fixed is relative to the viewport. sticky toggles between relative and fixed based on scroll. z-index only applies to positioned or flex/grid items creating stacking contexts.'),
('a1000001-0000-4000-8000-00000000000b', 2, 'Typography and color',
 'Use a modular type scale with rem. Line-height around 1.4–1.6 improves readability. Contrast between text and background must meet WCAG AA (4.5:1 for normal text). Prefer system font stacks or a limited webfont set with font-display: swap. Limit line length (~45–75 characters) for comfortable reading.');

-- ═══════════════════════════════════════════════════════════════════
-- UI/UX DOCUMENTS & CHUNKS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000001'::uuid, s.id, p.id,
       'UX process overview',
       'https://www.nngroup.com/articles/ux-research-cheat-sheet/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'nngroup' AND p.slug = 'ui_ux_design';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000001', 1, 'UX research phases',
 'UX research spans discover, explore, test, and listen. Generative research finds problems and opportunities; evaluative research tests solutions. Common methods: interviews, surveys, usability tests, analytics, and diary studies. Match method to question—do not run a survey when you need observed behavior.'),
('b1000001-0000-4000-8000-000000000001', 2, 'User interviews',
 'Interviews uncover goals, pains, and mental models. Ask open questions; avoid leading prompts. Recruit representative users. Record with consent, then affinity-map insights into themes. Synthesize into personas or jobs-to-be-done carefully—personas must be evidence-based, not stereotypes.'),
('b1000001-0000-4000-8000-000000000001', 3, 'Usability testing',
 'Usability testing observes people attempting realistic tasks. Prefer moderated think-aloud for early prototypes; unmoderated remote tests scale later. Five users often reveal most severe issues in a single round. Focus on task success, errors, and time—not opinions about visual polish alone.'),
('b1000001-0000-4000-8000-000000000001', 4, 'From research to design',
 'Translate findings into problem statements, opportunity areas, and requirements. Prioritize by user impact and feasibility. Create journey maps to show end-to-end experience. Align stakeholders on evidence before debating UI details. Iterate: research → design → test → refine.');

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000002'::uuid, s.id, p.id,
       'Wireframing and prototyping',
       'https://www.nngroup.com/articles/wireflows/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'nngroup' AND p.slug = 'ui_ux_design';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000002', 1, 'Wireframes',
 'Wireframes are low-fidelity structural sketches of screens. They focus on layout, hierarchy, and content priority—not colors or branding. Use grayscale boxes and placeholder text. Wireframes align teams cheaply before visual design investment. Annotate interactions and edge cases.'),
('b1000001-0000-4000-8000-000000000002', 2, 'Prototypes',
 'Prototypes simulate interaction. Fidelity ranges from paper to high-fidelity clickable Figma. Choose fidelity matching the question: paper for flow, mid-fi for navigation, hi-fi for visual/usability validation. Prototype only critical paths first. Discard or revise based on test results.'),
('b1000001-0000-4000-8000-000000000002', 3, 'Information architecture',
 'Information architecture organizes content so users find it. Techniques: card sorting, tree testing, sitemap diagrams. Clear labels beat clever jargon. Consistent navigation patterns reduce cognitive load. Group related content; expose primary tasks prominently.');

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000003'::uuid, s.id, p.id,
       'Nielsen usability heuristics',
       'https://www.nngroup.com/articles/ten-usability-heuristics/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'nngroup' AND p.slug = 'ui_ux_design';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000003', 1, 'Heuristics 1-5',
 '1. Visibility of system status—keep users informed with timely feedback. 2. Match between system and real world—use familiar language and conventions. 3. User control and freedom—provide undo/exit. 4. Consistency and standards—follow platform conventions. 5. Error prevention—design to avoid mistakes before they happen.'),
('b1000001-0000-4000-8000-000000000003', 2, 'Heuristics 6-10',
 '6. Recognition rather than recall—make options visible. 7. Flexibility and efficiency—accelerators for experts. 8. Aesthetic and minimalist design—remove irrelevant information. 9. Help users recognize, diagnose, and recover from errors—plain language, constructive recovery. 10. Help and documentation—searchable, task-focused help when needed.'),
('b1000001-0000-4000-8000-000000000003', 3, 'Using heuristics',
 'Heuristic evaluation is expert review against these principles—complementary to user testing, not a replacement. Multiple evaluators find more issues. Severity ratings help prioritize fixes. Heuristics are guidelines; validate critical changes with real users.');

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000004'::uuid, s.id, p.id,
       'UI visual principles',
       'https://m3.material.io/foundations/overview',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'material' AND p.slug = 'ui_ux_design';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000004', 1, 'Visual hierarchy',
 'Visual hierarchy guides attention using size, weight, color, contrast, and spacing. Primary actions should be most prominent. Secondary actions quieter. Group related items with proximity (Gestalt). Align elements to a grid for order. Avoid equal visual weight competing for attention.'),
('b1000001-0000-4000-8000-000000000004', 2, 'Spacing and layout',
 'Consistent spacing scales (4/8pt) create rhythm. Generous whitespace improves scanability. Use columns and margins for responsive layouts. Density should match task: dashboards denser, marketing airier. Maintain touch targets of at least 44×44 CSS pixels for mobile.'),
('b1000001-0000-4000-8000-000000000004', 3, 'Color and contrast',
 'Color communicates meaning (status, brand, emphasis) but must not be the only cue—pair with icons/text. Ensure text contrast meets WCAG AA. Limit the palette: primary, secondary, neutrals, semantic (success/warning/error). Test in light and dark themes if both are offered.'),
('b1000001-0000-4000-8000-000000000004', 4, 'Typography in UI',
 'Limit typefaces to one or two families. Establish a clear type scale for display, title, body, and caption. Line length and line-height affect readability. Pair font weight with hierarchy. Avoid all-caps for long text. Support dynamic type / user font scaling on mobile.');

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000005'::uuid, s.id, p.id,
       'WCAG accessibility basics',
       'https://www.w3.org/WAI/WCAG21/quickref/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'wcag' AND p.slug = 'ui_ux_design';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000005', 1, 'POUR principles',
 'WCAG is organized around POUR: Perceivable, Operable, Understandable, Robust. Content must be presentable to senses, UI operable via available inputs, information clear, and markup compatible with assistive tech. Levels A, AA, AAA increase strictness; AA is the common legal/product target.'),
('b1000001-0000-4000-8000-000000000005', 2, 'Contrast and text',
 'WCAG 2.1 AA requires contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (18pt+ or 14pt bold). UI components and graphical objects that convey meaning need 3:1 against adjacent colors. Do not rely on color alone to convey state.'),
('b1000001-0000-4000-8000-000000000005', 3, 'Alt text and media',
 'Informative images need equivalent text alternatives. Decorative images should be ignored by AT (empty alt). Complex images (charts) need longer descriptions. Captions for video and transcripts for audio are required for equivalent access. Avoid autoplaying media with sound.'),
('b1000001-0000-4000-8000-000000000005', 4, 'Keyboard and targets',
 'All functionality must be available from a keyboard (2.1.1). Focus order must be logical (2.4.3). Focus visible (2.4.7). Pointer targets should be large enough (2.5.5 AAA / best practice 44px). Provide skip links to bypass repetitive navigation.');

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000006'::uuid, s.id, p.id,
       'Figma fundamentals',
       'https://help.figma.com/hc/en-us/articles/360040328493',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'figma' AND p.slug = 'ui_ux_design';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000006', 1, 'Frames and layers',
 'In Figma, Frames are containers for screens and sections (similar to artboards). Layers stack; rename them meaningfully. Use constraints to pin elements when frames resize. Components are reusable UI pieces; instances inherit from the main component. Prefer frames over groups for layout control.'),
('b1000001-0000-4000-8000-000000000006', 2, 'Auto layout',
 'Auto layout applies flexbox-like rules inside Figma: direction, gap, padding, alignment, and resizing (hug/fill/fixed). It keeps spacing consistent and speeds responsive variants. Nest auto-layout frames for complex UI. Combine with components and variants for a scalable design system.'),
('b1000001-0000-4000-8000-000000000006', 3, 'Components and variants',
 'Create components for repeated UI (buttons, inputs, cards). Variants encode states (default/hover/disabled) and properties (size, type). Use instance overrides sparingly for content. Publish libraries for team reuse. Keep naming conventions consistent (Category/Component/Property).'),
('b1000001-0000-4000-8000-000000000006', 4, 'Prototyping in Figma',
 'Prototype connections define interactions: on click, hover, after delay. Use overlays for modals. Smart animate transitions between similar layers. Share prototype links for stakeholder review and usability tests. Keep flows focused on the scenarios you need to validate.');

INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'b1000001-0000-4000-8000-000000000007'::uuid, s.id, p.id,
       'Interaction and product design',
       'https://www.nngroup.com/articles/definition-user-experience/',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'nngroup' AND p.slug = 'ui_ux_design';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('b1000001-0000-4000-8000-000000000007', 1, 'UX vs UI',
 'User experience (UX) covers the entire journey: research, flows, content, usability, and outcomes. User interface (UI) focuses on visual and interactive presentation of screens. Strong products need both: useful structure and clear presentation. UX without UI research risks pretty but unusable designs.'),
('b1000001-0000-4000-8000-000000000007', 2, 'Feedback and empty states',
 'Every action should provide feedback (loading, success, error). Empty states teach users what to do next. Error messages should explain what happened and how to fix it in plain language. Skeleton screens reduce perceived wait vs spinners for content-heavy views.'),
('b1000001-0000-4000-8000-000000000007', 3, 'Onboarding and progressive disclosure',
 'Show only what users need for the current step (progressive disclosure). Onboarding should teach through doing, not long tours. Defaults should match the most common safe choice. Advanced options can live behind secondary surfaces for experts.');

-- Shared accessibility document linked to both professions (profession_id null = both)
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'c1000001-0000-4000-8000-000000000001'::uuid, s.id, NULL,
       'Shared accessibility essentials',
       'https://www.w3.org/WAI/fundamentals/accessibility-intro/',
       'en'
FROM knowledge_sources s
WHERE s.slug = 'wcag';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('c1000001-0000-4000-8000-000000000001', 1, 'Why accessibility matters',
 'Accessibility ensures people with disabilities can perceive, understand, navigate, and interact with the web. It also improves usability for everyone (captions, clear labels, keyboard support). Legal and ethical obligations increasingly require WCAG conformance. Build accessibility in from the start—retrofitting is expensive.'),
('c1000001-0000-4000-8000-000000000001', 2, 'Inclusive design checklist',
 'Use semantic structure, sufficient contrast, keyboard access, visible focus, labeled form fields, meaningful link text, and alternatives for non-text content. Test with keyboard only and at least one screen reader. Include users with disabilities in research when possible.');

-- Cross-cutting frontend career / portfolio notes from web.dev
INSERT INTO knowledge_documents (id, source_id, profession_id, title, url, language)
SELECT 'a1000001-0000-4000-8000-00000000000c'::uuid, s.id, p.id,
       'Building projects and portfolio',
       'https://web.dev/learn',
       'en'
FROM knowledge_sources s, professions p
WHERE s.slug = 'webdev' AND p.slug = 'frontend';

INSERT INTO knowledge_chunks (document_id, chunk_index, title, content_text) VALUES
('a1000001-0000-4000-8000-00000000000c', 1, 'Practice projects',
 'Learn by building small complete projects: landing page, todo app, API-driven dashboard. Ship to GitHub Pages or Vercel. Document decisions in README. Prefer depth (accessible, responsive, tested) over many shallow clones of tutorials.'),
('a1000001-0000-4000-8000-00000000000c', 2, 'Reading documentation',
 'Official docs (MDN, React, TypeScript) are the source of truth. Read guides first, then API reference. Reproduce examples locally. When stuck, reduce the problem to a minimal reproduction. Prefer primary sources over outdated blog posts.');

-- ── Tag chunks with skills ─────────────────────────────────────────

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'html'
WHERE d.id = 'a1000001-0000-4000-8000-000000000001';

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'css'
WHERE d.id IN (
  'a1000001-0000-4000-8000-000000000002',
  'a1000001-0000-4000-8000-000000000003',
  'a1000001-0000-4000-8000-00000000000b'
);

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'javascript'
WHERE d.id IN (
  'a1000001-0000-4000-8000-000000000004',
  'a1000001-0000-4000-8000-00000000000a'
);

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'react'
WHERE d.id IN (
  'a1000001-0000-4000-8000-000000000005',
  'a1000001-0000-4000-8000-000000000006'
);

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'git'
WHERE d.id = 'a1000001-0000-4000-8000-000000000007';

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'typescript'
WHERE d.id = 'a1000001-0000-4000-8000-000000000008';

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'accessibility'
WHERE d.id IN (
  'a1000001-0000-4000-8000-000000000009',
  'b1000001-0000-4000-8000-000000000005',
  'c1000001-0000-4000-8000-000000000001'
);

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'portfolio'
WHERE d.id = 'a1000001-0000-4000-8000-00000000000c';

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'ux-research'
WHERE d.id = 'b1000001-0000-4000-8000-000000000001';

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug IN ('wireframing', 'prototyping')
WHERE d.id = 'b1000001-0000-4000-8000-000000000002';

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'usability'
WHERE d.id IN (
  'b1000001-0000-4000-8000-000000000003',
  'b1000001-0000-4000-8000-000000000007'
);

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'ui-principles'
WHERE d.id = 'b1000001-0000-4000-8000-000000000004';

INSERT INTO knowledge_chunk_skills (chunk_id, skill_id)
SELECT c.id, s.id
FROM knowledge_chunks c
JOIN knowledge_documents d ON d.id = c.document_id
JOIN skills s ON s.slug = 'figma'
WHERE d.id = 'b1000001-0000-4000-8000-000000000006';
