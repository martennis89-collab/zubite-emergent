// Patient accounts client (Общност Phase 1 — OTP-only, passwordless).
//
// Mirrors the clinic-portal auth model: the server sets an httpOnly session
// cookie; we never persist tokens to localStorage. Every call uses
// `credentials: 'include'` so the cookie rides along.

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface PatientMe {
  id: string
  email: string
  email_verified: boolean
  display_name?: string | null
  city_slug?: string | null
  reputation: number
  created_at?: string | null
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    const detail = data?.detail
    if (typeof detail === 'string') return detail
  } catch {
    /* noop */
  }
  return fallback
}

/** Step 1 — email a 6-digit login code. Enumeration-safe (always "sent"). */
export async function requestOtp(email: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/patient/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
    credentials: 'include' as RequestCredentials,
  })
  if (!res.ok) {
    throw new Error(await parseError(res, 'Неуспешно изпращане на код'))
  }
}

/** Step 2 — exchange the code for a session. Sets the httpOnly cookie.
 *  `claimLeadId`, when passed, asks the backend to link that specific lead
 *  to this account even if it has no email yet (see SaveResultBanner). */
export async function verifyOtp(email: string, code: string, claimLeadId?: string): Promise<PatientMe> {
  const res = await fetch(`${API_URL}/api/patient/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
      ...(claimLeadId ? { claim_lead_id: claimLeadId } : {}),
    }),
    credentials: 'include' as RequestCredentials,
  })
  if (!res.ok) {
    throw new Error(await parseError(res, 'Невалиден или изтекъл код'))
  }
  const data = await res.json()
  return data.user as PatientMe
}

/** Current patient, or null if not logged in. */
export async function getMe(): Promise<PatientMe | null> {
  const res = await fetch(`${API_URL}/api/patient/me`, {
    credentials: 'include' as RequestCredentials,
  })
  if (res.status === 401 || res.status === 403) return null
  if (!res.ok) throw new Error(await parseError(res, 'Грешка при зареждане на профила'))
  return (await res.json()) as PatientMe
}

/** Update display name / city. */
export async function updateMe(patch: {
  display_name?: string
  city_slug?: string
}): Promise<PatientMe> {
  const res = await fetch(`${API_URL}/api/patient/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
    credentials: 'include' as RequestCredentials,
  })
  if (!res.ok) throw new Error(await parseError(res, 'Неуспешно записване'))
  return (await res.json()) as PatientMe
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/patient/auth/logout`, {
    method: 'POST',
    credentials: 'include' as RequestCredentials,
  })
}
