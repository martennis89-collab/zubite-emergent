'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Appointment, APPOINTMENT_TYPE_LABELS, apptStatusLabel,
  WEEKDAY_NAMES_SHORT_BG, addDays, isSameLocalDay,
} from '@/lib/consultationLabels'

const HOUR_START = 8       // 08:00
const HOUR_END = 20        // 20:00
const ROW_HEIGHT = 56      // px per hour
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * ROW_HEIGHT

const STATUS_BLOCK_CLS: Record<string, string> = {
  booked: 'bg-sky-50 border-sky-300 text-sky-900',
  confirmed: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  rescheduled: 'bg-amber-50 border-amber-300 text-amber-900',
  attended: 'bg-emerald-50 border-emerald-400 text-emerald-900',
  no_show: 'bg-rose-50 border-rose-300 text-rose-900',
  cancelled: 'bg-slate-50 border-slate-300 text-slate-500 line-through opacity-70',
  completed: 'bg-emerald-50 border-emerald-400 text-emerald-900',
}

const STATUS_BADGE_CLS: Record<string, string> = {
  booked: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  rescheduled: 'bg-amber-100 text-amber-800',
  attended: 'bg-emerald-100 text-emerald-700',
  no_show: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-200 text-slate-500',
  completed: 'bg-emerald-100 text-emerald-700',
}

function fmtHHMM(d: Date): string {
  return d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  appointments: Appointment[]
  weekStart: Date            // Monday 00:00 local
}

export function WeekCalendar({ appointments, weekStart }: Props) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])

  // Filter to appointments whose start lands within the week.
  const inWeek = useMemo(() => {
    return appointments.filter((a) => {
      const t = new Date(a.start_time)
      return !Number.isNaN(+t) && t >= weekStart && t < weekEnd
    })
  }, [appointments, weekStart, weekEnd])

  // Live-updated "now" cursor for the today-line; ticks every minute.
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
      data-testid="week-calendar"
    >
      {/* Horizontal scroll wrapper for narrow screens; min-width keeps the grid usable */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Header row: weekday labels */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
            <div className="px-2 py-2 text-[11px] text-slate-400 uppercase tracking-wide">
              Час
            </div>
            {days.map((d, i) => {
              const isToday = isSameLocalDay(d, now)
              return (
                <div
                  key={i}
                  className={`px-2 py-2 text-center border-l border-slate-200 ${
                    isToday ? 'bg-sky-50' : ''
                  }`}
                  data-testid={`week-col-header-${i}`}
                >
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    {WEEKDAY_NAMES_SHORT_BG[i]}
                  </div>
                  <div
                    className={`text-sm font-semibold mt-0.5 ${
                      isToday
                        ? 'text-sky-700 inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-600 text-white mx-auto'
                        : 'text-slate-900'
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grid body */}
          <div
            className="grid grid-cols-[56px_repeat(7,1fr)] relative"
            style={{ height: TOTAL_HEIGHT }}
          >
            {/* Time axis column */}
            <div className="relative border-r border-slate-200">
              {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, h) => {
                const hr = HOUR_START + h
                return (
                  <div
                    key={hr}
                    className="absolute left-0 right-0 text-[11px] text-slate-400 pr-1 text-right"
                    style={{ top: h * ROW_HEIGHT - 6 }}
                  >
                    {String(hr).padStart(2, '0')}:00
                  </div>
                )
              })}
            </div>

            {/* Day columns */}
            {days.map((d, i) => {
              const isToday = isSameLocalDay(d, now)
              const dayAppts = inWeek.filter((a) =>
                isSameLocalDay(new Date(a.start_time), d),
              )
              return (
                <div
                  key={i}
                  className={`relative border-l border-slate-200 ${
                    isToday ? 'bg-sky-50/40' : ''
                  }`}
                  data-testid={`week-col-${i}`}
                >
                  {/* Hour gridlines */}
                  {Array.from({ length: HOUR_END - HOUR_START }, (_, h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: (h + 1) * ROW_HEIGHT }}
                    />
                  ))}

                  {/* Current-time line — only on today */}
                  {isToday && (() => {
                    const hr = now.getHours() + now.getMinutes() / 60
                    if (hr < HOUR_START || hr > HOUR_END) return null
                    const top = (hr - HOUR_START) * ROW_HEIGHT
                    return (
                      <div
                        className="absolute left-0 right-0 z-10 pointer-events-none"
                        style={{ top }}
                        data-testid="now-line"
                      >
                        <div className="h-px bg-rose-500" />
                        <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-rose-500" />
                      </div>
                    )
                  })()}

                  {/* Appointment blocks */}
                  {dayAppts.map((a) => (
                    <AppointmentBlock key={a.id} a={a} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function AppointmentBlock({ a }: { a: Appointment }) {
  const start = new Date(a.start_time)
  const end = new Date(a.end_time)
  const startHr = start.getHours() + start.getMinutes() / 60
  const endHr = end.getHours() + end.getMinutes() / 60

  // Clip into visible 08:00-20:00 range.
  const clampedStart = Math.max(HOUR_START, startHr)
  const clampedEnd = Math.min(HOUR_END, Math.max(endHr, startHr + 0.5)) // min 30min visible

  // Skip blocks fully outside visible range.
  if (clampedEnd <= HOUR_START || clampedStart >= HOUR_END) return null

  const top = (clampedStart - HOUR_START) * ROW_HEIGHT
  const height = Math.max(28, (clampedEnd - clampedStart) * ROW_HEIGHT)

  const blockCls =
    STATUS_BLOCK_CLS[a.status] || 'bg-slate-50 border-slate-300 text-slate-800'
  const badgeCls =
    STATUS_BADGE_CLS[a.status] || 'bg-slate-100 text-slate-600'
  const typeLabel = APPOINTMENT_TYPE_LABELS[a.appointment_type] || a.appointment_type

  const inner = (
    <div
      className={`absolute left-1 right-1 rounded-md border ${blockCls} px-1.5 py-1 text-[11px] leading-tight overflow-hidden shadow-sm hover:shadow transition-shadow`}
      style={{ top, height }}
      data-testid={`week-appt-${a.id}`}
      title={`${a.patient_name} · ${typeLabel} · ${fmtHHMM(start)}–${fmtHHMM(end)} · ${apptStatusLabel(a.status)}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] text-slate-600 flex-shrink-0">
          {fmtHHMM(start)}
        </span>
        <span className={`text-[9px] px-1 rounded ${badgeCls} flex-shrink-0`}>
          {apptStatusLabel(a.status)}
        </span>
      </div>
      <div className="font-medium truncate mt-0.5">{a.patient_name}</div>
      {typeLabel && (
        <div className="text-[10px] text-slate-600 truncate">{typeLabel}</div>
      )}
    </div>
  )

  if (a.consultation_request_id) {
    return (
      <Link
        href={`/clinic/dashboard/requests/${a.consultation_request_id}`}
        className="block"
      >
        {inner}
      </Link>
    )
  }
  return inner
}
