'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import {
  AlertCircle, Compass, ArrowLeft, ShieldCheck, Sparkles,
  Loader2, CheckCircle2,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {
  getRecommendedClinics,
  getSelectionState,
  type RecommendedClinicsResponse,
  type SelectionState,
} from '@/lib/api'
import { ClinicRecommendationCard } from '@/components/patient/ClinicRecommendationCard'
import { ClinicMatchEmptyState } from '@/components/patient/ClinicMatchEmptyState'
import { AssistedChoiceModal } from '@/components/patient/AssistedChoiceModal'
import { CarePassPanel } from '@/components/patient/CarePassPanel'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { getStoredLeadContact } from '@/lib/leadContact'

type ErrKind = 'not_found' | 'expired' | 'rate_limited' | 'generic' | null

export default function ClinicMatchPage() {
  const params = useParams()
  const leadId = params.leadId as string

  const [data, setData] = useState<RecommendedClinicsResponse | null>(null)
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [errKind, setErrKind] = useState<ErrKind>(null)
  const [assistedModalOpen, setAssistedModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErrKind(null)
    try {
      // Fetch recommendations + selection state in parallel.
      const [r, s] = await Promise.all([
        getRecommendedClinics(leadId, 3),
        getSelectionState(leadId).catch(() => null),
      ])
      setData(r)
      setSelection(s)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const s = e.response?.status
        if (s === 404) setErrKind('not_found')
        else if (s === 410) setErrKind('expired')
        else if (s === 429) setErrKind('rate_limited')
        else setErrKind('generic')
      } else {
        setErrKind('generic')
      }
    } finally {
      setLoading(false)
    }
  }, [leadId])

  // Called by a card when its modal submits successfully — patches local
  // selection state immediately so all sibling cards reflect "Вече избрахте
  // клиника" without a refetch round-trip.
  const handleSubmitted = useCallback(
    (selectedClinicId: string, clinicName: string) => {
      setSelection((prev) => ({
        lead_id: leadId,
        has_request: true,
        selected_clinic_id: selectedClinicId,
        selected_clinic_request_id: prev?.selected_clinic_request_id ?? null,
        clinic_selection_source: prev?.clinic_selection_source ?? 'matching_card',
        request_call_status: 'requested',
        selected_clinic_requested_at:
          prev?.selected_clinic_requested_at ?? new Date().toISOString(),
        clinic: {
          id: selectedClinicId,
          name: clinicName,
          city_name: prev?.clinic?.city_name ?? '',
        },
      }))
    },
    [leadId],
  )

  useEffect(() => {
    if (leadId) load()
  }, [leadId, load])

  // Fire `clinic_recommendations_viewed` once, after a successful fetch.
  const recosViewedRef = useRef(false)
  useEffect(() => {
    if (recosViewedRef.current) return
    if (!data || errKind) return
    recosViewedRef.current = true
    const tiers = data.clinics.map((c) => (c.partner_tier || 'standard').toLowerCase())
    trackPatientEvent('clinic_recommendations_viewed', {
      lead_id: leadId,
      clinic_count: data.clinic_count,
      has_premium: tiers.includes('premium'),
      has_featured: tiers.includes('featured'),
      has_standard: tiers.includes('standard'),
    })
  }, [data, errKind, leadId])

  return (
    <main className="min-h-screen bg-[#FCFAF8] overflow-x-hidden relative" data-testid="clinic-match-page">
      {/* Warm ivory backdrop + soft teal blobs (same language as homepage / results) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.22) 0%, rgba(94,234,212,0) 60%),' +
            'radial-gradient(ellipse 60% 50% at 90% 40%, rgba(165,243,252,0.30) 0%, rgba(165,243,252,0) 60%)',
        }}
      />
      <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/35 blur-3xl pointer-events-none" />

      <Header />

      <section className="relative pt-24 pb-12 md:pt-28 md:pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href={`/results/${leadId}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-6 transition-colors"
            data-testid="match-back-link"
          >
            <ArrowLeft className="w-4 h-4" />
            Към резултата
          </Link>

          {/* Title block */}
          <div className="mb-8 max-w-3xl">
            <p className="font-sans text-[11px] font-semibold tracking-[0.22em] uppercase text-teal-700 mb-3">
              Препоръчани клиники
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
              Подходящи следващи стъпки според отговорите ти
            </h1>
            <p className="text-slate-600 mt-3 text-base sm:text-lg leading-relaxed">
              Виж клиники, които може да са релевантни според описания случай, града и избраната категория.
            </p>
            {/* Title trust chips — replace longer guidance with scannable chips */}
            <ul className="mt-5 flex flex-wrap gap-2" data-testid="match-title-chips">
              {[
                { l: 'Ориентир, не диагноза', icon: ShieldCheck },
                { l: 'Насочване според случая', icon: Compass },
                { l: 'Care Pass след консултация', icon: Sparkles },
                { l: 'Без задължение', icon: CheckCircle2 },
              ].map(({ l, icon: I }) => (
                <li
                  key={l}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/55 backdrop-blur-md ring-1 ring-white/75 text-[11px] text-slate-700 font-medium px-3 py-1.5 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.10)]"
                >
                  <I className="w-3 h-3 text-teal-600" />
                  {l}
                </li>
              ))}
            </ul>
          </div>

          {/* Body */}
          {loading ? (
            <CardSkeletons />
          ) : errKind ? (
            <ErrorPanel kind={errKind} onRetry={load} leadId={leadId} />
          ) : data && data.clinic_count === 0 ? (
            <ClinicMatchEmptyState message={data.message} leadId={leadId} />
          ) : data ? (
            <>
              {/* Selection-rule banner — compact 1-liner with inline tabular numbers */}
              <div
                className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.18)] px-4 py-3 mb-4 flex items-center gap-3 text-[13px] text-slate-700"
                data-testid="selection-rule-banner"
              >
                <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <p className="leading-snug">
                  Може да разгледате{' '}
                  <strong className="text-slate-900 tabular-nums">{data.selection_rule.can_view_clinics}</strong>{' '}
                  клиники · Заявка към{' '}
                  <strong className="text-slate-900 tabular-nums">{data.selection_rule.can_request_call_from_clinics}</strong>.
                </p>
              </div>

              {/* Transparency note for partner placement. Rendered only when at
                  least one card actually carries a placement label. Wording is
                  conservative and never implies ranking. */}
              {data.clinics.some((c) => !!c.placement_label) && (
                <p
                  className="text-xs text-slate-500 mb-6 leading-relaxed"
                  data-testid="match-placement-note"
                >
                  Някои партньорски клиники могат да имат допълнителна видимост
                  в Zubite. Препоръките се съобразяват с вашия град и тип
                  заявка.
                </p>
              )}

              {/* Already-selected banner (P4) — visible whenever the lead
                  has previously submitted a request. */}
              {selection?.has_selected_clinic && selection?.clinic && (
                <div
                  className="mb-6 rounded-2xl ring-1 ring-emerald-200/70 bg-emerald-50/85 backdrop-blur-xl p-4 sm:p-5 flex items-start gap-3 shadow-[0_10px_30px_-18px_rgba(5,150,105,0.35)]"
                  data-testid="match-already-selected-banner"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-emerald-900">
                      Вече избрахте клиника
                    </p>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Заявката е изпратена към{' '}
                      <strong>{selection.clinic.name}</strong>. Тя ще може да се
                      свърже с вас според процеса си за обработка на заявки.
                    </p>
                  </div>
                </div>
              )}

              {/* Zubite-help banner (P5) — mutually exclusive with the
                  selected-clinic banner. */}
              {selection?.has_requested_zubite_help && (
                <div
                  className="mb-6 rounded-2xl ring-1 ring-teal-200/70 bg-teal-50/85 backdrop-blur-xl p-4 sm:p-5 flex items-start gap-3 shadow-[0_10px_30px_-18px_rgba(13,148,136,0.35)]"
                  data-testid="match-assisted-banner"
                >
                  <Sparkles className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-teal-900">
                      Заявката е изпратена към Zubite.
                    </p>
                    <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                      Ще използваме информацията от оценката ви, за да ви
                      помогнем с по-ясна следваща стъпка.
                    </p>
                  </div>
                </div>
              )}

              {/* Why-you-see-these-clinics explainer — patient-facing trust
                  block above the grid (Zubite Clinic Standard layer). */}
              <div
                className="mb-6 rounded-2xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.18)] p-5 sm:p-6"
                data-testid="why-these-clinics"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-teal-50/80 text-teal-700 ring-1 ring-teal-100 flex-shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-serif text-base sm:text-lg text-slate-900 leading-snug">
                      Защо виждаш тези клиники?
                    </h2>
                    <p className="mt-1.5 text-[13.5px] text-slate-600 leading-relaxed">
                      Показваме партньорски клиники, които покриват{' '}
                      <Link href="/standart-za-kliniki" className="text-teal-700 hover:underline">Zubite стандарт</Link>{' '}
                      и съвпадат с посоката на твоя случай, града ти и
                      информацията, която сподели във въпросника. Това не е
                      класация „най-добри клиники" и не е диагноза — а
                      ориентир за по-смислен първи разговор.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[
                        'Според случая',
                        'Според локацията',
                        'Партньорска клиника',
                        'Ориентир, не диагноза',
                        'Care Pass след консултация',
                      ].map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-1 rounded-full bg-teal-50/80 text-teal-700 text-[11px] font-medium px-2.5 py-1 ring-1 ring-teal-100"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Care Pass benefit strip — premium dark navy-teal panel
                  matching the homepage. Renders above the grid so patients
                  see the after-visit benefit before they pick a clinic. */}
              <div className="mb-6" data-testid="care-pass-benefit-strip">
                <CarePassPanel
                  variant="compact"
                  showLearnMore
                  testid="care-pass-benefit-strip-panel"
                />
              </div>

              {/* Cards */}
              <div
                className={`grid gap-5 ${
                  data.clinic_count === 1
                    ? 'grid-cols-1 max-w-xl mx-auto'
                    : data.clinic_count === 2
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
                data-testid="match-clinics-grid"
              >
                {data.clinics.map((c, i) => (
                  <ClinicRecommendationCard
                    key={c.id}
                    clinic={c}
                    position={i + 1}
                    leadId={leadId}
                    selectedClinicId={selection?.selected_clinic_id ?? null}
                    hasAssistedChoice={!!selection?.has_requested_zubite_help}
                    onSubmitted={handleSubmitted}
                  />
                ))}
              </div>

              {/* Assisted choice panel — compact */}
              <section
                className="mt-10 rounded-3xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] p-5 sm:p-6 max-w-3xl mx-auto"
                data-testid="assisted-choice-panel"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900">
                    Колебаете ли се?
                  </h2>
                </div>
                <p className="text-slate-600 text-sm leading-snug mb-4">
                  Помагаме да изберете подходяща следваща стъпка.
                </p>
                {selection?.has_requested_zubite_help ? (
                  <div
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-50 ring-1 ring-emerald-100 text-emerald-800 text-sm font-medium rounded-full"
                    data-testid="assisted-choice-submitted"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Заявката е изпратена
                  </div>
                ) : selection?.has_selected_clinic ? (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    onClick={() => {
                      trackPatientEvent('matching_choice_blocked', {
                        lead_id: leadId,
                        reason: 'already_selected_clinic',
                        attempted_action: 'assisted_choice',
                      })
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100/80 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed"
                    data-testid="assisted-choice-locked-by-clinic"
                  >
                    Вече избрахте клиника
                  </button>
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
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/70 backdrop-blur-xl ring-1 ring-white/80 text-slate-900 text-sm font-medium rounded-full hover:bg-white hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]"
                    data-testid="assisted-choice-btn"
                  >
                    <Compass className="w-4 h-4 text-teal-600" />
                    Помогнете ми да избера
                  </button>
                )}
              </section>
            </>
          ) : null}

          {/* Trust note — footnote style, single line, safety preserved */}
          <p
            className="mt-12 text-[11px] text-slate-400 text-center leading-snug max-w-2xl mx-auto"
            data-testid="match-trust-note"
          >
            Zubite.bg не поставя диагноза и не гарантира лечение. Окончателната оценка се прави от стоматолог или ортодонт.
          </p>
        </div>
      </section>

      {assistedModalOpen && (
        <AssistedChoiceModal
          leadId={leadId}
          source="matching_page"
          initialContact={getStoredLeadContact(leadId)}
          onClose={() => setAssistedModalOpen(false)}
          onSuccess={() => {
            // Refetch canonical state so banners and button switch.
            getSelectionState(leadId).then(setSelection).catch(() => {})
          }}
        />
      )}

      <Footer />
    </main>
  )
}

/* ──────────────────── subcomponents ──────────────────── */

function CardSkeletons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-white/65 backdrop-blur-xl ring-1 ring-white/70 rounded-2xl p-7 animate-pulse shadow-[0_8px_30px_-22px_rgba(15,23,42,0.18)]"
          data-testid={`match-skeleton-${i}`}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100/80 mb-4" />
          <div className="h-5 w-3/4 bg-slate-100/80 rounded mb-2" />
          <div className="h-3 w-1/2 bg-slate-100/80 rounded mb-5" />
          <div className="h-3 w-full bg-slate-100/80 rounded mb-1.5" />
          <div className="h-3 w-5/6 bg-slate-100/80 rounded mb-6" />
          <div className="h-10 w-full bg-slate-100/80 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function ErrorPanel({
  kind,
  onRetry,
  leadId,
}: {
  kind: Exclude<ErrKind, null>
  onRetry: () => void
  leadId: string
}) {
  const titleMap: Record<typeof kind, string> = {
    not_found: 'Не успяхме да намерим този резултат.',
    expired: 'Този резултат е изтекъл.',
    rate_limited: 'Твърде много заявки.',
    generic: 'Възникна неочаквана грешка.',
  }
  const bodyMap: Record<typeof kind, string> = {
    not_found:
      'Възможно е връзката, която следвахте, да е остаряла. Опитайте да попълните оценката отново.',
    expired:
      'Препоръките на Zubite са валидни за ограничен период. Моля, попълнете оценката отново, за да получите нови препоръки.',
    rate_limited:
      'Изпратихте твърде много заявки за кратко време. Опитайте отново след малко.',
    generic:
      'Нещо се обърка при свързване със сървъра. Опитайте отново или ни пишете.',
  }
  const showRestart = kind === 'not_found' || kind === 'expired'

  return (
    <div
      className="rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] p-8 max-w-2xl mx-auto"
      data-testid={`match-error-${kind}`}
    >
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
        <div>
          <h2 className="font-serif text-xl font-semibold text-slate-900">
            {titleMap[kind]}
          </h2>
          <p className="text-slate-600 mt-2 leading-relaxed">{bodyMap[kind]}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-6">
        {showRestart ? (
          <Link
            href="/quiz"
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-all hover:-translate-y-0.5 shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            data-testid="match-error-restart"
          >
            <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
            <span className="relative">Започни отново</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-all hover:-translate-y-0.5 shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            data-testid="match-error-retry"
          >
            <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
            <span className="relative inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4" />
              Опитай отново
            </span>
          </button>
        )}
        <Link
          href={`/results/${leadId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/65 backdrop-blur-xl ring-1 ring-white/80 text-slate-700 text-sm font-medium rounded-full hover:bg-white transition-all shadow-[0_8px_24px_-14px_rgba(15,23,42,0.18)]"
        >
          Към резултата
        </Link>
      </div>
    </div>
  )
}

// `AssistedNextStepModal` was the preview-only modal used before P5.
// Replaced by `AssistedChoiceModal`. Kept as a no-op stub for compile
// stability across hot-reloads — safe to delete in a later cleanup pass.
function AssistedNextStepModal_DEPRECATED_REMOVED() {
  return null
}
