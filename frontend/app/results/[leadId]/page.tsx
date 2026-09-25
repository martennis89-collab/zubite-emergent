'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ResultsHeader } from '@/components/ResultsHeader'
import { Footer } from '@/components/Footer'
import { ResultUnlockGate } from '@/components/patient/ResultUnlockGate'
import { AssistedChoiceModal } from '@/components/patient/AssistedChoiceModal'
import { getLead } from '@/lib/api'
import { getStoredLeadContact } from '@/lib/leadContact'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import {
  Loader2, Home, ShieldCheck, ArrowRight, Gift, Compass, CheckCircle2,
} from 'lucide-react'

// Safe, non-diagnostic orientation note — band-agnostic, shown alongside
// (not instead of) the existing per-band `explanation` copy below.
const SAFE_ORIENTATION_NOTE =
  'Според отговорите ти има смисъл да се обсъди ортодонтска консултация. ' +
  'Възможно е да се сравнят алайнери, брекети или комбиниран подход, но точната ' +
  'преценка зависи от преглед, снимки и лекарска оценка.'

const GLOBAL_DISCLAIMER =
  'Zubite.bg не поставя диагноза и не замества преглед, образна диагностика или ' +
  'лекарска преценка. Платформата помага с ориентация, подготовка за консултация ' +
  'и свързване с подходящи клиники според избраните критерии.'

interface Lead {
  id: string
  city_slug: string | null
  treatment_type: string
  band: string
  score_total: number
  name?: string
  answers?: Record<string, unknown>
  contact_details_submitted?: boolean
  full_result_unlocked?: boolean
  care_pass_eligible?: boolean
  care_pass_unlocked?: boolean
  consultation_booked_through_zubite?: boolean
  clinic_confirmed_consultation?: boolean
}

type Segment = 'adult' | 'teen' | 'child'
type Band = 'GREEN' | 'YELLOW' | 'RED'

// ─── Copy maps ─────────────────────────────────────────────────
// Headline is segment-aware. The orientation phrasing is intentionally
// non-diagnostic: we only suggest direction, never label a condition.
const HEADLINE_BY_SEGMENT: Record<Segment, string> = {
  adult: 'Твоят ориентир: консултация с ортодонт',
  teen: 'Твоят ориентир: преглед при ортодонт',
  child: 'Твоят ориентир: ранна оценка при ортодонт',
}

// Per-band general explanation. Avoids treatment promises.
const EXPLANATION_BY_BAND: Record<Band, string> = {
  GREEN:
    'Отговорите ти показват малко сигнали. Това не изключва напълно тема за обсъждане, но е добра отправна точка за спокоен първи разговор със специалист.',
  YELLOW:
    'Отговорите ти насочват към няколко сигнала, които заслужават професионален поглед. Не е диагноза — но е достатъчно, за да има смисъл консултация.',
  RED:
    'Комбинацията от отговорите показва няколко сигнала наведнъж. Това не е диагноза, но е ясен ориентир да обсъдиш ситуацията със специалист скоро.',
}

const BAND_LABEL: Record<Band, string> = {
  GREEN: 'Малко сигнали',
  YELLOW: 'Няколко сигнала',
  RED: 'Повече сигнали',
}

// Flag-aware bullets — only added when the corresponding quiz flag fired.
// Wording follows the rule: насочват / може да има смисъл — не „имаш…".
const FLAG_FINDINGS: Record<string, string> = {
  crowding:
    'Възможно е да има смисъл да обсъдиш варианти за подреждане — алайнери или брекети.',
  bite_issue:
    'Отговорите ти насочват към тема за захапка — заслужава професионален поглед.',
  airway:
    'Има сигнали за дишане през устата или сън — добре е да се обсъди със специалист.',
  tension:
    'Сигнали за напрежение в челюстта или мускулите — заслужават оценка.',
  wear:
    'Признаци за износване на зъбите — точна оценка изисква преглед.',
  development:
    'Сигнали за развитие на захапката — ранната оценка е полезна.',
}

// Generic bullet anchors per segment — always shown as the first finding
// so the section never feels empty.
const GENERIC_BY_SEGMENT: Record<Segment, string> = {
  adult:
    'Отговорите ти насочват към консултация с ортодонт. Точна оценка изисква преглед и, при нужда, снимки.',
  teen:
    'В тийнейджърска възраст професионалният преглед е особено полезен — растежът все още работи в полза на лечението.',
  child:
    'При деца ранната оценка помага да се проследи развитието. Целта не е лечение веднага, а навременно наблюдение.',
}

// Intake answers (non-scoring quiz questions) → short profile chips, so
// the patient sees their own preferences reflected back before the gate.
const PROFILE_LABELS: Record<string, Record<string, string>> = {
  treatment_interest: {
    aligners: 'Интерес: алайнери',
    braces: 'Интерес: брекети',
    both: 'Интерес: алайнери или брекети',
    unsure: 'Отворен/а към различни подходи',
    ask_doctor: 'Искаш лекарят да препоръча подход',
  },
  readiness_timeline: {
    asap: 'Следваща стъпка: възможно най-скоро',
    within_1_month: 'Следваща стъпка: до 1 месец',
    in_1_3_months: 'Следваща стъпка: след 1–3 месеца',
    just_researching: 'Етап: проучване',
  },
  budget_mindset: {
    affordable: 'Търсиш достъпен вариант',
    balanced: 'Баланс цена / качество',
    premium_if_justified: 'Премиум, ако е обосновано',
    unknown_pricing: 'Искаш яснота за цените',
  },
  has_files: {
    has_opg: 'Имаш OPG / панорамна снимка',
    has_plan_or_offer: 'Имаш план или оферта',
    has_smile_photos: 'Имаш снимки на усмивката',
  },
}

const NEXT_STEPS = [
  { t: 'Виждаш до 3 клиники', d: 'Подбрани според града и отговорите ти.' },
  { t: 'Избираш сам/а', d: 'Разглеждаш профилите и решаваш дали и с коя да продължиш.' },
  { t: 'Клиниката се свързва с теб', d: 'Само ако поискаш — за удобен час за консултация.' },
]

function deriveSegment(answers?: Record<string, unknown>): Segment {
  const raw = (answers || {})['segment']
  if (raw === 'teen' || raw === 'child') return raw
  return 'adult'
}

// The diagnostic quiz computes its own band client-side (`quiz_band`) but the
// backend lead-scoring has no branch for `diagnostic_quiz`, so `lead.band`
// is always RED for those leads. Prefer the quiz's own band when present.
function deriveBand(lead: Lead): Band {
  const quizBand = (lead.answers || {})['quiz_band']
  if (quizBand === 'low') return 'GREEN'
  if (quizBand === 'moderate') return 'YELLOW'
  if (quizBand === 'high') return 'RED'
  return lead.band === 'YELLOW' || lead.band === 'RED' ? lead.band : 'GREEN'
}

function deriveFlags(answers?: Record<string, unknown>): string[] {
  const raw = (answers || {})['quiz_flags']
  if (!Array.isArray(raw)) return []
  return raw.filter((f): f is string => typeof f === 'string' && f in FLAG_FINDINGS)
}

function deriveProfile(answers?: Record<string, unknown>): string[] {
  const a = answers || {}
  return Object.keys(PROFILE_LABELS)
    .map((k) => PROFILE_LABELS[k][String(a[k] ?? '')])
    .filter((v): v is string => !!v)
}

function buildKeyFindings(segment: Segment, flags: string[]): string[] {
  // Always start with the generic anchor (so default view never empty).
  const bullets: string[] = [GENERIC_BY_SEGMENT[segment]]
  // Up to 2 flag-aware bullets, keeping the list short and scannable.
  for (const f of flags.slice(0, 2)) {
    const txt = FLAG_FINDINGS[f]
    if (txt) bullets.push(txt)
  }
  return bullets
}

const CARD = 'rounded-2xl bg-white border border-[#E5E5E5]'
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B6B6B]'

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assistedModalOpen, setAssistedModalOpen] = useState(false)
  const [assistedRequested, setAssistedRequested] = useState(false)
  const gateRef = useRef<HTMLDivElement>(null)
  const [gateInView, setGateInView] = useState(true)

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const data = await getLead(leadId)
        setLead(data)
      } catch {
        setError('Възникна грешка при зареждане на резултатите.')
      } finally {
        setLoading(false)
      }
    }
    fetchLead()
  }, [leadId])

  // Mobile sticky CTA shows only while the form is off-screen.
  const isUnlocked = lead?.full_result_unlocked === true
  useEffect(() => {
    const el = gateRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setGateInView(entry.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [lead, isUnlocked])

  // After successful unlock → straight to the personalised clinic shortlist:
  //   Quiz → /results/[leadId] (partial + capture) → /results/[leadId]/clinics
  const handleUnlocked = () => {
    router.push(`/results/${leadId}/clinics`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F4F2] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#007956] animate-spin" />
      </main>
    )
  }

  if (error || !lead) {
    return (
      <main className="min-h-screen bg-[#F5F4F2]">
        <ResultsHeader />
        <section className="pt-32 pb-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p className="text-rose-700">{error || 'Резултатите не бяха намерени.'}</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 text-[#007956] font-medium">
              <Home className="w-4 h-4" />
              Към началото
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  const segment = deriveSegment(lead.answers)
  const flags = deriveFlags(lead.answers)
  const band = deriveBand(lead)
  const headline = HEADLINE_BY_SEGMENT[segment]
  const explanation = EXPLANATION_BY_BAND[band]
  const findings = buildKeyFindings(segment, flags)
  const profile = deriveProfile(lead.answers)

  // Surfaced when the user lands here from the /clinics locked-redirect.
  const noticeFromQuery =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('notice')
      : null
  const showLockedNotice = noticeFromQuery === 'locked' && !isUnlocked

  const resultCard = (
    <article
      className={`${CARD} p-6 sm:p-8`}
      data-testid={isUnlocked ? 'full-partial-result' : 'partial-result-teaser'}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D0FAE5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#007956]">
          <ShieldCheck className="w-3 h-3" /> Твоят резултат
        </span>
        <span className="rounded-full border border-[#E5E5E5] px-3 py-1 text-[11px] font-semibold text-[#525252]" data-testid="result-band-label">
          {BAND_LABEL[band]}
        </span>
      </div>

      <h1
        className="mt-4 text-[28px] sm:text-[34px] font-semibold leading-[1.1] text-[#0A0A0A]"
        data-testid={isUnlocked ? 'result-headline' : 'partial-headline'}
      >
        {headline}
      </h1>
      <p
        className="mt-3 text-[15px] sm:text-base leading-relaxed text-[#525252]"
        data-testid={isUnlocked ? 'result-explanation' : 'partial-explanation'}
      >
        {explanation}
      </p>

      <div className="mt-6">
        <p className={EYEBROW}>Какво показват отговорите ти</p>
        <ul className="mt-3 space-y-2.5" data-testid="result-findings">
          {findings.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-[#171717]" data-testid={`result-finding-${i}`}>
              <Compass className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#007956]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {profile.length > 0 && (
        <div className="mt-6">
          <p className={EYEBROW}>Твоят профил</p>
          <ul className="mt-3 flex flex-wrap gap-2" data-testid="result-profile">
            {profile.map((p) => (
              <li key={p} className="rounded-full bg-[#F5F4F2] px-3 py-1.5 text-[12.5px] font-medium text-[#171717]">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isUnlocked && (
        <p className="mt-6 text-[13.5px] leading-relaxed text-[#525252]" data-testid="result-safe-orientation-note">
          {SAFE_ORIENTATION_NOTE}
        </p>
      )}
      <p className="mt-6 border-t border-[#E5E5E5] pt-4 text-[12px] leading-relaxed text-[#6B6B6B]" data-testid="result-trust-note">
        {GLOBAL_DISCLAIMER}
      </p>
    </article>
  )

  const nextSteps = (
    <div className={`${CARD} p-6 sm:p-7`} data-testid="result-next-steps">
      <p className={EYEBROW}>Какво следва</p>
      <ol className="mt-4 space-y-4">
        {NEXT_STEPS.map((s, i) => (
          <li key={s.t} className="flex items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0A0A0A] text-[13px] font-bold text-[#F5F4F2]">
              {i + 1}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[#0A0A0A]">{s.t}</p>
              <p className="text-[13.5px] leading-relaxed text-[#525252]">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#F5F4F2] relative" data-testid="results-page">
      <ResultsHeader />

      <section className="relative pt-20 pb-28 md:pt-28 lg:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {showLockedNotice && (
            <div
              className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
              data-testid="locked-redirect-notice"
            >
              Избери град и остави контакт, за да видиш персонализираните препоръки.
            </div>
          )}

          {/* Mobile order: result → form → next steps. Desktop: result and
              next steps on the left, form sticky on the right (above the fold). */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8 lg:items-start">
            <div className="lg:col-start-1 lg:row-start-1">{resultCard}</div>

            {!isUnlocked ? (
              <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24">
                <ResultUnlockGate
                  ref={gateRef}
                  leadId={lead.id}
                  defaultName={lead.name}
                  citySlug={lead.city_slug}
                  onUnlocked={() => handleUnlocked()}
                />
              </div>
            ) : (
              <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 space-y-5">
                {/* Next-step card — primary CTA to the clinic shortlist +
                    secondary assisted-choice CTA (AssistedChoiceModal). */}
                <article className={`${CARD} p-6 sm:p-7`} data-testid="next-step-card">
                  <p className={EYEBROW}>Следваща стъпка</p>
                  <h2 className="mt-2 text-2xl font-semibold leading-snug text-[#0A0A0A]">
                    Виж подходящите клиники за теб
                  </h2>
                  <p className="mt-2 mb-5 text-[15px] leading-relaxed text-[#525252]">
                    Подбрахме ограничен брой клиники, които са релевантни спрямо локацията и избраната категория. Това не е каталог — а кратък списък за по-смислен първи разговор.
                  </p>
                  <Link
                    href={`/results/${leadId}/clinics`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-6 py-4 text-[15px] font-bold text-[#0A0A0A] hover:bg-[#CC5400] transition-colors"
                    data-testid="see-clinics-cta"
                  >
                    Виж до 3 подходящи клиники
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  {assistedRequested ? (
                    <div
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#D0FAE5] px-5 py-3 text-sm font-medium text-[#007956]"
                      data-testid="results-assisted-choice-submitted"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Заявката е изпратена
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        trackPatientEvent('assisted_choice_modal_opened', {
                          lead_id: leadId,
                          source: 'matching_page',
                        })
                        setAssistedModalOpen(true)
                      }}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-sm font-medium text-[#0A0A0A] hover:border-[#A3A3A3] transition-colors"
                      data-testid="results-assisted-choice-cta"
                    >
                      Искам Zubite да ми помогне първо
                    </button>
                  )}
                </article>

                <aside className="rounded-2xl bg-[#0A0A0A] p-6 flex items-start gap-4" data-testid="care-pass-reminder">
                  <div className="shrink-0 grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    <Gift className="w-5 h-5 text-[#00D294]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-snug text-[#F5F4F2]" data-testid="care-pass-reminder-headline">
                      Zubite Care Pass е включен за всеки наш пациент при посещение в партньорска клиника.
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#A3A3A3]">
                      Не е застраховка и не е автоматична отстъпка от лечение.{' '}
                      <Link href="/care-pass" className="underline underline-offset-2 text-[#F5F4F2]">Научи повече</Link>
                    </p>
                  </div>
                </aside>
              </div>
            )}

            <div className="lg:col-start-1 lg:row-start-2">{nextSteps}</div>
          </div>
        </div>
      </section>

      {/* Mobile sticky CTA — scrolls to the form while it's off-screen. */}
      {!isUnlocked && !gateInView && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E5E5] bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <button
            type="button"
            onClick={() => gateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#FF6B00] px-5 py-3.5 text-[15px] font-bold text-[#0A0A0A]"
            data-testid="results-sticky-cta"
          >
            Виж клиниките за теб
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {assistedModalOpen && (
        <AssistedChoiceModal
          leadId={leadId}
          source="matching_page"
          initialContact={getStoredLeadContact(leadId)}
          onClose={() => setAssistedModalOpen(false)}
          onSuccess={() => setAssistedRequested(true)}
        />
      )}

      <Footer />
    </main>
  )
}
