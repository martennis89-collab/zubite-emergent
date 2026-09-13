'use client'

/**
 * Final CTA block — closing quiz prompt on a soft teal wash.
 * Simplified 2026-07-16 (anti-slop pass): dropped the Emergent-hosted
 * atmospheric backdrop, the three breathing glow blobs and the floating
 * corner badges (one of which duplicated the "~60 секунди" eyebrow).
 * One ambient layer, one solid card, tokens: pill + 16px radius.
 */

import Link from 'next/link'
import { Clock, ArrowRight } from 'lucide-react'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { Reveal, QUIZ_URL } from './_shared'

export function FinalCTA() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" data-testid="home-final-cta">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 20%, rgba(94,234,212,0.25) 0%, rgba(94,234,212,0) 65%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
        <Reveal>
          <div className="relative rounded-2xl bg-white ring-1 ring-slate-100 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.16)] px-6 sm:px-12 py-12 sm:py-16 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 ring-1 ring-teal-100 text-teal-700 text-[11px] font-medium px-3 py-1">
              <Clock className="w-3 h-3" /> ~60 секунди · Без регистрация
            </span>
            <h2 className="mt-5 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
              Разбери каква е следващата правилна стъпка.
            </h2>
            {/* The result screen renders before the contact form, so the
                summary genuinely is unconditional — the old "отключи…"
                framing implied a gate that does not exist. Clinics and the
                free online orientation are the optional step after it. */}
            <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Отговори на няколко въпроса и веднага виж на кой етап си,
              кратко обобщение на това, което описа, и дали има смисъл да
              го обсъдиш с ортодонт. Ако решиш, после можеш да поискаш и
              подходящи клиники.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={QUIZ_URL}
                onClick={() => { try { trackPatientEvent('home_cta_clicked', { cta_location: 'final' }) } catch { /* noop */ } }}
                className="group relative inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-5 py-3 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55)] overflow-hidden"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
                data-testid="final-primary-cta"
              >
                <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
                <span className="relative inline-flex items-center gap-1.5">
                  Провери на кой етап си (60 сек)
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 text-sm font-medium px-5 py-3 ring-1 ring-slate-200 hover:ring-teal-200 hover:-translate-y-0.5 transition-all"
              >
                Виж как работи
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default FinalCTA
