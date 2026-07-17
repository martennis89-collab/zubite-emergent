'use client'

/**
 * Patient-facing availability calendar for the free online orientation.
 *
 * Days the doctor is available are green and clickable; picking one
 * reveals that day's times. It replaced a flat chip list that showed the
 * first 8 slots with a "+N още" counter and no way to reach the rest.
 *
 * Dates come from `scheduled_at_local` (already Europe/Sofia, e.g.
 * "2026-07-17T09:00:00+03:00"), and every date here is derived by slicing
 * that string rather than constructing a Date from the ISO instant — a
 * patient in another timezone must still see the clinic's Sofia days, and
 * `new Date(...)` would silently shift them.
 */

import { useMemo, useState } from 'react'

/** The minimum a slot must carry to be placed on the calendar. Callers
 *  keep their own richer type — the component is generic so `onPick`
 *  hands back exactly what was passed in. */
export interface CalendarSlot {
  slot_id: string
  scheduled_at: string
  scheduled_at_local: string
}

const WEEKDAY_HEADS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

const MONTHS_BG = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
]

/** "2026-07-17T09:00:00+03:00" → "2026-07-17" (the Sofia calendar day). */
function localDay(slot: CalendarSlot): string {
  return slot.scheduled_at_local.slice(0, 10)
}

/** "2026-07-17T09:00:00+03:00" → "09:00". */
function localTime(slot: CalendarSlot): string {
  return slot.scheduled_at_local.slice(11, 16)
}

/** Parse as UTC midnight so grid maths never crosses a DST boundary. */
function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function dateToYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Monday-first column index (JS getUTCDay is Sunday-first). */
function mondayIndex(d: Date): number {
  return (d.getUTCDay() + 6) % 7
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000)
}

/**
 * Week-aligned day grid spanning the slots we actually have.
 *
 * The range is derived from the slots rather than from "today" so the
 * calendar never depends on the viewer's clock or timezone.
 */
function buildGrid(days: string[]): string[] {
  if (days.length === 0) return []
  const sorted = [...days].sort()
  const first = ymdToDate(sorted[0])
  const last = ymdToDate(sorted[sorted.length - 1])
  const start = addDays(first, -mondayIndex(first))
  const end = addDays(last, 6 - mondayIndex(last))
  const out: string[] = []
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) out.push(dateToYmd(cur))
  return out
}

function monthLabel(ymd: string): string {
  const d = ymdToDate(ymd)
  return `${MONTHS_BG[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function OrientationCalendar<T extends CalendarSlot>({
  slots,
  onPick,
  testIdPrefix,
}: {
  slots: T[]
  onPick: (slot: T) => void
  testIdPrefix: string
}) {
  const byDay = useMemo(() => {
    const m = new Map<string, T[]>()
    for (const s of slots) {
      const k = localDay(s)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(s)
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    }
    return m
  }, [slots])

  const availableDays = useMemo(() => [...byDay.keys()].sort(), [byDay])
  const grid = useMemo(() => buildGrid(availableDays), [availableDays])
  const [selected, setSelected] = useState<string | null>(availableDays[0] ?? null)

  if (availableDays.length === 0) return null

  // The horizon can straddle a month boundary; name both rather than
  // mislabel half the grid.
  const months = [...new Set(grid.map(monthLabel))]
  const selectedSlots = selected ? byDay.get(selected) ?? [] : []

  return (
    <div className="mt-3 space-y-3" data-testid={`${testIdPrefix}-calendar`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{months.join(' – ')}</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span
            aria-hidden="true"
            className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"
          />
          Свободни дни
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Свободни дни за онлайн ориентация">
        {WEEKDAY_HEADS.map((w) => (
          <div key={w} className="text-center text-[11px] text-slate-400 pb-1" role="columnheader">
            {w}
          </div>
        ))}

        {grid.map((ymd) => {
          const count = byDay.get(ymd)?.length ?? 0
          const isAvailable = count > 0
          const isSelected = selected === ymd
          const dayNum = ymdToDate(ymd).getUTCDate()

          if (!isAvailable) {
            return (
              <div
                key={ymd}
                role="gridcell"
                aria-disabled="true"
                className="h-9 flex items-center justify-center text-xs text-slate-300 tabular-nums"
                data-testid={`${testIdPrefix}-day-empty-${ymd}`}
              >
                {dayNum}
              </div>
            )
          }

          return (
            <button
              key={ymd}
              type="button"
              role="gridcell"
              onClick={() => setSelected(ymd)}
              aria-pressed={isSelected}
              aria-label={`${dayNum} ${monthLabel(ymd)} — ${count} свободни часа`}
              className={`h-9 rounded-lg text-xs font-medium tabular-nums transition-colors ${
                isSelected
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-1'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
              data-testid={`${testIdPrefix}-day-${ymd}`}
            >
              {dayNum}
            </button>
          )
        })}
      </div>

      {selected && (
        <div data-testid={`${testIdPrefix}-times-${selected}`}>
          <p className="text-xs text-slate-500 mb-1.5">
            Свободни часове на {ymdToDate(selected).getUTCDate()} {monthLabel(selected)}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedSlots.map((s) => (
              <button
                key={s.slot_id}
                type="button"
                onClick={() => onPick(s)}
                className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs tabular-nums hover:bg-teal-100"
                data-testid={`${testIdPrefix}-slot-${s.slot_id}`}
              >
                {localTime(s)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
