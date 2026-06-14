'use client'

import { useState } from 'react'
import {
  X, Loader2, ShieldCheck, CheckCircle2, AlertCircle, Phone,
} from 'lucide-react'
import type { PublicClinic } from '@/lib/publicClinics'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Props {
  clinics: PublicClinic[]                       // 1..N selected clinics
  source: 'clinic_card' | 'clinic_profile' | 'clinic_compare'
  consultationType: 'general' | 'online'
  prefillCity?: string | null
  prefillTreatment?: string | null
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
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!name.trim() || !phone.trim()) {
      setErr('Моля попълни име и телефон.')
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
                prefillTreatment || c.treatments[0] || 'general',
              answers: {
                public_clinic_id: c.id,
                public_clinic_name: c.name,
                public_clinic_slug: c.slug,
                consultation_type: consultationType,
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
          body?.detail?.message || body?.detail || 'Грешка при изпращане.'
        )
      }
      setDone(true)
      onSuccess?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Неочаквана грешка.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      data-testid="public-contact-modal"
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-slate-900">
            {done
              ? 'Заявката е изпратена'
              : consultationType === 'online'
              ? 'Заяви онлайн консултация'
              : clinics.length > 1
              ? `Заяви контакт от ${clinics.length} клиники`
              : 'Заяви контакт от клиниката'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-testid="public-contact-close"
            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
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
