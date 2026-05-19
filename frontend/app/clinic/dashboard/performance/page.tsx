'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  TrendingUp, CalendarCheck2, CheckCheck, Timer, AlertCircle,
  Info, BarChart3, Activity,
} from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import {
  ConsultationRequest, formatDuration,
} from '@/lib/consultationLabels'
import {
  PerformanceFunnelChart, type FunnelStage,
} from '@/components/clinic/PerformanceFunnelChart'
import {
  PerformanceTrendChart, type TrendBucket,
} from '@/components/clinic/PerformanceTrendChart'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type PeriodKey = '30d' | '90d' | 'ytd' | 'all'

const PERIOD_OPTS: Array<{ key: PeriodKey; label: string }> = [
  { key: '30d', label: '30 дни' },
  { key: '90d', label: '90 дни' },
  { key: 'ytd', label: 'Тази година' },
  { key: 'all', label: 'Всички' },
]

const MONTHS_BG_SHORT = [
  'яну', 'фев', 'мар', 'апр', 'май', 'юни',
  'юли', 'авг', 'сеп', 'окт', 'ное', 'дек',
]

export default function ClinicPerformancePage() {
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodKey>('90d')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_URL}/api/clinic/consultation-requests`, {
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          window.location.href = '/clinic'
          return
        }
        throw new Error(`HTTP ${r.status}`)
      }
      const d = await r.json()
      setRequests((d.requests || []) as ConsultationRequest[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Възникна грешка при зареждане')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Compute the period start (inclusive) — `null` means no lower bound (all-time).
  const periodStart = useMemo<Date | null>(() => {
    const now = new Date()
    if (period === '30d') return new Date(now.getTime() - 30 * 86400_000)
    if (period === '90d') return new Date(now.getTime() - 90 * 86400_000)
    if (period === 'ytd') return new Date(now.getFullYear(), 0, 1)
    return null
  }, [period])

  // Requests filtered by the selected period — uses `assigned_at` as the anchor.
  // (Falls back to `created_at` if `assigned_at` is missing.)
  const filtered = useMemo(() => {
    if (!periodStart) return requests
    return requests.filter((r) => {
      const anchor = r.assigned_at || r.created_at
      if (!anchor) return false
      const t = new Date(anchor)
      return !Number.isNaN(+t) && t >= periodStart
    })
  }, [requests, periodStart])

  // Funnel-stage counts.
  const stats = useMemo(() => {
    const total = filtered.length
    const viewed = filtered.filter(
      (r) => r.clinic_viewed_at || (r.status && r.status !== 'new' && r.status !== 'assigned'),
    ).length
    const contacted = filtered.filter((r) => r.patient_contacted_at).length
    const booked = filtered.filter((r) => r.appointment_booked_at).length
    const attended = filtered.filter((r) => r.attended_at).length
    const noShow = filtered.filter((r) => r.no_show_at).length

    // Avg seconds to first action / booking. Skip rows where anchor or target is missing.
    const respDiffs: number[] = []
    const bookDiffs: number[] = []
    for (const r of filtered) {
      if (r.assigned_at && r.first_action_at) {
        const d =
          (new Date(r.first_action_at).getTime() - new Date(r.assigned_at).getTime()) / 1000
        if (Number.isFinite(d) && d >= 0) respDiffs.push(d)
      }
      if (r.assigned_at && r.appointment_booked_at) {
        const d =
          (new Date(r.appointment_booked_at).getTime() - new Date(r.assigned_at).getTime()) / 1000
        if (Number.isFinite(d) && d >= 0) bookDiffs.push(d)
      }
    }
    const avg = (xs: number[]) =>
      xs.length === 0 ? null : xs.reduce((s, x) => s + x, 0) / xs.length

    const conversion = total > 0 ? (booked / total) * 100 : 0
    const attendance = booked > 0 ? (attended / booked) * 100 : 0

    return {
      total, viewed, contacted, booked, attended, noShow,
      avgFirstAction: avg(respDiffs),
      avgBook: avg(bookDiffs),
      conversion,
      attendance,
    }
  }, [filtered])

  // Build trend buckets for the selected period.
  const trendBuckets = useMemo<TrendBucket[]>(() => {
    // For ≤90d we use weekly buckets; for ytd / all we use monthly buckets.
    if (period === '30d' || period === '90d') {
      const weeks = period === '30d' ? 4 : 13
      const buckets: TrendBucket[] = []
      const now = new Date()
      // Anchor on the start of today + roll back to weekly boundaries.
      const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      for (let i = weeks - 1; i >= 0; i--) {
        const end = new Date(todayMid.getTime() - i * 7 * 86400_000 + 86400_000)
        const start = new Date(end.getTime() - 7 * 86400_000)
        const booked = filtered.filter((r) => {
          const t = r.appointment_booked_at
            ? new Date(r.appointment_booked_at)
            : null
          return t && t >= start && t < end
        }).length
        const attended = filtered.filter((r) => {
          const t = r.attended_at ? new Date(r.attended_at) : null
          return t && t >= start && t < end
        }).length
        const label = `${start.getDate().toString().padStart(2, '0')}.${(start.getMonth() + 1).toString().padStart(2, '0')}`
        const rangeLabel = `${label} – ${(end.getDate() - 1).toString().padStart(2, '0')}.${(end.getMonth() + 1).toString().padStart(2, '0')}`
        buckets.push({ label, booked, attended, rangeLabel })
      }
      return buckets
    }

    // Monthly buckets.
    const buckets: TrendBucket[] = []
    const now = new Date()
    let monthsToShow = 12
    let earliest: Date | null = null
    for (const r of requests) {
      const t = r.assigned_at || r.created_at
      if (!t) continue
      const d = new Date(t)
      if (!earliest || d < earliest) earliest = d
    }
    if (period === 'ytd') {
      monthsToShow = now.getMonth() + 1
    } else if (period === 'all' && earliest) {
      const monthsSpan =
        (now.getFullYear() - earliest.getFullYear()) * 12 +
        (now.getMonth() - earliest.getMonth()) + 1
      monthsToShow = Math.max(1, Math.min(12, monthsSpan))
    }
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const booked = filtered.filter((r) => {
        const t = r.appointment_booked_at
          ? new Date(r.appointment_booked_at)
          : null
        return t && t >= d && t < next
      }).length
      const attended = filtered.filter((r) => {
        const t = r.attended_at ? new Date(r.attended_at) : null
        return t && t >= d && t < next
      }).length
      const label =
        d.getMonth() === 0 || i === monthsToShow - 1
          ? `${MONTHS_BG_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
          : MONTHS_BG_SHORT[d.getMonth()]
      const rangeLabel = `${d.toLocaleDateString('bg-BG')} – ${new Date(next.getTime() - 86400_000).toLocaleDateString('bg-BG')}`
      buckets.push({ label, booked, attended, rangeLabel })
    }
    return buckets
  }, [filtered, requests, period])

  const trendHasData = useMemo(
    () => trendBuckets.some((b) => b.booked > 0 || b.attended > 0),
    [trendBuckets],
  )

  const funnelStages: FunnelStage[] = [
    { key: 'received', label: 'Получени заявки', count: stats.total },
    { key: 'viewed',   label: 'Видени',          count: stats.viewed },
    { key: 'contacted', label: 'Свързани',       count: stats.contacted },
    { key: 'booked',   label: 'Резервирани',     count: stats.booked },
    { key: 'attended', label: 'Посетили',        count: stats.attended },
  ]

  const hasAnyData = requests.length > 0
  const periodHasData = stats.total > 0
  const periodLabel = PERIOD_OPTS.find((p) => p.key === period)?.label || period

  return (
    <ClinicShell>
      <div className="space-y-6">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Резултати на клиниката
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Конверсия по фунията и тенденции на резервации/посещения.
            </p>
          </div>

          {/* Period selector */}
          <div
            className="inline-flex bg-slate-100 rounded-lg p-1"
            role="tablist"
            aria-label="Период"
            data-testid="performance-period-selector"
          >
            {PERIOD_OPTS.map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                data-testid={`performance-period-${p.key}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <PerformanceSkeleton />
        ) : error ? (
          <ErrorPanel msg={error} onRetry={load} />
        ) : !hasAnyData ? (
          <EmptyAllTime />
        ) : (
          <>
            {/* Hero KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <HeroKpi
                testid="perf-kpi-total"
                icon={<Activity className="w-5 h-5" />}
                label="Заявки общо"
                value={stats.total}
                tone="sky"
                hint={periodLabel}
              />
              <HeroKpi
                testid="perf-kpi-booked"
                icon={<CalendarCheck2 className="w-5 h-5" />}
                label="Резервирани"
                value={stats.booked}
                tone="emerald"
                hint={
                  stats.total > 0
                    ? `${stats.conversion.toFixed(0)}% от заявките`
                    : '—'
                }
              />
              <HeroKpi
                testid="perf-kpi-attended"
                icon={<CheckCheck className="w-5 h-5" />}
                label="Посетили"
                value={stats.attended}
                tone="emerald"
                hint={
                  stats.booked > 0
                    ? `${stats.attendance.toFixed(0)}% от резервираните`
                    : '—'
                }
              />
              <HeroKpi
                testid="perf-kpi-avg-action"
                icon={<Timer className="w-5 h-5" />}
                label="Средно време до реакция"
                value={formatDuration(stats.avgFirstAction)}
                tone="slate"
                hint="от назначаване до първо действие"
              />
            </div>

            {/* Middle: 2 panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section
                className="bg-white border border-slate-200 rounded-2xl p-5"
                data-testid="performance-funnel-section"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Фуния на конверсията
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">{periodLabel}</span>
                </div>
                {periodHasData ? (
                  <PerformanceFunnelChart stages={funnelStages} />
                ) : (
                  <div className="text-sm text-slate-400 py-8 text-center">
                    Няма данни за избрания период. Опитайте „Всички".
                  </div>
                )}
              </section>

              <section
                className="bg-white border border-slate-200 rounded-2xl p-5"
                data-testid="performance-trend-section"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Резервации и посещения
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">{periodLabel}</span>
                </div>
                {trendHasData ? (
                  <PerformanceTrendChart data={trendBuckets} />
                ) : (
                  <div className="text-sm text-slate-400 py-8 text-center">
                    Все още няма достатъчно данни за тенденция.
                  </div>
                )}
              </section>
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SecondaryStat
                testid="perf-sec-viewed"
                label="Прегледани заявки"
                value={stats.viewed}
              />
              <SecondaryStat
                testid="perf-sec-contacted"
                label="Свързани с пациент"
                value={stats.contacted}
              />
              <SecondaryStat
                testid="perf-sec-noshow"
                label="Не се явили"
                value={stats.noShow}
                tone={stats.noShow > 0 ? 'warn' : undefined}
              />
              <SecondaryStat
                testid="perf-sec-avg-book"
                label="Средно време до резервация"
                value={formatDuration(stats.avgBook)}
              />
            </div>

            {/* Insights card */}
            <section
              className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 rounded-2xl p-5"
              data-testid="performance-insights"
            >
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Как да четете тези данни
                </h2>
              </div>
              <ul className="text-sm text-slate-600 space-y-1.5">
                <li>
                  <span className="font-medium text-slate-900">Бързата реакция</span>{' '}
                  към новите заявки повишава шанса за резервация.
                </li>
                <li>
                  <span className="font-medium text-slate-900">Резервираните</span>{' '}
                  консултации показват, че пациентът има реален интерес.
                </li>
                <li>
                  <span className="font-medium text-slate-900">Посетените</span>{' '}
                  консултации показват, че последвалата комуникация е работила.
                </li>
                <li>
                  <span className="font-medium text-slate-900">Неявилите се</span>{' '}
                  обикновено се възвръщат с напомняне ден преди срещата.
                </li>
              </ul>
              <p className="text-xs text-slate-400 mt-3">
                Времената и проценти за избрания период се изчисляват директно от
                наличните заявки на клиниката, без оценки или прогнози.
              </p>
            </section>
          </>
        )}
      </div>
    </ClinicShell>
  )
}

/* ---------------- subcomponents ---------------- */

type Tone = 'sky' | 'emerald' | 'rose' | 'slate' | 'amber'

const TONE_BG: Record<Tone, string> = {
  sky: 'bg-teal-50 text-teal-700 ring-teal-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-50 text-slate-600 ring-slate-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
}

function HeroKpi({
  icon, label, value, tone, testid, hint,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  tone: Tone; testid: string; hint?: string
}) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full"
      data-testid={testid}
    >
      <div className={`w-10 h-10 rounded-lg grid place-items-center mb-3 ring-1 ${TONE_BG[tone]}`}>
        {icon}
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-1 leading-snug">{label}</div>
      {hint && <div className="text-xs text-slate-400 mt-1.5">{hint}</div>}
    </div>
  )
}

function SecondaryStat({
  label, value, testid, tone,
}: { label: string; value: string | number; testid: string; tone?: 'warn' }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-4"
      data-testid={testid}
    >
      <div
        className={`text-xl font-semibold ${
          tone === 'warn' ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  )
}

function ErrorPanel({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div
      className="bg-white border border-rose-200 rounded-xl p-6 flex items-start gap-3"
      data-testid="performance-error"
    >
      <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-medium text-rose-900">Възникна грешка при зареждане</div>
        <p className="text-sm text-rose-700 mt-0.5">
          {msg}. Опитайте отново или ни пишете на{' '}
          <a href="mailto:support@zubite.bg" className="underline">
            support@zubite.bg
          </a>
          .
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-rose-700 hover:text-rose-800 underline"
          data-testid="performance-retry-btn"
        >
          Опитай отново
        </button>
      </div>
    </div>
  )
}

function EmptyAllTime() {
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-10 text-center"
      data-testid="performance-empty-alltime"
    >
      <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-teal-50 text-teal-600 mb-3">
        <TrendingUp className="w-5 h-5" />
      </div>
      <div className="text-base font-medium text-slate-700">
        Все още няма данни за анализ
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Резултатите ще се изчисляват автоматично, когато започнат да постъпват
        заявки от Zubite.
      </p>
    </div>
  )
}

function PerformanceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" data-testid="performance-loading">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl h-64" />
        <div className="bg-white border border-slate-200 rounded-2xl h-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl h-20" />
        ))}
      </div>
    </div>
  )
}
