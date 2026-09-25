'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Calendar as CalIcon, Filter, ChevronLeft, ChevronRight,
  LayoutGrid, List, Users, AlertCircle,
} from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import { WeekCalendar } from '@/components/clinic/WeekCalendar'
import { DoctorLaneCalendar } from '@/components/clinic/DoctorLaneCalendar'
import {
  Appointment, formatDateOnly, apptStatusLabel,
  APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPES, APPT_STATUS_LABELS, APPT_STATUS_TONES,
  getMondayOfWeek, addDays, formatWeekRange, isSameLocalDay,
} from '@/lib/consultationLabels'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Doctor {
  id: string
  name: string
  active: boolean
}

const STATUS_OPTS = [
  { value: '', label: 'Всички статуси' },
  { value: 'booked', label: 'Резервирани' },
  { value: 'confirmed', label: 'Потвърдени' },
  { value: 'rescheduled', label: 'Преместени' },
  { value: 'attended', label: 'Посетили' },
  { value: 'no_show', label: 'Не се явили' },
  { value: 'cancelled', label: 'Отменени' },
]

const STATUS_BADGE = APPT_STATUS_TONES

type View = 'week' | 'list' | 'doctors'

export default function ClinicCalendarPage() {
  const [appts, setAppts] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [view, setView] = useState<View>('week')
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())

  useEffect(() => {
    fetch(`${API_URL}/api/clinic/doctors`, { credentials: 'include' as RequestCredentials })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDoctors(d.doctors || []) })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_URL}/api/clinic/appointments`, {
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
      setAppts(d.appointments || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Възникна грешка при зареждане')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Apply user filters first, used by both views.
  const filtered = useMemo(() => {
    return appts.filter((a) =>
      (!statusFilter || a.status === statusFilter) &&
      (!typeFilter || a.appointment_type === typeFilter),
    )
  }, [appts, statusFilter, typeFilter])

  // List view grouping: by start-date key, oldest first.
  // Use Array.from(map.entries()) to avoid the TS2802 MapIterator issue.
  const grouped = useMemo<Array<[string, Appointment[]]>>(() => {
    const buckets = new Map<string, Appointment[]>()
    for (const a of filtered) {
      const key = (a.start_time || '').slice(0, 10) || '—'
      const arr = buckets.get(key)
      if (arr) {
        arr.push(a)
      } else {
        buckets.set(key, [a])
      }
    }
    const entries: Array<[string, Appointment[]]> = Array.from(buckets.entries())
    entries.sort((x, y) => (x[0] < y[0] ? -1 : 1))
    // Order appointments inside each day by start_time asc.
    for (const [, items] of entries) {
      items.sort((m, n) => (m.start_time < n.start_time ? -1 : 1))
    }
    return entries
  }, [filtered])

  const weekRangeLabel = formatWeekRange(weekStart)
  const isCurrentWeekShown = isSameLocalDay(weekStart, getMondayOfWeek(new Date()))

  const goPrev = () => setWeekStart((d) => addDays(d, -7))
  const goNext = () => setWeekStart((d) => addDays(d, 7))
  const goToday = () => setWeekStart(getMondayOfWeek(new Date()))

  // For the week view we filter to appointments inside the displayed week,
  // applied before counting "empty week".
  const weekEnd = addDays(weekStart, 7)
  const inDisplayedWeek = useMemo(
    () =>
      filtered.filter((a) => {
        const t = new Date(a.start_time)
        return !Number.isNaN(+t) && t >= weekStart && t < weekEnd
      }),
    [filtered, weekStart, weekEnd],
  )

  return (
    <ClinicShell>
      <div className="space-y-4">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Календар
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Резервираните консултации в Zubite календара на клиниката ви.
            </p>
          </div>

          {/* View toggle */}
          <div
            className="inline-flex bg-slate-100 rounded-lg p-1"
            role="tablist"
            aria-label="Изглед на календара"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'week'}
              onClick={() => setView('week')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'week'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="calendar-view-week"
            >
              <LayoutGrid className="w-4 h-4" /> Седмица
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="calendar-view-list"
            >
              <List className="w-4 h-4" /> Списък
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'doctors'}
              onClick={() => setView('doctors')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'doctors'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="calendar-view-doctors"
            >
              <Users className="w-4 h-4" /> По лекар
            </button>
          </div>
        </header>

        {/* Toolbar: filters + (week navigation when in week view) */}
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

          {view === 'week' && (
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={goPrev}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
                aria-label="Предишна седмица"
                data-testid="calendar-prev-week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span
                className="text-sm font-medium text-slate-900 min-w-[160px] text-center"
                data-testid="calendar-week-range"
              >
                {weekRangeLabel}
              </span>
              <button
                type="button"
                onClick={goNext}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
                aria-label="Следваща седмица"
                data-testid="calendar-next-week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                disabled={isCurrentWeekShown}
                className={`text-sm font-medium px-3 py-1.5 rounded-md border ${
                  isCurrentWeekShown
                    ? 'text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'text-teal-700 border-teal-200 hover:bg-teal-50'
                }`}
                data-testid="calendar-today-btn"
              >
                Днес
              </button>
            </div>
          )}

          {view === 'doctors' && (
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedDay((d) => addDays(d, -1))}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
                aria-label="Предишен ден"
                data-testid="calendar-prev-day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span
                className="text-sm font-medium text-slate-900 min-w-[160px] text-center"
                data-testid="calendar-day-label"
              >
                {formatDateOnly(selectedDay.toISOString())}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDay((d) => addDays(d, 1))}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
                aria-label="Следващ ден"
                data-testid="calendar-next-day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDay(new Date())}
                disabled={isSameLocalDay(selectedDay, new Date())}
                className={`text-sm font-medium px-3 py-1.5 rounded-md border ${
                  isSameLocalDay(selectedDay, new Date())
                    ? 'text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'text-teal-700 border-teal-200 hover:bg-teal-50'
                }`}
                data-testid="calendar-today-day-btn"
              >
                Днес
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <CalendarSkeleton view={view} />
        ) : error ? (
          <div
            className="bg-white border border-rose-200 rounded-xl p-6 flex items-start gap-3"
            data-testid="calendar-error"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-rose-900">
                Възникна грешка при зареждане
              </div>
              <p className="text-sm text-rose-700 mt-0.5">
                {error}. Опитайте отново или ни пишете на{' '}
                <a href="mailto:support@zubite.bg" className="underline">
                  support@zubite.bg
                </a>
                .
              </p>
              <button
                type="button"
                onClick={load}
                className="mt-2 text-sm font-medium text-rose-700 hover:text-rose-800 underline"
                data-testid="calendar-retry-btn"
              >
                Опитай отново
              </button>
            </div>
          </div>
        ) : view === 'week' ? (
          inDisplayedWeek.length === 0 ? (
            <EmptyState
              testid="calendar-week-empty"
              title="Няма консултации тази седмица"
              body="Когато резервирате консултация от страница на заявка, тя ще се появи тук."
            />
          ) : (
            <WeekCalendar appointments={inDisplayedWeek} weekStart={weekStart} />
          )
        ) : view === 'doctors' ? (
          <DoctorLaneCalendar appointments={filtered} doctors={doctors} day={selectedDay} />
        ) : grouped.length === 0 ? (
          <EmptyState
            testid="calendar-list-empty"
            title="Няма резервирани консултации"
            body="Когато резервирате консултация от страница на заявка, тя ще се появи тук."
          />
        ) : (
          <div className="space-y-4">
            {grouped.map(([day, items]) => (
              <section
                key={day}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <header className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <CalIcon className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700 text-sm">
                    {formatDateOnly(day)}
                  </span>
                  <span className="text-xs text-slate-400">({items.length})</span>
                </header>
                <ul
                  className="divide-y divide-slate-100"
                  data-testid={`calendar-day-${day}`}
                >
                  {items.map((a) => {
                    const statusLabel =
                      APPT_STATUS_LABELS[a.status] || apptStatusLabel(a.status)
                    return (
                      <li
                        key={a.id}
                        className="px-4 py-3 flex items-center gap-4 flex-wrap"
                        data-testid={`calendar-appt-${a.id}`}
                      >
                        <div className="text-sm font-mono text-slate-900 w-28 flex-shrink-0">
                          {new Date(a.start_time).toLocaleTimeString('bg-BG', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                          {' – '}
                          {new Date(a.end_time).toLocaleTimeString('bg-BG', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900">
                            {a.patient_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {APPOINTMENT_TYPE_LABELS[a.appointment_type] || a.appointment_type}
                            {a.patient_phone && ` · ${a.patient_phone}`}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            STATUS_BADGE[a.status] || 'bg-slate-100 text-slate-600'
                          }`}
                          data-testid={`calendar-appt-${a.id}-status`}
                        >
                          {statusLabel}
                        </span>
                        {a.consultation_request_id && (
                          <Link
                            href={`/clinic/dashboard/requests/${a.consultation_request_id}`}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                          >
                            Заявка
                          </Link>
                        )}
                        {a.online_orientation_booking_id && (
                          <Link
                            href="/clinic/dashboard/online-orientation"
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                          >
                            Потвърди / откажи
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </ClinicShell>
  )
}

function EmptyState({
  title, body, testid,
}: { title: string; body: string; testid: string }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-10 text-center"
      data-testid={testid}
    >
      <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-teal-50 text-teal-600 mb-3">
        <CalIcon className="w-5 h-5" />
      </div>
      <div className="text-base font-medium text-slate-700">{title}</div>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
      <p className="mt-2 text-sm text-slate-500">
        Заявките за час от пациенти се управляват отделно в{' '}
        <Link href="/clinic/dashboard/bookings" className="text-teal-600 hover:text-teal-700 font-medium underline">
          „Заявки за час“
        </Link>
        .
      </p>
    </div>
  )
}

function CalendarSkeleton({ view }: { view: View }) {
  if (view === 'week') {
    return (
      <div
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse"
        data-testid="calendar-loading"
      >
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-12 border-l border-slate-200 first:border-l-0" />
          ))}
        </div>
        <div className="h-[560px]" />
      </div>
    )
  }
  return (
    <div className="space-y-3 animate-pulse" data-testid="calendar-loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl h-28" />
      ))}
    </div>
  )
}
