use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct CourseOutlineRequest {
    pub profession_slug: String,
    pub profession_title: String,
    pub level_slug: String,
    pub level_title: String,
    pub level_description: String,
    pub preferred_language: String,
    pub weekly_hours: i32,
}

#[derive(Debug, Deserialize)]
pub struct CourseOutlineResponse {
    pub title: String,
    pub summary: String,
    pub lessons: Vec<OutlineLesson>,
}

#[derive(Debug, Deserialize)]
pub struct OutlineLesson {
    pub title: String,
    pub summary: String,
}

#[derive(Debug, Serialize)]
pub struct LessonGenRequest {
    pub profession_slug: String,
    pub profession_title: String,
    pub level_slug: String,
    pub level_title: String,
    pub preferred_language: String,
    pub lesson_title: String,
    pub lesson_summary: String,
    pub course_title: String,
}

#[derive(Debug, Deserialize)]
pub struct LessonGenResponse {
    pub theory_markdown: String,
    pub practice_markdown: String,
    pub quiz: Vec<QuizGenItem>,
}

#[derive(Debug, Deserialize)]
pub struct QuizGenItem {
    pub question: String,
    pub options: Vec<String>,
    pub correct_index: i32,
    pub explanation: String,
}

#[derive(Debug, Serialize)]
pub struct DailyPlanGenRequest {
    pub profession_slug: String,
    pub profession_title: String,
    pub level_slug: String,
    pub preferred_language: String,
    pub weekly_hours: i32,
    pub completed_lessons: Vec<String>,
    pub next_lesson_title: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DailyPlanGenResponse {
    pub summary: String,
    pub tasks: Vec<DailyTaskGenItem>,
}

#[derive(Debug, Deserialize)]
pub struct DailyTaskGenItem {
    pub title: String,
    pub description: String,
    pub estimated_minutes: i32,
}

#[derive(Clone)]
pub struct AiClient {
    base_url: String,
    http: reqwest::Client,
}

impl AiClient {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            http: reqwest::Client::new(),
        }
    }

    pub async fn generate_course_outline(
        &self,
        req: &CourseOutlineRequest,
    ) -> anyhow::Result<CourseOutlineResponse> {
        let url = format!("{}/generate/course-outline", self.base_url.trim_end_matches('/'));
        let res = self.http.post(url).json(req).send().await?;
        if !res.status().is_success() {
            let body = res.text().await.unwrap_or_default();
            anyhow::bail!("ai-service course-outline failed: {body}");
        }
        Ok(res.json().await?)
    }

    pub async fn generate_lesson(&self, req: &LessonGenRequest) -> anyhow::Result<LessonGenResponse> {
        let url = format!("{}/generate/lesson", self.base_url.trim_end_matches('/'));
        let res = self.http.post(url).json(req).send().await?;
        if !res.status().is_success() {
            let body = res.text().await.unwrap_or_default();
            anyhow::bail!("ai-service lesson failed: {body}");
        }
        Ok(res.json().await?)
    }

    pub async fn generate_daily_plan(
        &self,
        req: &DailyPlanGenRequest,
    ) -> anyhow::Result<DailyPlanGenResponse> {
        let url = format!("{}/generate/daily-plan", self.base_url.trim_end_matches('/'));
        let res = self.http.post(url).json(req).send().await?;
        if !res.status().is_success() {
            let body = res.text().await.unwrap_or_default();
            anyhow::bail!("ai-service daily-plan failed: {body}");
        }
        Ok(res.json().await?)
    }
}
