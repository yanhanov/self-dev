import { Agent, CursorAgentError } from "@cursor/sdk";
import { z } from "zod";
import {
  courseOutlinePrompt,
  dailyPlanPrompt,
  lessonPrompt,
} from "./prompts.js";
import { mockCourseOutline, mockDailyPlan, mockLesson } from "./mock.js";
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
} from "./types.js";

function useMock(): boolean {
  if (process.env.USE_MOCK_AI === "true") return true;
  if (!process.env.CURSOR_API_KEY) return true;
  return false;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function promptJson<T>(
  prompt: string,
  schema: z.ZodType<T>
): Promise<T> {
  const apiKey = process.env.CURSOR_API_KEY!;
  const result = await Agent.prompt(prompt, {
    apiKey,
    model: { id: process.env.CURSOR_MODEL || "composer-2.5" },
    local: { cwd: process.cwd() },
  });

  if (result.status === "error") {
    throw new Error(`Cursor agent run failed: ${result.id}`);
  }

  const text =
    typeof result.result === "string"
      ? result.result
      : JSON.stringify(result.result);

  const parsed = extractJson(text);
  return schema.parse(parsed);
}

export async function generateCourseOutline(
  req: CourseOutlineRequest
): Promise<CourseOutlineResponse> {
  if (useMock()) {
    return mockCourseOutline(req);
  }

  try {
    return await promptJson(courseOutlinePrompt(req), CourseOutlineResponseSchema);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error("Cursor startup failed:", err.message, "retryable=", err.isRetryable);
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
    return await promptJson(lessonPrompt(req), LessonResponseSchema);
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
    return await promptJson(dailyPlanPrompt(req), DailyPlanResponseSchema);
  } catch (err) {
    console.error("Daily plan generation failed, falling back to mock:", err);
    return mockDailyPlan(req);
  }
}
