'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { CITY_NAMES, type PublicClinicFilters } from '@/lib/publicClinics'

interface Props {
  value: PublicClinicFilters
  onChange: (next: PublicClinicFilters) => void
  syncToUrl?: {
    basePath: string
    preserve?: Record<string, string>
    keepCityInQuery?: boolean
  } | null
}

const treatments = [
  { value: 'orthodontics', label: 'Ортодонтия' },
  { value: 'implants', label: 'Импланти' },
  { value: 'cosmetic', label: 'Естетична стоматология' },
]

export default function PublicClinicFilters({ value, onChange, syncToUrl }: Props) {
  const router = useRouter()

  const update = (patch: Partial<PublicClinicFilters>) => {
    const next = { ...value, ...patch }
    onChange(next)
    if (!syncToUrl) return
    const params = new URLSearchParams()
    Object.entries(syncToUrl.preserve || {}).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    if (next.city && syncToUrl.keepCityInQuery) params.set('city', next.city)
    if (next.specialty) params.set('specialty', next.specialty)
    if (next.online_consultation) params.set('online', '1')
    if (next.accepts_adults) params.set('adults', '1')
    if (next.accepts_children) params.set('children', '1')
    const path = next.city && !syncToUrl.keepCityInQuery
      ? `${syncToUrl.basePath}/${next.city}`
      : syncToUrl.basePath
    const query = params.toString()
    router.replace(query ? `${path}?${query}` : path)
  }

  const clearAll = () => {
    onChange({})
    if (syncToUrl) {
      const params = new URLSearchParams(syncToUrl.preserve || {})
      const query = params.toString()
      router.replace(query ? `${syncToUrl.basePath}?${query}` : syncToUrl.basePath)
    }
  }

  const hasAny = Boolean(value.city || value.specialty || value.online_consultation || value.accepts_adults || value.accepts_children)

  return (
    <aside className="taste-directory-filters rounded-xl border border-[#E2E8F0] bg-white p-6 lg:sticky lg:top-28" data-testid="public-clinic-filters">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#30302F]">Филтрирай по лечение</h2>
        {hasAny && <button type="button" onClick={clearAll} className="inline-flex min-h-11 items-center gap-1 px-2 text-xs text-[#64748B] hover:text-black" data-testid="filters-clear"><X className="h-3.5 w-3.5" />Изчисти</button>}
      </div>

      <div className="mt-5 space-y-3">
        {treatments.map((treatment) => {
          const active = value.specialty === treatment.value
          return (
            <button
              type="button"
              key={treatment.value}
              onClick={() => update({ specialty: active ? undefined : treatment.value })}
              aria-pressed={active}
              className="flex min-h-11 w-full items-center gap-3 text-left text-sm leading-5 text-[#30302F]"
              data-testid={`filter-treatment-${treatment.value}`}
            >
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${active ? 'border-[#006A61] bg-[#006A61]' : 'border-[#76777D] bg-white'}`}>
                {active && <span className="h-2 w-2 rounded-sm bg-white" />}
              </span>
              {treatment.label}
            </button>
          )
        })}
      </div>

      <div className="mt-8">
        <label htmlFor="clinic-city" className="text-xs font-bold uppercase tracking-[0.12em] text-[#30302F]">Град</label>
        <select id="clinic-city" value={value.city || ''} onChange={(event) => update({ city: event.target.value || undefined })} className="mt-3 w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-black outline-none focus:border-[#006A61] focus:ring-2 focus:ring-[#89F5E7]" data-testid="filter-city">
          <option value="">Всички градове</option>
          {Object.entries(CITY_NAMES).map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
        </select>
      </div>

      <div className="mt-8 border-t border-[#E2E8F0] pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#30302F]">Подходящо за</p>
        <div className="mt-4 space-y-3">
          {[
            { key: 'online_consultation' as const, label: 'Онлайн консултация' },
            { key: 'accepts_adults' as const, label: 'Възрастни' },
            { key: 'accepts_children' as const, label: 'Деца' },
          ].map(({ key, label }) => {
            const active = Boolean(value[key])
            return (
              <button type="button" key={key} onClick={() => update({ [key]: !active })} aria-pressed={active} className="flex min-h-11 w-full items-center gap-3 text-left text-sm text-[#30302F]" data-testid={`filter-${key}`}>
                <span className={`grid h-5 w-5 place-items-center rounded border ${active ? 'border-[#006A61] bg-[#006A61]' : 'border-[#76777D] bg-white'}`}>{active && <span className="h-2 w-2 rounded-sm bg-white" />}</span>
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
