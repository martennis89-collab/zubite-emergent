'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ResultUnlockGate } from '@/components/patient/ResultUnlockGate'
import { AssistedChoiceModal } from '@/components/patient/AssistedChoiceModal'
import { getLead } from '@/lib/api'
import { getStoredLeadContact, setStoredLeadContact, type LeadContact } from '@/lib/leadContact'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import {
  Loader2, Home, ShieldCheck, ArrowRight, CheckCircle2, Sparkles,
  PhoneCall, Phone, MessagesSquare, MessageCircle, CalendarCheck,
} from 'lucide-react'

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
}

type Segment = 'adult' | 'teen' | 'child'
type Band = 'GREEN' | 'YELLOW' | 'RED'

// ─── Copy maps ─────────────────────────────────────────────────
// Deliberately short and non-diagnostic: we suggest a direction, never
// label a condition.
const HEADLINE_BY_SEGMENT: Record<Segment, string> = {
  adult: 'Консултация с ортодонт',
  teen: 'Преглед при ортодонт',
  child: 'Ранна оценка при ортодонт',
}

const EXPLANATION_BY_BAND: Record<Band, string> = {
  GREEN: 'Малко сигнали — добра основа за спокоен първи разговор със специалист.',
  YELLOW: 'Няколко сигнала, които заслужават професионален поглед.',
  RED: 'Няколко сигнала наведнъж — добре е да ги обсъдиш със специалист скоро.',
}

const BAND_LABEL: Record<Band, string> = {
  GREEN: 'Малко сигнали',
  YELLOW: 'Няколко сигнала',
  RED: 'Повече сигнали',
}

// Quiz flags → short "what to discuss" topics.
const FLAG_TOPICS: Record<string, string> = {
  crowding: 'Подреждане на зъбите',
  bite_issue: 'Захапка',
  airway: 'Дишане и сън',
  tension: 'Напрежение в челюстта',
  wear: 'Износване на зъбите',
  development: 'Развитие на захапката',
}

// Intake answers (non-scoring quiz questions) → short profile chips.
const PROFILE_LABELS: Record<string, Record<string, string>> = {
  treatment_interest: {
    aligners: 'Алайнери',
    braces: 'Брекети',
    both: 'Алайнери или брекети',
    unsure: 'Отворен/а за варианти',
    ask_doctor: 'Лекарят да препоръча',
  },
  readiness_timeline: {
    asap: 'Възможно най-скоро',
    within_1_month: 'До 1 месец',
    in_1_3_months: 'След 1–3 месеца',
    just_researching: 'Проучвам',
  },
  budget_mindset: {
    affordable: 'Достъпен вариант',
    balanced: 'Баланс цена / качество',
    premium_if_justified: 'Премиум, ако е обосновано',
    unknown_pricing: 'Яснота за цените',
  },
  has_files: {
    has_opg: 'Имам OPG снимка',
    has_plan_or_offer: 'Имам план / оферта',
    has_smile_photos: 'Имам снимки',
  },
}

// Every channel exists on the platform, but availability is per clinic
// (chat / Viber are package-gated, booking needs `booking_enabled`).
const CONTACT_OPTIONS = [
  { icon: PhoneCall, label: 'Заяви обаждане' },
  { icon: Phone, label: 'Обади се директно' },
  { icon: MessagesSquare, label: 'Онлайн чат' },
  { icon: MessageCircle, label: 'Пиши във Viber' },
  { icon: CalendarCheck, label: 'Запази час онлайн' },
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

function deriveTopics(answers?: Record<string, unknown>): string[] {
  const raw = (answers || {})['quiz_flags']
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f): f is string => typeof f === 'string' && f in FLAG_TOPICS)
    .slice(0, 3)
    .map((f) => FLAG_TOPICS[f])
}

function deriveProfile(answers?: Record<string, unknown>): string[] {
  const a = answers || {}
  return Object.keys(PROFILE_LABELS)
    .map((k) => PROFILE_LABELS[k][String(a[k] ?? '')])
    .filter((v): v is string => !!v)
}

const CARD = 'rounded-xl border border-[#C8D8D4] bg-white shadow-[0_24px_60px_-40px_rgba(7,59,54,0.45)]'
const CHIP = 'inline-flex items-center rounded-full border px-3.5 py-2 text-base'

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

  const shortlistHref = `/clinics?leadId=${encodeURIComponent(leadId)}`

  // After unlock → straight to the top-3 shortlist on the clinic directory
  // (/results/[leadId]/clinics only redirects there).
  const handleUnlocked = (contact: LeadContact) => {
    // Cache the contact so the booking, request-call and assisted-choice
    // forms further down the funnel can prefill it.
    setStoredLeadContact(leadId, contact)
    router.push(shortlistHref)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF9F7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006A61]" />
      </main>
    )
  }

  if (error || !lead) {
    return (
      <main className="min-h-screen bg-[#FBF9F7]">
        <Header />
        <section className="px-5 pb-16 pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-lg text-rose-700">{error || 'Резултатите не бяха намерени.'}</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 text-lg font-semibold text-[#006A61]">
              <Home className="h-5 w-5" />
              Към началото
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  const segment = deriveSegment(lead.answers)
  const band = deriveBand(lead)
  const topics = deriveTopics(lead.answers)
  const profile = deriveProfile(lead.answers)

  // Surfaced when the user lands here from a locked shortlist redirect.
  const noticeFromQuery =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('notice')
      : null
  const showLockedNotice = noticeFromQuery === 'locked' && !isUnlocked

  const contactCard = (
    <div className={`${CARD} p-6 sm:p-8`} data-testid="result-contact-options">
      <h2 className="font-display text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#073B36] sm:text-3xl">
        После избираш ти
      </h2>
      <p className="mt-2 text-lg leading-relaxed text-[#45514F]">
        Разгледай топ 3 или всички партньорски клиники и се свържи с която искаш:
      </p>
      <ul className="mt-5 grid gap-3">
        {CONTACT_OPTIONS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3 text-lg font-medium text-[#1B1C1B]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#E7F3F1]">
              <Icon className="h-5 w-5 text-[#006A61]" />
            </span>
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[15px] text-[#6B7875]">Каналите зависят от клиниката.</p>
      <Link
        href="/clinics"
        className="mt-5 inline-flex items-center gap-2 text-lg font-semibold text-[#006A61] underline-offset-4 hover:underline"
        data-testid="result-all-clinics-link"
      >
        Всички партньорски клиники
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#FBF9F7] text-[#1B1C1B]" data-testid="results-page">
      <Header />

      {/* ─── Result hero ─────────────────────────────────────────── */}
      <section className="bg-[#073B36] text-white" data-testid={isUnlocked ? 'full-partial-result' : 'partial-result-teaser'}>
        <div className="mx-auto max-w-[1180px] px-5 pb-28 pt-10 sm:px-6 sm:pb-32 sm:pt-14">
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-base font-semibold text-[#89E0D4]">
              <Sparkles className="h-4 w-4" />
              Твоят резултат
            </p>
            <span className="rounded-full border border-[#3F746E] px-3 py-1 text-sm font-semibold text-[#D7EEEA]" data-testid="result-band-label">
              {BAND_LABEL[band]}
            </span>
          </div>

          <h1
            className="mt-4 max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-0.035em] !text-[#FFFFFF] sm:text-5xl lg:text-6xl"
            data-testid={isUnlocked ? 'result-headline' : 'partial-headline'}
          >
            {HEADLINE_BY_SEGMENT[segment]}
          </h1>
          <p
            className="mt-4 max-w-3xl text-pretty text-lg leading-8 text-[#D7EEEA] sm:text-xl"
            data-testid={isUnlocked ? 'result-explanation' : 'partial-explanation'}
          >
            {EXPLANATION_BY_BAND[band]}
          </p>

          {topics.length > 0 && (
            <div className="mt-7">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#89E0D4]">Какво да обсъдиш</p>
              <ul className="mt-3 flex flex-wrap gap-2" data-testid="result-findings">
                {topics.map((t) => (
                  <li key={t} className={`${CHIP} border-[#89E0D4] bg-[#0B4A43] font-semibold text-[#FFFFFF]`}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {profile.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#89E0D4]">Твоите предпочитания</p>
              <ul className="mt-3 flex flex-wrap gap-2" data-testid="result-profile">
                {profile.map((p) => (
                  <li key={p} className={`${CHIP} border-[#3F746E] text-[#D7EEEA]`}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-7 flex items-center gap-2 text-[15px] text-[#BDE9E2]" data-testid="result-trust-note">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Ориентир, не диагноза. Точната оценка изисква преглед.
          </p>
        </div>
      </section>

      {/* ─── Action cards, overlapping the hero ──────────────────── */}
      <section className="mx-auto -mt-20 max-w-[1180px] px-5 pb-28 sm:px-6 lg:pb-24">
        {showLockedNotice && (
          <div
            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-base leading-relaxed text-amber-900"
            data-testid="locked-redirect-notice"
          >
            Избери град и остави контакт, за да видиш топ 3 клиники.
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
          {!isUnlocked ? (
            <ResultUnlockGate
              ref={gateRef}
              leadId={lead.id}
              defaultName={lead.name}
              citySlug={lead.city_slug}
              onUnlocked={handleUnlocked}
            />
          ) : (
            <div className={`${CARD} p-6 sm:p-8`} data-testid="next-step-card">
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#073B36] sm:text-4xl">
                Твоите топ 3 клиники са готови
              </h2>
              <p className="mt-2 text-lg leading-relaxed text-[#45514F]">
                Подбрани според отговорите и града ти.
              </p>
              <Link
                href={shortlistHref}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B00] px-6 py-4 text-lg font-bold text-[#0A0A0A] transition-colors hover:bg-[#CC5400]"
                data-testid="see-clinics-cta"
              >
                Виж топ 3 клиники
                <ArrowRight className="h-5 w-5" />
              </Link>

              {assistedRequested ? (
                <div
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#E7F3F1] px-5 py-3.5 text-base font-semibold text-[#006A61]"
                  data-testid="results-assisted-choice-submitted"
                >
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
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
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#C8D8D4] bg-white px-5 py-3.5 text-base font-semibold text-[#073B36] transition-colors hover:border-[#006A61]"
                  data-testid="results-assisted-choice-cta"
                >
                  Искам Zubite да ми помогне да избера
                </button>
              )}
            </div>
          )}

          {contactCard}
        </div>
      </section>

      {/* Mobile sticky CTA — scrolls to the form while it's off-screen. */}
      {!isUnlocked && !gateInView && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#C8D8D4] bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
          <button
            type="button"
            onClick={() => gateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B00] px-5 py-4 text-lg font-bold text-[#0A0A0A]"
            data-testid="results-sticky-cta"
          >
            Виж топ 3 клиники
            <ArrowRight className="h-5 w-5" />
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
