import type {
  CourseOutlineRequest,
  CourseOutlineResponse,
  DailyPlanRequest,
  DailyPlanResponse,
  LessonRequest,
  LessonResponse,
  TutorRequest,
  TutorResponse,
} from "./types.js";

export function mockCourseOutline(req: CourseOutlineRequest): CourseOutlineResponse {
  const isDesign = req.profession_slug === "ui_ux_design";
  const lang = req.preferred_language.startsWith("ru") ? "ru" : "en";

  if (isDesign) {
    const lessons =
      lang === "ru"
        ? [
            { title: "Основы UX-мышления", summary: "Пользовательские проблемы и цели продукта" },
            { title: "Исследование пользователей", summary: "Интервью, персоны, CJM" },
            { title: "Информационная архитектура", summary: "Карта экранов и навигация" },
            { title: "Wireframes", summary: "Быстрые каркасы без визуального шума" },
            { title: "UI-основы: сетка и типографика", summary: "Иерархия и читаемость" },
            { title: "Цвет и контраст", summary: "Доступность и настроение интерфейса" },
            { title: "Компоненты и design system", summary: "Кнопки, формы, состояния" },
            { title: "Прототипирование", summary: "Интерактивный flow в Figma" },
            { title: "Юзабилити-тесты", summary: "Проверка гипотез с пользователями" },
            { title: "Кейс для портфолио", summary: "Оформление процесса и решения" },
            { title: "Передача в разработку", summary: "Specs, handoff, коммуникация" },
            { title: "Финальный проект", summary: "Полный UI/UX кейс end-to-end" },
          ]
        : [
            { title: "UX thinking basics", summary: "User problems and product goals" },
            { title: "User research", summary: "Interviews, personas, journey maps" },
            { title: "Information architecture", summary: "Screen map and navigation" },
            { title: "Wireframes", summary: "Fast low-fidelity layouts" },
            { title: "UI basics: grid and type", summary: "Hierarchy and readability" },
            { title: "Color and contrast", summary: "Accessibility and mood" },
            { title: "Components and design system", summary: "Buttons, forms, states" },
            { title: "Prototyping", summary: "Interactive flow in Figma" },
            { title: "Usability testing", summary: "Validate hypotheses with users" },
            { title: "Portfolio case study", summary: "Document process and outcomes" },
            { title: "Dev handoff", summary: "Specs, communication, delivery" },
            { title: "Capstone project", summary: "End-to-end UI/UX case" },
          ];

    return {
      title:
        lang === "ru"
          ? `UI/UX путь: ${req.level_title}`
          : `UI/UX path: ${req.level_title}`,
      summary:
        lang === "ru"
          ? `Персональный курс дизайна под уровень «${req.level_title}» (~${req.weekly_hours} ч/нед).`
          : `Personalized design course for «${req.level_title}» (~${req.weekly_hours} h/week).`,
      lessons,
    };
  }

  const lessons =
    lang === "ru"
      ? [
          { title: "Как устроен веб", summary: "Клиент, сервер, браузер, HTTP" },
          { title: "HTML: структура страницы", summary: "Семантика и доступность" },
          { title: "CSS: визуальный язык", summary: "Бокс-модель, цвета, шрифты" },
          { title: "Flexbox и Grid", summary: "Современные раскладки" },
          { title: "JavaScript основы", summary: "Переменные, функции, DOM" },
          { title: "Асинхронность и fetch", summary: "API и состояния загрузки" },
          { title: "Git и GitHub", summary: "Версии, ветки, PR" },
          { title: "React: компоненты", summary: "JSX, props, state" },
          { title: "React: эффекты и формы", summary: "useEffect, controlled inputs" },
          { title: "Роутинг и навигация", summary: "Многостраничные SPA" },
          { title: "Стиль и компоненты UI", summary: "Переиспользуемые блоки" },
          { title: "Мини-проект", summary: "Приложение с API и деплоем" },
        ]
      : [
          { title: "How the web works", summary: "Client, server, browser, HTTP" },
          { title: "HTML page structure", summary: "Semantics and accessibility" },
          { title: "CSS visual language", summary: "Box model, color, type" },
          { title: "Flexbox and Grid", summary: "Modern layouts" },
          { title: "JavaScript basics", summary: "Variables, functions, DOM" },
          { title: "Async and fetch", summary: "APIs and loading states" },
          { title: "Git and GitHub", summary: "Versions, branches, PRs" },
          { title: "React components", summary: "JSX, props, state" },
          { title: "React effects and forms", summary: "useEffect, controlled inputs" },
          { title: "Routing and navigation", summary: "Multi-page SPAs" },
          { title: "UI styling patterns", summary: "Reusable building blocks" },
          { title: "Mini project", summary: "App with API and deploy" },
        ];

  return {
    title:
      lang === "ru"
        ? `Frontend путь: ${req.level_title}`
        : `Frontend path: ${req.level_title}`,
    summary:
      lang === "ru"
        ? `Персональный frontend-курс под уровень «${req.level_title}» (~${req.weekly_hours} ч/нед).`
        : `Personalized frontend course for «${req.level_title}» (~${req.weekly_hours} h/week).`,
    lessons,
  };
}

export function mockLesson(req: LessonRequest): LessonResponse {
  const lang = req.preferred_language.startsWith("ru") ? "ru" : "en";
  const title = req.lesson_title;
  const ctx = req.verified_context || [];
  const sourceBlock =
    ctx.length > 0
      ? ctx
          .slice(0, 3)
          .map(
            (c) =>
              `- **[${c.ref_index}] ${c.source_name}**: ${(c.title || c.content).slice(0, 120)}…`
          )
          .join("\n")
      : "";
  const sourceRefs = ctx.slice(0, 4).map((c) => ({
    ref_index: c.ref_index,
    excerpt: c.content.slice(0, 120),
  }));

  if (lang === "ru") {
    const grounded =
      ctx.length > 0
        ? `\n\n## Проверенные факты\n\n${ctx
            .slice(0, 3)
            .map(
              (c) =>
                `### ${c.title || c.source_name} [${c.ref_index}]\n\n${c.content.slice(0, 400)}`
            )
            .join("\n\n")}\n\n## Источники\n\n${sourceBlock}`
        : "";

    return {
      theory_markdown: `# ${title}\n\n${req.lesson_summary || "Краткий обзор темы."}\n\n## Зачем это нужно\n\nЭта тема — фундамент для следующих шагов курса **${req.course_title || req.profession_title}**.${grounded}\n\n## Мини-чеклист\n\n- Понял(а) базовые понятия\n- Могу объяснить тему за 1 минуту\n- Знаю, где применить на практике`,
      practice_markdown: `## Практика: ${title}\n\n1. Потратьте 25–40 минут на упражнение по теме.\n2. Сделайте небольшой артефакт (страница, компонент, wireframe или прототип).\n3. Запишите 3 вывода: что сработало, что сложно, что повторить завтра.\n\n### Критерий готовности\n\nМожете показать результат и объяснить решения.`,
      quiz: [
        {
          question: `Какой первый шаг при изучении темы «${title}»?`,
          options: [
            "Сразу делать сложный проект",
            "Понять базовые понятия на простом примере",
            "Пропустить практику",
            "Учить только теорию без примеров",
          ],
          correct_index: 1,
          explanation: "Сначала закрепляем базу на простом примере, затем усложняем.",
        },
        {
          question: "Зачем нужна практика после теории?",
          options: [
            "Чтобы заполнить время",
            "Чтобы проверить понимание на реальном задании",
            "Практика не нужна",
            "Только для портфолио",
          ],
          correct_index: 1,
          explanation: "Практика показывает, что вы реально поняли материал.",
        },
        {
          question: "Что лучше сделать в конце урока?",
          options: [
            "Забыть тему до следующего месяца",
            "Кратко зафиксировать выводы и следующий шаг",
            "Сразу начать другой курс",
            "Удалить рабочие файлы",
          ],
          correct_index: 1,
          explanation: "Короткий рефлект помогает закрепить прогресс.",
        },
      ],
      source_refs: sourceRefs,
      insufficient_context: ctx.length < 3,
    };
  }

  const groundedEn =
    ctx.length > 0
      ? `\n\n## Verified facts\n\n${ctx
          .slice(0, 3)
          .map(
            (c) =>
              `### ${c.title || c.source_name} [${c.ref_index}]\n\n${c.content.slice(0, 400)}`
          )
          .join("\n\n")}\n\n## Sources\n\n${sourceBlock}`
      : "";

  return {
    theory_markdown: `# ${title}\n\n${req.lesson_summary || "Topic overview."}\n\n## Why it matters\n\nThis lesson builds the foundation for **${req.course_title || req.profession_title}**.${groundedEn}\n\n## Checklist\n\n- Understand core concepts\n- Explain the topic in 1 minute\n- Know where to apply it`,
    practice_markdown: `## Practice: ${title}\n\n1. Spend 25–40 minutes on a focused exercise.\n2. Produce a small artifact (page, component, wireframe, or prototype).\n3. Write 3 takeaways: what worked, what was hard, what to repeat tomorrow.\n\n### Done when\n\nYou can demo the result and explain your decisions.`,
    quiz: [
      {
        question: `What is the best first step for «${title}»?`,
        options: [
          "Jump into a complex project",
          "Learn core concepts with a simple example",
          "Skip practice",
          "Only read theory",
        ],
        correct_index: 1,
        explanation: "Start simple, then increase complexity.",
      },
      {
        question: "Why practice after theory?",
        options: [
          "To fill time",
          "To verify understanding on a real task",
          "Practice is optional forever",
          "Only for portfolio screenshots",
        ],
        correct_index: 1,
        explanation: "Practice proves comprehension.",
      },
      {
        question: "What should you do at the end of a lesson?",
        options: [
          "Forget it until next month",
          "Capture takeaways and a next step",
          "Start an unrelated course immediately",
          "Delete all work files",
        ],
        correct_index: 1,
        explanation: "Short reflection locks in progress.",
      },
    ],
    source_refs: sourceRefs,
    insufficient_context: ctx.length < 3,
  };
}

export function mockTutorAnswer(req: TutorRequest): TutorResponse {
  const lang = req.preferred_language.startsWith("ru") ? "ru" : "en";
  const top = req.verified_context.slice(0, 2);
  const citations = top.map((c) => ({
    ref_index: c.ref_index,
    excerpt: c.content.slice(0, 140),
  }));

  if (lang === "ru") {
    const body = top
      .map(
        (c) =>
          `**[${c.ref_index}] ${c.source_name}** — ${c.title || "материал"}: ${c.content.slice(0, 280)}`
      )
      .join("\n\n");
    return {
      answer: `По проверенным материалам:\n\n${body}\n\nЕсли нужен другой аспект темы «${req.lesson_title || "урока"}», уточните вопрос.`,
      citations,
    };
  }

  const body = top
    .map(
      (c) =>
        `**[${c.ref_index}] ${c.source_name}** — ${c.title || "material"}: ${c.content.slice(0, 280)}`
    )
    .join("\n\n");
  return {
    answer: `Based on verified materials:\n\n${body}\n\nAsk a follow-up if you need another angle on «${req.lesson_title || "this lesson"}».`,
    citations,
  };
}

export function mockDailyPlan(req: DailyPlanRequest): DailyPlanResponse {
  const lang = req.preferred_language.startsWith("ru") ? "ru" : "en";
  const minutes = Math.max(30, Math.round(((req.weekly_hours || 10) * 60) / 5));
  const next = req.next_lesson_title;

  if (lang === "ru") {
    return {
      summary: next
        ? `Сегодня фокус на уроке «${next}».`
        : "Сегодня закрепляем пройденное и готовимся к следующему шагу.",
      tasks: [
        {
          title: next ? `Теория: ${next}` : "Повтор ключевых понятий",
          description: "Прочитайте материал и выпишите 5 главных идей.",
          estimated_minutes: Math.round(minutes * 0.4),
        },
        {
          title: "Практика 25 минут",
          description: "Сделайте одно небольшое упражнение без перфекционизма.",
          estimated_minutes: Math.round(minutes * 0.4),
        },
        {
          title: "Рефлексия",
          description: "Запишите, что получилось и что блокирует прогресс.",
          estimated_minutes: Math.max(10, Math.round(minutes * 0.2)),
        },
      ],
    };
  }

  return {
    summary: next
      ? `Today focus: «${next}».`
      : "Reinforce what you learned and prepare the next step.",
    tasks: [
      {
        title: next ? `Theory: ${next}` : "Review key concepts",
        description: "Read the material and list 5 main ideas.",
        estimated_minutes: Math.round(minutes * 0.4),
      },
      {
        title: "Practice sprint",
        description: "Do one small exercise without perfectionism.",
        estimated_minutes: Math.round(minutes * 0.4),
      },
      {
        title: "Reflection",
        description: "Note what worked and what is blocking progress.",
        estimated_minutes: Math.max(10, Math.round(minutes * 0.2)),
      },
    ],
  };
}
