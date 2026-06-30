'use client'

/**
 * Final CTA block — full-bleed atmospheric backdrop with a centered
 * glass card containing the closing quiz prompt + disclaimer.
 * Extracted from HomeContent.tsx in Feb 2026. Behaviour preserved.
 */

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, CheckCircle2, Gift, Clock, ArrowRight } from 'lucide-react'
import { Reveal, px, QUIZ_URL, ASSET_F_FINAL_CTA_BG } from './_shared'

export function FinalCTA() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" data-testid="home-final-cta">
      {/* Asset F — atmospheric navy/teal backdrop */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <Image
          src={ASSET_F_FINAL_CTA_BG}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.42]"
          unoptimized
        />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-teal-50/60 via-white/55 to-white/75 pointer-events-none" />
      <div aria-hidden data-parallax className="absolute -top-40 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-teal-200/30 blur-3xl animate-[breatheGlow_11s_ease-in-out_infinite]" style={px(-0.07)} />
      <div aria-hidden data-parallax className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-cyan-100/40 blur-3xl animate-[breatheGlow_13s_ease-in-out_infinite]" style={px(0.05)} />
      <div aria-hidden data-parallax className="absolute top-10 right-10 w-64 h-64 rounded-full bg-emerald-100/40 blur-3xl animate-[breatheGlow_9s_ease-in-out_infinite]" style={px(-0.04)} />

      <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
        <Reveal>
          <div className="relative rounded-[2rem] bg-white/55 backdrop-blur-2xl ring-1 ring-white/70 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] px-6 sm:px-12 py-12 sm:py-16 text-center">
            <div aria-hidden className="hidden sm:block absolute -top-3 left-6 rounded-full bg-white/70 backdrop-blur-md ring-1 ring-white/80 px-3 py-1.5 text-[11px] text-slate-700 font-medium shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
              <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-teal-500" /> ~60 секунди</span>
            </div>
            <div aria-hidden className="hidden sm:block absolute -top-4 right-10 rounded-full bg-white/70 backdrop-blur-md ring-1 ring-white/80 px-3 py-1.5 text-[11px] text-slate-700 font-medium shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-teal-500" /> Без регистрация</span>
            </div>
            <div aria-hidden className="hidden md:block absolute -bottom-3 right-16 rounded-full bg-white/70 backdrop-blur-md ring-1 ring-white/80 px-3 py-1.5 text-[11px] text-slate-700 font-medium shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
              <span className="inline-flex items-center gap-1.5"><Gift className="w-3 h-3 text-teal-500" /> Care Pass</span>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-teal-100 text-teal-700 text-[11px] font-medium px-3 py-1">
              <Clock className="w-3 h-3" /> ~60 секунди
            </span>
            <h2 className="mt-5 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
              Разбери каква е следващата правилна стъпка.
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Попълни кратката оценка, виж персонален резултат и
              отключи възможност за безплатна онлайн ориентация с
              партньорска клиника, когато има свободни часове.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={QUIZ_URL}
                className="group relative inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-5 py-3 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55)] overflow-hidden"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
                data-testid="final-primary-cta"
              >
                <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
                <span className="relative inline-flex items-center gap-1.5">
                  Започни оценката
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link
                href="#how"
                className="relative inline-flex items-center gap-1.5 rounded-full bg-white/35 backdrop-blur-2xl text-slate-900 hover:bg-white/55 text-sm font-medium px-5 py-3 ring-1 ring-white/60 transition-all hover:-translate-y-0.5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(15,23,42,0.04)] overflow-hidden"
              >
                <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/2 rounded-full bg-white/65 blur-sm pointer-events-none" />
                <span className="relative">Виж как работи</span>
              </Link>
            </div>
            <p className="mt-7 text-[11px] text-slate-400 leading-snug max-w-lg mx-auto">
              Zubite.bg не поставя диагноза и не заменя професионален
              стоматологичен преглед.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default FinalCTA
