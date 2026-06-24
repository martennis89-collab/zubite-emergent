'use client'

/**
 * <WordMorph /> — cycles through a small list of words in place with
 * a soft fade + slight Y translation. Used inside a serif H1 to give
 * the headline a "living" feel without distracting from readability.
 *
 * Mobile optimization:
 *   • interval is bumped to 2800ms on coarse-pointer devices (touch /
 *     mobile) so the page doesn't repaint every 1.6s when scrolling
 *   • respects `prefers-reduced-motion: reduce` → renders only the
 *     first word, no animation, no timer at all
 *   • transitions are GPU-friendly (opacity + transform only)
 *
 * Usage: wrap a span in your H1 with this component and pass a list
 * of synonyms — Zubite tone (keep them all neutral, never claims).
 */

import { useEffect, useState, useRef } from 'react'

interface WordMorphProps {
  words: string[]
  /** ms between transitions; doubled on touch devices */
  interval?: number
  className?: string
}

export function WordMorph({ words, interval = 2200, className = '' }: WordMorphProps) {
  const [index, setIndex] = useState(0)
  const [animating, setAnimating] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || words.length <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Bump interval on touch/coarse pointer devices to spare battery
    // and minimise repaints while the user scrolls.
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const tick = coarse ? interval * 1.4 : interval

    const cycle = () => {
      setAnimating(true)
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % words.length)
        setAnimating(false)
      }, 280) // matches CSS transition duration below
    }
    timer.current = window.setInterval(cycle, tick)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [interval, words.length])

  // Track widest word so the surrounding line never re-flows.
  // Inline-block with min-width:max-content keeps layout stable.
  return (
    <span
      className={'inline-block align-baseline ' + className}
      style={{ minWidth: 'max-content' }}
    >
      <span
        aria-live="polite"
        className="inline-block transition-all duration-[280ms] ease-out"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(-6px)' : 'translateY(0)',
          willChange: 'opacity, transform',
        }}
      >
        {words[index]}
      </span>
    </span>
  )
}
