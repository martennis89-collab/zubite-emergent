// ─── Clinic consultation chat — API helpers ───────────────────────
//
// Cookie/bearer session auth via `credentials: 'include'`, matching
// `app/clinic/dashboard/online-orientation/page.tsx` — plain `fetch`,
// not the axios `api` instance used on the patient side.

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

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

export interface ChatListRow {
  id: string
  patient_name: string
  status: string
  last_message_at: string | null
  unread: number
}

export interface ChatThread {
  chat: { id: string; status: string; patient_name: string }
  /** Same shape PatientContextSection already renders for consultation
   *  requests — null when the patient skipped the quiz (quick-chat). */
  patient_context: import('@/components/PatientContextSection').PatientContext | null
  messages: ChatMessage[]
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: { code?: string; message?: string } = {}
    try {
      const j = await res.json()
      if (j?.detail && typeof j.detail === 'object') detail = j.detail
    } catch {
      /* keep empty */
    }
    const err = new Error(detail.message || 'Заявката не бе изпълнена.') as Error & {
      code?: string
      status?: number
    }
    err.code = detail.code
    err.status = res.status
    throw err
  }
  return res.json()
}

export async function listClinicChats(): Promise<ChatListRow[]> {
  const res = await fetch(`${API_URL}/api/clinic/chats`, {
    credentials: 'include' as RequestCredentials,
  })
  const j = await asJson<{ chats: ChatListRow[] }>(res)
  return j.chats
}

export async function getClinicChatThread(chatId: string): Promise<ChatThread> {
  const res = await fetch(`${API_URL}/api/clinic/chats/${chatId}`, {
    credentials: 'include' as RequestCredentials,
  })
  return asJson<ChatThread>(res)
}

export async function sendClinicChatMessage(
  chatId: string,
  body: string,
  attachmentIds: string[] = [],
): Promise<ChatMessage> {
  const res = await fetch(`${API_URL}/api/clinic/chats/${chatId}/messages`, {
    method: 'POST',
    credentials: 'include' as RequestCredentials,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, attachment_ids: attachmentIds }),
  })
  const j = await asJson<{ message: ChatMessage }>(res)
  return j.message
}

export async function uploadClinicChatFile(
  chatId: string,
  file: File,
): Promise<ChatAttachment> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_URL}/api/clinic/chats/${chatId}/files`, {
    method: 'POST',
    credentials: 'include' as RequestCredentials,
    body: form,
  })
  return asJson<ChatAttachment>(res)
}

/** Requires the cookie session, unlike the patient side's token-in-URL
 *  file link — can't be dropped into a bare <img src> across origins
 *  without credentials, but same-origin <img> requests DO send cookies
 *  by default, so this works the same way in practice. */
export function clinicChatFileUrl(chatId: string, fileId: string): string {
  return `${API_URL}/api/clinic/chats/${chatId}/files/${fileId}`
}
