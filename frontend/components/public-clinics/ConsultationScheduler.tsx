'use client'

/**
 * <ConsultationScheduler />
 * ------------------------------------------------------------------
 * Phase B — Public clinic-profile phone-consultation scheduler.
 *
 * Uses the Phase A backend endpoints:
 *   GET  /api/public/clinics/{clinic_id}/availability?type=phone_consultation
 *   POST /api/public/consultation-bookings
 *
 * Three states:
 *   1. state === 'available'         → date-grouped slot picker + booking form
 *   2. state === 'enabled_no_slots'  → fallback message + "Заяви контакт"
 *   3. state === 'disabled'          → component renders nothing
 *
 * No fake slots. No "confirmed" language. The success message is
 * exactly what the backend returns: "Заявката е изпратена. Клиниката
 * ще потвърди часа."
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Loader2, Phone, CalendarClock, ShieldCheck, ArrowLeft, CheckCircle2,
  AlertCircle, X,
} from 'lucide-react'
import type { PublicClinic } from '@/lib/publicClinics'
import PublicContactModal from './PublicContactModal'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Slot {
  slot_id: string
  scheduled_at: string         // UTC ISO
  scheduled_at_local: string   // Sofia local ISO
  duration_minutes: number
  day_of_week: string
  label_local_bg: string       // e.g. "Ср, 17 юни · 10:00"
}

interface AvailabilityResponse {
  clinic_id: string
  consultation_type: 'phone_consultation'
  state: 'available' | 'enabled_no_slots' | 'disabled'
  slots: Slot[]
  slot_duration_minutes: number
  disclaimer_text: string | null
  public_description: string | null
}

interface Props {
  clinic: PublicClinic
  /** Canonical profile URL to log on the lead. */
  sourcePath: string
  /** Parent observer — receives the resolved availability state so it
   *  can render adjacent tier-included content (Phase C1). The callback
   *  is invoked once whenever the state changes; never with intermediate
   *  loading/error so the parent gets stable values. */
  onStateResolved?: (state: AvailabilityResponse['state'] | null) => void
  /** Forwarded to the PublicContactModal fallback — see its own doc. */
  hasQuizContext?: boolean
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: AvailabilityResponse }

const BG_MONTHS_FULL = [
  '', 'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
]
const BG_WEEKDAYS_FULL = [
  'Понеделник', 'Вторник', 'Сряда', 'Четвъртък',
  'Петък', 'Събота', 'Неделя',
]

function formatDateHeader(localIso: string): string {
  // Parse `YYYY-MM-DDTHH:MM:SS+TZ`. We only need the calendar date.
  const [datePart] = localIso.split('T')
  const [yStr, mStr, dStr] = datePart.split('-')
  const d = new Date(Number(yStr), Number(mStr) - 1, Number(dStr))
  return `${BG_WEEKDAYS_FULL[(d.getDay() + 6) % 7]}, ${d.getDate()} ${BG_MONTHS_FULL[Number(mStr)]}`
}

function formatTime(localIso: string): string {
  const [, timePart = ''] = localIso.split('T')
  return timePart.slice(0, 5) // HH:MM
}

function groupSlotsByDate(slots: Slot[]): Array<{ key: string; label: string; slots: Slot[] }> {
  const groups = new Map<string, Slot[]>()
  for (const s of slots) {
    const key = s.scheduled_at_local.slice(0, 10) // YYYY-MM-DD
    const arr = groups.get(key) || []
    arr.push(s)
    groups.set(key, arr)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, slotsForDay]) => ({
      key,
      label: formatDateHeader(slotsForDay[0].scheduled_at_local),
      slots: slotsForDay,
    }))
}

export default function ConsultationScheduler({ clinic, sourcePath, onStateResolved, hasQuizContext }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [contactFallbackOpen, setContactFallbackOpen] = useState(false)

  const loadAvailability = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const r = await fetch(
        `${API_URL}/api/public/clinics/${clinic.id}/availability?type=phone_consultation`,
        { cache: 'no-store' },
      )
      if (!r.ok) {
        setState({ kind: 'error', message: 'Не успяхме да заредим часовете. Опитай отново.' })
        onStateResolved?.(null)
        return
      }
      const data: AvailabilityResponse = await r.json()
      setState({ kind: 'ready', data })
      onStateResolved?.(data.state)
    } catch {
      setState({ kind: 'error', message: 'Мрежова грешка. Опитай отново.' })
      onStateResolved?.(null)
    }
  }, [clinic.id, onStateResolved])

  useEffect(() => { void loadAvailability() }, [loadAvailability])

  // ── State 3: scheduler disabled → render nothing.
  if (state.kind === 'ready' && state.data.state === 'disabled') {
    return null
  }

  // Phase C1.1 — compact rendering for `enabled_no_slots`: a tight
  // single card instead of a giant titled section.
  const compactNoSlots = state.kind === 'ready' && state.data.state === 'enabled_no_slots'

  return (
    <section
      className={
        compactNoSlots
          ? 'mt-5 rounded-xl bg-amber-50/55 ring-1 ring-amber-100/80 p-4'
          : 'mt-6 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-5 sm:p-6'
      }
      data-testid="consultation-scheduler"
      data-state={state.kind === 'ready' ? state.data.state : state.kind}
    >
      {!compactNoSlots && (
        <>
          <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-1 inline-flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
              <CalendarClock className="w-5 h-5 text-teal-700" />
            </span>
            Свободни часове за дистанционна консултация
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Кратък телефонен разговор с екипа на клиниката, за да обсъдиш
            целите си и възможните стъпки. Това не е диагноза.
          </p>
        </>
      )}

      {state.kind === 'loading' && (
        <div
          className="flex items-center gap-2 text-sm text-slate-500 py-3"
          data-testid="scheduler-loading"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Зареждам свободни часове…
        </div>
      )}

      {state.kind === 'error' && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-md bg-rose-50 ring-1 ring-rose-200 text-xs text-rose-800"
          data-testid="scheduler-error"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p>{state.message}</p>
            <button
              type="button"
              onClick={() => void loadAvailability()}
              className="mt-1 underline text-rose-900"
              data-testid="scheduler-retry"
            >
              Опитай отново
            </button>
          </div>
        </div>
      )}

      {state.kind === 'ready' && state.data.state === 'enabled_no_slots' && (
        <NoSlotsPanel
          onFallback={() => setContactFallbackOpen(true)}
        />
      )}

      {state.kind === 'ready' && state.data.state === 'available' && (
        <AvailableSlots
          data={state.data}
          onPick={setSelectedSlot}
        />
      )}

      {/* Booking form modal (state: available + slot selected) */}
      {state.kind === 'ready' && selectedSlot && (
        <BookingFormModal
          clinic={clinic}
          slot={selectedSlot}
          sourcePath={sourcePath}
          disclaimerText={state.data.disclaimer_text}
          onClose={() => {
            setSelectedSlot(null)
            // Refresh availability AFTER the modal is closed so the
            // success state stays visible while the user reads it and
            // the just-locked slot disappears the next time they
            // open the picker.
            void loadAvailability()
          }}
        />
      )}

      {/* Fallback contact modal (state: enabled_no_slots) — reuses
          existing PublicContactModal flow (POST /api/leads). */}
      {contactFallbackOpen && (
        <PublicContactModal
          clinics={[clinic]}
          source="clinic_profile"
          consultationType="general"
          prefillCity={clinic.city_slug}
          prefillTreatment={clinic.treatments[0]}
          hasQuizContext={hasQuizContext}
          onClose={() => setContactFallbackOpen(false)}
        />
      )}
    </section>
  )
}

// ── State 1 sub-component: real slots available ───────────────────

function AvailableSlots({
  data, onPick,
}: { data: AvailabilityResponse; onPick: (s: Slot) => void }) {
  const groups = useMemo(() => groupSlotsByDate(data.slots), [data.slots])

  return (
    <div data-testid="scheduler-available">
      {data.public_description && (
        <p
          className="text-xs text-slate-500 mb-3 italic"
          data-testid="scheduler-public-description"
        >
          {data.public_description}
        </p>
      )}

      <p className="text-[11px] text-slate-500 mb-3">
        Часове в Europe/Sofia. Продължителност · {data.slot_duration_minutes} мин.
      </p>

      <ul className="space-y-4" data-testid="scheduler-slots-by-day">
        {groups.map((g) => (
          <li key={g.key} data-testid={`scheduler-day-${g.key}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {g.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {g.slots.map((s) => (
                <button
                  key={s.slot_id}
                  type="button"
                  onClick={() => onPick(s)}
                  className="min-h-11 min-w-[64px] px-3 py-2 rounded-full bg-white ring-1 ring-slate-200 text-sm text-slate-800 hover:ring-teal-400 hover:bg-teal-50 transition-colors"
                  data-testid={`scheduler-slot-${s.slot_id}`}
                  data-slot-iso={s.scheduled_at}
                >
                  {formatTime(s.scheduled_at_local)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {data.disclaimer_text && (
        <p
          className="mt-4 text-[11px] text-slate-500 leading-snug"
          data-testid="scheduler-disclaimer"
        >
          {data.disclaimer_text}
        </p>
      )}
      <p className="mt-2 text-[11px] text-slate-400 leading-snug inline-flex items-start gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
        Zubite.bg не потвърждава часове автоматично. Клиниката потвърждава
        заявката ти.
      </p>
    </div>
  )
}

// ── State 2 sub-component: no slots ────────────────────────────────

function NoSlotsPanel({ onFallback }: { onFallback: () => void }) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
      data-testid="scheduler-no-slots"
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <span className="w-7 h-7 rounded-md bg-amber-100/80 ring-1 ring-amber-200 grid place-items-center flex-shrink-0">
          <CalendarClock className="w-4 h-4 text-amber-700" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-amber-900 leading-snug">
            Онлайн консултация
          </p>
          <p className="text-xs text-amber-900/80 leading-snug mt-0.5">
            Клиниката приема заявки за онлайн консултация, но все още
            не е публикувала свободни часове.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onFallback}
        data-testid="scheduler-fallback-contact"
        className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-white text-xs font-medium hover:-translate-y-0.5 transition-all flex-shrink-0 shadow-[0_8px_18px_-8px_rgba(13,148,136,0.45)]"
        style={{
          backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
        }}
      >
        <Phone className="w-3 h-3" />
        Заяви контакт
      </button>
    </div>
  )
}

// ── Booking form modal ────────────────────────────────────────────

function BookingFormModal({
  clinic, slot, sourcePath, disclaimerText, onClose,
}: {
  clinic: PublicClinic
  slot: Slot
  sourcePath: string
  disclaimerText: string | null
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [disclaimerAck, setDisclaimerAck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [doneMsg, setDoneMsg] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!name.trim() || !phone.trim()) {
      setErr('Моля попълни име и телефон.')
      return
    }
    if (!consent) {
      setErr('Моля потвърди съгласие за обработка на данни.')
      return
    }
    if (!disclaimerAck) {
      setErr('Моля потвърди, че разбираш ограниченията на дистанционната консултация.')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch(`${API_URL}/api/public/consultation-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: clinic.id,
          scheduled_at: slot.scheduled_at,
          consultation_type: 'phone_consultation',
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          patient_note: note.trim() || undefined,
          consent: true,
          disclaimer_acknowledged: true,
          source_path: sourcePath,
        }),
      })
      const payload = await r.json().catch(() => ({}))
      if (!r.ok) {
        const code = payload?.detail?.code
        const msg = payload?.detail?.message
        if (code === 'slot_already_locked') {
          setErr('Този час вече е зает. Моля, избери друг.')
        } else if (typeof msg === 'string' && msg) {
          setErr(msg)
        } else {
          setErr('Неуспешно изпращане. Опитай отново.')
        }
        setSubmitting(false)
        return
      }
      setDoneMsg(payload.message || 'Заявката е изпратена. Клиниката ще потвърди часа.')
    } catch {
      setErr('Мрежова грешка. Опитай отново.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
      data-testid="scheduler-booking-modal"
    >
      <button
        type="button"
        aria-label="Затвори"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        data-testid="scheduler-booking-backdrop"
      />
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur border-b border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            data-testid="scheduler-booking-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Обратно
          </button>
          <button
            type="button"
            aria-label="Затвори"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100"
            data-testid="scheduler-booking-close"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </header>

        {doneMsg ? (
          <div className="p-6 text-center" data-testid="scheduler-booking-success">
            <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 ring-1 ring-teal-100 grid place-items-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-teal-600" />
            </div>
            <p
              className="text-base font-medium text-slate-900 mb-1"
              data-testid="scheduler-booking-success-message"
            >
              {doneMsg}
            </p>
            <p className="text-xs text-slate-500 leading-snug">
              Часът е резервиран временно за теб. Ще получиш потвърждение,
              когато клиниката го прегледа.
            </p>
            {/* Care Pass guardrail — explicit reminder that online/phone
                consultation does NOT unlock Care Pass. (Feb 2026 brief.) */}
            <p
              className="mt-2 text-[11px] text-slate-500 leading-snug"
              data-testid="scheduler-booking-success-care-pass-note"
            >
              Care Pass е включен в партньорската ни мрежа. Всеки Zubite пациент получава Care Pass при посещение в партньорска клиника.
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 ring-1 ring-slate-100 p-3 text-left text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Заявен час
              </p>
              <p className="text-slate-800">{slot.label_local_bg}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {clinic.name}{clinic.city_name ? ` · ${clinic.city_name}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full px-5 py-3 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
              data-testid="scheduler-booking-done-close"
            >
              Затвори
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            <div className="rounded-lg bg-teal-50/60 ring-1 ring-teal-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 mb-0.5">
                Избран час
              </p>
              <p
                className="text-sm text-slate-900 font-medium"
                data-testid="scheduler-booking-slot-label"
              >
                {slot.label_local_bg}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {clinic.name}{clinic.city_name ? ` · ${clinic.city_name}` : ''}
                {` · ${slot.duration_minutes} мин`}
              </p>
            </div>

            <Field
              id="cs-name"
              label="Име"
              required
              value={name}
              onChange={setName}
              maxLength={100}
              testid="scheduler-name"
            />
            <Field
              id="cs-phone"
              label="Телефон"
              required
              value={phone}
              onChange={setPhone}
              maxLength={30}
              inputMode="tel"
              testid="scheduler-phone"
            />
            <Field
              id="cs-email"
              label="Имейл (по желание)"
              type="email"
              value={email}
              onChange={setEmail}
              maxLength={200}
              testid="scheduler-email"
            />
            <div>
              <label
                htmlFor="cs-note"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Кратко съобщение (по желание)
              </label>
              <textarea
                id="cs-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Например: предпочитам обаждане след 18:00 ч."
                className="w-full px-3 py-2 rounded-md ring-1 ring-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                data-testid="scheduler-note"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
                data-testid="scheduler-consent"
              />
              <span>
                Съгласен/а съм Zubite.bg да предаде моите данни на клиниката
                с цел връзка относно заявката ми. Виж{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 underline"
                >
                  Политика за поверителност
                </a>.
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
              <input
                type="checkbox"
                checked={disclaimerAck}
                onChange={(e) => setDisclaimerAck(e.target.checked)}
                className="mt-0.5"
                data-testid="scheduler-disclaimer-ack"
              />
              <span>
                Разбирам, че телефонният разговор е насочваща стъпка,
                не диагноза, и че окончателна оценка изисква преглед на място.
              </span>
            </label>

            {disclaimerText && (
              <p className="text-[11px] text-slate-500 italic leading-snug">
                {disclaimerText}
              </p>
            )}

            {err && (
              <div
                className="flex items-start gap-2 px-3 py-2 rounded-md bg-rose-50 ring-1 ring-rose-200 text-xs text-rose-800"
                data-testid="scheduler-booking-error"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid="scheduler-booking-submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-medium transition-all hover:-translate-y-0.5 disabled:opacity-60 shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50)]"
              style={{
                backgroundImage:
                  'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
              }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              {submitting ? 'Изпращам…' : 'Изпрати заявка'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({
  id, label, required, value, onChange, type = 'text',
  maxLength, inputMode, testid,
}: {
  id: string
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  type?: string
  maxLength?: number
  inputMode?: 'tel' | 'text' | 'email'
  testid: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 mb-1"
      >
        {label}{required ? <span className="text-rose-500"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        className="w-full px-3 py-2 rounded-md ring-1 ring-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
        data-testid={testid}
      />
    </div>
  )
}
