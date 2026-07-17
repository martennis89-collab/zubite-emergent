'use client'

/**
 * Shared utilities, hooks and constants for the homepage section
 * components (`/components/home/*`). Extracted from the previous
 * monolithic `HomeContent.tsx` in Feb 2026 so each section can live
 * in its own file without re-declaring helpers.
 */

import { useEffect, useRef, useState } from 'react'

// ─── Public types ──────────────────────────────────────────────────
export interface HomeBlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  featured_image: string | null
  published_at: string
}

// ─── Shared constants ──────────────────────────────────────────────
export const QUIZ_URL = '/quiz'

// Last remaining Emergent-hosted decorative asset. Only the (currently
// unrendered) CarePassTeaser references it; /care-pass has its own copy.
// Replace with a locally-hosted asset if the teaser ever returns.
export const ASSET_E_CARE_PASS_CARD =
  'https://customer-assets.emergentagent.com/job_25b55d94-1ed6-49c7-af05-4dd6f19863cf/artifacts/kyba9eaq_ChatGPT%20Image%20May%2017%2C%202026%2C%2010_21_45%20AM.png'

// ─── Reveal-on-scroll helper ───────────────────────────────────────
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true)
            io.disconnect()
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, shown }
}

// ─── Lightweight parallax — single rAF scroll → CSS var `--py` ────
// Background decorative elements use
//   style={{ transform: 'translate3d(0, calc(var(--py,0) * -0.08px), 0)' }}
// to drift opposite to scroll, creating depth without re-renders.
// Honors prefers-reduced-motion: if reduced, --py stays at 0 forever.
export function useBackgroundParallax() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    let raf = 0
    const update = () => {
      document.documentElement.style.setProperty('--py', String(window.scrollY))
      raf = 0
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
}

// Inline style helper — px-based parallax offset bound to --py.
// Use a small factor (±0.04 → 0.12) to keep things barely-noticeable.
export const px = (factor: number): React.CSSProperties => ({
  transform: `translate3d(0, calc(var(--py, 0) * ${factor}px), 0)`,
  willChange: 'transform',
})

// ─── Reveal wrapper component ──────────────────────────────────────
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={
        'transition-all duration-700 ease-out ' +
        (shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4') +
        ' ' +
        className
      }
    >
      {children}
    </div>
  )
}

// ─── Global motion styles ──────────────────────────────────────────
// Centralised keyframes + reduced-motion fallback. Same definitions as
// before the refactor; deduplicated by the browser if any other file
// re-declares an identically-named keyframe.
export function MotionStyles() {
  return (
    <style jsx global>{`
      /* Slow vertical drift — used by stacked depth cards & subtle bg shapes */
      @keyframes floatSlow {
        0%, 100% { transform: translate3d(0, 0, 0) }
        50%      { transform: translate3d(0, -10px, 0) }
      }
      @keyframes floatSlower {
        0%, 100% { transform: translate3d(0, 0, 0) }
        50%      { transform: translate3d(0, -14px, 0) }
      }
      /* Tiny X+Y sway — used by background decorative shapes */
      @keyframes driftSlow {
        0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) }
        50%      { transform: translate3d(6px, -8px, 0) rotate(0.6deg) }
      }
      /* Breathing glow — used by orb halo + light leaks */
      @keyframes breatheGlow {
        0%, 100% { opacity: 0.55; transform: scale(1) }
        50%      { opacity: 0.85; transform: scale(1.04) }
      }
      /* Diagonal shimmer sweep — used on Care Pass card highlight */
      @keyframes shimmerSweep {
        0%   { transform: translateX(-120%) skewX(-12deg); opacity: 0 }
        15%  { opacity: 0.55 }
        50%  { opacity: 0.85 }
        85%  { opacity: 0.40 }
        100% { transform: translateX(220%) skewX(-12deg); opacity: 0 }
      }
      /* Reduced-motion fallback */
      @media (prefers-reduced-motion: reduce) {
        .motion-safe-animate, [class*="animate-["],
        [style*="animation"] {
          animation: none !important;
        }
        [data-parallax] {
          transform: none !important;
        }
      }
    `}</style>
  )
}
