'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, MapPin, User, Tag, Calendar as CalIcon,
  CheckCircle2, X, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import { RequestProgressStrip } from '@/components/clinic/RequestProgressStrip'
import {
  ConsultationRequest, Appointment, EventItem,
  statusBadge, formatDate, TREATMENT_LABELS, EVENT_LABELS,
  APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPES,
  readinessLabel, urgencyLabel, apptStatusLabel,
  actionSuccessMessage, statusTransitionPhrase,
  EVENT_ACTOR_LABELS, inferEventActor,
  progressFromStatus, ctaStageFromStatus,
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

// Destructive / negative actions — always rendered behind a collapsed expander.
const ACTIONS_TERTIARY: Array<{ type: string; label: string; confirmMsg: string }> = [
  { type: 'patient_declined', label: 'Пациентът отказа', confirmMsg: 'Да маркирам ли заявката като „пациентът отказа“?' },
  { type: 'not_suitable',     label: 'Неподходяща заявка', confirmMsg: 'Да маркирам ли заявката като неподходяща?' },
  { type: 'cancel',           label: 'Отмени заявката', confirmMsg: 'Сигурни ли сте, че искате да отмените заявката?' },
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
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/clinic/consultation-requests/${id}`, {
        credentials: 'include' as RequestCredentials,
      })
      if (r.status === 401 || r.status === 403) {
        try { localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_user') } catch { /* noop */ }
        router.replace('/clinic')
        return
      }
      if (r.ok) setData(await r.json())
    } finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { if (id) load() }, [id, load])

  const performAction = async (action_type: string, note?: string, appointment?: object) => {
    setActionMsg(null)
    setBusy(true)
    try {
      const r = await fetch(`${API_URL}/api/clinic/consultation-requests/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type, note, appointment }), credentials: 'include' as RequestCredentials,})
      if (r.ok) {
        setActionMsg(actionSuccessMessage(action_type))
        await load()
      } else {
        const j = await r.json().catch(() => ({}))
        setActionMsg(`Грешка: ${j.detail || 'неуспешно действие'}`)
      }
    } catch {
      setActionMsg('Грешка при свързване със сървъра.')
    } finally { setBusy(false) }
  }

  const req = data?.request
  const appt = data?.appointment
  const events = data?.events || []
  const sb = useMemo(() => statusBadge(req?.status), [req?.status])
  const progress = useMemo(() => progressFromStatus(req?.status), [req?.status])
  const stage = useMemo(() => ctaStageFromStatus(req?.status), [req?.status])
  const [showTertiary, setShowTertiary] = useState(false)

  const confirmAction = (type: string, msg: string) => {
    if (typeof window !== 'undefined' && !window.confirm(msg)) return
    performAction(type)
  }

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
          <RequestDetailSkeleton />
        ) : !req ? (
          <div
            className="bg-white border border-slate-200 rounded-2xl p-10 text-center"
            data-testid="request-not-found"
          >
            <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-slate-100 text-slate-500 mb-3">
              <X className="w-5 h-5" />
            </div>
            <div className="text-base font-medium text-slate-700">
              Заявката не е намерена
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Възможно е да е била преразпределена. Върнете се към списъка с
              заявки.
            </p>
          </div>
        ) : (
          <>
            <RequestProgressStrip shape={progress} />

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
                <DetailRow icon={<User className="w-4 h-4" />} label="Готовност" value={readinessLabel(req.readiness)} />
                <DetailRow icon={<User className="w-4 h-4" />} label="Спешност" value={urgencyLabel(req.urgency)} />
              </div>

              {/* UTM / source data intentionally hidden from clinic view (admin-only metadata). */}
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
                      Статус: <span className="font-medium">{apptStatusLabel(appt.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action panel — contextual hierarchy by current stage. */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5" data-testid="action-panel">
              {stage === 'completed' ? (
                <div className="text-center py-3">
                  <div className="text-sm text-slate-500">Заявката е приключена</div>
                  <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    {sb.label}
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-medium text-slate-900 mb-1">Какво следва?</h2>
                  <p className="text-xs text-slate-500 mb-3">
                    {stage === 'contact' && 'Свържете се с пациента и запишете резултата.'}
                    {stage === 'after_contact' && 'Резервирайте консултация в подходящ момент.'}
                    {stage === 'after_booking' && 'След консултацията маркирайте дали пациентът е посетил.'}
                    {stage === 'unknown' && 'Изберете подходящо действие.'}
                  </p>

                  {/* Primary CTA block — depends on stage. */}
                  <div className="flex flex-wrap gap-2" data-testid="action-primary">
                    {stage === 'contact' && (
                      <>
                        <a
                          href={`tel:${req.patient_phone}`}
                          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium"
                          data-testid="action-call-phone"
                        >
                          <Phone className="w-4 h-4" />
                          Обади се на пациента
                        </a>
                        {ACTIONS_PRIMARY.map((a) => (
                          <button
                            key={a.type}
                            type="button"
                            disabled={busy}
                            onClick={() => performAction(a.type)}
                            data-testid={`action-${a.type}`}
                            className={`h-10 px-4 rounded-full text-sm font-medium ${a.cls} disabled:opacity-50`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </>
                    )}
                    {stage === 'after_contact' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setShowBook('book_consultation')}
                        data-testid="action-book_consultation"
                        className="h-10 px-5 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        <CalIcon className="w-4 h-4" />
                        Резервирай консултация
                      </button>
                    )}
                    {stage === 'after_booking' && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => performAction('mark_attended')}
                          data-testid="action-mark_attended"
                          className="h-10 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                          Маркирай като посетила
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => performAction('mark_no_show')}
                          data-testid="action-mark_no_show"
                          className="h-10 px-4 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-medium disabled:opacity-50"
                        >
                          Пациентът не се яви
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setShowBook('reschedule')}
                          data-testid="action-reschedule"
                          className="h-10 px-4 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium disabled:opacity-50"
                        >
                          Премести консултацията
                        </button>
                      </>
                    )}
                    {stage === 'unknown' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setShowBook('book_consultation')}
                        data-testid="action-book_consultation"
                        className="h-10 px-5 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Резервирай консултация
                      </button>
                    )}
                  </div>

                  {/* Secondary actions for `contact` stage — booking is here when not the primary. */}
                  {stage === 'contact' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2" data-testid="action-secondary">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setShowBook('book_consultation')}
                        data-testid="action-book_consultation"
                        className="h-9 px-3.5 rounded-full border border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <CalIcon className="w-3.5 h-3.5" />
                        Резервирай директно
                      </button>
                    </div>
                  )}

                  {/* Tertiary destructive actions — collapsed by default. */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowTertiary((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                      data-testid="toggle-tertiary"
                    >
                      {showTertiary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      Други опции
                    </button>
                    {showTertiary && (
                      <div className="mt-2 flex flex-wrap gap-2" data-testid="action-tertiary">
                        {ACTIONS_TERTIARY.map((a) => (
                          <button
                            key={a.type}
                            type="button"
                            disabled={busy}
                            onClick={() => confirmAction(a.type, a.confirmMsg)}
                            data-testid={`action-${a.type}`}
                            className="h-8 px-3 rounded-full text-xs font-medium bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 disabled:opacity-50"
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {actionMsg && (
                <div
                  className={`mt-3 text-sm rounded-lg px-3 py-2 ${
                    actionMsg.startsWith('Грешка')
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                  data-testid="action-message"
                >
                  {actionMsg}
                </div>
              )}
              {busy && (
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500" data-testid="action-busy">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Записва се…
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
                {events.map((ev) => {
                  const actor = inferEventActor(ev)
                  const actorCls =
                    actor === 'clinic' ? 'bg-sky-50 text-sky-700' :
                    actor === 'zubite' ? 'bg-violet-50 text-violet-700' :
                    actor === 'admin'  ? 'bg-amber-50 text-amber-700' :
                    actor === 'patient' ? 'bg-rose-50 text-rose-700' :
                    'bg-slate-50 text-slate-600'
                  return (
                    <li key={ev.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-50 grid place-items-center mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-sky-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-medium text-slate-900">
                            {EVENT_LABELS[ev.event_type] || ev.event_type.replace(/_/g, ' ')}
                          </div>
                          <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-medium ${actorCls}`}>
                            {EVENT_ACTOR_LABELS[actor]}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDate(ev.created_at)}
                          {ev.previous_status && ev.new_status && (
                            <span> · {statusTransitionPhrase(ev.previous_status, ev.new_status)}</span>
                          )}
                        </div>
                        {ev.note && (
                          <div className="text-xs text-slate-600 mt-1">{ev.note}</div>
                        )}
                      </div>
                    </li>
                  )
                })}
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
          patientName={req?.patient_name || ''}
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

function RequestDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" data-testid="request-detail-skeleton">
      <div className="bg-white border border-slate-200 rounded-2xl h-20" />
      <div className="bg-white border border-slate-200 rounded-2xl h-44" />
      <div className="bg-white border border-slate-200 rounded-2xl h-32" />
      <div className="bg-white border border-slate-200 rounded-2xl h-40" />
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
  mode, existing, patientName, onClose, onSubmit, busy,
}: {
  mode: 'book_consultation' | 'reschedule'
  existing: Appointment | null
  patientName: string
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
  const [error, setError] = useState<string | null>(null)

  // Client-side guard: block past date selection in the date picker.
  const todayIso = new Date().toISOString().slice(0, 10)

  // Esc-to-close. Click-outside is already wired on the backdrop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!date || !time) return
    const start = new Date(`${date}T${time}`)
    if (Number.isNaN(start.getTime())) {
      setError('Невалидна дата/час.')
      return
    }
    if (start.getTime() < Date.now() - 60_000) {
      setError('Не може да резервираш в миналото. Избери бъдеща дата и час.')
      return
    }
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
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg font-semibold text-slate-900">
              {mode === 'reschedule' ? 'Премести консултация' : 'Резервирай консултация'}
            </h3>
            {patientName && (
              <p className="text-sm text-slate-500 mt-0.5">Пациент: <span className="font-medium text-slate-700">{patientName}</span></p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 -mt-1">
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
              min={todayIso}
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
        {error && (
          <div
            className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
            data-testid="booking-error"
          >
            {error}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Esc за затваряне
          </span>
          <div className="flex items-center gap-2 ml-auto">
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
              {mode === 'reschedule' ? 'Премести' : 'Резервирай'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
