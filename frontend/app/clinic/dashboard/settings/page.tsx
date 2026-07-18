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

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MessageCircle, Check, Info } from 'lucide-react'
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
