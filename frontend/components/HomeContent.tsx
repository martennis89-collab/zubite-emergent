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
import {
  ShieldCheck, Sparkles, Building2, Stethoscope, ChevronDown,
  CheckCircle2, ArrowRight, MoveRight, Heart, Smile, Activity,
  AlignLeft, MessageSquare, Clock, Star,
} from 'lucide-react'

const HERO_BG =
  'https://static.prod-images.emergentagent.com/jobs/25b55d94-1ed6-49c7-af05-4dd6f19863cf/images/ee418e7567bbb08fdf27e9d9873be33914cd827a79e42b9833f9728687f9addb.png'
const ZUBI_ORB =
  'https://static.prod-images.emergentagent.com/jobs/25b55d94-1ed6-49c7-af05-4dd6f19863cf/images/863b3f96aa77cea80d56a54ca8cd6f203e1b195d375d00facc84712d20a413cd.png'

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
    <header
      className={
        'fixed top-0 inset-x-0 z-50 transition-all ' +
        (scrolled
          ? 'backdrop-blur-xl bg-[#FCFAF8]/80 border-b border-slate-200/60 shadow-[0_1px_0_rgba(0,0,0,0.02)]'
          : 'bg-transparent')
      }
      data-testid="home-nav"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
          <span className="text-slate-900">Zubite</span>
          <span className="text-teal-600">.bg</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
          <Link href="#how" className="hover:text-slate-900 transition-colors">Как работи</Link>
          <Link href="#treatments" className="hover:text-slate-900 transition-colors">Лечения</Link>
          <Link href="#zubi" className="hover:text-slate-900 transition-colors">Zubi</Link>
          <Link href="/blog" className="hover:text-slate-900 transition-colors">Журнал</Link>
          <Link href="/za-kliniki" className="hover:text-slate-900 transition-colors">За клиники</Link>
        </nav>
        <Link
          href={QUIZ_URL}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium px-4 py-2 transition-colors"
          data-testid="nav-cta"
        >
          Провери случая <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  )
}

// ─── 2. Hero — floating quiz/result mockup ───────────────────────
function Hero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden" data-testid="home-hero">
      {/* warm grain texture (low opacity overlay) */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* soft turquoise glow blobs */}
      <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/40 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 right-0 w-[36rem] h-[36rem] rounded-full bg-cyan-100/50 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-teal-100 text-teal-700 text-[11px] font-medium px-3 py-1">
              <ShieldCheck className="w-3 h-3" />
              Платформа за орална грижа · България
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 font-serif font-semibold tracking-tight text-slate-900 text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
              Първо <span className="text-teal-600">яснота</span>.
              <br />После избор.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
              Zubite.bg ти помага да разбереш своя стоматологичен случай и
              те насочва към подходяща клиника — спокойно, без натиск, на
              разбираем език.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={QUIZ_URL}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-3 shadow-[0_10px_30px_-12px_rgba(20,184,166,0.5)] transition-all hover:-translate-y-0.5"
                data-testid="hero-primary-cta"
              >
                Провери своя случай за 60 секунди
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-900 text-sm font-medium px-5 py-3 ring-1 ring-slate-200 transition-colors"
                data-testid="hero-secondary-cta"
              >
                Виж как работи
              </Link>
            </div>
          </Reveal>
          <Reveal delay={280}>
            <p className="mt-5 text-[11px] text-slate-400 leading-snug max-w-md">
              Zubite.bg не поставя диагнози и не замества професионален
              стоматологичен преглед.
            </p>
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
      {/* Bottom subtle card */}
      <div className="absolute -inset-4 sm:-inset-6 rounded-[2rem] bg-gradient-to-br from-white/60 to-teal-50/60 backdrop-blur-xl ring-1 ring-white/60" />
      {/* Primary card */}
      <div className="relative rounded-[1.75rem] bg-white shadow-[0_30px_60px_-20px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 p-6 sm:p-7 animate-[float_6s_ease-in-out_infinite]">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
          Резултат от 60-секунден преглед
        </div>
        <h3 className="mt-4 font-serif text-2xl text-slate-900 leading-tight">
          Леко изместване <br />на горните резци
        </h3>
        <div className="mt-4 flex items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100 text-[11px] px-2.5 py-1">
            <Star className="w-3 h-3 fill-current" /> Лек случай
          </div>
          <span className="text-[11px] text-slate-500">~6-9 месеца алайнери</span>
        </div>
        <div className="mt-5 space-y-2.5 text-sm">
          {[
            { label: 'Алайнери (Invisalign/Spark)', match: 95 },
            { label: 'Естетични брекети', match: 78 },
            { label: 'Метални брекети',       match: 65 },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-[12px] text-slate-700">
                <span>{row.label}</span>
                <span className="font-medium text-teal-700">{row.match}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-600"
                  style={{ width: `${row.match}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">3 подходящи клиники в София</p>
          <span className="inline-flex items-center gap-1 text-teal-700 text-xs font-medium">
            Виж насочване <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
      {/* Floating chip — clinic suggestion */}
      <div className="absolute -bottom-6 -left-4 sm:-left-8 rounded-2xl bg-white shadow-lg ring-1 ring-slate-100 px-3 py-2 flex items-center gap-2 animate-[float_7s_ease-in-out_infinite_reverse]">
        <Building2 className="w-4 h-4 text-teal-500" />
        <span className="text-[11px] text-slate-700 font-medium">OrthoBG · 4.8 ★</span>
      </div>
      {/* Floating chip — price */}
      <div className="absolute -top-5 right-0 rounded-2xl bg-white shadow-lg ring-1 ring-slate-100 px-3 py-2 flex items-center gap-2 animate-[float_5.5s_ease-in-out_infinite]">
        <Activity className="w-4 h-4 text-teal-500" />
        <span className="text-[11px] text-slate-700 font-medium">от ~2400 лв.</span>
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
    'Ориентировъчни цени',
    'Подходящи клиники',
    'Не заменя преглед',
  ]
  return (
    <section className="py-8 bg-white/60 backdrop-blur-sm border-y border-slate-100" data-testid="home-trust-strip">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {items.map((t, i) => (
          <span
            key={t}
            className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-[0.16em] text-slate-500"
            data-testid={`trust-chip-${i}`}
          >
            <CheckCircle2 className="w-3 h-3 text-teal-500" />
            {t}
          </span>
        ))}
      </div>
    </section>
  )
}

// ─── 4. Problem ──────────────────────────────────────────────────
function Problem() {
  const pains = [
    { t: 'Реклами навсякъде', s: 'Всяка клиника обещава най-доброто. Това не помага при избор.' },
    { t: 'Противоречиви мнения', s: 'Във форуми и социални мрежи всеки споделя свой случай — но не и твоя.' },
    { t: 'Неясни цени', s: 'Едни казват „от 1500 лв.“, други — „от 4000 лв.“ за привидно същото нещо.' },
    { t: 'Страх от грешен избор', s: 'Лечението е дълго. Колебанието удължава всичко.' },
  ]
  return (
    <section className="relative py-20 sm:py-28 bg-teal-50/40" data-testid="home-problem">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Защо съществуваме</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
            Информация има <em className="not-italic text-teal-600">в излишък</em>.
            Яснота — почти никаква.
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg max-w-md leading-relaxed">
            Преди да избереш клиника, имаш нужда да разбереш собствения си
            случай. Zubite.bg започва оттам — спокойно, без натиск.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {pains.map((p, i) => (
            <Reveal key={p.t} delay={i * 90}>
              <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 p-5 hover:-translate-y-1 hover:shadow-md transition-all">
                <h3 className="font-serif text-lg font-semibold text-slate-900">{p.t}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{p.s}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 5. How it works ─────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', t: 'Отговори', s: 'Кратки въпроси за около 60 секунди — без регистрация.' },
    { n: '02', t: 'Разбери', s: 'Получаваш ясно описание на твоя случай и възможните пътища.' },
    { n: '03', t: 'Сравни', s: 'Ориентировъчни цени и продължителност на лечението.' },
    { n: '04', t: 'Заяви насочване', s: 'Подходящи клиники само ако ти решиш да продължиш.' },
  ]
  return (
    <section id="how" className="py-20 sm:py-28" data-testid="home-how">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Как работи</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight max-w-3xl">
            Четири стъпки, за да стигнеш от объркване до решение.
          </h2>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="relative rounded-2xl bg-white ring-1 ring-slate-200/70 p-6 h-full hover:-translate-y-1 hover:shadow-lg transition-all">
                <span className="font-serif text-3xl text-teal-600/30 font-bold">{s.n}</span>
                <h3 className="mt-2 font-serif text-xl font-semibold text-slate-900">{s.t}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.s}</p>
                {i < steps.length - 1 && (
                  <MoveRight aria-hidden className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 w-4 h-4 text-teal-300" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 6. Treatment categories ─────────────────────────────────────
function TreatmentCategories() {
  const cats: Array<{ t: string; s: string; href: string; icon: React.ReactNode }> = [
    { t: 'Ортодонтия',              s: 'Изправяне на захапка и зъби', href: '/blog?category=orthodontics', icon: <Smile className="w-4 h-4" /> },
    { t: 'Алайнери vs брекети',     s: 'Кой подход е по-подходящ за теб', href: '/blog/aligners-vs-braces', icon: <AlignLeft className="w-4 h-4" /> },
    { t: 'Импланти',                s: 'Замяна на липсващ зъб',       href: '/blog?category=implants', icon: <Stethoscope className="w-4 h-4" /> },
    { t: 'Естетична стоматология',  s: 'Избелване, фасети, корекции', href: '/blog?category=cosmetic', icon: <Sparkles className="w-4 h-4" /> },
    { t: 'TMJ / челюстни стави',    s: 'Болка, щракане, скърцане',     href: '/blog?category=tmj',      icon: <Activity className="w-4 h-4" /> },
    { t: 'Сънна апнея',             s: 'Дентална страна на дишането',  href: '/blog?category=sleep',    icon: <Heart className="w-4 h-4" /> },
    { t: 'Детска ортодонтия',       s: 'Ранна интервенция и развитие', href: '/blog?category=pediatric',icon: <Smile className="w-4 h-4" /> },
  ]
  return (
    <section id="treatments" className="py-20 sm:py-28 bg-[#FCFAF8]" data-testid="home-treatments">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Категории</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight max-w-3xl">
            Започни от темата, която те интересува.
          </h2>
        </Reveal>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {cats.map((c, i) => (
            <Reveal key={c.t} delay={i * 60}>
              <Link
                href={c.href}
                className="group block rounded-2xl bg-white ring-1 ring-slate-200/70 p-5 sm:p-6 hover:-translate-y-1 hover:shadow-md transition-all h-full"
                data-testid={`treatment-card-${i}`}
              >
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                  {c.icon}
                </div>
                <h3 className="mt-4 font-serif text-lg sm:text-xl font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {c.t}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">{c.s}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-teal-600 group-hover:gap-2 transition-all">
                  Научи повече <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
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
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Преглед на решение</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
            Виж как изглежда твоят случай — преди да влезеш в кабинет.
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-md">
            Описание на твоето състояние, възможните подходи и в кои клиники
            биха могли да помогнат — всичко на едно място.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5" /> Прост език, без жаргон</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5" /> Подреден по релевантност, не по реклама</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5" /> Никакво обвързване — продължаваш само ако искаш</li>
          </ul>
          <Link
            href={QUIZ_URL}
            className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-3 transition-colors"
            data-testid="decision-cta"
          >
            Започни кратък преглед
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
        <Reveal delay={120}>
          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-teal-50 to-white ring-1 ring-teal-100/70" />
            <div className="relative rounded-[1.75rem] bg-white ring-1 ring-slate-100 shadow-xl p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Твоят случай</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 ring-1 ring-teal-100 rounded-full px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3" /> Прегледано
                </span>
              </div>
              <h3 className="mt-3 font-serif text-2xl sm:text-3xl text-slate-900 leading-snug">
                Лек до умерен скрипт <br />на долна челюст
              </h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Срок</p>
                  <p className="mt-1 font-serif text-lg text-slate-900">9-14 месеца</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Ценови диапазон</p>
                  <p className="mt-1 font-serif text-lg text-slate-900">~2 500 - 4 200 лв.</p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Подходящи подходи:</p>
                <p className="text-slate-600">· Прозрачни алайнери (предпочитан)</p>
                <p className="text-slate-600">· Естетични керамични брекети</p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">5 насочвания · София, Пловдив</p>
                <span className="text-xs font-medium text-teal-700">Виж клиники →</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 8. Zubi guidance ────────────────────────────────────────────
function ZubiSection() {
  return (
    <section id="zubi" className="py-20 sm:py-28 bg-[#FCFAF8]" data-testid="home-zubi">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1fr] gap-12 items-center">
        <Reveal delay={80}>
          <div className="relative w-full max-w-sm mx-auto">
            <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-teal-100/60 to-cyan-50/60 blur-2xl" />
            <Image
              src={ZUBI_ORB}
              alt="Zubi — спокоен AI ориентир"
              width={520} height={520}
              className="relative rounded-full mix-blend-normal animate-[zubiOrb_10s_ease-in-out_infinite]"
              priority={false}
              unoptimized
            />
            <style jsx>{`
              @keyframes zubiOrb {
                0%, 100% { transform: translateY(0) scale(1) }
                50%      { transform: translateY(-6px) scale(1.02) }
              }
            `}</style>
          </div>
        </Reveal>
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Запознай се със Zubi</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
            Спокоен AI ориентир — <br />не лекар, не игра.
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-md">
            Zubi е дискретен помощник, който превежда денталната тема на
            твой език. Без диагнози, без обещания, без давление — само
            яснота преди следващата стъпка.
          </p>
          <p className="mt-5 text-[11px] text-slate-400 leading-snug max-w-md">
            Zubi не замества преглед при лекар и не дава медицински съвет.
            Информацията е ориентировъчна.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 9. Clinic matching ──────────────────────────────────────────
function MatchingExplain() {
  return (
    <section className="py-20 sm:py-28" data-testid="home-matching">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Насочване, а не каталог</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight max-w-3xl">
            Свързваме те с клиники, които работят точно с твоя случай.
          </h2>
        </Reveal>
        <div className="mt-10 grid md:grid-cols-3 gap-4 sm:gap-5">
          {[
            { t: 'Подбор по случай', s: 'Тип лечение, тежест, локация и предпочитания — само това.' },
            { t: 'Прозрачни критерии', s: 'Виждаш защо клиниката е препоръчана и какво я отличава.' },
            { t: 'Без обвързване', s: 'Питаш само ако решиш. Клиниката се свързва с теб, не обратното.' },
          ].map((it, i) => (
            <Reveal key={it.t} delay={i * 100}>
              <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 p-6 h-full">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <h3 className="mt-3 font-serif text-xl font-semibold text-slate-900">{it.t}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{it.s}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 10. Patient questions ───────────────────────────────────────
function PatientQuestions() {
  const qs = [
    'Какво всъщност означава „малък/среден/тежък“ случай?',
    'Защо цените се различават толкова много?',
    'Боли ли поставянето на брекети или алайнери?',
    'Имам ли време при моя график?',
    'Какво е разликата между естетични и метални брекети?',
    'Какво се случва, ако спра по средата?',
  ]
  return (
    <section className="py-20 sm:py-28 bg-[#FCFAF8]" data-testid="home-questions">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Често зададени въпроси на пациенти</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight max-w-3xl">
            Питаш ли се същото, което и другите?
          </h2>
        </Reveal>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {qs.map((q, i) => (
            <Reveal key={q} delay={i * 60}>
              <Link
                href="/blog"
                className="block rounded-2xl bg-white ring-1 ring-slate-200/70 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all"
                data-testid={`question-card-${i}`}
              >
                <MessageSquare className="w-4 h-4 text-teal-500" />
                <p className="mt-3 font-serif text-base sm:text-lg text-slate-900 leading-snug">{q}</p>
                <p className="mt-2 text-xs text-slate-500">Към статия в журнала →</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 11. Care Pass teaser ────────────────────────────────────────
function CarePassTeaser() {
  return (
    <section className="py-20 sm:py-28" data-testid="home-care-pass">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <Reveal>
          <div className="relative rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden ring-1 ring-slate-800">
            <div aria-hidden className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-500/20 blur-3xl" />
            <div className="relative p-8 sm:p-12 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300/80 font-semibold">Care Pass (скоро)</p>
                <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold leading-tight">
                  По-спокойна грижа за зъбите. <br />За цялото семейство.
                </h2>
                <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed max-w-md">
                  Достъп до партньорски клиники с предвидими цени,
                  персонален календар и проследяване на лечението.
                </p>
                <Link
                  href="/care-pass"
                  className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-sm font-medium px-5 py-3 transition-colors"
                  data-testid="care-pass-cta"
                >
                  Запази място в early access
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="relative">
                <div className="aspect-[5/3] rounded-2xl bg-gradient-to-br from-white/10 to-teal-300/10 ring-1 ring-white/10 backdrop-blur-md p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <p className="font-serif text-lg">Zubite Care Pass</p>
                    <span className="text-[10px] uppercase tracking-widest text-teal-200">Premium</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Член от</p>
                    <p className="font-serif text-base">Февруари 2026</p>
                  </div>
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
    { q: 'Zubite.bg клиника ли е?', a: 'Не. Zubite.bg е независима платформа, която ти помага да разбереш своя случай и да намериш подходяща клиника. Лечението се извършва в избраната от теб клиника.' },
    { q: 'Платформата ли поставя диагноза?', a: 'Не. Zubite.bg не поставя диагнози. Дава ориентировъчна информация и не замества професионален стоматологичен преглед.' },
    { q: 'Колко струва използването?', a: 'Безплатно за пациенти. Не изискваме регистрация, за да минеш през 60-секундния преглед.' },
    { q: 'Как избирате клиники?', a: 'По релевантност към твоя случай — тип лечение, локация, опит на специалиста и обратна връзка от пациенти. Не по платена реклама.' },
    { q: 'Какво се случва с моите данни?', a: 'Споделяме информация с клиника само ако ти изрично заявиш насочване. Данните се обработват съгласно българското и европейско законодателство.' },
  ]
  return (
    <section className="py-20 sm:py-28 bg-[#FCFAF8]" data-testid="home-faq">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold text-center">Често задавани въпроси</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight text-center">
            Кратки отговори.
          </h2>
        </Reveal>
        <div className="mt-10 space-y-2">
          {items.map((it, i) => <FAQItem key={it.q} q={it.q} a={it.a} idx={i} />)}
        </div>
      </div>
    </section>
  )
}

function FAQItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(idx === 0)
  return (
    <div className="border-b border-slate-200" data-testid={`faq-item-${idx}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-serif text-base sm:text-lg text-slate-900">{q}</span>
        <ChevronDown
          className={
            'w-4 h-4 text-slate-400 transition-transform ' +
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
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-teal-50 to-white" />
      <div aria-hidden className="absolute -top-40 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-teal-200/30 blur-3xl" />
      <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-teal-100 text-teal-700 text-[11px] font-medium px-3 py-1">
            <Clock className="w-3 h-3" /> ~60 секунди
          </span>
          <h2 className="mt-5 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
            Първо яснота. <br />После — подходящата клиника.
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
            Кратък преглед, разбираемо описание на случая и съгласувано
            насочване — без обвързване.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={QUIZ_URL}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-3 shadow-[0_10px_30px_-12px_rgba(20,184,166,0.5)] transition-all hover:-translate-y-0.5"
              data-testid="final-primary-cta"
            >
              Провери своя случай за 60 секунди
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 hover:bg-slate-50 text-sm font-medium px-5 py-3 ring-1 ring-slate-200 transition-colors"
            >
              Виж как работи
            </Link>
          </div>
          <p className="mt-7 text-[11px] text-slate-400 leading-snug max-w-lg mx-auto">
            Zubite.bg не поставя диагнози и не замества професионален
            стоматологичен преглед. Платформата предоставя ориентировъчна
            информация и насочване към подходящи клиники в България.
          </p>
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
        className="flex items-center justify-center gap-1.5 w-full rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-3 shadow-[0_10px_30px_-10px_rgba(20,184,166,0.6)]"
      >
        Провери случая за 60 секунди
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

// ─── Public exports ──────────────────────────────────────────────
export function HomeContent() {
  return (
    <>
      <Nav />
      <MobileStickyCTA />
      <Hero />
      <TrustStrip />
      <Problem />
      <HowItWorks />
      <TreatmentCategories />
      <DecisionPreview />
      <ZubiSection />
      <MatchingExplain />
      <PatientQuestions />
      <CarePassTeaser />
      <FAQ />
      <FinalCTA />
    </>
  )
}
