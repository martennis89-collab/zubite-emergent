'use client'

import { useEffect, useRef, useState } from 'react'
import { Gift, MoveRight } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// HorizontalSteps — sticky-scroll horizontal reveal of the
// 5 process steps for the "Какво се случва след като започнеш?"
// section.
//
// Pattern:
//   • A tall outer wrapper supplies vertical scroll distance
//     (~5 × 100vh) which the user scrolls through.
//   • A sticky inner container locks to the viewport while
//     that distance is consumed.
//   • Inside the sticky container, the step track translates
//     horizontally as a function of scroll progress, so the
//     5 cards reveal sideways even though the user only ever
//     scrolls vertically.
//   • On small screens we collapse to a calm vertical stack
//     — horizontal scrolljacking on mobile is annoying.
// ─────────────────────────────────────────────────────────────

type Step = {
  n: string
  t: string
  s: string
  accent?: boolean
}

const steps: Step[] = [
  { n: '01', t: 'Отговаряш', s: 'На кратки въпроси за това, което забелязваш.' },
  { n: '02', t: 'Получаваш ориентир', s: 'Виждаш дали има смисъл наблюдение, профилактика или консултация.' },
  { n: '03', t: 'Избираш следваща стъпка', s: 'Можеш да продължиш към подходяща клиника, ако искаш.' },
  { n: '04', t: 'Посещаваш консултация', s: 'Клиниката потвърждава реалния случай.' },
  { n: '05', t: 'Получаваш Care Pass', s: 'Карта с отстъпки за продукти за орална хигиена.', accent: true },
]

function StepCard({ step, index, inverted }: { step: Step; index: number; inverted?: boolean }) {
  if (inverted) {
    return (
      <article
        data-testid={`how-step-${index}`}
        className={
          'relative h-full w-[clamp(20rem,30vw,28rem)] shrink-0 rounded-3xl backdrop-blur-xl p-7 sm:p-9 ring-1 ' +
          (step.accent
            ? 'bg-gradient-to-br from-teal-300/25 to-white/10 ring-teal-200/40 shadow-[0_28px_60px_-22px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]'
            : 'bg-white/10 ring-white/20 shadow-[0_18px_50px_-22px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)]')
        }
      >
        <span className={'font-serif text-5xl sm:text-6xl font-bold leading-none ' + (step.accent ? 'text-teal-100/85' : 'text-teal-100/40')}>
          {step.n}
        </span>
        <h3 className="mt-4 font-serif text-xl sm:text-2xl font-semibold text-white leading-tight max-w-xs">
          {step.t}
        </h3>
        <p className="mt-3 text-sm sm:text-[15px] text-teal-50/85 leading-relaxed max-w-xs">
          {step.s}
        </p>
        {step.accent && (
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/25 text-[10px] uppercase tracking-wider text-teal-100 font-semibold px-2.5 py-1">
            <Gift className="w-3 h-3" /> Care Pass
          </span>
        )}
      </article>
    )
  }
  return (
    <article
      data-testid={`how-step-${index}`}
      className={
        'relative h-full w-[clamp(20rem,30vw,28rem)] shrink-0 rounded-3xl backdrop-blur-xl p-7 sm:p-9 ' +
        (step.accent
          ? 'bg-gradient-to-br from-teal-50/95 to-white/90 ring-1 ring-teal-300/50 shadow-[0_28px_60px_-32px_rgba(13,148,136,0.45)]'
          : 'bg-white/85 ring-1 ring-white/80 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.22)]')
      }
    >
      <span className={'font-serif text-5xl sm:text-6xl font-bold leading-none ' + (step.accent ? 'text-teal-500/70' : 'text-teal-600/25')}>
        {step.n}
      </span>
      <h3 className="mt-4 font-serif text-xl sm:text-2xl font-semibold text-slate-900 leading-tight max-w-xs">
        {step.t}
      </h3>
      <p className="mt-3 text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-xs">
        {step.s}
      </p>
      {step.accent && (
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 ring-1 ring-teal-300/40 text-[10px] uppercase tracking-wider text-teal-700 font-semibold px-2.5 py-1">
          <Gift className="w-3 h-3" /> Care Pass
        </span>
      )}
    </article>
  )
}

export function HorizontalSteps({ inverted = false }: { inverted?: boolean } = {}) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [translateX, setTranslateX] = useState(0)
  const [reduced, setReduced] = useState(false)
  const [progressPct, setProgressPct] = useState(0)

  // Respect prefers-reduced-motion: serve a calm vertical stack instead.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => setReduced(mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  useEffect(() => {
    if (reduced) return
    let raf = 0
    const compute = () => {
      const section = sectionRef.current
      const track = trackRef.current
      if (!section || !track) return
      const rect = section.getBoundingClientRect()
      const viewportH = window.innerHeight
      const totalDistance = rect.height - viewportH
      const scrolled = -rect.top
      const p = Math.max(0, Math.min(1, scrolled / Math.max(1, totalDistance)))
      // Track full width minus viewport gives the max horizontal travel.
      const overflow = Math.max(0, track.scrollWidth - window.innerWidth)
      setTranslateX(-p * overflow)
      setProgressPct(p)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(compute)
    }
    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [reduced])

  // Mobile + reduced motion → vertical stack
  if (reduced) {
    return (
      <div className="grid gap-4">
        {steps.map((s, i) => (
          <StepCard key={s.n} step={s} index={i} inverted={inverted} />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Mobile: simple vertical stack (md and below) */}
      <div className="grid gap-4 md:hidden px-5" data-testid="horizontal-steps-mobile">
        {steps.map((s, i) => (
          <StepCard key={s.n} step={s} index={i} inverted={inverted} />
        ))}
      </div>

      {/* Desktop / tablet: horizontal sticky scroll */}
      <div
        ref={sectionRef}
        className="relative hidden md:block"
        style={{ height: `${(steps.length - 1) * 80 + 80}vh` }}
        data-testid="horizontal-steps-track"
      >
        <div className="sticky top-20 h-[64vh] min-h-[420px] overflow-x-clip flex items-center">
          <div
            ref={trackRef}
            className="flex items-stretch gap-4 lg:gap-5 px-[5vw] lg:px-[6vw] will-change-transform"
            style={{
              transform: `translate3d(${translateX}px, 0, 0)`,
              transition: 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center">
                <StepCard step={s} index={i} inverted={inverted} />
                {i < steps.length - 1 && (
                  <MoveRight aria-hidden className={'ml-4 lg:ml-5 w-5 h-5 shrink-0 ' + (inverted ? 'text-teal-200/70' : 'text-teal-400')} />
                )}
              </div>
            ))}
          </div>
          {/* Scrub progress indicator — subtle bottom rail */}
          <div aria-hidden className={'absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(24rem,36vw)] h-[3px] rounded-full overflow-hidden ' + (inverted ? 'bg-white/15' : 'bg-slate-200/70')}>
            <div
              className={'h-full bg-gradient-to-r ' + (inverted ? 'from-teal-200 to-white' : 'from-teal-400 to-teal-600')}
              style={{ width: `${Math.round(progressPct * 100)}%`, transition: 'width 120ms linear' }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default HorizontalSteps
