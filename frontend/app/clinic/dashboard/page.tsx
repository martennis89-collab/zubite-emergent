'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BellRing, Hourglass, CalendarCheck2,
  CheckCheck, UserX, Timer, TimerReset,
} from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Overview {
  new_requests: number
  awaiting_action: number
  booked_this_month: number
  attended_this_month: number
  no_show_this_month: number
  avg_response_seconds: number | null
  avg_time_to_book_seconds: number | null
}

function formatDuration(secs: number | null): string {
  if (secs == null) return '—'
  if (secs < 60) return `${Math.round(secs)} сек`
  if (secs < 3600) return `${Math.round(secs / 60)} мин`
  if (secs < 86400) return `${(secs / 3600).toFixed(1)} ч`
  return `${(secs / 86400).toFixed(1)} дни`
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
            className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium"
            data-testid="clinic-overview-go-requests"
          >
            Към всички заявки <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Зареждане…</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard
                testid="kpi-new"
                icon={<BellRing className="w-5 h-5" />}
                label="Нови / неназначени"
                value={data.new_requests}
                color="sky"
              />
              <KpiCard
                testid="kpi-awaiting"
                icon={<Hourglass className="w-5 h-5" />}
                label="Чакат действие"
                value={data.awaiting_action}
                color="amber"
              />
              <KpiCard
                testid="kpi-booked"
                icon={<CalendarCheck2 className="w-5 h-5" />}
                label="Резервирани (месец)"
                value={data.booked_this_month}
                color="emerald"
              />
              <KpiCard
                testid="kpi-attended"
                icon={<CheckCheck className="w-5 h-5" />}
                label="Посетили (месец)"
                value={data.attended_this_month}
                color="emerald"
              />
              <KpiCard
                testid="kpi-noshow"
                icon={<UserX className="w-5 h-5" />}
                label="Не се явили (месец)"
                value={data.no_show_this_month}
                color="rose"
              />
              <KpiCard
                testid="kpi-avg-response"
                icon={<Timer className="w-5 h-5" />}
                label="Средно време до първо действие"
                value={formatDuration(data.avg_response_seconds)}
                color="slate"
              />
              <KpiCard
                testid="kpi-avg-book"
                icon={<TimerReset className="w-5 h-5" />}
                label="Средно време до резервация"
                value={formatDuration(data.avg_time_to_book_seconds)}
                color="slate"
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-medium text-slate-900 mb-2">Какво да направя сега?</h2>
              <ol className="text-sm text-slate-600 space-y-1.5 list-decimal list-inside">
                <li>Отворете секция <Link href="/clinic/dashboard/requests" className="text-sky-600 underline">Заявки</Link> и реагирайте на новите.</li>
                <li>Резервирайте консултация → ще се появи автоматично в <Link href="/clinic/dashboard/calendar" className="text-sky-600 underline">Календара</Link>.</li>
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

function KpiCard({
  icon, label, value, color, testid,
}: {
  icon: React.ReactNode; label: string; value: string | number; color: string; testid: string
}) {
  const palette: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-600 ring-sky-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    slate: 'bg-slate-50 text-slate-600 ring-slate-100',
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5" data-testid={testid}>
      <div className={`w-10 h-10 rounded-lg grid place-items-center mb-3 ring-1 ${palette[color] || palette.slate}`}>
        {icon}
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}
