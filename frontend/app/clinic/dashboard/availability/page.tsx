'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Calendar, ShieldAlert } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Rule {
  id: string; day_of_week: string; start_time: string; end_time: string
  slot_duration_minutes: number; buffer_minutes: number
  consultation_type: string; is_active: boolean
}
interface Exception {
  id: string; date: string; start_time?: string | null; end_time?: string | null; type: string; reason?: string
}

const DAYS: Array<{ v: string; label: string }> = [
  { v: 'mon', label: 'Понеделник' }, { v: 'tue', label: 'Вторник' },
  { v: 'wed', label: 'Сряда' }, { v: 'thu', label: 'Четвъртък' },
  { v: 'fri', label: 'Петък' }, { v: 'sat', label: 'Събота' }, { v: 'sun', label: 'Неделя' },
]
const CONSULT_TYPES = [
  { v: 'initial_consultation', label: 'Първична' },
  { v: 'orthodontic_consultation', label: 'Ортодонтска' },
  { v: 'implant_consultation', label: 'Имплантологична' },
  { v: 'hygiene_consultation', label: 'Хигиенна' },
  { v: 'aesthetic_consultation', label: 'Естетична' },
  { v: 'other', label: 'Друго' },
]

export default function ClinicAvailabilityPage() {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [rules, setRules] = useState<Rule[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const [newRule, setNewRule] = useState<Rule>({
    id: '', day_of_week: 'mon', start_time: '09:00', end_time: '17:00',
    slot_duration_minutes: 30, buffer_minutes: 0,
    consultation_type: 'initial_consultation', is_active: true,
  })
  const [newException, setNewException] = useState<Exception>({
    id: '', date: '', type: 'full_day_block', reason: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/clinic/availability`, { credentials: 'include' as RequestCredentials })
      if (r.ok) {
        const d = await r.json()
        setEnabled(!!d.booking_enabled)
        setRules(d.rules || []); setExceptions(d.exceptions || [])
      }
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const createRule = async () => {
    setBusy('add-rule')
    try {
      const r = await fetch(`${API_URL}/api/clinic/availability/rules`, {
        method: 'POST', credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      })
      if (r.ok) { setNewRule({ ...newRule, start_time: '09:00', end_time: '17:00' }); await load() }
    } finally { setBusy(null) }
  }
  const deleteRule = async (id: string) => {
    if (!confirm('Изтрий правилото?')) return
    setBusy(id)
    try {
      await fetch(`${API_URL}/api/clinic/availability/rules/${id}`, { method: 'DELETE', credentials: 'include' as RequestCredentials })
      await load()
    } finally { setBusy(null) }
  }
  const toggleRule = async (r: Rule) => {
    setBusy(r.id)
    try {
      await fetch(`${API_URL}/api/clinic/availability/rules/${r.id}`, {
        method: 'PATCH', credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !r.is_active }),
      })
      await load()
    } finally { setBusy(null) }
  }
  const createException = async () => {
    if (!newException.date) return
    setBusy('add-ex')
    try {
      const r = await fetch(`${API_URL}/api/clinic/availability/exceptions`, {
        method: 'POST', credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newException),
      })
      if (r.ok) { setNewException({ id: '', date: '', type: 'full_day_block', reason: '' }); await load() }
    } finally { setBusy(null) }
  }
  const deleteException = async (id: string) => {
    setBusy(id)
    try {
      await fetch(`${API_URL}/api/clinic/availability/exceptions/${id}`, { method: 'DELETE', credentials: 'include' as RequestCredentials })
      await load()
    } finally { setBusy(null) }
  }

  if (loading) return <div className="p-8 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-6" data-testid="clinic-availability-page">
      <header className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-teal-700" />
        <h1 className="font-serif text-2xl font-semibold text-slate-900">Наличност за консултации</h1>
      </header>

      {!enabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2 text-sm text-amber-900" data-testid="availability-disabled-banner">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Booking календарът е достъпен за Growth Partner клиники.</p>
            <p className="text-xs mt-0.5">Свържи се с екипа на Zubite.bg за upgrade към Growth Partner. Verified Profile клиниките остават с CTA-only профил.</p>
          </div>
        </div>
      )}

      {/* Rules */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="font-serif text-lg font-semibold mb-3">Седмични правила</h2>
        {rules.length === 0 && <p className="text-sm text-slate-400 italic mb-3">Няма зададени правила.</p>}
        <ul className="space-y-2 mb-4">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 border-t border-slate-100 first:border-0 text-sm" data-testid={`rule-row-${r.id}`}>
              <span className="w-20 font-medium">{DAYS.find(d => d.v === r.day_of_week)?.label || r.day_of_week}</span>
              <span className="text-slate-600">{r.start_time}–{r.end_time}</span>
              <span className="text-xs text-slate-500">{r.slot_duration_minutes} мин / +{r.buffer_minutes} buffer</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{CONSULT_TYPES.find(t => t.v === r.consultation_type)?.label || r.consultation_type}</span>
              <button type="button" onClick={() => toggleRule(r)} disabled={!enabled || busy === r.id}
                className={`ml-auto text-xs px-2 py-1 rounded-full ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                data-testid={`rule-toggle-${r.id}`}>
                {r.is_active ? 'Активно' : 'Неактивно'}
              </button>
              <button type="button" onClick={() => deleteRule(r.id)} disabled={busy === r.id} className="text-rose-500 hover:text-rose-700 p-1" data-testid={`rule-delete-${r.id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        {enabled && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3" data-testid="rule-add">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
              <Select label="Ден" value={newRule.day_of_week} options={DAYS.map(d => ({ v: d.v, label: d.label }))} onChange={(v) => setNewRule({ ...newRule, day_of_week: v })} />
              <Field label="Начало" type="time" value={newRule.start_time} onChange={(v) => setNewRule({ ...newRule, start_time: v })} />
              <Field label="Край" type="time" value={newRule.end_time} onChange={(v) => setNewRule({ ...newRule, end_time: v })} />
              <Field label="Слот (мин)" type="number" value={String(newRule.slot_duration_minutes)}
                onChange={(v) => setNewRule({ ...newRule, slot_duration_minutes: Number(v) || 30 })} />
              <Field label="Buffer (мин)" type="number" value={String(newRule.buffer_minutes)}
                onChange={(v) => setNewRule({ ...newRule, buffer_minutes: Number(v) || 0 })} />
              <Select label="Тип" value={newRule.consultation_type}
                options={CONSULT_TYPES.map(t => ({ v: t.v, label: t.label }))}
                onChange={(v) => setNewRule({ ...newRule, consultation_type: v })} />
            </div>
            <div className="text-right mt-2">
              <button type="button" onClick={createRule} disabled={!enabled || busy === 'add-rule'}
                className="inline-flex items-center gap-1 px-4 h-9 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-50"
                data-testid="rule-add-btn">
                <Plus className="w-4 h-4" /> Добави правило
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Exceptions */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="font-serif text-lg font-semibold mb-3">Изключения (блокирани дни / допълнителни часове)</h2>
        <ul className="space-y-1 mb-3">
          {exceptions.length === 0 && <li className="text-sm text-slate-400 italic">Няма изключения.</li>}
          {exceptions.map((e) => (
            <li key={e.id} className="flex items-center gap-2 py-1 text-sm" data-testid={`exception-row-${e.id}`}>
              <span className="font-medium">{e.date}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{e.type}</span>
              {e.start_time && <span className="text-xs text-slate-500">{e.start_time}–{e.end_time}</span>}
              {e.reason && <span className="text-xs text-slate-500 truncate">{e.reason}</span>}
              <button type="button" onClick={() => deleteException(e.id)} className="ml-auto text-rose-500 hover:text-rose-700 p-1" data-testid={`exception-delete-${e.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
        {enabled && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs items-end" data-testid="exception-add">
            <Field label="Дата" type="date" value={newException.date} onChange={(v) => setNewException({ ...newException, date: v })} />
            <Select label="Тип" value={newException.type}
              options={[
                { v: 'full_day_block', label: 'Целодневно блокиране' },
                { v: 'partial_block', label: 'Частично блокиране' },
                { v: 'extra_available_slot', label: 'Допълнителен слот' },
              ]}
              onChange={(v) => setNewException({ ...newException, type: v })} />
            {newException.type !== 'full_day_block' && (
              <>
                <Field label="Начало" type="time" value={newException.start_time || ''} onChange={(v) => setNewException({ ...newException, start_time: v })} />
                <Field label="Край" type="time" value={newException.end_time || ''} onChange={(v) => setNewException({ ...newException, end_time: v })} />
              </>
            )}
            <button type="button" onClick={createException} disabled={busy === 'add-ex' || !newException.date}
              className="col-span-2 sm:col-span-1 inline-flex items-center gap-1 justify-center px-4 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-50"
              data-testid="exception-add-btn">
              <Plus className="w-4 h-4" /> Добави
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-slate-600">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5" />
    </label>
  )
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ v: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-slate-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
        {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  )
}
