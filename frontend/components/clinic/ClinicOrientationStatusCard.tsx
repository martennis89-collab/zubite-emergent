'use client'

/**
 * Clinic Dashboard · Online Orientation read-only status card.
 *
 * Phase D (June 2026) — clinic-side READ ONLY.
 * Admin is the source of truth for these settings. The clinic can see
 * - whether Online Orientation is included in plan / add-on / disabled
 * - current operational status (active / inactive)
 * - monthly limits, slot duration, eligible categories
 * - weekly availability summary
 *
 * No editing here. No booking UI. No patient-facing surface.
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, ShieldOff, Sparkles, Calendar, Loader2, Info } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type AccessStatus =
  | 'included_in_plan'
  | 'addon_enabled'
  | 'disabled_by_admin'
  | 'not_available'
  | 'clinic_inactive'

interface ClinicOrientationPayload {
  clinic_id: string
  clinic_name: string | null
  partner_tier: string | null
  settings: {
    enabled: boolean
    addon_enabled_for_basic: boolean
    monthly_free_slot_limit: number
    slot_duration_minutes: number
    max_bookings_per_day: number
    booking_buffer_minutes: number
    eligible_treatment_categories: string[]
    public_description: string | null
    disclaimer_text: string | null
  }
  access: {
    status: AccessStatus
    is_active: boolean
    plan_category: 'premium' | 'basic' | 'admin_only' | 'unknown'
    enabled: boolean
    addon_enabled_for_basic: boolean
  }
  availability_summary: { active_windows: number; total_windows: number; active_days: string[] }
}

const DAY_LABELS_BG: Record<string, string> = {
  monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср', thursday: 'Чт',
  friday: 'Пт', saturday: 'Сб', sunday: 'Нд',
}
const CATEGORY_LABELS_BG: Record<string, string> = {
  orthodontics: 'Ортодонтия',
  aligners: 'Алайнери',
  implants: 'Импланти',
  cosmetic_dentistry: 'Естетична стоматология',
  general_orientation: 'Обща ориентация',
}

export function ClinicOrientationStatusCard() {
  const [data, setData] = useState<ClinicOrientationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`${API_URL}/api/clinic/orientation-settings`, {
          credentials: 'include' as RequestCredentials,
        })
        if (cancelled) return
        if (!r.ok) {
          setErr('Не успяхме да заредим статуса на онлайн ориентацията.')
          return
        }
        setData(await r.json())
      } catch {
        if (!cancelled) setErr('Грешка при зареждане.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div
        className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-500 inline-flex items-center gap-2"
        data-testid="clinic-orientation-loading"
      >
        <Loader2 className="w-4 h-4 animate-spin" /> Зареждане на онлайн ориентация…
      </div>
    )
  }
  if (err || !data) {
    return (
      <div
        className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-500"
        data-testid="clinic-orientation-error"
      >
        {err || '—'}
      </div>
    )
  }

  const { access } = data
  const isPremium = access.plan_category === 'premium'
  const isBasic = access.plan_category === 'basic'

  // Headline copy per spec
  let headline = ''
  let subline: string | null = null
  let tone = 'bg-slate-50 text-slate-700 border-slate-200'
  let icon = <Info className="w-4 h-4" />

  if (access.status === 'clinic_inactive') {
    headline = 'Безплатна онлайн ориентация: неактивна'
    subline = 'Клиниката не е активна за пациентския funnel.'
    tone = 'bg-rose-50 text-rose-700 border-rose-200'
    icon = <ShieldOff className="w-4 h-4" />
  } else if (access.status === 'included_in_plan') {
    headline = 'Безплатна онлайн ориентация: включена в Premium профила'
    subline = `Активна · ${data.availability_summary.active_windows} седмични слота`
    tone = 'bg-emerald-50 text-emerald-700 border-emerald-200'
    icon = <Sparkles className="w-4 h-4" />
  } else if (access.status === 'addon_enabled') {
    headline = 'Безплатна онлайн ориентация: add-on активиран'
    subline = `Активна · ${data.availability_summary.active_windows} седмични слота`
    tone = 'bg-teal-50 text-teal-700 border-teal-200'
    icon = <CheckCircle2 className="w-4 h-4" />
  } else if (access.status === 'disabled_by_admin') {
    headline = isPremium
      ? 'Безплатна онлайн ориентация: включена в Premium профила (изключена от админа)'
      : 'Безплатна онлайн ориентация: add-on активиран (изключена от админа)'
    subline = 'Операционно е спряна. Свържете се с екипа на Zubite.bg за включване.'
    tone = 'bg-amber-50 text-amber-800 border-amber-200'
  } else if (access.status === 'not_available') {
    headline = isBasic
      ? 'Безплатна онлайн ориентация: налична като add-on функция'
      : 'Безплатна онлайн ориентация: не е достъпна'
    subline = isBasic ? 'Не е активирана за вашия Basic профил.' : null
    tone = 'bg-slate-50 text-slate-600 border-slate-200'
  }

  const showDetails = access.status === 'included_in_plan' || access.status === 'addon_enabled'

  return (
    <section
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3"
      data-testid="clinic-orientation-card"
    >
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${tone}`} data-testid="clinic-orientation-badge">
        {icon}
        <span data-testid="clinic-orientation-status-text">{headline}</span>
      </div>

      {subline && (
        <p className="text-sm text-slate-600" data-testid="clinic-orientation-subline">
          {subline}
        </p>
      )}

      {showDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3" data-testid="clinic-orientation-details">
          <Stat label="Месечен лимит" value={`${data.settings.monthly_free_slot_limit} часа`} testid="clinic-orient-stat-monthly" />
          <Stat label="Продължителност" value={`${data.settings.slot_duration_minutes} мин`} testid="clinic-orient-stat-duration" />
          <Stat label="Макс. на ден" value={String(data.settings.max_bookings_per_day)} testid="clinic-orient-stat-max-day" />
          <Stat
            label="Активни дни"
            value={
              data.availability_summary.active_days.length
                ? data.availability_summary.active_days
                    .map((d) => DAY_LABELS_BG[d] || d)
                    .join(', ')
                : '—'
            }
            testid="clinic-orient-stat-days"
          />
        </div>
      )}

      {showDetails && data.settings.eligible_treatment_categories.length > 0 && (
        <div className="flex items-start gap-2 flex-wrap mt-3" data-testid="clinic-orientation-cats">
          <span className="text-xs text-slate-500 mt-1">Подходящи категории:</span>
          {data.settings.eligible_treatment_categories.map((c) => (
            <span key={c} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {CATEGORY_LABELS_BG[c] || c}
            </span>
          ))}
        </div>
      )}

      {showDetails && data.availability_summary.active_windows === 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700" data-testid="clinic-orientation-no-windows">
          <Calendar className="w-4 h-4" />
          Все още няма дефинирани седмични слотове — свържете се с екипа на Zubite.bg.
        </div>
      )}

      {showDetails && data.settings.public_description && (
        <p className="text-xs text-slate-500 mt-3" data-testid="clinic-orientation-public-desc">
          „{data.settings.public_description}"
        </p>
      )}
    </section>
  )
}

function Stat({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div data-testid={testid}>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-800 mt-0.5">{value}</div>
    </div>
  )
}
