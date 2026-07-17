'use client'

/**
 * Free Online Orientation Section (Phase E — June 2026).
 *
 * Rendered on `/quiz/success` AFTER the lead has been unlocked. The
 * section is intentionally read-only / informational until the patient
 * opens the booking modal. Care Pass remains LOCKED throughout —
 * Phase E only creates booking requests; clinic confirmation flips
 * the booking, never the Care Pass.
 *
 * Backend contract:
 *   GET  /api/leads/:leadId/eligible-orientation-clinics
 *   POST /api/leads/:leadId/online-orientation-bookings
 */

import { useEffect, useState, useCallback } from 'react'
import { Sparkles, ShieldCheck, Calendar, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { trackEvent as gaTrackEvent } from '@/lib/analytics/gtag'
import { OrientationCalendar } from '@/components/patient/OrientationCalendar'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Slot {
  slot_id: string
  clinic_id: string
  scheduled_at: string         // ISO UTC
  scheduled_at_local: string   // ISO Sofia
  duration_minutes: number
  day_of_week: string
  label_local_bg: string
}

interface ClinicCard {
  clinic_id: string
  clinic_name: string
  city: string | null
  city_slug: string | null
  public_description: string | null
  disclaimer_text: string | null
  slot_duration_minutes: number
  eligible_treatment_categories: string[]
  slots: Slot[]
}

interface TopicOption { value: string; label: string }

interface EligibilityResponse {
  lead_id: string
  clinics: ClinicCard[]
  topic_options: TopicOption[]
  allowed_treatment_categories: string[]
}

interface BookingModalState {
  open: boolean
  clinic?: ClinicCard
  slot?: Slot
}

export function FreeOnlineOrientationSection({ leadId }: { leadId: string }) {
  const [data, setData] = useState<EligibilityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [modal, setModal] = useState<BookingModalState>({ open: false })
  const [submittedBookingId, setSubmittedBookingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErrored(false)
    try {
      const r = await fetch(`${API_URL}/api/leads/${leadId}/eligible-orientation-clinics`)
      if (!r.ok) { setErrored(true); return }
      setData(await r.json())
    } catch {
      setErrored(true)
    } finally { setLoading(false) }
  }, [leadId])

  useEffect(() => { if (leadId) load() }, [leadId, load])

  // Analytics: section_viewed fires once when we have a usable payload
  // (any clinic visible or explicitly empty).
  useEffect(() => {
    if (!data) return
    gaTrackEvent('free_orientation_section_viewed', {
      lead_id: leadId,
      eligible_clinic_count: data.clinics.length,
    })
  }, [data, leadId])

  if (loading) {
    return (
      <section
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 inline-flex items-center gap-2"
        data-testid="free-orient-loading"
      >
        <Loader2 className="w-4 h-4 animate-spin" /> Проверяваме за свободни онлайн часове…
      </section>
    )
  }

  if (errored || !data) {
    // Silent fail — patient still has Manual Recommendation Mode below.
    return null
  }

  // Top-of-section header + intro copy
  const header = (
    <div className="mb-3" data-testid="free-orient-header">
      <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900">
        Безплатна онлайн ориентация
      </h2>
      <p className="text-sm text-slate-600 mt-1">
        След попълнената оценка можеш да заявиш безплатен първи онлайн разговор
        с партньорска клиника, когато има свободни часове.
      </p>
      <p className="text-xs text-amber-700 mt-2">
        Онлайн ориентацията не замества физически преглед, диагноза или лечебен план.
      </p>
    </div>
  )

  if (submittedBookingId) {
    return (
      <section
        className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        data-testid="free-orient-submitted-card"
      >
        {header}
        <div className="mt-3 flex items-start gap-2 text-sm text-emerald-800" data-testid="free-orient-pending-copy">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>Заявката за онлайн час е изпратена. Клиниката ще я прегледа и потвърди.</span>
        </div>
      </section>
    )
  }

  if (data.clinics.length === 0) {
    return (
      <section
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"
        data-testid="free-orient-empty"
      >
        {header}
        <p className="text-sm text-slate-600">
          В момента няма свободни онлайн часове при партньорска клиника за този тип случай.
          Можеш да продължиш с ръчна препоръка от екипа на Zubite.bg.
        </p>
      </section>
    )
  }

  return (
    <section
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
      data-testid="free-orient-section"
    >
      {header}

      <ul className="space-y-3" data-testid="free-orient-clinic-list">
        {data.clinics.map((c) => (
          <ClinicRow
            key={c.clinic_id} clinic={c}
            onPick={(slot) => {
              gaTrackEvent('free_orientation_booking_started', {
                lead_id: leadId, clinic_id: c.clinic_id,
              })
              setModal({ open: true, clinic: c, slot })
            }}
            onView={() => {
              gaTrackEvent('free_orientation_clinic_card_viewed', {
                lead_id: leadId, clinic_id: c.clinic_id,
              })
            }}
          />
        ))}
      </ul>

      {modal.open && modal.clinic && modal.slot && (
        <BookingRequestModal
          leadId={leadId}
          clinic={modal.clinic}
          slot={modal.slot}
          topicOptions={data.topic_options}
          onClose={() => setModal({ open: false })}
          onSuccess={(bookingId) => {
            setSubmittedBookingId(bookingId)
            setModal({ open: false })
          }}
        />
      )}
    </section>
  )
}

function ClinicRow({
  clinic, onPick, onView,
}: {
  clinic: ClinicCard
  onPick: (slot: Slot) => void
  onView: () => void
}) {
  const [open, setOpen] = useState(false)
  const availableDayCount = new Set(
    clinic.slots.map((s) => s.scheduled_at_local.slice(0, 10)),
  ).size
  return (
    <li
      className="border border-slate-200 rounded-xl p-4 transition-colors hover:border-slate-300"
      data-testid={`free-orient-clinic-${clinic.clinic_id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <h3 className="font-medium text-slate-900 truncate">{clinic.clinic_name}</h3>
          </div>
          {clinic.city && (
            <p className="text-xs text-slate-500 mt-0.5">{clinic.city}</p>
          )}
          {clinic.public_description && (
            <p className="text-sm text-slate-600 mt-2">{clinic.public_description}</p>
          )}
          <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {clinic.slot_duration_minutes} мин ·{' '}
            <span className="text-slate-700">
              {clinic.slots.length} свободни часа в {availableDayCount}{' '}
              {availableDayCount === 1 ? 'ден' : 'дни'}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); if (!open) onView() }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 text-white text-sm hover:bg-slate-800"
          data-testid={`free-orient-toggle-${clinic.clinic_id}`}
        >
          {open ? 'Скрий часовете' : 'Виж свободни часове'}
          <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {open && (
        <div data-testid={`free-orient-slots-${clinic.clinic_id}`}>
          <OrientationCalendar
            slots={clinic.slots}
            onPick={onPick}
            testIdPrefix={`free-orient-${clinic.clinic_id}`}
          />
        </div>
      )}
    </li>
  )
}

function BookingRequestModal({
  leadId, clinic, slot, topicOptions, onClose, onSuccess,
}: {
  leadId: string
  clinic: ClinicCard
  slot: Slot
  topicOptions: TopicOption[]
  onClose: () => void
  onSuccess: (bookingId: string) => void
}) {
  const [topic, setTopic] = useState<string>(topicOptions[0]?.value || 'not_sure')
  const [consent, setConsent] = useState(false)
  const [disclaimer, setDisclaimer] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError(''); setSubmitting(true)
    try {
      const r = await fetch(`${API_URL}/api/leads/${leadId}/online-orientation-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: clinic.clinic_id,
          scheduled_at: slot.scheduled_at,
          topic,
          consent_confirmed: consent,
          disclaimer_acknowledged: disclaimer,
        }),
      })
      if (!r.ok) {
        let msg = 'Грешка при изпращане на заявката.'
        try {
          const j = await r.json()
          if (j?.detail?.message) msg = j.detail.message
          else if (typeof j?.detail === 'string') msg = j.detail
        } catch { /* noop */ }
        setError(msg)
        return
      }
      const j = await r.json()
      gaTrackEvent('free_orientation_booking_request_submitted', {
        lead_id: leadId, clinic_id: clinic.clinic_id, topic,
      })
      onSuccess(j.booking?.id || '')
    } finally { setSubmitting(false) }
  }

  return (
    <div
      role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      data-testid="booking-modal"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-slate-900">
            Заявка за онлайн ориентация
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {clinic.clinic_name} · {slot.label_local_bg} · {slot.duration_minutes} мин
          </p>
        </div>

        <label className="block text-xs text-slate-600">
          <span>Тема / основна тревога</span>
          <select
            value={topic} onChange={(e) => setTopic(e.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-2 text-sm"
            data-testid="booking-topic"
          >
            {topicOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-2 text-xs text-slate-700">
          <input
            type="checkbox" checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-teal-500"
            data-testid="booking-consent"
          />
          <span>
            Съгласявам се клиниката да получи отговорите ми и контактни данни за
            целите на онлайн ориентацията.
          </span>
        </label>

        <label className="flex items-start gap-2 text-xs text-slate-700">
          <input
            type="checkbox" checked={disclaimer}
            onChange={(e) => setDisclaimer(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-teal-500"
            data-testid="booking-disclaimer"
          />
          <span>
            Разбирам, че онлайн ориентацията не замества физически преглед,
            диагноза или лечебен план.
          </span>
        </label>

        {error && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2" data-testid="booking-error">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button" onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700"
            data-testid="booking-close"
          >
            Откажи
          </button>
          <button
            type="button" onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
            data-testid="booking-submit"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Изпрати заявка
          </button>
        </div>
      </div>
    </div>
  )
}
