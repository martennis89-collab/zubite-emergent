'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, MapPin, User, Tag, Calendar as CalIcon,
  CheckCircle2, X, Loader2,
} from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import {
  ConsultationRequest, Appointment, EventItem,
  statusBadge, formatDate, TREATMENT_LABELS, EVENT_LABELS,
  APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPES,
} from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface DetailResponse {
  request: ConsultationRequest
  appointment: Appointment | null
  events: EventItem[]
}

const ACTIONS_PRIMARY: Array<{ type: string; label: string; cls: string }> = [
  { type: 'call_attempted', label: 'Опит за обаждане', cls: 'bg-amber-500 hover:bg-amber-600 text-white' },
  { type: 'patient_contacted', label: 'Свързано с пациента', cls: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  { type: 'no_answer', label: 'Без отговор', cls: 'bg-slate-100 hover:bg-slate-200 text-slate-700' },
]
const ACTIONS_SECONDARY: Array<{ type: string; label: string; cls: string }> = [
  { type: 'patient_declined', label: 'Пациентът отказа', cls: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' },
  { type: 'not_suitable', label: 'Неподходяща', cls: 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200' },
  { type: 'mark_attended', label: 'Посетила', cls: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' },
  { type: 'mark_no_show', label: 'Не се яви', cls: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' },
]

export default function ClinicRequestDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showBook, setShowBook] = useState<'book_consultation' | 'reschedule' | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = localStorage.getItem('clinic_token')
    if (!token) { router.replace('/clinic'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/clinic/consultation-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) setData(await r.json())
    } finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { if (id) load() }, [id, load])

  const performAction = async (action_type: string, note?: string, appointment?: object) => {
    const token = localStorage.getItem('clinic_token')
    if (!token) return
    setBusy(true)
    setActionMsg(null)
    try {
      const r = await fetch(`${API_URL}/api/clinic/consultation-requests/${id}/action`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type, note, appointment }),
      })
      if (r.ok) {
        setActionMsg(`Действието е записано: ${action_type}`)
        await load()
      } else {
        const j = await r.json().catch(() => ({}))
        setActionMsg(`Грешка: ${j.detail || r.status}`)
      }
    } finally { setBusy(false) }
  }

  const req = data?.request
  const appt = data?.appointment
  const events = data?.events || []
  const sb = useMemo(() => statusBadge(req?.status), [req?.status])

  return (
    <ClinicShell>
      <div className="space-y-6">
        <Link
          href="/clinic/dashboard/requests"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Към списъка
        </Link>

        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Зареждане…</div>
        ) : !req ? (
          <div className="text-slate-400">Заявката не е намерена.</div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h1 className="font-serif text-2xl font-semibold text-slate-900">
                    {req.patient_name}
                  </h1>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${sb.cls}`} data-testid="request-status">
                      {sb.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      Назначена: {formatDate(req.assigned_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`tel:${req.patient_phone}`}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium"
                    data-testid="request-call-link"
                  >
                    <Phone className="w-4 h-4" />
                    Обади се
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
                <DetailRow icon={<Phone className="w-4 h-4" />} label="Телефон" value={req.patient_phone} />
                <DetailRow icon={<Mail className="w-4 h-4" />} label="Имейл" value={req.patient_email} />
                <DetailRow icon={<MapPin className="w-4 h-4" />} label="Град" value={req.patient_city} />
                <DetailRow icon={<Tag className="w-4 h-4" />} label="Лечение" value={TREATMENT_LABELS[req.treatment_interest] || req.treatment_interest} />
                <DetailRow icon={<User className="w-4 h-4" />} label="Готовност" value={req.readiness} />
                <DetailRow icon={<User className="w-4 h-4" />} label="Спешност" value={req.urgency} />
              </div>

              {(req.utm_source || req.utm_campaign || req.source) && (
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>Source: <span className="text-slate-700 font-mono">{req.source || '—'}</span></div>
                  <div>UTM source: <span className="text-slate-700 font-mono">{req.utm_source || '—'}</span></div>
                  <div>UTM campaign: <span className="text-slate-700 font-mono">{req.utm_campaign || '—'}</span></div>
                  <div>UTM ad: <span className="text-slate-700 font-mono">{req.utm_ad || '—'}</span></div>
                </div>
              )}
            </div>

            {/* Booking summary */}
            {appt && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5" data-testid="request-appointment-card">
                <div className="flex items-start gap-3">
                  <CalIcon className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-emerald-900">Резервирана консултация</div>
                    <div className="text-sm text-emerald-800 mt-1">
                      {APPOINTMENT_TYPE_LABELS[appt.appointment_type] || appt.appointment_type}
                      {' · '}
                      {formatDate(appt.start_time)} — {formatDate(appt.end_time)}
                    </div>
                    {appt.notes && <div className="text-xs text-emerald-700 mt-2">{appt.notes}</div>}
                    <div className="text-xs text-emerald-700 mt-1">
                      Статус: <span className="font-medium">{appt.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="font-medium text-slate-900 mb-3">Действия</h2>
              <div className="flex flex-wrap gap-2">
                {ACTIONS_PRIMARY.map((a) => (
                  <button
                    key={a.type}
                    type="button"
                    disabled={busy}
                    onClick={() => performAction(a.type)}
                    data-testid={`action-${a.type}`}
                    className={`h-9 px-4 rounded-full text-sm font-medium ${a.cls} disabled:opacity-50`}
                  >
                    {a.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowBook('book_consultation')}
                  data-testid="action-book_consultation"
                  className="h-9 px-4 rounded-full text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50"
                >
                  Резервирай консултация
                </button>
                {appt && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowBook('reschedule')}
                    data-testid="action-reschedule"
                    className="h-9 px-4 rounded-full text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                  >
                    Премести
                  </button>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {ACTIONS_SECONDARY.map((a) => (
                  <button
                    key={a.type}
                    type="button"
                    disabled={busy}
                    onClick={() => performAction(a.type)}
                    data-testid={`action-${a.type}`}
                    className={`h-8 px-3 rounded-full text-xs font-medium ${a.cls} disabled:opacity-50`}
                  >
                    {a.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => performAction('cancel')}
                  data-testid="action-cancel"
                  className="h-8 px-3 rounded-full text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 disabled:opacity-50"
                >
                  Отмени заявката
                </button>
              </div>
              {actionMsg && (
                <div className="mt-3 text-xs text-slate-500" data-testid="action-message">
                  {actionMsg}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="font-medium text-slate-900 mb-3">История на заявката</h2>
              <ol className="space-y-3" data-testid="request-timeline">
                {events.length === 0 && (
                  <li className="text-sm text-slate-400">Няма събития.</li>
                )}
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-50 grid place-items-center mt-0.5 flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        {EVENT_LABELS[ev.event_type] || ev.event_type}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(ev.created_at)}
                        {ev.previous_status && ev.new_status && (
                          <span className="font-mono"> · {ev.previous_status} → {ev.new_status}</span>
                        )}
                      </div>
                      {ev.note && (
                        <div className="text-xs text-slate-600 mt-1">{ev.note}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {req.notes && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h2 className="font-medium text-slate-900 mb-2">Бележки</h2>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{req.notes}</pre>
              </div>
            )}
          </>
        )}
      </div>

      {showBook && (
        <BookingModal
          mode={showBook}
          existing={appt || null}
          onClose={() => setShowBook(null)}
          onSubmit={async (payload) => {
            await performAction(showBook, payload.note, {
              appointment_type: payload.appointment_type,
              start_time: payload.start_time,
              end_time: payload.end_time,
              notes: payload.notes,
            })
            setShowBook(null)
          }}
          busy={busy}
        />
      )}
    </ClinicShell>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-400 mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-slate-700">{value || '—'}</div>
      </div>
    </div>
  )
}

interface BookingPayload {
  appointment_type: string
  start_time: string
  end_time: string
  notes?: string
  note?: string
}

function BookingModal({
  mode, existing, onClose, onSubmit, busy,
}: {
  mode: 'book_consultation' | 'reschedule'
  existing: Appointment | null
  onClose: () => void
  onSubmit: (p: BookingPayload) => Promise<void>
  busy: boolean
}) {
  const [type, setType] = useState(existing?.appointment_type || 'orthodontic_consultation')
  const initialStart = existing?.start_time
    ? new Date(existing.start_time).toISOString().slice(0, 16)
    : ''
  const [date, setDate] = useState(initialStart.slice(0, 10) || '')
  const [time, setTime] = useState(initialStart.slice(11, 16) || '10:00')
  const [duration, setDuration] = useState<string>('60')
  const [notes, setNotes] = useState(existing?.notes || '')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time) return
    const start = new Date(`${date}T${time}`)
    const end = new Date(start.getTime() + parseInt(duration, 10) * 60_000)
    await onSubmit({
      appointment_type: type,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      notes: notes || undefined,
      note: undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 grid place-items-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4"
        data-testid="booking-modal"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-slate-900">
            {mode === 'reschedule' ? 'Премести консултация' : 'Резервирай консултация'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <label className="block text-sm">
          <span className="text-slate-700">Тип консултация</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
            data-testid="booking-type"
          >
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-700">Дата</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              data-testid="booking-date"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Час</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              data-testid="booking-time"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-slate-700">Продължителност</span>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
            data-testid="booking-duration"
          >
            <option value="30">30 минути</option>
            <option value="45">45 минути</option>
            <option value="60">60 минути</option>
            <option value="90">90 минути</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Бележки</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
            data-testid="booking-notes"
          />
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Откажи
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-10 px-5 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-medium disabled:opacity-50 inline-flex items-center gap-2"
            data-testid="booking-submit"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Потвърди
          </button>
        </div>
      </form>
    </div>
  )
}
