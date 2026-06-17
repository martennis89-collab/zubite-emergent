'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

/**
 * Conversion-focused header used inside the post-quiz funnel routes
 * (`/results/[leadId]`, `/results/[leadId]/clinics`,
 * `/results/[leadId]/clinics/[clinicId]`).
 *
 * Why a separate header?
 *   • The full public marketing `<Header />` shows nav links (Начало, Симптоми,
 *     Ортодонтия, …) + the "Започни анализа" CTA, which compete with funnel
 *     completion. Per the Feb 2026 brief, lead-context routes should keep
 *     the patient in the funnel until they unlock and review the shortlist.
 *   • Public pages must keep the normal public header — do NOT swap globally.
 *
 * Layout: left = Zubite.bg wordmark linking to "/", right = compact "Ориентир,
 * не диагноза" pill (teal, hairline ring) as a calm trust signal. No mobile
 * menu, no CTAs, no nav links.
 */
export function ResultsHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 6)
    handle()
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  return (
    <header
      className={
        'fixed top-0 inset-x-0 z-40 transition-all duration-200 ' +
        (scrolled
          ? 'bg-[#FCFAF8]/85 backdrop-blur-xl ring-1 ring-slate-200/50 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.18)]'
          : 'bg-transparent')
      }
      data-testid="results-header"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Wordmark — keep the same brand mark as the public header so the
            user still feels they are in Zubite, just with less chrome. */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 group"
          data-testid="results-header-logo"
        >
          <span className="font-serif text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
            Zubite<span className="text-teal-600">.</span>bg
          </span>
        </Link>

        {/* "Ориентир, не диагноза" trust pill — non-clickable on desktop,
            calm size on mobile so it never wraps. */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-white/65 backdrop-blur-md ring-1 ring-teal-100 text-[10.5px] sm:text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-[0_4px_12px_-8px_rgba(13,148,136,0.30)]"
          data-testid="results-header-trust-pill"
        >
          <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
          Ориентир, не диагноза
        </span>
      </div>
    </header>
  )
}
