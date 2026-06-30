'use client'

/**
 * Hero + decorative floating result-mockup. Extracted from
 * HomeContent.tsx in Feb 2026 — behaviour and visuals are bit-for-bit
 * identical to the previous inline implementation.
 */

import Link from 'next/link'
import Image from 'next/image'
import {
  ShieldCheck, ArrowRight, CheckCircle2, Star, Building2, Activity,
} from 'lucide-react'
import { WordMorph } from '@/components/motion/WordMorph'
import { ParallaxFloat } from '@/components/motion/ParallaxFloat'
import {
  Reveal,
  px,
  HERO_BG,
  ASSET_B_GLASS_PANELS,
  QUIZ_URL,
} from './_shared'

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden" data-testid="home-hero">
      {/* Soft warm-ivory base with radial teal glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 15% 20%, rgba(94,234,212,0.35) 0%, rgba(94,234,212,0) 60%),' +
            'radial-gradient(ellipse 60% 50% at 85% 60%, rgba(165,243,252,0.45) 0%, rgba(165,243,252,0) 60%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
        }}
      />
      {/* warm grain texture (low opacity overlay) */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.14] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* soft turquoise glow blobs — slow vertical parallax + breathing */}
      <div
        aria-hidden
        data-parallax
        className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none animate-[breatheGlow_9s_ease-in-out_infinite]"
        style={px(-0.08)}
      />
      <div
        aria-hidden
        data-parallax
        className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/40 blur-3xl pointer-events-none animate-[breatheGlow_11s_ease-in-out_infinite]"
        style={px(0.06)}
      />
      <div
        aria-hidden
        data-parallax
        className="absolute top-20 right-1/3 w-72 h-72 rounded-full bg-emerald-200/20 blur-3xl pointer-events-none animate-[breatheGlow_13s_ease-in-out_infinite]"
        style={px(-0.04)}
      />

      {/* Asset B — Floating frosted-glass UI panels as decorative depth layer (very low opacity) */}
      <div
        aria-hidden
        data-parallax
        className="absolute -right-20 top-32 w-[42rem] h-[42rem] pointer-events-none hidden lg:block opacity-[0.25] mix-blend-normal"
        style={{
          transform: 'translate3d(0, calc(var(--py, 0) * 0.04px), 0) rotate(-4deg)',
          willChange: 'transform',
          maskImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)',
        }}
      >
        <Image
          src={ASSET_B_GLASS_PANELS}
          alt=""
          fill
          sizes="700px"
          className="object-cover"
          unoptimized
        />
      </div>

      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-teal-100 text-teal-700 text-[11px] font-medium px-3 py-1 uppercase tracking-[0.16em]">
              <ShieldCheck className="w-3 h-3" />
              Първо <WordMorph words={['яснота', 'ориентир', 'насока', 'спокойствие']} className="text-teal-700" />. После избор.
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 font-serif font-semibold tracking-tight text-slate-900 text-[2.5rem] sm:text-5xl lg:text-[3.75rem] leading-[1.05]">
              Спри да питаш{' '}
              <span className="text-teal-600">случайни хора</span>{' '}
              в социалните мрежи за дентални съвети.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-slate-600 text-lg sm:text-xl leading-relaxed max-w-xl">
              Zubite.bg ти помага да се ориентираш дали симптомите ти може да
              са сигнал за дентален проблем, какви решения съществуват и към
              какъв тип специалист има смисъл да се насочиш.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p
              className="mt-4 text-slate-500 text-[15px] sm:text-base leading-relaxed max-w-xl italic"
              data-testid="hero-quiz-hook"
            >
              Мислиш, че всичко е наред със зъбите ти? Отговори на няколко
              въпроса и виж дали има сигнал, който си струва да провериш.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={QUIZ_URL}
                className="group relative inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-5 py-3 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55)] overflow-hidden"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
                data-testid="hero-primary-cta"
              >
                <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
                <span className="relative inline-flex items-center gap-1.5">
                  Провери своя случай
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link
                href="#how"
                className="relative inline-flex items-center gap-1.5 rounded-full bg-white/35 backdrop-blur-2xl text-slate-900 text-sm font-medium px-5 py-3 ring-1 ring-white/60 hover:bg-white/55 hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(15,23,42,0.04)] overflow-hidden"
                data-testid="hero-secondary-cta"
              >
                <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/2 rounded-full bg-white/65 blur-sm pointer-events-none" />
                <span className="relative">Виж как работи</span>
              </Link>
            </div>
            {/* Unlock-mechanic microcopy under hero CTAs */}
            <p className="mt-4 text-[12px] text-slate-500 leading-relaxed max-w-xl" data-testid="hero-unlock-microcopy">
              Попълни оценката и можеш да получиш безплатна онлайн ориентация.
              Care Pass е включен във всяка партньорска клиника.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <ParallaxFloat strength={4} mobileFactor={0.012}>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  '60 секунди',
                  'Без регистрация',
                  'Ориентир, не диагноза',
                  'Care Pass в партньорската мрежа',
                ].map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/50 backdrop-blur-md ring-1 ring-white/70 text-[11px] text-slate-700 font-medium px-3 py-1.5 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.1)]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-teal-500" />
                    {c}
                  </span>
                ))}
              </div>
            </ParallaxFloat>
          </Reveal>
        </div>

        {/* Floating product mockup */}
        <Reveal delay={120}>
          <HeroMockup />
        </Reveal>
      </div>
    </section>
  )
}

function HeroMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto" data-testid="home-hero-mockup">
      {/* Small decorative floating shapes behind the mockup — barely visible, slow drift */}
      <div
        aria-hidden
        className="absolute -top-10 -left-10 w-20 h-20 rounded-2xl bg-teal-200/35 backdrop-blur-md ring-1 ring-white/50 rotate-[8deg] animate-[driftSlow_12s_ease-in-out_infinite] pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-1/3 -right-12 w-16 h-16 rounded-full bg-cyan-100/40 backdrop-blur-md ring-1 ring-white/40 animate-[driftSlow_14s_ease-in-out_infinite_reverse] pointer-events-none"
        style={{ animationDelay: '-3s' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-8 left-6 w-14 h-14 rounded-xl bg-emerald-100/40 backdrop-blur-md ring-1 ring-white/40 -rotate-[6deg] animate-[driftSlow_16s_ease-in-out_infinite] pointer-events-none"
        style={{ animationDelay: '-6s' }}
      />
      {/* Deepest decorative card — rotated and offset, slow float */}
      <div aria-hidden className="absolute inset-0 -translate-y-3 translate-x-4 rotate-[3.5deg] rounded-[2rem] bg-gradient-to-br from-teal-100/70 to-cyan-50/40 ring-1 ring-white/60 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.18)] animate-[floatSlower_10s_ease-in-out_infinite]" />
      {/* Mid translucent card — slight counter-rotate for layered depth */}
      <div aria-hidden className="absolute inset-0 translate-y-2 -translate-x-3 -rotate-[2.5deg] rounded-[1.85rem] bg-white/55 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.18)] animate-[floatSlow_9s_ease-in-out_infinite_reverse]" />
      {/* Bottom subtle card */}
      <div className="absolute -inset-4 sm:-inset-6 rounded-[2rem] bg-gradient-to-br from-white/60 to-teal-50/60 backdrop-blur-xl ring-1 ring-white/60" />
      {/* Primary card */}
      <div className="relative rounded-[1.75rem] bg-white shadow-[0_30px_60px_-20px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 p-6 sm:p-7 animate-[float_6s_ease-in-out_infinite]">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
          Примерен ориентир след въпросника
        </div>
        <h3 className="mt-4 font-serif text-2xl text-slate-900 leading-tight">
          Възможно леко разместване <br />на предни зъби
        </h3>
        <div className="mt-4 flex items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100 text-[11px] px-2.5 py-1">
            <Star className="w-3 h-3 fill-current" /> Ориентировъчен случай
          </div>
        </div>
        <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
          Посоки за обсъждане:
        </p>
        <div className="mt-2.5 space-y-3 text-sm">
          {[
            { label: 'Прозрачни алайнери', sub: 'При опитен Invisalign provider могат да работят и при много сложни случаи — благодарение на SmartTrack материала и ClinCheck планирането. Изискват дисциплина (20–22 ч. дневно).' },
            { label: 'Естетични брекети',  sub: 'Вариант при нужда от по-постоянен контрол.' },
            { label: 'Метални брекети',    sub: 'Често по-достъпна опция, особено при по-сложни движения.' },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-2.5">
              <span aria-hidden className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-800 leading-snug">{row.label}</p>
                <p className="mt-0.5 text-[11.5px] text-slate-500 leading-snug">{row.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 leading-snug">
            Следваща стъпка: <br />консултация с ортодонт
          </p>
          {/* Decorative mockup label only — intentionally non-interactive.
              The real CTA is the hero "Провери своя случай" button. */}
          <span aria-hidden className="inline-flex items-center text-slate-400 text-xs font-medium whitespace-nowrap">
            Пример
          </span>
        </div>
      </div>
      {/* Floating chip — clinic suggestion */}
      <div className="absolute -bottom-6 -left-4 sm:-left-8 rounded-2xl bg-white shadow-lg ring-1 ring-slate-100 px-3 py-2 flex items-center gap-2 animate-[float_7s_ease-in-out_infinite_reverse]">
        <Building2 className="w-4 h-4 text-teal-500" />
        <span className="text-[11px] text-slate-700 font-medium">Партньорски клиники</span>
      </div>
      {/* Floating chip — price */}
      <div className="absolute -top-5 right-0 rounded-2xl bg-white shadow-lg ring-1 ring-slate-100 px-3 py-2 flex items-center gap-2 animate-[float_5.5s_ease-in-out_infinite]">
        <Activity className="w-4 h-4 text-teal-500" />
        <span className="text-[11px] text-slate-700 font-medium">Ориентир за цена</span>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(-8px) }
        }
      `}</style>
    </div>
  )
}

export default Hero
