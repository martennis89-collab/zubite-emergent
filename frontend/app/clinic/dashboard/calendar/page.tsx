'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Calendar as CalIcon, Filter } from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import {
  Appointment, formatDate, formatDateOnly,
  APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPES,
} from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

const STATUS_OPTS = [
  { value: '', label: 'Всички статуси' },
  { value: 'booked', label: 'Резервирани' },
  { value: 'confirmed', label: 'Потвърдени' },
  { value: 'rescheduled', label: 'Преместени' },
  { value: 'attended', label: 'Посетили' },
  { value: 'no_show', label: 'Не се явили' },
  { value: 'cancelled', label: 'Отменени' },
]

const STATUS_BADGE: Record<string, string> = {
  booked: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  rescheduled: 'bg-amber-100 text-amber-800',
  attended: 'bg-emerald-100 text-emerald-700',
  no_show: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

export default function ClinicCalendarPage() {
  const [appts, setAppts] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/clinic/appointments`, {
      credentials: 'include' as RequestCredentials,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAppts(d.appointments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const filtered = appts.filter((a) =>
      (!statusFilter || a.status === statusFilter) &&
      (!typeFilter || a.appointment_type === typeFilter)
    )
    const buckets = new Map<string, Appointment[]>()
    for (const a of filtered) {
      const key = (a.start_time || '').slice(0, 10) || '—'
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(a)
    }
    return [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)) as Array<[string, Appointment[]]>
  }, [appts, statusFilter, typeFilter])

  return (
    <ClinicShell>
      <div className="space-y-5">
        <header>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Календар
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Резервираните консултации в Zubite календара на клиниката ви.
          </p>
        </header>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            data-testid="calendar-filter-status"
          >
            {STATUS_OPTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            data-testid="calendar-filter-type"
          >
            <option value="">Всички типове</option>
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="h-40 grid place-items-center text-slate-400">Зареждане…</div>
        ) : grouped.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400" data-testid="calendar-empty">
            Няма резервирани консултации.
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([day, items]) => (
              <section key={day} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <header className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <CalIcon className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700 text-sm">
                    {formatDateOnly(day)}
                  </span>
                  <span className="text-xs text-slate-400">({items.length})</span>
                </header>
                <ul className="divide-y divide-slate-100" data-testid={`calendar-day-${day}`}>
                  {items.map((a) => (
                    <li key={a.id} className="px-4 py-3 flex items-center gap-4 flex-wrap" data-testid={`calendar-appt-${a.id}`}>
                      <div className="text-sm font-mono text-slate-900 w-28 flex-shrink-0">
                        {new Date(a.start_time).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {new Date(a.end_time).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900">{a.patient_name}</div>
                        <div className="text-xs text-slate-500">
                          {APPOINTMENT_TYPE_LABELS[a.appointment_type] || a.appointment_type}
                          {a.patient_phone && ` · ${a.patient_phone}`}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[a.status] || 'bg-slate-100 text-slate-600'}`}>
                        {a.status}
                      </span>
                      {a.consultation_request_id && (
                        <Link
                          href={`/clinic/dashboard/requests/${a.consultation_request_id}`}
                          className="text-sm text-sky-600 hover:text-sky-700 font-medium"
                        >
                          Заявка
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </ClinicShell>
  )
}
