'use client'

/**
 * Searchable clinic combobox — reused by the Recognition submission form
 * (patient tagging their own story) and the admin recognition moderation
 * screen (staff adding/correcting a tag). Fetches the public clinic list
 * once and filters client-side; fine at current clinic-directory size
 * (single digits to low tens) — revisit with a server-side search param
 * on GET /api/public/clinics if the directory grows into the hundreds.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Loader2, Search, X } from 'lucide-react'
import { listPublicClinics, type PublicClinic } from '@/lib/publicClinics'

interface Props {
  value: string | null
  onChange: (clinicId: string | null, clinicName: string | null) => void
  placeholder?: string
  /**
   * Display name to fall back to when `value` is set but isn't found in
   * the live-fetched clinic list — e.g. editing an existing tag whose
   * clinic has since gone inactive (GET /api/public/clinics filters
   * `is_active`). Without this, a stale-but-real tag would render as an
   * empty search box instead of the clinic it's actually pointing at,
   * which reads as "no tag" to whoever's moderating. Not needed when
   * `value` only ever comes from a selection made in the same session
   * (e.g. the Recognition submission form), since that clinic is
   * guaranteed to already be in the fetched list.
   */
  fallbackName?: string | null
}

export function ClinicPicker({ value, onChange, placeholder, fallbackName }: Props) {
  const [clinics, setClinics] = useState<PublicClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    listPublicClinics()
      .then((res) => { if (alive) setClinics(res.clinics) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => () => { if (blurTimeout.current) clearTimeout(blurTimeout.current) }, [])

  const selected = useMemo(() => {
    if (!value) return null
    const match = clinics.find((c) => c.id === value)
    if (match) return match
    if (fallbackName) {
      return { id: value, name: fallbackName, city_name: null } as PublicClinic
    }
    return null
  }, [clinics, value, fallbackName])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clinics
    return clinics.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.city_name || '').toLowerCase().includes(q),
    )
  }, [clinics, query])

  // Delay closing on blur so a click on a dropdown option registers first
  // (mousedown on the button fires before this blur's click would).
  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setOpen(false), 150)
  }

  if (selected) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#F5F4F2] px-3 py-2 text-sm"
        data-testid="clinic-picker-selected"
      >
        <Building2 className="h-4 w-4 shrink-0 text-[#007956]" />
        <span className="flex-1 truncate font-medium text-[#0A0A0A]">{selected.name}</span>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="shrink-0 text-[#6B6B6B] hover:text-[#0A0A0A]"
          aria-label="Премахни избраната клиника"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-[#E5E5E5] px-3 py-2 focus-within:border-[#007956]">
        <Search className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder || 'Търси клиника по име…'}
          className="w-full bg-transparent text-sm outline-none placeholder:text-[#6B6B6B]"
          data-testid="clinic-picker-input"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#6B6B6B]" />}
      </div>
      {open && !loading && (
        <div
          className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#E5E5E5] bg-white shadow-lg"
          data-testid="clinic-picker-dropdown"
        >
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-[#6B6B6B]">Няма намерени клиники.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id, c.name); setQuery(''); setOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F5F4F2]"
                data-testid={`clinic-picker-option-${c.id}`}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-[#007956]" />
                <span className="truncate">{c.name}</span>
                {c.city_name && (
                  <span className="ml-auto shrink-0 text-xs text-[#6B6B6B]">{c.city_name}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
