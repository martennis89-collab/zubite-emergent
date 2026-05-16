'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Building2, X, Loader2 } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface PartnerClinic {
  id: string
  clinic_name: string
  city: string
  email: string
  phone?: string
  treatments_offered?: string[]
  clinic_status?: string
  subscription_status?: string
  monthly_plan?: string | null
  notification_email?: string | null
  assigned_requests_count?: number
  booked_count?: number
}

const CLINIC_STATUS = [
  { value: 'evaluation_partner', label: 'Evaluation', cls: 'bg-amber-100 text-amber-700' },
  { value: 'active_partner', label: 'Active', cls: 'bg-emerald-100 text-emerald-700' },
  { value: 'premium_partner', label: 'Premium', cls: 'bg-purple-100 text-purple-700' },
  { value: 'probation', label: 'Probation', cls: 'bg-rose-100 text-rose-700' },
  { value: 'waiting_list', label: 'Waiting', cls: 'bg-slate-100 text-slate-600' },
  { value: 'inactive', label: 'Inactive', cls: 'bg-slate-100 text-slate-400' },
]
const SUB_STATUS = ['trial', 'active', 'past_due', 'cancelled', 'unpaid']

const statusCls = (s?: string) => CLINIC_STATUS.find((x) => x.value === s)?.cls || 'bg-slate-100 text-slate-600'
const statusLabel = (s?: string) => CLINIC_STATUS.find((x) => x.value === s)?.label || s || '—'

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<PartnerClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createdInfo, setCreatedInfo] = useState<{ name: string; email: string; password: string } | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/admin/clinics`, {
        credentials: 'include' as RequestCredentials,
      })
      if (r.ok) {
        const d = await r.json()
        setClinics(d.clinics || [])
      } else if (r.status === 401 || r.status === 403) {
        try { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') } catch { /* noop */ }
        router.replace('/admin')
      }
    } finally { setLoading(false) }
  }, [router])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, field: string, value: string) => {
    await fetch(`${API_URL}/api/admin/clinics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
      credentials: 'include' as RequestCredentials,
    })
    await load()
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AdminHeader pageTitle="Партньорски клиники" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900">Партньорски клиники</h2>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium"
            data-testid="admin-create-clinic-btn"
          >
            <Plus className="w-4 h-4" /> Нова клиника
          </button>
        </div>
        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Loading…</div>
        ) : clinics.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
            No partner clinics yet.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="admin-clinics-table">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Clinic</th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Subscription</th>
                  <th className="px-4 py-3 text-left">Treatments</th>
                  <th className="px-4 py-3 text-right">Requests</th>
                  <th className="px-4 py-3 text-right">Booked</th>
                  <th className="px-4 py-3 text-right">Профил</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clinics.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {c.clinic_name}
                      </div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.city}</td>
                    <td className="px-4 py-3">
                      <select
                        value={c.clinic_status || 'evaluation_partner'}
                        onChange={(e) => updateStatus(c.id, 'clinic_status', e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs border-0 ${statusCls(c.clinic_status)}`}
                        data-testid={`clinic-status-${c.id}`}
                      >
                        {CLINIC_STATUS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.subscription_status || 'trial'}
                        onChange={(e) => updateStatus(c.id, 'subscription_status', e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs border border-slate-200 bg-white"
                        data-testid={`clinic-subscription-${c.id}`}
                      >
                        {SUB_STATUS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {(c.treatments_offered && c.treatments_offered.length > 0) ? c.treatments_offered.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{c.assigned_requests_count ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{c.booked_count ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/clinics/${c.id}`}
                        className="text-sky-600 hover:text-sky-700 font-medium text-sm"
                        data-testid={`admin-clinic-edit-${c.id}`}
                      >
                        Редактирай профил
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showCreate && (
        <CreateClinicModal
          onClose={() => setShowCreate(false)}
          onCreated={(info) => { setCreatedInfo(info); setShowCreate(false); load() }}
        />
      )}
      {createdInfo && (
        <CredentialsModal info={createdInfo} onClose={() => setCreatedInfo(null)} />
      )}
    </main>
  )
}

function CreateClinicModal({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: (info: { name: string; email: string; password: string }) => void
}) {
  const [form, setForm] = useState({
    clinic_name: '', city: 'Sofia', email: '', phone: '', address: '',
    treatments_offered: '', clinic_status: 'evaluation_partner',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const body = {
        ...form,
        treatments_offered: form.treatments_offered.split(',').map((s) => s.trim()).filter(Boolean),
      }
      const r = await fetch(`${API_URL}/api/admin/clinics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), credentials: 'include' as RequestCredentials,})
      if (r.ok) {
        const d = await r.json()
        onCreated({ name: d.clinic.clinic_name, email: d.clinic.email, password: d.temporary_password })
      } else {
        const j = await r.json().catch(() => ({}))
        setErr(typeof j.detail === 'string' ? j.detail : 'Failed to create clinic')
      }
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 grid place-items-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3"
        data-testid="admin-create-clinic-modal"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold">New Partner Clinic</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {(['clinic_name', 'city', 'email', 'phone', 'address'] as const).map((f) => (
          <label key={f} className="block text-sm">
            <span className="text-slate-700 capitalize">{f.replace('_', ' ')}</span>
            <input
              required={f === 'clinic_name' || f === 'city' || f === 'email' || f === 'phone'}
              type={f === 'email' ? 'email' : 'text'}
              value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              data-testid={`create-clinic-${f}`}
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="text-slate-700">Treatments (comma-separated)</span>
          <input
            value={form.treatments_offered}
            onChange={(e) => setForm({ ...form, treatments_offered: e.target.value })}
            placeholder="aligners, braces, implants"
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Status</span>
          <select
            value={form.clinic_status}
            onChange={(e) => setForm({ ...form, clinic_status: e.target.value })}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
          >
            {CLINIC_STATUS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-full border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button
            type="submit"
            disabled={busy}
            className="h-10 px-5 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-medium inline-flex items-center gap-2 disabled:opacity-50"
            data-testid="create-clinic-submit"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Create
          </button>
        </div>
      </form>
    </div>
  )
}

function CredentialsModal({
  info, onClose,
}: {
  info: { name: string; email: string; password: string }
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3"
        onClick={(e) => e.stopPropagation()}
        data-testid="admin-clinic-credentials-modal"
      >
        <h3 className="font-serif text-lg font-semibold">Clinic created</h3>
        <p className="text-sm text-slate-600">
          Send these one-time credentials to <strong>{info.name}</strong>. They will not be shown again.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm space-y-1">
          <div>email: {info.email}</div>
          <div>temporary password: {info.password}</div>
        </div>
        <div className="text-right">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-medium">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
