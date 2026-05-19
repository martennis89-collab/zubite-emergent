'use client'

export interface FunnelStage {
  key: string
  label: string
  count: number
}

interface Props {
  stages: FunnelStage[]
  /** Whether enough data exists to render meaningfully. When false, the parent
   *  should render an empty-state instead — this component still renders, but
   *  visually muted. */
  hasData?: boolean
}

const STAGE_COLORS = [
  'bg-teal-500',
  'bg-teal-400',
  'bg-emerald-400',
  'bg-emerald-500',
  'bg-emerald-600',
]

/** Simple horizontal-bar conversion funnel. No deps. */
export function PerformanceFunnelChart({ stages, hasData = true }: Props) {
  const top = stages[0]?.count ?? 0

  return (
    <ul className="space-y-2.5" data-testid="performance-funnel">
      {stages.map((s, i) => {
        const pctOfTop = top > 0 ? (s.count / top) * 100 : 0
        const pctOfPrev =
          i === 0
            ? null
            : stages[i - 1].count > 0
              ? (s.count / stages[i - 1].count) * 100
              : null

        return (
          <li key={s.key} data-testid={`funnel-stage-${s.key}`}>
            <div className="flex items-baseline justify-between text-sm mb-1">
              <span className="text-slate-700 font-medium">{s.label}</span>
              <span className="text-slate-500 tabular-nums">
                <span className="text-slate-900 font-semibold">{s.count}</span>
                {top > 0 && (
                  <span className="text-xs text-slate-400 ml-1.5">
                    ({pctOfTop.toFixed(0)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="relative h-7 bg-slate-100 rounded-md overflow-hidden">
              <div
                className={`h-full rounded-md ${STAGE_COLORS[i] || 'bg-slate-400'} ${
                  hasData ? '' : 'opacity-40'
                } transition-all duration-500`}
                style={{ width: `${Math.max(top > 0 ? 2 : 0, pctOfTop)}%` }}
              />
              {pctOfPrev != null && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                  {pctOfPrev.toFixed(0)}% от предходния
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
