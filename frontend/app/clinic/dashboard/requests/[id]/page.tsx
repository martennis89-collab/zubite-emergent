'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, MapPin, User, Tag, Calendar as CalIcon,
  CheckCircle2, X, Loader2, ChevronDown, ChevronUp,
  Pencil, Clock3, StickyNote, WalletCards,
} from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import { RequestProgressStrip } from '@/components/clinic/RequestProgressStrip'
import { PatientContextSection, type PatientContext } from '@/components/PatientContextSection'
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
  patient_context?: PatientContext | null
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
      // TODO(analytics): no clinic-side event tracker exists yet in this
      // repo (only lib/patientAnalytics.ts, patient-flow only). When one
      // is added, fire `clinic_request_viewed` here.
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
        // TODO(analytics): fire `clinic_marked_contacted` (action_type ===
        // 'patient_contacted') / `clinic_updated_request_status` (any other
        // action_type) once a clinic-side event tracker exists.
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
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium"
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

            <LeadOperationsPanel
              request={req}
              onReload={load}
            />

            {/* Patient context section — operational, not diagnostic. */}
            {data?.patient_context && (
              <PatientContextSection ctx={data.patient_context} />
            )}

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
                    <DoctorAssignSection
                      appointmentId={appt.id}
                      currentDoctorId={appt.doctor_id}
                      treatmentInterest={req.treatment_interest}
                    />
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
                          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium"
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
                        className="h-10 px-5 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
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
                        className="h-10 px-5 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-50"
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
                        className="h-9 px-3.5 rounded-full border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
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
                    actor === 'clinic' ? 'bg-teal-50 text-teal-700' :
                    actor === 'zubite' ? 'bg-violet-50 text-violet-700' :
                    actor === 'admin'  ? 'bg-amber-50 text-amber-700' :
                    actor === 'patient' ? 'bg-rose-50 text-rose-700' :
                    'bg-slate-50 text-slate-600'
                  return (
                    <li key={ev.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-50 grid place-items-center mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-teal-500" />
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

function LeadOperationsPanel({
  request, onReload,
}: {
  request: ConsultationRequest
  onReload: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState(request.patient_name || '')
  const [phone, setPhone] = useState(request.patient_phone || '')
  const [email, setEmail] = useState(request.patient_email || '')
  const [city, setCity] = useState(request.patient_city || '')
  const [owner, setOwner] = useState(request.owner || '')
  const [followUp, setFollowUp] = useState(
    request.follow_up_at ? new Date(request.follow_up_at).toISOString().slice(0, 16) : '',
  )
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')

  useEffect(() => {
    setName(request.patient_name || ''); setPhone(request.patient_phone || '')
    setEmail(request.patient_email || ''); setCity(request.patient_city || '')
    setOwner(request.owner || '')
    setFollowUp(request.follow_up_at ? new Date(request.follow_up_at).toISOString().slice(0, 16) : '')
  }, [request])

  const save = async () => {
    setSaving(true); setMessage('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/consultation-requests/${request.id}/lead`, {
        method: 'PATCH', credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, email: email || null, city: city || null,
          owner: owner || null,
          follow_up_at: followUp ? new Date(followUp).toISOString() : null,
        }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Промените не бяха запазени.')
      await onReload(); setEditing(false); setMessage('Данните са обновени.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Промените не бяха запазени.')
    } finally { setSaving(false) }
  }

  const addNote = async () => {
    if (!note.trim()) return
    setSaving(true); setMessage('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/consultation-requests/${request.id}/action`, {
        method: 'POST', credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: 'admin_note', note: note.trim() }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Бележката не беше добавена.')
      setNote(''); await onReload(); setMessage('Бележката е добавена.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Бележката не беше добавена.')
    } finally { setSaving(false) }
  }

  const addRevenue = async () => {
    if (!amount || !reference.trim()) return
    setSaving(true); setMessage('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/consultation-requests/${request.id}/revenue`, {
        method: 'POST', credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount.replace(',', '.')), currency: 'EUR', reference: reference.trim() }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Приходът не беше записан.')
      setAmount(''); setReference(''); await onReload(); setMessage('Приходът е записан и изпратен за синхронизация.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Приходът не беше записан.')
    } finally { setSaving(false) }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4" data-testid="lead-operations-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-900">Работа по заявката</h2>
          <p className="mt-0.5 text-xs text-slate-500">Контакт, отговорник, следваща стъпка и стойност на пациента.</p>
        </div>
        <button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">
          <Pencil className="h-3.5 w-3.5" /> {editing ? 'Затвори' : 'Редактирай'}
        </button>
      </div>

      {editing && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <OperationField label="Име" value={name} onChange={setName} />
          <OperationField label="Телефон" value={phone} onChange={setPhone} />
          <OperationField label="Имейл" value={email} onChange={setEmail} type="email" />
          <OperationField label="Град" value={city} onChange={setCity} />
          <OperationField label="Отговорник" value={owner} onChange={setOwner} placeholder="Име на служител" />
          <OperationField label="Проследяване" value={followUp} onChange={setFollowUp} type="datetime-local" min={new Date().toISOString().slice(0, 16)} />
          <div className="sm:col-span-2 flex justify-end">
            <button type="button" disabled={saving || !name.trim() || !phone.trim()} onClick={save} className="h-10 rounded-full bg-teal-500 px-5 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50">
              {saving ? 'Запазва се…' : 'Запази промените'}
            </button>
          </div>
        </div>
      )}

      {!editing && (request.owner || request.follow_up_at) && (
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {request.owner && <div><dt className="text-xs text-slate-500">Отговорник</dt><dd className="text-slate-800">{request.owner}</dd></div>}
          {request.follow_up_at && <div><dt className="text-xs text-slate-500">Следващо проследяване</dt><dd className="inline-flex items-center gap-1 text-slate-800"><Clock3 className="h-3.5 w-3.5 text-amber-500" />{formatDate(request.follow_up_at)}</dd></div>}
        </dl>
      )}

      <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"><StickyNote className="h-4 w-4" /> Нова бележка</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Какво трябва да знае екипът?" />
          <button type="button" disabled={saving || !note.trim()} onClick={addNote} className="mt-2 h-9 rounded-full border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">Добави бележка</button>
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"><WalletCards className="h-4 w-4" /> Приход</div>
          <div className="flex flex-wrap gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Стойност в EUR" />
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Фактура / референция" />
          </div>
          <button type="button" disabled={saving || !amount || !reference.trim()} onClick={addRevenue} className="mt-2 h-9 rounded-full bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">Запиши приход</button>
        </div>
      </div>
      {message && <p className="text-sm text-slate-600" role="status">{message}</p>}
    </section>
  )
}

function OperationField({ label, value, onChange, type = 'text', placeholder, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; min?: string }) {
  return <label className="text-sm text-slate-700"><span className="mb-1 block text-xs text-slate-500">{label}</span><input type={type} value={value} min={min} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" /></label>
}

interface Doctor {
  id: string
  name: string
  specialties: string[]
  accepts_online: boolean
  accepts_in_person: boolean
  active: boolean
}

interface AssignConflict {
  source: 'physical' | 'online'
  patient_name?: string | null
}

// `treatment_interest` (consultation_requests) and doctor `specialties`
// (ORIENTATION_TREATMENT_CATEGORIES) are two different vocabularies —
// this bridges the common cases so the specialty-match star is actually
// useful. Unmapped values (quiz sources, etc.) just get no highlight.
const TREATMENT_TO_SPECIALTY: Record<string, string> = {
  orthodontics: 'orthodontics',
  braces: 'orthodontics',
  aligners: 'aligners',
  invisalign: 'aligners',
  implants: 'implants',
  whitening: 'cosmetic_dentistry',
  cosmetic: 'cosmetic_dentistry',
  'cosmetic-dentistry': 'cosmetic_dentistry',
  full_mouth: 'general_orientation',
  general: 'general_orientation',
}

/**
 * Staff-internal doctor assignment on an already-booked appointment.
 * Purely a routing label — never affects availability/slot generation
 * (patients still see clinic-wide availability, unchanged). Assigning
 * the same doctor to overlapping times is allowed, just surfaced as a
 * non-blocking warning since nothing upstream prevents it anymore.
 */
function DoctorAssignSection({
  appointmentId, currentDoctorId, treatmentInterest,
}: {
  appointmentId: string
  currentDoctorId?: string | null
  treatmentInterest?: string | null
}) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<AssignConflict[]>([])
  const [err, setErr] = useState('')
  // Local, optimistic-after-confirm copy of the assignment — kept out of
  // the page's `load()` cycle deliberately: that function drives the
  // full-page loading skeleton, which would unmount this section (and
  // wipe the conflict warning) the instant a reload ran.
  const [doctorId, setDoctorId] = useState(currentDoctorId || '')
  useEffect(() => { setDoctorId(currentDoctorId || '') }, [currentDoctorId])

  useEffect(() => {
    let cancelled = false
    fetch(`${API_URL}/api/clinic/doctors`, { credentials: 'include' as RequestCredentials })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setDoctors(d.doctors || []) })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  const assign = async (newDoctorId: string) => {
    setErr(''); setConflicts([]); setSaving(true)
    try {
      const r = await fetch(`${API_URL}/api/clinic/appointments/${appointmentId}/assign-doctor`, {
        method: 'PATCH',
        credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: newDoctorId || null }),
      })
      if (!r.ok) { setErr('Лекарят не бе назначен.'); return }
      const data = await r.json()
      setDoctorId(data.doctor_id || '')
      setConflicts(data.conflicts || [])
    } catch {
      setErr('Грешка при свързване със сървъра.')
    } finally {
      setSaving(false)
    }
  }

  const inPersonDoctors = doctors.filter((d) => d.accepts_in_person && d.active)
  const targetSpecialty = treatmentInterest ? TREATMENT_TO_SPECIALTY[treatmentInterest] : undefined
  const sorted = [...inPersonDoctors].sort((a, b) => {
    const aMatch = targetSpecialty ? a.specialties.includes(targetSpecialty) : false
    const bMatch = targetSpecialty ? b.specialties.includes(targetSpecialty) : false
    if (aMatch !== bMatch) return aMatch ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  if (!loaded || inPersonDoctors.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-emerald-100">
      <label className="block text-xs text-emerald-800 mb-1" htmlFor="doctor-assign-select">
        Лекар
      </label>
      <select
        id="doctor-assign-select"
        value={doctorId}
        onChange={(e) => assign(e.target.value)}
        disabled={saving}
        className="w-full sm:w-64 border border-emerald-200 rounded-lg px-2 py-1.5 text-sm bg-white disabled:opacity-50"
        data-testid="doctor-assign-select"
      >
        <option value="">— Не е назначен —</option>
        {sorted.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}{targetSpecialty && d.specialties.includes(targetSpecialty) ? ' ★' : ''}
          </option>
        ))}
      </select>
      {conflicts.length > 0 && (
        <p
          className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5"
          data-testid="doctor-assign-conflict"
        >
          Внимание: лекарят вече има {conflicts.length === 1 ? 'друг ангажимент' : `${conflicts.length} други ангажимента`} по това време.
        </p>
      )}
      {err && (
        <p className="mt-2 text-xs text-rose-700" data-testid="doctor-assign-error">{err}</p>
      )}
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
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-200"
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
              className="h-10 px-5 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50 inline-flex items-center gap-2"
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
