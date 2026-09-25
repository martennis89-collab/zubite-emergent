'use client'

/**
 * ResultUnlockGate
 *
 * Lead capture gate on /results/[leadId] when `full_result_unlocked === false`.
 * Submitting unlocks the patient's top-3 clinic shortlist on /clinics?leadId=.
 *
 * Hard rules (per product spec):
 *   • City is REQUIRED. `/recommended-clinics` returns an honest empty list
 *     for a lead without a city, and the diagnostic quiz never asks for one —
 *     so this form is the only place the city gets set for those leads.
 *   • Never "free guarantee" wording; never promise free orientation.
 *   • Consent checkbox is mandatory before submit.
 *
 * Calls POST /api/leads/{leadId}/unlock-result (email required, name/phone/
 * city_slug optional server-side; the city is enforced here).
 */

import { forwardRef, useState } from 'react'
import { ArrowRight, Loader2, AlertTriangle, MapPin, ShieldCheck } from 'lucide-react'
import { CITIES } from '@/lib/cityData'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { trackEvent as gaTrackEvent } from '@/lib/analytics/gtag'
import { trackLeadSubmit } from '@/components/MetaPixel'
import { trackOutbrainLead } from '@/components/OutbrainPixel'

// Largest cities get one-tap pills; the rest live in the "Друг град" select.
const PRIMARY_CITY_SLUGS = ['sofia', 'plovdiv', 'varna', 'burgas']
const PRIMARY_CITIES = CITIES.filter((c) => PRIMARY_CITY_SLUGS.includes(c.value))
const OTHER_CITIES = CITIES.filter((c) => !PRIMARY_CITY_SLUGS.includes(c.value))

interface ResultUnlockGateProps {
  leadId: string
  defaultName?: string
  /** City already known from the quiz — preselected, still changeable. */
  citySlug?: string | null
  onUnlocked: (data: { name: string; phone: string; email: string }) => void
}

type Field = 'city' | 'name' | 'phone' | 'email' | 'consent'

// Brand tokens (shared with /clinics PersonalizedClinicShowcase).
const INK = 'text-[#073B36]'
const LABEL = 'text-base font-semibold text-[#073B36]'
const inputCls =
  'mt-2 w-full rounded-lg bg-white border px-4 py-3.5 text-lg text-[#1B1C1B] placeholder:text-[#8A9A97] focus:outline-none focus:border-[#006A61] transition-colors'
const ERR = 'mt-1.5 block text-sm text-[#BE123C]'

export const ResultUnlockGate = forwardRef<HTMLDivElement, ResultUnlockGateProps>(function ResultUnlockGate(
  { leadId, defaultName, citySlug, onUnlocked },
  ref,
) {
  const knownCity = CITIES.some((c) => c.value === citySlug) ? (citySlug as string) : ''
  const [city, setCity] = useState(knownCity)
  const [name, setName] = useState(defaultName || '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')

  // Track viewed event once per page load (best-effort, never blocks render).
  if (typeof window !== 'undefined' && !(window as unknown as { __zubLeadGateSeen?: boolean }).__zubLeadGateSeen) {
    ;(window as unknown as { __zubLeadGateSeen?: boolean }).__zubLeadGateSeen = true
    try { trackPatientEvent('post_quiz_lead_capture_viewed', { lead_id_present: true }) } catch { /* ignore */ }
  }

  const cityLabel = CITIES.find((c) => c.value === city)?.label
  const otherCitySelected = OTHER_CITIES.some((c) => c.value === city)
  const invalid: Record<Field, boolean> = {
    city: !city,
    name: name.trim().length < 1,
    phone: phone.replace(/\D/g, '').length < 6,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    consent: !consent,
  }
  const firstInvalid = (Object.keys(invalid) as Field[]).find((f) => invalid[f])
  const err = (f: Field) => showErrors && invalid[f]
  const border = (f: Field) => (err(f) ? 'border-[#E11D48]' : 'border-[#C8D8D4]')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    // The button stays active so a tap always gets feedback — we point at
    // what's missing instead of silently disabling the CTA.
    if (firstInvalid) {
      setShowErrors(true)
      document.getElementById(`unlock-${firstInvalid}`)?.focus()
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${apiUrl}/api/leads/${leadId}/unlock-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          city_slug: city,
          consent: true,
        }),
      })
      if (!res.ok) {
        let msg = 'Възникна грешка. Опитай отново.'
        try {
          const data = await res.json()
          if (typeof data?.detail === 'object' && data.detail?.message) msg = data.detail.message
          else if (typeof data?.detail === 'string') msg = data.detail
        } catch { /* ignore */ }
        throw new Error(msg)
      }
      try { trackPatientEvent('post_quiz_lead_submitted', { lead_id_present: true }) } catch { /* ignore */ }
      try { trackPatientEvent('full_result_unlocked', { lead_id_present: true }) } catch { /* ignore */ }
      try { gaTrackEvent('lead_submit', { source: 'result_unlock', city, has_email: true }) } catch { /* ignore */ }
      try { trackLeadSubmit(city, 'result_unlock') } catch { /* ignore */ }
      try { trackOutbrainLead() } catch { /* ignore */ }
      onUnlocked({ name: name.trim(), phone: phone.trim(), email: email.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка. Опитай отново.')
      setSubmitting(false)
    }
  }

  const pill = (active: boolean, f: Field) =>
    active
      ? 'border-[#073B36] bg-[#073B36] text-[#FFFFFF]'
      : `${err(f) ? 'border-[#E11D48]' : 'border-[#C8D8D4]'} bg-white ${INK} hover:border-[#006A61]`

  return (
    <div
      ref={ref}
      id="unlock-form"
      className="scroll-mt-24 rounded-xl border border-[#C8D8D4] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(7,59,54,0.45)] sm:p-8"
      data-testid="result-unlock-gate"
    >
      <h2 className="font-display text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#073B36] sm:text-4xl" data-testid="result-unlock-title">
        Виж твоите топ 3 клиники
      </h2>
      <p className="mt-2 text-lg leading-relaxed text-[#45514F]">
        Подбрани според отговорите и града ти.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5" data-testid="result-unlock-form">
        {/* City — required; drives clinic matching. */}
        <fieldset>
          <legend className={LABEL}>Град</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="result-unlock-city">
            {PRIMARY_CITIES.map((c, i) => (
              <button
                key={c.value}
                id={i === 0 ? 'unlock-city' : undefined}
                type="button"
                aria-pressed={city === c.value}
                onClick={() => setCity(c.value)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-base font-semibold transition-colors ${pill(city === c.value, 'city')}`}
                data-testid={`result-unlock-city-${c.value}`}
              >
                {city === c.value && <MapPin className="h-4 w-4" />}
                {c.label}
              </button>
            ))}
            <select
              value={otherCitySelected ? city : ''}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Друг град"
              className={`col-span-2 rounded-lg border px-3 py-3 text-base font-semibold focus:outline-none ${pill(otherCitySelected, 'city')}`}
              data-testid="result-unlock-city-other"
            >
              <option value="">Друг град…</option>
              {OTHER_CITIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          {err('city') && <p className={ERR}>Избери град.</p>}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Име</span>
            <input
              id="unlock-name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Името ти"
              aria-invalid={err('name')}
              className={`${inputCls} ${border('name')}`}
              data-testid="result-unlock-name"
            />
          </label>
          <label className="block">
            <span className={LABEL}>Телефон</span>
            <input
              id="unlock-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08X XXX XXXX"
              aria-invalid={err('phone')}
              className={`${inputCls} ${border('phone')}`}
              data-testid="result-unlock-phone"
            />
            {err('phone') && <span className={ERR}>Въведи валиден телефон.</span>}
          </label>
        </div>

        <label className="block">
          <span className={LABEL}>Имейл</span>
          <input
            id="unlock-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ime@primer.bg"
            aria-invalid={err('email')}
            className={`${inputCls} ${border('email')}`}
            data-testid="result-unlock-email"
          />
          {err('email') && <span className={ERR}>Въведи валиден имейл.</span>}
        </label>

        <label className="flex cursor-pointer select-none items-start gap-3">
          <input
            id="unlock-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-5 w-5 flex-shrink-0 rounded border-[#8A9A97] accent-[#073B36]"
            data-testid="result-unlock-consent"
          />
          <span className={`text-[15px] leading-relaxed ${err('consent') ? 'text-[#BE123C]' : 'text-[#45514F]'}`}>
            Съгласявам се Zubite.bg да обработи данните ми във връзка със заявката
            и Zubite.bg и избраната партньорска клиника да се свържат с мен.
          </span>
        </label>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2.5 text-[15px] text-[#BE123C]" data-testid="result-unlock-error">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B00] px-5 py-4 text-lg font-bold text-[#0A0A0A] transition-colors hover:bg-[#CC5400] disabled:cursor-wait disabled:opacity-70"
          data-testid="result-unlock-submit"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {submitting ? 'Подбираме клиники…' : cityLabel ? `Покажи топ 3 в ${cityLabel}` : 'Покажи топ 3 клиники'}
          {!submitting && <ArrowRight className="h-5 w-5" />}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-[15px] text-[#45514F]">
          <ShieldCheck className="h-4 w-4 text-[#006A61]" />
          Без задължение. Резултатът идва и на имейла ти.
        </p>
      </form>
    </div>
  )
})
