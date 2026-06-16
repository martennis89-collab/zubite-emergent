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
  /** Adapt for dark background — ivory text, soft border, no harsh grey. */
  dark?: boolean
}

const DEFAULT_MESSAGE =
  'Тази секция е включена в профила, но клиниката все още не е добавила съдържание.'

export default function EmptyStateCard({
  message, hint, testid, compact = true, dark = false,
}: Props) {
  const surface = dark
    ? 'bg-white/[0.06] ring-1 ring-white/15 text-slate-200'
    : 'bg-slate-50/60 ring-1 ring-slate-200/60 text-slate-600'
  const glyphBg = dark
    ? 'bg-white/10 ring-1 ring-white/15'
    : 'bg-white ring-1 ring-slate-200/70'
  const glyphColor = dark ? 'text-teal-300' : 'text-slate-400'
  const hintColor = dark ? 'text-slate-300' : 'text-slate-400'
  return (
    <div
      className={
        'rounded-xl leading-relaxed ' + surface + ' ' +
        (compact ? 'px-3.5 py-3 text-[13px]' : 'px-5 py-5 text-sm')
      }
      data-testid={testid || 'empty-state-card'}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={
            'mt-0.5 rounded-md grid place-items-center flex-shrink-0 ' + glyphBg + ' ' +
            (compact ? 'w-6 h-6' : 'w-8 h-8')
          }
        >
          <Sparkles className={(compact ? 'w-3 h-3 ' : 'w-3.5 h-3.5 ') + glyphColor} />
        </span>
        <div className="flex-1">
          {hint && (
            <p className={'text-[10px] font-semibold uppercase tracking-wider mb-0.5 ' + hintColor}>
              {hint}
            </p>
          )}
          <p>{message || DEFAULT_MESSAGE}</p>
        </div>
      </div>
    </div>
  )
}
