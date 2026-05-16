'use client'

import { Star, ExternalLink } from 'lucide-react'
import type { RecommendedClinic } from '@/lib/api'

type Source = NonNullable<RecommendedClinic['review_signals']>['sources'][number]

const PLATFORM_LABEL: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  superdoc: 'Superdoc',
}

const FALLBACK_DISCLAIMER =
  'Данните са публични сигнали от външни платформи и може да се променят.'

function formatLastChecked(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = d.getUTCFullYear()
    return `${dd}.${mm}.${yyyy}`
  } catch {
    return null
  }
}

// Bulgarian plural for "отзив" — 1 = "отзив", anything else = "отзива".
function reviewWord(n: number): string {
  return n === 1 ? 'отзив' : 'отзива'
}

interface Props {
  signals: NonNullable<RecommendedClinic['review_signals']>
}

export function ReviewSignalsSection({ signals }: Props) {
  const sources = signals.sources || []
  if (sources.length === 0) return null

  const lastChecked = formatLastChecked(signals.last_checked_at)
  const disclaimer = signals.disclaimer || FALLBACK_DISCLAIMER

  return (
    <section
      aria-labelledby="review-signals-title"
      data-testid="review-signals-section"
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
    >
      <h2
        id="review-signals-title"
        className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-4"
      >
        Отзиви и доверие
      </h2>

      <ul className="space-y-3">
        {sources.map((src) => (
          <SourceRow key={src.platform} src={src} />
        ))}
      </ul>

      {lastChecked && (
        <p className="mt-4 text-xs text-slate-500" data-testid="review-signals-last-checked">
          Проверено: {lastChecked}
        </p>
      )}

      <p className="mt-2 text-[11px] text-slate-400 leading-snug">
        {disclaimer}
      </p>
    </section>
  )
}

function SourceRow({ src }: { src: Source }) {
  const label = PLATFORM_LABEL[src.platform] || src.platform
  const hasUrl = typeof src.url === 'string' && src.url.length > 0
  const count = `${src.review_count.toLocaleString('bg-BG')} ${reviewWord(src.review_count)}`
  // One decimal, BG locale uses comma; we keep "." for compactness/readability
  // (matches Google/Superdoc UX). This is a number, not a localised string.
  const ratingTxt = src.rating.toFixed(1)

  return (
    <li
      className="flex items-center gap-3 text-sm"
      data-testid={`review-signals-source-${src.platform}`}
    >
      <Star
        className="w-4 h-4 text-amber-500 flex-shrink-0"
        aria-hidden="true"
        fill="currentColor"
      />
      <span className="font-medium text-slate-800 min-w-[80px]">{label}</span>
      <span className="text-slate-700 tabular-nums">{ratingTxt}</span>
      <span className="text-slate-500 text-xs">({count})</span>
      {hasUrl && (
        <a
          href={src.url as string}
          target="_blank"
          rel="noopener nofollow"
          aria-label={`Виж отзивите в ${label} (отваря нов прозорец)`}
          className="ml-auto inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700"
          data-testid={`review-signals-link-${src.platform}`}
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Към профила</span>
        </a>
      )}
    </li>
  )
}
