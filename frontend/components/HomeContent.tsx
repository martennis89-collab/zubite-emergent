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
import { useState } from 'react'
import Link from 'next/link'
import { Footer } from '@/components/Footer'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { TREATMENT_PRICES, ORTHO_DURATION, formatPrice } from '@/lib/pricing'
import {
  ShieldCheck, Sparkles, Stethoscope, ChevronDown,
  CheckCircle2, ArrowRight, Heart, Smile, Activity,
  AlignLeft, HelpCircle,
} from 'lucide-react'

import {
  Reveal,
  useBackgroundParallax,
  MotionStyles,
  QUIZ_URL,
} from './home/_shared'
import { Nav } from './home/Nav'
import { Hero } from './home/Hero'
import { FinalCTA } from './home/FinalCTA'



// ─── Section 2 — Symptom picker (split paths) ────────────────────
// Bite/alignment chips START THE QUIZ (the quiz can only read
// bite/alignment). Everything the quiz cannot read (gums, bad breath,
// missing tooth) lives in a separate, quieter block that routes to
// Журнал articles — never into the quiz. This keeps the platform's
// trust promise: the quiz never claims to read a symptom it cannot.
function SymptomPicker() {
  // Quiz chips — bite/alignment only. All start the quiz; `quiz_start_source`
  // records which chip initiated it.
  const quizChips: Array<{ label: string; source: string; segment?: 'child' | 'teen' | 'adult' }> = [
    { label: 'Криви или струпани зъби',            source: 'crooked_teeth' },
    { label: 'Неравна захапка',                    source: 'uneven_bite' },
    { label: 'Стягане или щракане в челюстта',     source: 'jaw_tension' },
    { label: 'Изтъркване на зъбите',               source: 'tooth_wear' },
    { label: 'Детето диша през устата',            source: 'mouth_breathing', segment: 'child' },
    { label: 'Чудиш се за брекети или алайнери',   source: 'braces_vs_aligners' },
  ]
  // Article-routed chips — NOT the quiz. Things the quiz can't read.
  const articleChips: Array<{ label: string; href: string }> = [
    { label: 'Кървящи венци', href: '/symptoms/bleeding-gums' },
    { label: 'Лош дъх',       href: '/symptoms' },
    { label: 'Липсващ зъб',   href: '/implants' },
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
      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 text-center">
        <Reveal>
          <h2 className="font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
            Кое от тези ти е познато?
          </h2>
          <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Ако не си сигурен дали е дребно или си струва да се провери —
            започни оттук.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <ul className="mt-10 flex flex-wrap justify-center gap-2.5 sm:gap-3" data-testid="symptom-chips">
            {quizChips.map((c, i) => (
              <li key={c.label}>
                <Link
                  href={c.segment ? `${QUIZ_URL}?segment=${c.segment}` : QUIZ_URL}
                  onClick={() => { try { trackPatientEvent('home_quiz_start', { quiz_start_source: c.source, cta_location: 'picker' }) } catch { /* noop */ } }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white ring-1 ring-slate-200 text-sm text-slate-800 font-medium px-4 py-2 hover:-translate-y-0.5 hover:ring-teal-200 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 transition-all cursor-pointer"
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
              onClick={() => { try { trackPatientEvent('home_cta_clicked', { cta_location: 'picker' }) } catch { /* noop */ } }}
              className="group inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-6 py-3.5 hover:-translate-y-0.5 transition-all shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55)] overflow-hidden relative"
              style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
              data-testid="noticing-cta"
            >
              <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
              <span className="relative inline-flex items-center gap-1.5">
                Провери дали захапката ти е наред (60 сек)
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </Reveal>
        {/* Article-routed block — quieter, visually separated. Routes to
            Журнал, NOT the quiz. */}
        <Reveal delay={260}>
          <div className="mt-12 pt-8 border-t border-slate-200/50 max-w-xl mx-auto">
            {/* Says out loud why these route to articles instead of the quiz:
                the quiz reads bite/alignment only. Being explicit turns an
                apparent gap into the trust signal it actually is. */}
            <p className="text-sm text-slate-500 mb-3">
              Друго те притеснява? Въпросникът покрива само захапката и
              подредбата на зъбите. За тези теми виж кратките обяснения.
            </p>
            <ul className="flex flex-wrap justify-center gap-2" data-testid="article-route-chips">
              {articleChips.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    onClick={() => { try { trackPatientEvent('home_article_route', { quiz_start_source: c.label }) } catch { /* noop */ } }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/50 ring-1 ring-slate-200/70 text-[13px] text-slate-600 px-3 py-1.5 hover:bg-white hover:text-teal-700 transition-all"
                    data-testid={`article-route-chip-${c.href}`}
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Section 4 — Process (4 connected steps; folds in Lumi + Care Pass) ─────
function Process() {
  const [lumiOpen, setLumiOpen] = useState(false)
  const steps: Array<{ t: string; s: string }> = [
    {
      t: 'Отговаряш',
      s: 'на кратки въпроси за това, което забелязваш при зъбите и захапката си.',
    },
    {
      t: 'Виждаш на какъв етап си',
      s: 'ранен, развиващ се или напреднал. И какво означава това на прост език.',
    },
    {
      t: 'Избираш дали да продължиш',
      s: 'можеш да поискаш до 3 подходящи клиники в твоя град или безплатна онлайн ориентация с партньорска клиника. Или просто да задържиш ориентира за себе си.',
    },
    {
      t: 'Получаваш Care Pass',
      s: 'след консултация през Zubite.bg клиниката ти дава карта с отстъпки за продукти за орална хигиена.',
    },
  ]
  return (
    <section id="how" className="relative py-20 sm:py-28 overflow-hidden scroll-mt-24" data-testid="home-how">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 20% 25%, rgba(94,234,212,0.16) 0%, transparent 65%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F7FAF9 100%)',
        }}
      />
      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal>
          <h2 className="font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08] max-w-3xl">
            Какво се случва, след като започнеш?
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base max-w-xl">
            Четири стъпки. Без ангажимент, без диагноза.
          </p>
        </Reveal>

        {/* Connected steps track — numbered circles joined by a line,
            no card boxes. Vertical rail on mobile, horizontal on lg+. */}
        <ol className="mt-12 grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-6">
          {steps.map((st, i) => (
            <li key={st.t} className="relative">
              {/* Mobile: vertical connector from this circle to the next */}
              {i < steps.length - 1 && (
                <div aria-hidden className="lg:hidden absolute left-5 top-12 -bottom-10 w-px bg-teal-200" />
              )}
              {/* Desktop: horizontal connector to the next circle */}
              {i < steps.length - 1 && (
                <div aria-hidden className="hidden lg:block absolute top-5 left-12 -right-6 h-px bg-teal-200" />
              )}
              <Reveal delay={i * 70}>
                <div className="flex lg:block gap-4">
                  <span className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white ring-1 ring-teal-200 font-serif text-lg text-teal-700 shrink-0">
                    {i + 1}
                  </span>
                  <div className="lg:mt-4">
                    <h3 className="font-serif text-lg font-semibold text-slate-900 leading-snug">{st.t}</h3>
                    <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">{st.s}</p>
                    {/* Optional Lumi explainer — inline play on step 01 only. */}
                    {i === 0 && (
                      <button
                        type="button"
                        onClick={() => { setLumiOpen((v) => !v); try { trackPatientEvent('home_lumi_play') } catch { /* noop */ } }}
                        className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-teal-700 hover:text-teal-800 transition-colors"
                        data-testid="process-lumi-play"
                        aria-expanded={lumiOpen}
                      >
                        <span aria-hidden className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700">▷</span>
                        Виж кратко видео (30 сек)
                      </button>
                    )}
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        {/* Lumi video — mounts only after the patient opts in (no preload). */}
        {lumiOpen && (
          <Reveal>
            <div className="mt-6 mx-auto max-w-sm rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.18)]" style={{ aspectRatio: '9 / 16' }} data-testid="process-lumi-video-wrap">
              <video
                src="/videos/lumi-homepage-explainer.mp4"
                poster="/images/lumi-homepage-poster.webp"
                controls
                autoPlay
                playsInline
                preload="none"
                className="w-full h-full object-cover bg-slate-900"
                data-testid="process-lumi-video"
              >
                Браузърът ти не поддържа видео.
              </video>
            </div>
          </Reveal>
        )}

        <Reveal delay={120}>
          <div className="mt-10 text-center">
            <Link
              href={QUIZ_URL}
              onClick={() => { try { trackPatientEvent('home_cta_clicked', { cta_location: 'process' }) } catch { /* noop */ } }}
              className="group relative inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-6 py-3.5 hover:-translate-y-0.5 transition-all shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55)] overflow-hidden"
              style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
              data-testid="process-cta"
            >
              <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
              <span className="relative inline-flex items-center gap-1.5">
                Провери на кой етап си (60 сек)
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 9. Treatment categories — Section 7 ─────────────────────────
function TreatmentCategories() {
  // Ortho-first order per the July 2026 homepage brief.
  const cats: Array<{ t: string; s: string; href: string; icon: React.ReactNode; featured?: boolean }> = [
    { t: 'Алайнери vs брекети',     s: 'Каква е разликата, кога кой вариант има смисъл и какво зависи от случая.',           href: '/aligners-vs-braces',   icon: <AlignLeft className="w-4 h-4" />,    featured: true },
    { t: 'Ортодонтия',              s: 'Криви зъби, захапка, струпване, разстояния и нужда от ортодонтска оценка.',          href: '/orthodontics',         icon: <Smile className="w-4 h-4" />,        featured: true },
    { t: 'TMJ / челюст',            s: 'Щракане, пукане, болка в челюстта, скърцане със зъби или сутрешно напрежение.',       href: '/tmj',                  icon: <Activity className="w-4 h-4" /> },
    { t: 'Детска ортодонтия',       s: 'Кога детето има нужда от ранна оценка и кои признаци не е добре да се игнорират.',    href: '/orthodontics',         icon: <Smile className="w-4 h-4" /> },
    { t: 'Импланти',                s: 'Липсващ зъб, стари мостове, подвижни протези или нужда от план за възстановяване.',  href: '/implants',             icon: <Stethoscope className="w-4 h-4" /> },
    { t: 'Естетична стоматология',  s: 'Фасети, бондинг, избелване и усмивка — с реалистични очаквания.',                     href: '/cosmetic-dentistry',   icon: <Sparkles className="w-4 h-4" /> },
    { t: 'Венци и хигиена',         s: 'Кървене, чувствителност, неприятен дъх и плакировка — какво да обсъдиш на преглед.',  href: '/symptoms',             icon: <Heart className="w-4 h-4" /> },
    { t: 'Сън и дишане',            s: 'Симптоми, свързани със сън, дишане през устата, захапка и челюстна позиция.',         href: '/sleep-airway',         icon: <Heart className="w-4 h-4" /> },
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
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold eyebrow-sparkle">Ръководства</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08] max-w-3xl">
            Или започни с четене.
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Ако още не си готов за въпросника, разгледай по тема. Всяко
            ръководство завършва с проверка на етапа.
          </p>
        </Reveal>
        {/* Horizontal scroll-snap row — 8 guides is a long list, so it gets
            a swipeable rail instead of a static 4×2 grid. The row bleeds to
            the viewport edge so a partially visible tile signals there is
            more to scroll. Tiles link straight to the guide (the old cards
            needed expand-then-click to get there). */}
        <ul className="mt-10 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 sm:-mx-10 sm:px-10 lg:-mx-16 lg:px-16 [scrollbar-width:thin]">
          {cats.map((c, i) => (
            <li key={c.t} className="w-[280px] shrink-0 snap-start">
              <Reveal delay={Math.min(i, 4) * 60} className="h-full">
                <Link
                  href={c.href}
                  className={
                    'group/treatment flex flex-col gap-3 h-full rounded-2xl p-6 ring-1 transition-all hover:-translate-y-0.5 ' +
                    (c.featured
                      ? 'bg-teal-50 ring-teal-200 hover:ring-teal-300'
                      : 'bg-white ring-slate-200 hover:ring-teal-200')
                  }
                  data-testid={`treatment-card-${i}`}
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white text-teal-700 ring-1 ring-teal-100">
                    {c.icon}
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 group-hover/treatment:text-teal-700 transition-colors">
                    {c.t}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.s}</p>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-teal-700 group-hover/treatment:gap-2 transition-all">
                    Виж насоки <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>

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
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 85% 30%, rgba(94,234,212,0.22) 0%, transparent 65%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
        }}
      />
      <div className="relative z-10 max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <Reveal>
          <h2 className="font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
            Какво получаваш накрая?
          </h2>
          <p className="mt-5 text-slate-600 text-lg sm:text-xl leading-relaxed max-w-md">
            Веднага след последния въпрос — без регистрация и без да чакаш.
            Кратко, разбираемо, без жаргон.
          </p>
          {/* Each line below maps to something the result screen actually
              renders (stage title, flag chips, urgency line, education). */}
          <ul className="mt-6 space-y-2.5 text-base text-slate-700">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-1 shrink-0" /> На кой етап си: ранен, развиващ се или напреднал</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-1 shrink-0" /> Кратко обобщение на това, което описа</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-1 shrink-0" /> Дали има смисъл да го обсъдиш с ортодонт</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-1 shrink-0" /> Ориентировъчни цени и срок за лечение в България</li>
          </ul>
          <Link
            href={QUIZ_URL}
            onClick={() => { try { trackPatientEvent('home_cta_clicked', { cta_location: 'stage_card' }) } catch { /* noop */ } }}
            className="group mt-7 relative inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-6 py-3.5 hover:-translate-y-0.5 transition-all shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55)] overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            data-testid="decision-cta"
          >
            <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
            <span className="relative inline-flex items-center gap-1.5">
              Провери на кой етап си (60 сек)
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </Reveal>
        <Reveal delay={120}>
          <div className="relative">
            {/* Single soft backing card for depth — one layer, not a stack */}
            <div aria-hidden className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-teal-50 to-white ring-1 ring-teal-100/70" />
            {/* Faithful miniature of the REAL result screen (adult ·
                moderate band). Every string below is copied from
                MasterQuiz's RESULT_CONTENT / STAGE_BY_BAND / flag labels, so
                this previews what the patient actually receives.
                Previously this card promised an "Ориентировъчен срок"
                (9–14 месеца), a "Ценови диапазон" (~€1 300 – €2 150) and a
                list of treatment approaches — none of which the quiz
                produces. See the note in the section header above. */}
            <div className="relative rounded-2xl bg-white shadow-[0_24px_48px_-20px_rgba(15,23,42,0.18)] ring-1 ring-slate-100 p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Твоят ориентир</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 ring-1 ring-teal-100 rounded-full px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3" /> Примерен резултат
                </span>
              </div>
              <h3 className="mt-3 font-serif text-2xl sm:text-3xl text-slate-900 leading-snug">
                Развиващ се етап
              </h3>
              <div className="mt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                  Има сигнали за внимание
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                Отговорите ти показват модел, който често се задълбочава с
                времето — износване, напрежение или проблем със захапката.
                Не е спешно, но не е и нещо за игнориране.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Струпване', 'Захапка', 'Износване'].map((f) => (
                  <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                    {f}
                  </span>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-teal-50 ring-1 ring-teal-100 p-4">
                <p className="text-sm font-medium text-teal-900 leading-relaxed">
                  Добре е да потърсиш професионална оценка скоро, за да
                  разбереш какви са вариантите ти.
                </p>
              </div>
              {/* Mirrors the price/duration block on the real result screen.
                  Figures come from lib/pricing.ts — the same source the
                  result screen and the price-guide pages read from. */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Алайнери</p>
                  <p className="mt-1 font-serif text-base text-slate-900">
                    {formatPrice(TREATMENT_PRICES['orthodontics-aligners'])}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Продължителност</p>
                  <p className="mt-1 font-serif text-base text-slate-900">{ORTHO_DURATION.typical}</p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500 leading-snug">
                  Общи диапазони, не оценка на твоя случай. Не е диагноза.
                </p>
                <span aria-hidden className="text-xs font-medium text-slate-400 shrink-0">Пример</span>
              </div>
            </div>
            {/* Secondary chips — real content, static (no perpetual float) */}
            <div className="absolute -top-4 -left-3 sm:-left-6 rounded-2xl bg-white shadow-[0_12px_24px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-100 px-3 py-2 flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-[11px] text-slate-700 font-medium">Въпроси за преглед</span>
            </div>
            <div className="absolute -bottom-4 right-2 sm:-right-4 rounded-2xl bg-white shadow-[0_12px_24px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-100 px-3 py-2 flex items-center gap-2">
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
      s: 'Окончателната преценка се прави от стоматолог или ортодонт след преглед.',
      long: 'Zubite.bg не поставя диагноза и не замества преглед, образна диагностика или лекарска преценка. Дава ориентир според това, което си описал.',
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      t: 'Не показваме случаен списък',
      s: 'Насочваме според описания случай, града и категорията, не като класация „най-добри клиники".',
      long: 'Не получаваш произволен каталог от клиники. Насочваме към партньорски клиники, които работят с описания случай в твоя град — нищо повече.',
      icon: <Stethoscope className="w-5 h-5" />,
    },
    {
      t: 'Не те притискаме',
      s: 'Сам избираш дали да продължиш. Ориентирът остава твой.',
      long: 'Може да получиш ориентира си и да го обмислиш на спокойствие. Заявка към клиника тръгва само ако ти решиш да продължиш.',
      icon: <Sparkles className="w-5 h-5" />,
    },
  ]
  return (
    // Carries the `kakvo-e-zubite` anchor: the nav's "Какво е Zubite.bg"
    // link pointed at the old PatientBenefit section, which the July 2026
    // rebuild cut from the page. This section's what-we-are/aren't copy is
    // the live equivalent, so the anchor lands here now.
    <section id="kakvo-e-zubite" className="relative py-24 sm:py-32 overflow-x-clip scroll-mt-24" data-testid="home-trust" style={{ backgroundColor: '#0F4F4A' }}>
      {/* Single ambient glow — mirrors the #kakvo-e-zubite dark-green moment. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 80% 20%, rgba(45,212,191,0.20) 0%, rgba(45,212,191,0) 70%),' +
            'radial-gradient(circle at 50% 50%, rgba(15,79,74,0) 0%, rgba(7,40,38,0.55) 90%)',
        }}
      />
      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-200 font-semibold eyebrow-sparkle">Защо да ни се довериш</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.08] max-w-3xl">
            Не диагноза. Не каталог.<br />Ориентир преди избора.
          </h2>
        </Reveal>
        {/* Editorial stacked list — the page's core trust commitments read
            as full statements, nothing collapsed behind a "see more". */}
        <div className="mt-12 max-w-3xl divide-y divide-white/10">
          {cards.map((c, i) => (
            <Reveal key={c.t} delay={i * 100} className="py-8 first:pt-0 last:pb-0">
              <div className="flex items-start gap-5" data-testid={`trust-card-${i}`}>
                <div className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-teal-100 ring-1 ring-white/20">
                  {c.icon}
                </div>
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white leading-tight">{c.t}</h3>
                  <p className="mt-2 text-base text-teal-50/85 leading-relaxed">{c.s}</p>
                  <p className="mt-2 text-sm text-teal-50/70 leading-relaxed">{c.long}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section — Zubite стандарт (dual-audience) ───────────────────
// The homepage has two comprehension audiences: patients and clinics.
// Every other section speaks to patients only; this is the one place a
// doctor landing here learns what Zubite is for them. The curation
// statement is the shared message (patients read "these clinics are
// vetted", clinics read "there is a bar"), then the two audiences split
// into their own paths. Clinic-side copy is a faithful condensation of
// the approved /za-kliniki positioning — no new claims are made here.
function ZubiteStandard() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" data-testid="home-zubite-standard">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 40% at 25% 30%, rgba(94,234,212,0.14) 0%, transparent 65%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F7FBFA 100%)',
        }}
      />
      <div className="relative max-w-4xl mx-auto px-6 sm:px-10">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-serif text-[2rem] sm:text-4xl font-semibold text-slate-900 leading-[1.1]">
              Не всяка клиника може да е част от Zubite.bg.
            </h2>
            <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed">
              Работим с ограничен брой партньорски клиники, които покриват
              нашия стандарт за качество, отношение към пациента и прозрачност.
              Когато видиш клиника тук, тя е избрана по критерии — не по реклама.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid sm:grid-cols-2 gap-px bg-slate-200 rounded-2xl overflow-hidden ring-1 ring-slate-200">
            {/* Patient path */}
            <div className="bg-[#FCFAF8] p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">
                Ако си пациент
              </p>
              <p className="mt-3 text-slate-700 leading-relaxed">
                Виж по какви критерии подбираме клиниките, преди да решиш
                на кого да се довериш.
              </p>
              <Link
                href="/standart-za-kliniki"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
                data-testid="home-zubite-standard-link"
              >
                Виж Zubite стандарт <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Clinic path */}
            <div className="bg-white p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">
                Ако си клиника
              </p>
              <p className="mt-3 text-slate-700 leading-relaxed">
                Пациентите стигат до теб, след като вече са се ориентирали
                за случая си — с контекст, не просто още едно запитване.
              </p>
              <Link
                href="/za-kliniki"
                onClick={() => { try { trackPatientEvent('home_cta_clicked', { cta_location: 'clinic_partner' }) } catch { /* noop */ } }}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
                data-testid="home-za-kliniki-link"
              >
                Виж партньорската програма <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 12. FAQ ─────────────────────────────────────────────────────
function FAQ() {
  const items = [
    { q: 'На кой етап съм — как разбирам?',   a: 'Не поставяме диагноза. Кратък въпросник ти показва дали описаните признаци приличат на ранен, развиващ се или напреднал етап, и дали има смисъл да го обсъдиш с ортодонт. Точната преценка се прави след преглед.' },
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


// ─── Public exports ──────────────────────────────────────────────
export function HomeContent() {
  useBackgroundParallax()
  // July 2026 rebuild, revised 2026-07-16. The homepage has ONE purpose:
  // explain what Zubite.bg is (to patients AND clinics) and prompt the
  // patient into the quiz. Sections are ordered to explain before asking:
  // the hero opens the quiz, then "what this is / isn't" lands immediately
  // after — so a visitor (or a doctor) knows what the platform is before
  // the second quiz prompt.
  //
  // Cut for failing that purpose: Журнал blog feed (content discovery, not
  // explanation or conversion — /blog and the guides rail cover it). Earlier
  // cuts: standalone Lumi (→ Process step 01), TrustStrip marquee,
  // PatientBenefit, UnlockBenefits, CarePassTeaser (→ Process step 04),
  // HorizontalSteps HowItWorks (→ Process).
  return (
    <>
      <MotionStyles />
      <Nav />
      {/* 1. Hero — explains + IS the quiz (segment step, deep-links to /quiz) */}
      <Hero />
      {/* 2. What Zubite is / isn't — carries the #kakvo-e-zubite anchor */}
      <TrustReason />
      {/* 3. Symptom picker (split paths) */}
      <SymptomPicker />
      {/* 4. Stage output card */}
      <DecisionPreview />
      {/* 5. Process (4 steps · Lumi · Care Pass) */}
      <Process />
      {/* 6. Guides — the "not ready for the quiz yet" fallback */}
      <TreatmentCategories />
      {/* 7. Zubite стандарт — dual-audience: patient + clinic paths */}
      <ZubiteStandard />
      {/* 8. FAQ + final CTA + footer */}
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  )
}

