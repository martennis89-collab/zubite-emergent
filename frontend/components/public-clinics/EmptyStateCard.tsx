'use client'

/**
 * <EmptyStateCard />
 * ------------------------------------------------------------------
 * Phase C1 — shared polished empty state used inside tier-included
 * profile sections when the clinic has not (yet) filled in content.
 *
 * Looks intentional and premium, not broken or unfinished. NEVER use
 * for tier-excluded sections — those should not render at all.
 */

import { Sparkles } from 'lucide-react'

interface Props {
  /** Override the default body copy. Keep patient-friendly Bulgarian. */
  message?: string
  /** Optional small label above the message (e.g. "Реални случаи"). */
  hint?: string
  /** Tag for test/data-testid. */
  testid?: string
}

const DEFAULT_MESSAGE =
  'Тази секция е включена в профила, но клиниката все още не е добавила съдържание.'

export default function EmptyStateCard({ message, hint, testid }: Props) {
  return (
    <div
      className="rounded-2xl bg-white/55 ring-1 ring-slate-200/70 px-5 py-6 sm:px-6 sm:py-7 text-slate-600 leading-relaxed"
      data-testid={testid || 'empty-state-card'}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 w-9 h-9 rounded-xl bg-slate-50 ring-1 ring-slate-200/70 grid place-items-center flex-shrink-0"
        >
          <Sparkles className="w-4 h-4 text-slate-400" />
        </span>
        <div className="flex-1">
          {hint && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {hint}
            </p>
          )}
          <p className="text-sm">{message || DEFAULT_MESSAGE}</p>
        </div>
      </div>
    </div>
  )
}
