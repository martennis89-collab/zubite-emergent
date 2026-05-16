'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, MapPin, Shield, Sparkles } from 'lucide-react'
import { trackPageView } from '@/components/MetaPixel'

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

// Calm risk-band summary copy. The brief explicitly forbids "Zubite ще се
// свърже с теб / ще ти запази час" — the patient must actively choose
// (request a call from one clinic OR ask Zubite for help). So we keep only
// the band/segment-aware summary line and remove all proactive-call claims.
const SEGMENT_SUMMARIES: Record<Segment, Record<ResultBand, { thanks: string; summary: string }>> = {
  adult: {
    low:      { thanks: 'Благодарим ти', summary: 'Резултатът показва нисък риск. Подбрахме клиники, при които можеш да потвърдиш състоянието си с професионален преглед, ако решиш.' },
    moderate: { thanks: 'Благодарим ти', summary: 'Резултатът показва умерен риск — има признаци, които заслужават внимание. Виж подбрани клиники, специализирани в твоя тип проблем.' },
    high:     { thanks: 'Благодарим ти', summary: 'Резултатът показва висок риск. Отговорите ти показват комбинация от симптоми, които е важно да бъдат оценени от специалист. Виж приоритетно подбрани клиники.' },
  },
  teen: {
    low:      { thanks: 'Благодарим ви', summary: 'Резултатът показва нисък риск за тийнейджъра. Профилактичен преглед в тази възраст остава важен за правилното развитие.' },
    moderate: { thanks: 'Благодарим ви', summary: 'Резултатът показва умерен риск. В тийнейджърска възраст тези проблеми могат да се коригират значително по-лесно — виж клиники, специализирани в ранна корекция.' },
    high:     { thanks: 'Благодарим ви', summary: 'Резултатът показва висок риск. Не се притеснявайте — в тази възраст корекцията е значително по-ефективна. Виж приоритетно подбрани клиники.' },
  },
  child: {
    low:      { thanks: 'Благодарим ви', summary: 'Резултатът показва нисък риск за детето. Първият преглед при ортодонт се препоръчва около 7-годишна възраст — дори без видим проблем.' },
    moderate: { thanks: 'Благодарим ви', summary: 'Резултатът показва умерен риск. При децата ранната намеса може да промени хода на развитие и да предотврати по-сложно лечение по-късно.' },
    high:     { thanks: 'Благодарим ви', summary: 'Резултатът показва висок риск. Комбинацията от сигнали показва, че е важно да се действа навреме. Виж приоритетно подбрани клиники с опит в ранна детска интервенция.' },
  },
}

// Unified "Какво следва?" steps — same across bands/segments because the
// next-step product flow is the same for everyone: see up to 3 clinics →
// open profiles → choose one for a call or ask Zubite for help.
const NEXT_STEPS = [
  'Виж до 3 подходящи клиники според твоя град и типа заявка.',
  'Отвори профила на всяка клиника и прецени коя е най-подходяща за следващата стъпка.',
  'Избери една клиника за обаждане или поискай помощ от Zubite, ако не си сигурен/на.',
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Check icon + headline */}
      <div className="text-center mb-8" data-testid="success-header">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${bandCfg.iconBg} mb-5`}>
          <CheckCircle className={`w-8 h-8 ${bandCfg.color}`} />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
          {summaryCfg.thanks}{name ? `, ${name}` : ''}!
        </h1>
        <p className="text-slate-500 text-sm">Данните са получени успешно</p>
      </div>

      {/* Result band + summary */}
      <div
        className={`rounded-2xl border ${bandCfg.border} ${bandCfg.bg} p-5 sm:p-6 mb-6`}
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
        className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 mb-6"
        data-testid="success-next-steps"
      >
        <h2 className="font-serif text-lg font-semibold text-slate-900 mb-5">Какво следва?</h2>
        <div className="space-y-4">
          {NEXT_STEPS.map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold mt-0.5"
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
            className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-base font-medium transition-colors shadow-lg shadow-sky-500/20"
            data-testid="success-primary-cta"
          >
            Виж препоръчаните клиники
            <ArrowRight className="w-4 h-4" />
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
      </div>

      {/* Trust + medical disclaimer */}
      <div className="text-center space-y-3 mt-10" data-testid="success-trust">
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5" />
          {isParent
            ? 'Данните ви са защитени. Нищо няма да бъде споделено без вашето съгласие.'
            : 'Данните ти са защитени. Нищо няма да бъде споделено без твоето съгласие.'}
        </p>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Zubite не поставя диагноза и не заменя преглед при лекар.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm"
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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="py-5 px-4 border-b border-slate-100">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
            Zubite<span className="text-sky-500">.bg</span>
          </Link>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
      <footer className="py-6 border-t border-slate-100">
        <div className="max-w-2xl mx-auto px-4 text-center text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} Zubite.bg — Платформа за ориентация в ортодонтското лечение</p>
        </div>
      </footer>
    </main>
  )
}
