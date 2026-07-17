'use client'

/**
 * Hero — asymmetric split: value prop on the left, the REAL first step of
 * the quiz on the right.
 *
 * 2026-07-16 redesign: the right column used to be a hand-built div
 * "mockup" of a result card — a fake screenshot of a product surface that
 * actually exists. It now renders the genuine first question of MasterQuiz
 * (the segment picker), using the same labels/icons as `/quiz` itself.
 * Answering here deep-links into `/quiz?segment=…`, which MasterQuiz reads
 * to skip its own picker — so the visitor's first click in the hero IS
 * their first quiz answer, not a click-through to go start the quiz.
 *
 * This also lands the "for you or for your child?" fork the copy audit
 * flagged: it now happens in the hero rather than being buried.
 */

import Link from 'next/link'
import {
  ShieldCheck, ArrowRight, CheckCircle2, User, Users, Baby,
} from 'lucide-react'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { Reveal, QUIZ_URL } from './_shared'

// Mirrors MasterQuiz's own segment step (labels + icons kept in sync).
const SEGMENTS = [
  { seg: 'adult', icon: <User className="w-5 h-5" />, label: 'За мен', sub: 'възрастен' },
  { seg: 'teen',  icon: <Users className="w-5 h-5" />, label: 'За тийнейджър', sub: '12–17 години' },
  { seg: 'child', icon: <Baby className="w-5 h-5" />, label: 'За дете', sub: 'под 12 години' },
] as const

export function Hero() {
  return (
    <section className="relative pt-24 pb-20 sm:pb-28 overflow-hidden" data-testid="home-hero">
      {/* Warm-ivory base with a single soft teal glow — one ambient layer */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 20% 15%, rgba(94,234,212,0.28) 0%, rgba(94,234,212,0) 60%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
        }}
      />

      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-teal-100 text-teal-700 text-[11px] font-medium px-3 py-1 uppercase tracking-[0.16em]">
              <ShieldCheck className="w-3 h-3" />
              Първо яснота, после избор
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 font-serif font-semibold tracking-tight text-slate-900 text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] leading-[1.02]">
              Кривите зъби и неправилната захапка{' '}
              <span className="text-teal-600">рядко болят</span>. Затова хората чакат твърде дълго.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            {/* Straight-text value prop: what this is, what you do, what you
                get back. Every claim here matches what MasterQuiz actually
                returns on its result screen — stage, a summary of the signals
                the answers raised, and the orthodontist call — and that screen
                renders before the contact form, so "без регистрация" is true. */}
            <p className="mt-6 text-slate-600 text-lg sm:text-xl leading-relaxed max-w-xl">
              Zubite.bg не е клиника и не поставя диагноза. Отговаряш на
              няколко въпроса за зъбите и захапката си и{' '}
              <span className="text-slate-900 font-medium">
                веднага виждаш кратко обобщение на това, което описа, и дали
                има смисъл да го обсъдиш с ортодонт
              </span>{' '}
              — без регистрация.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-7 flex flex-wrap gap-2">
              {[
                '60 секунди',
                'Без регистрация',
                'Ориентир, не диагноза',
              ].map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/60 ring-1 ring-slate-200 text-[11px] text-slate-700 font-medium px-3 py-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 text-teal-500" />
                  {c}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* The real quiz, step 1 — not a mockup of it. */}
        <Reveal delay={120}>
          <HeroQuizStart />
        </Reveal>
      </div>
    </section>
  )
}

function HeroQuizStart() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0 lg:ml-auto" data-testid="home-hero-quiz-start">
      <div className="rounded-2xl bg-white shadow-[0_24px_48px_-20px_rgba(15,23,42,0.16)] ring-1 ring-slate-100 p-6 sm:p-8">
        {/* No "step 1 of N" — N differs per segment (10 adult / 8 teen /
            8 child), so a fixed count here would be wrong for every path. */}
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-teal-700 font-semibold">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
          Първи въпрос
        </div>
        <h2 className="mt-4 font-serif text-2xl sm:text-[1.75rem] font-semibold text-slate-900 leading-snug">
          За кого попълваш този тест?
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Въпросите се различават за възрастен, тийнейджър и дете.
        </p>

        <div className="mt-6 space-y-3">
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
              className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-white ring-1 ring-slate-200 hover:ring-teal-300 hover:-translate-y-0.5 transition-all text-left"
              data-testid={`hero-segment-${seg}`}
            >
              <span className="w-11 h-11 rounded-full bg-teal-50 ring-1 ring-teal-100 flex items-center justify-center text-teal-700 shrink-0 group-hover:bg-teal-100 transition-colors">
                {icon}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-medium text-slate-800">{label}</span>
                <span className="block text-sm text-slate-400">{sub}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 ml-auto shrink-0 transition-colors" />
            </Link>
          ))}
        </div>

        {/* The paragraph on the left already states what you get back, so
            this line carries only what it doesn't: length + the disclaimer.
            (8 questions for teen/child, 10 for adult — hence "8–10".) */}
        <p className="mt-5 text-[12px] text-slate-500 leading-relaxed" data-testid="hero-unlock-microcopy">
          8–10 въпроса. Не е диагноза — точната преценка се прави след
          преглед при специалист.
        </p>
      </div>

      <div className="mt-4 text-center lg:text-left">
        <Link
          href="#how"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
          data-testid="hero-secondary-cta"
        >
          Или виж как работи
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

export default Hero
