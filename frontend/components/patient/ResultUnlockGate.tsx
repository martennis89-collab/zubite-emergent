'use client'

/**
 * ResultUnlockGate
 *
 * Lead capture gate on /results/[leadId] when `full_result_unlocked === false`.
 * Submitting unlocks the personalised clinic shortlist.
 *
 * Hard rules (per product spec):
 *   • City is REQUIRED. `/recommended-clinics` returns an honest empty list
 *     for a lead without a city, and the diagnostic quiz never asks for one —
 *     so this form is the only place the city gets set for those leads.
 *   • Never "free guarantee" wording; never promise free orientation.
 *   • Care Pass: one calm line — not insurance, not an automatic discount.
 *   • Consent checkbox is mandatory before submit.
 *   • Disclaimer that Zubite does not diagnose online.
 *
 * Calls POST /api/leads/{leadId}/unlock-result (email required, name/phone/
 * city_slug optional server-side; the city is enforced here).
 */

import { forwardRef, useState } from 'react'
import Link from 'next/link'
import { Lock, ShieldCheck, ArrowRight, Loader2, AlertTriangle, MapPin } from 'lucide-react'
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

const inputCls =
  'mt-1.5 w-full rounded-[10px] bg-white border px-3.5 py-3 text-[15px] text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#0A0A0A] transition-colors'

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
  const invalid: Record<Field, boolean> = {
    city: !city,
    name: name.trim().length < 1,
    phone: phone.replace(/\D/g, '').length < 6,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    consent: !consent,
  }
  const firstInvalid = (Object.keys(invalid) as Field[]).find((f) => invalid[f])
  const err = (f: Field) => showErrors && invalid[f]

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

  return (
    <div
      ref={ref}
      id="unlock-form"
      className="relative scroll-mt-24 rounded-2xl bg-white border border-[#E5E5E5] p-6 sm:p-8"
      data-testid="result-unlock-gate"
    >
      <h2 className="text-2xl font-semibold leading-tight text-[#0A0A0A]" data-testid="result-unlock-title">
        Виж клиниките за твоя случай
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-[#525252]">
        Избери град и остави контакт. Ще ти покажем до 3 партньорски клиники
        и ще ти изпратим резултата по имейл.
      </p>

      {/* Locked shortlist preview — generic shapes only, no invented
          clinic names, ratings or counts. */}
      <div aria-hidden className="relative mt-4 rounded-xl bg-[#F5F4F2] p-2 overflow-hidden">
        <div className="space-y-1.5 blur-[2.5px] select-none">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-1.5">
              <div className="h-6 w-6 rounded-md bg-[#E5E5E5]" />
              <div className="h-2.5 rounded bg-[#D4D4D4]" style={{ width: `${52 - i * 8}%` }} />
              <div className="ml-auto h-4 w-12 rounded-full bg-[#D0FAE5]" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-3.5 py-1.5 text-[12px] font-semibold text-[#F5F4F2]">
            <Lock className="w-3.5 h-3.5" />
            До 3 клиники, подбрани за теб
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4" data-testid="result-unlock-form">
        {/* City — required; drives clinic matching. */}
        <fieldset>
          <legend className="text-[13px] font-semibold text-[#171717]">Къде търсиш клиника?</legend>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="result-unlock-city">
            {PRIMARY_CITIES.map((c, i) => {
              const active = city === c.value
              return (
                <button
                  key={c.value}
                  id={i === 0 ? 'unlock-city' : undefined}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCity(c.value)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] border px-3 py-2.5 text-[14px] font-medium transition-colors ${
                    active
                      ? 'border-[#0A0A0A] bg-[#0A0A0A] text-[#F5F4F2]'
                      : err('city')
                        ? 'border-[#E11D48] bg-white text-[#171717]'
                        : 'border-[#E5E5E5] bg-white text-[#171717] hover:border-[#A3A3A3]'
                  }`}
                  data-testid={`result-unlock-city-${c.value}`}
                >
                  {active && <MapPin className="w-3.5 h-3.5" />}
                  {c.label}
                </button>
              )
            })}
            <select
              value={OTHER_CITIES.some((c) => c.value === city) ? city : ''}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Друг град"
              className={`col-span-2 sm:col-span-2 rounded-[10px] border px-3 py-2.5 text-[14px] font-medium focus:outline-none ${
                OTHER_CITIES.some((c) => c.value === city)
                  ? 'border-[#0A0A0A] bg-[#0A0A0A] text-[#F5F4F2]'
                  : err('city')
                    ? 'border-[#E11D48] bg-white text-[#171717]'
                    : 'border-[#E5E5E5] bg-white text-[#171717]'
              }`}
              data-testid="result-unlock-city-other"
            >
              <option value="">Друг град…</option>
              {OTHER_CITIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          {err('city') && <p className="mt-1.5 text-[12.5px] text-[#BE123C]">Избери град, за да подберем клиники близо до теб.</p>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-semibold text-[#171717]">Име</span>
            <input
              id="unlock-name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Името ти"
              aria-invalid={err('name')}
              className={`${inputCls} ${err('name') ? 'border-[#E11D48]' : 'border-[#E5E5E5]'}`}
              data-testid="result-unlock-name"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-[#171717]">Телефон</span>
            <input
              id="unlock-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08X XXX XXXX"
              aria-invalid={err('phone')}
              className={`${inputCls} ${err('phone') ? 'border-[#E11D48]' : 'border-[#E5E5E5]'}`}
              data-testid="result-unlock-phone"
            />
            {err('phone') && <span className="mt-1 block text-[12.5px] text-[#BE123C]">Въведи валиден телефон.</span>}
          </label>
        </div>

        <label className="block">
          <span className="text-[13px] font-semibold text-[#171717]">Имейл <span className="font-normal text-[#6B6B6B]">— там ще получиш резултата</span></span>
          <input
            id="unlock-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ime@primer.bg"
            aria-invalid={err('email')}
            className={`${inputCls} ${err('email') ? 'border-[#E11D48]' : 'border-[#E5E5E5]'}`}
            data-testid="result-unlock-email"
          />
          {err('email') && <span className="mt-1 block text-[12.5px] text-[#BE123C]">Въведи валиден имейл.</span>}
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            id="unlock-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-[#A3A3A3] accent-[#0A0A0A] flex-shrink-0"
            data-testid="result-unlock-consent"
          />
          <span className={`text-[12.5px] leading-relaxed ${err('consent') ? 'text-[#BE123C]' : 'text-[#525252]'}`}>
            Съгласявам се Zubite.bg да обработи данните ми във връзка със заявката
            и Zubite.bg и избраната партньорска клиника да се свържат с мен.
          </span>
        </label>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] px-3 py-2 text-[13px] text-[#BE123C]" data-testid="result-unlock-error">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-5 py-4 text-[15px] font-bold text-[#0A0A0A] hover:bg-[#CC5400] transition-colors disabled:opacity-70 disabled:cursor-wait"
          data-testid="result-unlock-submit"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? 'Подбираме клиники…' : cityLabel ? `Покажи клиниките в ${cityLabel}` : 'Покажи подходящите клиники'}
          {!submitting && <ArrowRight className="w-4 h-4" />}
        </button>

        <p className="text-center text-[12px] leading-relaxed text-[#6B6B6B]">
          <ShieldCheck className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-[#007956]" />
          Без задължение. Ти избираш дали и с коя клиника да се свържеш.
        </p>
        <p
          className="text-center text-[11.5px] leading-relaxed text-[#6B6B6B]"
          data-testid="care-pass-contact-clarification"
        >
          Zubite Care Pass е включен при посещение в партньорска клиника — не е
          застраховка или автоматична отстъпка.{' '}
          <Link href="/care-pass" className="underline underline-offset-2 hover:text-[#0A0A0A]">
            Какво е Care Pass
          </Link>
        </p>
      </form>
    </div>
  )
})
