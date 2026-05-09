'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ConsultationRequest, statusBadge, formatDate, TREATMENT_LABELS } from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Clinic { id: string; clinic_name: string }

export default function AdminConsultationRequestsPage() {
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClinic, setFilterClinic] = useState('')
  const router = useRouter()

  const load = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.replace('/admin'); return }
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filterStatus) qs.set('status', filterStatus)
      if (filterClinic) qs.set('clinic_id', filterClinic)
      const [reqResp, clResp] = await Promise.all([
        fetch(`${API_URL}/api/admin/consultation-requests?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/clinics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      if (reqResp.ok) setRequests((await reqResp.json()).requests || [])
      if (clResp.ok) setClinics((await clResp.json()).clinics || [])
    } finally { setLoading(false) }
  }, [router, filterStatus, filterClinic])

  useEffect(() => { load() }, [load])

  const assignClinic = async (id: string, clinic_id: string) => {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    await fetch(`${API_URL}/api/admin/consultation-requests/${id}/assign-clinic`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic_id }),
    })
    await load()
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="font-serif text-lg font-semibold">Consultation Requests</h1>
          <div className="w-16" />
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            data-testid="admin-cr-filter-status"
          >
            <option value="">All statuses</option>
            {['new','assigned','clinic_viewed','call_attempted','patient_contacted','no_answer','booked','rescheduled','attended','no_show','cancelled'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterClinic}
            onChange={(e) => setFilterClinic(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            data-testid="admin-cr-filter-clinic"
          >
            <option value="">All clinics</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.clinic_name}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400 ml-auto">{requests.length} requests</span>
        </div>
        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
            No consultation requests.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="admin-cr-table">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Treatment</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">UTM</th>
                  <th className="px-4 py-3 text-left">Clinic</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Created</th>
                  <th className="px-4 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => {
                  const sb = statusBadge(r.status)
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.patient_name}</div>
                        <div className="text-xs text-slate-500">{r.patient_phone}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-700">
                        {TREATMENT_LABELS[r.treatment_interest] || r.treatment_interest}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500 font-mono">
                        {r.utm_source || '—'} / {r.utm_campaign || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <select
                          value={r.assigned_clinic_id || ''}
                          onChange={(e) => assignClinic(r.id, e.target.value)}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                          data-testid={`admin-cr-assign-${r.id}`}
                        >
                          <option value="" disabled>Assign…</option>
                          {clinics.map((c) => (
                            <option key={c.id} value={c.id}>{c.clinic_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${sb.cls}`}>
                          {sb.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/consultation-requests/${r.id}`} className="text-sky-600 hover:text-sky-700 font-medium text-sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
