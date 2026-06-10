'use client'

/**
 * Admin · Online Orientation Bookings overview (Phase E).
 *
 * Lists every booking across all clinics with filter by status + clinic.
 * Admin can override action (confirm/reject/cancel/etc.) and force
 * release a stuck pending slot. NO Care Pass changes here.
 */

import { useEffect, useState, useCallback } from 'react'
import { Loader2, RefreshCw, Filter } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Booking {
  id: string
  clinic_id: string
  clinic_name?: string | null
  status: string
  topic: string
  topic_label_bg?: string
  scheduled_at: string
  duration_minutes: number
  patient_name?: string | null
  patient_phone?: string | null
  patient_email?: string | null
  patient_note?: string | null
  internal_clinic_note?: string | null
  quiz_summary?: Record<string, unknown> | null
  expires_at: string | null
  created_at: string
  clinic_confirmed_at: string | null
}

const STATUS_LABELS_BG: Record<string, string> = {
  pending_clinic_confirmation:    'Чака потвърждение',
  confirmed_by_clinic:            'Потвърдена',
  rejected_by_clinic:             'Отказана',
  expired_pending_confirmation:   'Изтекла',
  scheduled:                      'Насрочена',
  completed:                      'Завършена',
  no_show:                        'Не се яви',
  cancelled_by_patient:           'Отказана от пациента',
  cancelled_by_clinic:            'Отменена',
  converted_to_in_clinic:         'Премина в клиниката',
  not_suitable:                   'Не е подходяща',
  needs_admin_review:             'За преглед',
}

export default function AdminOrientationBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [clinicFilter, setClinicFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const qs = new URLSearchParams()
      if (statusFilter) qs.set('status', statusFilter)
      if (clinicFilter) qs.set('clinic_id', clinicFilter)
      const r = await fetch(`${API_URL}/api/admin/online-orientation-bookings?${qs.toString()}`, {
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) { setErr('Грешка при зареждане.'); return }
      const j = await r.json()
      setBookings(j.bookings || [])
      if (Array.isArray(j.allowed_statuses)) setAllowedStatuses(j.allowed_statuses)
    } finally { setLoading(false) }
  }, [statusFilter, clinicFilter])

  useEffect(() => { load() }, [load])

  const act = async (id: string, action: string, releaseSlot = false) => {
    const note = action === 'add_note'
      ? (window.prompt('Бележка:') || '')
      : undefined
    const r = await fetch(`${API_URL}/api/admin/online-orientation-bookings/${id}/action`, {
      method: 'POST',
      credentials: 'include' as RequestCredentials,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note, release_slot: releaseSlot }),
    })
    if (!r.ok) {
      let msg = 'Грешка.'
      try { const j = await r.json(); if (j?.detail?.message) msg = j.detail.message } catch { /* noop */ }
      alert(msg)
      return
    }
    await load()
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AdminHeader />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5" data-testid="admin-orient-bookings-page">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Онлайн ориентация — всички заявки
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Admin override и преглед на всички заявки за безплатна онлайн ориентация.
            </p>
          </div>
          <button
            type="button" onClick={load}
            className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
            data-testid="admin-orient-refresh"
          >
            <RefreshCw className="w-4 h-4" /> Опресни
          </button>
        </header>

        {/* Filters */}
        <section
          className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3"
          data-testid="admin-orient-filters"
        >
          <Filter className="w-4 h-4 text-slate-400 mb-2" />
          <label className="block text-xs text-slate-600">
            <span>Статус</span>
            <select
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
              data-testid="admin-orient-status-filter"
            >
              <option value="">Всички</option>
              {allowedStatuses.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS_BG[s] || s}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-600">
            <span>Клиника (ID)</span>
            <input
              type="text" value={clinicFilter}
              onChange={(e) => setClinicFilter(e.target.value)}
              placeholder="UUID"
              className="mt-1 block border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-72"
              data-testid="admin-orient-clinic-filter"
            />
          </label>
        </section>

        {loading ? (
          <div className="inline-flex items-center gap-2 text-sm text-slate-500" data-testid="admin-orient-loading">
            <Loader2 className="w-4 h-4 animate-spin" /> Зареждане…
          </div>
        ) : err ? (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3" data-testid="admin-orient-error">
            {err}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-sm text-slate-500 italic" data-testid="admin-orient-empty">
            Няма заявки за тези филтри.
          </div>
        ) : (
          <ul className="space-y-3" data-testid="admin-orient-list">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="bg-white border border-slate-200 rounded-2xl p-4"
                data-testid={`admin-orient-row-${b.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm">
                      {b.patient_name || 'Пациент'} · <span className="text-slate-500 font-normal">{b.clinic_name || b.clinic_id.slice(0, 8)}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(b.scheduled_at).toLocaleString('bg-BG')} · {b.duration_minutes} мин · {b.topic_label_bg || b.topic}
                    </p>
                    {b.patient_phone && <p className="text-xs text-slate-600 mt-0.5">📞 {b.patient_phone}</p>}
                    {b.patient_email && <p className="text-xs text-slate-600">✉ {b.patient_email}</p>}
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {STATUS_LABELS_BG[b.status] || b.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => act(b.id, 'confirm')}
                    className="px-2 py-1 rounded-full bg-emerald-500 text-white text-xs hover:bg-emerald-600"
                    data-testid={`admin-orient-confirm-${b.id}`}
                  >Потвърди</button>
                  <button type="button" onClick={() => act(b.id, 'reject')}
                    className="px-2 py-1 rounded-full border border-rose-200 text-rose-700 text-xs hover:bg-rose-50"
                    data-testid={`admin-orient-reject-${b.id}`}
                  >Откажи</button>
                  <button type="button" onClick={() => act(b.id, 'cancel', true)}
                    className="px-2 py-1 rounded-full border border-slate-200 text-slate-700 text-xs hover:bg-slate-50"
                    data-testid={`admin-orient-release-${b.id}`}
                  >Освободи слота</button>
                  <button type="button" onClick={() => act(b.id, 'add_note')}
                    className="px-2 py-1 rounded-full border border-slate-200 text-slate-700 text-xs hover:bg-slate-50"
                    data-testid={`admin-orient-note-${b.id}`}
                  >Бележка</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
