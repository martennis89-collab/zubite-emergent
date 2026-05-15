'use client'

import { useId } from 'react'

export interface TrendPoint {
  date: string      // YYYY-MM-DD
  assigned: number
  booked: number
}

/** Lightweight SVG line chart for the clinic dashboard. No deps. */
export function WeeklyTrendChart({ data }: { data: TrendPoint[] }) {
  const gradId = useId().replace(/:/g, '_')
  const W = 720
  const H = 220
  const PAD_L = 32
  const PAD_R = 16
  const PAD_T = 16
  const PAD_B = 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const points = data.length > 0 ? data : []
  const maxRaw = points.reduce(
    (m, p) => Math.max(m, p.assigned, p.booked),
    0,
  )
  const maxY = Math.max(4, Math.ceil(maxRaw * 1.2)) // headroom, min scale 4

  const x = (i: number) =>
    PAD_L + (points.length <= 1 ? innerW / 2 : (i * innerW) / (points.length - 1))
  const y = (v: number) => PAD_T + innerH - (v / maxY) * innerH

  const pathFor = (key: 'assigned' | 'booked') =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`)
      .join(' ')

  const areaFor = (key: 'assigned' | 'booked') => {
    if (points.length === 0) return ''
    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`)
      .join(' ')
    return `${line} L ${x(points.length - 1).toFixed(1)} ${(PAD_T + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(PAD_T + innerH).toFixed(1)} Z`
  }

  // Y-axis tick lines (4 lines).
  const yTicks = [0, 1, 2, 3, 4].map((t) => Math.round((maxY * t) / 4))

  const dayLabel = (iso: string) => {
    try {
      const d = new Date(iso + 'T00:00:00')
      return d.toLocaleDateString('bg-BG', { weekday: 'short' })
    } catch {
      return iso.slice(5)
    }
  }

  return (
    <div className="w-full overflow-x-auto" data-testid="weekly-trend-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[220px] min-w-[480px]"
        role="img"
        aria-label="Седмична тенденция"
      >
        <defs>
          <linearGradient id={`a-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`b-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid */}
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

        {/* Areas */}
        <path d={areaFor('assigned')} fill={`url(#a-${gradId})`} />
        <path d={areaFor('booked')} fill={`url(#b-${gradId})`} />

        {/* Lines */}
        <path
          d={pathFor('assigned')}
          fill="none" stroke="#0284c7" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d={pathFor('booked')}
          fill="none" stroke="#059669" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p, i) => (
          <g key={p.date}>
            <circle cx={x(i)} cy={y(p.assigned)} r={3} fill="#fff" stroke="#0284c7" strokeWidth={1.5} />
            <circle cx={x(i)} cy={y(p.booked)} r={3} fill="#fff" stroke="#059669" strokeWidth={1.5} />
            <text
              x={x(i)} y={H - 10}
              textAnchor="middle" fontSize={10} fill="#64748b"
            >
              {dayLabel(p.date)}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-5 text-xs text-slate-600 pl-2 mt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-sky-600 rounded" />
          Назначени заявки
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-emerald-600 rounded" />
          Резервации
        </span>
      </div>
    </div>
  )
}
