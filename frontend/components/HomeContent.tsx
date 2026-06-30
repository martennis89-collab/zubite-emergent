'use client'

/**
 * Premium Wave.co-inspired homepage for Zubite.bg.
 *
 * Feb 2026 refactor: utility hooks (`useReveal`, `useBackgroundParallax`),
 * the `Reveal` wrapper, the `<Nav />` sticky navigation, the `<MotionStyles />`
 * keyframe block, all asset URL constants and the `HomeBlogPost` type have
 * been moved to `./home/_shared` + `./home/Nav` so this file can shrink
 * toward a pure orchestrator. Section components below will be migrated
 * in follow-up passes.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ClinicStandardSection } from '@/components/patient/ClinicStandardSection'
import { Footer } from '@/components/Footer'
import { StackedValueProps } from '@/components/StackedValueProps'
import { HorizontalSteps } from '@/components/HorizontalSteps'
import { WordMorph } from '@/components/motion/WordMorph'
import { CountUp } from '@/components/motion/CountUp'
import { ParallaxFloat } from '@/components/motion/ParallaxFloat'
import { resolveImageUrl } from '@/lib/imageUrl'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import {
  ShieldCheck, Sparkles, Building2, Stethoscope, ChevronDown,
  CheckCircle2, ArrowRight, Heart, Smile, Activity,
  AlignLeft, Clock, Star, BookOpen,
  HelpCircle, Gift,
} from 'lucide-react'

import {
  Reveal,
  px,
  useReveal,
  useBackgroundParallax,
  MotionStyles,
  QUIZ_URL,
  HERO_BG,
  ASSET_B_GLASS_PANELS,
  ASSET_C_APP_MOCKUP,
  ASSET_E_CARE_PASS_CARD,
  ASSET_F_FINAL_CTA_BG,
  type HomeBlogPost,
} from './home/_shared'
import { Nav } from './home/Nav'
import { Hero } from './home/Hero'
import { LumiVideoSection } from './home/LumiVideoSection'
import { CarePassTeaser } from './home/CarePassTeaser'
import { FinalCTA } from './home/FinalCTA'

export type { HomeBlogPost }


// ─── 3. Trust strip ──────────────────────────────────────────────
function TrustStrip() {
  const items = [
    'Без регистрация',
    'Без задължение',
    'Ориентир за цена и срок',
    'Насочване според случая',
    'Care Pass в партньорската мрежа',
    'Не заменя преглед',
  ]
  // Duplicate the list so the loop is seamless: the second copy slides in
  // as the first copy slides out. We translate the whole track by -50%
  // (== one full copy width) over ~40s and loop infinitely.
  return (
    <section className="py-10 sm:py-12" data-testid="home-trust-strip">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="relative rounded-full bg-white/45 backdrop-blur-2xl ring-1 ring-white/65 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] px-3 sm:px-4 py-3 overflow-hidden">
          {/* Inner top-edge gloss for liquid-glass refraction look */}
          <div aria-hidden className="absolute inset-x-6 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/55 to-transparent pointer-events-none opacity-80" />
          {/* Edge fade masks so chips dissolve at left/right edges */}
          <div aria-hidden className="absolute inset-y-0 left-0 w-12 sm:w-16 z-10 bg-gradient-to-r from-white/70 to-transparent pointer-events-none" />
          <div aria-hidden className="absolute inset-y-0 right-0 w-12 sm:w-16 z-10 bg-gradient-to-l from-white/70 to-transparent pointer-events-none" />
          <div className="trust-track flex items-center gap-x-6 sm:gap-x-8 whitespace-nowrap will-change-transform">
            {[0, 1].map((copy) =>
              items.map((t, i) => (
                <span
                  key={`${copy}-${t}`}
                  className="shrink-0 inline-flex items-center gap-1.5 text-[10.5px] sm:text-[11px] uppercase tracking-[0.16em] text-slate-600"
                  {...(copy === 0 ? { 'data-testid': `trust-chip-${i}` } : { 'aria-hidden': true })}
                >
                  <CheckCircle2 className="w-3 h-3 text-teal-500 shrink-0" />
                  {t}
                </span>
              )),
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes trustMarquee {
          0%   { transform: translate3d(0, 0, 0) }
          100% { transform: translate3d(-50%, 0, 0) }
        }
        .trust-track {
          animation: trustMarquee 38s linear infinite;
        }
        .trust-track:hover { animation-play-state: paused }
        @media (prefers-reduced-motion: reduce) {
          .trust-track { animation: none !important; transform: none !important }
        }
      `}</style>
    </section>
  )
}

// ─── 4. Problem ──────────────────────────────────────────────────
// ─── 4. Patient benefit — Section 2 ──────────────────────────────
function PatientBenefit() {
  return (
    <section
      id="kakvo-e-zubite"
      className="relative py-24 sm:py-32 overflow-x-clip scroll-mt-24"
      data-testid="home-patient-benefit"
      style={{ backgroundColor: '#0F4F4A' }}
    >
      {/* Brand-aligned glow — radial highlights anchored to the brand teal. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 35% at 20% 15%, rgba(45,212,191,0.22) 0%, rgba(45,212,191,0) 70%),' +
            'radial-gradient(ellipse 55% 45% at 85% 80%, rgba(94,234,212,0.18) 0%, rgba(94,234,212,0) 70%),' +
            'radial-gradient(circle at 50% 50%, rgba(15,79,74,0) 0%, rgba(7,40,38,0.55) 90%)',
        }}
      />
      {/* Subtle film grain to keep the dark green from feeling flat. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
        }}
      />
      <div
        aria-hidden
        data-parallax
        className="absolute -top-24 right-10 w-[32rem] h-[32rem] rounded-full bg-teal-400/15 blur-[120px] pointer-events-none animate-[breatheGlow_15s_ease-in-out_infinite]"
        style={px(-0.05)}
      />
      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-200 font-semibold eyebrow-sparkle">Какво е Zubite.bg</p>
            <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.08]">
              Платформа за <em className="not-italic text-teal-300">дентална ориентация</em>.
            </h2>
            <p className="mt-5 text-teal-50/85 text-base sm:text-lg leading-relaxed max-w-2xl">
              Zubite.bg ти помага да разбереш какъв може да е проблемът,
              какви са възможните следващи стъпки и към какъв тип
              консултация или клиника да се насочиш.{' '}
              <span className="text-teal-50/65">
                Не поставя диагноза и не замества преглед при стоматолог.
              </span>
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/quiz"
                className="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 text-sm font-medium px-4 py-2 hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-14px_rgba(0,0,0,0.45)]"
                data-testid="kakvo-section-cta"
              >
                Започни ориентация
                <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
              </Link>
              <Link
                href="/kliniki"
                className="inline-flex items-center gap-1.5 text-[13px] text-teal-100/80 hover:text-white transition-colors"
                data-testid="kakvo-section-catalog-link"
              >
                Виж публичния каталог
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="mt-3 text-[12px] text-teal-100/55 leading-relaxed max-w-md">
              Можеш да разгледаш и публичния каталог с партньорски клиники, но
              персоналната ориентация започва с кратък анализ.
            </p>
          </div>
        </Reveal>
      </div>
      <div className="relative mt-14 sm:mt-20">
        <StackedValueProps inverted />
      </div>
    </section>
  )
}

// ─── 5. What you may be noticing — Section 3 ─────────────────────
function SymptomChips() {
  // Each chip routes to the closest existing destination. Where the
  // dynamic /symptoms/[symptomSlug] page already supports a slug, we
  // use it; otherwise we link to the most relevant top-level page
  // (e.g. /tmj for jaw clicking, /orthodontics for malocclusion).
  // Only "Лош дъх" has no specific destination → falls back to /symptoms.
  // Order MUST stay in sync with `data-testid="symptom-chip-{i}"`.
  const chips: Array<{ label: string; href: string }> = [
    { label: 'Кървящи венци',                        href: '/symptoms/bleeding-gums' },
    { label: 'Криви или струпани зъби',              href: '/orthodontics' },
    { label: 'Щракане в челюстта',                   href: '/tmj' },
    { label: 'Болка или напрежение',                 href: '/symptoms/toothache' },
    { label: 'Лош дъх',                              href: '/symptoms' },
    { label: 'Липсващ зъб',                          href: '/implants' },
    { label: 'Износване на зъбите',                  href: '/symptoms/sensitivity' },
    { label: 'Неясна захапка',                       href: '/orthodontics' },
    { label: 'Детето диша през устата',              href: '/sleep-airway' },
    { label: 'Чудиш се за брекети или алайнери',     href: '/aligners-vs-braces' },
  ]
  return (
    <section id="noticing" className="relative py-20 sm:py-28 overflow-hidden scroll-mt-24" data-testid="home-noticing">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 70% 30%, rgba(165,243,252,0.30) 0%, transparent 70%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
        }}
      />
      <div
        aria-hidden
        data-parallax
        className="absolute -bottom-32 -left-20 w-[30rem] h-[30rem] rounded-full bg-teal-100/30 blur-3xl pointer-events-none animate-[breatheGlow_13s_ease-in-out_infinite]"
        style={px(0.06)}
      />
      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 text-center">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold eyebrow-sparkle">Може би си забелязал</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
            Какво може да си забелязал?
          </h2>
          <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Ако не си сигурен дали е дребно, нормално или нещо за проверка —
            започни с кратък ориентир.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <ul className="mt-10 flex flex-wrap justify-center gap-2.5 sm:gap-3" data-testid="symptom-chips">
            {chips.map((c, i) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/75 backdrop-blur-xl ring-1 ring-white/80 text-sm text-slate-800 font-medium px-4 py-2 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:bg-white hover:ring-teal-200/70 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 transition-all cursor-pointer"
                  data-testid={`symptom-chip-${i}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-10">
            <Link
              href={QUIZ_URL}
              className="group inline-flex items-center gap-1.5 rounded-full bg-white/55 backdrop-blur-xl ring-1 ring-white/70 text-slate-900 text-sm font-medium px-5 py-3 hover:bg-white hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]"
              data-testid="noticing-cta"
            >
              Започни анализа
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 text-teal-600" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 6. How it works (5 steps) ───────────────────────────────────
function HowItWorks() {
  return (
    <section id="how" className="relative py-14 sm:py-20 overflow-x-clip scroll-mt-24" data-testid="home-how" style={{ backgroundColor: '#0F4F4A' }}>
      {/* Brand-aligned glow — matches the other two dark-green moments
          on the page so the visual rhythm light → green → light → green
          stays consistent. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 35% at 15% 25%, rgba(45,212,191,0.20) 0%, rgba(45,212,191,0) 70%),' +
            'radial-gradient(ellipse 55% 45% at 85% 75%, rgba(94,234,212,0.16) 0%, rgba(94,234,212,0) 70%),' +
            'radial-gradient(circle at 50% 50%, rgba(15,79,74,0) 0%, rgba(7,40,38,0.55) 90%)',
        }}
      />
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
        }}
      />
      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-200 font-semibold eyebrow-sparkle">Как работи</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.08] max-w-3xl">
            Какво се случва след като започнеш?
          </h2>
          <p className="mt-3 text-teal-100/75 text-sm sm:text-base max-w-xl">
            Скролни надолу, за да преминеш през стъпките една по една.
          </p>
        </Reveal>
      </div>
      <div className="mt-6 sm:mt-8">
        <HorizontalSteps inverted />
      </div>
    </section>
  )
}

// ─── 9. Treatment categories — Section 7 ─────────────────────────
function TreatmentCategories() {
  const cats: Array<{ t: string; s: string; href: string; icon: React.ReactNode; featured?: boolean }> = [
    { t: 'Ортодонтия',              s: 'Криви зъби, захапка, струпване, разстояния и нужда от ортодонтска оценка.',          href: '/orthodontics',         icon: <Smile className="w-4 h-4" />,       featured: true },
    { t: 'Алайнери vs брекети',     s: 'Каква е разликата, кога кой вариант има смисъл и какво зависи от случая.',           href: '/aligners-vs-braces',   icon: <AlignLeft className="w-4 h-4" />,   featured: true },
    { t: 'Импланти',                s: 'Липсващ зъб, стари мостове, подвижни протези или нужда от план за възстановяване.',  href: '/implants',             icon: <Stethoscope className="w-4 h-4" /> },
    { t: 'Венци и хигиена',         s: 'Кървене, чувствителност, неприятен дъх и плакировка — какво да обсъдиш на преглед.',  href: '/symptoms',             icon: <Heart className="w-4 h-4" /> },
    { t: 'Естетична стоматология',  s: 'Фасети, бондинг, избелване и усмивка — с реалистични очаквания.',                     href: '/cosmetic-dentistry',   icon: <Sparkles className="w-4 h-4" /> },
    { t: 'TMJ / челюст',            s: 'Щракане, пукане, болка в челюстта, скърцане със зъби или сутрешно напрежение.',       href: '/tmj',                  icon: <Activity className="w-4 h-4" /> },
    { t: 'Сън и дишане',            s: 'Симптоми, свързани със сън, дишане през устата, захапка и челюстна позиция.',         href: '/sleep-airway',         icon: <Heart className="w-4 h-4" /> },
    { t: 'Детска ортодонтия',       s: 'Кога детето има нужда от ранна оценка и кои признаци не е добре да се игнорират.',    href: '/orthodontics',         icon: <Smile className="w-4 h-4" /> },
  ]
  return (
    <section id="treatments" className="relative py-20 sm:py-28 overflow-hidden scroll-mt-24" data-testid="home-treatments">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 80% 30%, rgba(165,243,252,0.25) 0%, transparent 70%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F7FBFA 100%)',
        }}
      />
      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold eyebrow-sparkle">Категории</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08] max-w-3xl">
            С какви случаи може да ти помогне Zubite.bg да се ориентираш?
          </h2>
        </Reveal>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cats.map((c, i) => (
            <Reveal key={c.t} delay={i * 60}>
              <details
                className={
                  'group/treatment relative block rounded-2xl backdrop-blur-xl p-5 sm:p-6 h-full transition-all overflow-hidden hover:-translate-y-1 cursor-pointer ' +
                  (c.featured
                    ? 'bg-gradient-to-br from-white/90 to-teal-50/70 ring-1 ring-teal-200/60 shadow-[0_14px_44px_-22px_rgba(13,148,136,0.35)] hover:shadow-[0_22px_56px_-22px_rgba(13,148,136,0.45)]'
                    : 'bg-white/70 ring-1 ring-white/80 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] hover:bg-white/85 hover:shadow-[0_16px_44px_-22px_rgba(15,23,42,0.22)]')
                }
                data-testid={`treatment-card-${i}`}
              >
                <summary className="list-none flex flex-col gap-3">
                  <div aria-hidden className="absolute inset-0 opacity-0 group-hover/treatment:opacity-100 transition-opacity"
                    style={{ background: 'radial-gradient(circle at 90% 0%, rgba(20,184,166,0.10) 0%, transparent 60%)' }}
                  />
                  <div className={
                    'relative inline-flex items-center justify-center w-10 h-10 rounded-xl ring-1 ' +
                    (c.featured ? 'bg-teal-500/10 text-teal-700 ring-teal-200/70' : 'bg-teal-50/80 text-teal-700 ring-teal-100/80')
                  }>
                    {c.icon}
                  </div>
                  <h3 className="relative font-serif text-lg sm:text-xl font-semibold text-slate-900 group-hover/treatment:text-teal-700 transition-colors">
                    {c.t}
                  </h3>
                  <span className="relative inline-flex items-center gap-1 text-xs font-medium text-teal-600 group-hover/treatment:gap-2 transition-all">
                    <span className="group-open/treatment:hidden">Виж насоки</span>
                    <span className="hidden group-open/treatment:inline">Виж по-малко</span>
                    <ChevronDown className="w-3 h-3 transition-transform group-open/treatment:rotate-180" />
                  </span>
                </summary>
                <div className="relative mt-3 border-t border-slate-200/50 pt-3 space-y-3">
                  <p className="text-sm text-slate-600 leading-relaxed">{c.s}</p>
                  <Link
                    href={c.href}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 transition-colors"
                  >
                    Прочети повече <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </details>
            </Reveal>
          ))}
        </div>

        {/* Secondary link to full /treatments hub — visually quiet, keeps the
            homepage rhythm intact while giving people a natural path from the
            inline category preview into the full orientation hub. */}
        <Reveal delay={cats.length * 60}>
          <div className="mt-8 sm:mt-10 text-center">
            <Link
              href="/treatments"
              data-testid="home-treatments-see-all"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
            >
              Виж всички категории
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 7. Decision preview UI ──────────────────────────────────────
function DecisionPreview() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden" data-testid="home-decision-preview">
      {/* Background depth blobs */}
      <div
        aria-hidden
        data-parallax
        className="absolute -top-20 -right-32 w-[32rem] h-[32rem] rounded-full bg-teal-100/35 blur-3xl pointer-events-none animate-[breatheGlow_12s_ease-in-out_infinite]"
        style={px(-0.06)}
      />
      <div
        aria-hidden
        data-parallax
        className="absolute -bottom-32 left-1/4 w-80 h-80 rounded-full bg-cyan-100/25 blur-3xl pointer-events-none animate-[breatheGlow_14s_ease-in-out_infinite]"
        style={px(0.05)}
      />
      <div className="relative z-10 max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold eyebrow-sparkle">Какво получаваш</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
            Какъв ориентир получаваш?
          </h2>
          <p className="mt-5 text-slate-600 text-lg sm:text-xl leading-relaxed max-w-md">
            Кратко, разбираемо обобщение — без жаргон, без диагноза.
          </p>
          <ul className="mt-6 space-y-2.5 text-base text-slate-700">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-1" /> Ориентир, не диагноза</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-1" /> Възможна следваща стъпка</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-1" /> Какъв специалист може да има смисъл</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-1" /> Въпроси за преглед</li>
          </ul>
          <Link
            href={QUIZ_URL}
            className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-3 transition-colors"
            data-testid="decision-cta"
          >
            Започни анализа
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
        <Reveal delay={120}>
          <div className="relative">
            {/* Asset C — premium app UI mockup as decorative backdrop */}
            <div
              aria-hidden
              className="hidden md:block absolute -inset-6 -z-0 opacity-[0.35] rotate-[3deg]"
              style={{
                maskImage: 'radial-gradient(ellipse at 60% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)',
                WebkitMaskImage: 'radial-gradient(ellipse at 60% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)',
              }}
            >
              <Image
                src={ASSET_C_APP_MOCKUP}
                alt=""
                fill
                sizes="600px"
                className="object-cover rounded-[2rem]"
                unoptimized
              />
            </div>
            {/* Deepest stacked card for depth */}
            <div aria-hidden className="absolute inset-0 translate-y-3 translate-x-3 rotate-[2deg] rounded-[2rem] bg-gradient-to-br from-teal-100/60 to-cyan-50/40 ring-1 ring-white/60" />
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-teal-50 to-white ring-1 ring-teal-100/70" />
            <div className="relative rounded-[1.75rem] bg-white/90 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.22)] p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Твоят случай</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 ring-1 ring-teal-100 rounded-full px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3" /> Примерен ориентир, не диагноза
                </span>
              </div>
              <h3 className="mt-3 font-serif text-2xl sm:text-3xl text-slate-900 leading-snug">
                Възможно леко до умерено <br />струпване на долни зъби
              </h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50/80 ring-1 ring-slate-200/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Ориентировъчен срок</p>
                  <p className="mt-1 font-serif text-lg text-slate-900">9–14 месеца</p>
                </div>
                <div className="rounded-xl bg-slate-50/80 ring-1 ring-slate-200/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Ценови диапазон</p>
                  <p className="mt-1 font-serif text-lg text-slate-900">~€1 300 – €2 150</p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Възможни подходи за обсъждане:</p>
                <p className="text-slate-600">· Прозрачни алайнери</p>
                <p className="text-slate-600">· Естетични брекети</p>
                <p className="text-slate-600">· Ортодонтска консултация за потвърждение</p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">Насочване към партньорска клиника по избор</p>
                {/* Decorative mockup label only — non-interactive. Real CTA
                    is the "Започни анализа" button to the left of this card. */}
                <span aria-hidden className="text-xs font-medium text-slate-400">Пример</span>
              </div>
            </div>
            {/* Floating secondary glass chip — top */}
            <div className="absolute -top-4 -left-3 sm:-left-6 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 px-3 py-2 flex items-center gap-2 shadow-[0_12px_30px_-14px_rgba(15,23,42,0.22)] animate-[float_6.5s_ease-in-out_infinite]">
              <HelpCircle className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-[11px] text-slate-700 font-medium">Въпроси за преглед</span>
            </div>
            {/* Floating secondary glass chip — bottom */}
            <div className="absolute -bottom-4 right-2 sm:-right-4 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 px-3 py-2 flex items-center gap-2 shadow-[0_12px_30px_-14px_rgba(15,23,42,0.22)] animate-[float_7.5s_ease-in-out_infinite_reverse]">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-[11px] text-slate-700 font-medium">Продължаваш само ако решиш</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}


// ─── 8. Why trust Zubite — Section 6 ─────────────────────────────
function TrustReason() {
  const cards: Array<{ t: string; s: string; long: string; icon: React.ReactNode }> = [
    {
      t: 'Не поставяме диагноза',
      s: 'Окончателната оценка се прави от стоматолог или ортодонт.',
      long: 'Zubite.bg дава ориентир според това, което си описал. Той не замества медицински преглед, образна диагностика и професионална оценка от специалист.',
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      t: 'Не показваме случаен списък',
      s: 'Насочването се базира на описания случай, град и категория.',
      long: 'Не получаваш произволен каталог от клиники. Препоръчваме партньорски клиники, които работят с описания случай в твоя град — нищо повече.',
      icon: <Stethoscope className="w-5 h-5" />,
    },
    {
      t: 'Не те притискаме',
      s: 'Избираш дали да продължиш.',
      long: 'Може да получиш ориентира си и да го обмислиш на спокойствие. Заявка към клиника тръгва само ако ти решиш да продължиш.',
      icon: <Sparkles className="w-5 h-5" />,
    },
  ]
  return (
    <section className="relative py-24 sm:py-32 overflow-x-clip" data-testid="home-trust" style={{ backgroundColor: '#0F4F4A' }}>
      {/* Brand-aligned glow — mirrors the #kakvo-e-zubite section so the
          two dark-green moments visually rhyme across the page. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 80% 20%, rgba(45,212,191,0.20) 0%, rgba(45,212,191,0) 70%),' +
            'radial-gradient(ellipse 55% 45% at 15% 85%, rgba(94,234,212,0.18) 0%, rgba(94,234,212,0) 70%),' +
            'radial-gradient(circle at 50% 50%, rgba(15,79,74,0) 0%, rgba(7,40,38,0.55) 90%)',
        }}
      />
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
        }}
      />
      <div
        aria-hidden
        data-parallax
        className="absolute -top-24 left-1/3 w-[32rem] h-[32rem] rounded-full bg-teal-400/15 blur-[120px] pointer-events-none animate-[breatheGlow_13s_ease-in-out_infinite]"
        style={px(-0.06)}
      />
      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-200 font-semibold eyebrow-sparkle">Защо да ни се довериш</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.08] max-w-3xl">
            Не диагноза. Не каталог.<br />Ориентир преди избора.
          </h2>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-3 gap-4 sm:gap-5">
          {cards.map((c, i) => (
            <Reveal key={c.t} delay={i * 100}>
              <details className="group/trust block rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-6 sm:p-7 h-full shadow-[0_18px_50px_-22px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] hover:-translate-y-1 hover:bg-white/15 hover:ring-white/30 hover:shadow-[0_24px_60px_-22px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.20)] transition-all cursor-pointer" data-testid={`trust-card-${i}`}>
                <summary className="list-none flex flex-col gap-3">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/15 text-teal-100 ring-1 ring-white/25">
                    {c.icon}
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white leading-tight">{c.t}</h3>
                  <p className="text-base text-teal-50/85 leading-relaxed">{c.s}</p>
                  <span className="text-[11px] text-teal-200 font-medium inline-flex items-center gap-1 mt-1 group-open/trust:hidden">
                    Виж повече <ChevronDown className="w-3 h-3" />
                  </span>
                </summary>
                <p className="mt-3 text-sm text-teal-50/80 leading-relaxed border-t border-white/15 pt-3">
                  {c.long}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}


// ─── 10.5 Recent articles (SSR-fetched blog posts) ───────────────
function RecentArticles({ posts }: { posts: HomeBlogPost[] }) {
  if (!posts || posts.length === 0) return null
  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('bg-BG', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch {
      return ''
    }
  }
  return (
    <section className="py-20 sm:py-28" data-testid="home-recent-articles">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold eyebrow-sparkle">Журнал</p>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight max-w-2xl">
                Кратки обяснения за решения, които не трябва да взимаш на сляпо.
              </h2>
              <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
                Практични статии за симптоми, лечения, цени и въпроси,
                които да зададеш преди консултация.
              </p>
            </div>
            <Link
              href="/blog"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800 font-medium"
              data-testid="recent-articles-view-all"
            >
              Виж всички статии <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {posts.slice(0, 3).map((p, i) => (
            <Reveal key={p.id} delay={i * 90}>
              <Link
                href={`/blog/${p.slug}`}
                className="group block rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-white/80 overflow-hidden hover:-translate-y-1 hover:bg-white hover:ring-teal-200/60 transition-all shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] hover:shadow-[0_18px_44px_-22px_rgba(13,148,136,0.25)] h-full"
                data-testid={`recent-article-${i}`}
              >
                <div className="aspect-[16/9] bg-gradient-to-br from-teal-50 to-slate-50 relative overflow-hidden">
                  {/* Persistent fallback below image */}
                  <div aria-hidden className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-teal-200" />
                  </div>
                  {p.featured_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageUrl(p.featured_image)}
                      alt={p.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                  {/* Subtle gradient overlay on hover */}
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 px-2 py-0.5 uppercase tracking-wider">
                      {p.category}
                    </span>
                    <span>·</span>
                    <span>{fmtDate(p.published_at)}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg sm:text-xl font-semibold text-slate-900 leading-snug group-hover:text-teal-700 transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">{p.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-teal-600 group-hover:gap-2 transition-all">
                    Прочети <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 sm:hidden text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800 font-medium"
            data-testid="recent-articles-view-all-mobile"
          >
            Виж всички статии <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── 12. FAQ ─────────────────────────────────────────────────────
function FAQ() {
  const items = [
    { q: 'Zubite.bg клиника ли е?',          a: 'Не. Zubite.bg е независима платформа за ориентация и насочване. Помагаме ти да разбереш какъв тип проблем описваш, какви следващи стъпки може да имат смисъл и към какъв тип клиника да се насочиш.' },
    { q: 'Платформата ли поставя диагноза?', a: 'Не. Въпросникът дава ориентировъчна информация според твоите отговори. Диагноза, план за лечение и точна цена могат да бъдат потвърдени само след преглед от стоматолог или ортодонт.' },
    { q: 'Колко струва използването?',       a: 'Попълването на въпросника е безплатно. Ако решиш да продължиш към клиника, ще видиш каква е следващата стъпка и дали има цена за консултация според конкретната клиника.' },
    { q: 'Как избирате клиники?',            a: 'Гледаме категория лечение, град, описан случай, налични услуги и релевантност. Целта е да не получиш случаен списък, а по-подходяща посока според това, което си описал.' },
    { q: 'Какво се случва с моите данни?',   a: 'Използваме данните ти, за да подготвим обобщение и, ако поискаш, да те насочим към клиника. Не изпращаме данни към клиника без твое действие за продължаване.' },
    { q: 'Как получавам Zubite Care Pass?',  a: 'След като заявиш насочване чрез Zubite.bg и посетиш консултация в партньорска клиника, клиниката ще ти предостави Zubite Care Pass.' },
    { q: 'Какво включва Care Pass?',         a: 'Care Pass съдържа отстъпки за партньорски продукти за орална хигиена — например продукти за ежедневна грижа за зъбите и венците. Той не е отстъпка от лечение и не заменя препоръка от стоматолог.' },
  ]
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" data-testid="home-faq">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(94,234,212,0.15) 0%, transparent 70%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
        }}
      />
      <div className="relative max-w-3xl mx-auto px-5 sm:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold eyebrow-sparkle text-center">Често задавани въпроси</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight text-center">
            Кратки отговори.
          </h2>
        </Reveal>
        <div className="mt-10 rounded-3xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_12px_50px_-20px_rgba(15,23,42,0.18)] px-5 sm:px-7 py-2">
          {items.map((it, i) => <FAQItem key={it.q} q={it.q} a={it.a} idx={i} />)}
        </div>
      </div>
    </section>
  )
}

function FAQItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(idx === 0)
  return (
    <div className="border-b border-slate-200/60 last:border-b-0" data-testid={`faq-item-${idx}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-serif text-base sm:text-lg text-slate-900">{q}</span>
        <ChevronDown
          className={
            'w-4 h-4 text-slate-400 transition-transform shrink-0 ' +
            (open ? 'rotate-180 text-teal-600' : '')
          }
        />
      </button>
      <div
        className={
          'grid transition-all duration-300 ease-out ' +
          (open ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0')
        }
      >
        <p className="overflow-hidden text-sm text-slate-600 leading-relaxed max-w-2xl">{a}</p>
      </div>
    </div>
  )
}

// ─── 13. Final CTA + disclaimer ──────────────────────────────────
// ─── 9.5 Unlock benefits — explains what quiz completion unlocks ──
// Sits between How-it-works and FinalCTA. Per product spec:
//   • Communicates that the questionnaire UNLOCKS personal result,
//     suitable clinics, free online orientation slots when available,
//     and Care Pass after a clinic-confirmed consultation.
//   • All CTAs send users to the QUIZ, never to direct booking.
//   • Care Pass card never claims "instant unlock" — wording is
//     deliberately conditional.
//   • Analytics: section view fires `homepage_unlock_benefits_viewed`;
//     primary CTA fires `homepage_unlock_benefits_cta_clicked`;
//     the optional Care Pass / orientation chips fire dedicated events.
function UnlockBenefits() {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return
    let fired = false
    const io = new IntersectionObserver((entries) => {
      if (!fired && entries.some((e) => e.isIntersecting)) {
        fired = true
        try { trackPatientEvent('homepage_unlock_benefits_viewed') } catch { /* noop */ }
        io.disconnect()
      }
    }, { rootMargin: '0px 0px -10% 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  const benefits = [
    {
      title: 'Персонален резултат',
      text: 'Виж какъв тип консултация може да е подходяща според отговорите ти.',
      icon: <ShieldCheck className="w-5 h-5 text-teal-700" />,
    },
    {
      title: 'Безплатна онлайн ориентация',
      text: 'При избрани партньорски клиники можеш да отключиш свободни безплатни онлайн часове след попълнен въпросник.',
      icon: <Sparkles className="w-5 h-5 text-teal-700" />,
      onClick: () => { try { trackPatientEvent('homepage_free_orientation_benefit_clicked') } catch { /* noop */ } },
    },
    {
      title: 'Zubite Care Pass',
      text: 'След запазена и потвърдена от клиниката онлайн или присъствена консултация през Zubite.bg отключваш Care Pass с партньорски предложения за продукти за орална хигиена.',
      icon: <Gift className="w-5 h-5 text-teal-700" />,
      onClick: () => { try { trackPatientEvent('homepage_care_pass_benefit_clicked') } catch { /* noop */ } },
    },
  ]

  return (
    <section
      ref={ref}
      className="relative py-20 sm:py-28 overflow-hidden"
      data-testid="home-unlock-benefits"
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 18% 30%, rgba(94,234,212,0.16) 0%, transparent 65%),' +
            'radial-gradient(ellipse 50% 40% at 82% 75%, rgba(165,243,252,0.20) 0%, transparent 65%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F8FAF9 100%)',
        }}
      />
      <div aria-hidden className="absolute -top-32 right-0 w-[28rem] h-[28rem] rounded-full bg-teal-100/30 blur-3xl pointer-events-none" />

      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/65 backdrop-blur-md ring-1 ring-white/80 text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Какво отключваш
            </span>
            <h2 className="mt-5 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
              Попълни оценката и отключи следващата стъпка
            </h2>
            <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed">
              След краткия въпросник Zubite.bg ти показва персонален резултат,
              подходящи партньорски клиники и, когато има свободни слотове,
              възможност за безплатна онлайн ориентация преди посещение.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6" data-testid="home-unlock-benefits-grid">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={80 * i}>
              <div
                onClick={b.onClick}
                className="relative h-full rounded-2xl bg-white/75 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_18px_44px_-22px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.92)] p-6 sm:p-7 cursor-default"
                data-testid={`home-unlock-benefit-${i}`}
              >
                <div className="w-11 h-11 rounded-xl bg-teal-50 ring-1 ring-teal-100 flex items-center justify-center mb-4">
                  {b.icon}
                </div>
                <h3 className="font-serif text-lg font-semibold text-slate-900 mb-2">{b.title}</h3>
                <p className="text-[14px] text-slate-600 leading-relaxed">{b.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 sm:mt-12 flex flex-col items-center text-center">
          <Link
            href={QUIZ_URL}
            onClick={() => { try { trackPatientEvent('homepage_unlock_benefits_cta_clicked') } catch { /* noop */ } }}
            className="group relative inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-6 py-3.5 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55)] overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            data-testid="home-unlock-benefits-cta"
          >
            <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
            <span className="relative inline-flex items-center gap-1.5">
              Започни оценката
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
          <p className="mt-5 text-[11px] text-slate-400 leading-relaxed max-w-2xl">
            Безплатните онлайн часове са налични при избрани партньорски клиники
            и според свободните им слотове. Онлайн ориентацията не замества
            физически преглед, диагноза или лечебен план.
          </p>
        </div>
      </div>
    </section>
  )
}



// ─── Mobile sticky CTA ───────────────────────────────────────────
// Removed Feb 2026 per user request — the bottom floating "Започни
// анализа · 60 сек" pill was visually competing with in-page CTAs on
// iOS Safari, especially next to the browser bottom chrome. The hero
// and decision-preview CTAs remain the primary quiz entry points.
// Kept here only as a no-op reference; remove permanently in next cleanup.
function MobileStickyCTA() {
  return null
}

// ─── Public exports ──────────────────────────────────────────────
export function HomeContent({ recentPosts = [] }: { recentPosts?: HomeBlogPost[] }) {
  useBackgroundParallax()
  return (
    <>
      <MotionStyles />
      <Nav />
      {/* 1. Hero / Awareness */}
      <Hero />
      {/* 1.5 Lumi explainer video — immediately after hero */}
      <LumiVideoSection />
      <TrustStrip />
      {/* 2. Patient benefit */}
      <PatientBenefit />
      {/* 3. What you may be noticing */}
      <SymptomChips />
      {/* 4. How it works (5 steps) */}
      <HowItWorks />
      {/* 4.5 Unlock benefits — what completing the quiz unlocks */}
      <UnlockBenefits />
      {/* 4.6 Zubite Clinic Standard — trust pillars */}
      <ClinicStandardSection />
      {/* 5. Product / result preview */}
      <DecisionPreview />
      {/* 6. Why trust Zubite */}
      <TrustReason />
      {/* 7. Treatment/category coverage */}
      <TreatmentCategories />
      {/* 8. Care Pass */}
      <CarePassTeaser />
      {/* Bonus: editorial reinforcement (kept under Care Pass, before FAQ) */}
      <RecentArticles posts={recentPosts} />
      {/* 9. FAQ / objections */}
      <FAQ />
      {/* 10. Final CTA */}
      <FinalCTA />
      <Footer />
    </>
  )
}

