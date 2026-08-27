const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export type Profession = {
  id: string;
  slug: string;
  title: string;
  description: string;
};

export type SkillLevel = {
  id: string;
  slug: string;
  title: string;
  order_index: number;
  description: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
};

export type LessonSummary = {
  id: string;
  course_id: string;
  order_index: number;
  title: string;
  summary: string;
  status: string;
};

export type Course = {
  id: string | null;
  user_id: string;
  title: string;
  summary: string;
  total_lessons: number;
  generation_status: string;
  profession_slug: string;
  profession_title: string;
  level_slug: string;
  level_title: string;
  lessons: LessonSummary[];
};

export type LessonBlock = {
  id: string;
  block_type: string;
  content_markdown: string;
  order_index: number;
};

export type QuizQuestion = {
  id: string;
  order_index: number;
  question: string;
  options: string[];
};

export type LessonDetail = {
  id: string;
  course_id: string;
  order_index: number;
  title: string;
  summary: string;
  status: string;
  blocks: LessonBlock[];
  quiz: QuizQuestion[];
};

export type TodayResponse = {
  plan: { id: string; summary: string; plan_date: string };
  tasks: {
    id: string;
    title: string;
    description: string;
    estimated_minutes: number | null;
    status: string;
  }[];
};

export const api = {
  getProfessions: () => request<Profession[]>('/api/professions'),
  getSkillLevels: () => request<SkillLevel[]>('/api/skill-levels'),
  createUser: (email: string, name?: string) =>
    request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    }),
  onboard: (
    userId: string,
    body: {
      profession_slug: string;
      level_slug: string;
      weekly_hours?: number;
      preferred_language?: string;
    }
  ) =>
    request<{ status: string; job_id: string }>(`/api/users/${userId}/onboard`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getCourse: (userId: string) => request<Course>(`/api/users/${userId}/course`),
  getLesson: (lessonId: string) => request<LessonDetail>(`/api/lessons/${lessonId}`),
  completeLesson: (
    lessonId: string,
    answers: { question_id: string; selected_index: number }[]
  ) =>
    request<{ score: number; total: number; status: string }>(
      `/api/lessons/${lessonId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }
    ),
  getToday: (userId: string) => request<TodayResponse>(`/api/users/${userId}/today`),
  completeTask: (userId: string, taskId: string) =>
    request(`/api/users/${userId}/today/tasks/${taskId}/done`, { method: 'PUT' }),
};
