'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter } from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import {
  ConsultationRequest, statusBadge, formatDate, TREATMENT_LABELS,
} from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'Всички' },
  { key: 'open', label: 'Активни' },
  { key: 'booked', label: 'Резервирани' },
  { key: 'attended', label: 'Посетили' },
  { key: 'no_show', label: 'Не се явили' },
]

export default function ClinicRequestsPage() {
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/clinic/consultation-requests`, {
      credentials: 'include' as RequestCredentials,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRequests(d.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    let list = requests
    if (filter === 'open') {
      list = list.filter((r) => !['attended', 'no_show', 'cancelled', 'patient_declined', 'not_suitable', 'expired'].includes(r.status))
    } else if (filter !== 'all') {
      list = list.filter((r) => r.status === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) =>
        (r.patient_name || '').toLowerCase().includes(q) ||
        (r.patient_phone || '').includes(q) ||
        (r.treatment_interest || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [requests, filter, search])

  return (
    <ClinicShell>
      <div className="space-y-5">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Заявки за консултация
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Пациентите, които са насочени към клиниката ви през Zubite.bg.
            </p>
          </div>
        </header>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-testid="requests-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Търси по име, телефон или лечение"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                data-testid={`requests-filter-${f.key}`}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap border transition-colors ${
                  filter === f.key
                    ? 'bg-sky-500 border-sky-500 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Зареждане…</div>
        ) : visible.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
            Няма заявки в избрания изглед.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm" data-testid="requests-table">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Пациент</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Лечение</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Град</th>
                  <th className="px-4 py-3 text-left">Статус</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Назначена</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Първо действие</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => {
                  const sb = statusBadge(r.status)
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60" data-testid={`request-row-${r.id}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.patient_name}</div>
                        <div className="text-xs text-slate-500">{r.patient_phone}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-700">
                        {TREATMENT_LABELS[r.treatment_interest] || r.treatment_interest}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-700">{r.patient_city || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${sb.cls}`}>
                          {sb.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600 text-xs whitespace-nowrap">
                        {formatDate(r.assigned_at)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-600 text-xs whitespace-nowrap">
                        {formatDate(r.first_action_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/clinic/dashboard/requests/${r.id}`}
                          data-testid={`request-open-${r.id}`}
                          className="inline-flex items-center text-sky-600 hover:text-sky-700 font-medium text-sm"
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
    </ClinicShell>
  )
}
