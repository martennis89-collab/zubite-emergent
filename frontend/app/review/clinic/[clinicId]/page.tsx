'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Star, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ReviewInfo {
  clinic_id: string
  clinic_name: string
  city_name?: string | null
  review_url: string
}

export default function PublicClinicReviewPage() {
  const params = useParams<{ clinicId: string }>()
  const clinicId = params?.clinicId || ''

  const [info, setInfo] = useState<ReviewInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [rating, setRating] = useState<number>(0)
  const [name, setName] = useState('')
  const [treatment, setTreatment] = useState('')
  const [feedback, setFeedback] = useState('')
  const [privateNote, setPrivateNote] = useState('')
  const [contact, setContact] = useState('')
  const [consentPublic, setConsentPublic] = useState(false)
  const [consentContact, setConsentContact] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!clinicId) return
    let alive = true
    const run = async () => {
      try {
        const r = await fetch(`${API_URL}/api/public/clinics/${clinicId}/review-info`)
        if (r.status === 404) {
          if (alive) setNotFound(true)
          return
        }
        if (!r.ok) throw new Error('load')
        const data = await r.json()
        if (alive) setInfo(data)
      } catch {
        if (alive) setNotFound(true)
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [clinicId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (rating < 1) { setError('Моля, изберете оценка от 1 до 5 звезди.'); return }
    const fb = feedback.trim()
    if (fb.length < 10) { setError('Моля, въведете поне 10 символа в обратната връзка.'); return }
    if (!consentPublic) {
      setError(
        'Необходимо е да се съгласите обратната ви връзка да бъде прегледана от Zubite, за да я изпратим.'
      )
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch(`${API_URL}/api/public/clinics/${clinicId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating_overall: rating,
          feedback_text: fb,
          patient_name_optional: name.trim() || undefined,
          treatment_type: treatment.trim() || undefined,
          private_note_to_clinic: privateNote.trim() || undefined,
          patient_contact_optional: contact.trim() || undefined,
          consent_public_display: true,
          consent_contact_if_needed: consentContact,
          source: 'clinic_link',
        }),
      })
      if (r.status === 429) {
        setError('Твърде много опити. Моля, опитайте по-късно.')
        return
      }
      if (!r.ok) throw new Error('submit')
      setDone(true)
    } catch {
      setError('Възникна грешка при изпращане. Моля, опитайте отново.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 grid place-items-center">
        <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
      </main>
    )
  }
  if (notFound || !info) {
    return (
      <main className="min-h-screen bg-slate-50 grid place-items-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-2xl font-semibold text-slate-900 mb-2">
            Клиниката не е намерена
          </h1>
          <p className="text-sm text-slate-600">
            Линкът може да е грешен или клиниката вече не е активна в Zubite.bg.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mt-5 text-sm text-sky-600 hover:text-sky-700"
          >
            Към Zubite.bg
          </Link>
        </div>
      </main>
    )
  }

  if (done) {
    return (
      <main className="min-h-screen bg-slate-50 grid place-items-center px-6 py-12">
        <div
          className="max-w-md text-center bg-white rounded-2xl border border-slate-200 p-8"
          data-testid="review-success-state"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-xl font-semibold text-slate-900 mb-2">
            Благодарим
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Обратната връзка ще бъде прегледана преди публикуване.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mt-6 text-sm text-sky-600 hover:text-sky-700"
            data-testid="review-success-home-link"
          >
            Към Zubite.bg
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14" data-testid="review-page">
      <div className="max-w-xl mx-auto">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 mb-1">
            Zubite.bg
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
            Оставете обратна връзка за тази клиника
          </h1>
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">{info.clinic_name}</span>
            {info.city_name ? <span className="text-slate-500"> · {info.city_name}</span> : null}
          </p>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">
            Вашата обратна връзка помага на бъдещи пациенти да направят
            по-информиран избор. Преди да се покаже публично, ще бъде прегледана
            от екипа на Zubite.
          </p>
        </header>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5"
          data-testid="review-form"
        >
          {/* Rating */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Оценка <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Оценка">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-checked={rating === n}
                  role="radio"
                  className={
                    'p-1.5 rounded-md transition-colors ' +
                    (rating >= n ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300')
                  }
                  data-testid={`review-rating-${n}`}
                >
                  <Star className="w-7 h-7" fill={rating >= n ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Име (по желание)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван П."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
              data-testid="review-name-input"
            />
          </div>

          {/* Treatment */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Тип лечение / преглед (по желание)
            </label>
            <input
              type="text"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="напр. Алайнери, Профилактика…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
              data-testid="review-treatment-input"
            />
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Публична обратна връзка <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Споделете опита си от посещението — без медицински детайли или диагнози."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 leading-relaxed"
              data-testid="review-feedback-input"
            />
          </div>

          {/* Private note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Лично съобщение към клиниката (по желание)
            </label>
            <textarea
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              rows={3}
              placeholder="Не се показва публично. Само клиниката ще го види."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 leading-relaxed"
              data-testid="review-private-note-input"
            />
          </div>

          {/* Optional contact */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Контакт (по желание)
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email или телефон, ако желаете да ви потърсим"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
              data-testid="review-contact-input"
            />
          </div>

          {/* Consents */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                checked={consentPublic}
                onChange={(e) => setConsentPublic(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300"
                data-testid="review-consent-public"
              />
              <span>
                Съгласен/съгласна съм обратната ми връзка да бъде прегледана от
                Zubite и, ако бъде одобрена, да бъде показана публично.
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                checked={consentContact}
                onChange={(e) => setConsentContact(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300"
                data-testid="review-consent-contact"
              />
              <span>
                Съгласен/съгласна съм Zubite да се свърже с мен при нужда от
                уточнение.
              </span>
            </label>
          </div>

          {error && (
            <div
              className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3 inline-flex items-start gap-2"
              data-testid="review-form-error"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white text-sm font-medium rounded-full transition-colors"
            data-testid="review-submit-btn"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Изпрати обратна връзка
          </button>

          <p className="text-[11px] text-slate-500 leading-relaxed inline-flex items-start gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <span>
              Zubite не поставя диагноза и не потвърждава медицински резултати.
              Споделяйте впечатления, не лични здравни данни.
            </span>
          </p>
        </form>
      </div>
    </main>
  )
}
