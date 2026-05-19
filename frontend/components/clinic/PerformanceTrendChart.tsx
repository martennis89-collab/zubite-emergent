'use client'

export interface TrendBucket {
  label: string         // x-axis label (short, e.g. "07.05" or "май")
  booked: number
  attended: number
  /** Optional date range for accessibility / tooltips. */
  rangeLabel?: string
}

interface Props {
  data: TrendBucket[]
}

/** Lightweight grouped-bar chart for booked vs attended counts.
 *  No deps. SVG-based for crisp rendering and tabular labels.
 */
export function PerformanceTrendChart({ data }: Props) {
  const W = 720
  const H = 200
  const PAD_L = 32
  const PAD_R = 16
  const PAD_T = 16
  const PAD_B = 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  if (data.length === 0) {
    return (
      <div className="h-[180px] grid place-items-center text-sm text-slate-400">
        Няма данни за избрания период.
      </div>
    )
  }

  const maxRaw = data.reduce((m, b) => Math.max(m, b.booked, b.attended), 0)
  const maxY = Math.max(4, Math.ceil(maxRaw * 1.2))

  const slotW = innerW / data.length
  const barW = Math.max(4, Math.min(18, slotW * 0.35))

  const y = (v: number) => PAD_T + innerH - (v / maxY) * innerH

  const yTicks = [0, 1, 2, 3, 4].map((t) => Math.round((maxY * t) / 4))

  return (
    <div className="w-full overflow-x-auto" data-testid="performance-trend-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[200px] min-w-[420px]"
        role="img"
        aria-label="Тенденция: резервирани и посетени"
      >
        {/* Y axis */}
        {yTicks.map((t, idx) => {
          const yy = y(t)
          return (
            <g key={idx}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={yy} y2={yy}
                stroke="#e2e8f0" strokeWidth={1}
                strokeDasharray={idx === 0 ? '0' : '3 3'}
              />
              <text
                x={PAD_L - 6} y={yy + 3}
                textAnchor="end" fontSize={10} fill="#94a3b8"
              >
                {t}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((b, i) => {
          const cx = PAD_L + slotW * (i + 0.5)
          const bookedTop = y(b.booked)
          const attendedTop = y(b.attended)
          const bookedH = PAD_T + innerH - bookedTop
          const attendedH = PAD_T + innerH - attendedTop
          return (
            <g key={i} data-testid={`trend-bucket-${i}`}>
              <rect
                x={cx - barW - 1}
                y={bookedTop}
                width={barW}
                height={Math.max(0, bookedH)}
                fill="#0284c7"
                rx={2}
              >
                <title>{`${b.rangeLabel || b.label}: ${b.booked} резервирани`}</title>
              </rect>
              <rect
                x={cx + 1}
                y={attendedTop}
                width={barW}
                height={Math.max(0, attendedH)}
                fill="#059669"
                rx={2}
              >
                <title>{`${b.rangeLabel || b.label}: ${b.attended} посетили`}</title>
              </rect>
              <text
                x={cx}
                y={H - 10}
                textAnchor="middle"
                fontSize={10}
                fill="#64748b"
              >
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex items-center gap-5 text-xs text-slate-600 pl-2 mt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-teal-600" />
          Резервирани
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-600" />
          Посетили
        </span>
      </div>
    </div>
  )
}
