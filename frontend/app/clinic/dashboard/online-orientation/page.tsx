'use client'

/**
 * Clinic Dashboard · Online Orientation booking requests (Phase E).
 *
 * Read + clinic-side actions: confirm / reject / cancel / mark completed /
 * mark no-show / mark converted / mark not-suitable / add note.
 *
 * Access control: enforced server-side. Clinic can only see their own
 * bookings (`/api/clinic/online-orientation-bookings`).
 *
 * Care Pass: NEVER unlocked here. Clinic confirm only flips the booking
 * status. Care Pass logic is Phase F.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Calendar,
  RefreshCw, Phone, Mail, MessageSquare, Clock,
} from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Booking {
  id: string
  status: string
  topic: string
  topic_label_bg?: string
  scheduled_at: string
  duration_minutes: number
  patient_name: string | null
  patient_phone: string | null
  patient_email: string | null
  patient_note: string | null
  quiz_summary: Record<string, unknown> | null
  internal_clinic_note: string | null
  expires_at: string | null
  created_at: string
  clinic_confirmed_at: string | null
}

const STATUS_LABELS_BG: Record<string, string> = {
  pending_clinic_confirmation:    'Чака потвърждение',
  confirmed_by_clinic:            'Потвърдена',
  rejected_by_clinic:             'Отказана от клиниката',
  expired_pending_confirmation:   'Изтекла без потвърждение',
  scheduled:                      'Насрочена',
  completed:                      'Завършена',
  no_show:                        'Не се яви',
  cancelled_by_patient:           'Отказана от пациента',
  cancelled_by_clinic:            'Отменена',
  converted_to_in_clinic:         'Премина в клиниката',
  not_suitable:                   'Не е подходяща',
  needs_admin_review:             'За преглед от админ',
}

const STATUS_TONES: Record<string, string> = {
  pending_clinic_confirmation:    'bg-amber-50 text-amber-800 border-amber-200',
  confirmed_by_clinic:            'bg-emerald-50 text-emerald-700 border-emerald-200',
  scheduled:                      'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected_by_clinic:             'bg-rose-50 text-rose-700 border-rose-200',
  cancelled_by_clinic:            'bg-rose-50 text-rose-700 border-rose-200',
  cancelled_by_patient:           'bg-slate-100 text-slate-600 border-slate-200',
  expired_pending_confirmation:   'bg-slate-100 text-slate-500 border-slate-200',
  completed:                      'bg-teal-50 text-teal-700 border-teal-200',
  no_show:                        'bg-amber-50 text-amber-800 border-amber-200',
  converted_to_in_clinic:         'bg-teal-50 text-teal-700 border-teal-200',
  not_suitable:                   'bg-slate-100 text-slate-600 border-slate-200',
}

const TERMINAL = new Set([
  'completed', 'no_show', 'converted_to_in_clinic', 'not_suitable',
  'cancelled_by_patient', 'rejected_by_clinic', 'expired_pending_confirmation',
])

const PENDING = new Set(['pending_clinic_confirmation'])
const CONFIRMED = new Set(['confirmed_by_clinic', 'scheduled'])

export default function ClinicOrientationBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/online-orientation-bookings`, {
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) { setErr('Грешка при зареждане.'); return }
      setBookings((await r.json()).bookings || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id: string, action: string, note?: string) => {
    const r = await fetch(`${API_URL}/api/clinic/online-orientation-bookings/${id}/action`, {
      method: 'POST',
      credentials: 'include' as RequestCredentials,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    })
    if (!r.ok) {
      let msg = 'Грешка при действие.'
      try { const j = await r.json(); if (j?.detail?.message) msg = j.detail.message } catch { /* noop */ }
      alert(msg)
      return
    }
    await load()
  }

  const pending = bookings.filter((b) => PENDING.has(b.status))
  const confirmed = bookings.filter((b) => CONFIRMED.has(b.status))
  const past = bookings.filter((b) => TERMINAL.has(b.status))

  return (
    <ClinicShell>
      <div className="space-y-6" data-testid="clinic-orient-bookings-page">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Безплатна онлайн ориентация — заявки
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Заявки от пациенти за първи онлайн разговор. Потвърдете, ако часът работи.
            </p>
          </div>
          <button
            type="button" onClick={load}
            className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
            data-testid="clinic-orient-refresh"
          >
            <RefreshCw className="w-4 h-4" /> Опресни
          </button>
        </header>

        {loading ? (
          <div className="inline-flex items-center gap-2 text-sm text-slate-500" data-testid="clinic-orient-loading">
            <Loader2 className="w-4 h-4 animate-spin" /> Зареждане…
          </div>
        ) : err ? (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3" data-testid="clinic-orient-error">
            {err}
          </div>
        ) : (
          <>
            <BookingsGroup title={`Чакат потвърждение (${pending.length})`} bookings={pending} act={act} variant="pending" testid="clinic-orient-pending-group" />
            <BookingsGroup title={`Потвърдени / насрочени (${confirmed.length})`} bookings={confirmed} act={act} variant="confirmed" testid="clinic-orient-confirmed-group" />
            <BookingsGroup title={`История (${past.length})`} bookings={past} act={act} variant="past" testid="clinic-orient-past-group" />
          </>
        )}
      </div>
    </ClinicShell>
  )
}

function BookingsGroup({
  title, bookings, act, variant, testid,
}: {
  title: string
  bookings: Booking[]
  act: (id: string, action: string, note?: string) => Promise<void>
  variant: 'pending' | 'confirmed' | 'past'
  testid: string
}) {
  if (bookings.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-500" data-testid={testid}>
        <h2 className="font-semibold text-slate-800 text-sm mb-1">{title}</h2>
        <p className="italic">Няма записи.</p>
      </section>
    )
  }
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3" data-testid={testid}>
      <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
      <ul className="space-y-3">
        {bookings.map((b) => (
          <li key={b.id} className="border border-slate-100 rounded-xl p-3 sm:p-4" data-testid={`clinic-orient-card-${b.id}`}>
            <BookingCard booking={b} act={act} variant={variant} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function BookingCard({
  booking, act, variant,
}: {
  booking: Booking
  act: (id: string, action: string, note?: string) => Promise<void>
  variant: 'pending' | 'confirmed' | 'past'
}) {
  const [noteInput, setNoteInput] = useState(booking.internal_clinic_note || '')
  const [working, setWorking] = useState<string | null>(null)
  const run = async (action: string, note?: string) => {
    setWorking(action)
    try { await act(booking.id, action, note) }
    finally { setWorking(null) }
  }
  const tone = STATUS_TONES[booking.status] || 'bg-slate-50 text-slate-700 border-slate-200'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-slate-900 text-sm" data-testid={`booking-name-${booking.id}`}>
            {booking.patient_name || 'Пациент'}
          </p>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(booking.scheduled_at).toLocaleString('bg-BG')}</span>
            <span>· {booking.duration_minutes} мин</span>
            <span>· {booking.topic_label_bg || booking.topic}</span>
          </p>
          {booking.patient_phone && (
            <p className="text-xs text-slate-600 inline-flex items-center gap-1">
              <Phone className="w-3 h-3" /> {booking.patient_phone}
            </p>
          )}
          {booking.patient_email && (
            <p className="text-xs text-slate-600 inline-flex items-center gap-1">
              <Mail className="w-3 h-3" /> {booking.patient_email}
            </p>
          )}
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${tone}`} data-testid={`booking-status-${booking.id}`}>
          {STATUS_LABELS_BG[booking.status] || booking.status}
        </span>
      </div>

      {booking.expires_at && variant === 'pending' && (
        <p className="text-[11px] text-amber-700 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> Изтича: {new Date(booking.expires_at).toLocaleString('bg-BG')}
        </p>
      )}

      {booking.patient_note && (
        <p className="text-xs text-slate-600 italic">„{booking.patient_note}"</p>
      )}

      {booking.quiz_summary && (
        <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2">
          <span className="font-medium text-slate-600">Резюме от куиза:</span>{' '}
          band={String(booking.quiz_summary['band'] ?? '—')}{' · '}
          сегмент={String(booking.quiz_summary['segment'] ?? '—')}{' · '}
          score={String(booking.quiz_summary['score_total'] ?? '—')}
        </div>
      )}

      {/* Internal note */}
      <div className="mt-2">
        <label className="block text-[11px] text-slate-500">Вътрешна бележка</label>
        <textarea
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          rows={2}
          className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
          data-testid={`booking-note-input-${booking.id}`}
        />
        <button
          type="button"
          onClick={() => run('add_note', noteInput)}
          disabled={working === 'add_note'}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700"
          data-testid={`booking-save-note-${booking.id}`}
        >
          <MessageSquare className="w-3 h-3" /> Запази бележка
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-2">
        {variant === 'pending' && (
          <>
            <ActionBtn label="Потвърди" testid={`act-confirm-${booking.id}`} action="confirm" run={run} working={working} accent="emerald" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
            <ActionBtn label="Откажи" testid={`act-reject-${booking.id}`} action="reject" run={run} working={working} accent="rose" icon={<XCircle className="w-3.5 h-3.5" />} />
            <ActionBtn label="Отмени" testid={`act-cancel-${booking.id}`} action="cancel" run={run} working={working} accent="slate" />
          </>
        )}
        {variant === 'confirmed' && (
          <>
            <ActionBtn label="Завърши" testid={`act-completed-${booking.id}`} action="mark_completed" run={run} working={working} accent="teal" />
            <ActionBtn label="Не се яви" testid={`act-noshow-${booking.id}`} action="mark_no_show" run={run} working={working} accent="amber" icon={<AlertCircle className="w-3.5 h-3.5" />} />
            <ActionBtn label="Премина в клиниката" testid={`act-converted-${booking.id}`} action="mark_converted_to_in_clinic" run={run} working={working} accent="teal" />
            <ActionBtn label="Не е подходяща" testid={`act-not-suitable-${booking.id}`} action="mark_not_suitable" run={run} working={working} accent="slate" />
            <ActionBtn label="Отмени" testid={`act-cancel-${booking.id}`} action="cancel" run={run} working={working} accent="rose" />
          </>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  label, testid, action, run, working, accent, icon,
}: {
  label: string; testid: string; action: string;
  run: (action: string) => Promise<void>;
  working: string | null;
  accent: 'emerald' | 'rose' | 'teal' | 'amber' | 'slate';
  icon?: React.ReactNode;
}) {
  const palettes: Record<string, string> = {
    emerald: 'bg-emerald-500 text-white hover:bg-emerald-600',
    rose:    'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50',
    teal:    'bg-teal-500 text-white hover:bg-teal-600',
    amber:   'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50',
    slate:   'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  }
  return (
    <button
      type="button" onClick={() => run(action)}
      disabled={working === action}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium disabled:opacity-50 ${palettes[accent]}`}
      data-testid={testid}
    >
      {working === action ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (icon || null)}
      {label}
    </button>
  )
}
