'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import {
  ConsultationRequest, Appointment, EventItem,
  statusBadge, formatDate, TREATMENT_LABELS, EVENT_LABELS,
  APPOINTMENT_TYPE_LABELS,
} from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface DetailResp {
  request: ConsultationRequest
  clinic_name?: string | null
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
    const token = localStorage.getItem('admin_token')
    if (!token) { router.replace('/admin'); return }
    setLoading(true)
    try {
      const [a, b] = await Promise.all([
        fetch(`${API_URL}/api/admin/consultation-requests/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/admin/consultation-requests/${id}/events`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (a.ok) setData(await a.json())
      if (b.ok) setEvents(((await b.json()) as EventsResp).events || [])
    } finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { if (id) load() }, [id, load])

  const addNote = async () => {
    if (!note.trim()) return
    const token = localStorage.getItem('admin_token')
    if (!token) return
    setBusy(true)
    try {
      await fetch(`${API_URL}/api/admin/consultation-requests/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: note }),
      })
      setNote('')
      await load()
    } finally { setBusy(false) }
  }

  const r = data?.request
  const sb = statusBadge(r?.status)
  const lead = data?.lead as Record<string, unknown> | undefined

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin/consultation-requests" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="font-serif text-lg font-semibold">Consultation Request</h1>
          <div className="w-12" />
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Loading…</div>
        ) : !r ? (
          <div className="text-slate-400">Not found.</div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-slate-900">{r.patient_name}</h2>
                  <div className="text-sm text-slate-500">{r.patient_phone}{r.patient_email && ` · ${r.patient_email}`}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${sb.cls}`} data-testid="admin-cr-status">
                  {sb.label}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
                <Cell k="City" v={r.patient_city} />
                <Cell k="Treatment" v={TREATMENT_LABELS[r.treatment_interest] || r.treatment_interest} />
                <Cell k="Assigned to" v={data?.clinic_name || '—'} />
                <Cell k="Created" v={formatDate(r.created_at)} />
                <Cell k="Assigned at" v={formatDate(r.assigned_at)} />
                <Cell k="Viewed at" v={formatDate(r.clinic_viewed_at)} />
                <Cell k="First action" v={formatDate(r.first_action_at)} />
                <Cell k="Booked at" v={formatDate(r.appointment_booked_at)} />
                <Cell k="Attended at" v={formatDate(r.attended_at)} />
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500">
                <div>source: <span className="font-mono text-slate-700">{r.source || '—'}</span></div>
                <div>utm_source: <span className="font-mono text-slate-700">{r.utm_source || '—'}</span></div>
                <div>utm_campaign: <span className="font-mono text-slate-700">{r.utm_campaign || '—'}</span></div>
                <div>utm_ad: <span className="font-mono text-slate-700">{r.utm_ad || '—'}</span></div>
              </div>
            </div>

            {data?.appointment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <div className="font-medium text-emerald-900">Appointment</div>
                <div className="text-sm text-emerald-800 mt-1">
                  {APPOINTMENT_TYPE_LABELS[data.appointment.appointment_type] || data.appointment.appointment_type}
                  {' · '}
                  {formatDate(data.appointment.start_time)} → {formatDate(data.appointment.end_time)}
                  {' · status: '}{data.appointment.status}
                </div>
              </div>
            )}

            {lead && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-medium text-slate-900 mb-2">Linked Lead</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <Cell k="Band" v={(lead.band as string) || '—'} />
                  <Cell k="Score" v={String(lead.score_total ?? '—')} />
                  <Cell k="First UTM" v={(lead.first_utm_source as string) || '—'} />
                  <Cell k="Latest UTM" v={(lead.latest_utm_source as string) || '—'} />
                  <Cell k="First landing" v={(lead.first_landing_page as string) || '—'} />
                  <Cell k="First referrer" v={(lead.first_referrer as string) || '—'} />
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-medium text-slate-900 mb-3">Event Timeline</h3>
              <ol className="space-y-3" data-testid="admin-cr-timeline">
                {events.length === 0 && <li className="text-sm text-slate-400">No events.</li>}
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
              <h3 className="font-medium text-slate-900 mb-2">Internal note</h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Note for the team…"
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
                  Add note
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
