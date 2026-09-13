'use client'

/**
 * Care Pass teaser — dark navy-teal panel with the glossy Care Pass card
 * mockup. Extracted from HomeContent.tsx in Feb 2026. Behaviour preserved.
 */

import Link from 'next/link'
import Image from 'next/image'
import {
  Gift, Sparkles, Stethoscope, ArrowRight, CheckCircle2, ChevronDown,
} from 'lucide-react'
import { Reveal, px, QUIZ_URL, ASSET_E_CARE_PASS_CARD } from './_shared'

export function CarePassTeaser() {
  return (
    <section id="care-pass" className="relative py-20 sm:py-28 overflow-hidden scroll-mt-24" data-testid="home-care-pass">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(94,234,212,0.18) 0%, transparent 70%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
        }}
      />
      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
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
                <div className="mt-6 flex flex-wrap gap-2">
                  {([
                    { l: 'Отстъпки за продукти за орална хигиена', d: 'Care Pass съдържа отстъпки за партньорски продукти за ежедневна грижа за зъбите.' },
                    { l: 'Получаваш го от клиниката',               d: 'Pass-ът се предоставя от самата клиника, не от Zubite.bg.' },
                    { l: 'Включен за всеки наш пациент',            d: 'Care Pass е стандартна част от партньорската ни мрежа — всеки Zubite пациент го получава при посещение в партньорска клиника.' },
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
              <div className="relative animate-[floatSlow_8s_ease-in-out_infinite]">
                <div aria-hidden className="absolute inset-0 translate-y-3 translate-x-3 rotate-[3deg] rounded-[1.5rem] bg-white/5 ring-1 ring-white/10 backdrop-blur-md" />
                <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-teal-400/15 blur-2xl animate-[breatheGlow_9s_ease-in-out_infinite]" />
                <div className="relative">
                  <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[1.5rem] pointer-events-none">
                    <div className="absolute inset-y-0 -left-1/2 w-1/3 animate-[shimmerSweep_8s_ease-in-out_infinite]"
                      style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)' }}
                    />
                  </div>
                  <Image
                    src={ASSET_E_CARE_PASS_CARD}
                    alt="Zubite Care Pass — карта с отстъпки за продукти за орална хигиена"
                    width={1280}
                    height={960}
                    sizes="(max-width: 1024px) 90vw, 520px"
                    className="relative w-full h-auto rounded-[1.5rem] drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
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

export default CarePassTeaser
