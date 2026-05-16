'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, ArrowUpRight, Loader2, CheckCircle2,
  Building2, Users, Clock, ClipboardCheck, ShieldCheck, Target,
  LineChart, Brain, Compass, Workflow, Sparkles, Database,
  CalendarDays, BellRing, MessageCircle, Award, X,
} from 'lucide-react'
import { ScrollReveal } from '../hooks/useScrollAnimation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

/* ════════════════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section
      className="relative min-h-[88vh] flex items-center bg-slate-950 overflow-hidden"
      data-testid="clinics-hero"
    >
      {/* Layered background — abstract decision-layer, no stock photos */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[640px] h-[640px] rounded-full bg-sky-600/20 blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-[480px] h-[480px] rounded-full bg-teal-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 md:px-12 py-28 md:py-36 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        <div>
          <ScrollReveal animation="fade-up" duration={800}>
            <p className="font-sans text-xs font-semibold tracking-[0.28em] uppercase text-sky-400 mb-7">
              Партньорска програма за клиники
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={100} duration={900}>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-medium tracking-tight text-white leading-[1.08] mb-7">
              Не ви трябват още{' '}
              <span className="text-slate-400">случайни запитвания.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200} duration={900}>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-xl mb-6">
              Трябват ви пациенти, които разбират проблема си и са готови за
              следваща стъпка.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={280} duration={900}>
            <p className="text-base text-slate-400 leading-relaxed max-w-xl mb-10">
              Zubite.bg не е дентален каталог. Това е платформа за пациентско
              решение, която помага на хората да се ориентират преди да изберат
              клиника — и насочва към партньорите заявки с повече контекст, по-ясен
              интерес и проследим процес.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={360} duration={900}>
            <div className="flex flex-wrap gap-3">
              <a
                href="#application"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/25 hover:-translate-y-0.5 active:translate-y-0 group"
                data-testid="hero-apply-btn"
              >
                Кандидатствайте за партньорска клиника
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium text-slate-200 border border-white/15 rounded-full hover:bg-white/5 transition-colors"
                data-testid="hero-secondary-btn"
              >
                Вижте как работи Zubite
              </a>
            </div>
          </ScrollReveal>
        </div>

        {/* Right: abstract patient-flow decision visual (pure CSS/SVG) */}
        <ScrollReveal animation="fade-left" delay={400} duration={1000}>
          <HeroVisual />
        </ScrollReveal>
      </div>
    </section>
  )
}

function HeroVisual() {
  return (
    <div
      className="relative w-full max-w-[460px] mx-auto aspect-[5/6] hidden lg:block"
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/40 backdrop-blur-md shadow-2xl shadow-sky-500/10" />
      <div className="absolute inset-5 flex flex-col gap-3">
        {/* Patient signal layer */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-sky-300 mb-2">
            <Brain className="w-3 h-3" /> Пациентски слой
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-3/4 rounded-full bg-sky-400/40" />
            <div className="h-1.5 w-1/2 rounded-full bg-sky-400/25" />
            <div className="h-1.5 w-2/3 rounded-full bg-sky-400/25" />
          </div>
        </div>

        {/* Zubite decision layer */}
        <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4 flex-1">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-slate-300 mb-3">
            <Compass className="w-3 h-3" /> Zubite слой
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Симптом', 'Лек'],
              ['Интерес', 'Алайнери'],
              ['Град', 'София'],
              ['Готовност', 'Висока'],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-md border border-white/10 px-2 py-1.5"
              >
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">
                  {k}
                </div>
                <div className="text-xs text-slate-100 font-medium">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinic outcome layer */}
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-emerald-300 mb-2">
            <Workflow className="w-3 h-3" /> Клиничен слой
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-slate-200">
                Заявка #1024 · нова
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span className="text-[11px] text-slate-300">
                Контекст: алайнери · София
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   PROBLEM
   ════════════════════════════════════════════════════════════ */
const problemPoints = [
  'случайни запитвания',
  'пациенти, които питат само за цена',
  'липса на контекст преди първия разговор',
  'трудност да се проследи какво се случва след заявката',
  'маркетинг, който измерва кликове, но не и реална готовност',
]

function ProblemSection() {
  return (
    <section
      className="py-24 md:py-32 bg-white"
      data-testid="clinics-problem"
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
            Защо мощният поток не помага
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-6 max-w-2xl">
            Повече трафик не означава по-добри пациенти.
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed max-w-2xl mb-12">
            Много клиники губят време с предсказуеми разговори, които биха могли
            да започнат от съвсем друга точка.
          </p>
        </ScrollReveal>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 max-w-3xl">
          {problemPoints.map((p, i) => (
            <ScrollReveal
              key={p}
              animation="fade-up"
              delay={i * 80}
              duration={700}
            >
              <li className="flex items-start gap-3 py-2 border-b border-slate-100">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                <span className="text-slate-700">{p}</span>
              </li>
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   DIFFERENTIATION (2-column comparison)
   ════════════════════════════════════════════════════════════ */
const catalogPoints = [
  'Пациентът търси лекар.',
  'Фокусът е върху профил, рейтинг и свободен час.',
  'Клиниката често получава заявка с минимален контекст.',
  'Всички запитвания изглеждат почти еднакво.',
  'Основната стойност е видимост.',
]
const zubitePoints = [
  'Пациентът първо разбира ситуацията си.',
  'Фокусът е върху симптоми, интерес, готовност и следваща стъпка.',
  'Клиниката получава заявка с контекст.',
  'Процесът може да се проследи от заявка до консултация.',
  'Основната стойност е квалифицирано търсене, данни и партньорски workflow.',
]

function DifferentiationSection() {
  return (
    <section
      className="py-24 md:py-32 bg-slate-50"
      data-testid="clinics-differentiation"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
            Каква е разликата
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-14 max-w-3xl">
            Класическият каталог започва от списък с клиники.{' '}
            <span className="text-sky-600">Zubite започва от пациента.</span>
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ScrollReveal animation="fade-right" duration={800}>
            <div
              className="rounded-2xl border border-slate-200 bg-white p-7 md:p-9 h-full"
              data-testid="diff-catalog"
            >
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">
                  Класически дентален каталог
                </span>
              </div>
              <ul className="space-y-3">
                {catalogPoints.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-slate-600">
                    <X className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-left" duration={800} delay={100}>
            <div
              className="rounded-2xl border-2 border-sky-500/30 bg-gradient-to-br from-sky-50 to-white p-7 md:p-9 h-full relative"
              data-testid="diff-zubite"
            >
              <div className="absolute -top-3 left-7 px-3 py-1 bg-sky-500 text-white text-[10px] tracking-[0.18em] uppercase font-semibold rounded-full">
                Zubite.bg
              </div>
              <div className="flex items-center gap-2 mb-5 mt-2">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-[11px] tracking-[0.2em] uppercase text-sky-700 font-semibold">
                  Пациентско решение
                </span>
              </div>
              <ul className="space-y-3">
                {zubitePoints.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 mt-1 flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   CONTEXT / INTELLIGENCE
   ════════════════════════════════════════════════════════════ */
const contextSignals = [
  { label: 'какво го тревожи', icon: Brain },
  { label: 'какво лечение обмисля', icon: Target },
  { label: 'колко е готов да действа', icon: Sparkles },
  { label: 'в кой град търси решение', icon: Compass },
  { label: 'какъв път е изминал преди да поиска контакт', icon: Workflow },
]

function ContextSection() {
  return (
    <section
      className="py-24 md:py-32 bg-slate-950 text-white relative overflow-hidden"
      data-testid="clinics-context"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-sky-600/10 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-400 mb-4">
            Контекст
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight mb-7 max-w-2xl">
            Контекстът променя първия разговор.
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed max-w-2xl mb-12">
            Повечето клиники виждат пациента чак когато той остави име и
            телефон. Zubite вижда сигналите преди това.
          </p>
        </ScrollReveal>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
          {contextSignals.map((s, i) => {
            const Icon = s.icon
            return (
              <ScrollReveal key={s.label} animation="fade-up" delay={i * 80}>
                <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <Icon className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-200 text-sm leading-snug">
                    {s.label}
                  </span>
                </li>
              </ScrollReveal>
            )
          })}
        </ul>

        <ScrollReveal animation="fade-up" delay={400}>
          <div className="border-l-2 border-sky-500 pl-5 max-w-2xl">
            <p className="text-slate-400 text-sm mb-1">Това не е просто lead.</p>
            <p className="font-serif text-xl md:text-2xl text-white">
              Това е пациентски контекст.
            </p>
            <p className="text-slate-400 text-sm mt-3">
              Клиниката започва разговора по-информирано — с по-малко гадаене и
              по-ясна следваща стъпка.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   HOW IT WORKS — 4 steps
   ════════════════════════════════════════════════════════════ */
const flowSteps = [
  {
    icon: ClipboardCheck,
    title: 'Пациентът преминава през кратък образователен flow',
    body: 'Отговаря на въпроси за симптоми, интерес, град и готовност.',
  },
  {
    icon: Compass,
    title: 'Zubite помага да се изясни следващата стъпка',
    body: 'Пациентът получава по-добра ориентация, без диагноза и без натиск.',
  },
  {
    icon: Workflow,
    title: 'Клиниката получава заявка с контекст',
    body: 'Не просто контакт, а информация, която помага за по-смислен първи разговор.',
  },
  {
    icon: LineChart,
    title: 'Всичко се проследява в партньорски dashboard',
    body: 'Заявки, статуси, резервации, календар и представяне на едно място.',
  },
]

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 md:py-32 bg-white"
      data-testid="clinics-how-it-works"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
            Как работи
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-14 max-w-2xl">
            Как работи Zubite за партньорските клиники
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {flowSteps.map((s, i) => {
            const Icon = s.icon
            return (
              <ScrollReveal key={s.title} animation="fade-up" delay={i * 110}>
                <div className="bg-slate-50 rounded-2xl p-6 md:p-7 h-full border border-slate-100 hover:border-slate-200 transition-colors relative">
                  <span className="absolute top-5 right-5 font-mono text-xs text-slate-300">
                    0{i + 1}
                  </span>
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 grid place-items-center mb-5">
                    <Icon className="w-5 h-5 text-sky-600" />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-slate-900 mb-2 leading-snug">
                    {s.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   PARTNER VALUE STACK
   ════════════════════════════════════════════════════════════ */
const valueCards = [
  {
    icon: ClipboardCheck,
    title: 'По-подготвени пациентски заявки',
    body: 'Пациентите преминават през кратък flow, преди да поискат контакт.',
  },
  {
    icon: Brain,
    title: 'Контекст преди първия разговор',
    body: 'Град, интерес, готовност, спешност и заявена следваща стъпка.',
  },
  {
    icon: LineChart,
    title: 'Партньорски dashboard',
    body: 'Заявки, статуси, резервации, календар и представяне на едно място.',
  },
  {
    icon: Workflow,
    title: 'Проследим процес',
    body: 'Видяна заявка, опит за обаждане, свързан пациент, резервирана и посетена консултация.',
  },
  {
    icon: Sparkles,
    title: 'Видимост в каналите на Zubite',
    body: 'Spotlight съдържание, образователни теми и партньорско позициониране.',
  },
  {
    icon: Database,
    title: 'Достъп до patient insight layer',
    body: 'Сценарии, често срещани въпроси и наблюдения от реалното пациентско поведение.',
  },
  {
    icon: Award,
    title: 'Founding partner условия',
    body: 'Ограничен брой клиники, по-висока видимост и възможност да участвате във формирането на платформата.',
  },
]

function PartnerValueSection() {
  return (
    <section
      className="py-24 md:py-32 bg-slate-50"
      data-testid="clinics-value-stack"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
            Стойност за клиниката
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-14 max-w-2xl">
            Какво получава партньорската клиника
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {valueCards.map((c, i) => {
            const Icon = c.icon
            return (
              <ScrollReveal
                key={c.title}
                animation="fade-up"
                delay={i * 60}
                duration={700}
              >
                <div className="bg-white rounded-2xl p-6 md:p-7 h-full border border-slate-100 hover:border-sky-200 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-lg bg-sky-50 grid place-items-center mb-4">
                    <Icon className="w-4 h-4 text-sky-600" />
                  </div>
                  <h3 className="font-serif text-base md:text-lg font-medium text-slate-900 mb-1.5 leading-snug">
                    {c.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {c.body}
                  </p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   NEUTRAL DECISION LAYER  (Не просто lead. По-информиран пациент.)
   ════════════════════════════════════════════════════════════ */
const neutralLayerBullets = [
  'пациентът идва с повече контекст, не само с въпрос „колко струва“',
  'вижда ограничен брой подходящи опции, не безкраен списък',
  'може да поиска помощ от Zubite, ако не е сигурен',
  'клиниката получава по-структурирана заявка',
  'намалява хаотичното сравняване само по цена',
  'партньорските клиники работят с по-информирани пациенти',
]

function NeutralDecisionLayerSection() {
  return (
    <section
      className="py-24 md:py-32 bg-white relative overflow-hidden"
      data-testid="clinics-neutral-layer"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-sky-100/40 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr,1fr] gap-12 lg:gap-16 items-start">
          {/* Left column — copy */}
          <ScrollReveal animation="fade-up">
            <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
              Неутрален слой между пациента и клиниката
            </p>
            <h2
              className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-6 max-w-xl leading-tight"
              data-testid="neutral-layer-title"
            >
              Не просто lead. По-информиран пациент.
            </h2>

            <div className="space-y-4 text-slate-600 text-base md:text-lg leading-relaxed max-w-xl">
              <p data-testid="neutral-layer-p1">
                Zubite не изпраща пациента директно към произволен списък с клиники.
              </p>
              <p data-testid="neutral-layer-p2">
                Първо помагаме на човека да подреди симптомите, притесненията и
                целта си в ясен процес. След това му показваме ограничен брой
                подходящи опции.
              </p>
              <p data-testid="neutral-layer-p3">
                Ако пациентът не е сигурен коя клиника да избере, може да поиска
                помощ от Zubite като неутрален ориентиращ слой. Целта не е да
                поставяме диагноза, а да помогнем на пациента да направи по-ясна
                следваща стъпка.
              </p>
            </div>

            <div className="mt-10">
              <Link
                href="#application"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
                data-testid="neutral-layer-cta"
              >
                Кандидатствайте като партньорска клиника
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>

          {/* Right column — bullets card */}
          <ScrollReveal animation="fade-up" delay={120}>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-7 md:p-9">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 grid place-items-center">
                  <Compass className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-500">
                  Какво променя това за клиниката
                </div>
              </div>

              <ul
                className="space-y-3.5"
                data-testid="neutral-layer-bullets"
              >
                {neutralLayerBullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-slate-700 text-sm md:text-base leading-relaxed"
                  >
                    <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-sky-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
                Zubite не поставя диагноза и не заменя преглед при лекар.
                Платформата помага на пациента да структурира контекста си преди
                разговора с клиниката.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   PARTNER TERMS  (Партньорски условия — early-stage individual terms)
   ════════════════════════════════════════════════════════════ */
const partnerTerms = [
  'ограничен брой партньорски клиники в началния етап',
  'условия според град, лечение и капацитет',
  'достъп до партньорски dashboard',
  'заявки с повече пациентски контекст',
  'възможност за допълнителна видимост в каналите на Zubite',
  'участие във формирането на early partner workflow',
]

function FoundingPartnerSection() {
  return (
    <section
      className="py-24 md:py-32 bg-slate-950 relative overflow-hidden"
      data-testid="clinics-founding"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full bg-sky-600/15 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 border border-sky-400/30 rounded-full text-xs text-sky-300 mb-6">
            <Award className="w-3.5 h-3.5" />
            Founding Partner — ограничен брой места
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white mb-6 max-w-2xl">
            Партньорски условия
          </h2>

          {/* Three short, confident paragraphs. No pricing. No "contact us for price". */}
          <div className="space-y-4 max-w-2xl mb-10">
            <p className="text-slate-200 text-base sm:text-lg leading-relaxed">
              Zubite не работи като стандартен listing или масов lead
              marketplace.
            </p>
            <p className="text-slate-300 text-base leading-relaxed">
              В началния етап партньорските условия се обсъждат индивидуално
              според града, типа лечения, капацитета на клиниката и начина,
              по който искате да обработвате заявките.
            </p>
            <p className="text-slate-300 text-base leading-relaxed">
              Целта е да изградим партньорство, което има смисъл и за двете
              страни — не просто още един месечен абонамент.
            </p>
          </div>
        </ScrollReveal>

        <ul
          className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10"
          data-testid="partner-terms-list"
        >
          {partnerTerms.map((b, i) => (
            <ScrollReveal key={b} animation="fade-up" delay={i * 70}>
              <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <CheckCircle2 className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200 text-sm leading-snug">{b}</span>
              </li>
            </ScrollReveal>
          ))}
        </ul>

        <ScrollReveal animation="fade-up">
          <a
            href="#application"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-full transition-colors"
            data-testid="partner-terms-cta"
          >
            Обсъдете партньорски условия
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   WHO IT IS / IS NOT FOR
   ════════════════════════════════════════════════════════════ */
const suitableFor = [
  'клиники, които работят с ортодонтия, алайнери, импланти, естетика или комплексни случаи',
  'екипи, които могат да реагират бързо на нови заявки',
  'клиники, които искат пациентът да бъде по-информиран още преди първия разговор',
  'практики, които проследяват процеса от запитване до консултация',
  'клиники, които ценят доверие, комуникация и дългосрочен растеж',
]
const notSuitable = [
  'търсите просто още един listing',
  'не връщате обаждания',
  'не проследявате заявки',
  'очаквате платформата да замести отношението на клиниката към пациента',
]

function WhoItIsForSection() {
  return (
    <section
      className="py-24 md:py-32 bg-white"
      data-testid="clinics-who-for"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
            Подходящо ли е за вас
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-14 max-w-3xl">
            Zubite е за клиники, които искат повече от{' '}
            <span className="text-slate-400">„още един lead“.</span>
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ScrollReveal animation="fade-right">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-7 md:p-9 h-full">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] tracking-[0.2em] uppercase text-emerald-700 font-semibold">
                  Подходящо за
                </span>
              </div>
              <ul className="space-y-3.5">
                {suitableFor.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 text-slate-800 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-left" delay={120}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7 md:p-9 h-full">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">
                  По-малко подходящо ако
                </span>
              </div>
              <ul className="space-y-3.5">
                {notSuitable.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 text-slate-600 leading-relaxed"
                  >
                    <X className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   DASHBOARD PREVIEW (stylized CSS, anonymized)
   ════════════════════════════════════════════════════════════ */
function DashboardPreviewSection() {
  return (
    <section
      className="py-24 md:py-32 bg-slate-50 relative overflow-hidden"
      data-testid="clinics-dashboard-preview"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
            Партньорски dashboard
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-6 max-w-2xl">
            Партньорски dashboard за реален процес, не просто форма за контакт.
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed max-w-2xl mb-12">
            Нови заявки, активни пациенти, статуси, календар, представяне и
            проследяване от заявка до консултация — всичко на едно място.
          </p>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={120}>
          <DashboardMock />
        </ScrollReveal>
      </div>
    </section>
  )
}

function DashboardMock() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
      {/* Mock window chrome */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 text-[11px] text-slate-400 font-mono">
          zubite.bg / клиничен dashboard
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] min-h-[420px]">
        {/* Sidebar */}
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-100 px-3 py-4 bg-slate-50/50">
          <div className="text-[10px] tracking-[0.18em] uppercase text-slate-400 px-2 mb-2">
            Меню
          </div>
          {[
            { label: 'Преглед', active: true, icon: LineChart },
            { label: 'Заявки', icon: ClipboardCheck },
            { label: 'Календар', icon: CalendarDays },
            { label: 'Резултати', icon: Award },
          ].map((m) => {
            const Icon = m.icon
            return (
              <div
                key={m.label}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm ${
                  m.active
                    ? 'bg-sky-50 text-sky-700 font-medium'
                    : 'text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {m.label}
              </div>
            )
          })}
        </aside>

        {/* Main body */}
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Нови', value: 4, tone: 'sky', icon: BellRing },
              { label: 'Чакат действие', value: 2, tone: 'amber', icon: Clock },
              {
                label: 'Резервирани',
                value: 7,
                tone: 'emerald',
                icon: CalendarDays,
              },
              {
                label: 'Посетили',
                value: 5,
                tone: 'emerald',
                icon: CheckCircle2,
              },
            ].map((k) => {
              const Icon = k.icon
              const toneRing: Record<string, string> = {
                sky: 'bg-sky-50 text-sky-700 ring-sky-100',
                amber: 'bg-amber-50 text-amber-700 ring-amber-100',
                emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
              }
              return (
                <div
                  key={k.label}
                  className="border border-slate-100 rounded-xl p-3"
                >
                  <div
                    className={`w-7 h-7 rounded-lg ring-1 ${toneRing[k.tone]} grid place-items-center mb-2`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-semibold text-slate-900 leading-none">
                    {k.value}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {k.label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mini chart + recent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 border border-slate-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] tracking-wide uppercase text-slate-400 font-semibold">
                  Седмична тенденция
                </span>
                <span className="text-[10px] text-slate-400">7 дни</span>
              </div>
              <svg viewBox="0 0 320 80" className="w-full h-20">
                <defs>
                  <linearGradient id="dm-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 60 L50 55 L100 50 L150 40 L200 35 L250 25 L320 18 L320 80 L0 80 Z"
                  fill="url(#dm-grad)"
                />
                <path
                  d="M0 60 L50 55 L100 50 L150 40 L200 35 L250 25 L320 18"
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>
            <div className="border border-slate-100 rounded-xl p-3">
              <div className="text-[11px] tracking-wide uppercase text-slate-400 font-semibold mb-2.5">
                Активни заявки
              </div>
              <ul className="space-y-2">
                {[
                  { id: '#1024', name: 'Пациент A', status: 'Назначена' },
                  { id: '#1023', name: 'Пациент B', status: 'Свързана' },
                  { id: '#1021', name: 'Пациент C', status: 'Резервирана' },
                ].map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="text-slate-700 truncate">{r.name}</div>
                      <div className="text-slate-400 font-mono text-[10px]">
                        {r.id}
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 flex-shrink-0">
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   APPLICATION FORM — submit logic preserved verbatim
   ════════════════════════════════════════════════════════════ */
const inputClass =
  'w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors outline-none'
const selectClass =
  'w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors outline-none appearance-none cursor-pointer'
const labelClass = 'block text-sm font-medium text-slate-300 mb-2'
const sectionTitleClass =
  'font-sans text-xs font-semibold tracking-[0.2em] uppercase text-sky-400 mb-6 flex items-center gap-3'

function SectionDivider({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <div className={sectionTitleClass}>
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  testId: string
}) {
  return (
    <label
      className="flex items-center gap-3 cursor-pointer group"
      data-testid={testId}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-sky-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
        {label}
      </span>
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )

  const set = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  // ⚠️ NOTE: This submit handler is intentionally identical to the previous
  // implementation. Backend payload shape is preserved verbatim.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const payload = {
        ...form,
        website: form.website || null,
        years_experience: form.years_experience
          ? parseInt(form.years_experience)
          : null,
        number_of_cases_per_month: form.number_of_cases_per_month || null,
        do_you_use_digital_scans:
          form.do_you_use_digital_scans === 'yes'
            ? true
            : form.do_you_use_digital_scans === 'no'
              ? false
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
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section
      id="application"
      className="relative py-24 md:py-32 bg-slate-950 overflow-hidden"
      data-testid="clinics-application"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[480px] rounded-full bg-sky-600/10 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 md:px-12">
        {status === 'success' ? (
          <ScrollReveal animation="zoom">
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="w-10 h-10 text-sky-400" />
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-white mb-4">
                Благодарим за интереса
              </h2>
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                Ще прегледаме вашата кандидатура и ще се свържем с вас в рамките
                на 48 часа.
              </p>
            </div>
          </ScrollReveal>
        ) : (
          <>
            <ScrollReveal animation="fade-up">
              <div className="text-center mb-12">
                <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-400 mb-3">
                  Кандидатстване
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white mb-4">
                  Кандидатствайте за партньорска клиника
                </h2>
                <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                  Разкажете ни повече за клиниката, екипа и леченията, които
                  искате да развивате. Ще се свържем с вас, за да обсъдим дали
                  има добро партньорско съвпадение.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={150}>
              <form
                onSubmit={handleSubmit}
                className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 space-y-8"
                data-testid="clinic-application-form"
              >
                {/* ── Clinic Info ── */}
                <SectionDivider icon={Building2} label="Информация за клиниката" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Име на клиниката *</label>
                    <input
                      type="text"
                      required
                      value={form.clinic_name}
                      onChange={(e) => set('clinic_name', e.target.value)}
                      className={inputClass}
                      placeholder="Дентал клиник"
                      data-testid="input-clinic-name"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Град *</label>
                    <select
                      required
                      value={form.city}
                      onChange={(e) => set('city', e.target.value)}
                      className={selectClass}
                      data-testid="input-city"
                    >
                      <option value="" disabled className="bg-slate-900">
                        Изберете град
                      </option>
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
                    <input
                      type="text"
                      required
                      value={form.address}
                      onChange={(e) => set('address', e.target.value)}
                      className={inputClass}
                      placeholder="ул. Витоша 15"
                      data-testid="input-address"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Уебсайт</label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) => set('website', e.target.value)}
                      className={inputClass}
                      placeholder="https://example.com"
                      data-testid="input-website"
                    />
                  </div>
                </div>

                {/* ── Contact ── */}
                <SectionDivider icon={Users} label="Контакт" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>Лице за контакт *</label>
                    <input
                      type="text"
                      required
                      value={form.contact_name}
                      onChange={(e) => set('contact_name', e.target.value)}
                      className={inputClass}
                      placeholder="Д-р Иванов"
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Телефон *</label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      className={inputClass}
                      placeholder="+359 888 123 456"
                      data-testid="input-phone"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Имейл *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      className={inputClass}
                      placeholder="clinic@example.com"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                {/* ── Services ── */}
                <SectionDivider icon={ClipboardCheck} label="Услуги" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                  <Toggle
                    checked={form.offers_aligners}
                    onChange={(v) => set('offers_aligners', v)}
                    label="Алайнери"
                    testId="toggle-aligners"
                  />
                  <Toggle
                    checked={form.offers_braces}
                    onChange={(v) => set('offers_braces', v)}
                    label="Брекети"
                    testId="toggle-braces"
                  />
                  <Toggle
                    checked={form.offers_implants}
                    onChange={(v) => set('offers_implants', v)}
                    label="Импланти"
                    testId="toggle-implants"
                  />
                  <Toggle
                    checked={form.treats_adults}
                    onChange={(v) => set('treats_adults', v)}
                    label="Третира възрастни"
                    testId="toggle-adults"
                  />
                  <Toggle
                    checked={form.treats_children}
                    onChange={(v) => set('treats_children', v)}
                    label="Третира деца"
                    testId="toggle-children"
                  />
                </div>

                {/* ── Qualification ── */}
                <SectionDivider icon={ShieldCheck} label="Квалификация" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>Години опит</label>
                    <input
                      type="number"
                      min="0"
                      value={form.years_experience}
                      onChange={(e) => set('years_experience', e.target.value)}
                      className={inputClass}
                      placeholder="10"
                      data-testid="input-years-experience"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Случаи на месец</label>
                    <select
                      value={form.number_of_cases_per_month}
                      onChange={(e) =>
                        set('number_of_cases_per_month', e.target.value)
                      }
                      className={selectClass}
                      data-testid="input-cases-per-month"
                    >
                      <option value="" className="bg-slate-900">Изберете</option>
                      <option value="1-5" className="bg-slate-900">1 – 5</option>
                      <option value="6-15" className="bg-slate-900">6 – 15</option>
                      <option value="16-30" className="bg-slate-900">16 – 30</option>
                      <option value="30+" className="bg-slate-900">30+</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Дигитални сканове?</label>
                    <select
                      value={form.do_you_use_digital_scans}
                      onChange={(e) =>
                        set('do_you_use_digital_scans', e.target.value)
                      }
                      className={selectClass}
                      data-testid="input-digital-scans"
                    >
                      <option value="" className="bg-slate-900">Изберете</option>
                      <option value="yes" className="bg-slate-900">Да</option>
                      <option value="no" className="bg-slate-900">Не</option>
                    </select>
                  </div>
                </div>

                {/* ── Positioning ── */}
                <SectionDivider icon={Target} label="Позициониране" />
                <div>
                  <label className={labelClass}>
                    Какъв тип пациенти са най-подходящи за вас?
                  </label>
                  <textarea
                    rows={3}
                    value={form.what_types_of_patients_are_best_for_you}
                    onChange={(e) =>
                      set(
                        'what_types_of_patients_are_best_for_you',
                        e.target.value,
                      )
                    }
                    className={`${inputClass} resize-none`}
                    placeholder="Напр. възрастни с леки до средни ортодонтски проблеми..."
                    data-testid="input-patient-types"
                  />
                </div>

                {/* ── Operations ── */}
                <SectionDivider icon={Clock} label="Операции" />
                <div>
                  <label className={labelClass}>
                    Средно време за отговор на запитване
                  </label>
                  <select
                    value={form.average_response_time}
                    onChange={(e) =>
                      set('average_response_time', e.target.value)
                    }
                    className={selectClass}
                    data-testid="input-response-time"
                  >
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
                    className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
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
                </div>

                {status === 'error' && (
                  <p
                    className="text-red-400 text-sm text-center"
                    data-testid="form-error"
                  >
                    Възникна грешка. Моля, опитайте отново.
                  </p>
                )}
              </form>
            </ScrollReveal>
          </>
        )}
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   FAQ
   ════════════════════════════════════════════════════════════ */
const faqItems = [
  {
    q: 'Zubite каталог за зъболекари ли е?',
    a: 'Не. Zubite не започва от списък с клиники, а от patient decision flow. Целта е пациентът да се ориентира, преди да поиска контакт.',
  },
  {
    q: 'Гарантирате ли нови пациенти?',
    a: 'Не обещаваме гарантирани резултати. Целта е да изградим по-ясен процес и по-добър контекст около заявките.',
  },
  {
    q: 'Каква информация получава клиниката?',
    a: 'Само информация, нужна за следващата стъпка: интерес, град, готовност, статус на заявката и контактни данни при съгласие.',
  },
  {
    q: 'Колко клиники ще включите?',
    a: 'В началния етап работим с ограничен брой партньори, за да запазим качеството и обратната връзка.',
  },
  {
    q: 'Подходящо ли е за всяка клиника?',
    a: 'Не. Най-подходящо е за клиники, които реагират бързо, проследяват заявки и искат по-информирани пациенти.',
  },
]

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section
      className="py-24 md:py-32 bg-white"
      data-testid="clinics-faq"
    >
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
            Често задавани въпроси
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-12">
            Преди да кандидатствате
          </h2>
        </ScrollReveal>

        <ul className="divide-y divide-slate-200 border-t border-b border-slate-200">
          {faqItems.map((item, i) => {
            const isOpen = open === i
            return (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-start justify-between gap-6 py-5 text-left group"
                  data-testid={`faq-toggle-${i}`}
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-slate-900 group-hover:text-sky-700 transition-colors">
                    {item.q}
                  </span>
                  <span
                    className={`mt-0.5 inline-flex w-7 h-7 rounded-full border border-slate-200 items-center justify-center text-slate-500 transition-transform flex-shrink-0 ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-5 text-slate-600 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-12 flex items-center gap-3 text-sm text-slate-500">
          <MessageCircle className="w-4 h-4 text-slate-400" />
          Имате друг въпрос?{' '}
          <a
            href="mailto:partners@zubite.bg"
            className="text-sky-600 hover:text-sky-700 underline-offset-2 hover:underline"
          >
            partners@zubite.bg
          </a>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════
   HEADER + FOOTER (preserved)
   ════════════════════════════════════════════════════════════ */
function ClinicsHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link
            href="/"
            className="font-serif text-2xl font-semibold text-white transition-opacity hover:opacity-80"
            data-testid="clinics-logo"
          >
            Zubite<span className="text-sky-400">.bg</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="hidden md:inline text-sm text-slate-400 hover:text-white transition-colors"
            >
              Начало
            </Link>
            <a
              href="#application"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/25"
              data-testid="nav-apply-btn"
            >
              Кандидатствай
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

function ClinicsFooter() {
  return (
    <footer className="bg-slate-950 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="font-serif text-lg font-semibold text-white"
          >
            Zubite<span className="text-sky-400">.bg</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link
              href="/privacy"
              className="hover:text-slate-300 transition-colors"
            >
              Поверителност
            </Link>
            <Link
              href="/terms"
              className="hover:text-slate-300 transition-colors"
            >
              Условия
            </Link>
            <Link
              href="/contact"
              className="hover:text-slate-300 transition-colors"
            >
              Контакти
            </Link>
          </div>
          <p className="text-sm text-slate-600">
            &copy; {new Date().getFullYear()} Zubite.bg
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════════════ */
export function ForClinicsContent() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <ClinicsHeader />
      <HeroSection />
      <ProblemSection />
      <DifferentiationSection />
      <ContextSection />
      <HowItWorksSection />
      <PartnerValueSection />
      <NeutralDecisionLayerSection />
      <FoundingPartnerSection />
      <WhoItIsForSection />
      <DashboardPreviewSection />
      <ApplicationSection />
      <FaqSection />
      <ClinicsFooter />
    </main>
  )
}
