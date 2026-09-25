'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Calendar, ChevronRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Booking {
  id: string; patient_name: string; patient_email: string; patient_phone: string
  selected_slot_start: string; selected_slot_start_display?: string
  treatment_category?: string; source?: string; status: string
  patient_concern_summary?: string; quiz_context_snapshot?: Record<string, unknown>
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending_confirmation: { label: 'Чакащо', cls: 'bg-amber-100 text-amber-800' },
  confirmed:            { label: 'Потвърдено', cls: 'bg-emerald-100 text-emerald-800' },
  completed:            { label: 'Приключено', cls: 'bg-slate-200 text-slate-700' },
  no_show:              { label: 'Не се яви', cls: 'bg-rose-100 text-rose-700' },
  cancelled_by_clinic:  { label: 'Отменено от клиниката', cls: 'bg-rose-100 text-rose-700' },
  cancelled_by_patient: { label: 'Отменено от пациента', cls: 'bg-rose-50 text-rose-600' },
  rescheduled:          { label: 'Пренасрочено', cls: 'bg-teal-50 text-teal-700' },
}

export default function ClinicBookingsPage() {
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/clinic/bookings`, { credentials: 'include' as RequestCredentials })
      if (r.ok) {
        const d = await r.json()
        setBookings(d.bookings || [])
      }
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // Pending requests surfaced first so clinics notice what still needs a
  // response; stable sort keeps the API's own ordering within each group.
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const aPending = a.status === 'pending_confirmation' ? 0 : 1
      const bPending = b.status === 'pending_confirmation' ? 0 : 1
      return aPending - bPending
    })
  }, [bookings])
  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === 'pending_confirmation').length,
    [bookings],
  )

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id)
    try {
      await fetch(`${API_URL}/api/clinic/bookings/${id}`, {
        method: 'PATCH', credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await load()
    } finally { setBusyId(null) }
  }

  if (loading) return <div className="p-8 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>

  return (
    <main className="max-w-5xl mx-auto px-4 py-6" data-testid="clinic-bookings-page">
      <header className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-teal-700" />
        <h1 className="font-serif text-2xl font-semibold text-slate-900">Резервирани консултации</h1>
        <span className="ml-auto text-xs text-slate-400">
          {pendingCount > 0 && <span className="text-amber-700 font-medium">{pendingCount} чакащи · </span>}
          {bookings.length} общо
        </span>
      </header>

      {bookings.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-400" data-testid="bookings-empty">
          Няма резервирани консултации.
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedBookings.map((b) => (
            <li key={b.id} className="rounded-xl bg-white border border-slate-200" data-testid={`booking-row-${b.id}`}>
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{b.patient_name}</div>
                  <div className="text-xs text-slate-500">
                    {b.selected_slot_start_display || b.selected_slot_start}
                    {b.treatment_category ? ` · ${b.treatment_category}` : ''}
                    {b.source ? ` · ${b.source}` : ''}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_LABELS[b.status]?.cls || 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_LABELS[b.status]?.label || b.status}
                </span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition ${expandedId === b.id ? 'rotate-90' : ''}`} />
              </button>
              {expandedId === b.id && (
                <div className="border-t border-slate-100 p-4 space-y-3 text-sm" data-testid={`booking-detail-${b.id}`}>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><b>Телефон:</b> <a href={`tel:${b.patient_phone}`} className="text-teal-700 hover:underline">{b.patient_phone}</a></div>
                    <div><b>Имейл:</b> <a href={`mailto:${b.patient_email}`} className="text-teal-700 hover:underline">{b.patient_email}</a></div>
                  </div>
                  {b.patient_concern_summary && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-xs">
                      <b className="text-slate-700">Кратко описание:</b> <span className="text-slate-600">{b.patient_concern_summary}</span>
                    </div>
                  )}
                  {b.quiz_context_snapshot && Object.keys(b.quiz_context_snapshot).length > 0 && (
                    <div className="rounded-lg bg-teal-50/60 border border-teal-100 p-2 text-xs" data-testid={`quiz-ctx-${b.id}`}>
                      <b className="text-teal-800">Контекст от въпросника (read-only, patient-reported):</b>
                      <ul className="mt-1 space-y-0.5 text-slate-700">
                        {Object.entries(b.quiz_context_snapshot).slice(0, 12).map(([k, v]) => (
                          <li key={k}><b>{k}:</b> {String(v)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Обнови статус:</span>
                    {(['confirmed', 'completed', 'no_show', 'cancelled_by_clinic', 'rescheduled'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateStatus(b.id, s)}
                        disabled={busyId === b.id || b.status === s}
                        className={`text-xs px-3 h-7 rounded-full border ${
                          b.status === s
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                        } disabled:opacity-50`}
                        data-testid={`status-btn-${b.id}-${s}`}
                      >
                        {STATUS_LABELS[s]?.label || s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
