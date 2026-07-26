function resolveApiUrl(): string {
  const isServer = typeof window === 'undefined'
  const raw = isServer
    ? process.env.INTERNAL_API_URL || process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || ''
    : process.env.NEXT_PUBLIC_API_URL || ''
  return raw.replace(/\/+$/, '')
}

const API_URL = resolveApiUrl()

export type RecognitionPhoto = {
  id: string
  kind: 'before' | 'after'
  content_type?: string
}

export type RecognitionEntry = {
  id: string
  message: string
  display_name: string
  treatment_label?: string | null
  clinic_name?: string | null
  photo_layout: 'none' | 'after_only' | 'before_after'
  photos: RecognitionPhoto[]
  published_at?: string | null
}

export async function listRecognition(): Promise<RecognitionEntry[]> {
  const response = await fetch(`${API_URL}/api/recognition`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Не успяхме да заредим благодарностите.')
  const data = await response.json()
  return data.entries || []
}

/** Published Wall of Recognition entries tagged to one clinic — backs
 *  PublicRecognitionSection on the clinic profile page. Returns an empty
 *  list (never throws) on any non-ok response so a fetch hiccup can't
 *  break the rest of the profile — matches PublicReviewsSection's
 *  fail-soft convention for the same page. */
export async function listClinicRecognition(clinicId: string): Promise<RecognitionEntry[]> {
  try {
    const response = await fetch(
      `${API_URL}/api/public/clinics/${encodeURIComponent(clinicId)}/recognition`,
      { cache: 'no-store' },
    )
    if (!response.ok) return []
    const data = await response.json()
    return data.entries || []
  } catch {
    return []
  }
}

export async function createRecognition(payload: {
  message: string
  display_name?: string
  treatment_label?: string
  clinic_id?: string | null
  photo_layout: RecognitionEntry['photo_layout']
  consent_public_display: boolean
}): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/recognition`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (response.status === 401 || response.status === 403) throw new Error('AUTH_REQUIRED')
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Историята не беше изпратена.')
  }
  return response.json()
}

export async function uploadRecognitionPhoto(
  entryId: string,
  kind: RecognitionPhoto['kind'],
  file: File,
): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(
    `${API_URL}/api/recognition/${encodeURIComponent(entryId)}/photos?kind=${kind}`,
    { method: 'POST', credentials: 'include', body: form },
  )
  if (!response.ok) throw new Error('Снимката не беше качена.')
}

export function recognitionPhotoUrl(entryId: string, photoId: string): string {
  const publicBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')
  return `${publicBase}/api/recognition/${encodeURIComponent(entryId)}/photos/${encodeURIComponent(photoId)}`
}
