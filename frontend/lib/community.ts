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
  excerpt: string
  asker_display: string | null
  answer_count: number
  upvotes: number
  has_upvoted: boolean
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

export interface QuestionPhoto {
  id: string
  content_type: string
}

export interface QuestionDetail extends QuestionListItem {
  body: string
  topic_related_path: string | null
  answers: Answer[]
  can_answer: boolean
  photos: QuestionPhoto[]
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

export interface SpotlightClinic {
  id: string
  slug: string | null
  name: string | null
  city_slug: string | null
  city_name: string | null
  area: string | null
  specialty_slug: string
  short_description: string | null
  patient_intro: string | null
  hero_image_url: string | null
  treatment_focus: string[] | null
  years_in_business: number | null
  online_consultation: boolean
  accepts_adults: boolean | null
  accepts_children: boolean | null
  profile_information_reviewed: boolean
  rotation_date: string
}

/** "Клиника на деня" — deterministic daily pick, see backend/routers/
 *  community.py's get_spotlight. Returns null when nothing is eligible;
 *  callers should render nothing rather than an empty placeholder. */
export async function getSpotlight(): Promise<SpotlightClinic | null> {
  const res = await fetch(`${API_URL}/api/community/spotlight`, { cache: 'no-store' })
  if (!res.ok) return null
  const d = await res.json()
  return d.clinic ?? null
}

export interface CommunityArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  featured_image: string | null
  published_at: string
}

/** Recent expert-reviewed reading for the community landing page. */
export async function listRecentArticles(limit = 3): Promise<CommunityArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/blog/posts?limit=${limit}`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.posts) ? data.posts.slice(0, limit) : []
  } catch {
    return []
  }
}

export async function listQuestions(params: {
  topic?: string
  q?: string
  sort?: 'new' | 'top'
  limit?: number
  offset?: number
} = {}): Promise<QuestionListResponse> {
  const qs = new URLSearchParams()
  if (params.topic) qs.set('topic', params.topic)
  if (params.q) qs.set('q', params.q)
  if (params.sort) qs.set('sort', params.sort)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const res = await fetch(`${API_URL}/api/community/questions?${qs.toString()}`, {
    cache: 'no-store',
    credentials: 'include' as RequestCredentials,
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

/** Public URL for a question photo. Serves publicly once the question is
 *  published; while pending, only the owning patient's session can fetch
 *  it (same-origin `/api` proxy carries the cookie on the <img> request).
 *
 *  Deliberately does NOT use the module-level `API_URL` (server/client-aware
 *  `resolveApiUrl()`) — this function's result is embedded in rendered HTML
 *  for the BROWSER to request independently (an <img src>), including when
 *  called from a server component during SSR. Using the server-side
 *  INTERNAL_API_URL there would bake the Docker-internal hostname
 *  (`http://backend:8001`) into the page, which the browser can never
 *  reach. Always resolve against the public var so the result is either a
 *  browser-reachable absolute URL or a same-origin relative `/api/...`
 *  path that Next's rewrite proxies through — correct in both contexts. */
export function questionPhotoUrl(questionId: string, photoId: string): string {
  const publicBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')
  return `${publicBase}/api/community/questions/${encodeURIComponent(questionId)}/photos/${encodeURIComponent(photoId)}`
}

export interface UploadedPhoto {
  id: string
  content_type: string
  size: number
}

/** Always called AFTER askQuestion() already succeeded — a failed upload
 *  here never implies the question itself failed to post. */
export async function uploadQuestionPhoto(questionId: string, file: File): Promise<UploadedPhoto> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(
    `${API_URL}/api/community/questions/${encodeURIComponent(questionId)}/photos`,
    { method: 'POST', body: form, credentials: 'include' as RequestCredentials },
  )
  if (res.status === 401 || res.status === 403) throw new Error('AUTH_REQUIRED')
  if (!res.ok) throw new Error(await parseError(res, 'Неуспешно качване на снимка'))
  return (await res.json()) as UploadedPhoto
}

/** Toggle an upvote ("и аз имам този въпрос") on a question. */
export async function upvoteQuestion(questionId: string): Promise<{ upvoted: boolean }> {
  const res = await fetch(
    `${API_URL}/api/community/questions/${encodeURIComponent(questionId)}/upvote`,
    { method: 'POST', credentials: 'include' as RequestCredentials },
  )
  if (res.status === 401 || res.status === 403) throw new Error('AUTH_REQUIRED')
  if (!res.ok) throw new Error(await parseError(res, 'Неуспешно гласуване'))
  return (await res.json()) as { upvoted: boolean }
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
