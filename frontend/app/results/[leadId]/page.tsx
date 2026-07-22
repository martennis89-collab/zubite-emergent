'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle, ArrowRight, CalendarDays, Compass, Home,
  LayoutList, Loader2, ShieldCheck, X,
} from 'lucide-react'
import { ResultsHeader } from '@/components/ResultsHeader'
import { Footer } from '@/components/Footer'
import { ResultUnlockGate } from '@/components/patient/ResultUnlockGate'
import { ClinicRecommendationChoice } from '@/components/patient/ClinicRecommendationChoice'
import { SaveResultBanner } from '@/components/patient/SaveResultBanner'
import { getLead } from '@/lib/api'
import { setStoredLeadContact } from '@/lib/leadContact'

interface Lead {
  id: string
  // Optional: the quiz funnel now creates leads before city is ever
  // asked — city arrives later via clinic-recommendation-preference.
  city_slug?: string | null
  treatment_type: string
  band: string
  score_total: number
  name?: string
  answers?: Record<string, unknown>
  full_result_unlocked?: boolean
  is_claimed_by_me?: boolean
  // Step 3 of the funnel: null = not answered yet, true = opted in
  // (city already set alongside it), false = explicitly declined.
  wants_clinic_recommendations?: boolean | null
}

type Segment = 'adult' | 'teen' | 'child'
type Band = 'GREEN' | 'YELLOW' | 'RED'

const EXPLANATION_BY_BAND: Record<Band, string> = {
  GREEN: 'Отговорите ти показват малко сигнали. Това не изключва тема за обсъждане, но е добра отправна точка за спокоен първи разговор със специалист.',
  YELLOW: 'Отговорите ти насочват към няколко сигнала, които заслужават професионален поглед. Не е диагноза — но е достатъчно, за да има смисъл консултация.',
  RED: 'Комбинацията от отговорите показва няколко сигнала наведнъж. Това не е диагноза, но е ясен ориентир да обсъдиш ситуацията със специалист скоро.',
}

const FINDING_BY_BAND: Record<Band, string> = {
  GREEN: 'Леки сигнали, които си струва да наблюдаваш',
  YELLOW: 'Възможно леко до умерено струпване на зъбите',
  RED: 'Няколко сигнала, които заслужават професионален поглед',
}

const FLAG_FINDINGS: Record<string, string> = {
  crowding: 'Възможно е да има смисъл да обсъдиш варианти за подреждане — алайнери или брекети.',
  bite_issue: 'Отговорите ти насочват към тема за захапка — заслужава професионален поглед.',
  airway: 'Има сигнали за дишане през устата или сън — добре е да се обсъдят със специалист.',
  tension: 'Сигнали за напрежение в челюстта или мускулите заслужават оценка.',
  wear: 'Признаци за износване на зъбите изискват преглед за точна оценка.',
  development: 'Сигналите за развитие на захапката правят ранната оценка полезна.',
}

function deriveSegment(answers?: Record<string, unknown>): Segment {
  const value = answers?.segment
  return value === 'teen' || value === 'child' ? value : 'adult'
}

function deriveFlags(answers?: Record<string, unknown>): string[] {
  const value = answers?.quiz_flags
  if (!Array.isArray(value)) return []
  return value.filter((flag): flag is string => typeof flag === 'string' && flag in FLAG_FINDINGS)
}

export default function ResultsPage() {
  const params = useParams()
  const leadId = params.leadId as string
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getLead(leadId)
      .then(setLead)
      .catch(() => setError('Възникна грешка при зареждане на резултатите.'))
      .finally(() => setLoading(false))
  }, [leadId])

  if (loading) {
    return <main className="taste-results-state grid min-h-screen place-items-center bg-[#FBF9F7]"><Loader2 className="h-8 w-8 animate-spin text-[#006A61]" /></main>
  }

  if (error || !lead) {
    return (
      <main className="taste-results-state min-h-screen bg-[#FBF9F7]">
        <ResultsHeader />
        <section className="mx-auto max-w-2xl px-5 py-24 text-center">
          <p className="text-red-700">{error || 'Резултатите не бяха намерени.'}</p>
          <Link href="/" className="mt-5 inline-flex items-center gap-2 font-semibold text-[#006A61]"><Home className="h-4 w-4" />Към началото</Link>
        </section>
      </main>
    )
  }

  const segment = deriveSegment(lead.answers)
  const flags = deriveFlags(lead.answers)
  const band = (['GREEN', 'YELLOW', 'RED'].includes(lead.band) ? lead.band : 'GREEN') as Band
  const isUnlocked = lead.full_result_unlocked === true
  const directions = segment === 'child'
    ? [
        { title: 'Ранно проследяване', copy: 'Ортодонтът може да оцени растежа и да предложи период за контрол.', icon: Compass },
        { title: 'Ортодонтска оценка', copy: 'Прегледът показва дали е нужно действие или спокойно наблюдение.', icon: ShieldCheck },
      ]
    : [
        { title: 'Прозрачни алайнери', copy: 'Дискретен вариант, който изисква последователно носене и точен план.', icon: LayoutList },
        { title: 'Естетични брекети', copy: 'Вариант при нужда от по-постоянен контрол на движението.', icon: ShieldCheck },
      ]

  return (
    <main className="taste-results-page min-h-screen bg-[#FBF9F7] text-[#1B1C1B]" data-testid="results-page">
      <ResultsHeader />

      <section className="mx-auto max-w-[1280px] px-5 pb-20 pt-12 sm:px-6 sm:pt-16">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#B3EEE6] bg-[#F0FDFA] px-4 py-2 text-sm font-medium text-[#006A61]">
            <ShieldCheck className="h-4 w-4" /> Ориентир, не диагноза
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-black sm:text-5xl">Твоят ориентировъчен{' '}<br />резултат</h1>
          <p className="mt-5 text-base leading-7 text-[#45464D] sm:text-lg">Базирано на твоите отговори, подготвихме кратко обобщение на вероятния случай и възможните посоки за обсъждане със специалист.</p>
        </header>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[1.35fr_0.9fr] lg:gap-12">
          <div>
            <article className="rounded-xl border border-[#E2E8F0] bg-white p-6 sm:p-8" data-testid={isUnlocked ? 'full-partial-result' : 'partial-result-teaser'}>
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#FFDAD6] text-[#93000A]"><AlertTriangle className="h-6 w-6" /></span>
                <div>
                  <h2 className="font-display text-2xl font-semibold leading-tight text-black" data-testid={isUnlocked ? 'result-headline' : 'partial-headline'}>{FINDING_BY_BAND[band]}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#45464D]" data-testid={isUnlocked ? 'result-explanation' : 'partial-explanation'}>{EXPLANATION_BY_BAND[band]}</p>
                </div>
              </div>
              <div className="mt-7 grid gap-5 border-t border-[#E2E8F0] pt-6 sm:grid-cols-2">
                <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Ориентировъчен срок</p><p className="mt-1 font-display text-lg font-semibold text-black">{band === 'GREEN' ? 'Наблюдение' : band === 'YELLOW' ? 'Консултация скоро' : 'Не отлагай оценката'}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Следваща стъпка</p><p className="mt-1 font-display text-lg font-semibold text-black">Професионален преглед</p></div>
              </div>
            </article>

            {flags.length > 0 && (
              <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F5F3F1] p-5" data-testid="result-findings">
                {flags.slice(0, 2).map((flag, index) => <p key={flag} className="flex gap-3 py-1 text-sm leading-6 text-[#45464D]" data-testid={`result-finding-${index}`}><Compass className="mt-1 h-4 w-4 shrink-0 text-[#006A61]" />{FLAG_FINDINGS[flag]}</p>)}
              </div>
            )}

            <h2 className="mt-10 font-display text-2xl font-semibold text-black">Посоки за обсъждане:</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {directions.map(({ title, copy, icon: Icon }) => (
                <article key={title} className="relative min-h-64 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6">
                  <Icon className="absolute right-5 top-5 h-12 w-12 text-[#E4E2E0]" />
                  <h3 className="max-w-[75%] font-display text-3xl font-semibold leading-tight text-black">{title}</h3>
                  <p className="mt-5 text-sm leading-6 text-[#45464D]">{copy}</p>
                  <Link href="/orthodontics" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#006A61]">Научи повече <ArrowRight className="h-4 w-4" /></Link>
                </article>
              ))}
            </div>

          </div>

          <aside className="rounded-xl bg-white p-6 shadow-[0_20px_50px_-30px_rgba(0,32,29,0.30)] sm:p-8" data-testid="next-step-card">
            <h2 className="font-display text-2xl font-semibold text-black">Следваща стъпка</h2>
            <p className="mt-4 text-sm leading-6 text-[#45464D]">Запази час за консултация в партньорска клиника, за да потвърдите случая и да обсъдите конкретен план.</p>

            {!isUnlocked && (
              <div className="mt-6" data-testid="partial-locked-teaser">
                <ResultUnlockGate
                  leadId={lead.id}
                  defaultName={lead.name}
                  onUnlocked={(contact) => {
                    setStoredLeadContact(lead.id, contact)
                    // No reload — just flip the local flag so the aside
                    // re-renders straight into step 3 (recommendation
                    // choice) in the same paint. The backend already
                    // committed both unlock flags before this resolved.
                    setLead((prev) => (prev ? { ...prev, full_result_unlocked: true } : prev))
                  }}
                />
              </div>
            )}

            {isUnlocked && lead.wants_clinic_recommendations == null && (
              <div className="mt-6" data-testid="clinic-recommendation-choice-wrap">
                <ClinicRecommendationChoice
                  leadId={lead.id}
                  onDeclined={() =>
                    setLead((prev) => (prev ? { ...prev, wants_clinic_recommendations: false } : prev))
                  }
                />
              </div>
            )}

            {isUnlocked && lead.wants_clinic_recommendations === false && (
              <div
                className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F5F3F1] p-6 text-center"
                data-testid="clinic-recommendation-declined"
              >
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-[#45464D]">
                  <X className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-black">Ориентирът ти остава достъпен.</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#45464D]">Можеш да провериш отново по всяко време.</p>
              </div>
            )}

            {isUnlocked && lead.wants_clinic_recommendations === true && (
              <Link href={`/results/${leadId}/clinics`} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-5 py-4 text-sm font-semibold text-white" data-testid="see-clinics-cta">
                Виж подходящи клиники <CalendarDays className="h-4 w-4" />
              </Link>
            )}

            <p className="mt-4 text-center text-xs text-[#64748B]">Не изисква плащане сега. Отмяна е възможна по всяко време.</p>

            <SaveResultBanner
              leadId={lead.id}
              isClaimedByMe={!!lead.is_claimed_by_me}
              onSaved={() => window.location.reload()}
            />

            <p className="mt-6 border-t border-[#E2E8F0] pt-5 text-xs leading-5 text-[#64748B]">
              След реално посещение в партньорска клиника получаваш Care Pass за предложения за продукти за орална хигиена.{' '}
              <Link href="/care-pass" className="font-semibold text-[#006A61] hover:underline">Как работи</Link>
            </p>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  )
}
