'use client'

import { useState, useEffect } from 'react'
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
  Loader2, Home, ShieldCheck, ArrowRight, Gift, Sparkles, Compass, MessageCircle, CheckCircle2,
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
  city_slug: string
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

const BAND_TO_STAGE: Record<string, string> = {
  RED: 'high',
  YELLOW: 'moderate',
  GREEN: 'low',
}

function deriveSegment(answers?: Record<string, unknown>): Segment {
  const raw = (answers || {})['segment']
  if (raw === 'teen' || raw === 'child') return raw
  return 'adult'
}

function deriveFlags(answers?: Record<string, unknown>): string[] {
  const raw = (answers || {})['quiz_flags']
  if (!Array.isArray(raw)) return []
  return raw.filter((f): f is string => typeof f === 'string' && f in FLAG_FINDINGS)
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

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assistedModalOpen, setAssistedModalOpen] = useState(false)
  const [assistedRequested, setAssistedRequested] = useState(false)

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

  // After successful unlock → redirect DIRECTLY to the personalised
  // clinic shortlist. This matches the simplified post-quiz flow:
  //   Quiz → /results/[leadId] (partial + capture) → /results/[leadId]/clinics
  // (Phase B redirect to /quiz/success is preserved as a code path
  // only for explicit fallback — production users now land on /clinics.)
  const handleUnlocked = () => {
    router.push(`/results/${leadId}/clinics`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FCFAF8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </main>
    )
  }

  if (error || !lead) {
    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <ResultsHeader />
        <section className="pt-32 pb-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p className="text-rose-700">{error || 'Резултатите не бяха намерени.'}</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 text-teal-700 hover:text-teal-800 font-medium">
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
  const band = (lead.band || 'GREEN') as Band
  const headline = HEADLINE_BY_SEGMENT[segment]
  const explanation = EXPLANATION_BY_BAND[band] || EXPLANATION_BY_BAND.GREEN
  const findings = buildKeyFindings(segment, flags)
  const isUnlocked = lead.full_result_unlocked === true

  // Redirect-from-unlocked message — surfaced when the user lands here
  // from the /clinics page locked-redirect (?notice=locked).
  const noticeFromQuery =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('notice')
      : null
  const showLockedNotice = noticeFromQuery === 'locked' && !isUnlocked

  return (
    <main className="min-h-screen bg-[#FCFAF8] relative overflow-hidden" data-testid="results-page">
      {/* Soft warm gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.25) 0%, rgba(94,234,212,0) 60%),' +
            'radial-gradient(ellipse 60% 50% at 80% 60%, rgba(165,243,252,0.30) 0%, rgba(165,243,252,0) 60%)',
        }}
      />
      <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/40 blur-3xl pointer-events-none" />

      <ResultsHeader />

      <section className="relative pt-28 pb-12 md:pt-36 md:pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Locked-redirect notice — only shown when /clinics bounced back */}
          {showLockedNotice && (
            <div
              className="rounded-2xl bg-amber-50/85 ring-1 ring-amber-200 backdrop-blur-md p-4 text-sm text-amber-900 leading-relaxed"
              data-testid="locked-redirect-notice"
            >
              Остави контакт, за да видиш персонализираните препоръки.
            </div>
          )}

          {/* ─── PRE-UNLOCK ─ partial result teaser + contact gate ─── */}
          {!isUnlocked && (
            <>
              {/* Compact partial result teaser — orientation visible BEFORE
                  contact, but no clinic list. */}
              <article
                className="relative rounded-[1.75rem] bg-white/75 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] p-7 sm:p-8"
                data-testid="partial-result-teaser"
              >
                <div aria-hidden className="absolute inset-x-8 top-0.5 h-1/3 rounded-full bg-gradient-to-b from-white/55 to-transparent pointer-events-none opacity-70" />
                <div className="relative">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700 mb-3" data-testid="partial-eyebrow">
                    Твоят ориентир
                  </p>
                  <h1 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 leading-tight" data-testid="partial-headline">
                    {headline}
                  </h1>
                  <p className="mt-3 text-slate-600 text-[15px] leading-relaxed" data-testid="partial-explanation">
                    {explanation}
                  </p>
                  <p className="mt-4 text-[12px] text-slate-500 leading-relaxed" data-testid="partial-locked-teaser">
                    Намерени са клиники, които може да са релевантни за твоя случай. Care Pass е включен във всяка партньорска клиника — повече детайли в /care-pass.
                  </p>
                </div>
              </article>

              <ResultUnlockGate
                leadId={lead.id}
                defaultName={lead.name}
                citySlug={lead.city_slug}
                onUnlocked={() => handleUnlocked()}
              />
            </>
          )}

          {/* ─── POST-UNLOCK ─ full partial result + next-step CTA ─── */}
          {isUnlocked && (
            <>
              {/* Main result panel */}
              <article
                className="relative rounded-[1.75rem] bg-white/75 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] p-8 sm:p-10"
                data-testid="full-partial-result"
              >
                <div aria-hidden className="absolute inset-x-8 top-0.5 h-1/3 rounded-full bg-gradient-to-b from-white/55 to-transparent pointer-events-none opacity-70" />

                <div className="relative inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-teal-700 bg-teal-50 ring-1 ring-teal-100 rounded-full px-3 py-1 mb-5">
                  <ShieldCheck className="w-3 h-3" /> Твоят резултат
                </div>

                <h1
                  className="relative font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight"
                  data-testid="result-headline"
                >
                  {headline}
                </h1>

                <p
                  className="relative mt-4 text-slate-700 text-[15px] sm:text-base leading-relaxed"
                  data-testid="result-explanation"
                >
                  {explanation}
                </p>

                {/* Key findings */}
                <div className="relative mt-6 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/60 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
                    Какво показват отговорите ти
                  </p>
                  <ul className="space-y-2.5" data-testid="result-findings">
                    {findings.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14.5px] text-slate-700 leading-relaxed" data-testid={`result-finding-${i}`}>
                        <Compass className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Safe orientation note — band-agnostic, always the same
                    non-diagnostic wording regardless of GREEN/YELLOW/RED. */}
                <p className="relative mt-4 text-slate-600 text-[13.5px] leading-relaxed" data-testid="result-safe-orientation-note">
                  {SAFE_ORIENTATION_NOTE}
                </p>

                {/* Trust note — global disclaimer, must stay visible */}
                <p className="relative mt-5 text-[12px] text-slate-500 leading-relaxed" data-testid="result-trust-note">
                  {GLOBAL_DISCLAIMER}
                </p>
              </article>

              {/* Next-step card — primary CTA to clinic shortlist + secondary
                  assisted-choice CTA (reuses the existing P5 AssistedChoiceModal /
                  postRequestZubiteHelp flow — no new request model). */}
              <article
                className="relative rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] p-6 sm:p-7"
                data-testid="next-step-card"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700 mb-2">
                  Следваща стъпка
                </p>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 leading-snug mb-2">
                  Виж подходящите клиники за теб
                </h2>
                <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed mb-5">
                  Подбрахме ограничен брой клиники, които са релевантни спрямо локацията и избраната категория. Това не е каталог — а кратък списък за по-смислен първи разговор.
                </p>
                <Link
                  href={`/results/${leadId}/clinics`}
                  className="relative inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-white text-sm font-semibold shadow-[0_14px_30px_-12px_rgba(13,148,136,0.55)] hover:-translate-y-0.5 transition-transform overflow-hidden"
                  style={{ backgroundImage: 'linear-gradient(135deg,#5eead4 0%,#2dd4bf 60%,#14b8a6 100%)' }}
                  data-testid="see-clinics-cta"
                >
                  <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/3 rounded-full bg-white/30 blur-sm pointer-events-none" />
                  <span className="relative inline-flex items-center gap-2">
                    Виж 3 подходящи опции
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>

                {assistedRequested ? (
                  <div
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50/85 ring-1 ring-emerald-100 text-emerald-800 text-sm font-medium rounded-full"
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
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/70 backdrop-blur-xl ring-1 ring-white/80 text-slate-900 text-sm font-medium rounded-full hover:bg-white hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]"
                    data-testid="results-assisted-choice-cta"
                  >
                    Искам Zubite да ми помогне първо
                  </button>
                )}
              </article>
            </>
          )}

          {/* ─── Care Pass mini-card (dark, compact) — both states ───── */}
          <aside
            className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.40)]"
            style={{
              background:
                'radial-gradient(ellipse 60% 60% at 100% 0%, rgba(20,184,166,0.30) 0%, transparent 60%),' +
                'linear-gradient(135deg, #0B1620 0%, #0E1A24 50%, #112832 100%)',
            }}
            data-testid="care-pass-reminder"
          >
            <div aria-hidden className="absolute inset-x-4 top-1 h-1/3 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative p-6 sm:p-7 flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-white/[0.06] backdrop-blur-2xl ring-1 ring-white/15 flex items-center justify-center">
                <Gift className="w-5 h-5 text-teal-200" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-teal-300 font-semibold">
                  Care Pass
                </p>
                <p className="mt-1.5 font-serif text-base sm:text-lg text-white leading-snug" data-testid="care-pass-reminder-headline">
                  Zubite Care Pass е включен за всеки наш пациент при посещение в партньорска клиника.
                </p>
                <p className="mt-2 text-[12px] text-slate-300/90 leading-relaxed">
                  Допълнителни ползи за грижа за зъбите. Не е застраховка и не е автоматична отстъпка от лечение.
                </p>
              </div>
            </div>
          </aside>

          {/* Next steps strip */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3 text-teal-500" /> Без задължение</span>
            <span aria-hidden>·</span>
            <span>Личен ориентир според отговорите ти</span>
            <span aria-hidden>·</span>
            <span>Не заменя професионален преглед</span>
          </div>
        </div>
      </section>

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

      {/* Suppressing unused-var warnings for fields kept on the Lead
          interface for forward compatibility but not displayed here. */}
      <span hidden aria-hidden>
        {String(lead.city_slug)}{String(lead.treatment_type)}{String(BAND_TO_STAGE[band] || '')}{String(MessageCircle)}
      </span>
    </main>
  )
}
