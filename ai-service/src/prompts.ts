import type {
  CourseOutlineRequest,
  DailyPlanRequest,
  LessonRequest,
  TutorRequest,
  VerifiedContextItem,
} from "./types.js";

function truncate(text: string, max = 450): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function formatContext(items: VerifiedContextItem[]): string {
  if (!items.length) return "(none)";
  return items
    .map((item) => {
      const label =
        item.source_name + (item.document_title ? ` — ${item.document_title}` : "");
      const heading = item.title ? `${item.title}. ` : "";
      return `[${item.ref_index}] source: ${label}\n${heading}${truncate(item.content)}`;
    })
    .join("\n\n");
}

const JSON_ONLY_RULES = `IMPORTANT OUTPUT RULES:
- Reply with ONLY one JSON object
- Do NOT wrap in markdown fences
- Do NOT call tools, browse files, or write files
- Do NOT add commentary before or after the JSON`;

export function courseOutlinePrompt(req: CourseOutlineRequest): string {
  return `You are a curriculum designer for SelfDev.

Create a personalized learning COURSE OUTLINE.

Profession: ${req.profession_title} (${req.profession_slug})
Skill level: ${req.level_title} (${req.level_slug})
Level details: ${req.level_description || "n/a"}
Language for all text: ${req.preferred_language}
Weekly hours available: ${req.weekly_hours}

${JSON_ONLY_RULES}

JSON shape:
{
  "title": string,
  "summary": string,
  "lessons": [{"title": string, "summary": string}]
}

Rules:
- 10 to 14 lessons
- Progressive difficulty for the skill level
- Mix theory and practical milestones
- Titles and summaries MUST be in language "${req.preferred_language}"
`;
}

export function lessonPrompt(req: LessonRequest): string {
  const context = formatContext(req.verified_context || []);

  return `You are an expert tutor for SelfDev.

Generate ONE lesson with theory, practice, and quiz Q&A.

Profession: ${req.profession_title} (${req.profession_slug})
Skill level: ${req.level_title} (${req.level_slug})
Course: ${req.course_title || "n/a"}
Lesson title: ${req.lesson_title}
Lesson summary: ${req.lesson_summary || "n/a"}
Language for all text: ${req.preferred_language}

VERIFIED CONTEXT (use ONLY this material for factual claims; do not invent facts):
${context}

${JSON_ONLY_RULES}

JSON shape:
{
  "theory_markdown": string,
  "practice_markdown": string,
  "quiz": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correct_index": number,
      "explanation": string
    }
  ],
  "source_refs": [{"ref_index": number, "excerpt": string}],
  "insufficient_context": boolean
}

Rules:
- theory_markdown: clear teaching content in markdown (600-1200 chars) grounded in VERIFIED CONTEXT; escape newlines as \\n inside the JSON string
- practice_markdown: concrete hands-on tasks the learner can do today
- quiz: 3 to 5 multiple-choice questions, correct_index is 0-based; answers must be checkable against context
- Every factual claim must map to a context item; list used items in source_refs with ref_index
- If VERIFIED CONTEXT is empty or clearly insufficient for this lesson topic, set insufficient_context: true and keep theory brief
- All text MUST be in language "${req.preferred_language}"
`;
}

export function dailyPlanPrompt(req: DailyPlanRequest): string {
  const context = formatContext(req.verified_context || []);

  return `You are a learning coach for SelfDev.

Create a realistic daily plan for today.

Profession: ${req.profession_title} (${req.profession_slug})
Skill level: ${req.level_slug}
Language: ${req.preferred_language}
Weekly hours: ${req.weekly_hours}
Completed lessons: ${req.completed_lessons.join("; ") || "none"}
Next lesson: ${req.next_lesson_title || "none"}

OPTIONAL VERIFIED CONTEXT (prefer tasks that reinforce these topics):
${context}

${JSON_ONLY_RULES}

JSON shape:
{
  "summary": string,
  "tasks": [
    {
      "title": string,
      "description": string,
      "estimated_minutes": number
    }
  ]
}

Rules:
- 2 to 4 tasks
- Total time roughly weekly_hours / 5 minutes (daily share)
- Prefer tasks that advance the next lesson
- All text MUST be in language "${req.preferred_language}"
`;
}

export function tutorAnswerPrompt(req: TutorRequest): string {
  const context = formatContext(req.verified_context);

  return `You are a SelfDev career mentor (not a generic chatbot). Answer using VERIFIED CONTEXT.
Use LEARNER MODEL to personalize: reference weak skills, recent mistakes, and pace.
If the learner repeatedly confuses a concept (e.g. LEFT vs INNER JOIN), say so and give a short remedial challenge.
If the context does not contain the answer, say you do not have verified information and suggest related topics from the context titles.

Language: ${req.preferred_language}
Lesson context (optional): ${req.lesson_title || "n/a"}
LEARNER MODEL:
${req.learner_context || "n/a"}
User question: ${req.message}

VERIFIED CONTEXT:
${context}

${JSON_ONLY_RULES}

JSON shape:
{
  "answer": string,
  "citations": [{"ref_index": number, "excerpt": string}]
}

Rules:
- 2 to 4 short paragraphs in markdown inside the answer string
- Cite sources inline like [1], [2] matching ref_index
- citations must list every ref_index you used
- Do not invent APIs, numbers, or facts not present in context
- Prefer coaching tone tied to the learner's gaps
`;
}
