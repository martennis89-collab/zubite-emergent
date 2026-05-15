'use client'

import { useEffect, useState } from 'react'
import { ClinicShell } from '@/components/ClinicShell'
import { formatDuration } from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Performance {
  total_assigned: number
  viewed: number
  contact_attempted: number
  contacted: number
  booked: number
  attended: number
  no_show: number
  avg_time_to_first_action_seconds: number | null
  avg_time_to_book_seconds: number | null
  booking_conversion_rate: number
  attendance_rate: number
}

export default function ClinicPerformancePage() {
  const [data, setData] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/clinic/performance`, {
      credentials: 'include' as RequestCredentials,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <ClinicShell>
      <div className="space-y-5">
        <header>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Резултати на клиниката
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Базови индикатори за времето на реакция и процент на резервациите.
          </p>
        </header>
        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Зареждане…</div>
        ) : !data ? (
          <div className="text-slate-400">Няма данни.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat testid="perf-total" label="Общо назначени заявки" value={data.total_assigned} />
              <Stat testid="perf-viewed" label="Прегледани" value={data.viewed} />
              <Stat testid="perf-contact" label="Опит за контакт" value={data.contact_attempted} />
              <Stat testid="perf-contacted" label="Свързани с пациента" value={data.contacted} />
              <Stat testid="perf-booked" label="Резервирани" value={data.booked} />
              <Stat testid="perf-attended" label="Посетили" value={data.attended} />
              <Stat testid="perf-noshow" label="Не се явили" value={data.no_show} />
              <Stat
                testid="perf-conversion"
                label="Процент резервации"
                value={`${data.booking_conversion_rate}%`}
                hint="резервирани / назначени"
              />
              <Stat
                testid="perf-attendance"
                label="Процент явяване"
                value={`${data.attendance_rate}%`}
                hint="посетили / резервирани"
              />
              <Stat
                testid="perf-avg-action"
                label="Средно време до първо действие"
                value={formatDuration(data.avg_time_to_first_action_seconds)}
              />
              <Stat
                testid="perf-avg-book"
                label="Средно време до резервация"
                value={formatDuration(data.avg_time_to_book_seconds)}
              />
            </div>
            <div className="text-xs text-slate-400">
              Времената се изчисляват от момента, в който заявката е назначена към клиниката.
            </div>
          </>
        )}
      </div>
    </ClinicShell>
  )
}

function Stat({
  label, value, hint, testid,
}: { label: string; value: string | number; hint?: string; testid: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5" data-testid={testid}>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  )
}
