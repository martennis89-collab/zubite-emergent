'use client'

/**
 * Clinic Dashboard · Online Orientation availability.
 *
 * The clinic sets the weekly windows in which it will take free online
 * orientation calls. Slots themselves are generated server-side from
 * these windows (`orientation_slots.generate_slots_for_clinic`) using the
 * duration / buffer / daily-cap the admin configures — so this screen
 * deliberately edits windows only, never individual slots.
 *
 * Everything commercial (whether orientation is on at all, the free-slot
 * allowance) stays admin-owned; when it is off, this renders read-only
 * rather than hiding, so the clinic can still see what it had set up.
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, Info } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

const DAYS: { value: string; label: string }[] = [
  { value: 'monday', label: 'Понеделник' },
  { value: 'tuesday', label: 'Вторник' },
  { value: 'wednesday', label: 'Сряда' },
  { value: 'thursday', label: 'Четвъртък' },
  { value: 'friday', label: 'Петък' },
  { value: 'saturday', label: 'Събота' },
  { value: 'sunday', label: 'Неделя' },
]

interface AvailabilityWindow {
  id: string
  day_of_week: string
  start_time: string
  end_time: string
  is_active: boolean
}

interface Payload {
  availability: AvailabilityWindow[]
  can_edit: boolean
  access_status: string
  slot_duration_minutes: number | null
}

/** Why the clinic can't edit right now, in their own words. */
const ACCESS_NOTE_BG: Record<string, string> = {
  not_available:
    'Онлайн ориентацията не е включена във вашия пакет. Свържете се с нас, ако искате да я добавите.',
  disabled_by_admin:
    'Онлайн ориентацията е временно изключена за вашия профил. Свържете се с нас за подробности.',
  clinic_inactive:
    'Профилът ви не е активен в момента, затова часовете не могат да се променят.',
}

export function OrientationAvailabilityManager() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/orientation-availability`, {
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) {
        setErr('Грешка при зареждане на часовете.')
        return
      }
      setData(await r.json())
    } catch {
      setErr('Грешка при зареждане на часовете.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /** Surface the server's own Bulgarian message — it explains overlaps. */
  const callApi = async (path: string, init: RequestInit): Promise<boolean> => {
    setErr('')
    const r = await fetch(`${API_URL}/api/clinic/orientation-availability${path}`, {
      credentials: 'include' as RequestCredentials,
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
    if (!r.ok) {
      let msg = 'Действието не бе изпълнено.'
      try {
        const j = await r.json()
        if (j?.detail?.message) msg = j.detail.message
      } catch {
        /* keep the fallback */
      }
      setErr(msg)
      return false
    }
    await load()
    return true
  }

  const addWindow = async (day: string, start: string, end: string) => {
    setBusy(`add-${day}`)
    try {
      return await callApi('', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: day,
          start_time: start,
          end_time: end,
          is_active: true,
        }),
      })
    } finally {
      setBusy(null)
    }
  }

  const toggleWindow = async (w: AvailabilityWindow) => {
    setBusy(w.id)
    try {
      await callApi(`/${w.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !w.is_active }),
      })
    } finally {
      setBusy(null)
    }
  }

  const removeWindow = async (id: string) => {
    setBusy(id)
    try {
      await callApi(`/${id}`, { method: 'DELETE' })
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <section
        className="bg-white border border-slate-200 rounded-2xl p-6"
        data-testid="orient-availability-loading"
      >
        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Зареждане на часовете…
        </div>
      </section>
    )
  }

  const canEdit = !!data?.can_edit
  const accessNote = data ? ACCESS_NOTE_BG[data.access_status] : undefined
  const windows = data?.availability ?? []

  return (
    <section
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5"
      data-testid="orient-availability-manager"
    >
      <header className="space-y-1">
        <h2 className="font-serif text-lg font-semibold text-slate-900">
          Кога сте свободни за онлайн ориентация
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Задайте седмичните часове, в които приемате безплатни онлайн разговори.
          Пациентите виждат свободните часове в тези периоди
          {data?.slot_duration_minutes
            ? ` — по ${data.slot_duration_minutes} минути всеки.`
            : '.'}
        </p>
      </header>

      {!canEdit && accessNote && (
        <p
          className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3"
          data-testid="orient-availability-locked"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{accessNote}</span>
        </p>
      )}

      {err && (
        <p
          className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3"
          data-testid="orient-availability-error"
        >
          {err}
        </p>
      )}

      <ul className="divide-y divide-slate-100">
        {DAYS.map((day) => (
          <DayRow
            key={day.value}
            day={day}
            windows={windows.filter((w) => w.day_of_week === day.value)}
            canEdit={canEdit}
            busy={busy}
            onAdd={addWindow}
            onToggle={toggleWindow}
            onRemove={removeWindow}
          />
        ))}
      </ul>
    </section>
  )
}

function DayRow({
  day,
  windows,
  canEdit,
  busy,
  onAdd,
  onToggle,
  onRemove,
}: {
  day: { value: string; label: string }
  windows: AvailabilityWindow[]
  canEdit: boolean
  busy: string | null
  onAdd: (day: string, start: string, end: string) => Promise<boolean>
  onToggle: (w: AvailabilityWindow) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('12:00')

  const submit = async () => {
    const ok = await onAdd(day.value, start, end)
    if (ok) setAdding(false)
  }

  return (
    <li className="py-3 grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] gap-2 sm:gap-4">
      <span className="text-sm font-medium text-slate-700 pt-1.5">{day.label}</span>

      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {windows.length === 0 && !adding && (
            <span className="text-sm text-slate-400 italic">Няма зададени часове</span>
          )}

          {windows.map((w) => (
            <span
              key={w.id}
              data-testid={`orient-window-${w.id}`}
              className={`inline-flex items-center gap-2 rounded-full border pl-3 pr-1.5 py-1 text-sm ${
                w.is_active
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-400 line-through'
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(w)}
                disabled={!canEdit || busy === w.id}
                title={w.is_active ? 'Изключи този период' : 'Включи този период'}
                className="tabular-nums disabled:cursor-not-allowed"
                data-testid={`orient-window-toggle-${w.id}`}
              >
                {w.start_time} – {w.end_time}
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemove(w.id)}
                  disabled={busy === w.id}
                  aria-label={`Изтрий ${day.label} ${w.start_time}–${w.end_time}`}
                  className="p-1 rounded-full hover:bg-white/70 disabled:opacity-50"
                  data-testid={`orient-window-delete-${w.id}`}
                >
                  {busy === w.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </span>
          ))}

          {canEdit && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-500 hover:border-teal-300 hover:text-teal-700"
              data-testid={`orient-window-add-${day.value}`}
            >
              <Plus className="w-3.5 h-3.5" /> Добави
            </button>
          )}
        </div>

        {adding && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-label={`Начален час — ${day.label}`}
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm tabular-nums"
              data-testid={`orient-window-start-${day.value}`}
            />
            <span className="text-slate-400 text-sm">–</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-label={`Краен час — ${day.label}`}
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm tabular-nums"
              data-testid={`orient-window-end-${day.value}`}
            />
            <button
              type="button"
              onClick={submit}
              disabled={busy === `add-${day.value}`}
              className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-3 py-1 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
              data-testid={`orient-window-save-${day.value}`}
            >
              {busy === `add-${day.value}` && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Запази
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-full px-3 py-1 text-sm text-slate-500 hover:text-slate-700"
              data-testid={`orient-window-cancel-${day.value}`}
            >
              Отказ
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
