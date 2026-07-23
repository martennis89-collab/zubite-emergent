'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { CITIES } from '@/lib/cityData'
import { trackPatientEvent } from '@/lib/patientAnalytics'

interface ResultUnlockGateProps {
  leadId: string
  defaultCity?: string | null
  onUnlocked: (data: { email: string; citySlug: string }) => void
}

export function ResultUnlockGate({
  leadId,
  defaultCity,
  onUnlocked,
}: ResultUnlockGateProps) {
  const [email, setEmail] = useState('')
  const [citySlug, setCitySlug] = useState(defaultCity || '')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = isValidEmail && Boolean(citySlug) && consent && !submitting

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${apiUrl}/api/leads/${leadId}/unlock-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          city_slug: citySlug,
          consent: true,
        }),
      })

      if (!response.ok) {
        let message = 'Възникна грешка. Опитай отново.'
        try {
          const data = await response.json()
          if (typeof data?.detail === 'object' && data.detail?.message) {
            message = data.detail.message
          } else if (typeof data?.detail === 'string') {
            message = data.detail
          }
        } catch {
          // Keep the calm fallback message.
        }
        throw new Error(message)
      }

      try {
        trackPatientEvent('post_quiz_lead_submitted', { lead_id_present: true })
        trackPatientEvent('full_result_unlocked', { lead_id_present: true })
      } catch {
        // Analytics must never block the patient flow.
      }

      onUnlocked({ email: email.trim(), citySlug })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка. Опитай отново.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section data-testid="result-unlock-gate">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#E7F6F3] text-[#006A61]">
          <Mail className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#006A61]">
            Твоят резултат е готов
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold leading-tight text-black">
            Къде да го изпратим?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#45464D]">
            Ще получиш копие на този резултат и директен линк към него.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" data-testid="result-unlock-form">
        <label className="block">
          <span className="text-xs font-semibold text-[#45464D]">Имейл за резултата</span>
          <div className="relative mt-2">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ime@primer.bg"
              className="w-full rounded-lg border border-[#CBD5E1] bg-white py-3 pl-10 pr-3.5 text-[15px] text-black outline-none transition focus:border-[#006A61] focus:ring-2 focus:ring-[#B3EEE6]"
              data-testid="result-unlock-email"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-[#45464D]">Град</span>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">
            Използваме го само ако след това поискаш препоръки за клиники наблизо.
          </p>
          <div className="relative mt-2">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <select
              required
              value={citySlug}
              onChange={(event) => setCitySlug(event.target.value)}
              className="w-full appearance-none rounded-lg border border-[#CBD5E1] bg-white py-3 pl-10 pr-10 text-[15px] text-black outline-none transition focus:border-[#006A61] focus:ring-2 focus:ring-[#B3EEE6]"
              data-testid="result-unlock-city"
            >
              <option value="">Избери град</option>
              {CITIES.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#CBD5E1] text-[#006A61] focus:ring-[#006A61]"
            data-testid="result-unlock-consent"
          />
          <span className="text-xs leading-5 text-[#64748B]">
            Съгласявам се Zubite.bg да използва имейла ми, за да изпрати този
            резултат. Това не е съгласие клиника да се свърже с мен.
          </span>
        </label>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FFF1F2] px-3 py-2.5 text-sm text-[#93000A]"
            data-testid="result-unlock-error"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#006A61] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#005850] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006A61] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          data-testid="result-unlock-submit"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? 'Изпращаме…' : 'Изпрати резултата'}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>

        <p className="flex items-start justify-center gap-1.5 text-center text-xs leading-5 text-[#64748B]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#006A61]" />
          Резултатът е ориентир и не замества преглед или диагноза.
        </p>
      </form>
    </section>
  )
}
