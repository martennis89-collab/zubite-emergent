'use client'

/**
 * Hero — asymmetric split: value prop on the left, the REAL first step of
 * the quiz on the right.
 *
 * 2026-07-17 premium rebuild: the visual language (soft teal→cyan glows,
 * rounded-3xl glass card, gradient display headline, bordered trust chips,
 * icon-chip option rows with hover accent) was adapted from a 21st.dev
 * Magic variant the team selected. Deliberately dropped from that source:
 * invented social proof (star ratings, patient counts, "HIPAA") and the
 * two-tap select→Continue flow — neither fits Zubite's anti-hype, one-tap
 * positioning. Copy, deep-links, analytics and testids are unchanged.
 *
 * The right column renders the genuine first question of MasterQuiz (the
 * segment picker). Answering deep-links into `/quiz?segment=…`, which
 * MasterQuiz reads to skip its own picker — so the visitor's first click
 * in the hero IS their first quiz answer.
 */

import Link from 'next/link'
import {
  ShieldCheck, ArrowRight, CheckCircle2, User, Users, Baby, Sparkles,
} from 'lucide-react'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { Reveal, QUIZ_URL } from './_shared'

// Mirrors MasterQuiz's own segment step (labels + icons kept in sync).
const SEGMENTS = [
  { seg: 'adult', icon: <User className="w-5 h-5" />, label: 'За мен', sub: 'възрастен' },
  { seg: 'teen',  icon: <Users className="w-5 h-5" />, label: 'За тийнейджър', sub: '12–17 години' },
  { seg: 'child', icon: <Baby className="w-5 h-5" />, label: 'За дете', sub: 'под 12 години' },
] as const

const TRUST_CHIPS = ['60 секунди', 'Без регистрация', 'Ориентир, не диагноза'] as const

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28" data-testid="home-hero">
      {/* Warm-ivory base */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: 'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)' }}
      />
      {/* Soft teal→cyan ambient glows — layered depth without motion */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-teal-400/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[24rem] w-[24rem] rounded-full bg-cyan-300/20 blur-[100px]" />
        <div className="absolute -bottom-16 left-0 h-[20rem] w-[20rem] rounded-full bg-teal-200/25 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          {/* Left — value prop */}
          <div className="flex flex-col items-start">
            <Reveal>
              <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Първо яснота, после избор
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="font-display text-[2.75rem] font-bold leading-[1.04] tracking-tight text-slate-900 sm:text-[3.5rem] lg:text-[4.25rem]">
                Кривите зъби и неправилната захапка{' '}
                <span className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
                  рядко болят
                </span>
                . Затова хората чакат твърде дълго.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              {/* Straight-text value prop: what this is, what you do, what you
                  get back. Every claim matches what MasterQuiz returns on its
                  result screen — stage, a summary of the signals the answers
                  raised, and the orthodontist call — and that screen renders
                  before the contact form, so "без регистрация" is true. */}
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                Zubite.bg не е клиника и не поставя диагноза. Отговаряш на
                няколко въпроса за зъбите и захапката си и{' '}
                <span className="font-medium text-slate-900">
                  веднага виждаш кратко обобщение на това, което описа, и дали
                  има смисъл да го обсъдиш с ортодонт
                </span>{' '}
                — без регистрация.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-8 flex flex-wrap items-center gap-2.5">
                {TRUST_CHIPS.map((c) => (
                  <div
                    key={c}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3.5 py-2 shadow-sm backdrop-blur-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    <span className="text-xs font-medium text-slate-700">{c}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right — the real quiz, step 1 (not a mockup of it) */}
          <Reveal delay={120}>
            <HeroQuizStart />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function HeroQuizStart() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto" data-testid="home-hero-quiz-start">
      {/* Soft aura behind the card */}
      <div
        aria-hidden
        className="absolute -inset-1 rounded-[1.75rem] bg-gradient-to-br from-teal-300/40 via-teal-200/10 to-transparent blur-2xl"
      />
      <div className="relative rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_8px_40px_-12px_rgba(20,184,166,0.35)] backdrop-blur-xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {/* No "step 1 of N" — N differs per segment (10 adult / 8 teen /
                8 child), so a fixed count here would be wrong for every path. */}
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
              Първи въпрос
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-snug text-slate-900">
              За кого попълваш този тест?
            </h2>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
        <p className="mb-5 text-sm text-slate-500">
          Въпросите се различават за възрастен, тийнейджър и дете.
        </p>

        <div className="flex flex-col gap-3">
          {SEGMENTS.map(({ seg, icon, label, sub }) => (
            <Link
              key={seg}
              href={`${QUIZ_URL}?segment=${seg}`}
              onClick={() => {
                try {
                  trackPatientEvent('home_quiz_start', {
                    quiz_start_source: `hero_segment_${seg}`,
                    cta_location: 'hero',
                  })
                } catch { /* noop */ }
              }}
              className="group relative flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:border-teal-400/60 hover:bg-teal-500/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              data-testid={`hero-segment-${seg}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-500 group-hover:text-white">
                {icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{sub}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-teal-600" />
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-teal-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </Link>
          ))}
        </div>

        {/* The paragraph on the left already states what you get back, so this
            line carries only what it doesn't: length + the disclaimer.
            (8 questions for teen/child, 10 for adult — hence "8–10".) */}
        <p className="mt-5 text-[12px] leading-relaxed text-slate-500" data-testid="hero-unlock-microcopy">
          8–10 въпроса. Не е диагноза — точната преценка се прави след
          преглед при специалист.
        </p>
      </div>

      <div className="mt-4 text-center lg:text-left">
        <Link
          href="#how"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-teal-700"
          data-testid="hero-secondary-cta"
        >
          Или виж как работи
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

export default Hero
