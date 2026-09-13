'use client'

/**
 * A large centered quote whose characters fill from light grey to
 * --taste-ink as the section scrolls through the viewport, left to right,
 * reading-order. Words listed in `keyPhrases` fill to --taste-emerald
 * instead of --taste-ink, so the two or three words that matter stay
 * visually distinct even at full scroll.
 *
 * Scroll-scrubbed (not a one-shot reveal): progress is derived directly
 * from the section's position each frame, so scrolling back up un-fills
 * it — matches the rest of the page's plain-JS/IntersectionObserver
 * animation style rather than pulling in a library for one effect.
 */

import { useEffect, useMemo, useRef } from 'react'

const UNFILLED = '#d9d9d9'
const FILLED = 'var(--taste-ink)'
const FILLED_KEY = 'var(--taste-emerald)'

interface ScrollFillQuoteProps {
  text: string
  keyPhrases: string[]
}

interface WordToken {
  chars: string[]
  isKey: boolean
  trailingSpace: boolean
}

function tokenize(text: string, keyPhrases: string[]): WordToken[] {
  const words = text.split(' ')
  // Normalize each key phrase into its own word list so multi-word
  // phrases ("зъбно преместване") can be matched against a run of words,
  // not just a single token.
  const phrases = keyPhrases
    .map((p) => p.trim().split(' ').filter(Boolean))
    .filter((p) => p.length > 0)

  const tokens: WordToken[] = []
  let i = 0
  while (i < words.length) {
    const match = phrases.find((phrase) =>
      phrase.every((w, offset) => words[i + offset]?.replace(/[.,]/g, '') === w.replace(/[.,]/g, '')),
    )
    if (match) {
      for (let offset = 0; offset < match.length; offset++) {
        tokens.push({
          chars: Array.from(words[i + offset]),
          isKey: true,
          trailingSpace: i + offset < words.length - 1,
        })
      }
      i += match.length
    } else {
      tokens.push({ chars: Array.from(words[i]), isKey: false, trailingSpace: i < words.length - 1 })
      i += 1
    }
  }
  return tokens
}

export function ScrollFillQuote({ text, keyPhrases }: ScrollFillQuoteProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const charRefs = useRef<Array<{ el: HTMLSpanElement; isKey: boolean }>>([])
  const filledRef = useRef(0)

  const tokens = useMemo(() => tokenize(text, keyPhrases), [text, keyPhrases])

  useEffect(() => {
    charRefs.current = charRefs.current.slice(0, tokens.reduce((n, t) => n + t.chars.length, 0))
  }, [tokens])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const totalChars = charRefs.current.length

    const paint = (filledCount: number) => {
      const prev = filledRef.current
      if (filledCount === prev) return
      const lo = Math.min(prev, filledCount)
      const hi = Math.max(prev, filledCount)
      for (let idx = lo; idx < hi; idx++) {
        const entry = charRefs.current[idx]
        if (!entry) continue
        entry.el.style.color = idx < filledCount ? (entry.isKey ? FILLED_KEY : FILLED) : UNFILLED
      }
      filledRef.current = filledCount
    }

    if (prefersReducedMotion) {
      paint(totalChars)
      return
    }

    let ticking = false
    const update = () => {
      ticking = false
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      // Scrub window: doesn't start filling until the text's top has
      // scrolled up to the vertical middle of the viewport, and doesn't
      // finish until its top has scrolled a further 40% of a screen's
      // height past the top of the viewport — a wide (~0.9vh) band so
      // the fill reads as slow and deliberate, not a quick snap.
      const start = vh * 0.5
      const end = vh * -0.4
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)))
      paint(Math.round(progress * totalChars))
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [tokens])

  let charIndex = -1

  return (
    <section ref={sectionRef} className="taste-scroll-quote" data-testid="home-scroll-quote">
      <div className="taste-shell taste-scroll-quote-inner">
        <p className="taste-scroll-quote-text" aria-label={text}>
          {tokens.map((token, tokenIdx) => (
            <span
              className={token.isKey ? 'taste-scroll-quote-word is-key' : 'taste-scroll-quote-word'}
              key={tokenIdx}
            >
              {token.chars.map((ch, i) => {
                charIndex += 1
                const myIndex = charIndex
                return (
                  <span
                    key={i}
                    aria-hidden="true"
                    ref={(el) => {
                      if (el) charRefs.current[myIndex] = { el, isKey: token.isKey }
                    }}
                    style={{ color: UNFILLED }}
                  >
                    {ch}
                  </span>
                )
              })}
              {token.trailingSpace ? ' ' : ''}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}

export default ScrollFillQuote
