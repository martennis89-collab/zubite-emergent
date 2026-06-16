'use client'

/**
 * ResultUnlockGate
 *
 * MVP Phase B — lead capture gate shown BEFORE the full result on
 * /results/[leadId] when `full_result_unlocked === false`.
 *
 * Hard rules (per product spec):
 *   • Title: "Резултатът ти е готов" — never "free guarantee" wording.
 *   • Value stack lists what unlocks AFTER submission.
 *   • Explicit Care Pass wording: unlocks ONLY after clinic-confirmed
 *     consultation through Zubite.bg — never just from contact submit.
 *   • Consent checkbox is mandatory before submit (gate is disabled).
 *   • Disclaimer that online orientation does NOT replace examination.
 *   • Does not promise free orientation for every user — copy uses
 *     "когато има свободни часове" / "при избрани партньорски клиники".
 *
 * Calls POST /api/leads/{leadId}/unlock-result.
 */

import { useState } from 'react'
import { Lock, ShieldCheck, Sparkles, ArrowRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { trackPatientEvent } from '@/lib/patientAnalytics'

interface ResultUnlockGateProps {
  leadId: string
  defaultName?: string
  onUnlocked: (data: { name: string; phone: string; email: string }) => void
}

export function ResultUnlockGate({ leadId, defaultName, onUnlocked }: ResultUnlockGateProps) {
  const [name, setName] = useState(defaultName || '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Track viewed event once on mount (best-effort, never blocks render).
  // We do it here instead of an effect to keep the component lean — the
  // tracking fn is a no-op if GA is not yet initialised.
  if (typeof window !== 'undefined' && !(window as unknown as { __zubLeadGateSeen?: boolean }).__zubLeadGateSeen) {
    ;(window as unknown as { __zubLeadGateSeen?: boolean }).__zubLeadGateSeen = true
    try { trackPatientEvent('post_quiz_lead_capture_viewed', { lead_id_present: true }) } catch { /* ignore */ }
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit =
    name.trim().length >= 1 &&
    phone.trim().length >= 4 &&
    isValidEmail &&
    consent &&
    !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
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
      onUnlocked({ name: name.trim(), phone: phone.trim(), email: email.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка. Опитай отново.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="relative rounded-[1.75rem] bg-white/80 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] p-7 sm:p-9"
      data-testid="result-unlock-gate"
    >
      <div aria-hidden className="absolute inset-x-8 top-0.5 h-1/3 rounded-full bg-gradient-to-b from-white/55 to-transparent pointer-events-none opacity-70" />

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 ring-1 ring-teal-100 text-[11px] uppercase tracking-[0.16em] text-teal-700 font-semibold px-3 py-1">
          <Lock className="w-3 h-3" />
          Резултатът е готов
        </span>
        <h1 className="mt-4 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
          Резултатът ти е готов
        </h1>
        <p className="mt-3 text-slate-600 text-[15px] leading-relaxed">
          Остави данни, за да видиш персоналния си резултат и
          свободни безплатни онлайн часове с подходящи партньорски клиники.
        </p>

        {/* Value stack — what unlocks */}
        <ul className="mt-5 space-y-2.5" data-testid="result-unlock-value-stack">
          {[
            'Персонален резултат според отговорите ти',
            'Подходящи партньорски клиники',
            'Свободни безплатни онлайн часове, когато са налични',
            'Възможност за онлайн или присъствена консултация',
            'Zubite Care Pass след запазена и потвърдена от клиниката консултация през Zubite.bg',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5" data-testid={`result-unlock-value-${i}`}>
              <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <span className="text-[14px] text-slate-700 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>

        {/* Care Pass incentive block */}
        <div className="mt-5 rounded-2xl bg-teal-50/70 ring-1 ring-teal-100 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" />
            <div className="text-[13px] text-slate-700 leading-relaxed">
              Ако запазиш онлайн или присъствена консултация през Zubite.bg
              и клиниката я потвърди, ще отключиш <strong>Zubite Care Pass</strong> —
              достъп до специални отстъпки и партньорски предложения за продукти за орална хигиена.
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          Безплатните онлайн часове са налични при избрани партньорски клиники
          и според свободните им слотове.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3" data-testid="result-unlock-form">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Име</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Името ти"
              className="mt-1.5 w-full rounded-xl bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400"
              data-testid="result-unlock-name"
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Телефон</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+359 ..."
              className="mt-1.5 w-full rounded-xl bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400"
              data-testid="result-unlock-phone"
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Имейл</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ime@primer.bg"
              className="mt-1.5 w-full rounded-xl bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400"
              data-testid="result-unlock-email"
            />
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 flex-shrink-0"
              data-testid="result-unlock-consent"
            />
            <span className="text-[12px] text-slate-600 leading-relaxed">
              Съгласявам се Zubite.bg да обработи данните ми във връзка със заявката
              и Zubite.bg и избраната партньорска клиника да се свържат с мен.
            </span>
          </label>

          {/* Care Pass clarification — placed near the consent area so the
              expectation is set BEFORE submit. Wording is calm, not a legal
              wall, and explicitly reverses common patient assumptions. */}
          <p
            className="text-[11.5px] text-slate-500 leading-relaxed bg-slate-50/80 ring-1 ring-slate-200/60 rounded-lg px-3 py-2.5"
            data-testid="care-pass-contact-clarification"
          >
            Оставянето на контакт не отключва Care Pass автоматично. Care Pass може да стане активен след реално проведена физическа консултация в участваща клиника.
          </p>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-[13px] text-rose-700" data-testid="result-unlock-error">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="relative w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-white font-semibold shadow-[0_14px_30px_-12px_rgba(13,148,136,0.55)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            data-testid="result-unlock-submit"
          >
            <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/3 rounded-full bg-white/20 blur-sm pointer-events-none" />
            <span className="relative inline-flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? 'Изпращаме…' : 'Покажи ми резултата'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </span>
          </button>

          <p className="text-center text-[11px] text-slate-500 leading-relaxed pt-1">
            <ShieldCheck className="w-3 h-3 inline -mt-0.5 mr-1 text-teal-600" />
            Няма да получаваш диагноза онлайн. Zubite.bg ти помага да се
            ориентираш към подходяща следваща стъпка.
          </p>
        </form>
      </div>
    </div>
  )
}
