'use client'

/**
 * SaveCarePassModal
 *
 * Patient-initiated modal on /quiz/success that emails the patient
 * a copy of:
 *   • their risk-band summary,
 *   • Care Pass eligibility wording (oral hygiene only, AFTER consultation),
 *   • Manual Recommendation Mode messaging.
 *
 * Hard rules (kept in sync with /app/frontend/lib/manualRecommendationCopy.ts):
 *   - Never promises instant clinic match / booking / "best clinic".
 *   - Never frames Care Pass as treatment discount / insurance / subscription.
 *   - Explicit consent required before submit — disabled state until checked.
 *   - Email prefilled from the quiz lead when available (URL `email` param)
 *     but always editable.
 *
 * Calls `POST /api/leads/{leadId}/email-care-pass` with
 * `{ email, consent_to_email, name? }` and shows a calm success/failure
 * state. Backend rate-limits to 3 / 5 min / client.
 */

import { useEffect, useRef, useState } from 'react'
import { X, Mail, ShieldCheck, Sparkles, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface SaveCarePassModalProps {
  open: boolean
  onClose: () => void
  leadId: string
  defaultEmail?: string
  defaultName?: string
}

type SubmitState = 'idle' | 'submitting' | 'sent' | 'error'

export function SaveCarePassModal({
  open,
  onClose,
  leadId,
  defaultEmail = '',
  defaultName = '',
}: SaveCarePassModalProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const dialogRef = useRef<HTMLDivElement | null>(null)

  // Reset state and prefill whenever the modal re-opens.
  useEffect(() => {
    if (open) {
      setEmail(defaultEmail || '')
      setConsent(false)
      setState('idle')
      setErrorMsg('')
    }
  }, [open, defaultEmail])

  // ESC to close + simple focus trap entry.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = isValidEmail && consent && state !== 'submitting'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setState('submitting')
    setErrorMsg('')
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${apiUrl}/api/leads/${leadId}/email-care-pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          consent_to_email: consent,
          name: defaultName?.trim() || undefined,
        }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            'Изпратихте твърде много заявки. Опитай отново след няколко минути.',
          )
        }
        let msg = 'Възникна грешка. Опитай отново.'
        try {
          const data = await res.json()
          if (typeof data?.detail === 'object' && data.detail?.message) {
            msg = data.detail.message
          } else if (typeof data?.detail === 'string') {
            msg = data.detail
          }
        } catch { /* ignore */ }
        throw new Error(msg)
      }
      setState('sent')
    } catch (err) {
      setState('error')
      setErrorMsg(
        err instanceof Error ? err.message : 'Възникна грешка. Опитай отново.',
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-care-pass-title"
      data-testid="save-care-pass-modal"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Затвори"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        data-testid="save-care-pass-backdrop"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] overflow-hidden"
      >
        <div aria-hidden className="absolute inset-x-6 top-0.5 h-1/4 rounded-2xl bg-white/40 blur-sm pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Затвори"
          data-testid="save-care-pass-close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-6 sm:p-7">
          {state !== 'sent' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 ring-1 ring-teal-100 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="save-care-pass-title"
                    className="font-serif text-lg sm:text-xl font-semibold text-slate-900 leading-snug"
                  >
                    Запази резултата на имейл
                  </h2>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Ще ти изпратим кратко резюме на твоя ориентир и ясна
                следваща стъпка. Това е ориентир, не диагноза.
              </p>

              {/* What you'll receive — compact chip strip */}
              <ul className="mb-5 flex flex-wrap gap-1.5" data-testid="save-care-pass-bullets">
                {[
                  { icon: ShieldCheck, label: 'Твоят ориентир' },
                  { icon: Sparkles, label: 'Следваща стъпка' },
                  { icon: Mail, label: 'Как продължаваме' },
                ].map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-[12px] text-slate-700 font-medium px-2.5 py-1"
                  >
                    <Icon className="w-3.5 h-3.5 text-teal-600" />
                    {label}
                  </li>
                ))}
              </ul>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Имейл
                  </span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ime@primer.bg"
                    className="mt-1.5 w-full rounded-xl bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400"
                    data-testid="save-care-pass-email-input"
                  />
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    data-testid="save-care-pass-consent-checkbox"
                  />
                  <span className="text-[13px] text-slate-600 leading-relaxed">
                    Съгласен/-сна съм Zubite.bg да ми изпрати моя ориентир
                    на този имейл.
                  </span>
                </label>

                {state === 'error' && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-[13px] text-rose-700"
                    data-testid="save-care-pass-error"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="relative w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white font-semibold shadow-[0_10px_24px_-12px_rgba(13,148,136,0.55)] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
                  }}
                  data-testid="save-care-pass-submit"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0.5 h-1/3 rounded-full bg-white/25 blur-sm pointer-events-none"
                  />
                  {state === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Изпращаме…
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Изпрати на имейла ми
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Zubite не поставя диагноза и не замества преглед при лекар.
                  Можеш да се отпишеш по всяко време.
                </p>
              </form>
            </>
          )}

          {state === 'sent' && (
            <div className="text-center py-2" data-testid="save-care-pass-success">
              <div className="w-12 h-12 rounded-full bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                Готово — изпратихме информацията
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                Провери пощата си на <span className="font-semibold text-slate-800 break-all">{email}</span>.
                Ако не виждаш съобщението, погледни и в папка „Спам".
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                data-testid="save-care-pass-done"
              >
                Затвори
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
