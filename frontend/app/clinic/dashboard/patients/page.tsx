'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, Users, AlertCircle } from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import { timeSince, formatDate } from '@/lib/consultationLabels'
import { listClinicPatients, ClinicPatientRow, CarePassStatus } from '@/lib/patients'

const CARE_PASS_BADGE: Record<CarePassStatus, { label: string; cls: string }> = {
  unlocked: { label: 'Care Pass отключен', cls: 'bg-emerald-100 text-emerald-700' },
  eligible: { label: 'Допустим за Care Pass', cls: 'bg-amber-100 text-amber-800' },
  none: { label: 'Без Care Pass', cls: 'bg-slate-100 text-slate-500' },
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'Всички' },
  { key: 'unlocked', label: 'С активен Care Pass' },
  { key: 'eligible', label: 'Допустими' },
  { key: 'none', label: 'Без Care Pass' },
]

type LoadState = 'loading' | 'ready' | 'error'

export default function ClinicPatientsPage() {
  const [patients, setPatients] = useState<ClinicPatientRow[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    listClinicPatients()
      .then((rows) => {
        setPatients(rows)
        setState('ready')
      })
      .catch((err) => {
        if (err?.status === 401 || err?.status === 403) {
          try { localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_user') } catch { /* noop */ }
          window.location.href = '/clinic'
          return
        }
        setState('error')
      })
  }, [])

  const filterActive = filter !== 'all' || search.trim().length > 0

  const visible = useMemo(() => {
    let list = patients
    if (filter !== 'all') {
      list = list.filter((p) => p.care_pass_status === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.phone || '').includes(q) ||
        String(p.patient_number).includes(q)
      )
    }
    return list
  }, [patients, filter, search])

  return (
    <ClinicShell>
      <div className="space-y-5">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Пациенти
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Всички пациенти, насочени към клиниката ви през Zubite.bg, с номер и мини профил.
            </p>
          </div>
          {state === 'ready' && patients.length > 0 && (
            <div className="text-xs text-slate-500" data-testid="patients-count">
              {visible.length} от {patients.length}
            </div>
          )}
        </header>

        {/* Filter toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-testid="patients-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Търсене по име, телефон или номер…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                data-testid={`patients-filter-${f.key}`}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap border transition-colors ${
                  filter === f.key
                    ? 'bg-teal-500 border-teal-500 text-white shadow-sm'
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
          <PatientListSkeleton />
        ) : state === 'error' ? (
          <div
            className="bg-white border border-rose-200 rounded-2xl p-8 text-center"
            data-testid="patients-error"
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
          <PatientsEmptyState filterActive={filterActive} totalLoaded={patients.length} />
        ) : (
          <>
            {/* Mobile card grid */}
            <div className="grid grid-cols-1 gap-3 md:hidden" data-testid="patients-cards">
              {visible.map((p) => (
                <PatientCard key={p.lead_id} p={p} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm" data-testid="patients-table">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">№</th>
                    <th className="px-4 py-3 text-left">Пациент</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Care Pass</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Активност</th>
                    <th className="px-4 py-3 text-left">Насочен</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((p) => {
                    const cp = CARE_PASS_BADGE[p.care_pass_status]
                    return (
                      <tr key={p.lead_id} className="hover:bg-slate-50/60" data-testid={`patient-row-${p.patient_number}`}>
                        <td className="px-4 py-3 font-mono text-slate-900 font-medium">
                          №{p.patient_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{p.name || '—'}</div>
                          <div className="text-xs text-slate-500">{p.phone}</div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${cp.cls}`}>
                            {cp.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-600 text-xs">
                          {p.consultation_count} консултации · {p.booking_count} резервации · {p.orientation_count} онлайн
                        </td>
                        <td
                          className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap"
                          title={formatDate(p.created_at)}
                        >
                          {timeSince(p.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/clinic/dashboard/patients/${p.patient_number}`}
                            data-testid={`patient-open-${p.patient_number}`}
                            className="inline-flex items-center text-teal-600 hover:text-teal-700 font-medium text-sm"
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

function PatientCard({ p }: { p: ClinicPatientRow }) {
  const cp = CARE_PASS_BADGE[p.care_pass_status]
  return (
    <Link
      href={`/clinic/dashboard/patients/${p.patient_number}`}
      data-testid={`patient-card-${p.patient_number}`}
      className="block bg-white border border-slate-200 rounded-2xl p-4 hover:border-teal-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs text-slate-500">№{p.patient_number}</div>
          <div className="font-medium text-slate-900">{p.name || '—'}</div>
          <div className="text-xs text-slate-500">{p.phone}</div>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${cp.cls}`}>
          {cp.label}
        </span>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        {p.consultation_count} консултации · {p.booking_count} резервации · {p.orientation_count} онлайн
      </div>
    </Link>
  )
}

/** Skeleton placeholder rendered during the initial fetch. */
function PatientListSkeleton() {
  return (
    <div data-testid="patients-skeleton">
      {/* Mobile cards skeleton */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
            <div className="flex justify-between gap-2">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="mt-3 h-3 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      {/* Desktop table skeleton */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 text-xs uppercase text-slate-400 grid grid-cols-5 gap-3">
          <div>№</div><div>Пациент</div><div>Care Pass</div><div>Насочен</div><div className="text-right">Действия</div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-4 border-t border-slate-100 grid grid-cols-5 gap-3 animate-pulse">
            <div className="h-3.5 w-10 bg-slate-200 rounded" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-100 rounded-full my-1" />
            <div className="h-3 w-20 bg-slate-100 rounded my-1.5" />
            <div className="h-3 w-12 bg-slate-100 rounded my-1.5 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Filter-aware empty state. */
function PatientsEmptyState({ filterActive, totalLoaded }: { filterActive: boolean; totalLoaded: number }) {
  const isFilteredOut = filterActive && totalLoaded > 0
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-10 text-center"
      data-testid="patients-empty"
    >
      <div className="mx-auto w-14 h-14 rounded-full bg-teal-50 grid place-items-center mb-4">
        <Users className="w-7 h-7 text-teal-500" />
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
          <div className="text-base font-medium text-slate-700">Все още няма пациенти</div>
          <p className="mt-1 text-sm text-slate-500">
            Когато Zubite.bg насочи пациент към вашата клиника, той ще се появи тук с уникален номер.
          </p>
        </>
      )}
    </div>
  )
}
