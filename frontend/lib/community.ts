// Общност (Q&A) client — Phase 2.
//
// Browse calls (topics / questions / single) are public and run either
// server-side (SSR for SEO) or client-side, so they resolve the API base the
// same way the public-clinics lib does. Ask / report are patient-authed and
// run only in the browser with the session cookie.

function resolveApiUrl(): string {
  const isServer = typeof window === 'undefined'
  const raw = isServer
    ? process.env.INTERNAL_API_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      ''
    : process.env.NEXT_PUBLIC_API_URL || ''
  return raw.replace(/\/+$/, '')
}

const API_URL = resolveApiUrl()

export interface CommunityTopic {
  slug: string
  label: string
  description: string
  related_path: string | null
  question_count: number
}

export interface QuestionListItem {
  id: string
  slug: string
  topic: string
  topic_label: string | null
  title: string
  asker_display: string | null
  answer_count: number
  created_at: string | null
  published_at: string | null
}

export interface Answer {
  id: string
  author_type: 'clinic' | 'patient'
  author_display: string | null
  is_expert: boolean
  body: string
  upvotes: number
  created_at: string | null
  has_upvoted: boolean
}

export interface QuestionDetail extends QuestionListItem {
  body: string
  topic_related_path: string | null
  answers: Answer[]
  can_answer: boolean
}

export interface QuestionListResponse {
  total: number
  limit: number
  offset: number
  items: QuestionListItem[]
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const d = await res.json()
    if (typeof d?.detail === 'string') return d.detail
  } catch {
    /* noop */
  }
  return fallback
}

// ── Public browse (SSR-safe) ──────────────────────────────────────

export async function listTopics(): Promise<CommunityTopic[]> {
  const res = await fetch(`${API_URL}/api/community/topics`, { cache: 'no-store' })
  if (!res.ok) return []
  const d = await res.json()
  return d.topics as CommunityTopic[]
}

export async function listQuestions(params: {
  topic?: string
  sort?: 'new' | 'top'
  limit?: number
  offset?: number
} = {}): Promise<QuestionListResponse> {
  const q = new URLSearchParams()
  if (params.topic) q.set('topic', params.topic)
  if (params.sort) q.set('sort', params.sort)
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  const res = await fetch(`${API_URL}/api/community/questions?${q.toString()}`, {
    cache: 'no-store',
  })
  if (!res.ok) return { total: 0, limit: params.limit ?? 20, offset: params.offset ?? 0, items: [] }
  return (await res.json()) as QuestionListResponse
}

export async function getQuestion(slug: string): Promise<QuestionDetail | null> {
  const res = await fetch(`${API_URL}/api/community/questions/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) return null
  return (await res.json()) as QuestionDetail
}

// ── Patient-authed actions (browser only) ─────────────────────────

export interface AskResult {
  success: boolean
  id: string
  slug: string
  message: string
  emergency?: { title: string; message: string }
}

export async function askQuestion(payload: {
  topic: string
  title: string
  body: string
}): Promise<AskResult> {
  const res = await fetch(`${API_URL}/api/community/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include' as RequestCredentials,
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_REQUIRED')
  }
  if (!res.ok) throw new Error(await parseError(res, 'Неуспешно изпращане на въпроса'))
  return (await res.json()) as AskResult
}

export async function reportQuestion(questionId: string, reason: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/community/questions/${encodeURIComponent(questionId)}/report`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
      credentials: 'include' as RequestCredentials,
    },
  )
  if (!res.ok) throw new Error(await parseError(res, 'Неуспешно подаване на сигнал'))
}

/** Post a peer (patient) answer. One per patient per question. */
export async function createPeerAnswer(questionId: string, body: string): Promise<{ id: string }> {
  const res = await fetch(
    `${API_URL}/api/community/questions/${encodeURIComponent(questionId)}/answers`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
      credentials: 'include' as RequestCredentials,
    },
  )
  if (res.status === 401 || res.status === 403) throw new Error('AUTH_REQUIRED')
  if (!res.ok) throw new Error(await parseError(res, 'Неуспешно изпращане на отговора'))
  return (await res.json()) as { id: string }
}

/** Toggle an upvote ("това ми помогна") on an answer. Returns the new state. */
export async function upvoteAnswer(answerId: string): Promise<{ upvoted: boolean }> {
  const res = await fetch(`${API_URL}/api/community/answers/${encodeURIComponent(answerId)}/upvote`, {
    method: 'POST',
    credentials: 'include' as RequestCredentials,
  })
  if (res.status === 401 || res.status === 403) throw new Error('AUTH_REQUIRED')
  if (!res.ok) throw new Error(await parseError(res, 'Неуспешно гласуване'))
  return (await res.json()) as { upvoted: boolean }
}

export async function reportAnswer(answerId: string, reason: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/community/answers/${encodeURIComponent(answerId)}/report`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
      credentials: 'include' as RequestCredentials,
    },
  )
  if (res.status === 401 || res.status === 403) throw new Error('AUTH_REQUIRED')
  if (!res.ok) throw new Error(await parseError(res, 'Неуспешно подаване на сигнал'))
}

// ── /profile data: notifications + "my activity" ──────────────────

export interface CommunityNotification {
  id: string
  type: 'answer_received'
  question_id: string
  question_slug: string
  question_title: string
  answerer_display: string
  is_expert: boolean
  read: boolean
  created_at: string
}

export interface MyQuestion {
  id: string
  slug: string
  title: string
  status: 'pending' | 'published' | 'rejected'
  topic: string
  answer_count: number
  created_at: string | null
}

export interface MyAnswer {
  id: string
  question_id: string
  question_slug: string | null
  question_title: string | null
  status: string
  upvotes: number
  created_at: string | null
}

export async function getNotifications(): Promise<{ items: CommunityNotification[]; unread_count: number }> {
  const res = await fetch(`${API_URL}/api/patient/community/notifications`, {
    credentials: 'include' as RequestCredentials,
  })
  if (!res.ok) return { items: [], unread_count: 0 }
  return await res.json()
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`${API_URL}/api/patient/community/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    credentials: 'include' as RequestCredentials,
  })
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${API_URL}/api/patient/community/notifications/read-all`, {
    method: 'POST',
    credentials: 'include' as RequestCredentials,
  })
}

export async function getMyActivity(): Promise<{ questions: MyQuestion[]; answers: MyAnswer[] }> {
  const res = await fetch(`${API_URL}/api/patient/community/mine`, {
    credentials: 'include' as RequestCredentials,
  })
  if (!res.ok) return { questions: [], answers: [] }
  return await res.json()
}
