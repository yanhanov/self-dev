import express from "express";
import {
  generateCourseOutline,
  generateDailyPlan,
  generateLesson,
  generateTutorAnswer,
} from "./generate.js";
import {
  CourseOutlineRequestSchema,
  DailyPlanRequestSchema,
  LessonRequestSchema,
  TutorRequestSchema,
} from "./types.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    mock: process.env.USE_MOCK_AI === "true" || !process.env.CURSOR_API_KEY,
  });
});

app.post("/generate/course-outline", async (req, res) => {
  try {
    const body = CourseOutlineRequestSchema.parse(req.body);
    const result = await generateCourseOutline(body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: String(err) });
  }
});

app.post("/generate/lesson", async (req, res) => {
  try {
    const body = LessonRequestSchema.parse(req.body);
    const result = await generateLesson(body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: String(err) });
  }
});

app.post("/generate/daily-plan", async (req, res) => {
  try {
    const body = DailyPlanRequestSchema.parse(req.body);
    const result = await generateDailyPlan(body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: String(err) });
  }
});

app.post("/generate/tutor-answer", async (req, res) => {
  try {
    const body = TutorRequestSchema.parse(req.body);
    const result = await generateTutorAnswer(body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: String(err) });
  }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, "0.0.0.0", () => {
  console.log(`ai-service listening on ${port}`);
});
