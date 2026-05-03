'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, Clock, MapPin, Shield, AlertTriangle, Heart } from 'lucide-react'
import { trackPageView } from '@/components/MetaPixel'

type ResultBand = 'low' | 'moderate' | 'high'
type Segment = 'adult' | 'teen' | 'child'

const BAND_CONFIG: Record<ResultBand, { label: string; color: string; bg: string; border: string; iconBg: string; dot: string }> = {
  low:      { label: 'Нисък риск', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  moderate: { label: 'Умерен риск', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', dot: 'bg-amber-500' },
  high:     { label: 'Висок риск', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', dot: 'bg-red-500' },
}

const CITY_NAMES: Record<string, string> = { sofia: 'София', plovdiv: 'Пловдив', varna: 'Варна', haskovo: 'Хасково' }

const SEGMENT_MESSAGES: Record<Segment, Record<ResultBand, { thanks: string; summary: string; steps: string[] }>> = {
  adult: {
    low: {
      thanks: 'Благодарим ти',
      summary: 'Резултатът показва нисък риск. Въпреки това, ще подберем клиники, които могат да потвърдят състоянието ти с професионален преглед.',
      steps: [
        'Ще прегледаме резултата ти и ще подберем подходящи клиники в твоя град.',
        'Ще се свържем с теб по телефон в рамките на 24–48 часа с препоръки.',
        'Ще ти помогнем да запазиш безплатна консултация при специалист.',
      ],
    },
    moderate: {
      thanks: 'Благодарим ти',
      summary: 'Резултатът показва умерен риск — има признаци, които заслужават внимание. Ще подберем клиники, специализирани в твоя тип проблем.',
      steps: [
        'Ще анализираме отговорите ти и ще подберем клиники с опит в подобни случаи.',
        'Ще се свържем с теб в рамките на 24 часа с конкретни препоръки.',
        'Ще ти помогнем да запазиш час за консултация — без ангажимент.',
      ],
    },
    high: {
      thanks: 'Благодарим ти',
      summary: 'Резултатът показва висок риск. Отговорите ти показват комбинация от симптоми, които е важно да бъдат оценени от специалист. Ще те свържем с клиника приоритетно.',
      steps: [
        'Ще подберем специализирани клиники за твоя случай — приоритетно.',
        'Ще се свържем с теб възможно най-скоро (в рамките на 24 часа).',
        'Ще координираме консултация при ортодонт — без забавяне.',
      ],
    },
  },
  teen: {
    low: {
      thanks: 'Благодарим ви',
      summary: 'Резултатът показва нисък риск за тийнейджъра. Въпреки това, профилактичен преглед в тази възраст е изключително важен за правилното развитие.',
      steps: [
        'Ще подберем клиники с опит в ортодонтия за тийнейджъри.',
        'Ще се свържем с вас по телефон в рамките на 24–48 часа.',
        'Ще ви помогнем да запазите профилактичен преглед.',
      ],
    },
    moderate: {
      thanks: 'Благодарим ви',
      summary: 'Резултатът показва умерен риск. В тийнейджърска възраст тези проблеми могат да се коригират значително по-лесно. Ще подберем клиники, специализирани в ранна корекция.',
      steps: [
        'Ще анализираме отговорите и ще подберем клиники с опит при тийнейджъри.',
        'Ще се свържем с вас в рамките на 24 часа с конкретни препоръки.',
        'Ще координираме консултация — сега е идеалният момент за корекция.',
      ],
    },
    high: {
      thanks: 'Благодарим ви',
      summary: 'Резултатът показва висок риск. Не се притеснявайте — в тази възраст корекцията е значително по-ефективна. Ще ви свържем приоритетно с подходяща клиника.',
      steps: [
        'Ще подберем специализирани клиники за тийнейджъри — приоритетно.',
        'Ще се свържем с вас възможно най-скоро.',
        'Ще координираме консултация — не изпускайте „златния прозорец" за корекция.',
      ],
    },
  },
  child: {
    low: {
      thanks: 'Благодарим ви',
      summary: 'Резултатът показва нисък риск за детето. Въпреки това, първият преглед при ортодонт се препоръчва на 7-годишна възраст — дори без видим проблем.',
      steps: [
        'Ще подберем клиники с опит в детска ортодонтия.',
        'Ще се свържем с вас в рамките на 24–48 часа.',
        'Ще ви помогнем да запазите профилактичен детски преглед.',
      ],
    },
    moderate: {
      thanks: 'Благодарим ви',
      summary: 'Резултатът показва умерен риск. При децата ранната намеса може да промени хода на развитие и да предотврати по-сложно лечение по-късно.',
      steps: [
        'Ще подберем клиники, специализирани в детска и превантивна ортодонтия.',
        'Ще се свържем с вас в рамките на 24 часа.',
        'Ще координираме преглед — малка интервенция сега може да спести голямо лечение.',
      ],
    },
    high: {
      thanks: 'Благодарим ви',
      summary: 'Резултатът показва висок риск. Комбинацията от сигнали показва, че е важно да се действа навреме. При децата ранната интервенция е най-ефективна.',
      steps: [
        'Ще подберем клиники с опит в ранна детска интервенция — приоритетно.',
        'Ще се свържем с вас възможно най-скоро.',
        'Ще координираме преглед при детски ортодонт — не отлагайте.',
      ],
    },
  },
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  const band = (searchParams.get('stage') || 'low') as ResultBand
  const city = searchParams.get('city') || ''
  const name = searchParams.get('name') || ''
  const segment = (searchParams.get('segment') || 'adult') as Segment

  const bandCfg = BAND_CONFIG[band] || BAND_CONFIG.low
  const msg = (SEGMENT_MESSAGES[segment] || SEGMENT_MESSAGES.adult)[band] || SEGMENT_MESSAGES.adult.low
  const isParent = segment === 'teen' || segment === 'child'

  useEffect(() => { setMounted(true); trackPageView() }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Check icon + headline */}
      <div className="text-center mb-8" data-testid="success-header">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${bandCfg.iconBg} mb-5`}>
          <CheckCircle className={`w-8 h-8 ${bandCfg.color}`} />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
          {msg.thanks}{name ? `, ${name}` : ''}!
        </h1>
        <p className="text-slate-500 text-sm">Данните са получени успешно</p>
      </div>

      {/* Result band + summary */}
      <div className={`rounded-2xl border ${bandCfg.border} ${bandCfg.bg} p-5 sm:p-6 mb-6`} data-testid="success-result-card">
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
        <p className="text-slate-700 text-[15px] leading-relaxed">{msg.summary}</p>
      </div>

      {/* What happens next */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 mb-6" data-testid="success-next-steps">
        <h2 className="font-serif text-lg font-semibold text-slate-900 mb-5">Какво следва?</h2>
        <div className="space-y-4">
          {msg.steps.map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                {i + 1}
              </div>
              <p className="text-slate-700 text-[15px] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-8" data-testid="success-timeline">
        <Clock className="w-4 h-4" />
        <span>{band === 'high' ? 'Очаквайте обаждане в рамките на 24 часа' : 'Очаквайте обаждане в рамките на 24–48 часа'}</span>
      </div>

      {/* Trust + CTA */}
      <div className="text-center space-y-4">
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5" />
          {isParent ? 'Данните ви са защитени. Нищо няма да бъде споделено без вашето съгласие.' : 'Данните ти са защитени. Нищо няма да бъде споделено без твоето съгласие.'}
        </p>
        <Link href="/" className="inline-flex items-center gap-2 text-sky-600 font-medium hover:text-sky-700 transition-colors text-sm" data-testid="success-home-link">
          Обратно към началото <ArrowRight className="w-4 h-4" />
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
      <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" /></div>}>
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
