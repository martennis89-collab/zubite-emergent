'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Calendar, Send, Mail, Bell } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Booking {
  id: string; clinic_id: string
  patient_name: string; patient_email: string; patient_phone: string
  selected_slot_start: string; selected_slot_start_display?: string
  treatment_category?: string; source?: string; status: string
  reminder_email_sent_at?: string | null
  confirmation_email_sent_at?: string | null
  clinic_email_sent_at?: string | null
}

const STATUSES = [
  'pending_confirmation', 'confirmed', 'completed', 'no_show',
  'cancelled_by_clinic', 'cancelled_by_patient', 'rescheduled',
]
const SOURCES = ['quiz_result', 'clinic_profile', 'clinic_recommendation', 'article', 'admin_manual', 'campaign']

export default function AdminBookingsPage() {
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filters, setFilters] = useState({ clinic_id: '', status: '', source: '', reminder_sent: '' })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v)
      const r = await fetch(`${API_URL}/api/admin/bookings?${qs}`, { credentials: 'include' as RequestCredentials })
      if (r.ok) {
        const d = await r.json()
        setBookings(d.bookings || [])
      }
    } finally { setLoading(false) }
  }, [filters])
  useEffect(() => { load() }, [load])

  const action = async (id: string, path: string, msg: string) => {
    setBusyId(id)
    try {
      const r = await fetch(`${API_URL}/api/admin/bookings/${id}/${path}`, {
        method: 'POST', credentials: 'include' as RequestCredentials,
      })
      if (r.ok) setNote(msg)
      else setNote('Грешка при действието.')
      setTimeout(() => setNote(null), 3000)
    } finally { setBusyId(null) }
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8]">
      <AdminHeader pageTitle="Резервирани консултации" />
      <div className="max-w-7xl mx-auto px-4 py-6" data-testid="admin-bookings-page">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-teal-700" />
          <h2 className="font-serif text-2xl font-semibold text-slate-900">Резервирани консултации</h2>
          <span className="ml-auto text-xs text-slate-400">{bookings.length}</span>
        </div>

        {/* Filters */}
        <div className="rounded-xl bg-white border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs" data-testid="admin-bookings-filters">
          <SelectFilter label="Статус" value={filters.status}
            options={[{ v: '', label: 'Всички статуси' }, ...STATUSES.map(s => ({ v: s, label: s }))]}
            onChange={(v) => setFilters({ ...filters, status: v })}
            testid="filter-status" />
          <SelectFilter label="Източник" value={filters.source}
            options={[{ v: '', label: 'Всички източници' }, ...SOURCES.map(s => ({ v: s, label: s }))]}
            onChange={(v) => setFilters({ ...filters, source: v })}
            testid="filter-source" />
          <SelectFilter label="Напомняне пратено" value={filters.reminder_sent}
            options={[{ v: '', label: 'Всички' }, { v: 'yes', label: 'Пратени' }, { v: 'no', label: 'Непратени' }]}
            onChange={(v) => setFilters({ ...filters, reminder_sent: v })}
            testid="filter-reminder" />
          <div>
            <label className="block text-slate-600">Clinic ID</label>
            <input type="text" value={filters.clinic_id} onChange={(e) => setFilters({ ...filters, clinic_id: e.target.value })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5" data-testid="filter-clinic-id" />
          </div>
        </div>

        {note && <div className="mb-3 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-sm" data-testid="admin-note">{note}</div>}

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : bookings.length === 0 ? (
          <p className="text-slate-400 text-sm italic">Няма резервации по избраните филтри.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="admin-bookings-table">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-3 text-left">Пациент</th>
                  <th className="px-3 py-3 text-left">Дата/час</th>
                  <th className="px-3 py-3 text-left">Клиника</th>
                  <th className="px-3 py-3 text-left">Тип</th>
                  <th className="px-3 py-3 text-left">Източник</th>
                  <th className="px-3 py-3 text-left">Статус</th>
                  <th className="px-3 py-3 text-center">Reminder</th>
                  <th className="px-3 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60" data-testid={`admin-booking-row-${b.id}`}>
                    <td className="px-3 py-3">
                      <div className="font-medium">{b.patient_name}</div>
                      <div className="text-[11px] text-slate-500">{b.patient_email}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{b.selected_slot_start_display || b.selected_slot_start}</td>
                    <td className="px-3 py-3 text-slate-600 text-xs font-mono">{b.clinic_id.slice(0, 8)}…</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{b.treatment_category || '—'}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{b.source || '—'}</td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 rounded-full px-2 py-1">{b.status}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-xs">{b.reminder_email_sent_at ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => action(b.id, 'resend-confirmation', 'Потвърждението изпратено.')} disabled={busyId === b.id}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Изпрати потвърждение отново" data-testid={`btn-resend-conf-${b.id}`}>
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => action(b.id, 'resend-clinic', 'Известието до клиниката изпратено.')} disabled={busyId === b.id}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Изпрати ново известие до клиниката" data-testid={`btn-resend-clinic-${b.id}`}>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => action(b.id, 'send-reminder', 'Напомнянето изпратено.')} disabled={busyId === b.id}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Изпрати напомняне ръчно" data-testid={`btn-send-reminder-${b.id}`}>
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

function SelectFilter({ label, value, options, onChange, testid }: { label: string; value: string; options: Array<{ v: string; label: string }>; onChange: (v: string) => void; testid?: string }) {
  return (
    <label className="block">
      <span className="text-slate-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
        data-testid={testid}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  )
}
