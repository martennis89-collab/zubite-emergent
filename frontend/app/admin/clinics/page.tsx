'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Building2, X, Loader2, Archive, ArchiveRestore, AlertTriangle } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface PartnerClinic {
  id: string
  clinic_name: string
  city: string
  email: string
  phone?: string
  // Canonical (Feb 2026 cleanup). Backend always returns this.
  treatments_supported?: string[]
  // Legacy mirror — read-only fallback for any pre-cleanup cached
  // responses still in flight. Do NOT write to this from new code.
  treatments_offered?: string[]
  clinic_status?: string
  subscription_status?: string
  monthly_plan?: string | null
  notification_email?: string | null
  assigned_requests_count?: number
  booked_count?: number
  archived?: boolean
  archived_at?: string | null
}

type ArchiveFilter = 'active' | 'archived'

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

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<PartnerClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createdInfo, setCreatedInfo] = useState<{ name: string; email: string; password: string } | null>(null)
  const [filter, setFilter] = useState<ArchiveFilter>('active')
  const [archiveTarget, setArchiveTarget] = useState<PartnerClinic | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = filter === 'archived' ? '?archived=true' : ''
      const r = await fetch(`${API_URL}/api/admin/clinics${qs}`, {
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
  }, [router, filter])

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

  const confirmArchive = async () => {
    if (!archiveTarget) return
    setBusyId(archiveTarget.id)
    try {
      await fetch(`${API_URL}/api/admin/clinics/${archiveTarget.id}/archive`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
      })
      setArchiveTarget(null)
      await load()
    } finally { setBusyId(null) }
  }

  const unarchive = async (id: string) => {
    setBusyId(id)
    try {
      await fetch(`${API_URL}/api/admin/clinics/${id}/unarchive`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
      })
      await load()
    } finally { setBusyId(null) }
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8]">
      <AdminHeader pageTitle="Партньорски клиники" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-serif text-2xl font-semibold text-slate-900">Партньорски клиники</h2>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium"
            data-testid="admin-create-clinic-btn"
          >
            <Plus className="w-4 h-4" /> Нова клиника
          </button>
        </div>

        {/* Archive filter tabs */}
        <div
          className="inline-flex rounded-full bg-white border border-slate-200 p-1 mb-6"
          role="tablist"
          data-testid="admin-clinics-filter-tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'active'}
            onClick={() => setFilter('active')}
            className={`px-4 h-8 rounded-full text-sm font-medium transition ${
              filter === 'active'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            data-testid="admin-clinics-tab-active"
          >
            Активни
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'archived'}
            onClick={() => setFilter('archived')}
            className={`px-4 h-8 rounded-full text-sm font-medium transition inline-flex items-center gap-1.5 ${
              filter === 'archived'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            data-testid="admin-clinics-tab-archived"
          >
            <Archive className="w-3.5 h-3.5" />
            Архивирани
          </button>
        </div>

        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Loading…</div>
        ) : clinics.length === 0 ? (
          <div
            className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400"
            data-testid="admin-clinics-empty-state"
          >
            {filter === 'archived' ? 'Няма архивирани клиники.' : 'Няма партньорски клиники.'}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="admin-clinics-table">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Клиника</th>
                  <th className="px-4 py-3 text-left">Град</th>
                  <th className="px-4 py-3 text-left">Статус</th>
                  <th className="px-4 py-3 text-left">Абонамент</th>
                  <th className="px-4 py-3 text-left">Лечения</th>
                  <th className="px-4 py-3 text-right">Заявки</th>
                  <th className="px-4 py-3 text-right">Записани</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clinics.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60" data-testid={`admin-clinic-row-${c.id}`}>
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
                        disabled={filter === 'archived'}
                        className={`px-2 py-1 rounded-full text-xs border-0 ${statusCls(c.clinic_status)} ${filter === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        disabled={filter === 'archived'}
                        className={`px-2 py-1 rounded-lg text-xs border border-slate-200 bg-white ${filter === 'archived' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        data-testid={`clinic-subscription-${c.id}`}
                      >
                        {SUB_STATUS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {(() => {
                        const t = (c.treatments_supported && c.treatments_supported.length > 0)
                          ? c.treatments_supported
                          : (c.treatments_offered || [])
                        return t.length > 0 ? t.join(', ') : '—'
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{c.assigned_requests_count ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{c.booked_count ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3 justify-end">
                        {filter === 'active' ? (
                          <>
                            <Link
                              href={`/admin/clinics/${c.id}`}
                              className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                              data-testid={`admin-clinic-edit-${c.id}`}
                            >
                              Редактирай
                            </Link>
                            <button
                              type="button"
                              onClick={() => setArchiveTarget(c)}
                              disabled={busyId === c.id}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 text-sm font-medium disabled:opacity-50"
                              data-testid={`admin-clinic-archive-${c.id}`}
                              title="Архивирай"
                            >
                              <Archive className="w-4 h-4" />
                              Архивирай
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              href={`/admin/clinics/${c.id}`}
                              className="text-slate-500 hover:text-slate-700 text-sm"
                              data-testid={`admin-clinic-view-${c.id}`}
                            >
                              Виж
                            </Link>
                            <button
                              type="button"
                              onClick={() => unarchive(c.id)}
                              disabled={busyId === c.id}
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium disabled:opacity-50"
                              data-testid={`admin-clinic-unarchive-${c.id}`}
                            >
                              {busyId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArchiveRestore className="w-4 h-4" />}
                              Възстанови
                            </button>
                          </>
                        )}
                      </div>
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
      {archiveTarget && (
        <ConfirmArchiveModal
          clinic={archiveTarget}
          busy={busyId === archiveTarget.id}
          onCancel={() => setArchiveTarget(null)}
          onConfirm={confirmArchive}
        />
      )}
    </main>
  )
}

function ConfirmArchiveModal({
  clinic, busy, onCancel, onConfirm,
}: {
  clinic: PartnerClinic
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 grid place-items-center p-4"
      onClick={onCancel}
      data-testid="admin-clinic-archive-modal"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 grid place-items-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif text-lg font-semibold text-slate-900">Архивирай клиника</h3>
            <p className="text-sm text-slate-600 mt-1">
              Ще архивираш <strong>{clinic.clinic_name}</strong>. Клиниката ще бъде{' '}
              <strong>напълно скрита</strong> от всички публични страници (листинги, препоръки и директен профил).
              Данните остават запазени и можеш да я възстановиш по всяко време от таб „Архивирани“.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-full border border-slate-200 hover:bg-slate-50 text-sm"
            data-testid="admin-clinic-archive-cancel"
          >
            Отказ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-10 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
            data-testid="admin-clinic-archive-confirm"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <Archive className="w-4 h-4" />
            Архивирай
          </button>
        </div>
      </div>
    </div>
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
    treatments_supported: '', clinic_status: 'evaluation_partner',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const treatmentsList = form.treatments_supported
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      // Send canonical field. Backend mirrors to legacy
      // `treatments_offered` automatically for backwards compatibility.
      const body = {
        ...form,
        treatments_supported: treatmentsList,
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
            value={form.treatments_supported}
            onChange={(e) => setForm({ ...form, treatments_supported: e.target.value })}
            placeholder="aligners, braces, implants"
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
            data-testid="create-clinic-treatments"
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
            className="h-10 px-5 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium inline-flex items-center gap-2 disabled:opacity-50"
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
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
