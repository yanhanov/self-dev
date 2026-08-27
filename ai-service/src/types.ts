import { z } from "zod";

export const CourseOutlineRequestSchema = z.object({
  profession_slug: z.string(),
  profession_title: z.string(),
  level_slug: z.string(),
  level_title: z.string(),
  level_description: z.string().optional().default(""),
  preferred_language: z.string().default("ru"),
  weekly_hours: z.number().int().positive().optional().default(10),
});

export type CourseOutlineRequest = z.infer<typeof CourseOutlineRequestSchema>;

export const CourseOutlineResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  lessons: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
      })
    )
    .min(8)
    .max(16),
});

export type CourseOutlineResponse = z.infer<typeof CourseOutlineResponseSchema>;

export const LessonRequestSchema = z.object({
  profession_slug: z.string(),
  profession_title: z.string(),
  level_slug: z.string(),
  level_title: z.string(),
  preferred_language: z.string().default("ru"),
  lesson_title: z.string(),
  lesson_summary: z.string().optional().default(""),
  course_title: z.string().optional().default(""),
});

export type LessonRequest = z.infer<typeof LessonRequestSchema>;

export const LessonResponseSchema = z.object({
  theory_markdown: z.string(),
  practice_markdown: z.string(),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(2).max(5),
        correct_index: z.number().int().min(0),
        explanation: z.string(),
      })
    )
    .min(3)
    .max(5),
});

export type LessonResponse = z.infer<typeof LessonResponseSchema>;

export const DailyPlanRequestSchema = z.object({
  profession_slug: z.string(),
  profession_title: z.string(),
  level_slug: z.string(),
  preferred_language: z.string().default("ru"),
  weekly_hours: z.number().int().positive().optional().default(10),
  completed_lessons: z.array(z.string()).default([]),
  next_lesson_title: z.string().optional(),
});

export type DailyPlanRequest = z.infer<typeof DailyPlanRequestSchema>;

export const DailyPlanResponseSchema = z.object({
  summary: z.string(),
  tasks: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        estimated_minutes: z.number().int().positive(),
      })
    )
    .min(2)
    .max(4),
});

export type DailyPlanResponse = z.infer<typeof DailyPlanResponseSchema>;
