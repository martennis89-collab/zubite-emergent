'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  X, Loader2, ShieldCheck, CheckCircle2, AlertCircle, Phone,
} from 'lucide-react'
import { treatmentLabel, type PublicClinic } from '@/lib/publicClinics'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Props {
  clinics: PublicClinic[]                       // 1..N selected clinics
  source: 'clinic_card' | 'clinic_profile' | 'clinic_compare'
  consultationType: 'general' | 'online'
  prefillCity?: string | null
  prefillTreatment?: string | null
  // True only when the patient arrived via the diagnostic quiz (a real
  // leadId/chatContext exists) — the quiz already asked what they want to
  // consult about, so the reason dropdown below would be redundant. Every
  // other entry point (browsing clinics cold, a clinic's own profile page)
  // defaults to false and gets asked.
  hasQuizContext?: boolean
  onClose: () => void
  onSuccess?: () => void
}

/**
 * Public-facing contact modal — reused for "Заяви контакт" from a single
 * clinic card AND for compare-tray bulk requests. Does NOT introduce a
 * new backend endpoint; submits one lead per clinic to the existing
 * `POST /api/leads` with `source` tracking the entry point.
 *
 * Wording is intentionally soft. The clinic confirms timing — Zubite
 * never claims a confirmed slot.
 */
export default function PublicContactModal({
  clinics,
  source,
  consultationType,
  prefillCity,
  prefillTreatment,
  hasQuizContext = false,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [consultationReason, setConsultationReason] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const askForReason = !hasQuizContext
  const reasonOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: Array<{ value: string; label: string }> = []
    for (const c of clinics) {
      for (const t of c.treatments || []) {
        if (seen.has(t)) continue
        seen.add(t)
        opts.push({ value: t, label: treatmentLabel(t) })
      }
    }
    return opts
  }, [clinics])

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((element) => element.offsetParent !== null)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!name.trim() || !phone.trim()) {
      setErr('Моля попълни име и телефон.')
      return
    }
    if (askForReason && reasonOptions.length > 0 && !consultationReason) {
      setErr('Моля избери за какво искаш консултация.')
      return
    }
    if (!consent) {
      setErr('Моля потвърди съгласие за обработка на данни.')
      return
    }
    setSubmitting(true)
    try {
      // One lead per selected clinic so the admin can see each contact
      // intent individually. All share the same `source` so analytics
      // can roll them up.
      const results = await Promise.all(
        clinics.map((c) =>
          fetch(`${API_URL}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city_slug:
                prefillCity || c.city_slug || 'sofia',
              treatment_type:
                consultationReason || prefillTreatment || c.treatments[0] || 'general',
              answers: {
                public_clinic_id: c.id,
                public_clinic_name: c.name,
                public_clinic_slug: c.slug,
                consultation_type: consultationType,
                // Kept as plain text alongside treatment_type (which also
                // drives lead scoring) so anyone reading the raw lead sees
                // the patient's stated reason without decoding a score.
                consultation_reason: consultationReason || null,
              },
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim() || null,
              consent: true,
              source: source,
              page_path:
                typeof window !== 'undefined' ? window.location.pathname : null,
            }),
          })
        )
      )
      const failed = results.find((r) => !r.ok)
      if (failed) {
        const body = await failed.json().catch(() => ({}))
        throw new Error(
          body?.detail?.message || body?.detail || 'Не успяхме да изпратим заявката. Опитай отново.'
        )
      }
      setDone(true)
      onSuccess?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не успяхме да изпратим заявката. Провери връзката си и опитай отново.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      data-testid="public-contact-modal"
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 id={titleId} className="font-serif text-lg font-semibold text-slate-900">
            {done
              ? 'Заявката е изпратена'
              : consultationType === 'online'
              ? 'Заяви онлайн консултация'
              : clinics.length > 1
              ? `Заяви контакт от ${clinics.length} клиники`
              : 'Заяви контакт'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-testid="public-contact-close"
            className="grid h-11 w-11 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Затвори"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="p-6 space-y-4" data-testid="public-contact-success">
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-emerald-50 ring-1 ring-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-900">
                <p className="font-medium">Получихме заявката.</p>
                <p className="mt-1 text-emerald-800">
                  {consultationType === 'online'
                    ? 'Изпратихме заявката към клиниката. Тя ще потвърди възможните часове.'
                    : 'Клиниката ще се свърже с теб според процеса си за обработка на заявки.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-5 py-3 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
              data-testid="public-contact-done-close"
            >
              Затвори
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-sm leading-6 text-slate-700">
              {consultationType === 'online'
                ? 'Изпрати заявка. Клиниката ще ти предложи възможни часове за онлайн разговор.'
                : 'Изпрати заявка. Клиниката ще се свърже с теб по телефон или имейл.'}
            </p>
            {/* Selected clinics summary */}
            <div className="rounded-lg bg-slate-50 ring-1 ring-slate-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Избрани клиники
              </p>
              <ul className="space-y-0.5">
                {clinics.map((c) => (
                  <li
                    key={c.id}
                    className="text-sm text-slate-800 truncate"
                    data-testid={`public-contact-selected-${c.id}`}
                  >
                    · {c.name}
                    {c.city_name && (
                      <span className="text-slate-500"> · {c.city_name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {askForReason && reasonOptions.length > 0 && (
              <div>
                <label
                  htmlFor="pcm-reason"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  За какво искаш консултация? <span className="text-rose-500">*</span>
                </label>
                <select
                  id="pcm-reason"
                  value={consultationReason}
                  onChange={(e) => setConsultationReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md ring-1 ring-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  data-testid="public-contact-reason"
                >
                  <option value="" disabled>
                    Избери…
                  </option>
                  {reasonOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  <option value="not_sure">Не съм сигурен/а</option>
                </select>
              </div>
            )}

            {consultationType === 'online' && (
              <p
                className="text-xs text-slate-600 bg-teal-50/60 ring-1 ring-teal-100 px-3 py-2 rounded-md"
                data-testid="public-contact-online-note"
              >
                Изпратете заявка и клиниката ще потвърди възможните часове.
                Онлайн консултацията е първоначална ориентация — окончателна
                диагноза изисква преглед на място.
              </p>
            )}

            <div>
              <label
                htmlFor="pcm-name"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Име <span className="text-rose-500">*</span>
              </label>
              <input
                ref={firstFieldRef}
                id="pcm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="w-full px-3 py-2 rounded-md ring-1 ring-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                data-testid="public-contact-name"
              />
            </div>

            <div>
              <label
                htmlFor="pcm-phone"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Телефон <span className="text-rose-500">*</span>
              </label>
              <input
                id="pcm-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={30}
                inputMode="tel"
                className="w-full px-3 py-2 rounded-md ring-1 ring-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                data-testid="public-contact-phone"
              />
            </div>

            <div>
              <label
                htmlFor="pcm-email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Имейл (по желание)
              </label>
              <input
                id="pcm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={200}
                className="w-full px-3 py-2 rounded-md ring-1 ring-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                data-testid="public-contact-email"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
                data-testid="public-contact-consent"
              />
              <span>
                Съгласен/а съм Zubite.bg да предаде моите данни на избраната(ите)
                клиника(и) с цел връзка относно заявката ми. Виж{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 underline"
                >
                  Политика за поверителност
                </a>
                .
              </span>
            </label>

            {err && (
              <div
                className="flex items-start gap-2 px-3 py-2 rounded-md bg-rose-50 ring-1 ring-rose-200 text-xs text-rose-800"
                data-testid="public-contact-error"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <div className="text-[11px] text-slate-500 flex items-start gap-1.5 leading-snug">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
              <span>
                Zubite.bg не поставя диагноза и не потвърждава часове. Клиниката
                ще се свърже с теб според процеса си.
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="public-contact-submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-medium transition-all hover:-translate-y-0.5 disabled:opacity-60 shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50)]"
              style={{
                backgroundImage:
                  'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
              }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              {submitting ? 'Изпращам…' : 'Изпрати заявка'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
