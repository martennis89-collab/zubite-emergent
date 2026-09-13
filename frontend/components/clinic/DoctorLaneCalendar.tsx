'use client'

/**
 * Clinic Dashboard · Calendar "by doctor" view (Phase 4 of the
 * multi-doctor booking system).
 *
 * Same hour-grid mechanics as WeekCalendar, but columns are doctors for
 * a single selected day instead of the 7 days of a week — a day×doctor
 * matrix would be unreadably wide once a clinic has more than 2-3
 * doctors, so this trades week-at-a-glance for doctor-at-a-glance.
 * Reuses WeekCalendar's AppointmentBlock so status colors, the
 * online/physical badge, and link routing stay identical between views.
 */

import { useMemo } from 'react'
import { Appointment, doctorColor, isSameLocalDay } from '@/lib/consultationLabels'
import { AppointmentBlock, HOUR_START, HOUR_END, ROW_HEIGHT, TOTAL_HEIGHT } from './WeekCalendar'

interface Doctor {
  id: string
  name: string
  active: boolean
}

interface Props {
  appointments: Appointment[]
  doctors: Doctor[]
  day: Date
}

const UNASSIGNED_COL = '__unassigned__'

export function DoctorLaneCalendar({ appointments, doctors, day }: Props) {
  const dayAppts = useMemo(
    () => appointments.filter((a) => isSameLocalDay(new Date(a.start_time), day)),
    [appointments, day],
  )

  const activeDoctors = useMemo(
    () => doctors.filter((d) => d.active).sort((a, b) => a.name.localeCompare(b.name)),
    [doctors],
  )

  const lanes = useMemo(
    () => [{ id: UNASSIGNED_COL, name: 'Неразпределени' }, ...activeDoctors],
    [activeDoctors],
  )

  if (activeDoctors.length === 0) {
    return (
      <div
        className="bg-white border border-slate-200 rounded-2xl p-10 text-center"
        data-testid="doctor-lane-empty-no-doctors"
      >
        <div className="text-base font-medium text-slate-700">Няма добавени лекари</div>
        <p className="mt-1 text-sm text-slate-500">
          Добавете лекари в раздел „Лекари“, за да виждате календара разпределен по лекар.
        </p>
      </div>
    )
  }

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
      data-testid="doctor-lane-calendar"
    >
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${56 + lanes.length * 160}px` }}>
          {/* Header row: doctor names with a color dot each */}
          <div
            className="grid border-b border-slate-200 bg-slate-50"
            style={{ gridTemplateColumns: `56px repeat(${lanes.length}, minmax(160px, 1fr))` }}
          >
            <div className="px-2 py-2 text-[11px] text-slate-400 uppercase tracking-wide">
              Час
            </div>
            {lanes.map((lane) => {
              const color = lane.id === UNASSIGNED_COL ? null : doctorColor(lane.id)
              return (
                <div
                  key={lane.id}
                  className="px-2 py-2 text-center border-l border-slate-200"
                  data-testid={`doctor-lane-header-${lane.id}`}
                >
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    {color ? (
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                    <span className="truncate">{lane.name}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grid body */}
          <div
            className="grid relative"
            style={{ gridTemplateColumns: `56px repeat(${lanes.length}, minmax(160px, 1fr))`, height: TOTAL_HEIGHT }}
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

            {/* Doctor columns */}
            {lanes.map((lane) => {
              const color = lane.id === UNASSIGNED_COL ? null : doctorColor(lane.id)
              const laneAppts = dayAppts.filter((a) =>
                lane.id === UNASSIGNED_COL ? !a.doctor_id : a.doctor_id === lane.id,
              )
              return (
                <div
                  key={lane.id}
                  className="relative border-l border-slate-200"
                  data-testid={`doctor-lane-col-${lane.id}`}
                >
                  {Array.from({ length: HOUR_END - HOUR_START }, (_, h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: (h + 1) * ROW_HEIGHT }}
                    />
                  ))}
                  {laneAppts.map((a) => (
                    <AppointmentBlock key={a.id} a={a} accentDot={color?.dot} />
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
