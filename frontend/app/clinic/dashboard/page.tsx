'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BellRing, Hourglass, CalendarCheck2,
  CheckCheck, UserX, Timer, TimerReset, ChevronRight, Phone,
} from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import { WeeklyTrendChart, type TrendPoint } from '@/components/clinic/WeeklyTrendChart'
import { ClinicOrientationStatusCard } from '@/components/clinic/ClinicOrientationStatusCard'
import {
  statusBadge, timeSince, formatDuration, TREATMENT_LABELS,
} from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ActiveRequest {
  id: string
  patient_name: string
  patient_phone?: string | null
  treatment_interest?: string | null
  status: string
  urgency?: string | null
  created_at?: string | null
}

interface Overview {
  new_requests: number
  awaiting_action: number
  booked_this_month: number
  attended_this_month: number
  no_show_this_month: number
  avg_response_seconds: number | null
  avg_time_to_book_seconds: number | null
  weekly_trend?: TrendPoint[]
  top_active_requests?: ActiveRequest[]
}

export default function ClinicOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/clinic/dashboard-overview`, {
        credentials: 'include' as RequestCredentials,
      })
      if (r.ok) setData(await r.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <ClinicShell>
      <div className="space-y-6">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Преглед на клиниката
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Текущо състояние на заявките и резервациите ви.
            </p>
          </div>
          <Link
            href="/clinic/dashboard/requests"
            className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
            data-testid="clinic-overview-go-requests"
          >
            Към всички заявки <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        {loading ? (
          <DashboardSkeleton />
        ) : data ? (
          <>
            {/* HERO KPIs — 4 cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <HeroKpi
                testid="kpi-new"
                icon={<BellRing className="w-5 h-5" />}
                label="Нови / неназначени"
                value={data.new_requests}
                tone="sky"
                cta={data.new_requests > 0 ? 'Реагирай сега' : null}
              />
              <HeroKpi
                testid="kpi-awaiting"
                icon={<Hourglass className="w-5 h-5" />}
                label="Чакат действие"
                value={data.awaiting_action}
                tone="amber"
                cta={data.awaiting_action > 0 ? 'Прегледай заявките' : null}
              />
              <HeroKpi
                testid="kpi-booked"
                icon={<CalendarCheck2 className="w-5 h-5" />}
                label="Резервирани (месец)"
                value={data.booked_this_month}
                tone="emerald"
              />
              <HeroKpi
                testid="kpi-attended"
                icon={<CheckCheck className="w-5 h-5" />}
                label="Посетили (месец)"
                value={data.attended_this_month}
                tone="emerald"
              />
            </div>

            {/* Phase D — Online Orientation status (read-only) */}
            <ClinicOrientationStatusCard />

            {/* CHART + TOP REQUESTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <section
                className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5"
                data-testid="weekly-trend-section"
              >
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Седмична тенденция
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Последните 7 дни — нови заявки и резервации.
                    </p>
                  </div>
                </div>
                <WeeklyTrendChart data={data.weekly_trend || []} />
              </section>

              <section
                className="bg-white border border-slate-200 rounded-2xl p-5"
                data-testid="top-active-requests-section"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Активни заявки
                  </h2>
                  <Link
                    href="/clinic/dashboard/requests"
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium inline-flex items-center gap-0.5"
                    data-testid="top-requests-all-link"
                  >
                    Всички <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {(data.top_active_requests || []).length === 0 ? (
                  <div className="text-sm text-slate-400 py-6 text-center">
                    Няма активни заявки в момента.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(data.top_active_requests || []).map((r) => {
                      const sb = statusBadge(r.status)
                      const treatment = r.treatment_interest
                        ? TREATMENT_LABELS[r.treatment_interest] || r.treatment_interest
                        : null
                      return (
                        <li key={r.id}>
                          <Link
                            href={`/clinic/dashboard/requests/${r.id}`}
                            className="flex items-start justify-between gap-3 py-2.5 group hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                            data-testid={`top-request-${r.id}`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-slate-900 truncate group-hover:text-teal-700">
                                {r.patient_name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                                {r.patient_phone && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {r.patient_phone}
                                  </span>
                                )}
                                {treatment && <span>· {treatment}</span>}
                                <span>· {timeSince(r.created_at)}</span>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${sb.cls}`}>
                              {sb.label}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>

            {/* SECONDARY STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SecondaryStat
                testid="kpi-noshow"
                icon={<UserX className="w-4 h-4" />}
                label="Не се явили (месец)"
                value={data.no_show_this_month}
                tone="rose"
              />
              <SecondaryStat
                testid="kpi-avg-response"
                icon={<Timer className="w-4 h-4" />}
                label="Средно време до първо действие"
                value={formatDuration(data.avg_response_seconds)}
                tone="slate"
              />
              <SecondaryStat
                testid="kpi-avg-book"
                icon={<TimerReset className="w-4 h-4" />}
                label="Средно време до резервация"
                value={formatDuration(data.avg_time_to_book_seconds)}
                tone="slate"
              />
            </div>

            {/* TIPS */}
            <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 rounded-2xl p-5">
              <h2 className="font-medium text-slate-900 mb-2 text-sm">
                Какво да направя сега?
              </h2>
              <ol className="text-sm text-slate-600 space-y-1.5 list-decimal list-inside">
                <li>
                  Отворете секция{' '}
                  <Link href="/clinic/dashboard/requests" className="text-teal-700 underline">
                    Заявки
                  </Link>{' '}
                  и реагирайте на новите.
                </li>
                <li>
                  Резервирайте консултация → ще се появи автоматично в{' '}
                  <Link href="/clinic/dashboard/calendar" className="text-teal-700 underline">
                    Календара
                  </Link>
                  .
                </li>
                <li>Маркирайте посещенията след срещата за точна статистика.</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="text-slate-400">Няма данни.</div>
        )}
      </div>
    </ClinicShell>
  )
}

/* ---------------- subcomponents ---------------- */

type Tone = 'sky' | 'amber' | 'emerald' | 'rose' | 'slate'

const TONE_BG: Record<Tone, string> = {
  sky: 'bg-teal-50 text-teal-700 ring-teal-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-50 text-slate-600 ring-slate-100',
}

function HeroKpi({
  icon, label, value, tone, testid, cta,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone: Tone
  testid: string
  cta?: string | null
}) {
  const numeric = typeof value === 'number'
  const emphasized = numeric && (value as number) > 0
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full"
      data-testid={testid}
    >
      <div className={`w-10 h-10 rounded-lg grid place-items-center mb-3 ring-1 ${TONE_BG[tone]}`}>
        {icon}
      </div>
      <div
        className={`text-3xl font-semibold tracking-tight ${
          emphasized ? 'text-slate-900' : 'text-slate-400'
        }`}
      >
        {value}
      </div>
      <div className="text-sm text-slate-500 mt-1 leading-snug">{label}</div>
      {cta && (
        <Link
          href="/clinic/dashboard/requests"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          {cta} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

function SecondaryStat({
  icon, label, value, tone, testid,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone: Tone
  testid: string
}) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3"
      data-testid={testid}
    >
      <div className={`w-9 h-9 rounded-lg grid place-items-center ring-1 ${TONE_BG[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 truncate">{label}</div>
        <div className="text-lg font-semibold text-slate-900 leading-tight">{value}</div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl h-64" />
        <div className="bg-white border border-slate-200 rounded-2xl h-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl h-16" />
        ))}
      </div>
    </div>
  )
}
