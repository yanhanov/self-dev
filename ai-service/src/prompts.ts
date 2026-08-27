import type {
  CourseOutlineRequest,
  DailyPlanRequest,
  LessonRequest,
} from "./types.js";

export function courseOutlinePrompt(req: CourseOutlineRequest): string {
  return `You are a curriculum designer for SelfDev.

Create a personalized learning COURSE OUTLINE.

Profession: ${req.profession_title} (${req.profession_slug})
Skill level: ${req.level_title} (${req.level_slug})
Level details: ${req.level_description || "n/a"}
Language for all text: ${req.preferred_language}
Weekly hours available: ${req.weekly_hours}

Return ONLY valid JSON (no markdown fences) matching this shape:
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
  return `You are an expert tutor for SelfDev.

Generate ONE lesson with theory, practice, and quiz Q&A.

Profession: ${req.profession_title} (${req.profession_slug})
Skill level: ${req.level_title} (${req.level_slug})
Course: ${req.course_title || "n/a"}
Lesson title: ${req.lesson_title}
Lesson summary: ${req.lesson_summary || "n/a"}
Language for all text: ${req.preferred_language}

Return ONLY valid JSON (no markdown fences) matching this shape:
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
  ]
}

Rules:
- theory_markdown: clear teaching content in markdown (800-1500 chars)
- practice_markdown: concrete hands-on tasks the learner can do today
- quiz: 3 to 5 multiple-choice questions, correct_index is 0-based
- All text MUST be in language "${req.preferred_language}"
`;
}

export function dailyPlanPrompt(req: DailyPlanRequest): string {
  return `You are a learning coach for SelfDev.

Create a realistic daily plan for today.

Profession: ${req.profession_title} (${req.profession_slug})
Skill level: ${req.level_slug}
Language: ${req.preferred_language}
Weekly hours: ${req.weekly_hours}
Completed lessons: ${req.completed_lessons.join("; ") || "none"}
Next lesson: ${req.next_lesson_title || "none"}

Return ONLY valid JSON (no markdown fences) matching this shape:
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
