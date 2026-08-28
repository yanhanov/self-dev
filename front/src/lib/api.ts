const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed?.error) {
      return mapErrorMessage(parsed.error);
    }
  } catch {
    // not JSON
  }
  return mapErrorMessage(raw);
}

function mapErrorMessage(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('not found') || lower.includes('404')) {
    return 'Ничего не найдено. Проверьте, что курс создан.';
  }
  if (lower.includes('insufficient') || lower.includes('базе знаний')) {
    return 'В базе знаний недостаточно материала по этой теме.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Нет связи с сервером. Проверьте, что backend запущен.';
  }
  if (msg.length > 180) {
    return 'Что-то пошло не так. Попробуйте ещё раз.';
  }
  return msg || 'Неизвестная ошибка';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (e) {
    throw new Error(friendlyError(e));
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(friendlyError(new Error(body || `HTTP ${res.status}`)));
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

export type SourceRef = {
  chunk_id?: string;
  source_title: string;
  url: string;
  excerpt: string;
};

export type LessonBlock = {
  id: string;
  block_type: string;
  content_markdown: string;
  order_index: number;
  source_refs?: SourceRef[] | unknown;
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
    lesson_id?: string | null;
  }[];
};

export type TutorCitation = {
  chunk_id: string;
  source_title: string;
  url: string;
  excerpt: string;
};

export type TutorChatResponse = {
  answer: string;
  citations: TutorCitation[];
  confidence: number;
};

export type TutorHistoryItem = {
  id: string;
  role: string;
  content: string;
  citations: TutorCitation[] | unknown;
  lesson_id: string | null;
  created_at: string;
};

export function generationStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Подбираем материалы…';
    case 'generating':
      return 'Составляем курс…';
    case 'ready':
      return 'Готово';
    case 'failed':
      return 'Ошибка генерации';
    default:
      return status;
  }
}

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
  tutorChat: (userId: string, message: string, lessonId?: string) =>
    request<TutorChatResponse>(`/api/users/${userId}/tutor/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, lesson_id: lessonId }),
    }),
  tutorHistory: (userId: string, lessonId?: string) => {
    const q = new URLSearchParams({ limit: '20' });
    if (lessonId) q.set('lesson_id', lessonId);
    return request<TutorHistoryItem[]>(`/api/users/${userId}/tutor/history?${q}`);
  },
};
