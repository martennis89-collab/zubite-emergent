'use client'

/**
 * Admin · Online Orientation Settings (Phase D, June 2026)
 *
 * Operational/admin foundation only — no patient-facing booking yet.
 * Lets an admin toggle Online Orientation for a single clinic, edit the
 * basic operational limits, and manage weekly availability windows.
 *
 * Backend contract:
 *   GET    /api/admin/clinics/:id/orientation-settings
 *   PUT    /api/admin/clinics/:id/orientation-settings
 *   GET    /api/admin/clinics/:id/orientation-availability
 *   POST   /api/admin/clinics/:id/orientation-availability
 *   PATCH  /api/admin/clinics/:id/orientation-availability/:rowId
 *   DELETE /api/admin/clinics/:id/orientation-availability/:rowId
 *
 * Patient funnel (/quiz, /results/:leadId, /quiz/success) is untouched.
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Plus, Trash2,
  CheckCircle2, AlertCircle, ShieldOff, Calendar, Info,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type AccessStatus =
  | 'included_in_plan'
  | 'addon_enabled'
  | 'disabled_by_admin'
  | 'not_available'
  | 'clinic_inactive'

interface Settings {
  enabled: boolean
  addon_enabled_for_basic: boolean
  requires_quiz_completion: boolean
  requires_contact_details: boolean
  monthly_free_slot_limit: number
  slot_duration_minutes: number
  max_bookings_per_day: number
  booking_buffer_minutes: number
  eligible_treatment_categories: string[]
  public_description: string | null
  disclaimer_text: string | null
  internal_admin_notes: string | null
}

interface AvailabilityRow {
  id: string
  clinic_id: string
  day_of_week: string
  start_time: string
  end_time: string
  is_active: boolean
}

interface OrientationPayload {
  clinic_id: string
  clinic_name: string | null
  partner_tier: string | null
  clinic_status: string | null
  subscription_status: string | null
  settings: Settings
  is_default: boolean
  access: {
    status: AccessStatus
    is_active: boolean
    tier: string
    plan_category: 'premium' | 'basic' | 'admin_only' | 'unknown'
    enabled: boolean
    addon_enabled_for_basic: boolean
    reasons?: string[]
  }
  availability: AvailabilityRow[]
  availability_summary: { active_windows: number; total_windows: number; active_days: string[] }
  defaults: Record<string, unknown>
  allowed_treatment_categories: string[]
  allowed_days_of_week: string[]
}

const DAY_LABELS_BG: Record<string, string> = {
  monday: 'Понеделник', tuesday: 'Вторник', wednesday: 'Сряда', thursday: 'Четвъртък',
  friday: 'Петък', saturday: 'Събота', sunday: 'Неделя',
}

const CATEGORY_LABELS_BG: Record<string, string> = {
  orthodontics: 'Ортодонтия',
  aligners: 'Алайнери',
  implants: 'Импланти',
  cosmetic_dentistry: 'Естетична стоматология',
  general_orientation: 'Обща ориентация',
}

const STATUS_BANNER: Record<AccessStatus, { label: string; tone: string; testid: string }> = {
  included_in_plan:   { label: 'Включено в Premium профила',    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',  testid: 'banner-included' },
  addon_enabled:      { label: 'Add-on активиран (Basic)',      tone: 'bg-teal-50 text-teal-700 border-teal-200',           testid: 'banner-addon' },
  disabled_by_admin:  { label: 'Изключено от админа',           tone: 'bg-amber-50 text-amber-800 border-amber-200',        testid: 'banner-disabled-admin' },
  not_available:      { label: 'Add-on функция за Basic профил', tone: 'bg-slate-50 text-slate-600 border-slate-200',        testid: 'banner-not-available' },
  clinic_inactive:    { label: 'Клиниката не е активна',         tone: 'bg-rose-50 text-rose-700 border-rose-200',           testid: 'banner-clinic-inactive' },
}

export default function OrientationSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const clinicId = params.id as string

  const [data, setData] = useState<OrientationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Local edit buffer for the settings form (avoid surprising re-renders).
  const [form, setForm] = useState<Settings | null>(null)

  // Availability add-row buffer
  const [newRow, setNewRow] = useState<{ day: string; start: string; end: string }>({
    day: 'monday', start: '09:00', end: '12:00',
  })

  const load = useCallback(async () => {
    setLoading(true); setMessage(null)
    try {
      const r = await fetch(`${API_URL}/api/admin/clinics/${clinicId}/orientation-settings`, {
        credentials: 'include' as RequestCredentials,
      })
      if (r.status === 401 || r.status === 403) { router.replace('/admin'); return }
      if (!r.ok) { setMessage({ type: 'err', text: 'Не успяхме да заредим настройките.' }); return }
      const j: OrientationPayload = await r.json()
      setData(j)
      setForm({ ...j.settings })
    } finally { setLoading(false) }
  }, [clinicId, router])

  useEffect(() => { if (clinicId) load() }, [clinicId, load])

  const save = async () => {
    if (!form) return
    setSaving(true); setMessage(null)
    try {
      const r = await fetch(`${API_URL}/api/admin/clinics/${clinicId}/orientation-settings`, {
        method: 'PUT',
        credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: form.enabled,
          addon_enabled_for_basic: form.addon_enabled_for_basic,
          requires_quiz_completion: form.requires_quiz_completion,
          requires_contact_details: form.requires_contact_details,
          monthly_free_slot_limit: Number(form.monthly_free_slot_limit),
          slot_duration_minutes: Number(form.slot_duration_minutes),
          max_bookings_per_day: Number(form.max_bookings_per_day),
          booking_buffer_minutes: Number(form.booking_buffer_minutes),
          eligible_treatment_categories: form.eligible_treatment_categories,
          public_description: form.public_description || null,
          disclaimer_text: form.disclaimer_text || null,
          internal_admin_notes: form.internal_admin_notes || null,
        }),
      })
      if (!r.ok) {
        let txt = ''
        try { txt = (await r.json())?.detail?.message || (await r.json())?.detail || '' } catch { /* ignore */ }
        setMessage({ type: 'err', text: txt || 'Грешка при запис.' })
        return
      }
      const j: OrientationPayload = await r.json()
      setData(j)
      setForm({ ...j.settings })
      setMessage({ type: 'ok', text: 'Запазено.' })
    } finally { setSaving(false) }
  }

  const addRow = async () => {
    setMessage(null)
    const r = await fetch(`${API_URL}/api/admin/clinics/${clinicId}/orientation-availability`, {
      method: 'POST',
      credentials: 'include' as RequestCredentials,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_of_week: newRow.day, start_time: newRow.start, end_time: newRow.end,
      }),
    })
    if (!r.ok) {
      let msg = 'Грешка при добавяне.'
      try {
        const j = await r.json()
        if (j?.detail?.message) msg = j.detail.message
        else if (Array.isArray(j?.detail) && j.detail[0]?.msg) msg = j.detail[0].msg
      } catch { /* noop */ }
      setMessage({ type: 'err', text: msg })
      return
    }
    await load()
    setMessage({ type: 'ok', text: 'Добавено.' })
  }

  const toggleRow = async (row: AvailabilityRow) => {
    const r = await fetch(
      `${API_URL}/api/admin/clinics/${clinicId}/orientation-availability/${row.id}`,
      {
        method: 'PATCH',
        credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !row.is_active }),
      },
    )
    if (r.ok) await load()
  }

  const deleteRow = async (row: AvailabilityRow) => {
    if (!confirm(`Изтрий ${DAY_LABELS_BG[row.day_of_week]} ${row.start_time}-${row.end_time}?`)) return
    const r = await fetch(
      `${API_URL}/api/admin/clinics/${clinicId}/orientation-availability/${row.id}`,
      { method: 'DELETE', credentials: 'include' as RequestCredentials },
    )
    if (r.ok) await load()
  }

  if (loading || !data || !form) {
    return (
      <main className="min-h-screen bg-slate-50">
        <AdminHeader />
        <div className="max-w-5xl mx-auto p-6 text-sm text-slate-500" data-testid="orient-loading">Зареждане…</div>
      </main>
    )
  }

  const banner = STATUS_BANNER[data.access.status]
  const isPremiumPlan = data.access.plan_category === 'premium'
  const isBasicPlan = data.access.plan_category === 'basic'
  const isInactive = !data.access.is_active

  return (
    <main className="min-h-screen bg-slate-50 pb-32">
      <AdminHeader />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/clinics/${clinicId}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
            data-testid="orient-back-link"
          >
            <ArrowLeft className="w-4 h-4" /> Към профила
          </Link>
        </div>

        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Безплатна онлайн ориентация
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {data.clinic_name || 'Клиника'} · tier:{' '}
              <span className="font-medium text-slate-700">{data.access.tier}</span>
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${banner.tone}`}
            data-testid={`orient-${banner.testid}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {banner.label}
          </div>
        </header>

        {/* Inactive-clinic notice */}
        {isInactive && (
          <div
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            data-testid="orient-inactive-notice"
          >
            <div className="flex gap-2 items-start">
              <ShieldOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                Клиниката е маркирана като неактивна, спряна или непотвърдена. Онлайн
                ориентацията няма да се излага на пациентския funnel, дори ако
                операционно е включена.
              </div>
            </div>
          </div>
        )}

        {/* Tier explainer */}
        <div
          className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-sm space-y-2"
          data-testid="orient-tier-explainer"
        >
          {isPremiumPlan && (
            <p className="text-slate-700">
              <strong>Premium профил:</strong> Online Orientation е{' '}
              <span className="text-emerald-700 font-medium">включено в плана</span>.
              Все пак трябва да я активирате операционно по-долу, преди да се излага
              на пациентския funnel.
            </p>
          )}
          {isBasicPlan && (
            <p className="text-slate-700">
              <strong>Basic профил:</strong> Online Orientation е{' '}
              <span className="text-teal-700 font-medium">add-on функция</span> —
              първо активирайте add-on, после операционно я включете.
            </p>
          )}
          {data.access.plan_category === 'admin_only' && (
            <p className="text-slate-700">
              <strong>Admin-only клиника:</strong> Не се излага на пациентския funnel.
            </p>
          )}
        </div>

        {message && (
          <div
            className={`rounded-xl border px-4 py-2 text-sm flex items-center gap-2 ${message.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
            data-testid={`orient-msg-${message.type}`}
          >
            {message.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Toggles */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3" data-testid="orient-toggles">
          <h2 className="font-serif text-base font-semibold text-slate-900">Операционни флагове</h2>

          <ToggleRow
            checked={form.enabled}
            onChange={(v) => setForm({ ...form, enabled: v })}
            label="Активирай Online Orientation"
            hint="Главен превключвател. Изключено = не се излага на пациентския funnel."
            testid="toggle-enabled"
          />

          {isBasicPlan && (
            <ToggleRow
              checked={form.addon_enabled_for_basic}
              onChange={(v) => setForm({ ...form, addon_enabled_for_basic: v })}
              label="Активирай add-on за Basic профил"
              hint="Необходимо за Basic. Premium го получава автоматично от плана."
              testid="toggle-addon"
            />
          )}

          <ToggleRow
            checked={form.requires_quiz_completion}
            onChange={(v) => setForm({ ...form, requires_quiz_completion: v })}
            label="Изисквай завършен куиз"
            testid="toggle-req-quiz"
          />
          <ToggleRow
            checked={form.requires_contact_details}
            onChange={(v) => setForm({ ...form, requires_contact_details: v })}
            label="Изисквай данни за контакт"
            testid="toggle-req-contact"
          />
        </section>

        {/* Numbers */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3" data-testid="orient-limits">
          <h2 className="font-serif text-base font-semibold text-slate-900">Лимити и тайминги</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NumField
              label="Месечен лимит безплатни часове"
              value={form.monthly_free_slot_limit}
              onChange={(v) => setForm({ ...form, monthly_free_slot_limit: v })}
              testid="num-monthly-limit" min={0} max={1000}
            />
            <NumField
              label="Продължителност (мин)"
              value={form.slot_duration_minutes}
              onChange={(v) => setForm({ ...form, slot_duration_minutes: v })}
              testid="num-slot-duration" min={5} max={240}
            />
            <NumField
              label="Макс. бронирания на ден"
              value={form.max_bookings_per_day}
              onChange={(v) => setForm({ ...form, max_bookings_per_day: v })}
              testid="num-max-per-day" min={0} max={100}
            />
            <NumField
              label="Буфер между часове (мин)"
              value={form.booking_buffer_minutes}
              onChange={(v) => setForm({ ...form, booking_buffer_minutes: v })}
              testid="num-buffer" min={0} max={240}
            />
          </div>
        </section>

        {/* Categories */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3" data-testid="orient-cats">
          <h2 className="font-serif text-base font-semibold text-slate-900">Подходящи категории</h2>
          <div className="flex flex-wrap gap-2">
            {data.allowed_treatment_categories.map((c) => {
              const selected = form.eligible_treatment_categories.includes(c)
              return (
                <button
                  key={c} type="button"
                  onClick={() => setForm({
                    ...form,
                    eligible_treatment_categories: selected
                      ? form.eligible_treatment_categories.filter((x) => x !== c)
                      : [...form.eligible_treatment_categories, c],
                  })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                  data-testid={`cat-${c}`}
                >
                  {CATEGORY_LABELS_BG[c] || c}
                </button>
              )
            })}
          </div>
        </section>

        {/* Free text */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3" data-testid="orient-texts">
          <h2 className="font-serif text-base font-semibold text-slate-900">Описание и текстове</h2>
          <TextArea
            label="Публично описание (показва се на пациента в Phase E)"
            value={form.public_description || ''}
            onChange={(v) => setForm({ ...form, public_description: v })}
            maxLength={600} testid="text-public-description"
          />
          <TextArea
            label="Disclaimer (показва се над/под бутона за заявка)"
            value={form.disclaimer_text || ''}
            onChange={(v) => setForm({ ...form, disclaimer_text: v })}
            maxLength={600} testid="text-disclaimer"
          />
          <TextArea
            label="Вътрешни админ бележки (не се показват на клиниката)"
            value={form.internal_admin_notes || ''}
            onChange={(v) => setForm({ ...form, internal_admin_notes: v })}
            maxLength={1500} testid="text-admin-notes"
          />
        </section>

        {/* Availability */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3" data-testid="orient-availability">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-serif text-base font-semibold text-slate-900 inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Седмични слотове
            </h2>
            <span className="text-xs text-slate-500" data-testid="orient-avail-summary">
              {data.availability_summary.active_windows} активни от {data.availability_summary.total_windows}
            </span>
          </div>

          {/* Existing rows */}
          {data.availability.length === 0 ? (
            <p className="text-sm text-slate-500 italic" data-testid="orient-avail-empty">
              Все още няма дефинирани слотове.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100" data-testid="orient-avail-list">
              {data.availability.map((row) => (
                <li key={row.id} className="py-2 flex items-center gap-3 text-sm" data-testid={`avail-row-${row.id}`}>
                  <span className="font-medium text-slate-800 w-28">{DAY_LABELS_BG[row.day_of_week] || row.day_of_week}</span>
                  <span className="text-slate-600 font-mono">{row.start_time} – {row.end_time}</span>
                  <button
                    type="button" onClick={() => toggleRow(row)}
                    className={`ml-auto px-2 py-1 rounded-full text-[11px] border ${row.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                    data-testid={`avail-toggle-${row.id}`}
                  >
                    {row.is_active ? 'Активен' : 'Пауза'}
                  </button>
                  <button
                    type="button" onClick={() => deleteRow(row)}
                    className="text-rose-600 hover:text-rose-700"
                    data-testid={`avail-delete-${row.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add row */}
          <div
            className="mt-2 pt-3 border-t border-slate-100 flex flex-wrap items-end gap-2"
            data-testid="orient-avail-add"
          >
            <label className="block text-xs text-slate-600">
              <span>Ден</span>
              <select
                value={newRow.day}
                onChange={(e) => setNewRow({ ...newRow, day: e.target.value })}
                className="mt-1 block border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                data-testid="avail-add-day"
              >
                {data.allowed_days_of_week.map((d) => (
                  <option key={d} value={d}>{DAY_LABELS_BG[d] || d}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-600">
              <span>Старт</span>
              <input
                type="time" value={newRow.start}
                onChange={(e) => setNewRow({ ...newRow, start: e.target.value })}
                className="mt-1 block border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                data-testid="avail-add-start"
              />
            </label>
            <label className="block text-xs text-slate-600">
              <span>Край</span>
              <input
                type="time" value={newRow.end}
                onChange={(e) => setNewRow({ ...newRow, end: e.target.value })}
                className="mt-1 block border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                data-testid="avail-add-end"
              />
            </label>
            <button
              type="button" onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-sm hover:bg-slate-800"
              data-testid="avail-add-submit"
            >
              <Plus className="w-4 h-4" /> Добави слот
            </button>
          </div>
        </section>

        {/* Read-only access debug */}
        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600 space-y-1"
          data-testid="orient-debug"
        >
          <div className="font-semibold text-slate-700 inline-flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Access снимка
          </div>
          <div>
            <span className="text-slate-500">status:</span> <span data-testid="dbg-status">{data.access.status}</span>
            {' · '}
            <span className="text-slate-500">tier:</span> {data.access.tier}
            {' · '}
            <span className="text-slate-500">plan:</span> {data.access.plan_category}
            {' · '}
            <span className="text-slate-500">active:</span> {String(data.access.is_active)}
          </div>
          {data.access.reasons && data.access.reasons.length > 0 && (
            <ul className="list-disc list-inside text-slate-500 mt-1">
              {data.access.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </section>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-slate-500 truncate">
          {STATUS_BANNER[data.access.status].label}
        </div>
        <button
          type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
          data-testid="orient-save-sticky"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Запис…' : 'Запази промените'}
        </button>
      </div>
    </main>
  )
}

/* ──────────── primitives ──────────── */

function ToggleRow({
  checked, onChange, label, hint, testid,
}: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; hint?: string; testid: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox" checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-teal-500"
        data-testid={testid}
      />
      <span className="text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

function NumField({
  label, value, onChange, min, max, testid,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; testid: string;
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <input
        type="number" min={min} max={max}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
        data-testid={testid}
      />
    </label>
  )
}

function TextArea({
  label, value, onChange, maxLength, testid,
}: {
  label: string; value: string; onChange: (v: string) => void;
  maxLength?: number; testid: string;
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <textarea
        value={value} maxLength={maxLength} rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
        data-testid={testid}
      />
    </label>
  )
}
