'use client'

/**
 * <EmptyStateCard />
 * ------------------------------------------------------------------
 * Phase C1 — shared polished empty state.
 * Phase C1.1 — compact variant + reduced default vertical weight.
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
  /** Compact variant — tighter padding, smaller glyph, single line copy. */
  compact?: boolean
}

const DEFAULT_MESSAGE =
  'Тази секция е включена в профила, но клиниката все още не е добавила съдържание.'

export default function EmptyStateCard({
  message, hint, testid, compact = true,
}: Props) {
  return (
    <div
      className={
        'rounded-xl bg-slate-50/60 ring-1 ring-slate-200/60 text-slate-600 leading-relaxed ' +
        (compact ? 'px-3.5 py-3 text-[13px]' : 'px-5 py-5 text-sm')
      }
      data-testid={testid || 'empty-state-card'}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={
            'mt-0.5 rounded-md bg-white ring-1 ring-slate-200/70 grid place-items-center flex-shrink-0 ' +
            (compact ? 'w-6 h-6' : 'w-8 h-8')
          }
        >
          <Sparkles className={compact ? 'w-3 h-3 text-slate-400' : 'w-3.5 h-3.5 text-slate-400'} />
        </span>
        <div className="flex-1">
          {hint && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
              {hint}
            </p>
          )}
          <p>{message || DEFAULT_MESSAGE}</p>
        </div>
      </div>
    </div>
  )
}
