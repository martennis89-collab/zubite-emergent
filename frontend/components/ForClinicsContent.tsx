'use client'

/**
 * /za-kliniki — premium navy B2B SaaS partner-acquisition page.
 *
 * Visual direction (Feb 2026):
 *   • Premium dark navy hero + governance + final CTA sections
 *   • Warm-ivory + glass alternate sections (matching the new Zubite system)
 *   • Teal accents on dark, deep-navy text on ivory
 *   • Frosted-glass dashboard mockups, restrained motion, no Zubi mascot
 *
 * IMPORTANT — preserved verbatim from the previous implementation:
 *   • ApplicationSection state, payload shape, POST to /api/clinic-applications
 *   • All section data-testids: clinics-hero / clinics-problem /
 *     clinics-differentiation / clinics-context / clinics-how-it-works /
 *     clinics-value-stack / clinics-neutral-layer / clinics-founding /
 *     clinics-who-for / clinics-dashboard-preview / clinics-application /
 *     clinics-faq / clinics-logo
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, ArrowUpRight, Loader2, CheckCircle2,
  Building2, Users, Clock, ClipboardCheck, ShieldCheck, Target,
  Compass, Workflow, Sparkles, Database, ChevronDown,
  Gift, Activity, FileSearch, LayoutDashboard, Tag,
  XCircle, Layers, BadgeCheck, MessagesSquare,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

/* ════════════════════════════════════════════════════════════
   1. HERO — premium navy with glass dashboard mockup
   ════════════════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section
      className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28"
      data-testid="clinics-hero"
      style={{
        background:
          'radial-gradient(ellipse 70% 60% at 100% 0%, rgba(20,184,166,0.22) 0%, transparent 60%),' +
          'radial-gradient(ellipse 50% 50% at 0% 100%, rgba(94,234,212,0.10) 0%, transparent 60%),' +
          'linear-gradient(135deg, #0B1620 0%, #0E1A24 50%, #112832 100%)',
      }}
    >
      {/* Subtle liquid blobs — restrained */}
      <div aria-hidden className="absolute -top-32 -right-32 w-[36rem] h-[36rem] rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 -left-20 w-[32rem] h-[32rem] rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/30 to-transparent" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 ring-1 ring-white/15 text-teal-200 text-[10px] font-semibold px-3 py-1 uppercase tracking-[0.2em]">
            <BadgeCheck className="w-3 h-3" />
            Партньорска програма
          </span>
          <h1 className="mt-5 font-serif font-semibold tracking-tight text-white text-[2.25rem] sm:text-[2.75rem] lg:text-[3rem] leading-[1.08] text-balance">
            Получавайте по-подготвени пациенти,{' '}
            <span className="text-teal-300">не просто още запитвания</span>.
          </h1>
          <p className="mt-5 text-slate-300 text-lg sm:text-xl leading-relaxed max-w-xl">
            Zubite.bg помага на пациентите първо да се ориентират, а след това
            насочва релевантни заявки към партньорски клиники според случая,
            града и нуждата от лечение.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="#application"
              className="group relative inline-flex items-center gap-1.5 rounded-full text-slate-900 text-sm font-medium px-5 py-3 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(94,234,212,0.45)] overflow-hidden"
              style={{ backgroundImage: 'linear-gradient(135deg,#5eead4 0%,#2dd4bf 60%,#14b8a6 100%)' }}
              data-testid="hero-apply-btn"
            >
              <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/40 blur-sm pointer-events-none" />
              <span className="relative inline-flex items-center gap-1.5">
                Кандидатствай като партньорска клиника
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl text-white text-sm font-medium px-5 py-3 ring-1 ring-white/15 hover:bg-white/[0.14] hover:-translate-y-0.5 transition-all"
              data-testid="hero-secondary-btn"
            >
              Виж как работи
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-2">
            {[
              'Предварително ориентирани пациенти',
              'Заявки според категория',
              'Care Pass след консултация',
              'Без случаен каталог',
            ].map((c) => (
              <li
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/12 text-[11px] text-slate-200 font-medium px-3 py-1.5 backdrop-blur-md"
              >
                <CheckCircle2 className="w-3 h-3 text-teal-300" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        <HeroDashboardMock />
      </div>
    </section>
  )
}

/* ── Hero dashboard mockup — illustrative only, anonymized demo data ─ */
function HeroDashboardMock() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:ml-auto" data-testid="hero-dashboard-mock">
      <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-teal-400/8 blur-2xl pointer-events-none" />
      <div aria-hidden className="absolute inset-0 translate-y-3 -translate-x-2 -rotate-[2.5deg] rounded-[1.85rem] bg-white/[0.04] ring-1 ring-white/10" />
      <div className="relative rounded-[1.75rem] bg-white/[0.06] backdrop-blur-2xl ring-1 ring-white/15 p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
            <LayoutDashboard className="w-3 h-3 text-teal-300" />
            Партньорски панел
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-300/30 text-[10px] text-emerald-200 px-2 py-0.5">
            <span className="w-1 h-1 rounded-full bg-emerald-300 animate-pulse" />
            Live
          </span>
        </div>

        {/* Lead card */}
        <div className="mt-4 rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Нова заявка</p>
              <p className="mt-1 font-serif text-base text-white leading-tight">Възрастен пациент · София</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 ring-1 ring-amber-300/30 text-[10px] text-amber-200 px-2 py-0.5">
              <Tag className="w-2.5 h-2.5" /> Ортодонтия
            </span>
          </div>
          <ul className="mt-3 space-y-1.5">
            {[
              { l: 'Опит с алайнери', v: 'Интерес' },
              { l: 'Времеви срок',    v: '3-6 месеца' },
              { l: 'Готовност',       v: 'Иска консултация' },
            ].map((r) => (
              <li key={r.l} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{r.l}</span>
                <span className="text-slate-200 font-medium">{r.v}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { l: 'Източник: Quiz', c: 'bg-white/8 text-slate-300 ring-white/10' },
              { l: 'Care Pass',     c: 'bg-teal-400/15 text-teal-200 ring-teal-300/30' },
            ].map((c) => (
              <span key={c.l} className={`inline-flex items-center gap-1 rounded-full ring-1 text-[10px] px-2 py-0.5 ${c.c}`}>
                {c.l}
              </span>
            ))}
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { l: 'Отворени', v: '04' },
            { l: 'Обработени', v: '12' },
            { l: 'Реакция', v: '6h' },
          ].map((s) => (
            <div key={s.l} className="rounded-lg bg-white/[0.04] ring-1 ring-white/10 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500">{s.l}</p>
              <p className="mt-0.5 font-mono text-sm text-white tabular-nums">{s.v}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[9.5px] text-slate-500 leading-snug">
          Илюстрация · анонимизирани демо данни
        </p>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   2. PROBLEM SECTION — warm-ivory section
   ════════════════════════════════════════════════════════════ */
const problemPoints = [
  { t: 'Скъпи кликове',             s: 'Платена реклама без ясен интент води до високи разходи и нисък conversion.', icon: <Activity className="w-4 h-4" /> },
  { t: 'Неподготвени пациенти',     s: 'Запитванията често идват без контекст за категория, готовност и очаквания.', icon: <XCircle className="w-4 h-4" /> },
  { t: 'Слабо проследяване',        s: 'Без ясни статуси е трудно да измерите кои канали наистина дават резултат.',   icon: <FileSearch className="w-4 h-4" /> },
  { t: 'Липса на доверие',          s: 'Първият разговор често започва от нула, без ориентир за пациента.',          icon: <ShieldCheck className="w-4 h-4" /> },
]

function ProblemSection() {
  return (
    <section
      className="relative py-20 sm:py-24 bg-[#FCFAF8] overflow-hidden"
      data-testid="clinics-problem"
    >
      <div aria-hidden className="absolute -top-20 left-0 w-[28rem] h-[28rem] rounded-full bg-teal-100/30 blur-3xl pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Проблемът</p>
        <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08] max-w-3xl">
          Повечето дентални реклами водят до шум,{' '}
          <span className="text-teal-600">не до качествени консултации</span>.
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {problemPoints.map((p) => (
            <div
              key={p.t}
              className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 p-5 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)]"
            >
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/60">
                {p.icon}
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-slate-900 leading-snug">{p.t}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.s}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   3. PLATFORM VALUE — what makes Zubite different
   ════════════════════════════════════════════════════════════ */
const platformValueCards: Array<{ t: string; s: string; long: string; icon: React.ReactNode }> = [
  {
    t: 'Пациентът първо се ориентира',
    s: 'Кратък въпросник помага да разбере каква следваща стъпка има смисъл.',
    long: 'Преди да направи заявка, пациентът отговаря на медицински-безопасни въпроси и вижда обобщение какво описва. Не диагноза — ориентир.',
    icon: <Compass className="w-4 h-4" />,
  },
  {
    t: 'Заявката идва с контекст',
    s: 'Клиниката получава по-ясна представа за нуждата, категорията и очакванията.',
    long: 'Получавате категорията на запитването, града, готовността и съответните patient-reported отговори — а не само телефон и име.',
    icon: <Database className="w-4 h-4" />,
  },
  {
    t: 'Не сме случаен списък',
    s: 'Пациентът вижда релевантни опции според случая и града.',
    long: 'Насочването е базирано на категорията и града, не на размер на рекламен бюджет. Сред партньорите има прозрачно разграничени спонсорирани позиции.',
    icon: <Workflow className="w-4 h-4" />,
  },
  {
    t: 'Care Pass е организиран от Zubite',
    s: 'Допълнителна стойност за пациента — без клиниката да я финансира или договаря сама.',
    long: 'Zubite Care Pass се организира от Zubite.bg чрез партньорства с брандове в сферата на оралната хигиена и денталната грижа и се предоставя безплатно на партньорските клиники. След реално посетена консултация клиниката може да го даде на пациента като допълнителен слой внимание и стойност. Не е отстъпка от лечение, не е застрахователен продукт и не променя медицинската преценка.',
    icon: <Gift className="w-4 h-4" />,
  },
]

function DifferentiationSection() {
  return (
    <section
      className="relative py-20 sm:py-24 overflow-hidden"
      data-testid="clinics-differentiation"
      style={{
        background: 'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
      }}
    >
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Стойност</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
            Какво прави Zubite различно?
          </h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 gap-4">
          {platformValueCards.map((c, i) => (
            <details
              key={c.t}
              className="group/v rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 p-6 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] hover:ring-teal-200/60 hover:shadow-[0_20px_50px_-22px_rgba(13,148,136,0.22)] transition-all cursor-pointer"
              data-testid={`platform-value-${i}`}
            >
              <summary className="list-none">
                <div className="flex items-start gap-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50/90 text-teal-700 ring-1 ring-teal-100 flex-shrink-0">
                    {c.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 leading-snug">{c.t}</h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{c.s}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 group-open/v:hidden">
                      Виж повече <ChevronDown className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-200/50 pt-3">
                {c.long}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   4. DASHBOARD PREVIEW — large premium navy mockup section
   ════════════════════════════════════════════════════════════ */
function ContextSection() {
  return (
    <section
      className="relative py-20 sm:py-28 overflow-hidden"
      data-testid="clinics-context"
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(20,184,166,0.18) 0%, transparent 60%),' +
          'linear-gradient(135deg, #0B1620 0%, #0E1A24 100%)',
      }}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/30 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-300/20 to-transparent" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300 font-semibold">Партньорски панел</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.08]">
            Заявка с контекст.{' '}
            <span className="text-teal-300">Не само телефон.</span>
          </h2>
          <p className="mt-5 text-slate-300 text-lg leading-relaxed max-w-md">
            Виждате категорията, града, готовността и patient-reported
            отговорите. Care Pass eligibility е отделен chip.
          </p>
          <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md">
            {[
              { l: 'Категория',     icon: <Tag className="w-3 h-3" /> },
              { l: 'Източник',      icon: <Compass className="w-3 h-3" /> },
              { l: 'Готовност',     icon: <ClipboardCheck className="w-3 h-3" /> },
              { l: 'Care Pass',     icon: <Gift className="w-3 h-3" /> },
              { l: 'Реакция (h)',   icon: <Clock className="w-3 h-3" /> },
              { l: 'Статус',        icon: <BadgeCheck className="w-3 h-3" /> },
            ].map((c) => (
              <li
                key={c.l}
                className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 px-3 py-2 text-[12px] text-slate-200"
              >
                <span className="text-teal-300">{c.icon}</span>
                {c.l}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[11px] text-slate-500 leading-snug max-w-md">
            Илюстрация на партньорския панел. Данни в реалния продукт идват
            от patient-reported отговори, не от диагноза.
          </p>
        </div>
        <DashboardPanelMock />
      </div>
    </section>
  )
}

function DashboardPanelMock() {
  return (
    <div className="relative w-full" data-testid="dashboard-panel-mock">
      <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-teal-400/8 blur-3xl pointer-events-none" />
      <div className="relative rounded-2xl bg-white/[0.06] backdrop-blur-2xl ring-1 ring-white/15 p-5 sm:p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-slate-300 inline-flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-teal-300" /> Входящи заявки
          </p>
          <span className="text-[10px] text-slate-500 font-mono">04 / 12</span>
        </div>
        <ul className="space-y-2.5">
          {[
            { city: 'София',    cat: 'Импланти',     ready: 'Готов за консултация', care: true,  src: 'Quiz' },
            { city: 'Пловдив',  cat: 'Алайнери',     ready: 'Сравнява опции',       care: true,  src: 'Quiz' },
            { city: 'София',    cat: 'Венци',        ready: 'Иска информация',      care: false, src: 'Журнал' },
            { city: 'Варна',    cat: 'Ортодонтия',   ready: 'Готов за консултация', care: true,  src: 'Quiz' },
          ].map((row, i) => (
            <li key={i} className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="inline-flex w-7 h-7 rounded-full bg-teal-400/15 ring-1 ring-teal-300/30 items-center justify-center text-[10px] text-teal-200 font-medium">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-white font-medium truncate">{row.city} · {row.cat}</p>
                    <p className="text-[10.5px] text-slate-400">{row.ready}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {row.care && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-400/15 ring-1 ring-teal-300/30 text-[9.5px] text-teal-200 px-1.5 py-0.5">
                      <Gift className="w-2.5 h-2.5" /> CP
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-white/8 ring-1 ring-white/15 text-[9.5px] text-slate-300 px-1.5 py-0.5">
                    {row.src}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   5. HOW IT WORKS — 4-step flow
   ════════════════════════════════════════════════════════════ */
const flowSteps: Array<{ n: string; t: string; s: string }> = [
  { n: '01', t: 'Клиниката кандидатства',         s: 'Подавате кратка форма с информация за екипа и услугите.' },
  { n: '02', t: 'Профилът се преглежда',          s: 'Преглеждаме съответствието с партньорската мрежа.' },
  { n: '03', t: 'Получавате релевантни заявки',   s: 'Пациенти с контекст според категорията и града ви.' },
  { n: '04', t: 'Качеството се проследява',       s: 'Реакция, обработка и фидбек влияят на партньорския статус.' },
]

function HowItWorksSection() {
  return (
    <section
      id="how"
      className="relative py-20 sm:py-24 bg-[#FCFAF8] overflow-hidden"
      data-testid="clinics-how-it-works"
    >
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Процес</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
            Как работи за клиниката
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {flowSteps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 p-5 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)]"
            >
              <span className="font-serif text-3xl font-bold text-teal-600/30">{s.n}</span>
              <h3 className="mt-2 font-serif text-lg font-semibold text-slate-900 leading-tight">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.s}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   6. WHY CARE — better request starts before the first call
   ════════════════════════════════════════════════════════════ */
const whyCareCards = [
  { t: 'Пациентът вече е образован',     icon: <Compass className="w-4 h-4" /> },
  { t: 'Очакванията са по-ясни',         icon: <ClipboardCheck className="w-4 h-4" /> },
  { t: 'Категорията е по-релевантна',    icon: <Tag className="w-4 h-4" /> },
  { t: 'По-малко обяснения от нулата',   icon: <Layers className="w-4 h-4" /> },
]

function PartnerValueSection() {
  return (
    <section
      className="relative py-20 sm:py-24 overflow-hidden"
      data-testid="clinics-value-stack"
      style={{ background: 'linear-gradient(180deg, #F4FAF9 0%, #FCFAF8 100%)' }}
    >
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Защо клиниките</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-[1.08]">
            По-добрата заявка{' '}
            <span className="text-teal-600">започва преди първия телефонен разговор</span>.
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {whyCareCards.map((c) => (
            <div
              key={c.t}
              className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 p-5 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)]"
            >
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-teal-50/90 text-teal-700 ring-1 ring-teal-100">
                {c.icon}
              </div>
              <h3 className="mt-3 font-serif text-base sm:text-lg font-semibold text-slate-900 leading-snug">{c.t}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   7. GOVERNANCE — "Не сме отворен каталог"
   ════════════════════════════════════════════════════════════ */
function NeutralDecisionLayerSection() {
  return (
    <section
      className="relative py-20 sm:py-24 overflow-hidden"
      data-testid="clinics-neutral-layer"
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(20,184,166,0.18) 0%, transparent 70%),' +
          'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
      }}
    >
      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300 font-semibold">Управление</p>
        <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.08]">
          Не сме отворен каталог.
        </h2>
        <p className="mt-5 text-slate-300 text-lg leading-relaxed max-w-2xl mx-auto">
          Zubite.bg работи като подбрана партньорска мрежа. Видимостта и
          насочването не трябва да се базират само на реклама, а на
          релевантност, качество на реакция и доверие.
        </p>
        <ul className="mt-8 flex flex-wrap justify-center gap-2" data-testid="governance-chips">
          {[
            'Партньорски модел',
            'Ясно разграничени спонсорирани позиции',
            'Без гарантирани класации',
            'Фокус върху пациентското доверие',
          ].map((c) => (
            <li
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/12 text-[12px] text-slate-200 font-medium px-3 py-1.5"
            >
              <ShieldCheck className="w-3 h-3 text-teal-300" />
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   7.5 TRUST-SIGNAL — Партньорство със Zubite.bg е сигнал за доверие
   ════════════════════════════════════════════════════════════ */
function TrustSignalSection() {
  const cards: { t: string; s: string; icon: React.ReactNode }[] = [
    {
      t: 'По-силен сигнал за качество',
      s: 'Партньорството показва, че клиниката цени ясна комуникация и отговорна работа с пациента.',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      t: 'По-добре подготвени пациенти',
      s: 'Хората идват със собствена ориентация и по-ясни очаквания — разговорът започва от по-добра точка.',
      icon: <Users className="w-4 h-4" />,
    },
    {
      t: 'По-ясна комуникация преди първия преглед',
      s: 'Контекстът от ориентацията намалява объркването и улеснява първата консултация.',
      icon: <MessagesSquare className="w-4 h-4" />,
    },
    {
      t: 'Позициониране до платформа за доверие',
      s: 'Видимостта се случва в среда, изградена около яснота и пациентска ориентация — не край случаен каталог.',
      icon: <BadgeCheck className="w-4 h-4" />,
    },
  ]

  return (
    <section
      className="relative py-20 sm:py-24 bg-[#FCFAF8] overflow-hidden"
      data-testid="clinics-trust-signal-section"
    >
      <div aria-hidden className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute top-40 -right-20 w-[24rem] h-[24rem] rounded-full bg-cyan-100/35 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl mb-12">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-teal-700 mb-3">
            Сигнал за доверие
          </p>
          <h2 className="font-serif text-[2rem] sm:text-[2.5rem] lg:text-[2.75rem] font-semibold text-slate-900 leading-[1.08] tracking-tight text-balance">
            Партньорството със Zubite.bg е{' '}
            <span className="text-teal-600">сигнал за доверие</span>.
          </h2>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-12 items-start">
          {/* Narrative */}
          <div className="space-y-5 text-slate-700 text-[15px] sm:text-base leading-relaxed max-w-xl">
            <p>
              Когато пациент види, че една клиника е партньор на Zubite.bg,
              това не е просто лого. Това е сигнал.
            </p>
            <p>
              Сигнал, че клиниката цени ясната комуникация, по-добре
              подготвените пациенти и връзката с човека още преди първия
              преглед.
            </p>
            <p>
              Zubite.bg се позиционира като премиум посредник между пациента и
              клиниката — място, където хората първо получават яснота,
              ориентация и по-добро разбиране на възможните си следващи стъпки.
            </p>
            <p className="text-slate-900 font-medium">
              За партньорските клиники това означава не само повече видимост,
              а по-силен сигнал за доверие.
            </p>
            <p className="pt-2 text-xs text-slate-500 leading-snug">
              Партньорството не е медицинска сертификация. Zubite.bg не замества
              клиничната преценка и не гарантира резултати от лечение.
            </p>
          </div>

          {/* Supporting cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {cards.map((c) => (
              <div
                key={c.t}
                className="group rounded-2xl bg-white/70 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.18)] p-5 hover:ring-teal-200/70 hover:shadow-[0_22px_48px_-24px_rgba(13,148,136,0.25)] transition-all"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50/80 text-teal-700 ring-1 ring-teal-100">
                    {c.icon}
                  </span>
                  <p className="font-serif text-base text-slate-900 leading-snug">
                    {c.t}
                  </p>
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed">
                  {c.s}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   8. CARE PASS for clinics
   ════════════════════════════════════════════════════════════ */
function CarePassClinicsSection() {
  return (
    <section
      className="relative py-20 sm:py-24 bg-[#FCFAF8] overflow-hidden"
      data-testid="clinics-care-pass-clarification"
    >
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div
          className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.5)] p-8 sm:p-12"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 100% 0%, rgba(20,184,166,0.28) 0%, transparent 60%),' +
              'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
          }}
        >
          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/10 ring-1 ring-teal-300/30 text-teal-200 text-[11px] font-medium px-3 py-1 uppercase tracking-[0.18em]">
                <Gift className="w-3 h-3" /> Care Pass за партньори
              </span>
              <h2 className="mt-4 font-serif text-[2rem] sm:text-4xl font-semibold text-white leading-[1.08]">
                Care Pass е{' '}
                <span className="text-teal-300">организиран от Zubite</span>,{' '}
                <span className="text-teal-300">безплатен за партньорските клиники</span>.
              </h2>
              <p className="mt-4 text-slate-300 text-lg leading-relaxed max-w-xl">
                Zubite Care Pass е допълнителна стойност, която Zubite.bg организира
                чрез партньорства с брандове в сферата на оралната хигиена и
                денталната грижа.
              </p>
              <p className="mt-3 text-slate-300 text-base leading-relaxed max-w-xl">
                Партньорските клиники не трябва сами да търсят брандове, да
                договарят отстъпки или да изграждат подобна програма от нулата.
                Zubite.bg осигурява този слой като част от партньорската
                екосистема — клиниката може да го даде на пациента след реално
                посещение на консултация.
              </p>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-xl">
                Care Pass не е отстъпка от лечение, не е застрахователен продукт,
                не е абонамент и не променя медицинската преценка.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  'Организирано от Zubite',
                  'Безплатно за партньорските клиники',
                  'След реално посещение',
                  'Орална хигиена · дентална грижа',
                  'Не е отстъпка от лечение',
                ].map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/12 text-[11px] text-slate-200 font-medium px-3 py-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3 text-teal-300" />
                    {c}
                  </span>
                ))}
              </div>
            </div>
            {/* Compact card visual */}
            <div className="relative w-full max-w-xs mx-auto lg:ml-auto">
              <div aria-hidden className="absolute -inset-4 rounded-2xl bg-teal-400/12 blur-2xl pointer-events-none" />
              <div className="relative rounded-2xl bg-white/[0.04] ring-1 ring-white/12 backdrop-blur-xl p-5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-teal-300/80 font-semibold">Zubite Care Pass</p>
                <p className="mt-2 font-serif text-base text-white leading-snug">
                  Допълнителна стойност за пациента — организирана от Zubite
                </p>
                <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                  <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-teal-300" /> Партньорски брандове в орална хигиена</li>
                  <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-teal-300" /> Безплатно за партньорската клиника</li>
                  <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-teal-300" /> След реално посетена консултация</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   9. FAQ
   ════════════════════════════════════════════════════════════ */
const faqItems = [
  { q: 'Zubite.bg каталог ли е?',                          a: 'Не. Zubite работи като подбрана партньорска мрежа. Пациентът преминава през ориентир преди да види релевантни клиники, не през открит каталог.' },
  { q: 'Какви заявки получава клиниката?',                 a: 'Заявки с контекст — категория, град, готовност и patient-reported отговори, нужни за следващата стъпка. Контактни данни се споделят със съгласие от пациента.' },
  { q: 'Как се избира коя клиника да се покаже?',          a: 'Насочването е базирано на категорията на заявката и града, а не на размер на рекламен бюджет. Спонсорираните позиции са ясно обозначени.' },
  { q: 'Трябва ли клиниката да финансира Zubite Care Pass?', a: 'Не. Zubite Care Pass се организира от Zubite.bg чрез партньорства с брандове в сферата на оралната хигиена и денталната грижа и се предоставя безплатно на партньорските клиники. Клиниката не трябва сама да договаря отстъпки или да създава програмата. Идеята е пациентът, който реално е посетил консултация чрез Zubite.bg, да получи допълнителна стойност и по-добро усещане за грижа.' },
  { q: 'Какво означава за пациента, че една клиника е партньор на Zubite.bg?', a: 'Това е сигнал, че клиниката участва в платформа, изградена около яснота, по-добра пациентска ориентация и отговорна комуникация. Zubite.bg не замества клиничната преценка и не гарантира резултати, но помага пациентите да влизат в разговора по-подготвени и с по-ясни очаквания.' },
  { q: 'Как се проследява качеството?', a: 'Време за реакция, обработка на заявки и обратна връзка от пациентите се отразяват в партньорския статус.' },
  { q: 'Има ли гарантиран брой пациенти?',                 a: 'Не. Zubite.bg не гарантира пациентски обем, приходи или брой започнати лечения. Целта е по-добър входящ канал, не вълшебни числа.' },
]

function FaqSection() {
  return (
    <section
      className="relative py-20 sm:py-24 bg-[#FCFAF8] overflow-hidden"
      data-testid="clinics-faq"
    >
      <div className="relative max-w-3xl mx-auto px-5 sm:px-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Въпроси от клиники</p>
        <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl font-semibold text-slate-900 leading-[1.08]">
          Често задавани въпроси
        </h2>
        <div className="mt-10 space-y-2">
          {faqItems.map((item, i) => {
            const isCarePassFundingFaq = item.q.includes('финансира Zubite Care Pass')
            return (
              <details
                key={item.q}
                className="group rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 p-5 hover:ring-teal-200/60 transition-colors"
                data-testid={isCarePassFundingFaq ? 'clinics-care-pass-faq' : `faq-item-${i}`}
              >
                <summary className="list-none cursor-pointer flex items-start justify-between gap-4">
                  <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 leading-snug pr-2">{item.q}</h3>
                  <ChevronDown className="w-4 h-4 text-teal-700 flex-shrink-0 mt-1 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-200/50 pt-3">{item.a}</p>
              </details>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   "Кои клиники са най-подходящи" — kept for backward parity,
   compact 2-column comparison.
   ════════════════════════════════════════════════════════════ */
const suitableFor = [
  'Реагират бързо на заявки',
  'Проследяват резултати',
  'Искат по-информирани пациенти',
  'Готови са да предадат Zubite Care Pass на пациента след посещение',
]
const notSuitable = [
  'Очакват гарантиран обем пациенти',
  'Не реагират в разумно време',
  'Не желаят прозрачност за процеса',
  'Очакват каталог-стил видимост',
]

function WhoItIsForSection() {
  return (
    <section
      className="relative py-20 sm:py-24 overflow-hidden"
      data-testid="clinics-who-for"
      style={{ background: 'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)' }}
    >
      <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Подходящи партньори</p>
          <h2 className="mt-3 font-serif text-[2rem] sm:text-4xl font-semibold text-slate-900 leading-[1.08]">
            За кого е подходящо?
          </h2>
        </div>
        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-emerald-200/50 p-6 shadow-[0_8px_30px_-20px_rgba(16,185,129,0.22)]">
            <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold mb-3">Подходящо за клиники, които</p>
            <ul className="space-y-2.5">
              {suitableFor.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-rose-200/40 p-6 shadow-[0_8px_30px_-20px_rgba(244,63,94,0.18)]">
            <p className="text-[11px] uppercase tracking-wider text-rose-700 font-semibold mb-3">По-малко подходящо за клиники, които</p>
            <ul className="space-y-2.5">
              {notSuitable.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                  <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   10. FINAL CTA — dedicated section per spec (dual CTA: apply + contact)
   ════════════════════════════════════════════════════════════ */
function FinalCtaSection() {
  return (
    <section
      className="relative py-20 sm:py-24 bg-[#FCFAF8] overflow-hidden"
      data-testid="clinics-final-cta"
    >
      <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
        <div
          className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.55)] p-8 sm:p-12 md:p-16 text-center"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(20,184,166,0.22) 0%, transparent 60%),' +
              'radial-gradient(ellipse 50% 50% at 0% 100%, rgba(94,234,212,0.10) 0%, transparent 65%),' +
              'linear-gradient(135deg, #0B1620 0%, #0E1A24 50%, #112832 100%)',
          }}
        >
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/30 to-transparent" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] ring-1 ring-white/15 text-teal-200 text-[10px] font-semibold px-3 py-1 uppercase tracking-[0.2em]">
            <BadgeCheck className="w-3 h-3" />
            По-добър входящ канал
          </span>
          <h2 className="mt-5 font-serif text-[2rem] sm:text-4xl lg:text-[2.75rem] font-semibold text-white leading-[1.08] text-balance max-w-3xl mx-auto">
            Ако искате по-подготвени пациенти, започнете от{' '}
            <span className="text-teal-300">по-добър входящ канал</span>.
          </h2>
          <p className="mt-5 text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Подайте кратка форма или се свържете директно с екипа на Zubite.bg.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="#application"
              className="group relative inline-flex items-center justify-center gap-1.5 rounded-full text-slate-900 text-sm font-medium px-6 py-3.5 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(94,234,212,0.45)] overflow-hidden w-full sm:w-auto"
              style={{ backgroundImage: 'linear-gradient(135deg,#5eead4 0%,#2dd4bf 60%,#14b8a6 100%)' }}
              data-testid="final-apply-btn"
            >
              <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/40 blur-sm pointer-events-none" />
              <span className="relative inline-flex items-center gap-1.5">
                Кандидатствай като партньорска клиника
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl text-white text-sm font-medium px-6 py-3.5 ring-1 ring-white/15 hover:bg-white/[0.14] hover:-translate-y-0.5 transition-all w-full sm:w-auto"
              data-testid="final-contact-btn"
            >
              Свържи се с екипа
            </Link>
          </div>
          <p className="mt-7 text-[11px] text-slate-500 leading-snug max-w-lg mx-auto">
            Без гарантиран обем · Без гарантирани класации · Подбрана партньорска мрежа.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   APPLICATION FORM — submit logic preserved verbatim
   ════════════════════════════════════════════════════════════ */
const inputClass =
  'w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-colors outline-none'
const selectClass =
  'w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-colors outline-none appearance-none cursor-pointer'
const labelClass = 'block text-sm font-medium text-slate-300 mb-2'
const sectionTitleClass =
  'font-sans text-xs font-semibold tracking-[0.2em] uppercase text-teal-300 mb-6 flex items-center gap-3'

function SectionDivider({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className={sectionTitleClass}>
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  )
}

function Toggle({
  checked, onChange, label, testId,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; testId?: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span
        className={
          'relative w-10 h-6 rounded-full transition-colors ' +
          (checked ? 'bg-teal-500' : 'bg-slate-700')
        }
        data-testid={testId}
      >
        <span
          className={
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ' +
            (checked ? 'translate-x-4' : '')
          }
        />
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
      </span>
      <span className="text-sm text-slate-200">{label}</span>
    </label>
  )
}

function ApplicationSection() {
  const [form, setForm] = useState({
    clinic_name: '',
    city: '',
    address: '',
    website: '',
    contact_name: '',
    phone: '',
    email: '',
    offers_aligners: false,
    offers_braces: false,
    offers_implants: false,
    treats_adults: false,
    treats_children: false,
    years_experience: '',
    number_of_cases_per_month: '',
    do_you_use_digital_scans: '',
    what_types_of_patients_are_best_for_you: '',
    average_response_time: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const set = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  // ⚠️ Submit handler is intentionally identical to the previous
  // implementation. Backend payload shape preserved verbatim.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const payload = {
        ...form,
        website: form.website || null,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        number_of_cases_per_month: form.number_of_cases_per_month || null,
        do_you_use_digital_scans:
          form.do_you_use_digital_scans === 'yes' ? true
            : form.do_you_use_digital_scans === 'no' ? false
              : null,
        what_types_of_patients_are_best_for_you:
          form.what_types_of_patients_are_best_for_you || null,
        average_response_time: form.average_response_time || null,
      }
      const res = await fetch(`${API_URL}/api/clinic-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) setStatus('success')
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section
      id="application"
      className="relative py-24 md:py-32 overflow-hidden"
      data-testid="clinics-application"
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(20,184,166,0.18) 0%, transparent 60%),' +
          'linear-gradient(135deg, #0B1620 0%, #0E1A24 100%)',
      }}
    >
      <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[480px] rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-5 sm:px-8">
        {status === 'success' ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-teal-500/15 ring-1 ring-teal-300/30 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-10 h-10 text-teal-300" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white mb-4">
              Благодарим за интереса
            </h2>
            <p className="text-slate-300 text-lg max-w-md mx-auto">
              Ще прегледаме вашата кандидатура и ще се свържем с вас в рамките
              на 48 часа.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-teal-300 mb-3">
                Кандидатстване
              </p>
              <h2 className="font-serif text-[1.75rem] sm:text-[2.25rem] font-semibold text-white leading-[1.1] mb-4">
                Подайте кратка форма за партньорство
              </h2>
              <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                Ще прегледаме съответствието с партньорската мрежа и ще се свържем с вас в рамките на 48 часа.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white/[0.04] backdrop-blur-xl ring-1 ring-white/12 rounded-2xl p-6 sm:p-8 md:p-10 space-y-8"
              data-testid="clinic-application-form"
            >
              {/* ── Clinic Info ── */}
              <SectionDivider icon={Building2} label="Информация за клиниката" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Име на клиниката *</label>
                  <input type="text" required value={form.clinic_name} onChange={(e) => set('clinic_name', e.target.value)} className={inputClass} placeholder="Дентал клиник" data-testid="input-clinic-name" />
                </div>
                <div>
                  <label className={labelClass}>Град *</label>
                  <select required value={form.city} onChange={(e) => set('city', e.target.value)} className={selectClass} data-testid="input-city">
                    <option value="" disabled className="bg-slate-900">Изберете град</option>
                    <option value="София" className="bg-slate-900">София</option>
                    <option value="Пловдив" className="bg-slate-900">Пловдив</option>
                    <option value="Варна" className="bg-slate-900">Варна</option>
                    <option value="Друг" className="bg-slate-900">Друг</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Адрес *</label>
                  <input type="text" required value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} placeholder="ул. Витоша 15" data-testid="input-address" />
                </div>
                <div>
                  <label className={labelClass}>Уебсайт</label>
                  <input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} className={inputClass} placeholder="https://example.com" data-testid="input-website" />
                </div>
              </div>

              {/* ── Contact ── */}
              <SectionDivider icon={Users} label="Контакт" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Лице за контакт *</label>
                  <input type="text" required value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} className={inputClass} placeholder="Д-р Иванов" data-testid="input-contact-name" />
                </div>
                <div>
                  <label className={labelClass}>Телефон *</label>
                  <input type="tel" required value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} placeholder="+359 888 123 456" data-testid="input-phone" />
                </div>
                <div>
                  <label className={labelClass}>Имейл *</label>
                  <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} placeholder="clinic@example.com" data-testid="input-email" />
                </div>
              </div>

              {/* ── Services ── */}
              <SectionDivider icon={ClipboardCheck} label="Услуги" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                <Toggle checked={form.offers_aligners} onChange={(v) => set('offers_aligners', v)} label="Алайнери" testId="toggle-aligners" />
                <Toggle checked={form.offers_braces} onChange={(v) => set('offers_braces', v)} label="Брекети" testId="toggle-braces" />
                <Toggle checked={form.offers_implants} onChange={(v) => set('offers_implants', v)} label="Импланти" testId="toggle-implants" />
                <Toggle checked={form.treats_adults} onChange={(v) => set('treats_adults', v)} label="Третира възрастни" testId="toggle-adults" />
                <Toggle checked={form.treats_children} onChange={(v) => set('treats_children', v)} label="Третира деца" testId="toggle-children" />
              </div>

              {/* ── Qualification ── */}
              <SectionDivider icon={ShieldCheck} label="Квалификация" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Години опит</label>
                  <input type="number" min="0" value={form.years_experience} onChange={(e) => set('years_experience', e.target.value)} className={inputClass} placeholder="10" data-testid="input-years-experience" />
                </div>
                <div>
                  <label className={labelClass}>Случаи на месец</label>
                  <select value={form.number_of_cases_per_month} onChange={(e) => set('number_of_cases_per_month', e.target.value)} className={selectClass} data-testid="input-cases-per-month">
                    <option value="" className="bg-slate-900">Изберете</option>
                    <option value="1-5" className="bg-slate-900">1 – 5</option>
                    <option value="6-15" className="bg-slate-900">6 – 15</option>
                    <option value="16-30" className="bg-slate-900">16 – 30</option>
                    <option value="30+" className="bg-slate-900">30+</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Дигитални сканове?</label>
                  <select value={form.do_you_use_digital_scans} onChange={(e) => set('do_you_use_digital_scans', e.target.value)} className={selectClass} data-testid="input-digital-scans">
                    <option value="" className="bg-slate-900">Изберете</option>
                    <option value="yes" className="bg-slate-900">Да</option>
                    <option value="no" className="bg-slate-900">Не</option>
                  </select>
                </div>
              </div>

              {/* ── Positioning ── */}
              <SectionDivider icon={Target} label="Позициониране" />
              <div>
                <label className={labelClass}>Какъв тип пациенти са най-подходящи за вас?</label>
                <textarea rows={3} value={form.what_types_of_patients_are_best_for_you} onChange={(e) => set('what_types_of_patients_are_best_for_you', e.target.value)} className={`${inputClass} resize-none`} placeholder="Напр. възрастни с леки до средни ортодонтски проблеми..." data-testid="input-patient-types" />
              </div>

              {/* ── Operations ── */}
              <SectionDivider icon={Clock} label="Операции" />
              <div>
                <label className={labelClass}>Средно време за отговор на запитване</label>
                <select value={form.average_response_time} onChange={(e) => set('average_response_time', e.target.value)} className={selectClass} data-testid="input-response-time">
                  <option value="" className="bg-slate-900">Изберете</option>
                  <option value="<1h" className="bg-slate-900">Под 1 час</option>
                  <option value="1-6h" className="bg-slate-900">1 – 6 часа</option>
                  <option value="24h" className="bg-slate-900">До 24 часа</option>
                  <option value=">24h" className="bg-slate-900">Над 24 часа</option>
                </select>
              </div>

              {/* ── Submit ── */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-full text-slate-900 font-medium transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(94,234,212,0.45)] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundImage: 'linear-gradient(135deg,#5eead4 0%,#2dd4bf 60%,#14b8a6 100%)' }}
                  data-testid="footer-apply-btn"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Изпращане...</span>
                    </>
                  ) : (
                    <>
                      <span>Изпрати кандидатура</span>
                      <ArrowUpRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="mt-3 text-center text-[11px] text-slate-500">
                  Или се свържи с екипа: <Link href="/contact" className="text-teal-300 hover:text-teal-200">контактна форма</Link>.
                </p>
              </div>

              {status === 'error' && (
                <p className="text-red-400 text-sm text-center" data-testid="form-error">
                  Възникна грешка. Моля, опитайте отново.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   Placeholder for dashboard preview testid parity with previous shell.
   ════════════════════════════════════════════════════════════ */
function DashboardPreviewSection() {
  // The dashboard preview is rendered inline inside ContextSection now —
  // keep a tiny anchor section so existing analytics / deep links that
  // looked for #partner-panel still work.
  return (
    <div id="partner-panel" data-testid="clinics-dashboard-preview" className="sr-only">
      Партньорски панел — illustration above.
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   HEADER / FOOTER
   ════════════════════════════════════════════════════════════ */
function ClinicsHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1620]/70 backdrop-blur-2xl border-b border-white/8">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-white" data-testid="clinics-logo">
          Zubite<span className="text-teal-300">.bg</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
          <Link href="#how" className="hover:text-white transition-colors">Процес</Link>
          <Link href="#partner-panel" className="hover:text-white transition-colors">Панел</Link>
          <Link href="/" className="hover:text-white transition-colors">За пациенти</Link>
        </nav>
        <Link
          href="#application"
          className="hidden sm:inline-flex items-center gap-1 rounded-full text-slate-900 text-xs font-medium px-3.5 py-1.5 hover:-translate-y-0.5 transition-transform shadow-[0_8px_24px_-12px_rgba(94,234,212,0.45)]"
          style={{ backgroundImage: 'linear-gradient(135deg,#5eead4 0%,#2dd4bf 60%,#14b8a6 100%)' }}
        >
          Кандидатствай
        </Link>
      </div>
    </header>
  )
}

function ClinicsFooter() {
  return (
    <footer className="relative py-12 bg-[#0B1620] overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-serif text-lg text-white">Zubite<span className="text-teal-300">.bg</span></p>
            <p className="mt-1 text-[11px] text-slate-500">Партньорска програма · България</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-200 transition-colors">Начало</Link>
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">Поверителност</Link>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">Условия</Link>
            <Link href="/contact" className="hover:text-slate-200 transition-colors">Контакти</Link>
          </div>
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Zubite.bg</p>
        </div>
        <p className="mt-6 text-[10.5px] text-slate-600 leading-snug max-w-3xl">
          Zubite.bg не поставя диагноза. Пациентските отговори са patient-reported. Окончателната клинична преценка се прави от стоматолог или ортодонт.
        </p>
      </div>
    </footer>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════════════ */
export function ForClinicsContent() {
  return (
    <main className="min-h-screen bg-[#FCFAF8] overflow-x-hidden">
      <ClinicsHeader />
      <HeroSection />
      <ProblemSection />
      <DifferentiationSection />
      <ContextSection />
      <HowItWorksSection />
      <PartnerValueSection />
      <TrustSignalSection />
      <NeutralDecisionLayerSection />
      <CarePassClinicsSection />
      <WhoItIsForSection />
      <DashboardPreviewSection />
      <FaqSection />
      <FinalCtaSection />
      <ApplicationSection />
      <ClinicsFooter />
    </main>
  )
}
