'use client'

/**
 * <ParallaxFloat /> — wraps a small decorative element (chip, badge,
 * floating card) and applies a subtle parallax based on user input:
 *
 *   • Desktop (fine pointer): mouse-driven parallax — the wrapped
 *     element drifts toward / away from the cursor by ±10px max.
 *   • Mobile / touch (coarse pointer): scroll-driven sway — the
 *     element shifts ±4px on Y axis based on viewport scroll,
 *     read from the global `--py` variable that
 *     `useBackgroundParallax` already publishes on <html>.
 *   • Reduced motion: no effect, renders as a normal <div>.
 *
 * All transforms are GPU-composited via `translate3d` + `will-change`.
 * One global mousemove listener per page (rAF-throttled), removed on
 * unmount. No layout reads in the hot path.
 */

import { useEffect, useRef } from 'react'

interface ParallaxFloatProps {
  children: React.ReactNode
  /** desktop max drift in px (±) along each axis */
  strength?: number
  /** mobile scroll-driven Y drift factor; default keeps it gentle */
  mobileFactor?: number
  className?: string
}

export function ParallaxFloat({
  children,
  strength = 8,
  mobileFactor = 0.025,
  className = '',
}: ParallaxFloatProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const isCoarse = window.matchMedia('(pointer: coarse)').matches

    let raf = 0
    let tx = 0
    let ty = 0
    const apply = () => {
      el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`
      raf = 0
    }
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(apply)
    }

    let unsub: (() => void) | null = null

    if (isCoarse) {
      // Mobile: drift on scroll using global --py from
      // useBackgroundParallax (cheap because it's already published).
      const onScroll = () => {
        const py = parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--py') || '0',
        )
        ty = -py * mobileFactor
        schedule()
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
      unsub = () => window.removeEventListener('scroll', onScroll)
    } else {
      // Desktop: mouse-parallax with center-of-viewport origin.
      const w = window.innerWidth
      const h = window.innerHeight
      const onMove = (e: MouseEvent) => {
        const dx = (e.clientX - w / 2) / (w / 2) // -1..1
        const dy = (e.clientY - h / 2) / (h / 2) // -1..1
        tx = dx * strength
        ty = dy * strength
        schedule()
      }
      window.addEventListener('mousemove', onMove, { passive: true })
      unsub = () => window.removeEventListener('mousemove', onMove)
    }

    el.style.willChange = 'transform'

    return () => {
      if (raf) cancelAnimationFrame(raf)
      unsub?.()
      el.style.willChange = ''
      el.style.transform = ''
    }
  }, [strength, mobileFactor])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
