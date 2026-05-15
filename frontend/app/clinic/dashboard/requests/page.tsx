'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, Inbox, AlertCircle } from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import { RequestCard } from '@/components/clinic/RequestCard'
import {
  ConsultationRequest, statusBadge, formatDate, TREATMENT_LABELS, timeSince,
} from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'Всички' },
  { key: 'open', label: 'Активни' },
  { key: 'booked', label: 'Резервирани' },
  { key: 'attended', label: 'Посетили' },
  { key: 'no_show', label: 'Не се явили' },
]

type LoadState = 'loading' | 'ready' | 'error'

export default function ClinicRequestsPage() {
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/clinic/consultation-requests`, {
      credentials: 'include' as RequestCredentials,
    })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) {
            try { localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_user') } catch { /* noop */ }
            window.location.href = '/clinic'
            return
          }
          throw new Error(`HTTP ${r.status}`)
        }
        const d = await r.json()
        setRequests(d.requests || [])
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  const filterActive = filter !== 'all' || search.trim().length > 0

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
          {state === 'ready' && requests.length > 0 && (
            <div className="text-xs text-slate-500" data-testid="requests-count">
              {visible.length} от {requests.length}
            </div>
          )}
        </header>

        {/* Filter toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-testid="requests-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Търсене по име, телефон или лечение…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                data-testid={`requests-filter-${f.key}`}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap border transition-colors ${
                  filter === f.key
                    ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        {state === 'loading' ? (
          <RequestListSkeleton />
        ) : state === 'error' ? (
          <div
            className="bg-white border border-rose-200 rounded-2xl p-8 text-center"
            data-testid="requests-error"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 grid place-items-center mb-3">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <div className="text-base font-medium text-slate-700">Възникна грешка при зареждане</div>
            <p className="mt-1 text-sm text-slate-500">
              Опитайте отново след малко. Ако проблемът продължи, свържете се с partners@zubite.bg.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <RequestsEmptyState filterActive={filterActive} totalLoaded={requests.length} />
        ) : (
          <>
            {/* Mobile card grid */}
            <div className="grid grid-cols-1 gap-3 md:hidden" data-testid="requests-cards">
              {visible.map((r) => (
                <RequestCard key={r.id} r={r} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm" data-testid="requests-table">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Пациент</th>
                    <th className="px-4 py-3 text-left">Лечение</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Град</th>
                    <th className="px-4 py-3 text-left">Статус</th>
                    <th className="px-4 py-3 text-left">Назначена</th>
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
                        <td className="px-4 py-3 text-slate-700">
                          {TREATMENT_LABELS[r.treatment_interest] || r.treatment_interest}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-700">{r.patient_city || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${sb.cls}`}>
                            {sb.label}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap"
                          title={formatDate(r.assigned_at)}
                        >
                          {timeSince(r.assigned_at)}
                        </td>
                        <td
                          className="px-4 py-3 hidden lg:table-cell text-slate-600 text-xs whitespace-nowrap"
                          title={formatDate(r.first_action_at)}
                        >
                          {r.first_action_at ? timeSince(r.first_action_at) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/clinic/dashboard/requests/${r.id}`}
                            data-testid={`request-open-${r.id}`}
                            className="inline-flex items-center text-sky-600 hover:text-sky-700 font-medium text-sm"
                          >
                            Отвори →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ClinicShell>
  )
}

/** Skeleton placeholder rendered during the initial fetch. */
function RequestListSkeleton() {
  return (
    <div data-testid="requests-skeleton">
      {/* Mobile cards skeleton */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
            <div className="flex justify-between gap-2">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="mt-3 h-3 w-24 bg-slate-100 rounded" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="h-3 bg-slate-100 rounded" />
              <div className="h-3 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table skeleton */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 text-xs uppercase text-slate-400 grid grid-cols-6 gap-3">
          <div>Пациент</div><div>Лечение</div><div>Статус</div><div>Назначена</div><div>Първо действие</div><div className="text-right">Действия</div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-4 border-t border-slate-100 grid grid-cols-6 gap-3 animate-pulse">
            <div className="space-y-1.5">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-3.5 w-28 bg-slate-100 rounded my-1" />
            <div className="h-4 w-20 bg-slate-100 rounded-full my-1" />
            <div className="h-3 w-20 bg-slate-100 rounded my-1.5" />
            <div className="h-3 w-20 bg-slate-100 rounded my-1.5" />
            <div className="h-3 w-12 bg-slate-100 rounded my-1.5 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Filter-aware empty state. */
function RequestsEmptyState({ filterActive, totalLoaded }: { filterActive: boolean; totalLoaded: number }) {
  const isFilteredOut = filterActive && totalLoaded > 0
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-10 text-center"
      data-testid="requests-empty"
    >
      <div className="mx-auto w-14 h-14 rounded-full bg-sky-50 grid place-items-center mb-4">
        <Inbox className="w-7 h-7 text-sky-500" />
      </div>
      {isFilteredOut ? (
        <>
          <div className="text-base font-medium text-slate-700">Няма съвпадения за избрания филтър</div>
          <p className="mt-1 text-sm text-slate-500">
            Опитайте друг филтър или изчистете търсенето.
          </p>
        </>
      ) : (
        <>
          <div className="text-base font-medium text-slate-700">Все още няма заявки</div>
          <p className="mt-1 text-sm text-slate-500">
            Когато Zubite.bg насочи пациент към вашата клиника, заявката ще се появи тук в реално време.
          </p>
        </>
      )}
    </div>
  )
}
