'use client'

/**
 * <CountUp /> — animates an integer from 0 → `end` when the element
 * scrolls into view. Wraps the existing `useCountUp` hook so callers
 * don't have to thread refs themselves.
 *
 * Mobile-friendly by design:
 *   • IntersectionObserver triggers once → no scroll listener at all
 *   • Animation uses requestAnimationFrame, capped by `duration`
 *   • Respects `prefers-reduced-motion`: in that case the final value
 *     renders immediately, no animation frames at all.
 */

import { useEffect, useRef, useState } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface CountUpProps {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  /** thousands separator locale, default 'bg-BG' (no separator under 10k) */
  locale?: string
  /** Disable animation entirely (used by prefers-reduced-motion path) */
  decimals?: number
}

export function CountUp({
  end,
  duration = 1600,
  prefix = '',
  suffix = '',
  className = '',
  locale = 'bg-BG',
  decimals = 0,
}: CountUpProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 })
  const [value, setValue] = useState(0)
  const hasAnimated = useRef(false)
  const reducedMotion = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return
    hasAnimated.current = true

    if (reducedMotion.current) {
      setValue(end)
      return
    }

    let raf = 0
    let start = 0
    const step = (t: number) => {
      if (!start) start = t
      const progress = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setValue(eased * end)
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    return () => cancelAnimationFrame(raf)
  }, [isVisible, end, duration])

  const formatted = decimals
    ? value.toFixed(decimals)
    : Math.floor(value).toLocaleString(locale)

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
