'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, MapPin, Shield, Sparkles } from 'lucide-react'
import { trackPageView } from '@/components/MetaPixel'
import { trackPatientEvent } from '@/lib/patientAnalytics'

type ResultBand = 'low' | 'moderate' | 'high'
type Segment = 'adult' | 'teen' | 'child'

const BAND_CONFIG: Record<
  ResultBand,
  { label: string; color: string; bg: string; border: string; iconBg: string; dot: string }
> = {
  low:      { label: 'Нисък риск',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  moderate: { label: 'Умерен риск', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   iconBg: 'bg-amber-100',   dot: 'bg-amber-500' },
  high:     { label: 'Висок риск',  color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     iconBg: 'bg-red-100',     dot: 'bg-red-500' },
}

const CITY_NAMES: Record<string, string> = {
  sofia: 'София', plovdiv: 'Пловдив', varna: 'Варна', haskovo: 'Хасково',
}

// Calm risk-band summary copy. Kept to a single scannable sentence — long
// explanation lives in the dedicated profile/orientir pages, not here.
const SEGMENT_SUMMARIES: Record<Segment, Record<ResultBand, { thanks: string; summary: string }>> = {
  adult: {
    low:      { thanks: 'Благодарим ти', summary: 'Нисък риск — виж клиники, при които можеш да потвърдиш с преглед, ако решиш.' },
    moderate: { thanks: 'Благодарим ти', summary: 'Умерен риск — има признаци, които заслужават внимание от специалист.' },
    high:     { thanks: 'Благодарим ти', summary: 'Висок риск — комбинация от симптоми, която е важно да се оцени от специалист.' },
  },
  teen: {
    low:      { thanks: 'Благодарим ви', summary: 'Нисък риск — профилактичен преглед остава важен за правилното развитие.' },
    moderate: { thanks: 'Благодарим ви', summary: 'Умерен риск — в тийнейджърска възраст корекцията е значително по-лесна.' },
    high:     { thanks: 'Благодарим ви', summary: 'Висок риск — корекцията е по-ефективна в тази възраст. Виж приоритетни клиники.' },
  },
  child: {
    low:      { thanks: 'Благодарим ви', summary: 'Нисък риск — първи ортодонтски преглед се препоръчва около 7-годишна възраст.' },
    moderate: { thanks: 'Благодарим ви', summary: 'Умерен риск — ранната намеса може да промени хода на развитието.' },
    high:     { thanks: 'Благодарим ви', summary: 'Висок риск — важно е да се действа навреме. Виж клиники с опит в ранна детска интервенция.' },
  },
}

// Unified "Какво следва?" steps — kept short.
const NEXT_STEPS = [
  'Виж до 3 подходящи клиники.',
  'Отвори профил и прецени коя е подходяща.',
  'Избери за обаждане или поискай помощ от Zubite.',
]

function SuccessContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  const band = (searchParams.get('stage') || 'low') as ResultBand
  const city = searchParams.get('city') || ''
  const name = searchParams.get('name') || ''
  const segment = (searchParams.get('segment') || 'adult') as Segment
  const leadId = searchParams.get('leadId') || ''

  const bandCfg = BAND_CONFIG[band] || BAND_CONFIG.low
  const segMap = SEGMENT_SUMMARIES[segment] || SEGMENT_SUMMARIES.adult
  const summaryCfg = segMap[band] || segMap.low
  const isParent = segment === 'teen' || segment === 'child'

  useEffect(() => { setMounted(true); trackPageView() }, [])

  // Fire `quiz_success_viewed` exactly once per page mount (StrictMode-safe
  // via useRef latch — React would otherwise invoke this effect twice in dev).
  const successViewedRef = useRef(false)
  useEffect(() => {
    if (successViewedRef.current) return
    successViewedRef.current = true
    trackPatientEvent('quiz_success_viewed', {
      lead_id: leadId || null,
      has_lead_id: !!leadId,
      band,
      segment,
      city,
    })
  }, [leadId, band, segment, city])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FCFAF8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    )
  }

  return (
    <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Check icon + headline */}
      <div className="text-center mb-8" data-testid="success-header">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${bandCfg.iconBg} mb-5 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.18)]`}>
          <CheckCircle className={`w-8 h-8 ${bandCfg.color}`} />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
          {summaryCfg.thanks}{name ? `, ${name}` : ''}!
        </h1>
        <p className="text-slate-500 text-sm">Данните са получени успешно</p>
      </div>

      {/* Result band + summary */}
      <div
        className={`relative rounded-2xl ring-1 ${bandCfg.border.replace('border-', 'ring-')} ${bandCfg.bg} backdrop-blur-md p-5 sm:p-6 mb-6 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.15)]`}
        data-testid="success-result-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className={`w-2 h-2 rounded-full ${bandCfg.dot}`} />
          <span className={`text-sm font-semibold ${bandCfg.color}`}>{bandCfg.label}</span>
          {city && (
            <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {CITY_NAMES[city] || city}
            </span>
          )}
        </div>
        <p className="text-slate-700 text-[15px] leading-relaxed">{summaryCfg.summary}</p>
      </div>

      {/* What happens next — patient-driven choice, not auto-call */}
      <div
        className="bg-white/75 backdrop-blur-2xl rounded-2xl ring-1 ring-white/80 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.85)] p-5 sm:p-6 mb-6"
        data-testid="success-next-steps"
      >
        <h2 className="font-serif text-lg font-semibold text-slate-900 mb-5">Какво следва?</h2>
        <div className="space-y-4">
          {NEXT_STEPS.map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold mt-0.5 shadow-[0_6px_16px_-6px_rgba(13,148,136,0.5)]"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
                aria-hidden="true"
              >
                {i + 1}
              </div>
              <p className="text-slate-700 text-[15px] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Primary CTA — into the matching flow */}
      <div className="space-y-3" data-testid="success-cta-block">
        {leadId ? (
          <Link
            href={`/results/${leadId}/clinics`}
            onClick={() => {
              trackPatientEvent('recommended_clinics_cta_clicked', {
                lead_id: leadId,
                source: 'quiz_success',
              })
            }}
            className="group relative w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-white text-base font-medium transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            data-testid="success-primary-cta"
          >
            <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
            <span className="relative inline-flex items-center gap-2">
              Виж препоръчаните клиники
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ) : (
          // Defensive fallback — should not happen because the quiz now
          // captures the created lead id. Never invent a route; just
          // ask the patient to refresh / open from the link they will
          // receive. We do NOT auto-promise a callback.
          <div
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 leading-relaxed"
            data-testid="success-no-leadid-fallback"
          >
            Не успяхме да заредим директната връзка към твоите препоръчани
            клиники. Моля, презареди страницата или се върни към квиза.
          </div>
        )}
        <p
          className="flex items-start justify-center gap-1.5 text-xs text-slate-500 leading-relaxed text-center"
          data-testid="success-helper-text"
        >
          <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-violet-500" />
          Не си сигурен/на? На следващата страница можеш да избереш „Помогнете
          ми да избера".
        </p>

        {/* Care Pass — compact chip strip matching the homepage premium panel.
            One short headline; details (oral hygiene · post-consultation ·
            not treatment discount) communicated through chips, not paragraphs. */}
        <div
          className="relative mt-6 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.35)]"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 100% 0%, rgba(20,184,166,0.30) 0%, transparent 60%),' +
              'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
          }}
          data-testid="success-care-pass-note"
        >
          <div aria-hidden className="absolute inset-x-4 top-1 h-1/3 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-12 flex-shrink-0 rounded-lg bg-white/10 ring-1 ring-white/20 overflow-hidden">
                <Image
                  src="/care-pass.png"
                  alt="Zubite Care Pass"
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-teal-300/80 font-semibold">Zubite Care Pass</p>
                <p className="mt-0.5 font-serif text-sm sm:text-base text-white leading-snug">
                  След консултацията клиниката ти дава Care Pass.
                </p>
              </div>
            </div>
            <ul className="mt-3.5 flex flex-wrap gap-1.5">
              {[
                'Отстъпки за орална хигиена',
                'От клиниката',
                'След консултация',
                'Не е отстъпка от лечение',
              ].map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full bg-white/8 ring-1 ring-white/15 text-[10.5px] text-slate-200 font-medium px-2.5 py-1"
                >
                  <span className="w-1 h-1 rounded-full bg-teal-300" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Trust + medical disclaimer — footnote style */}
      <div className="mt-10 pt-5 border-t border-white/40 text-center space-y-2.5" data-testid="success-trust">
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Shield className="w-3 h-3" />
          {isParent ? 'Данните ви са защитени.' : 'Данните ти са защитени.'} Споделяме само със съгласие.
        </p>
        <p className="text-[10.5px] text-slate-400 leading-snug max-w-md mx-auto">
          Zubite не поставя диагноза и не заменя преглед при лекар.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-xs mt-1"
          data-testid="success-home-link"
        >
          Обратно към началото
        </Link>
      </div>
    </div>
  )
}

export default function QuizSuccessPage() {
  return (
    <main className="min-h-screen bg-[#FCFAF8] relative overflow-hidden">
      {/* Soft warm gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.25) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 80% 60%, rgba(165,243,252,0.30) 0%, transparent 60%)',
        }}
      />
      <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/40 blur-3xl pointer-events-none" />

      <header className="relative py-5 px-4 border-b border-white/40 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-slate-900">
            Zubite<span className="text-teal-600">.bg</span>
          </Link>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
      <footer className="relative py-6 border-t border-white/40">
        <div className="max-w-2xl mx-auto px-4 text-center text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} Zubite.bg — Платформа за ориентация в денталното здраве</p>
        </div>
      </footer>
    </main>
  )
}
