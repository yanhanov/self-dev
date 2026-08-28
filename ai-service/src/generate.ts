import { Agent, CursorAgentError } from "@cursor/sdk";
import { z } from "zod";
import {
  courseOutlinePrompt,
  dailyPlanPrompt,
  lessonPrompt,
  tutorAnswerPrompt,
} from "./prompts.js";
import {
  mockCourseOutline,
  mockDailyPlan,
  mockLesson,
  mockTutorAnswer,
} from "./mock.js";
import {
  CourseOutlineRequest,
  CourseOutlineResponse,
  CourseOutlineResponseSchema,
  DailyPlanRequest,
  DailyPlanResponse,
  DailyPlanResponseSchema,
  LessonRequest,
  LessonResponse,
  LessonResponseSchema,
  TutorRequest,
  TutorResponse,
  TutorResponseSchema,
} from "./types.js";

function useMock(): boolean {
  if (process.env.USE_MOCK_AI === "true") return true;
  if (!process.env.CURSOR_API_KEY) return true;
  return false;
}

function preview(text: string, max = 500): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** Extract the first balanced JSON object from model text. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("No JSON object found in model response (empty)");
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : trimmed;

  const start = candidate.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in model response");
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1);
        return JSON.parse(slice);
      }
    }
  }

  // Fallback: lastIndexOf for slightly malformed trailing text
  const end = candidate.lastIndexOf("}");
  if (end > start) {
    return JSON.parse(candidate.slice(start, end + 1));
  }

  throw new Error("No JSON object found in model response");
}

function agentOptions() {
  return {
    apiKey: process.env.CURSOR_API_KEY!,
    model: { id: process.env.CURSOR_MODEL || "composer-2.5" },
    local: { cwd: process.cwd() },
  } as const;
}

/**
 * Run a one-shot prompt and collect assistant text from the stream.
 * `result.result` is often empty when the local agent uses tools — stream text is reliable.
 */
async function runPromptForText(prompt: string): Promise<string> {
  await using agent = await Agent.create(agentOptions());
  const run = await agent.send(prompt);
  const parts: string[] = [];

  try {
    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            parts.push(block.text);
          }
        }
      }
    }
  } catch (streamErr) {
    console.warn("run.stream() interrupted:", streamErr);
  }

  const waited = await run.wait();
  if (waited.status === "error") {
    throw new Error(
      waited.error?.message || `Cursor agent run failed: ${waited.id}`
    );
  }
  if (waited.status === "cancelled") {
    throw new Error(`Cursor agent run cancelled: ${waited.id}`);
  }

  const fromResult =
    typeof waited.result === "string" ? waited.result.trim() : "";
  const fromStream = parts.join("").trim();

  // Prefer whichever looks more like JSON; otherwise the longer text.
  const pick = (() => {
    if (fromResult.includes("{") && fromStream.includes("{")) {
      return fromResult.length >= fromStream.length ? fromResult : fromStream;
    }
    if (fromResult.includes("{")) return fromResult;
    if (fromStream.includes("{")) return fromStream;
    return fromResult || fromStream;
  })();

  if (!pick) {
    throw new Error(
      `Empty model response (run ${waited.id}, status=${waited.status})`
    );
  }
  return pick;
}

async function promptJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  label: string
): Promise<T> {
  const text = await runPromptForText(prompt);
  try {
    const parsed = extractJson(text);
    return schema.parse(parsed);
  } catch (firstErr) {
    console.warn(
      `${label}: parse failed (${String(firstErr)}), retrying. preview=`,
      preview(text)
    );

    const repairPrompt = `CRITICAL: Reply with ONLY one valid JSON object. No markdown fences, no commentary, no tools, no files.

Fix / complete this into valid JSON matching the required schema from the previous request:

${text.slice(0, 6000)}
`;

    const repaired = await runPromptForText(repairPrompt);
    try {
      const parsed = extractJson(repaired);
      return schema.parse(parsed);
    } catch (secondErr) {
      console.error(
        `${label}: retry also failed. preview=`,
        preview(repaired)
      );
      throw secondErr;
    }
  }
}

export async function generateCourseOutline(
  req: CourseOutlineRequest
): Promise<CourseOutlineResponse> {
  if (useMock()) {
    return mockCourseOutline(req);
  }

  try {
    return await promptJson(
      courseOutlinePrompt(req),
      CourseOutlineResponseSchema,
      "course-outline"
    );
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(
        "Cursor startup failed:",
        err.message,
        "retryable=",
        err.isRetryable
      );
    } else {
      console.error("Course outline generation failed, falling back to mock:", err);
    }
    return mockCourseOutline(req);
  }
}

export async function generateLesson(
  req: LessonRequest
): Promise<LessonResponse> {
  if (useMock()) {
    return mockLesson(req);
  }

  try {
    const result = await promptJson(
      lessonPrompt(req),
      LessonResponseSchema,
      "lesson"
    );
    return {
      theory_markdown: result.theory_markdown,
      practice_markdown: result.practice_markdown,
      quiz: result.quiz,
      source_refs: (result.source_refs ?? []).map((r) => ({
        ref_index: r.ref_index,
        excerpt: r.excerpt ?? "",
      })),
      insufficient_context: result.insufficient_context ?? false,
    };
  } catch (err) {
    console.error("Lesson generation failed, falling back to mock:", err);
    return mockLesson(req);
  }
}

export async function generateDailyPlan(
  req: DailyPlanRequest
): Promise<DailyPlanResponse> {
  if (useMock()) {
    return mockDailyPlan(req);
  }

  try {
    return await promptJson(
      dailyPlanPrompt(req),
      DailyPlanResponseSchema,
      "daily-plan"
    );
  } catch (err) {
    console.error("Daily plan generation failed, falling back to mock:", err);
    return mockDailyPlan(req);
  }
}

export async function generateTutorAnswer(
  req: TutorRequest
): Promise<TutorResponse> {
  if (useMock()) {
    return mockTutorAnswer(req);
  }

  try {
    const result = await promptJson(
      tutorAnswerPrompt(req),
      TutorResponseSchema,
      "tutor"
    );
    return {
      answer: result.answer,
      citations: (result.citations ?? []).map((c) => ({
        ref_index: c.ref_index,
        excerpt: c.excerpt ?? "",
      })),
    };
  } catch (err) {
    console.error("Tutor answer failed, falling back to mock:", err);
    return mockTutorAnswer(req);
  }
}
