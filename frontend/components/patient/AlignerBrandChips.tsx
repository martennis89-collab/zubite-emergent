'use client'

/**
 * Aligner brand / provider tag chips for the public clinic profile (R2).
 *
 * Backend (`public_aligner_brand_chips`) already enforces the
 * verification downgrade rule, so this component never has to second-
 * guess: when `verified_official === true` we render the stronger
 * "Официален <brand> provider" chip; otherwise we render the safer
 * "Работи с …" form.
 *
 * No brand logos are used — text-only chips per the R1 spec, no logo
 * scraping, no external assets.
 */
import { ShieldCheck } from 'lucide-react'

export interface PublicAlignerBrandChip {
  brand: string
  label: string
  relationship: 'offered' | 'official_provider'
  verified_official: boolean
}

interface Props {
  chips: PublicAlignerBrandChip[] | null | undefined
  /**
   * 'card' → compact chip strip used inside ClinicRecommendationCard
   * 'profile' → larger labelled section used on the dedicated profile.
   */
  layout?: 'card' | 'profile'
}

export function AlignerBrandChips({ chips, layout = 'profile' }: Props) {
  const safe = (chips || []).filter(
    (c) => c && typeof c.label === 'string' && c.label.trim().length > 0,
  )
  if (safe.length === 0) return null

  const compact = layout === 'card'

  return (
    <div
      className={compact ? 'mt-2' : 'mt-1'}
      data-testid={compact ? 'card-aligner-brands' : 'profile-aligner-brands'}
    >
      {!compact && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Алайнер системи
        </p>
      )}
      <ul className="flex flex-wrap gap-1.5">
        {safe.map((chip) => {
          const verified = chip.verified_official
          const text = verified
            ? `Официален ${chip.label} provider`
            : compact
            ? chip.label
            : `Работи с ${chip.label}`
          const className = verified
            ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
            : 'bg-teal-50 text-teal-800 ring-teal-100'
          return (
            <li
              key={chip.brand + (verified ? '-v' : '')}
              className={
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ' +
                className
              }
              data-testid={
                verified
                  ? `aligner-chip-verified-${chip.brand}`
                  : `aligner-chip-${chip.brand}`
              }
            >
              {verified && <ShieldCheck className="w-3 h-3" aria-hidden />}
              {text}
            </li>
          )
        })}
      </ul>
      {!compact && (
        <p className="mt-2 text-[10px] text-slate-400 leading-snug max-w-md">
          Безопасните етикети &laquo;Работи с&raquo; означават, че клиниката
          предлага лечение с марката. Само етикети със знак за верификация
          означават администраторски потвърден официален статус.
        </p>
      )}
    </div>
  )
}
