// Shared labels and helpers for the consultation workflow UI.

export const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  new:                  { label: 'Нова',                  cls: 'bg-slate-100 text-slate-700' },
  assigned:             { label: 'Назначена',             cls: 'bg-sky-100 text-sky-700' },
  clinic_viewed:        { label: 'Видяна',                cls: 'bg-sky-100 text-sky-700' },
  call_attempted:       { label: 'Опит за обаждане',      cls: 'bg-amber-100 text-amber-800' },
  patient_contacted:    { label: 'Свързано с пациента',   cls: 'bg-amber-100 text-amber-800' },
  no_answer:            { label: 'Без отговор',           cls: 'bg-amber-100 text-amber-800' },
  booked:               { label: 'Резервирана',           cls: 'bg-emerald-100 text-emerald-700' },
  rescheduled:          { label: 'Преместена',            cls: 'bg-amber-100 text-amber-800' },
  patient_declined:     { label: 'Пациентът отказа',      cls: 'bg-rose-100 text-rose-700' },
  not_suitable:         { label: 'Неподходяща',           cls: 'bg-rose-100 text-rose-700' },
  attended:             { label: 'Посетила',              cls: 'bg-emerald-100 text-emerald-700' },
  no_show:              { label: 'Не се яви',             cls: 'bg-rose-100 text-rose-700' },
  cancelled:            { label: 'Отменена',              cls: 'bg-slate-100 text-slate-500' },
  expired:              { label: 'Изтекла',               cls: 'bg-slate-100 text-slate-500' },
  disputed:             { label: 'В спор',                cls: 'bg-rose-100 text-rose-700' },
  needs_zubite_review:  { label: 'Чака преглед',          cls: 'bg-violet-100 text-violet-700' },
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
  aligners: 'Алайнери',
  braces: 'Брекети',
  implants: 'Импланти',
  invisalign: 'Invisalign',
  orthodontics: 'Ортодонтия',
  master_quiz: 'Основен тест',
  'cosmetic-dentistry': 'Естетика',
  full_mouth: 'Цяла уста',
  general: 'Обща',
  diagnostic_quiz: 'Диагностичен въпросник',
  diagnostic_quiz_v1: 'Диагностичен въпросник',
  quiz: 'Диагностичен въпросник',
}

// Friendly labels for the request "source" / "selection_source" /
// "created_from" / `lead.source` fields. Avoid raw enum values in admin UI.
export const REQUEST_SOURCE_LABELS: Record<string, string> = {
  recommended_clinics_flow: 'Пациентът избра клиника',
  assisted_choice_flow:     'Помощ от Zubite',
  diagnostic_quiz:          'Диагностичен въпросник',
  diagnostic_quiz_v1:       'Диагностичен въпросник',
  quiz:                     'Диагностичен въпросник',
  article:                  'Статия / Блог',
  blog:                     'Статия / Блог',
  campaign:                 'Кампания',
  direct:                   'Директна заявка',
  unknown:                  'Неизвестен източник',
}

export function requestSourceLabel(v?: string | null): string {
  if (!v) return 'Неизвестен източник'
  return REQUEST_SOURCE_LABELS[v] || 'Неизвестен източник'
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

// Identifies who originated an event row (best-effort from the event payload).
export type EventActorKey = 'clinic' | 'zubite' | 'admin' | 'system' | 'patient'

export const EVENT_ACTOR_LABELS: Record<EventActorKey, string> = {
  clinic: 'Клиника',
  zubite: 'Zubite',
  admin: 'Админ',
  system: 'Система',
  patient: 'Пациент',
}

export function inferEventActor(ev: EventItem): EventActorKey {
  // Heuristic: if event was authored by a clinic user, `clinic_id` is set;
  // admin-emitted events have `admin_` prefix; otherwise it's the system.
  if (ev.event_type?.startsWith('admin_')) return 'admin'
  if (ev.clinic_id) return 'clinic'
  if (ev.event_type === 'patient_declined') return 'patient'
  if (ev.event_type === 'assigned_to_clinic' || ev.event_type === 'reassigned_to_clinic') return 'zubite'
  return 'system'
}

// 5-stage progress strip for the clinic request workflow.
// `idx` is the canonical index a request reaches under each status. Some
// statuses are terminal/dead-ends and trigger a separate "terminal" panel.
export interface ProgressStage { key: string; label: string }
export const PROGRESS_STAGES: ProgressStage[] = [
  { key: 'new',        label: 'Нова заявка' },
  { key: 'viewed',     label: 'Видяна' },
  { key: 'contacted',  label: 'Свързан пациент' },
  { key: 'booked',     label: 'Резервирана' },
  { key: 'attended',   label: 'Посетила' },
]

export type ProgressShape =
  | { kind: 'progress'; reached: number /* 0..4 */ }
  | { kind: 'terminal'; tone: 'positive' | 'negative' | 'neutral'; label: string }

export function progressFromStatus(status?: string | null): ProgressShape {
  switch (status) {
    case 'new':
    case 'assigned':
      return { kind: 'progress', reached: 0 }
    case 'clinic_viewed':
      return { kind: 'progress', reached: 1 }
    case 'call_attempted':
    case 'no_answer':
      // Call started but patient not yet talked to — between viewed and contacted.
      return { kind: 'progress', reached: 1 }
    case 'patient_contacted':
      return { kind: 'progress', reached: 2 }
    case 'booked':
    case 'rescheduled':
      return { kind: 'progress', reached: 3 }
    case 'attended':
      return { kind: 'progress', reached: 4 }
    case 'no_show':
      return { kind: 'terminal', tone: 'negative', label: 'Пациентът не се яви' }
    case 'patient_declined':
      return { kind: 'terminal', tone: 'negative', label: 'Пациентът отказа консултация' }
    case 'not_suitable':
      return { kind: 'terminal', tone: 'neutral', label: 'Заявката беше маркирана като неподходяща' }
    case 'cancelled':
      return { kind: 'terminal', tone: 'neutral', label: 'Заявката е отменена' }
    case 'expired':
      return { kind: 'terminal', tone: 'neutral', label: 'Заявката е изтекла' }
    case 'disputed':
      return { kind: 'terminal', tone: 'negative', label: 'Заявката е в спор' }
    default:
      return { kind: 'progress', reached: 0 }
  }
}

export type CtaStage = 'new' | 'contact' | 'after_contact' | 'after_booking' | 'completed' | 'unknown'

export function ctaStageFromStatus(status?: string | null): CtaStage {
  switch (status) {
    case 'new':
    case 'assigned':
    case 'clinic_viewed':
      return 'contact'
    case 'call_attempted':
    case 'no_answer':
      return 'contact'
    case 'patient_contacted':
      return 'after_contact'
    case 'booked':
    case 'rescheduled':
      return 'after_booking'
    case 'attended':
    case 'no_show':
    case 'patient_declined':
    case 'not_suitable':
    case 'cancelled':
    case 'expired':
    case 'disputed':
      return 'completed'
    default:
      return 'unknown'
  }
}

export const READINESS_LABELS: Record<string, string> = {
  ready_now: 'Готов веднага',
  ready: 'Готов',
  soon: 'Скоро',
  exploring: 'Проучва опции',
  researching: 'В проучване',
  not_ready: 'Все още не',
  unknown: 'Не е посочено',
  // Backend also surfaces lead score-band codes in the readiness field
  // for some legacy paths — translate them to human-friendly Bulgarian.
  RED: 'Висока готовност',
  AMBER: 'Средна готовност',
  GREEN: 'Проучва опции',
  red: 'Висока готовност',
  amber: 'Средна готовност',
  green: 'Проучва опции',
}

export const URGENCY_LABELS: Record<string, string> = {
  urgent: 'Спешно',
  high: 'Висока',
  normal: 'Нормална',
  low: 'Ниска',
  none: 'Без приоритет',
  unknown: 'Не е посочено',
}

export const APPT_STATUS_LABELS: Record<string, string> = {
  booked: 'Резервирана',
  confirmed: 'Потвърдена',
  rescheduled: 'Преместена',
  attended: 'Посетила',
  no_show: 'Не се яви',
  cancelled: 'Отменена',
}

export const ACTION_SUCCESS_MESSAGES: Record<string, string> = {
  call_attempted: 'Опитът за обаждане е записан.',
  patient_contacted: 'Пациентът е маркиран като свързан.',
  no_answer: 'Маркирано е, че пациентът не е отговорил.',
  mark_attended: 'Консултацията е маркирана като посетена.',
  mark_no_show: 'Маркирано е, че пациентът не се е явил.',
  patient_declined: 'Маркирано е, че пациентът е отказал.',
  not_suitable: 'Заявката е маркирана като неподходяща.',
  cancel: 'Заявката е отменена.',
  reschedule: 'Консултацията е преместена.',
  book_consultation: 'Консултацията е резервирана.',
  mark_viewed: 'Заявката е маркирана като прегледана.',
}

export function readinessLabel(v?: string | null): string {
  if (!v) return '—'
  return READINESS_LABELS[v] || v
}

export function urgencyLabel(v?: string | null): string {
  if (!v) return '—'
  return URGENCY_LABELS[v] || v
}

export function apptStatusLabel(v?: string | null): string {
  if (!v) return '—'
  return APPT_STATUS_LABELS[v] || v
}

export function actionSuccessMessage(action: string): string {
  return ACTION_SUCCESS_MESSAGES[action] || 'Действието е записано.'
}

export function statusTransitionPhrase(prev?: string | null, next?: string | null): string {
  if (!prev || !next) return ''
  const a = STATUS_LABELS[prev]?.label || prev
  const b = STATUS_LABELS[next]?.label || next
  return `${a} → ${b}`
}

/** Relative-time formatter ("преди 5 мин"). Falls back to formatted date if
 * `iso` is missing or invalid. Pure helper, no deps.
 */
export function timeSince(iso?: string | null): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return formatDate(iso)
  const deltaSec = Math.floor((Date.now() - t) / 1000)
  if (deltaSec < 0) return formatDate(iso)
  if (deltaSec < 60) return 'преди няколко секунди'
  const min = Math.floor(deltaSec / 60)
  if (min < 60) return `преди ${min} мин`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `преди ${hr} ${hr === 1 ? 'час' : 'ч'}`
  const days = Math.floor(hr / 24)
  if (days < 7) return `преди ${days} ${days === 1 ? 'ден' : 'дни'}`
  if (days < 30) {
    const w = Math.floor(days / 7)
    return `преди ${w} ${w === 1 ? 'седмица' : 'седмици'}`
  }
  // Older than a month — fall back to absolute date.
  return formatDate(iso)
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

/** Returns the Monday at 00:00 of the week containing `d` (local time). */
export function getMondayOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  // JS: Sunday = 0, Monday = 1 … Saturday = 6. We want Monday-start weeks.
  const dow = out.getDay()
  const delta = dow === 0 ? -6 : 1 - dow
  out.setDate(out.getDate() + delta)
  return out
}

/** Adds `days` to the date (returns a new Date, original untouched). */
export function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

const MONTHS_BG = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
]

/** Renders a week range as "13–19 май 2026". If the week spans two months
 *  ("28 април – 4 май 2026"), or two years, expands the format accordingly.
 */
export function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const dM = monday.getDate()
  const dS = sunday.getDate()
  const mM = monday.getMonth()
  const mS = sunday.getMonth()
  const yM = monday.getFullYear()
  const yS = sunday.getFullYear()
  if (yM !== yS) {
    return `${dM} ${MONTHS_BG[mM]} ${yM} – ${dS} ${MONTHS_BG[mS]} ${yS}`
  }
  if (mM !== mS) {
    return `${dM} ${MONTHS_BG[mM]} – ${dS} ${MONTHS_BG[mS]} ${yM}`
  }
  return `${dM}–${dS} ${MONTHS_BG[mM]} ${yM}`
}

/** Short BG weekday names, Monday-first. Index 0 = Понеделник. */
export const WEEKDAY_NAMES_SHORT_BG = ['Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб', 'Нед']

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
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
  // P4/P5 patient-flow markers (optional; legacy/admin-created rows lack them).
  created_from?: string | null
  selection_source?: string | null
  patient_message?: string | null
  // Consent capture (P4 = clinic share, P5 = zubite share). All optional.
  consent_to_share_clinic?: boolean | null
  consent_to_share_clinic_at?: string | null
  consent_to_share_clinic_text?: string | null
  consent_to_share_zubite?: boolean | null
  consent_to_share_zubite_at?: string | null
  consent_to_share_zubite_text?: string | null
  utm_source?: string | null
  utm_campaign?: string | null
  utm_adset?: string | null
  utm_ad?: string | null
  status: string
  assigned_clinic_id?: string | null
  assigned_clinic_name?: string | null
  assigned_clinic_city?: string | null
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

// Patient-flow request type (driven by `created_from` on the consultation_request
// doc). Keeps copy and visual treatment in one place so list + detail stay
// aligned.
export type RequestKindKey = 'selected_clinic' | 'assisted_choice' | 'other'

export interface RequestKindDescriptor {
  key: RequestKindKey
  badgeLabel: string       // short pill on list rows
  detailTitle: string      // section title on detail page
  detailDescription: string
  badgeCls: string         // tailwind classes for the badge
  rowAccentCls: string     // tailwind classes appended to the row/card when this kind needs to stand out
}

export const REQUEST_KIND_DESCRIPTORS: Record<RequestKindKey, RequestKindDescriptor> = {
  selected_clinic: {
    key: 'selected_clinic',
    badgeLabel: 'Пациентът избра клиника',
    detailTitle: 'Избрана клиника',
    detailDescription: 'Пациентът е избрал конкретна клиника.',
    badgeCls: 'bg-sky-50 text-sky-700 border border-sky-200',
    rowAccentCls: '',
  },
  assisted_choice: {
    key: 'assisted_choice',
    badgeLabel: 'Пациентът поиска помощ от Zubite',
    detailTitle: 'Помощ от Zubite',
    detailDescription: 'Пациентът не е сигурен коя клиника да избере и е поискал помощ от Zubite.',
    badgeCls: 'bg-violet-50 text-violet-700 border border-violet-200',
    rowAccentCls: 'bg-violet-50/40 hover:bg-violet-50/70',
  },
  other: {
    key: 'other',
    badgeLabel: 'Неизвестен източник',
    detailTitle: 'Неизвестен източник',
    detailDescription: 'Заявката не идва от P4/P5 patient-layer flow.',
    badgeCls: 'bg-slate-100 text-slate-600 border border-slate-200',
    rowAccentCls: '',
  },
}

export function requestKindFromCreatedFrom(createdFrom?: string | null): RequestKindKey {
  if (createdFrom === 'recommended_clinics_flow') return 'selected_clinic'
  if (createdFrom === 'assisted_choice_flow') return 'assisted_choice'
  return 'other'
}

export const SELECTION_SOURCE_LABELS: Record<string, string> = {
  matching_card: 'От картата в списъка',
  clinic_profile: 'От профила на клиниката',
  matching_page: 'От страницата с препоръки',
}
