'use client'

/**
 * Premium Wave.co-inspired homepage for Zubite.bg (Feb 2026).
 *
 * Built per /app/design_guidelines.json:
 *   - Warm-ivory base, soft turquoise/blue-green accents
 *   - Playfair Display headlines via CSS @font-face fallback (already
 *     used in the rest of the app as `font-serif`)
 *   - 13 sections per the blueprint
 *   - No new dependencies; lucide-react icons only
 *   - Mobile-first, fully responsive, motion-safe entrance reveals
 *
 * The previous `/app/frontend/components/AnimatedHomeSections.tsx`
 * stack remains in the repo (no deletes) so that any deep-link or
 * legacy SEO references still work. Only `/app/frontend/app/page.tsx`
 * is rewired to use this new file.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ClinicStandardSection } from '@/components/patient/ClinicStandardSection'
import { Footer } from '@/components/Footer'
import { resolveImageUrl } from '@/lib/imageUrl'
import {
  ShieldCheck, Sparkles, Building2, Stethoscope, ChevronDown,
  CheckCircle2, ArrowRight, MoveRight, Heart, Smile, Activity,
  AlignLeft, Clock, Star, BookOpen, Mail,
  MessagesSquare, HelpCircle, Gift,
} from 'lucide-react'

export interface HomeBlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  featured_image: string | null
  published_at: string
}

const HERO_BG =
  'https://static.prod-images.emergentagent.com/jobs/25b55d94-1ed6-49c7-af05-4dd6f19863cf/images/ee418e7567bbb08fdf27e9d9873be33914cd827a79e42b9833f9728687f9addb.png'

// User-provided premium asset renders (Feb 2026)
// Asset B — Floating frosted-glass UI panels (hero & decision depth layer)
const ASSET_B_GLASS_PANELS =
  'https://customer-assets.emergentagent.com/job_25b55d94-1ed6-49c7-af05-4dd6f19863cf/artifacts/d3zg8noc_ChatGPT%20Image%20May%2017%2C%202026%2C%2010_04_41%20AM.png'
// Asset C — Premium dental decision app UI mockup (decision preview shell support)
const ASSET_C_APP_MOCKUP =
  'https://customer-assets.emergentagent.com/job_25b55d94-1ed6-49c7-af05-4dd6f19863cf/artifacts/owz9rhgj_ChatGPT%20Image%20May%2017%2C%202026%2C%2010_05_03%20AM.png'
// Asset E — Premium Zubite Care Pass card render (care-pass centerpiece)
const ASSET_E_CARE_PASS_CARD =
  'https://customer-assets.emergentagent.com/job_25b55d94-1ed6-49c7-af05-4dd6f19863cf/artifacts/kyba9eaq_ChatGPT%20Image%20May%2017%2C%202026%2C%2010_21_45%20AM.png'
// Asset F — Final CTA atmospheric navy/teal background
const ASSET_F_FINAL_CTA_BG =
  'https://customer-assets.emergentagent.com/job_25b55d94-1ed6-49c7-af05-4dd6f19863cf/artifacts/jdhdxffb_ChatGPT%20Image%20May%2017%2C%202026%2C%2010_05_42%20AM.png'

const QUIZ_URL = '/quiz'

// ─── Reveal-on-scroll helper ─────────────────────────────────────
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
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

// ─── Lightweight parallax — single rAF scroll → CSS var `--py` ──
// Background decorative elements use
//   style={{ transform: 'translate3d(0, calc(var(--py,0) * -0.08px), 0)' }}
// to drift opposite to scroll, creating depth without re-renders.
// Honors prefers-reduced-motion: if reduced, --py stays at 0 forever.
function useBackgroundParallax() {
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
const px = (factor: number): React.CSSProperties => ({
  transform: `translate3d(0, calc(var(--py, 0) * ${factor}px), 0)`,
  willChange: 'transform',
})

function Reveal({
  children, delay = 0, className = '',
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={
        'transition-all duration-700 ease-out ' +
        (shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4') +
        ' ' + className
      }
    >
      {children}
    </div>
  )
}

// ─── 1. Sticky navigation ────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <div
      className="fixed top-3 sm:top-4 inset-x-3 sm:inset-x-6 z-50 flex justify-center pointer-events-none"
      data-testid="home-nav"
    >
      <header
        className={
          'pointer-events-auto w-full max-w-5xl rounded-full transition-all duration-300 relative ' +
          (scrolled
            ? 'bg-white/15 backdrop-blur-[28px] ring-1 ring-white/40 shadow-[0_14px_44px_-12px_rgba(15,23,42,0.18),0_2px_8px_-2px_rgba(15,23,42,0.06)]'
            : 'bg-white/10 backdrop-blur-[28px] ring-1 ring-white/35 shadow-[0_10px_36px_-12px_rgba(15,23,42,0.15),0_2px_8px_-2px_rgba(15,23,42,0.05)]')
        }
      >
        {/* Liquid glass top highlight — strong specular like real glass */}
        <div aria-hidden className="absolute inset-x-4 top-px h-1/2 rounded-t-full bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none" />
        {/* Liquid glass bottom shadow — refraction depth */}
        <div aria-hidden className="absolute inset-x-6 bottom-px h-1/3 rounded-b-full bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
        {/* Bottom inner thin line — subtle refraction edge */}
        <div aria-hidden className="absolute inset-x-8 bottom-0.5 h-px rounded-full bg-gradient-to-r from-transparent via-slate-900/8 to-transparent pointer-events-none" />
        <div className="px-4 sm:px-6 h-14 sm:h-15 flex items-center justify-between">
          <Link href="/" className="font-serif text-lg sm:text-xl font-semibold tracking-tight">
            <span className="text-slate-900">Zubite</span>
            <span className="text-teal-600">.bg</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <Link href="#noticing"   className="hover:text-slate-900 transition-colors">Какво забелязваш</Link>
            <Link href="#how"        className="hover:text-slate-900 transition-colors">Как работи</Link>
            <Link href="#treatments" className="hover:text-slate-900 transition-colors">Лечения</Link>
            <Link href="#care-pass"  className="hover:text-slate-900 transition-colors">Care Pass</Link>
            <Link href="/blog"       className="hover:text-slate-900 transition-colors">Журнал</Link>
            <Link href="/za-kliniki" className="hover:text-slate-900 transition-colors">За клиники</Link>
          </nav>
          <Link
            href={QUIZ_URL}
            className="group relative inline-flex items-center gap-1.5 rounded-full text-white text-xs sm:text-sm font-medium px-3.5 sm:px-4 py-2 transition-all hover:-translate-y-0.5 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)' }}
            data-testid="nav-cta"
          >
            <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/15 blur-sm pointer-events-none" />
            <span className="relative inline-flex items-center gap-1.5">
              Започни анализа
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </header>
    </div>
  )
}

// ─── 2. Hero — floating quiz/result mockup ───────────────────────
function Hero() {
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

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-teal-100 text-teal-700 text-[11px] font-medium px-3 py-1 uppercase tracking-[0.16em]">
              <ShieldCheck className="w-3 h-3" />
              Първо яснота. После избор.
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
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                '60 секунди',
                'Без регистрация',
                'Ориентир, не диагноза',
                'Care Pass след консултация',
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
          <span className="inline-flex items-center gap-1 text-teal-700 text-xs font-medium whitespace-nowrap">
            Виж следващи стъпки <ArrowRight className="w-3 h-3" />
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

// ─── 3. Trust strip ──────────────────────────────────────────────
function TrustStrip() {
  const items = [
    'Без регистрация',
    'Без задължение',
    'Ориентир за цена и срок',
    'Насочване според случая',
    'Care Pass след консултация',
    'Не заменя преглед',
  ]
  // Duplicate the list so the loop is seamless: the second copy slides in
  // as the first copy slides out. We translate the whole track by -50%
  // (== one full copy width) over ~40s and loop infinitely.
  return (
    <section className="py-10 sm:py-12" data-testid="home-trust-strip">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
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
  const benefits: Array<{ t: string; s: string; long: string; icon: React.ReactNode }> = [
    {
      t: 'По-малко объркване',
      s: 'Разбираш дали има смисъл от наблюдение, профилактика или консултация.',
      long: 'Не всеки симптом изисква лечение веднага. Понякога е достатъчно наблюдение или подобрена ежедневна грижа. Получаваш ориентир коя посока е по-вероятна за теб.',
      icon: <HelpCircle className="w-4 h-4" />,
    },
    {
      t: 'По-добри въпроси',
      s: 'Отиваш на преглед по-подготвен.',
      long: 'Когато попиташ правилно, получаваш по-полезен отговор. Zubite ти показва кои въпроси да зададеш на стоматолог или ортодонт за твоя конкретен случай.',
      icon: <MessagesSquare className="w-4 h-4" />,
    },
    {
      t: 'По-малко натиск',
      s: 'Продължаваш само ако решиш.',
      long: 'Никой не те задължава да продължиш към клиника или лечение. Може просто да получиш ориентира си и да го обмислиш на спокойствие.',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      t: 'Допълнителна стойност',
      s: 'След консултация получаваш Care Pass с отстъпки за продукти за орална хигиена.',
      long: 'Когато заявиш насочване чрез Zubite.bg и посетиш консултацията, партньорската клиника ти предоставя Zubite Care Pass — карта с отстъпки за продукти за орална хигиена.',
      icon: <Gift className="w-4 h-4" />,
    },
  ]
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden" data-testid="home-patient-benefit">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 30% 40%, rgba(94,234,212,0.18) 0%, rgba(94,234,212,0) 70%),' +
            'linear-gradient(180deg, #F4FAF9 0%, #FCFAF8 100%)',
        }}
      />
      <div
        aria-hidden
        data-parallax
        className="absolute -top-20 right-0 w-[28rem] h-[28rem] rounded-full bg-cyan-200/25 blur-3xl pointer-events-none animate-[breatheGlow_15s_ease-in-out_infinite]"
        style={px(-0.05)}
      />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1.3fr] gap-12 items-start">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Защо ти трябва</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
            Не започвай от реклама.<br />Започни от <em className="not-italic text-teal-600">ориентир</em>.
          </h2>
          <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-md">
            Преди да избираш клиника или лечение, първо разбери каква
            следваща стъпка има смисъл.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {benefits.map((b, i) => (
            <Reveal key={b.t} delay={i * 90}>
              <details className="group/benefit relative rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/70 p-5 sm:p-6 hover:-translate-y-1 hover:bg-white/85 hover:ring-teal-200/60 transition-all shadow-[0_6px_30px_-18px_rgba(15,23,42,0.18)] hover:shadow-[0_14px_40px_-18px_rgba(13,148,136,0.22)] cursor-pointer" data-testid={`benefit-card-${i}`}>
                <summary className="list-none flex flex-col gap-3">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-teal-50/80 text-teal-700 ring-1 ring-teal-100">
                    {b.icon}
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">{b.t}</h3>
                  <p className="text-base text-slate-600 leading-relaxed">{b.s}</p>
                  <span className="text-[11px] text-teal-700 font-medium inline-flex items-center gap-1 mt-1 group-open/benefit:hidden">
                    Виж повече <ChevronDown className="w-3 h-3" />
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-200/50 pt-3">
                  {b.long}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 5. What you may be noticing — Section 3 ─────────────────────
function SymptomChips() {
  const chips: string[] = [
    'Кървящи венци',
    'Криви или струпани зъби',
    'Щракане в челюстта',
    'Болка или напрежение',
    'Лош дъх',
    'Липсващ зъб',
    'Износване на зъбите',
    'Неясна захапка',
    'Детето диша през устата',
    'Чудиш се за брекети или алайнери',
  ]
  return (
    <section id="noticing" className="relative py-20 sm:py-28 overflow-hidden" data-testid="home-noticing">
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
      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Може би си забелязал</p>
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
              <li
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/75 backdrop-blur-xl ring-1 ring-white/80 text-sm text-slate-800 font-medium px-4 py-2 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:bg-white hover:ring-teal-200/70 hover:text-teal-700 transition-all"
                data-testid={`symptom-chip-${i}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                {c}
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
  const steps: Array<{ n: string; t: string; s: string; accent?: boolean }> = [
    { n: '01', t: 'Отговаряш',              s: 'На кратки въпроси за това, което забелязваш.' },
    { n: '02', t: 'Получаваш ориентир',     s: 'Виждаш дали има смисъл наблюдение, профилактика или консултация.' },
    { n: '03', t: 'Избираш следваща стъпка', s: 'Можеш да продължиш към подходяща клиника, ако искаш.' },
    { n: '04', t: 'Посещаваш консултация',  s: 'Клиниката потвърждава реалния случай.' },
    { n: '05', t: 'Получаваш Care Pass',    s: 'Карта с отстъпки за продукти за орална хигиена.', accent: true },
  ]
  return (
    <section id="how" className="relative py-20 sm:py-28 overflow-hidden" data-testid="home-how">
      <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-teal-200/70 to-transparent hidden lg:block" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Как работи</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08] max-w-3xl">
            Какво се случва след като започнеш?
          </h2>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div
                className={
                  'relative rounded-2xl backdrop-blur-xl p-5 sm:p-6 h-full transition-all hover:-translate-y-1 ' +
                  (s.accent
                    ? 'bg-gradient-to-br from-teal-50/90 to-white/80 ring-1 ring-teal-300/50 shadow-[0_18px_40px_-22px_rgba(13,148,136,0.4)] hover:shadow-[0_22px_50px_-20px_rgba(13,148,136,0.45)]'
                    : 'bg-white/70 ring-1 ring-white/80 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] hover:bg-white/85 hover:shadow-[0_16px_44px_-22px_rgba(15,23,42,0.22)]')
                }
                data-testid={`how-step-${i}`}
              >
                <span className={'font-serif text-3xl font-bold ' + (s.accent ? 'text-teal-500/70' : 'text-teal-600/30')}>
                  {s.n}
                </span>
                <h3 className="mt-2 font-serif text-lg lg:text-xl font-semibold text-slate-900 leading-tight">{s.t}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.s}</p>
                {s.accent && (
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 ring-1 ring-teal-300/40 text-[10px] uppercase tracking-wider text-teal-700 font-semibold px-2.5 py-1">
                    <Gift className="w-3 h-3" /> Care Pass
                  </span>
                )}
                {i < steps.length - 1 && (
                  <MoveRight aria-hidden className="hidden lg:block absolute top-12 -right-3 w-4 h-4 text-teal-300" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 9. Treatment categories — Section 7 ─────────────────────────
function TreatmentCategories() {
  const cats: Array<{ t: string; s: string; href: string; icon: React.ReactNode; featured?: boolean }> = [
    { t: 'Ортодонтия',              s: 'Криви зъби, захапка, струпване, разстояния и нужда от ортодонтска оценка.',          href: '/blog?category=orthodontics', icon: <Smile className="w-4 h-4" />,       featured: true },
    { t: 'Алайнери vs брекети',     s: 'Каква е разликата, кога кой вариант има смисъл и какво зависи от случая.',           href: '/blog/aligners-vs-braces',    icon: <AlignLeft className="w-4 h-4" />,   featured: true },
    { t: 'Импланти',                s: 'Липсващ зъб, стари мостове, подвижни протези или нужда от план за възстановяване.',  href: '/blog?category=implants',     icon: <Stethoscope className="w-4 h-4" /> },
    { t: 'Венци и хигиена',         s: 'Кървене, чувствителност, неприятен дъх и плакировка — какво да обсъдиш на преглед.',  href: '/blog?category=hygiene',      icon: <Heart className="w-4 h-4" /> },
    { t: 'Естетична стоматология',  s: 'Фасети, бондинг, избелване и усмивка — с реалистични очаквания.',                     href: '/blog?category=cosmetic',     icon: <Sparkles className="w-4 h-4" /> },
    { t: 'TMJ / челюст',            s: 'Щракане, пукане, болка в челюстта, скърцане със зъби или сутрешно напрежение.',       href: '/blog?category=tmj',          icon: <Activity className="w-4 h-4" /> },
    { t: 'Сън и дишане',            s: 'Симптоми, свързани със сън, дишане през устата, захапка и челюстна позиция.',         href: '/blog?category=sleep',        icon: <Heart className="w-4 h-4" /> },
    { t: 'Детска ортодонтия',       s: 'Кога детето има нужда от ранна оценка и кои признаци не е добре да се игнорират.',    href: '/blog?category=pediatric',    icon: <Smile className="w-4 h-4" /> },
  ]
  return (
    <section id="treatments" className="relative py-20 sm:py-28 overflow-hidden" data-testid="home-treatments">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 80% 30%, rgba(165,243,252,0.25) 0%, transparent 70%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F7FBFA 100%)',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Категории</p>
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
      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Какво получаваш</p>
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
                <span className="text-xs font-medium text-teal-700">Виж клиники →</span>
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
    <section className="relative py-20 sm:py-28 overflow-hidden" data-testid="home-trust">
      <div
        aria-hidden
        data-parallax
        className="absolute -top-32 left-1/3 w-[28rem] h-[28rem] rounded-full bg-teal-100/30 blur-3xl pointer-events-none animate-[breatheGlow_13s_ease-in-out_infinite]"
        style={px(-0.06)}
      />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Защо да ни се довериш</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08] max-w-3xl">
            Не диагноза. Не каталог.<br />Ориентир преди избора.
          </h2>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-3 gap-4 sm:gap-5">
          {cards.map((c, i) => (
            <Reveal key={c.t} delay={i * 100}>
              <details className="group/trust block rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 p-6 sm:p-7 h-full shadow-[0_8px_28px_-18px_rgba(15,23,42,0.18)] hover:-translate-y-1 hover:bg-white/85 hover:ring-teal-200/60 hover:shadow-[0_18px_50px_-22px_rgba(13,148,136,0.22)] transition-all cursor-pointer" data-testid={`trust-card-${i}`}>
                <summary className="list-none flex flex-col gap-3">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-teal-50/90 text-teal-700 ring-1 ring-teal-100">
                    {c.icon}
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">{c.t}</h3>
                  <p className="text-base text-slate-600 leading-relaxed">{c.s}</p>
                  <span className="text-[11px] text-teal-700 font-medium inline-flex items-center gap-1 mt-1 group-open/trust:hidden">
                    Виж повече <ChevronDown className="w-3 h-3" />
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-200/50 pt-3">
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
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Журнал</p>
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
          >
            Виж всички статии <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── 11. Care Pass teaser — Section 8 ────────────────────────────
function CarePassTeaser() {
  return (
    <section id="care-pass" className="relative py-20 sm:py-28 overflow-hidden" data-testid="home-care-pass">
      {/* Soft section backdrop */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(94,234,212,0.18) 0%, transparent 70%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal>
          <div className="relative rounded-[2rem] overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.5)]"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 100% 0%, rgba(20,184,166,0.35) 0%, transparent 60%),' +
                'radial-gradient(ellipse 60% 60% at 0% 100%, rgba(94,234,212,0.20) 0%, transparent 60%),' +
                'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
            }}
          >
            <div aria-hidden data-parallax className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl animate-[breatheGlow_10s_ease-in-out_infinite]" style={px(-0.05)} />
            <div aria-hidden data-parallax className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl animate-[breatheGlow_12s_ease-in-out_infinite]" style={px(0.04)} />
            <div className="relative p-8 sm:p-12 lg:p-14 grid lg:grid-cols-[1.3fr_1fr] gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/10 ring-1 ring-teal-300/30 text-teal-200 text-[11px] font-medium px-3 py-1 uppercase tracking-[0.18em]">
                  <Gift className="w-3 h-3" /> Zubite Care Pass
                </span>
                <h2 className="mt-4 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.08]">
                  Посети консултацията.<br className="hidden sm:block" /> Получи Care Pass.
                </h2>
                <p className="mt-4 text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
                  Когато заявиш насочване чрез Zubite.bg и посетиш
                  консултацията, партньорската клиника ще ти предостави
                  Zubite Care Pass — карта с отстъпки за продукти за
                  орална хигиена.
                </p>

                {/* 3-step visual flow */}
                <ol className="mt-7 grid sm:grid-cols-3 gap-2.5" data-testid="care-pass-3-step">
                  {[
                    { n: '1', t: 'Заявяваш насочване', icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { n: '2', t: 'Посещаваш консултация', icon: <Stethoscope className="w-3.5 h-3.5" /> },
                    { n: '3', t: 'Клиниката ти дава Care Pass', icon: <Gift className="w-3.5 h-3.5" /> },
                  ].map((step, i) => (
                    <li key={step.n} className="relative rounded-2xl bg-white/[0.06] ring-1 ring-white/15 backdrop-blur-md px-3.5 py-3" data-testid={`care-pass-step-${i}`}>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-400/15 ring-1 ring-teal-300/40 text-teal-200 text-[11px] font-semibold">
                          {step.n}
                        </span>
                        <span className="text-teal-200">{step.icon}</span>
                      </div>
                      <p className="mt-2 text-[13px] text-slate-200 font-medium leading-snug">{step.t}</p>
                    </li>
                  ))}
                </ol>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href={QUIZ_URL}
                    className="group inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-sm font-medium px-5 py-3 transition-all hover:-translate-y-0.5 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.35)]"
                    data-testid="care-pass-cta"
                  >
                    Започни анализа
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/care-pass"
                    className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-xl text-white hover:bg-white/25 text-sm font-medium px-5 py-3 ring-1 ring-white/30 transition-all hover:-translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_8px_24px_-12px_rgba(0,0,0,0.45)] overflow-hidden"
                    data-testid="care-pass-secondary-cta"
                  >
                    <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
                    <span className="relative">Как работи Care Pass</span>
                  </Link>
                </div>
                {/* Benefit chips — hover/tap reveal short clarification */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {([
                    { l: 'Отстъпки за продукти за орална хигиена', d: 'Care Pass съдържа отстъпки за партньорски продукти за ежедневна грижа за зъбите.' },
                    { l: 'Получаваш го от клиниката',               d: 'Pass-ът се предоставя от самата клиника, не от Zubite.bg.' },
                    { l: 'След проведена консултация',              d: 'Получаваш Pass-а след като реално посетиш консултацията.' },
                    { l: 'Не е отстъпка от лечение',                d: 'Care Pass не намалява цената на лечение или процедури.' },
                  ] as const).map((c, i) => (
                    <details
                      key={c.l}
                      className="group/chip"
                      data-testid={`care-pass-chip-${i}`}
                    >
                      <summary
                        className="list-none inline-flex items-center gap-1.5 rounded-full ring-1 ring-white/15 text-[11px] text-slate-200 font-medium px-3 py-1.5 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 hover:ring-teal-300/40 hover:bg-white/[0.10] transition-all"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                      >
                        <CheckCircle2 className="w-3 h-3 text-teal-300 shrink-0" />
                        <span>{c.l}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400 transition-transform group-open/chip:rotate-180" />
                      </summary>
                      <div className="mt-1 text-[10.5px] text-slate-300/80 leading-relaxed max-w-[18rem] pl-1">
                        {c.d}
                      </div>
                    </details>
                  ))}
                </div>
                <p className="mt-6 text-[11px] text-slate-500 leading-snug max-w-xl">
                  Care Pass се предоставя от клиниката след проведена
                  консултация чрез Zubite.bg. Отстъпките са за партньорски
                  продукти за орална хигиена и не представляват отстъпка от
                  лечение.
                </p>
              </div>
              {/* Glossy Care Pass card mockup — Asset E premium render */}
              <div className="relative animate-[floatSlow_8s_ease-in-out_infinite]">
                {/* Stacked depth card behind */}
                <div aria-hidden className="absolute inset-0 translate-y-3 translate-x-3 rotate-[3deg] rounded-[1.5rem] bg-white/5 ring-1 ring-white/10 backdrop-blur-md" />
                {/* Soft teal glow behind the card */}
                <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-teal-400/15 blur-2xl animate-[breatheGlow_9s_ease-in-out_infinite]" />
                <div className="relative">
                  {/* Subtle shimmer sweep — tasteful highlight pass */}
                  <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[1.5rem] pointer-events-none">
                    <div className="absolute inset-y-0 -left-1/2 w-1/3 animate-[shimmerSweep_8s_ease-in-out_infinite]"
                      style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)' }}
                    />
                  </div>
                  <Image
                    src={ASSET_E_CARE_PASS_CARD}
                    alt="Zubite Care Pass — карта с отстъпки за продукти за орална хигиена"
                    width={900}
                    height={900}
                    className="relative w-full h-auto rounded-[1.5rem] drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
                    unoptimized
                    priority={false}
                  />
                </div>
              </div>
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
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold text-center">Често задавани въпроси</p>
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
function FinalCTA() {
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
      {/* Soft warm overlay so the white glass panel stays legible */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-teal-50/60 via-white/55 to-white/75 pointer-events-none" />
      <div aria-hidden data-parallax className="absolute -top-40 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-teal-200/30 blur-3xl animate-[breatheGlow_11s_ease-in-out_infinite]" style={px(-0.07)} />
      <div aria-hidden data-parallax className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-cyan-100/40 blur-3xl animate-[breatheGlow_13s_ease-in-out_infinite]" style={px(0.05)} />
      <div aria-hidden data-parallax className="absolute top-10 right-10 w-64 h-64 rounded-full bg-emerald-100/40 blur-3xl animate-[breatheGlow_9s_ease-in-out_infinite]" style={px(-0.04)} />

      <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
        <Reveal>
          <div className="relative rounded-[2rem] bg-white/55 backdrop-blur-2xl ring-1 ring-white/70 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] px-6 sm:px-12 py-12 sm:py-16 text-center">
            {/* Floating background chips */}
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
              Не отлагай само защото<br className="hidden sm:block" /> не знаеш от къде да започнеш.
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Започни с кратък въпросник и получи ориентир за следващата
              стъпка.
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
                  Започни анализа
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

// ─── Mobile sticky CTA ───────────────────────────────────────────
function MobileStickyCTA() {
  return (
    <div className="md:hidden fixed bottom-3 inset-x-3 z-40" data-testid="home-mobile-sticky-cta">
      <Link
        href={QUIZ_URL}
        className="group relative flex items-center justify-center gap-1.5 w-full rounded-full text-white text-sm font-medium px-5 py-3 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55)] overflow-hidden"
        style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
      >
        <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
        <span className="relative inline-flex items-center gap-1.5">
          Започни анализа · 60 сек
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  )
}

// ─── 14. Premium minimal footer ──────────────────────────────────
function HomeFooter() {
  return (
    <footer className="relative bg-[#0E1A1A] text-slate-300 pt-16 pb-10 overflow-hidden" data-testid="home-footer">
      {/* Subtle glassy top border */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
      <div aria-hidden className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 md:gap-8">
          <div>
            <Link href="/" className="inline-flex items-baseline">
              <span className="font-serif text-2xl font-semibold text-white">Zubite</span>
              <span className="font-serif text-2xl font-semibold text-teal-400">.bg</span>
            </Link>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs">
              Спокоен ориентир в денталното здраве. Първо яснота, после избор.
            </p>
            <p className="mt-5 text-[11px] text-slate-500 leading-snug max-w-xs">
              Не поставяме диагнози. Не заменяме професионален преглед.
              Информацията е ориентировъчна.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Платформа</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/quiz" className="hover:text-teal-400 transition-colors">Започни анализа</Link></li>
              <li><Link href="#how" className="hover:text-teal-400 transition-colors">Как работи</Link></li>
              <li><Link href="#treatments" className="hover:text-teal-400 transition-colors">Лечения</Link></li>
              <li><Link href="/blog" className="hover:text-teal-400 transition-colors">Журнал</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">За клиники</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/za-kliniki" className="hover:text-teal-400 transition-colors">Стани партньор</Link></li>
              <li><Link href="/clinic/login" className="hover:text-teal-400 transition-colors">Клиничен вход</Link></li>
              <li><Link href="/care-pass" className="hover:text-teal-400 transition-colors">Care Pass</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Право</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/privacy" className="hover:text-teal-400 transition-colors">Поверителност</Link></li>
              <li><Link href="/terms" className="hover:text-teal-400 transition-colors">Условия</Link></li>
              <li><Link href="/contact" className="inline-flex items-center gap-1.5 hover:text-teal-400 transition-colors"><Mail className="w-3.5 h-3.5" /> Контакти</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Zubite.bg · Всички права запазени.</p>
          <p>Направено с грижа в България.</p>
        </div>
      </div>
    </footer>
  )
}

// ─── Public exports ──────────────────────────────────────────────
export function HomeContent({ recentPosts = [] }: { recentPosts?: HomeBlogPost[] }) {
  useBackgroundParallax()
  return (
    <>
      <MotionStyles />
      <Nav />
      <MobileStickyCTA />
      {/* 1. Hero / Awareness */}
      <Hero />
      <TrustStrip />
      {/* 2. Patient benefit */}
      <PatientBenefit />
      {/* 3. What you may be noticing */}
      <SymptomChips />
      {/* 4. How it works (5 steps) */}
      <HowItWorks />
      {/* 4.5 Zubite Clinic Standard — trust pillars */}
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

// ─── Global motion styles ────────────────────────────────────────
// Centralised keyframes + reduced-motion fallback. The base `float`
// keyframe is also defined inline in HeroMockup for backwards
// compatibility; that's fine because keyframes with identical names
// are deduplicated by the browser.
function MotionStyles() {
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
        /* Stop named keyframe animations */
        .motion-safe-animate, [class*="animate-["],
        [style*="animation"] {
          animation: none !important;
        }
        /* Freeze background parallax */
        [data-parallax] {
          transform: none !important;
        }
      }
    `}</style>
  )
}
