'use client'

/**
 * Public-facing approved reviews section for the clinic profile page (R2).
 *
 * Fetches `GET /api/public/clinics/{clinicId}/reviews` and renders only
 * approved + display-permitted reviews. Backend already filters; this
 * component never receives pending/rejected/private/admin data.
 *
 * Failure mode: if the fetch fails, the section renders nothing — the
 * rest of the clinic profile must keep working.
 */
import { useEffect, useState } from 'react'
import { Star, MessageSquare, ShieldCheck, ExternalLink } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface PublicReview {
  id: string
  rating_overall?: number | null
  feedback_text?: string | null
  patient_display_name?: string | null
  treatment_type?: string | null
  approved_at?: string | null
  submitted_at?: string | null
}

interface Summary {
  count: number
  rated_count: number
  average_rating: number | null
}

interface PublicReviewsPayload {
  clinic_id: string
  summary: Summary | null
  reviews: PublicReview[]
}

interface Props {
  clinicId: string
  /**
   * Optional explicit URL to the public review submission page. When
   * not supplied, the component derives it from `window.location.origin`
   * after hydration so the CTA is always present in the browser even
   * if the parent renders before `window` is available.
   */
  reviewUrl?: string | null
}

const TREATMENT_LABELS: Record<string, string> = {
  alaynery: 'Алайнери',
  braketi: 'Брекети',
  obsht: 'Обща стоматология',
  estetika: 'Естетична стоматология',
  izbelvane: 'Избелване',
  drugi: 'Други',
}

function formatDate(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('bg-BG', {
      year: 'numeric', month: 'long',
    })
  } catch {
    return ''
  }
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-500"
      aria-label={`Оценка ${rating} от 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          fill={i < rating ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

function ReviewCard({ r }: { r: PublicReview }) {
  const treatment = r.treatment_type
    ? (TREATMENT_LABELS[r.treatment_type] || r.treatment_type)
    : null
  const when = formatDate(r.approved_at || r.submitted_at)
  const rating = typeof r.rating_overall === 'number' ? r.rating_overall : 0

  // Long-feedback truncation for the patient view. Default cap is
  // generous so most reviews show fully; the "Покажи още" toggle is
  // only used when the feedback is unusually long.
  const FULL_CAP = 380
  const text = (r.feedback_text || '').toString()
  const isLong = text.length > FULL_CAP
  const [expanded, setExpanded] = useState(false)
  const visible = !isLong || expanded ? text : text.slice(0, FULL_CAP).trimEnd() + '…'

  return (
    <article
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col gap-3"
      data-testid={`public-review-card-${r.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {r.patient_display_name || 'Пациент на клиниката'}
          </p>
          {(treatment || when) && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              {[treatment, when].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {rating > 0 && <StarRow rating={rating} />}
      </header>

      {/*
        feedback_text is delivered already HTML-escaped from the
        backend (html.escape on save). React renders it as plain text
        — there is NO dangerouslySetInnerHTML anywhere in this file,
        so unescaped HTML is impossible.
      */}
      <p
        className="text-sm text-slate-700 leading-relaxed whitespace-pre-line"
        data-testid={`public-review-text-${r.id}`}
      >
        {visible}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-xs font-medium text-teal-700 hover:text-teal-800"
          data-testid={`public-review-toggle-${r.id}`}
        >
          {expanded ? 'Скрий' : 'Покажи още'}
        </button>
      )}

      <p className="inline-flex items-center gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
        <ShieldCheck className="w-3 h-3 text-teal-600" />
        Прегледано от Zubite
      </p>
    </article>
  )
}

export function PublicReviewsSection({ clinicId, reviewUrl }: Props) {
  const [data, setData] = useState<PublicReviewsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [resolvedReviewUrl, setResolvedReviewUrl] = useState<string | null>(
    reviewUrl ?? null,
  )

  // Resolve the review URL from window.location.origin on the client
  // when the parent didn't supply one explicitly. Keeps SSR-safe.
  useEffect(() => {
    if (reviewUrl) {
      setResolvedReviewUrl(reviewUrl)
      return
    }
    if (typeof window !== 'undefined' && window.location?.origin && clinicId) {
      setResolvedReviewUrl(`${window.location.origin}/review/clinic/${clinicId}`)
    }
  }, [reviewUrl, clinicId])

  useEffect(() => {
    if (!clinicId) return
    let alive = true
    const run = async () => {
      try {
        const r = await fetch(
          `${API_URL}/api/public/clinics/${clinicId}/reviews`,
        )
        if (r.status === 404) {
          if (alive) {
            setData({ clinic_id: clinicId, summary: null, reviews: [] })
          }
          return
        }
        if (!r.ok) throw new Error('load')
        const j = (await r.json()) as PublicReviewsPayload
        if (alive) setData(j)
      } catch {
        if (alive) setErrored(true)
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [clinicId])

  // Fail-soft: if the endpoint errored or hasn't returned yet, render
  // a calm skeleton rather than crashing the profile.
  if (errored) return null

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        data-testid="profile-reviews-section-loading"
        aria-busy="true"
      >
        <div className="h-5 w-48 rounded bg-slate-100 animate-pulse" />
        <div className="mt-3 h-4 w-72 rounded bg-slate-100 animate-pulse" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-2xl bg-slate-50 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-50 animate-pulse" />
        </div>
      </section>
    )
  }

  const reviews = data?.reviews ?? []
  const summary = data?.summary ?? null
  const hasReviews = reviews.length > 0

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
      data-testid="profile-reviews-section"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900">
            Мнения от пациенти
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl">
            Показваме само мнения, които са прегледани преди публично
            публикуване.
          </p>
        </div>
        {summary && summary.average_rating !== null && summary.rated_count > 0 && (
          <div
            className="inline-flex items-center gap-2 rounded-full bg-teal-50 ring-1 ring-teal-100 px-3 py-1.5"
            data-testid="profile-reviews-summary"
          >
            <StarRow rating={Math.round(summary.average_rating)} />
            <span className="text-sm font-medium text-slate-900">
              {summary.average_rating.toFixed(1)} / 5
            </span>
            <span className="text-[11px] text-slate-500">
              от {summary.count} {summary.count === 1 ? 'мнение' : 'мнения'}
            </span>
          </div>
        )}
      </div>

      {hasReviews ? (
        <div
          className="mt-5 grid gap-3 sm:gap-4 sm:grid-cols-2"
          data-testid="profile-reviews-list"
        >
          {reviews.map((r) => (
            <ReviewCard key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <div
          className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center"
          data-testid="profile-reviews-empty"
        >
          <MessageSquare className="w-5 h-5 text-slate-300 mx-auto mb-1.5" aria-hidden />
          <p className="text-xs sm:text-sm text-slate-500">
            Все още няма публично одобрени мнения за тази клиника.
          </p>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[11px] text-slate-400 leading-snug max-w-xl">
          Мненията се преглеждат преди публично показване. Zubite не
          потвърждава медицински резултати и не заменя преглед при лекар.
        </p>
        {resolvedReviewUrl && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              За съществуващи пациенти.
            </span>
            <button
              type="button"
              onClick={() =>
                window.open(resolvedReviewUrl, '_blank', 'noopener,noreferrer')
              }
              className="inline-flex items-center gap-1.5 rounded-full ring-1 ring-teal-200 text-teal-700 hover:bg-teal-50 px-3 py-1.5 text-xs font-medium transition-colors"
              data-testid="profile-reviews-leave-cta"
            >
              <ExternalLink className="w-3 h-3" />
              Оставете мнение за тази клиника
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
