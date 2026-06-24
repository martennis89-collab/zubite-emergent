'use client'

import { useRouter } from 'next/navigation'
import { Filter, X } from 'lucide-react'
import {
  type PublicClinicFilters, CITY_NAMES, TREATMENT_LABELS,
} from '@/lib/publicClinics'

interface Props {
  value: PublicClinicFilters
  onChange: (next: PublicClinicFilters) => void
  // When the user picks a city/specialty from the filter, we also rewrite
  // the URL so the page is shareable. Pass `null` to disable.
  syncToUrl?: { basePath: string } | null
}

const CITY_OPTIONS = Object.keys(CITY_NAMES)
const TREATMENT_OPTIONS = ['invisalign', 'aligners', 'implants', 'full_mouth', 'cosmetic']

/**
 * Public filter bar — kept intentionally simple per V1 scope.
 * No facet counts (we don't precompute them), no complex AND/OR.
 */
export default function PublicClinicFilters({ value, onChange, syncToUrl }: Props) {
  const router = useRouter()

  const update = (patch: Partial<PublicClinicFilters>) => {
    const next = { ...value, ...patch }
    onChange(next)
    if (syncToUrl) {
      const sp = new URLSearchParams()
      if (next.specialty) sp.set('specialty', next.specialty)
      if (next.online_consultation) sp.set('online', '1')
      // care_pass filter removed Feb 2026: Care Pass is now a standard
      // benefit at every partner clinic, so the filter no longer adds
      // signal. The URL key is still tolerated on read for backwards
      // compatibility but it is never written.
      if (next.accepts_adults) sp.set('adults', '1')
      if (next.accepts_children) sp.set('children', '1')
      const target = next.city
        ? `${syncToUrl.basePath}/${next.city}`
        : syncToUrl.basePath
      router.replace(sp.toString() ? `${target}?${sp.toString()}` : target)
    }
  }

  const clearAll = () => {
    onChange({})
    if (syncToUrl) router.replace(syncToUrl.basePath)
  }

  const hasAny =
    !!value.city ||
    !!value.specialty ||
    value.online_consultation ||
    value.accepts_adults ||
    value.accepts_children

  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/75 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-4 sm:p-5 mb-6"
      data-testid="public-clinic-filters"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-800 inline-flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-teal-600" />
          Филтри
        </p>
        {hasAny && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
            data-testid="filters-clear"
          >
            <X className="w-3 h-3" />
            Изчисти
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Град
          </label>
          <select
            value={value.city || ''}
            onChange={(e) => update({ city: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-md ring-1 ring-slate-300 bg-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            data-testid="filter-city"
          >
            <option value="">Всички градове</option>
            {CITY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CITY_NAMES[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Направление
          </label>
          <select
            value={value.specialty || ''}
            onChange={(e) => update({ specialty: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-md ring-1 ring-slate-300 bg-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            data-testid="filter-specialty"
          >
            <option value="">Всички направления</option>
            {TREATMENT_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TREATMENT_LABELS[t] || t}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-2 flex flex-wrap gap-2 sm:items-end">
          {[
            { key: 'online_consultation' as const, label: 'Онлайн консултация' },
            // 'care_pass' filter removed Feb 2026 — Care Pass is now a
            // standard benefit at every partner clinic, so the filter
            // doesn't add signal anymore. The chip remains on each card
            // as a positive reassurance.
            { key: 'accepts_adults' as const, label: 'Възрастни' },
            { key: 'accepts_children' as const, label: 'Деца' },
          ].map(({ key, label }) => {
            const on = !!value[key]
            return (
              <button
                type="button"
                key={key}
                onClick={() => update({ [key]: !on })}
                className={
                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ring-1 ' +
                  (on
                    ? 'bg-teal-600 text-white ring-teal-600 hover:bg-teal-700'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
                }
                data-testid={`filter-${key}`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
