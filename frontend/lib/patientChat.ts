// ─── Patient consultation chat — API helpers ──────────────────────
//
// Bypasses the shared `api` axios instance's baseURL, same as
// `getLead`/`getRecommendedClinics` in lib/api.ts — it drops the `/api`
// prefix when NEXT_PUBLIC_API_URL is a full domain in preview.
//
// Auth model: the patient holds a magic-link `access_token` (same
// mechanism as /patient-orientation/{token}), minted via
// `mintChatAccessToken(leadId)` once the results page's own unlock gate
// has passed. The token is treated as a bearer credential embedded in
// the URL path — including for file URLs, which is why `chatFileUrl`
// below is safe to use directly as an <img src>.

import axios from 'axios'

const base = () => process.env.NEXT_PUBLIC_API_URL || ''

export interface ChatAttachment {
  id: string
  filename: string | null
  content_type: string | null
  size: number | null
}

export interface ChatMessage {
  id: string
  sender: 'patient' | 'clinic'
  body: string
  created_at: string
  attachments: ChatAttachment[]
}

export interface ChatThread {
  chat: { id: string; status: string } | null
  messages: ChatMessage[]
}

export interface ChatApiError {
  code?: string
  message?: string
}

/** Extract the backend's structured error, falling back to a generic one. */
export function readChatError(err: unknown): ChatApiError {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (detail && typeof detail === 'object') {
      return { code: detail.code, message: detail.message }
    }
    if (err.response?.status === 429) {
      return { message: 'Твърде много опити. Опитайте отново след малко.' }
    }
  }
  return { message: 'Възникна грешка. Опитайте отново.' }
}

export async function mintChatAccessToken(
  leadId: string,
): Promise<{ access_token: string; expires_at: string }> {
  const res = await axios.post(`${base()}/api/leads/${leadId}/chat-access-token`)
  return res.data
}

const QUICK_LEAD_CACHE_KEY = 'zubite_quick_chat_lead_id'

/** The quick-chat lead created for a visitor with no quiz history, if
 *  this browser tab already made one this session — reused across
 *  different clinic profiles so it's one identity, not one per clinic. */
export function getCachedQuickChatLeadId(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(QUICK_LEAD_CACHE_KEY)
}

/** Bootstraps a lead for a visitor who never took the quiz — just a
 *  name, no quiz answers behind it. Caches both the lead id and its
 *  token so a later `getOrMintChatAccessToken(lead_id)` call (e.g. on a
 *  different clinic's profile) reuses this identity instead of minting
 *  a new lead every time chat opens. */
export async function createQuickChatLead(
  name: string,
): Promise<{ lead_id: string; access_token: string }> {
  const res = await axios.post(`${base()}/api/leads/quick-chat`, { name })
  const { lead_id, access_token } = res.data
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(QUICK_LEAD_CACHE_KEY, lead_id)
    window.sessionStorage.setItem(TOKEN_CACHE_PREFIX + lead_id, access_token)
  }
  return { lead_id, access_token }
}

export async function getClinicChat(
  accessToken: string,
  clinicId: string,
): Promise<ChatThread> {
  const res = await axios.get(
    `${base()}/api/patient-chat/${encodeURIComponent(accessToken)}/clinics/${clinicId}`,
  )
  return res.data
}

export async function sendChatMessage(
  accessToken: string,
  clinicId: string,
  body: string,
  attachmentIds: string[] = [],
): Promise<ChatMessage> {
  const res = await axios.post(
    `${base()}/api/patient-chat/${encodeURIComponent(accessToken)}/clinics/${clinicId}/messages`,
    { body, attachment_ids: attachmentIds },
  )
  return res.data.message
}

export async function uploadChatFile(
  accessToken: string,
  clinicId: string,
  file: File,
): Promise<ChatAttachment> {
  const form = new FormData()
  form.append('file', file)
  const res = await axios.post(
    `${base()}/api/patient-chat/${encodeURIComponent(accessToken)}/clinics/${clinicId}/files`,
    form,
  )
  return res.data
}

/** Direct, viewable URL for a chat attachment — the token in the path
 *  IS the auth, so this can be dropped straight into an <img src>. */
export function chatFileUrl(accessToken: string, fileId: string): string {
  return `${base()}/api/patient-chat/${encodeURIComponent(accessToken)}/files/${fileId}`
}

const TOKEN_CACHE_PREFIX = 'zubite_chat_token_'

/** Session-scoped cache so re-opening the panel during one visit doesn't
 *  mint a fresh `lead_access_tokens` row every time — the backend never
 *  reuses an existing one (it only ever stores the hash), so repeated
 *  minting is otherwise unbounded for the lifetime of one browser tab. */
export async function getOrMintChatAccessToken(leadId: string): Promise<string> {
  if (typeof window !== 'undefined') {
    const cached = window.sessionStorage.getItem(TOKEN_CACHE_PREFIX + leadId)
    if (cached) return cached
  }
  const { access_token } = await mintChatAccessToken(leadId)
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(TOKEN_CACHE_PREFIX + leadId, access_token)
  }
  return access_token
}
