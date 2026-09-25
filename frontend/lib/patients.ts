// ─── Clinic "Пациенти" section — API helpers ──────────────────────
//
// Cookie/bearer session auth via `credentials: 'include'`, matching
// `lib/clinicChat.ts` — plain `fetch`, not the axios `api` instance
// used on the patient side.

import type { PatientContext } from '@/components/PatientContextSection'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export type CarePassStatus = 'unlocked' | 'eligible' | 'none'

export interface ClinicPatientRow {
  patient_number: number
  lead_id: string
  name: string | null
  phone: string | null
  email: string | null
  city: string | null
  created_at: string | null
  care_pass_status: CarePassStatus
  consultation_count: number
  booking_count: number
  orientation_count: number
  clinic_internal_note_preview: string | null
  // Same compact attribution as the requests list -- see
  // ATTRIBUTION_LIST_VISIBLE_SINCE on the backend for the cutoff.
  source_badge?: PatientContext['source_context']
}

export interface ClinicPatientConsultation {
  id: string
  status: string
  treatment_interest: string | null
  created_at: string | null
  [key: string]: unknown
}

export interface ClinicPatientBooking {
  id: string
  status: string
  treatment_category: string | null
  selected_slot_start: string | null
  selected_slot_start_display?: string | null
  [key: string]: unknown
}

export interface ClinicPatientOrientationBooking {
  id: string
  status: string
  topic: string | null
  topic_label_bg?: string | null
  scheduled_at: string | null
  patient_phone?: string | null
  patient_email?: string | null
  [key: string]: unknown
}

export interface ClinicPatientProfile {
  patient_number: number
  contact: { name: string | null; phone: string | null; email: string | null; city: string | null }
  care_pass: { status: CarePassStatus; eligible: boolean; unlocked: boolean; unlocked_at: string | null }
  quiz_context: PatientContext
  consultations: ClinicPatientConsultation[]
  bookings: ClinicPatientBooking[]
  orientation_bookings: ClinicPatientOrientationBooking[]
  clinic_internal_note: string | null
  clinic_internal_note_updated_at: string | null
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: { code?: string; message?: string } = {}
    try {
      const j = await res.json()
      if (j?.detail && typeof j.detail === 'object') detail = j.detail
      else if (typeof j?.detail === 'string') detail = { message: j.detail }
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

export async function listClinicPatients(): Promise<ClinicPatientRow[]> {
  const res = await fetch(`${API_URL}/api/clinic/patients`, {
    credentials: 'include' as RequestCredentials,
  })
  const j = await asJson<{ patients: ClinicPatientRow[] }>(res)
  return j.patients
}

export async function getClinicPatient(patientNumber: number): Promise<ClinicPatientProfile> {
  const res = await fetch(`${API_URL}/api/clinic/patients/${patientNumber}`, {
    credentials: 'include' as RequestCredentials,
  })
  return asJson<ClinicPatientProfile>(res)
}

export async function updateClinicPatientNote(
  patientNumber: number,
  note: string,
): Promise<{ clinic_internal_note: string; clinic_internal_note_updated_at: string }> {
  const res = await fetch(`${API_URL}/api/clinic/patients/${patientNumber}/note`, {
    method: 'PUT',
    credentials: 'include' as RequestCredentials,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  })
  return asJson(res)
}
