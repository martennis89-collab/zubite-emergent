'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  ConsultationRequest, statusBadge, formatDate, TREATMENT_LABELS,
  REQUEST_KIND_DESCRIPTORS, requestKindFromCreatedFrom, STATUS_LABELS,
} from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Clinic { id: string; clinic_name: string }

// Tabs map to either a `created_from` filter, a `status` filter, or no filter.
type TabKey = 'all' | 'selected_clinic' | 'assisted_choice' | 'awaiting_review'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all',              label: 'Всички' },
  { key: 'selected_clinic',  label: 'Избрана клиника' },
  { key: 'assisted_choice',  label: 'Помощ от Zubite' },
  { key: 'awaiting_review',  label: 'Чака преглед' },
]

// Resolve the initial tab from URL search params. Priority order:
//   1. status=needs_zubite_review              → awaiting_review
//   2. created_from=assisted_choice_flow       → assisted_choice
//   3. created_from=recommended_clinics_flow   → selected_clinic
// Unsupported or absent params fall back to 'all'. Initial-state only —
// after mount the user controls the tab via the on-page tab strip.
function tabFromSearchParams(sp: URLSearchParams | null): TabKey {
  if (!sp) return 'all'
  if (sp.get('status') === 'needs_zubite_review') return 'awaiting_review'
  const cf = sp.get('created_from')
  if (cf === 'assisted_choice_flow') return 'assisted_choice'
  if (cf === 'recommended_clinics_flow') return 'selected_clinic'
  return 'all'
}

function buildQuery(tab: TabKey, status: string, clinicId: string): string {
  const qs = new URLSearchParams()
  if (tab === 'selected_clinic') qs.set('created_from', 'recommended_clinics_flow')
  if (tab === 'assisted_choice') qs.set('created_from', 'assisted_choice_flow')
  if (tab === 'awaiting_review') qs.set('status', 'needs_zubite_review')
  // Optional secondary filters (only applied when not overridden by tab).
  if (status && tab !== 'awaiting_review') qs.set('status', status)
  if (clinicId) qs.set('clinic_id', clinicId)
  return qs.toString()
}

export default function AdminConsultationRequestsPage() {
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  // Initialize from URL on first render so the dashboard CTA lands the
  // admin directly on the right tab (e.g. ?status=needs_zubite_review).
  const [tab, setTab] = useState<TabKey>(() => tabFromSearchParams(searchParams))
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClinic, setFilterClinic] = useState('')
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = buildQuery(tab, filterStatus, filterClinic)
      const [reqResp, clResp] = await Promise.all([
        fetch(`${API_URL}/api/admin/consultation-requests?${qs}`, {
          credentials: 'include' as RequestCredentials,
        }),
        fetch(`${API_URL}/api/admin/clinics`, {
          credentials: 'include' as RequestCredentials,
        }),
      ])
      if (reqResp.status === 401 || reqResp.status === 403) {
        try { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') } catch { /* noop */ }
        router.replace('/admin')
        return
      }
      if (reqResp.ok) setRequests((await reqResp.json()).requests || [])
      if (clResp.ok) setClinics((await clResp.json()).clinics || [])
    } finally { setLoading(false) }
  }, [router, tab, filterStatus, filterClinic])

  useEffect(() => { load() }, [load])

  const assignClinic = async (id: string, clinic_id: string) => {
    await fetch(`${API_URL}/api/admin/consultation-requests/${id}/assign-clinic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic_id }),
      credentials: 'include' as RequestCredentials,
    })
    await load()
  }

  const counts = useMemo(() => {
    return {
      total: requests.length,
      assisted: requests.filter((r) => r.created_from === 'assisted_choice_flow').length,
      selected: requests.filter((r) => r.created_from === 'recommended_clinics_flow').length,
    }
  }, [requests])

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> Назад
          </Link>
          <h1 className="font-serif text-lg font-semibold">Заявки за консултации</h1>
          <div className="w-16" />
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* Tab strip */}
        <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap items-center gap-1" data-testid="admin-cr-tabs">
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={active}
                data-testid={`admin-cr-tab-${t.key}`}
                className={
                  'px-3 py-1.5 rounded-full text-sm font-medium transition ' +
                  (active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100')
                }
              >
                {t.label}
              </button>
            )
          })}
          <span className="text-xs text-slate-400 ml-auto px-2" data-testid="admin-cr-count">
            {counts.total} заявки · избрани клиника: {counts.selected} · помощ от Zubite: {counts.assisted}
          </span>
        </div>

        {/* Secondary filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            data-testid="admin-cr-filter-status"
            disabled={tab === 'awaiting_review'}
            title={tab === 'awaiting_review' ? 'Този филтър се управлява от активния таб' : ''}
          >
            <option value="">Всички статуси</option>
            {['new','assigned','clinic_viewed','call_attempted','patient_contacted','no_answer','booked','rescheduled','attended','no_show','cancelled','needs_zubite_review'].map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>
            ))}
          </select>
          <select
            value={filterClinic}
            onChange={(e) => setFilterClinic(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            data-testid="admin-cr-filter-clinic"
          >
            <option value="">Всички клиники</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.clinic_name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Зареждане…</div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400" data-testid="admin-cr-empty">
            Няма заявки за избрания изглед.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="admin-cr-table">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Пациент</th>
                  <th className="px-4 py-3 text-left">Тип заявка</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Лечение</th>
                  <th className="px-4 py-3 text-left">Клиника</th>
                  <th className="px-4 py-3 text-left">Статус</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Създадена</th>
                  <th className="px-4 py-3 text-right">Отвори</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => {
                  const sb = statusBadge(r.status)
                  const kind = REQUEST_KIND_DESCRIPTORS[requestKindFromCreatedFrom(r.created_from)]
                  return (
                    <tr
                      key={r.id}
                      className={'transition ' + (kind.rowAccentCls || 'hover:bg-slate-50/60')}
                      data-testid={`admin-cr-row-${r.id}`}
                      data-kind={kind.key}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.patient_name || '—'}</div>
                        <div className="text-xs text-slate-500">{r.patient_phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${kind.badgeCls}`}
                          data-testid={`admin-cr-kind-${r.id}`}
                        >
                          {kind.badgeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-700">
                        {TREATMENT_LABELS[r.treatment_interest] || r.treatment_interest || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {kind.key === 'assisted_choice' ? (
                          <span className="text-xs text-violet-700" data-testid={`admin-cr-no-clinic-${r.id}`}>
                            Без клиника · чака преглед
                          </span>
                        ) : (
                          <select
                            value={r.assigned_clinic_id || ''}
                            onChange={(e) => assignClinic(r.id, e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                            data-testid={`admin-cr-assign-${r.id}`}
                          >
                            <option value="" disabled>Назначи…</option>
                            {clinics.map((c) => (
                              <option key={c.id} value={c.id}>{c.clinic_name}</option>
                            ))}
                          </select>
                        )}
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
                        <Link
                          href={`/admin/consultation-requests/${r.id}`}
                          className="text-sky-600 hover:text-sky-700 font-medium text-sm"
                          data-testid={`admin-cr-open-${r.id}`}
                        >
                          Отвори
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
