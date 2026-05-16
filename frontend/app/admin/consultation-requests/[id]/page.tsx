'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react'
import {
  ConsultationRequest, Appointment, EventItem,
  statusBadge, formatDate, TREATMENT_LABELS, EVENT_LABELS,
  APPOINTMENT_TYPE_LABELS,
  REQUEST_KIND_DESCRIPTORS, requestKindFromCreatedFrom,
  SELECTION_SOURCE_LABELS,
} from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface DetailResp {
  request: ConsultationRequest
  clinic_name?: string | null
  clinic_city?: string | null
  appointment?: Appointment | null
  lead?: Record<string, unknown> | null
}
interface EventsResp { events: EventItem[] }

export default function AdminConsultationDetail() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [data, setData] = useState<DetailResp | null>(null)
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, b] = await Promise.all([
        fetch(`${API_URL}/api/admin/consultation-requests/${id}`, {
          credentials: 'include' as RequestCredentials,
        }),
        fetch(`${API_URL}/api/admin/consultation-requests/${id}/events`, {
          credentials: 'include' as RequestCredentials,
        }),
      ])
      if (a.status === 401 || a.status === 403) {
        try { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') } catch { /* noop */ }
        router.replace('/admin')
        return
      }
      if (a.ok) setData(await a.json())
      if (b.ok) setEvents(((await b.json()) as EventsResp).events || [])
    } finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { if (id) load() }, [id, load])

  const addNote = async () => {
    if (!note.trim()) return
    setBusy(true)
    try {
      await fetch(`${API_URL}/api/admin/consultation-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: note }), credentials: 'include' as RequestCredentials,
      })
      setNote('')
      await load()
    } finally { setBusy(false) }
  }

  const r = data?.request
  const sb = statusBadge(r?.status)
  const lead = data?.lead as Record<string, unknown> | undefined
  const kind = REQUEST_KIND_DESCRIPTORS[requestKindFromCreatedFrom(r?.created_from)]
  const selectionSourceLabel = r?.selection_source
    ? SELECTION_SOURCE_LABELS[r.selection_source] || r.selection_source
    : null

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin/consultation-requests" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> Назад
          </Link>
          <h1 className="font-serif text-lg font-semibold">Детайли на заявка</h1>
          <div className="w-12" />
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Зареждане…</div>
        ) : !r ? (
          <div className="text-slate-400">Не е намерена.</div>
        ) : (
          <>
            {/* Patient header card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-slate-900">{r.patient_name || '—'}</h2>
                  <div className="text-sm text-slate-500">{r.patient_phone}{r.patient_email && ` · ${r.patient_email}`}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${sb.cls}`} data-testid="admin-cr-status">
                  {sb.label}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
                <Cell k="Град" v={r.patient_city} />
                <Cell k="Лечение" v={TREATMENT_LABELS[r.treatment_interest] || r.treatment_interest} />
                <Cell k="Създадена" v={formatDate(r.created_at)} />
                <Cell k="Назначена в" v={formatDate(r.assigned_at)} />
                <Cell k="Видяна в" v={formatDate(r.clinic_viewed_at)} />
                <Cell k="Резервирана в" v={formatDate(r.appointment_booked_at)} />
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500">
                <div>source: <span className="font-mono text-slate-700">{r.source || '—'}</span></div>
                <div>utm_source: <span className="font-mono text-slate-700">{r.utm_source || '—'}</span></div>
                <div>utm_campaign: <span className="font-mono text-slate-700">{r.utm_campaign || '—'}</span></div>
                <div>utm_ad: <span className="font-mono text-slate-700">{r.utm_ad || '—'}</span></div>
              </div>
            </div>

            {/* Тип заявка section */}
            <section
              className={
                'rounded-2xl border p-5 ' +
                (kind.key === 'assisted_choice'
                  ? 'bg-violet-50/50 border-violet-200'
                  : kind.key === 'selected_clinic'
                  ? 'bg-sky-50/40 border-sky-200'
                  : 'bg-white border-slate-200')
              }
              data-testid="admin-cr-kind-section"
              data-kind={kind.key}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Тип заявка</div>
                  <h3 className="font-serif text-lg font-semibold text-slate-900 mt-0.5" data-testid="admin-cr-kind-title">
                    {kind.detailTitle}
                  </h3>
                  <p className="text-sm text-slate-700 mt-1" data-testid="admin-cr-kind-description">
                    {kind.detailDescription}
                  </p>

                  {/* P4 → show selected clinic info */}
                  {kind.key === 'selected_clinic' && (
                    <div className="mt-3 bg-white rounded-xl border border-slate-200 p-3 text-sm" data-testid="admin-cr-selected-clinic">
                      <div className="text-xs text-slate-500">Избрана клиника</div>
                      <div className="font-medium text-slate-900">{data?.clinic_name || '—'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {data?.clinic_city || '—'}
                        {r.assigned_clinic_id && (
                          <span className="font-mono text-slate-400"> · {r.assigned_clinic_id}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selection source — where on the patient site did they submit */}
                  {selectionSourceLabel && (
                    <div className="mt-3 text-xs text-slate-500" data-testid="admin-cr-selection-source">
                      Източник на заявката: <span className="text-slate-700">{selectionSourceLabel}</span>
                    </div>
                  )}
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${kind.badgeCls}`}>
                  {kind.badgeLabel}
                </span>
              </div>
            </section>

            {/* Patient message — P5 only (or any row that carries patient_message) */}
            {r.patient_message && (
              <section
                className="bg-white border border-slate-200 rounded-2xl p-5"
                data-testid="admin-cr-patient-message-section"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <MessageSquare className="w-4 h-4 text-violet-500" />
                  Съобщение от пациента
                </div>
                <p
                  className="mt-2 text-sm text-slate-700 whitespace-pre-wrap break-words"
                  data-testid="admin-cr-patient-message"
                >
                  {r.patient_message}
                </p>
                <div className="mt-2 text-xs text-slate-400">
                  Свободен текст от пациента. Третирайте съдържанието като чувствително (PII).
                </div>
              </section>
            )}

            {/* Consent section — display the captured consent */}
            <ConsentSection r={r} />

            {data?.appointment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <div className="font-medium text-emerald-900">Резервация</div>
                <div className="text-sm text-emerald-800 mt-1">
                  {APPOINTMENT_TYPE_LABELS[data.appointment.appointment_type] || data.appointment.appointment_type}
                  {' · '}
                  {formatDate(data.appointment.start_time)} → {formatDate(data.appointment.end_time)}
                  {' · статус: '}{data.appointment.status}
                </div>
              </div>
            )}

            {lead && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-medium text-slate-900 mb-2">Свързан Lead</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <Cell k="Готовност" v={(lead.band as string) || '—'} />
                  <Cell k="Резултат" v={String(lead.score_total ?? '—')} />
                  <Cell k="Първи UTM" v={(lead.first_utm_source as string) || '—'} />
                  <Cell k="Последен UTM" v={(lead.latest_utm_source as string) || '—'} />
                  <Cell k="Първа страница" v={(lead.first_landing_page as string) || '—'} />
                  <Cell k="Първи referrer" v={(lead.first_referrer as string) || '—'} />
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-medium text-slate-900 mb-3">История на събитията</h3>
              <ol className="space-y-3" data-testid="admin-cr-timeline">
                {events.length === 0 && <li className="text-sm text-slate-400">Няма събития.</li>}
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-50 grid place-items-center mt-0.5 flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{EVENT_LABELS[ev.event_type] || ev.event_type}</div>
                      <div className="text-xs text-slate-500">
                        {formatDate(ev.created_at)}
                        {ev.previous_status && ev.new_status && (
                          <span className="font-mono"> · {ev.previous_status} → {ev.new_status}</span>
                        )}
                      </div>
                      {ev.note && <div className="text-xs text-slate-600 mt-1">{ev.note}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-medium text-slate-900 mb-2">Вътрешна бележка</h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Бележка за екипа…"
                data-testid="admin-cr-note-input"
              />
              <div className="text-right mt-2">
                <button
                  type="button"
                  disabled={busy || !note.trim()}
                  onClick={addNote}
                  className="h-9 px-4 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium disabled:opacity-50"
                  data-testid="admin-cr-note-submit"
                >
                  Добави бележка
                </button>
              </div>
              {r.notes && (
                <pre className="mt-3 text-xs text-slate-500 whitespace-pre-wrap font-mono">{r.notes}</pre>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function Cell({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{k}</div>
      <div className="text-slate-700 break-words">{v || '—'}</div>
    </div>
  )
}

function ConsentSection({ r }: { r: ConsultationRequest }) {
  const hasClinicConsent = r.consent_to_share_clinic === true
  const hasZubiteConsent = r.consent_to_share_zubite === true
  if (!hasClinicConsent && !hasZubiteConsent) return null

  return (
    <section
      className="bg-white border border-slate-200 rounded-2xl p-5"
      data-testid="admin-cr-consent-section"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        Съгласие на пациента
      </div>

      {hasClinicConsent && (
        <div className="mt-3 border-l-2 border-sky-200 pl-3" data-testid="admin-cr-consent-clinic">
          <div className="text-xs uppercase tracking-wide text-slate-500">Тип съгласие</div>
          <div className="text-sm text-slate-900">Споделяне на данните с избраната клиника</div>
          <div className="text-xs text-slate-500 mt-1">
            Дадено на: <span className="text-slate-700">{formatDate(r.consent_to_share_clinic_at)}</span>
          </div>
          {r.consent_to_share_clinic_text && (
            <blockquote
              className="mt-2 text-xs text-slate-600 italic bg-slate-50 rounded-md px-3 py-2 whitespace-pre-wrap"
              data-testid="admin-cr-consent-clinic-text"
            >
              „{r.consent_to_share_clinic_text}“
            </blockquote>
          )}
        </div>
      )}

      {hasZubiteConsent && (
        <div className="mt-3 border-l-2 border-violet-200 pl-3" data-testid="admin-cr-consent-zubite">
          <div className="text-xs uppercase tracking-wide text-slate-500">Тип съгласие</div>
          <div className="text-sm text-slate-900">Споделяне на данните с екипа на Zubite</div>
          <div className="text-xs text-slate-500 mt-1">
            Дадено на: <span className="text-slate-700">{formatDate(r.consent_to_share_zubite_at)}</span>
          </div>
          {r.consent_to_share_zubite_text && (
            <blockquote
              className="mt-2 text-xs text-slate-600 italic bg-slate-50 rounded-md px-3 py-2 whitespace-pre-wrap"
              data-testid="admin-cr-consent-zubite-text"
            >
              „{r.consent_to_share_zubite_text}“
            </blockquote>
          )}
        </div>
      )}
    </section>
  )
}
