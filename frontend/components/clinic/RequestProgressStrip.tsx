'use client'

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { ProgressShape, PROGRESS_STAGES } from '@/lib/consultationLabels'

/** Visual 5-stage progress strip for a clinic consultation request. */
export function RequestProgressStrip({ shape }: { shape: ProgressShape }) {
  if (shape.kind === 'terminal') {
    const tone =
      shape.tone === 'negative'
        ? { wrap: 'bg-rose-50 border-rose-200 text-rose-700', icon: <XCircle className="w-5 h-5" /> }
        : shape.tone === 'positive'
        ? { wrap: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: <CheckCircle2 className="w-5 h-5" /> }
        : { wrap: 'bg-slate-50 border-slate-200 text-slate-700', icon: <AlertTriangle className="w-5 h-5" /> }
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${tone.wrap}`}
        data-testid="progress-terminal"
      >
        {tone.icon}
        <div className="text-sm font-medium">{shape.label}</div>
      </div>
    )
  }

  // Linear progress visualization. Desktop: full 5-step strip with connectors.
  // Mobile: compact horizontal strip (icons + abbreviated labels).
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4" data-testid="progress-strip">
      <ol className="flex items-start justify-between gap-2 overflow-x-auto">
        {PROGRESS_STAGES.map((stage, idx) => {
          const isDone = idx < shape.reached
          const isCurrent = idx === shape.reached
          const ring = isDone
            ? 'bg-emerald-500 text-white border-emerald-500'
            : isCurrent
            ? 'bg-sky-500 text-white border-sky-500 ring-4 ring-sky-100'
            : 'bg-white text-slate-400 border-slate-200'
          const labelCls = isDone
            ? 'text-emerald-700'
            : isCurrent
            ? 'text-slate-900 font-medium'
            : 'text-slate-400'
          return (
            <li
              key={stage.key}
              className="flex-1 min-w-[64px] flex flex-col items-center text-center"
              data-testid={`stage-${stage.key}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <span
                    className={`h-0.5 flex-1 ${idx <= shape.reached ? 'bg-emerald-400' : 'bg-slate-200'}`}
                  />
                )}
                <span
                  className={`grid place-items-center w-7 h-7 rounded-full border-2 text-xs font-semibold ${ring}`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </span>
                {idx < PROGRESS_STAGES.length - 1 && (
                  <span
                    className={`h-0.5 flex-1 ${idx < shape.reached ? 'bg-emerald-400' : 'bg-slate-200'}`}
                  />
                )}
              </div>
              <div className={`mt-2 text-xs leading-tight ${labelCls}`}>{stage.label}</div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
