'use client'

/**
 * Clinic Dashboard · Settings.
 *
 * The first clinic-facing editor in the product: `PATCH /api/clinic/profile`
 * has existed since the original build but nothing in the frontend ever
 * called it, so every field here was previously only changeable by Zubite
 * staff through the admin panel.
 *
 * Scope is deliberately narrow — contact details the clinic owns and the
 * Viber channel. Package, entitlements, pricing and anything that decides
 * what Zubite promises patients stay admin-owned and are not rendered here.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Loader2, MessageCircle, Check, Info, Image as ImageIcon, Trash2, Upload,
  RefreshCw, Save, CheckCircle2, XCircle,
} from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import { OrientationAvailabilityManager } from '@/components/clinic/OrientationAvailabilityManager'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ClinicProfile {
  clinic_name: string
  city: string
  email: string
  phone: string
  address?: string | null
  website?: string | null
  viber_enabled: boolean
  viber_phone?: string | null
  logo_url?: string | null
}

type Saving = 'idle' | 'saving' | 'saved'

export default function ClinicSettingsPage() {
  const [profile, setProfile] = useState<ClinicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setErr('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/profile`, {
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) {
        setErr('Грешка при зареждане на профила.')
        return
      }
      setProfile(await r.json())
    } catch {
      setErr('Грешка при зареждане на профила.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <ClinicShell>
        <div
          className="inline-flex items-center gap-2 text-sm text-slate-500"
          data-testid="clinic-settings-loading"
        >
          <Loader2 className="w-4 h-4 animate-spin" /> Зареждане…
        </div>
      </ClinicShell>
    )
  }

  return (
    <ClinicShell>
      <div className="space-y-6 max-w-3xl" data-testid="clinic-settings-page">
        <header>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Настройки
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Данни за контакт и канали, по които пациентите могат да ви пишат.
          </p>
        </header>

        {err && (
          <p
            className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3"
            data-testid="clinic-settings-error"
          >
            {err}
          </p>
        )}

        {profile && <ViberChannelCard profile={profile} onSaved={load} />}

        {profile && <ClinicLogoCard profile={profile} onSaved={load} />}

        <ClearAdvanceSyncCard />

        <OrientationAvailabilityManager />

        {profile && (
          <section
            className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3"
            data-testid="clinic-settings-readonly"
          >
            <h2 className="font-serif text-lg font-semibold text-slate-900">
              Данни на клиниката
            </h2>
            <p className="text-sm text-slate-500">
              За промяна на тези данни се свържете с екипа на Zubite.
            </p>
            <dl className="text-sm divide-y divide-slate-100">
              <ReadOnlyRow label="Клиника" value={profile.clinic_name} />
              <ReadOnlyRow label="Град" value={profile.city} />
              <ReadOnlyRow label="Имейл" value={profile.email} />
              <ReadOnlyRow label="Телефон" value={profile.phone} />
            </dl>
          </section>
        )}
      </div>
    </ClinicShell>
  )
}

type SyncState = 'loading' | 'ready' | 'saving' | 'syncing' | 'error'
type SyncSummary = {
  connected: boolean
  key_hint?: string
  connected_at?: string
  updated_at?: string
  clear_advance_last_sync_at?: string
  clear_advance_last_sync_kind?: string
  clear_advance_last_sync_ok?: boolean
  clear_advance_sync_failure_streak?: number
  pending_outbox: number
  succeeded_outbox: number
  status_mappings: Record<string, string | null>
}

const SYNC_STATUS_ROWS = [
  { key: 'SCHEDULED', label: 'Записан час', hint: 'Изпраща appointment booked' },
  { key: 'ATTENDED', label: 'Потвърдено посещение', hint: 'Изпраща appointment attended само при потвърдено присъствие.' },
]

const SYNC_OUTCOMES = [
  { value: '', label: 'Не изпращай' },
  { value: 'appointment_booked', label: 'Записана среща' },
  { value: 'appointment_attended', label: 'Посещение' },
  { value: 'sale', label: 'Продажба' },
]

function ClearAdvanceSyncCard() {
  const [summary, setSummary] = useState<SyncSummary | null>(null)
  const [state, setState] = useState<SyncState>('loading')
  const [message, setMessage] = useState('')
  const [mappings, setMappings] = useState<Record<string, string | null>>({})

  const load = useCallback(async () => {
    setMessage('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/clear-advance`, {
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data: SyncSummary = await r.json()
      setSummary(data)
      setMappings(data.status_mappings || {})
      setState('ready')
    } catch {
      setState('error')
      setMessage('Не успяхме да заредим състоянието на синхронизацията.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const saveMappings = async () => {
    setState('saving')
    setMessage('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/clear-advance/mappings`, {
        method: 'PATCH', credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data: SyncSummary = await r.json()
      setSummary(data)
      setMappings(data.status_mappings || {})
      setState('ready')
      setMessage('Настройките са запазени.')
    } catch {
      setState('error')
      setMessage('Настройките не бяха запазени.')
    }
  }

  const runSync = async () => {
    setState('syncing')
    setMessage('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/clear-advance/sync`, {
        method: 'POST', credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setSummary(data.sync)
      setMappings(data.sync?.status_mappings || {})
      setState('ready')
      setMessage(`Синхронизацията приключи: ${data.imported || 0} нови заявки.`)
    } catch {
      setState('error')
      setMessage('Синхронизацията не завърши. Опитайте отново след малко.')
    }
  }

  if (state === 'loading') return <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 animate-pulse" data-testid="clear-advance-sync-loading"><div className="h-5 w-48 bg-slate-200 rounded" /><div className="mt-3 h-3 w-72 bg-slate-100 rounded" /></section>
  if (state === 'error' && !summary) return <section className="bg-white border border-rose-200 rounded-2xl p-4 sm:p-6" data-testid="clear-advance-sync-error"><p className="text-sm text-rose-700">{message}</p></section>
  if (!summary?.connected) return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6" data-testid="clear-advance-sync-card">
      <h2 className="font-serif text-lg font-semibold text-slate-900">Clear Advance</h2>
      <p className="mt-1 text-sm text-slate-500">Клиниката не е свързана с Clear Advance. Когато бъде свързана, заявките от Facebook, Google и други канали ще се появяват тук.</p>
    </section>
  )

  const syncing = state === 'saving' || state === 'syncing'
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5" data-testid="clear-advance-sync-card">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-semibold text-slate-900">Clear Advance синхронизация</h2>
          <p className="mt-1 text-sm text-slate-500">Заявките и резултатите от рекламите се поддържат в двете системи.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full whitespace-nowrap"><CheckCircle2 className="w-3.5 h-3.5" /> Свързано</span>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <SyncMetric label="Чакащи събития" value={String(summary.pending_outbox)} tone={summary.pending_outbox ? 'warning' : 'normal'} />
        <SyncMetric label="Изпратени" value={String(summary.succeeded_outbox)} tone="normal" />
        <SyncMetric label="Последна синхронизация" value={summary.clear_advance_last_sync_at ? formatSyncDate(summary.clear_advance_last_sync_at) : 'Няма'} tone="normal" />
        <SyncMetric label="Последен резултат" value={summary.clear_advance_last_sync_ok === false ? 'Грешка' : summary.clear_advance_last_sync_at ? 'Успешна' : 'Няма'} tone={summary.clear_advance_last_sync_ok === false ? 'error' : 'normal'} />
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Статус към Clear Advance</h3>
          <p className="text-xs text-slate-500 mt-1">Избирайте само събития, които действително са настъпили.</p>
        </div>
        <div className="space-y-2">
          {SYNC_STATUS_ROWS.map((row) => (
            <label key={row.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <span><span className="text-slate-700">{row.label}</span><span className="block text-xs text-slate-400">{row.hint}</span></span>
              <select value={mappings[row.key] || ''} onChange={(e) => setMappings((old) => ({ ...old, [row.key]: e.target.value || null }))} className="w-full sm:w-52 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200">
                {SYNC_OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ))}
        </div>
        <button type="button" onClick={saveMappings} disabled={syncing} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg">
          {state === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Запази картографирането
        </button>
      </div>

      {summary.clear_advance_sync_failure_streak ? <p className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3"><XCircle className="w-4 h-4 shrink-0 mt-0.5" /> Последните {summary.clear_advance_sync_failure_streak} опита не са успешни. Събитията остават в опашката за повторен опит.</p> : null}
      {message && <p className="text-sm text-slate-600" role="status">{message}</p>}
      <button type="button" onClick={runSync} disabled={syncing} className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-60">
        <RefreshCw className={`w-4 h-4 ${state === 'syncing' ? 'animate-spin' : ''}`} /> {state === 'syncing' ? 'Синхронизиране…' : 'Синхронизирай сега'}
      </button>
    </section>
  )
}

function SyncMetric({ label, value, tone }: { label: string; value: string; tone: 'normal' | 'warning' | 'error' }) {
  const color = tone === 'error' ? 'text-rose-700' : tone === 'warning' ? 'text-amber-700' : 'text-slate-900'
  return <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">{label}</div><div className={`mt-1 font-medium ${color}`}>{value}</div></div>
}

function formatSyncDate(value: string) {
  try { return new Intl.DateTimeFormat('bg-BG', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) } catch { return 'Наскоро' }
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 flex items-start gap-3">
      <dt className="text-slate-500 w-28 shrink-0">{label}</dt>
      <dd className="text-slate-900 break-words min-w-0">{value}</dd>
    </div>
  )
}

function ViberChannelCard({
  profile,
  onSaved,
}: {
  profile: ClinicProfile
  onSaved: () => Promise<void>
}) {
  const [phone, setPhone] = useState(profile.viber_phone || '')
  const [enabled, setEnabled] = useState(profile.viber_enabled)
  const [saving, setSaving] = useState<Saving>('idle')
  const [err, setErr] = useState('')
  // A Verified profile gets 403 from the endpoint; surface that as a
  // read-only card rather than letting them fill in a form that fails.
  const [locked, setLocked] = useState(false)

  const save = async (next: { viber_enabled?: boolean; viber_phone?: string }) => {
    setErr('')
    setSaving('saving')
    try {
      const r = await fetch(`${API_URL}/api/clinic/profile`, {
        method: 'PATCH',
        credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!r.ok) {
        let msg = 'Промяната не бе запазена.'
        try {
          const j = await r.json()
          if (j?.detail?.message) msg = j.detail.message
          if (j?.detail?.code === 'chat_channels_not_in_package') setLocked(true)
        } catch {
          /* keep the fallback */
        }
        setErr(msg)
        setSaving('idle')
        // Re-sync from the server so the toggle never shows a state that
        // was rejected.
        await onSaved()
        return
      }
      const updated: ClinicProfile = await r.json()
      setPhone(updated.viber_phone || '')
      setEnabled(updated.viber_enabled)
      setSaving('saved')
      setTimeout(() => setSaving('idle'), 1800)
      await onSaved()
    } catch {
      setErr('Промяната не бе запазена.')
      setSaving('idle')
    }
  }

  return (
    <section
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4"
      data-testid="clinic-settings-viber"
    >
      <header className="space-y-1">
        <h2 className="font-serif text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-teal-500" />
          Чат във Viber
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Когато е включено, в профила ви се показва бутон „Пишете във Viber“,
          който отваря разговор с вас. Разговорът тече във Viber, извън
          Zubite — няма да го виждаме и няма да го отчитаме в резултатите ви.
        </p>
      </header>

      {locked && (
        <p
          className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3"
          data-testid="clinic-settings-viber-locked"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Viber каналът е част от пакета Growth Partner.</span>
        </p>
      )}

      <div className="space-y-2">
        <label className="block text-sm text-slate-700" htmlFor="viber-phone">
          Viber номер
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="viber-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0888 123 456"
            disabled={locked}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-0 flex-1 disabled:bg-slate-50"
            data-testid="viber-phone-input"
          />
          <button
            type="button"
            onClick={() => save({ viber_phone: phone })}
            disabled={locked || saving === 'saving' || !phone.trim()}
            className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
            data-testid="viber-phone-save"
          >
            {saving === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving === 'saved' && <Check className="w-3.5 h-3.5" />}
            Запази
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Приемаме 0888 123 456 или +359 88 123 4567 — записваме го в
          международен формат.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={enabled}
          disabled={locked || saving === 'saving'}
          onChange={(e) => {
            setEnabled(e.target.checked)
            save({ viber_enabled: e.target.checked })
          }}
          className="mt-0.5 h-4 w-4 accent-teal-500"
          data-testid="viber-enabled-toggle"
        />
        <span>Показвай бутон „Пишете във Viber“ в публичния ми профил</span>
      </label>

      {err && (
        <p
          className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3"
          data-testid="viber-error"
        >
          {err}
        </p>
      )}
    </section>
  )
}

function ClinicLogoCard({
  profile,
  onSaved,
}: {
  profile: ClinicProfile
  onSaved: () => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [err, setErr] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErr('Файлът е твърде голям. Максимум 2MB.')
      return
    }
    setErr('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch(`${API_URL}/api/clinic/logo`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
        body: form,
      })
      if (!r.ok) {
        let msg = 'Логото не бе качено.'
        try { const j = await r.json(); if (j?.detail) msg = typeof j.detail === 'string' ? j.detail : msg } catch { /* noop */ }
        setErr(msg)
        return
      }
      await onSaved()
    } catch {
      setErr('Логото не бе качено.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    setErr('')
    setRemoving(true)
    try {
      const r = await fetch(`${API_URL}/api/clinic/logo`, {
        method: 'DELETE',
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) {
        setErr('Логото не бе премахнато.')
        return
      }
      await onSaved()
    } catch {
      setErr('Логото не бе премахнато.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <section
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4"
      data-testid="clinic-settings-logo"
    >
      <header className="space-y-1">
        <h2 className="font-serif text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-teal-500" />
          Лого на клиниката
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Използва се за съвместно брандиране на постера за обратна връзка
          (страница „Ревюта“) — показва се дискретно като „С участието на“,
          не наравно с логото на Zubite.
        </p>
      </header>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 grid place-items-center overflow-hidden flex-shrink-0">
          {profile.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={profile.logo_url}
              alt="Лого на клиниката"
              className="w-full h-full object-contain p-2"
              data-testid="clinic-logo-preview"
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-slate-300" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
              data-testid="clinic-logo-upload-btn"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {profile.logo_url ? 'Смени лого' : 'Качи лого'}
            </button>
            {profile.logo_url && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                data-testid="clinic-logo-remove-btn"
              >
                {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Премахни
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">PNG, JPG или WebP, до 2MB.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
          data-testid="clinic-logo-file-input"
        />
      </div>

      {err && (
        <p
          className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3"
          data-testid="clinic-logo-error"
        >
          {err}
        </p>
      )}
    </section>
  )
}
