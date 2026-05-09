// Shared labels and helpers for the consultation workflow UI.

export const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  new:                { label: 'Нова',                  cls: 'bg-slate-100 text-slate-700' },
  assigned:           { label: 'Назначена',             cls: 'bg-sky-100 text-sky-700' },
  clinic_viewed:      { label: 'Видяна',                cls: 'bg-sky-100 text-sky-700' },
  call_attempted:     { label: 'Опит за обаждане',      cls: 'bg-amber-100 text-amber-800' },
  patient_contacted:  { label: 'Свързано с пациента',   cls: 'bg-amber-100 text-amber-800' },
  no_answer:          { label: 'Без отговор',           cls: 'bg-amber-100 text-amber-800' },
  booked:             { label: 'Резервирана',           cls: 'bg-emerald-100 text-emerald-700' },
  rescheduled:        { label: 'Преместена',            cls: 'bg-amber-100 text-amber-800' },
  patient_declined:   { label: 'Пациентът отказа',      cls: 'bg-rose-100 text-rose-700' },
  not_suitable:       { label: 'Неподходяща',           cls: 'bg-rose-100 text-rose-700' },
  attended:           { label: 'Посетила',              cls: 'bg-emerald-100 text-emerald-700' },
  no_show:            { label: 'Не се яви',             cls: 'bg-rose-100 text-rose-700' },
  cancelled:          { label: 'Отменена',              cls: 'bg-slate-100 text-slate-500' },
  expired:            { label: 'Изтекла',               cls: 'bg-slate-100 text-slate-500' },
  disputed:           { label: 'В спор',                cls: 'bg-rose-100 text-rose-700' },
}

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  orthodontic_consultation: 'Ортодонтия',
  invisalign_consultation: 'Invisalign',
  braces_consultation: 'Брекети',
  implant_consultation: 'Имплант',
  cosmetic_consultation: 'Естетика',
  full_mouth_rehab_consultation: 'Цяла уста',
  general_consultation: 'Обща',
}

export const TREATMENT_LABELS: Record<string, string> = {
  aligners: 'Алайнъри',
  braces: 'Брекети',
  implants: 'Импланти',
  invisalign: 'Invisalign',
  orthodontics: 'Ортодонтия',
  master_quiz: 'Основен тест',
  'cosmetic-dentistry': 'Естетика',
  full_mouth: 'Цяла уста',
  general: 'Обща',
}

export const ACTION_LABELS: Record<string, string> = {
  mark_viewed: 'Отбележи като видяна',
  call_attempted: 'Опит за обаждане',
  patient_contacted: 'Свързано с пациента',
  no_answer: 'Без отговор',
  book_consultation: 'Резервирай консултация',
  reschedule: 'Премести',
  patient_declined: 'Пациентът отказа',
  not_suitable: 'Неподходяща',
  mark_attended: 'Отбележи посетила',
  mark_no_show: 'Не се яви',
  cancel: 'Отмени',
}

export const EVENT_LABELS: Record<string, string> = {
  assigned_to_clinic: 'Назначена към клиниката',
  reassigned_to_clinic: 'Преназначена към клиниката',
  clinic_viewed_request: 'Клиниката видя заявката',
  call_attempted: 'Опит за обаждане',
  patient_contacted: 'Свързано с пациента',
  no_answer: 'Без отговор',
  appointment_booked: 'Резервирана консултация',
  appointment_rescheduled: 'Преместена консултация',
  patient_declined: 'Пациентът отказа',
  marked_not_suitable: 'Маркирана като неподходяща',
  marked_attended: 'Посетила консултацията',
  marked_no_show: 'Не се яви',
  cancelled: 'Отменена',
  admin_note_added: 'Бележка от админ',
  admin_status_change: 'Промяна на статус (админ)',
}

export function statusBadge(status: string | null | undefined) {
  if (!status) return { label: '—', cls: 'bg-slate-100 text-slate-500' }
  return STATUS_LABELS[status] || { label: status, cls: 'bg-slate-100 text-slate-700' }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('bg-BG', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('bg-BG', { dateStyle: 'medium' })
  } catch {
    return iso
  }
}

export function formatDuration(secs: number | null | undefined): string {
  if (secs == null) return '—'
  if (secs < 60) return `${Math.round(secs)} сек`
  if (secs < 3600) return `${Math.round(secs / 60)} мин`
  if (secs < 86400) return `${(secs / 3600).toFixed(1)} ч`
  return `${(secs / 86400).toFixed(1)} дни`
}

export interface ConsultationRequest {
  id: string
  patient_name: string
  patient_phone: string
  patient_email?: string | null
  patient_city?: string | null
  treatment_interest: string
  urgency?: string | null
  readiness?: string | null
  source?: string | null
  utm_source?: string | null
  utm_campaign?: string | null
  utm_adset?: string | null
  utm_ad?: string | null
  status: string
  assigned_clinic_id?: string | null
  assigned_clinic_name?: string | null
  assigned_at?: string | null
  clinic_viewed_at?: string | null
  first_action_at?: string | null
  call_attempted_at?: string | null
  patient_contacted_at?: string | null
  appointment_booked_at?: string | null
  attended_at?: string | null
  no_show_at?: string | null
  cancelled_at?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string
  lead_id?: string | null
}

export interface Appointment {
  id: string
  clinic_id: string
  consultation_request_id?: string | null
  patient_name: string
  patient_phone: string
  treatment_category?: string | null
  appointment_type: string
  start_time: string
  end_time: string
  status: string
  notes?: string | null
  created_at: string
  updated_at?: string
}

export interface EventItem {
  id: string
  consultation_request_id: string
  clinic_id?: string | null
  user_id?: string | null
  event_type: string
  previous_status?: string | null
  new_status?: string | null
  note?: string | null
  created_at: string
}

export const APPOINTMENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'orthodontic_consultation', label: 'Ортодонтия' },
  { value: 'invisalign_consultation', label: 'Invisalign' },
  { value: 'braces_consultation', label: 'Брекети' },
  { value: 'implant_consultation', label: 'Имплант' },
  { value: 'cosmetic_consultation', label: 'Естетика' },
  { value: 'full_mouth_rehab_consultation', label: 'Цяла уста' },
  { value: 'general_consultation', label: 'Обща' },
]
