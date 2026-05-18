'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import {
  ArrowLeft, Building2, MapPin, ShieldCheck, Calendar,
  Sparkle, AlertCircle, Compass, Loader2, PlayCircle,
  Stethoscope, Image as ImageIcon, FileText,
  BookOpenCheck, UserCircle2, Footprints, MessagesSquare,
  CheckCircle2, ChevronDown,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {
  getRecommendedClinics,
  getSelectionState,
  type RecommendedClinic,
  type SelectionState,
} from '@/lib/api'
import { TREATMENT_LABELS } from '@/lib/consultationLabels'
// import { ReviewSignalsSection } from '@/components/patient/ReviewSignalsSection' // R1: superseded by TrustSignalsSection
import { RequestCallModal } from '@/components/patient/RequestCallModal'
import { PublicReviewsSection } from '@/components/patient/PublicReviewsSection'
import { AlignerBrandChips } from '@/components/patient/AlignerBrandChips'
import { CarePassPanel } from '@/components/patient/CarePassPanel'
import { ClinicStandardMiniNote } from '@/components/patient/ClinicStandardSection'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { getStoredLeadContact } from '@/lib/leadContact'

type ErrKind =
  | null
  | 'not_found'
  | 'expired'
  | 'rate_limited'
  | 'clinic_not_in_list'
  | 'generic'

/* ─────────────────────────────────────────────────────────────
   Tier resolution helpers
   Tier controls profile RICHNESS and visibility — NOT clinical
   quality. Copy throughout this file follows that contract.
   ───────────────────────────────────────────────────────────── */
function resolveTier(c: RecommendedClinic): 'premium' | 'featured' | 'standard' {
  const tier = c.partner_tier
  const label = c.placement_label
  if (tier === 'premium' || label === 'Premium партньор') return 'premium'
  if (tier === 'featured' || label === 'Представена клиника') return 'featured'
  return 'standard'
}

export default function ClinicProfilePage() {
  const params = useParams()
  const leadId = params.leadId as string
  const clinicId = params.clinicId as string

  const [clinic, setClinic] = useState<RecommendedClinic | null>(null)
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<ErrKind>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [r, s] = await Promise.all([
        getRecommendedClinics(leadId, 3),
        getSelectionState(leadId).catch(() => null),
      ])
      const match = r.clinics.find((c) => c.id === clinicId)
      if (!match) {
        setErr('clinic_not_in_list')
        setClinic(null)
      } else {
        setClinic(match)
      }
      setSelection(s)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const s = e.response?.status
        if (s === 404) setErr('not_found')
        else if (s === 410) setErr('expired')
        else if (s === 429) setErr('rate_limited')
        else setErr('generic')
      } else {
        setErr('generic')
      }
    } finally {
      setLoading(false)
    }
  }, [leadId, clinicId])

  useEffect(() => {
    if (leadId && clinicId) load()
  }, [leadId, clinicId, load])

  // Fire `clinic_profile_viewed` once per mount, only after the clinic
  // resolves successfully (so we don't track 404 / unauthorized views).
  const profileViewedRef = useRef(false)
  useEffect(() => {
    if (profileViewedRef.current) return
    if (!clinic || err) return
    profileViewedRef.current = true
    trackPatientEvent('clinic_profile_viewed', {
      lead_id: leadId,
      clinic_id: clinic.id,
      partner_tier: clinic.partner_tier || 'standard',
      placement_label: clinic.placement_label || null,
    })
  }, [clinic, err, leadId])

  const isThisClinicSelected =
    !!selection?.selected_clinic_id && selection.selected_clinic_id === clinicId
  const hasAnySelection = !!selection?.selected_clinic_id

  const handleSubmitted = useCallback(
    (selectedClinicId: string, clinicName: string) => {
      setSelection((prev) => ({
        lead_id: leadId,
        has_request: true,
        selected_clinic_id: selectedClinicId,
        selected_clinic_request_id: prev?.selected_clinic_request_id ?? null,
        clinic_selection_source: prev?.clinic_selection_source ?? 'clinic_profile',
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

  // Container width varies by tier: premium gets the widest editorial width.
  // R1 sticky sidebar needs ~320px on lg+, so we bump every tier to ensure
  // the main column stays comfortable. Mobile is unchanged.
  const tier = clinic ? resolveTier(clinic) : 'standard'
  const containerCls =
    tier === 'premium' ? 'max-w-6xl' : tier === 'featured' ? 'max-w-5xl' : 'max-w-5xl'

  return (
    <main className="min-h-screen bg-[#FCFAF8] overflow-x-hidden relative" data-testid="clinic-profile-page">
      {/* Warm ivory backdrop + soft teal blobs */}
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

      <section className="relative pt-24 pb-16 md:pt-28 md:pb-24">
        <div className={`${containerCls} mx-auto px-4 sm:px-6 lg:px-8`}>
          <Link
            href={`/results/${leadId}/clinics`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-6 transition-colors"
            data-testid="profile-back-link"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад към препоръчаните клиники
          </Link>

          {loading ? (
            <ProfileSkeleton />
          ) : err ? (
            <ProfileErrorPanel kind={err} leadId={leadId} onRetry={load} />
          ) : clinic ? (
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
              <ProfileBody
                clinic={clinic}
                leadId={leadId}
                isThisSelected={isThisClinicSelected}
                hasAnySelection={hasAnySelection}
                selection={selection}
                onOpenModal={() => {
                  if (!clinic) return
                  trackPatientEvent('request_call_modal_opened', {
                    lead_id: leadId,
                    clinic_id: clinic.id,
                    source: 'clinic_profile',
                    partner_tier: clinic.partner_tier || 'standard',
                    placement_label: clinic.placement_label || null,
                  })
                  setModalOpen(true)
                }}
              />
              <ClinicDecisionSidebar
                clinic={clinic}
                leadId={leadId}
                isThisSelected={isThisClinicSelected}
                hasAnySelection={hasAnySelection}
                onOpenModal={() => {
                  if (!clinic) return
                  trackPatientEvent('request_call_modal_opened', {
                    lead_id: leadId,
                    clinic_id: clinic.id,
                    source: 'clinic_profile',
                    partner_tier: clinic.partner_tier || 'standard',
                    placement_label: clinic.placement_label || null,
                  })
                  setModalOpen(true)
                }}
              />
            </div>
          ) : null}
        </div>
      </section>

      {modalOpen && clinic && (
        <RequestCallModal
          leadId={leadId}
          clinic={{ id: clinic.id, name: clinic.name, city_name: clinic.city_name }}
          source="clinic_profile"
          partnerTier={clinic.partner_tier || 'standard'}
          placementLabel={clinic.placement_label || null}
          initialContact={getStoredLeadContact(leadId)}
          onClose={() => setModalOpen(false)}
          onSuccess={(resp) => {
            handleSubmitted(resp.clinic.id, resp.clinic.name || clinic.name)
          }}
        />
      )}

      <Footer />
    </main>
  )
}

/* ──────────────── Profile body (tier-aware) ──────────────── */

function ProfileBody({
  clinic,
  leadId,
  isThisSelected,
  hasAnySelection,
  selection,
  onOpenModal,
}: {
  clinic: RecommendedClinic
  leadId: string
  isThisSelected: boolean
  hasAnySelection: boolean
  selection: SelectionState | null
  onOpenModal: () => void
}) {
  const tier = resolveTier(clinic)
  const isPremium = tier === 'premium'
  const isFeatured = tier === 'featured'
  const isStandard = tier === 'standard'

  const showPlacement = !isStandard && !!clinic.placement_label

  return (
    <article
      className="space-y-6 md:space-y-8"
      data-testid="clinic-profile"
      data-tier={tier}
    >
      {/* Already-selected banner — visible on every tier when applicable. */}
      {hasAnySelection && selection?.clinic && (
        <div
          className="rounded-2xl ring-1 ring-emerald-200/70 bg-emerald-50/85 backdrop-blur-xl shadow-[0_10px_30px_-18px_rgba(5,150,105,0.35)] p-4 sm:p-5 flex items-start gap-3"
          data-testid="profile-already-selected-banner"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-900">
              {isThisSelected ? 'Заявката е изпратена' : 'Вече избрахте клиника'}
            </p>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              Заявката е изпратена към{' '}
              <strong>{selection.clinic.name}</strong>. Тя ще може да се свърже
              с вас според процеса си за обработка на заявки.
            </p>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────
          Premium: 2-column with media placeholder
          Featured & Standard: single-column compact header
      */}
      {isPremium ? (
        <PremiumHero
          clinic={clinic}
          showPlacement={showPlacement}
          onOpenPreview={onOpenModal}
          leadId={leadId}
          isThisSelected={isThisSelected}
          hasAnySelection={hasAnySelection}
        />
      ) : (
        <CompactHero
          clinic={clinic}
          showPlacement={showPlacement}
          onOpenPreview={onOpenModal}
          tier={tier}
          isThisSelected={isThisSelected}
          hasAnySelection={hasAnySelection}
        />
      )}

      {/* R1 — Mobile-only decision CTA card (desktop has sticky sidebar). */}
      <MobileDecisionStrip
        isThisSelected={isThisSelected}
        hasAnySelection={hasAnySelection}
        onOpenModal={onOpenModal}
      />

      {/* R1 — "Подходяща ли е тази клиника за мен?" decision-support panel */}
      <ClinicFitPanel clinic={clinic} />

      {/* ── Tab-based content layout (P0 text-density polish, Feb 2026)
          Replaces the previous long single-column scroll with 5 progressive-
          disclosure tabs. All section components are reused as-is — only the
          container changes. */}
      <ProfileTabs clinic={clinic} isPremium={isPremium} isFeatured={isFeatured} />

      {/* ── Bottom CTA (all tiers) ──────────────────────────── */}
      <section
        className="rounded-2xl bg-gradient-to-br from-teal-50/85 via-white/70 to-white/60 backdrop-blur-xl ring-1 ring-teal-100/70 shadow-[0_18px_50px_-22px_rgba(13,148,136,0.18)] p-6 sm:p-8"
        data-testid="profile-bottom-cta-row"
      >
        <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-4">
          Готови ли сте за следваща стъпка?
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <RequestCallCta
            isSelected={isThisSelected}
            hasAnySelection={hasAnySelection}
            onClick={onOpenModal}
            testid="profile-bottom-cta"
          />
          <Link
            href={`/results/${leadId}/clinics`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/65 backdrop-blur-xl ring-1 ring-white/80 text-slate-800 text-sm font-medium rounded-full hover:bg-white hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-14px_rgba(15,23,42,0.18)]"
            data-testid="profile-bottom-view-others"
          >
            <Compass className="w-4 h-4 text-teal-700" aria-hidden="true" />
            Виж другите препоръки
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-slate-500 leading-snug">
          Заявка може да изпратите само към една клиника.
        </p>
      </section>

      {/* ── Trust note ──────────────────────────────────────── */}
      <p
        className="text-[11px] text-slate-400 text-center leading-snug pt-2"
        data-testid="profile-trust-note"
      >
        Zubite не поставя диагноза и не заменя преглед при лекар.
      </p>
    </article>
  )
}

/* ──────────────── Tab container (P0 text-density polish, Feb 2026) ────────────────
   Accessible 5-tab structure (semantic buttons + ARIA + roving-tabindex friendly)
   that wraps existing section components. The tabs are the primary content
   navigation. Mobile fallback: horizontal scrollable tab list. Each TabPanel
   keeps the original data-testids of its child sections intact so existing
   integrations (analytics, tests, deep links) keep working. */

type TabKey = 'overview' | 'services' | 'process' | 'care-pass' | 'questions'

function ProfileTabs({
  clinic,
  isPremium,
  isFeatured,
}: {
  clinic: RecommendedClinic
  isPremium: boolean
  isFeatured: boolean
}) {
  const [active, setActive] = useState<TabKey>('overview')

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'overview',  label: 'Обобщение',                icon: <Building2 className="w-3.5 h-3.5" /> },
    { key: 'services',  label: 'Услуги',                   icon: <Stethoscope className="w-3.5 h-3.5" /> },
    { key: 'process',   label: 'Как работи консултацията', icon: <Footprints className="w-3.5 h-3.5" /> },
    { key: 'care-pass', label: 'Care Pass',                icon: <Sparkle className="w-3.5 h-3.5" /> },
    { key: 'questions', label: 'Въпроси',                  icon: <MessagesSquare className="w-3.5 h-3.5" /> },
  ]

  const tabBtn = (t: (typeof tabs)[number]) => {
    const isActive = t.key === active
    return (
      <button
        key={t.key}
        type="button"
        role="tab"
        id={`profile-tab-${t.key}`}
        aria-selected={isActive}
        aria-controls={`profile-tabpanel-${t.key}`}
        tabIndex={isActive ? 0 : -1}
        onClick={() => setActive(t.key)}
        className={
          'inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-full text-[13px] font-medium transition-all ' +
          (isActive
            ? 'bg-slate-900 text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.45)]'
            : 'bg-white/55 backdrop-blur-md ring-1 ring-white/70 text-slate-700 hover:bg-white/80 hover:text-slate-900')
        }
        data-testid={`profile-tab-${t.key}`}
      >
        {t.icon}
        {t.label}
      </button>
    )
  }

  return (
    <section data-testid="profile-tabs-container">
      {/* Tab list — sticky on mobile under the hero so the user can switch
          tabs without scrolling back. Horizontal scroll on small screens. */}
      <div
        role="tablist"
        aria-label="Информация за клиниката"
        className="sticky top-[68px] z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-[#FCFAF8]/85 backdrop-blur-xl flex gap-2 overflow-x-auto scrollbar-hide"
        data-testid="profile-tablist"
      >
        {tabs.map(tabBtn)}
      </div>

      {/* Tab panels — only the active one is in the DOM tree to keep the page
          light and to honor the spec ('default view = clarity'). */}
      <div className="mt-6">
        {active === 'overview' && (
          <div
            id="profile-tabpanel-overview"
            role="tabpanel"
            aria-labelledby="profile-tab-overview"
            className="space-y-6"
            data-testid="profile-tabpanel-overview"
          >
            {/* Why this clinic appeared — always relevant on overview. */}
            <section
              className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
              data-testid="profile-reason-section"
            >
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-3">
                Защо виждате тази клиника
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">{clinic.reason}</p>
              <details className="mt-3 group/reason">
                <summary className="list-none inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 cursor-pointer select-none hover:text-teal-800">
                  Прочети повече за насочването
                  <ChevronDown className="w-3 h-3 transition-transform group-open/reason:rotate-180" />
                </summary>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Препоръката е базирана на наличната партньорска информация,
                  града и типа на заявката. Zubite.bg не поставя диагноза.
                </p>
              </details>
            </section>

            {/* Zubite Clinic Standard — patient-facing trust block. */}
            <ClinicStandardMiniNote testId="profile-clinic-standard-note" />

            {/* About / patient_intro / clinic_story — collapsed by default */}
            {(isPremium || isFeatured) && (
              <ClinicAboutBlock clinic={clinic} isPremium={isPremium} />
            )}

            {/* Premium-only rich sections (collapsed disclosures to keep
                density low). Each renders only if there's real content. */}
            {isPremium && <PremiumOverviewExtras clinic={clinic} />}

            {/* Featured-only placeholder (kept for parity, compact). */}
            {isFeatured && !clinic.clinic_profile?.patient_intro && !clinic.clinic_profile?.short_description && (
              <PlaceholderSection
                testid="profile-featured-extra-placeholder"
                tierLabel="featured"
                title="Допълнителна информация от клиниката"
                icon={<Sparkle className="w-4 h-4 text-teal-700" />}
                body="Клиниката може да добави повече информация за пациентите тук."
              />
            )}
          </div>
        )}

        {active === 'services' && (
          <div
            id="profile-tabpanel-services"
            role="tabpanel"
            aria-labelledby="profile-tab-services"
            className="space-y-6"
            data-testid="profile-tabpanel-services"
          >
            {/* Подходяща за — chips */}
            <section
              className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
              data-testid="profile-treatments-section"
            >
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-3">
                Подходяща за
              </h2>
              {(() => {
                const list = (clinic.treatments_supported && clinic.treatments_supported.length > 0)
                  ? clinic.treatments_supported
                  : (clinic.treatments || [])
                return list.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {list.map((t) => (
                      <li
                        key={t}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 text-xs"
                      >
                        {TREATMENT_LABELS[t] || t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    className="text-sm text-slate-600 leading-relaxed"
                    data-testid="profile-treatments-empty"
                  >
                    Информацията за конкретните направления ще бъде потвърдена при разговор.
                  </p>
                )
              })()}
              {clinic.partner_since_year && (
                <p className="mt-4 text-xs text-slate-500 inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Партньор на Zubite от {clinic.partner_since_year}
                </p>
              )}
            </section>

            {/* Aligner brands (only when populated) */}
            {clinic.aligner_brands_supported && clinic.aligner_brands_supported.length > 0 && (
              <section
                className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
                data-testid="profile-aligner-brands-section"
              >
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-3">
                  Алайнер системи
                </h2>
                <AlignerBrandChips chips={clinic.aligner_brands_supported} layout="profile" />
                <details className="mt-3 group/brands">
                  <summary className="list-none inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 cursor-pointer select-none hover:text-teal-800">
                    Какво означават етикетите?
                    <ChevronDown className="w-3 h-3 transition-transform group-open/brands:rotate-180" />
                  </summary>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Етикет със знак за верификация означава администраторски потвърден статус.
                  </p>
                </details>
              </section>
            )}

            {/* Trust signals — service-credibility chips */}
            <TrustSignalsSection clinic={clinic} />

            {/* Approved patient reviews */}
            <PublicReviewsSection clinicId={clinic.id} />
          </div>
        )}

        {active === 'process' && (
          <div
            id="profile-tabpanel-process"
            role="tabpanel"
            aria-labelledby="profile-tab-process"
            className="space-y-6"
            data-testid="profile-tabpanel-process"
          >
            <PostRequestTimeline />

            {/* Clinic-defined consultation_process (Premium with real content) */}
            {isPremium && clinic.clinic_profile?.consultation_process && (
              <section
                className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
                data-testid="profile-consultation-process-section"
              >
                <h2 className="font-serif text-lg font-semibold text-slate-900 mb-3">
                  Процес на консултация
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line line-clamp-3 group-open:line-clamp-none">
                  {clinic.clinic_profile.consultation_process}
                </p>
                <details className="mt-3 group/process">
                  <summary className="list-none inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 cursor-pointer select-none hover:text-teal-800">
                    Прочети целия процес
                    <ChevronDown className="w-3 h-3 transition-transform group-open/process:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {clinic.clinic_profile.consultation_process}
                  </p>
                </details>
              </section>
            )}

            {/* Premium fallback patient-journey placeholder */}
            {isPremium && !clinic.clinic_profile?.consultation_process && <PatientJourneySection />}
          </div>
        )}

        {active === 'care-pass' && (
          <div
            id="profile-tabpanel-care-pass"
            role="tabpanel"
            aria-labelledby="profile-tab-care-pass"
            className="space-y-6"
            data-testid="profile-tabpanel-care-pass"
          >
            <CarePassPanel
              variant="full"
              showLearnMore
              testid="profile-care-pass-section"
            />
            <section
              className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
              data-testid="profile-care-pass-how"
            >
              <h3 className="font-serif text-lg font-semibold text-slate-900 mb-2">
                Как работи Care Pass?
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                След проведена консултация чрез Zubite.bg, клиниката ти предоставя Zubite Care Pass с отстъпки за продукти за орална хигиена.
              </p>
              <details className="mt-3 group/cp-faq">
                <summary className="list-none inline-flex items-center gap-1 text-[12px] font-medium text-teal-700 cursor-pointer select-none hover:text-teal-800">
                  Какво НЕ е Care Pass?
                  <ChevronDown className="w-3 h-3 transition-transform group-open/cp-faq:rotate-180" />
                </summary>
                <ul className="mt-2 text-xs text-slate-600 leading-relaxed list-disc pl-5 space-y-0.5">
                  <li>Не е отстъпка от лечение.</li>
                  <li>Не е застрахователен продукт.</li>
                  <li>Не е абонамент или членство.</li>
                  <li>Не е безплатно лечение.</li>
                </ul>
              </details>
            </section>
          </div>
        )}

        {active === 'questions' && (
          <div
            id="profile-tabpanel-questions"
            role="tabpanel"
            aria-labelledby="profile-tab-questions"
            data-testid="profile-tabpanel-questions"
          >
            <ClinicFAQSection />
          </div>
        )}
      </div>
    </section>
  )
}

/* ── Compact about block (collapsed by default) ───────────────── */
function ClinicAboutBlock({ clinic, isPremium }: { clinic: RecommendedClinic; isPremium: boolean }) {
  const intro = clinic.clinic_profile?.patient_intro || clinic.clinic_profile?.short_description
  const story = clinic.clinic_profile?.clinic_story
  if (!intro && !story) {
    return null
  }
  // Short visible summary = first sentence (up to ~140 chars). Long body is
  // available via expandable disclosure so we never delete content, only
  // layer it.
  const visible = (intro || story || '').split(/(?<=[.!?])\s+/)[0].slice(0, 140)
  const full = [intro, isPremium ? story : null].filter(Boolean).join('\n\n')
  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
      data-testid="profile-about-section"
    >
      <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-3">
        За клиниката
      </h2>
      <p className="text-base text-slate-700 leading-relaxed">{visible}{visible.length === 140 ? '…' : ''}</p>
      {full.length > visible.length && (
        <details className="mt-3 group/about">
          <summary className="list-none inline-flex items-center gap-1 text-[12px] font-medium text-teal-700 cursor-pointer select-none hover:text-teal-800">
            Прочети повече
            <ChevronDown className="w-3 h-3 transition-transform group-open/about:rotate-180" />
          </summary>
          <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line border-t border-slate-200/60 pt-3">
            {full}
          </p>
        </details>
      )}
    </section>
  )
}

/* ── Premium overview extras (case library, doctor, environment) ─ */
function PremiumOverviewExtras({ clinic }: { clinic: RecommendedClinic }) {
  return (
    <>
      {/* Case library */}
      {clinic.clinic_profile?.case_library && clinic.clinic_profile.case_library.length > 0 ? (
        <section
          className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
          data-testid="profile-case-library-section"
        >
          <h2 className="font-serif text-lg font-semibold text-slate-900 mb-3">
            Случаи от практиката
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {clinic.clinic_profile.case_library.slice(0, 4).map((c) => (
              <details
                key={c.id || c.title}
                className="group/case rounded-xl ring-1 ring-slate-200/60 bg-white/70 p-4"
                data-testid={`profile-case-${c.id || c.title}`}
              >
                <summary className="list-none cursor-pointer select-none">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                    {c.category}
                  </div>
                  <div className="font-medium text-slate-900 text-sm leading-snug">{c.title}</div>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium group-open/case:hidden">
                    Виж подробности <ChevronDown className="w-3 h-3" />
                  </span>
                </summary>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {c.summary}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : (
        <CaseLibrarySection />
      )}

      {/* Doctor spotlight */}
      {clinic.clinic_profile?.doctor_spotlight_name ? (
        <section
          className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
          data-testid="profile-doctor-spotlight-section"
        >
          <h2 className="font-serif text-lg font-semibold text-slate-900 mb-3">Лекарят</h2>
          <div className="font-medium text-slate-900">{clinic.clinic_profile.doctor_spotlight_name}</div>
          {clinic.clinic_profile.doctor_spotlight_role && (
            <div className="text-sm text-slate-500 mt-0.5">{clinic.clinic_profile.doctor_spotlight_role}</div>
          )}
          {clinic.clinic_profile.doctor_spotlight_bio && (
            <details className="mt-3 group/doc">
              <summary className="list-none inline-flex items-center gap-1 text-[12px] font-medium text-teal-700 cursor-pointer select-none hover:text-teal-800">
                Прочети био
                <ChevronDown className="w-3 h-3 transition-transform group-open/doc:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {clinic.clinic_profile.doctor_spotlight_bio}
              </p>
            </details>
          )}
          {clinic.clinic_profile.doctor_video_url && (
            <video
              src={clinic.clinic_profile.doctor_video_url}
              controls
              className="mt-4 w-full rounded-xl aspect-video bg-slate-100"
            />
          )}
        </section>
      ) : (
        <DoctorSpotlightSection />
      )}

      {/* Environment — collapsed */}
      {clinic.clinic_profile?.environment_description ? (
        <section
          className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
          data-testid="profile-environment-section"
        >
          <details className="group/env">
            <summary className="list-none cursor-pointer flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Среда и оборудване</h2>
              <ChevronDown className="w-4 h-4 text-teal-700 transition-transform group-open/env:rotate-180" />
            </summary>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line border-t border-slate-200/60 pt-3">
              {clinic.clinic_profile.environment_description}
            </p>
          </details>
        </section>
      ) : (
        <PlaceholderSection
          testid="profile-environment-section"
          tierLabel="premium"
          title="Среда и оборудване"
          icon={<Stethoscope className="w-4 h-4 text-teal-700" />}
          body="Клиниката може да представи средата и технологиите тук."
        />
      )}

      {/* Optional Zubite feedback placeholder (no real data yet) */}
      <ZubiteFeedbackPlaceholderSection />
    </>
  )
}

/* ──────────────── Hero variants ──────────────── */

function CompactHero({
  clinic,
  showPlacement,
  onOpenPreview,
  tier,
  isThisSelected,
  hasAnySelection,
}: {
  clinic: RecommendedClinic
  showPlacement: boolean
  onOpenPreview: () => void
  tier: 'featured' | 'standard'
  isThisSelected: boolean
  hasAnySelection: boolean
}) {
  return (
    <header
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-8"
      data-testid="profile-header"
    >
      <div className="w-12 h-12 rounded-xl bg-teal-50/90 ring-1 ring-teal-100 grid place-items-center mb-4">
        <Building2 className="w-6 h-6 text-teal-700" />
      </div>

      {showPlacement && (
        <div className="mb-3">
          <PlacementBadge
            tier={tier as 'featured'}
            label={clinic.placement_label as string}
          />
        </div>
      )}

      <h1
        className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight"
        data-testid="profile-clinic-name"
      >
        {clinic.name}
      </h1>
      <p className="mt-1 text-sm text-slate-500 inline-flex items-center gap-1.5">
        <MapPin className="w-4 h-4" />
        {clinic.city_name}
      </p>
      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        Профил на партньорска клиника в Zubite
      </p>

      {showPlacement && clinic.placement_disclosure && (
        <p
          className="mt-3 text-xs text-slate-500 leading-relaxed"
          data-testid="profile-placement-disclosure"
        >
          {clinic.placement_disclosure}
        </p>
      )}

      <div className="mt-6">
        <RequestCallCta
          isSelected={isThisSelected}
          hasAnySelection={hasAnySelection}
          onClick={onOpenPreview}
          testid="profile-top-cta"
        />
      </div>
    </header>
  )
}

function PremiumHero({
  clinic,
  showPlacement,
  onOpenPreview,
  leadId,
  isThisSelected,
  hasAnySelection,
}: {
  clinic: RecommendedClinic
  showPlacement: boolean
  onOpenPreview: () => void
  leadId: string
  isThisSelected: boolean
  hasAnySelection: boolean
}) {
  return (
    <header
      className="rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-white/75 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] p-6 sm:p-8 md:p-10"
      data-testid="profile-header"
    >
      <div className="grid lg:grid-cols-[1.1fr,1fr] gap-8 lg:gap-12 items-stretch">
        {/* Left column — copy + CTAs */}
        <div className="flex flex-col">
          <div className="w-12 h-12 rounded-xl bg-teal-50/90 ring-1 ring-teal-100 grid place-items-center mb-5">
            <Building2 className="w-6 h-6 text-teal-700" />
          </div>

          {showPlacement && (
            <div className="mb-3">
              <PlacementBadge
                tier="premium"
                label={clinic.placement_label as string}
              />
            </div>
          )}

          <h1
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight tracking-tight"
            data-testid="profile-clinic-name"
          >
            {clinic.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500 inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {clinic.city_name}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-teal-700 font-semibold">
            Профил на партньорска клиника в Zubite
          </p>

          <p className="mt-5 text-sm sm:text-base text-slate-700 leading-relaxed max-w-xl">
            {clinic.reason}
          </p>

          {showPlacement && clinic.placement_disclosure && (
            <p
              className="mt-4 text-xs text-slate-500 leading-relaxed max-w-xl"
              data-testid="profile-placement-disclosure"
            >
              {clinic.placement_disclosure}
            </p>
          )}

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <RequestCallCta
              isSelected={isThisSelected}
              hasAnySelection={hasAnySelection}
              onClick={onOpenPreview}
              testid="profile-top-cta"
            />
            <Link
              href={`/results/${leadId}/clinics`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/65 backdrop-blur-xl ring-1 ring-white/80 text-slate-800 text-sm font-medium rounded-full hover:bg-white hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-14px_rgba(15,23,42,0.18)]"
              data-testid="profile-top-back"
            >
              Назад към препоръките
            </Link>
          </div>

          <p className="mt-5 text-[11px] text-slate-400 leading-snug max-w-md">
            Zubite не поставя диагноза. Целта на профила е по-информирана
            следваща стъпка.
          </p>
        </div>

        {/* Right column — real hero image if admin published one,
            otherwise existing placeholder. */}
        {clinic.clinic_profile?.hero_image_url ? (
          <figure
            className="relative rounded-2xl overflow-hidden bg-slate-50 ring-1 ring-white/70 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] min-h-[260px] lg:min-h-[420px]"
            data-testid="profile-clinic-hero-image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clinic.clinic_profile.hero_image_url}
              alt={clinic.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </figure>
        ) : (
          <ClinicImagePlaceholder />
        )}
      </div>
    </header>
  )
}

/* ──────────────── Media placeholders (Premium only) ──────────────── */

function ClinicImagePlaceholder() {
  return (
    <figure
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-100/60 via-cyan-50/40 to-white ring-1 ring-white/70 min-h-[260px] lg:min-h-[420px] flex flex-col items-center justify-center"
      data-testid="profile-clinic-image-placeholder"
    >
      <div className="w-14 h-14 rounded-full bg-white/85 backdrop-blur grid place-items-center mb-3 shadow-sm ring-1 ring-teal-100">
        <ImageIcon className="w-6 h-6 text-teal-700" aria-hidden="true" />
      </div>
      <figcaption className="text-center px-6">
        <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-teal-700 font-semibold mb-1">
          Снимка на клиниката
        </p>
        <p className="text-xs text-slate-500 leading-relaxed max-w-[260px] mx-auto">
          Клиниката все още не е добавила снимка към профила си.
        </p>
      </figcaption>
    </figure>
  )
}

function VideoIntroSection() {
  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-8"
      data-testid="profile-video-section"
    >
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900">
          Видео представяне
        </h2>
        <TierLabel tier="premium" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
        <VideoPlaceholderCard
          testid="profile-video-clinic"
          title="Видео от клиниката"
          body="Тук клиниката ще може да добави кратко видео представяне на средата и начина на работа."
        />
        <VideoPlaceholderCard
          testid="profile-video-doctor"
          title="Видео обръщение от водещ лекар"
          body="Тук водещ лекар от клиниката ще може да обясни подхода към първата консултация."
        />
      </div>
    </section>
  )
}

function VideoPlaceholderCard({
  title,
  body,
  testid,
}: {
  title: string
  body: string
  testid: string
}) {
  return (
    <div
      className="relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white border border-slate-200 min-h-[200px] flex flex-col items-center justify-center p-6 text-center"
      data-testid={testid}
      aria-label="Място за видео — не е добавено от клиниката"
    >
      <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur grid place-items-center mb-3 shadow-sm">
        <PlayCircle
          className="w-7 h-7 text-slate-400"
          aria-hidden="true"
          strokeWidth={1.5}
        />
      </div>
      <p className="font-serif text-sm font-semibold text-slate-800 mb-1">
        {title}
      </p>
      <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
        {body}
      </p>
      <p className="mt-3 text-[10px] tracking-[0.18em] uppercase text-slate-400 font-medium">
        Все още не е добавено
      </p>
    </div>
  )
}

/* ──────────────── Reusable placeholder section ──────────────── */

function PlaceholderSection({
  testid,
  title,
  body,
  icon,
  tierLabel,
}: {
  testid: string
  title: string
  body: string
  icon: React.ReactNode
  tierLabel: 'premium' | 'featured'
}) {
  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
      data-testid={testid}
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
            {icon}
          </span>
          {title}
        </h2>
        <TierLabel tier={tierLabel} />
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </section>
  )
}

/* ──────────────── Premium-only sections (P3.7) ────────────────
   These render ONLY for Premium-tier clinics. Each section includes
   a `Premium секция` tier label so the demo audience can see what
   commercial tier unlocks. Wording is strictly about PROFILE DEPTH /
   VISIBILITY — never clinical superiority.
   ─────────────────────────────────────────────────────────────── */

function CaseLibrarySection() {
  const cases = [
    {
      title: 'Алайнери',
      subtitle: 'Завършен случай',
      body: 'Очаква реално съдържание от клиниката.',
      testid: 'profile-case-card-aligners',
    },
    {
      title: 'Ортодонтско лечение',
      subtitle: 'Завършен случай',
      body: 'Очаква реално съдържание от клиниката.',
      testid: 'profile-case-card-orthodontics',
    },
    {
      title: 'Естетично лечение',
      subtitle: 'Завършен случай',
      body: 'Очаква реално съдържание от клиниката.',
      testid: 'profile-case-card-aesthetic',
    },
  ]
  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
      data-testid="profile-case-library-section"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
            <BookOpenCheck className="w-4 h-4 text-teal-700" aria-hidden="true" />
          </span>
          Библиотека със случаи
        </h2>
        <TierLabel tier="premium" />
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
        Тук Premium клиниката ще може да покаже завършени случаи, когато има
        разрешение за споделяне и съдържанието е одобрено.
      </p>

      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cases.map((c) => (
          <li
            key={c.testid}
            className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 flex flex-col min-h-[180px]"
            data-testid={c.testid}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] tracking-[0.18em] uppercase text-slate-400 font-medium">
                {c.subtitle}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] text-slate-500">
                Очаква съдържание
              </span>
            </div>
            <h3 className="font-serif text-base font-semibold text-slate-800 mb-1.5">
              {c.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">{c.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DoctorSpotlightSection() {
  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
      data-testid="profile-doctor-spotlight-section"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
            <UserCircle2 className="w-4 h-4 text-teal-700" aria-hidden="true" />
          </span>
          Водещ лекар / екип
        </h2>
        <TierLabel tier="premium" />
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
        Тук клиниката ще може да представи водещ лекар или екип, който работи
        по този тип случаи.
      </p>

      <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
        <div
          className="w-16 h-16 rounded-full bg-white border border-slate-200 grid place-items-center flex-shrink-0"
          aria-hidden="true"
          data-testid="profile-doctor-avatar-placeholder"
        >
          <UserCircle2 className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700 leading-snug">
            Информацията за екипа ще бъде добавена от клиниката.
          </p>
          <p className="mt-1 text-[10px] tracking-[0.18em] uppercase text-slate-400 font-medium">
            Все още не е добавено
          </p>
        </div>
      </div>
    </section>
  )
}

function PatientJourneySection() {
  const steps = [
    'Избирате клиника',
    'Потвърждавате телефон и съгласие',
    'Клиниката получава заявката',
    'Уточнявате следващата стъпка',
  ]
  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
      data-testid="profile-patient-journey-section"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
            <Footprints className="w-4 h-4 text-teal-700" aria-hidden="true" />
          </span>
          Как протича първата стъпка
        </h2>
        <TierLabel tier="premium" />
      </div>
      <p className="text-sm text-slate-700 leading-relaxed mb-6 max-w-3xl">
        След като заявите обаждане, клиниката ще получи вашата заявка през
        Zubite. След това ще може да се свърже с вас, за да уточни дали е
        подходящо да запазите консултация.
      </p>

      <ol
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        data-testid="profile-patient-journey-steps"
      >
        {steps.map((label, i) => (
          <li
            key={label}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex items-start gap-3"
          >
            <span className="w-7 h-7 rounded-full bg-white/85 ring-1 ring-teal-100 text-xs font-semibold text-teal-700 grid place-items-center flex-shrink-0 tabular-nums">
              {i + 1}
            </span>
            <span className="text-sm text-slate-700 leading-snug">{label}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ZubiteFeedbackPlaceholderSection() {
  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
      data-testid="profile-zubite-feedback-section"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
            <MessagesSquare className="w-4 h-4 text-teal-700" aria-hidden="true" />
          </span>
          Обратна връзка от пациенти през Zubite
        </h2>
        <TierLabel tier="premium" />
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4 max-w-3xl">
        Тук ще се показва структурирана обратна връзка от пациенти, които са
        минали през Zubite процеса, когато има достатъчно реални данни.
      </p>
      <div
        className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5"
        data-testid="profile-zubite-feedback-empty"
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Все още няма достатъчно данни за публично обобщение.
        </p>
      </div>
    </section>
  )
}



/* ──────────────── Subcomponents ──────────────── */

function PlacementBadge({
  tier,
  label,
}: {
  tier: 'premium' | 'featured'
  label: string
}) {
  const styles =
    tier === 'premium'
      ? 'bg-amber-50 text-amber-800 border-amber-100'
      : 'bg-slate-50 text-slate-700 border-slate-200'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium tracking-wide ${styles}`}
      data-testid={`profile-placement-${tier}`}
    >
      <Sparkle className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  )
}

/**
 * Small "this section exists because tier=X" label.
 * Critical for the demo so partners SEE what changes by tier.
 * Wording is deliberately about VISIBILITY/PROFILE DEPTH — never quality.
 */
function TierLabel({ tier }: { tier: 'premium' | 'featured' }) {
  const cfg =
    tier === 'premium'
      ? {
          title: 'Premium секция',
          body: 'Видимо за пациенти, защото клиниката е Premium партньор в Zubite.',
          cls: 'bg-amber-50 text-amber-800 border-amber-100',
        }
      : {
          title: 'Featured профил',
          body: 'Тази секция е видима, защото клиниката е представен партньор в Zubite.',
          cls: 'bg-slate-50 text-slate-700 border-slate-200',
        }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium tracking-wide ${cfg.cls}`}
      title={cfg.body}
      data-testid={`tier-label-${tier}`}
    >
      <Sparkle className="w-2.5 h-2.5" aria-hidden="true" />
      {cfg.title}
    </span>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" data-testid="profile-skeleton">
      <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 p-8">
        <div className="w-12 h-12 rounded-lg bg-slate-100/80 mb-4" />
        <div className="h-7 w-3/4 bg-slate-100/80 rounded mb-2" />
        <div className="h-4 w-1/3 bg-slate-100/80 rounded mb-6" />
        <div className="h-11 w-56 bg-slate-100/80 rounded-full" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 p-6"
        >
          <div className="h-5 w-1/2 bg-slate-100/80 rounded mb-3" />
          <div className="h-3 w-full bg-slate-100/80 rounded mb-2" />
          <div className="h-3 w-5/6 bg-slate-100/80 rounded" />
        </div>
      ))}
    </div>
  )
}

function ProfileErrorPanel({
  kind,
  leadId,
  onRetry,
}: {
  kind: Exclude<ErrKind, null>
  leadId: string
  onRetry: () => void
}) {
  const titleMap: Record<typeof kind, string> = {
    not_found: 'Не успяхме да намерим този резултат.',
    expired: 'Този резултат е изтекъл.',
    rate_limited: 'Твърде много заявки.',
    clinic_not_in_list: 'Тази клиника не е част от препоръките за този резултат.',
    generic: 'Възникна проблем при зареждането на профила.',
  }
  const bodyMap: Record<typeof kind, string> = {
    not_found:
      'Възможно е връзката, която следвахте, да е остаряла. Опитайте да попълните оценката отново.',
    expired:
      'Моля, попълнете оценката отново, за да получите нови препоръки.',
    rate_limited:
      'Изпратихте твърде много заявки за кратко време. Опитайте отново след малко.',
    clinic_not_in_list:
      'Препоръчаните клиники за този резултат не включват тази клиника. Върнете се към списъка с препоръки.',
    generic:
      'Опитайте отново или се върнете към списъка с препоръки.',
  }

  const showRestart = kind === 'not_found' || kind === 'expired'
  const showBackToList = kind === 'clinic_not_in_list' || kind === 'generic' || kind === 'rate_limited'

  return (
    <div
      className="rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] p-8"
      data-testid={`profile-error-${kind}`}
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
        {showRestart && (
          <Link
            href="/quiz"
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-all hover:-translate-y-0.5 shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            data-testid="profile-error-restart"
          >
            <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
            <span className="relative">Започни отново</span>
          </Link>
        )}
        {showBackToList && (
          <Link
            href={`/results/${leadId}/clinics`}
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-all hover:-translate-y-0.5 shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            data-testid="profile-error-back-to-list"
          >
            <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
            <span className="relative">Назад към препоръките</span>
          </Link>
        )}
        {kind === 'rate_limited' && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/65 backdrop-blur-xl ring-1 ring-white/80 text-slate-700 text-sm font-medium rounded-full hover:bg-white transition-all shadow-[0_8px_24px_-14px_rgba(15,23,42,0.18)]"
            data-testid="profile-error-retry"
          >
            <Loader2 className="w-4 h-4" />
            Опитай отново
          </button>
        )}
      </div>
    </div>
  )
}

function NextStepModal_DEPRECATED_REMOVED() {
  // The preview-only modal has been replaced by `RequestCallModal` in P4.
  // Keeping a stub so historical anchors referencing this name compile.
  return null
}



/**
 * Tier-agnostic CTA used in the hero(s) and the bottom CTA row.
 * Renders one of THREE visual states based on lead selection:
 *   • not yet selected → primary "Искам обаждане от тази клиника"
 *   • THIS clinic selected → green confirmation pill
 *   • SOME OTHER clinic selected → disabled "Вече избрахте клиника"
 */
function RequestCallCta({
  isSelected,
  hasAnySelection,
  onClick,
  testid,
}: {
  isSelected: boolean
  hasAnySelection: boolean
  onClick: () => void
  testid: string
}) {
  if (isSelected) {
    return (
      <div
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50/85 backdrop-blur-md ring-1 ring-emerald-100 text-emerald-800 text-sm font-medium rounded-full"
        data-testid={`${testid}-submitted`}
      >
        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
        Заявката е изпратена
      </div>
    )
  }
  if (hasAnySelection) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100/80 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed"
        data-testid={`${testid}-disabled`}
      >
        Вече избрахте клиника
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium transition-all hover:-translate-y-0.5 shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
      data-testid={testid}
    >
      <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
      <span className="relative">Искам обаждане от тази клиника</span>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   Clinic Profile Engagement R1 — decision-support sections
   ───────────────────────────────────────────────────────────── */

/* Sticky decision sidebar (desktop only) */
function ClinicDecisionSidebar({
  clinic,
  leadId,
  isThisSelected,
  hasAnySelection,
  onOpenModal,
}: {
  clinic: RecommendedClinic
  leadId: string
  isThisSelected: boolean
  hasAnySelection: boolean
  onOpenModal: () => void
}) {
  const tier = resolveTier(clinic)
  const treatmentList =
    (clinic.treatments_supported && clinic.treatments_supported.length > 0
      ? clinic.treatments_supported
      : clinic.treatments) || []
  return (
    <aside
      className="hidden lg:block lg:sticky lg:top-24 self-start"
      data-testid="profile-decision-sidebar"
    >
      <div className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_14px_40px_-22px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.85)] overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-200/40">
          {tier !== 'standard' && clinic.placement_label && (
            <div className="mb-2">
              <TierLabel tier={tier as 'premium' | 'featured'} />
            </div>
          )}
          <h3 className="font-serif text-base font-semibold text-slate-900 leading-tight">
            {clinic.name}
          </h3>
          {clinic.city_name && (
            <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {clinic.city_name}
            </p>
          )}
        </div>

        {treatmentList.length > 0 && (
          <div className="px-5 py-4 border-b border-slate-200/40">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Подходяща за
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {treatmentList.slice(0, 5).map((t) => (
                <li
                  key={t}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 text-[11px]"
                >
                  {TREATMENT_LABELS[t] || t}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-5 py-4 space-y-2.5">
          <RequestCallCta
            isSelected={isThisSelected}
            hasAnySelection={hasAnySelection}
            onClick={onOpenModal}
            testid="profile-sidebar-cta"
          />
          <Link
            href={`/results/${leadId}/clinics`}
            className="inline-flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
            data-testid="profile-sidebar-back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Назад към препоръчаните клиники
          </Link>
        </div>

        <div className="relative px-5 py-3 overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse 80% 100% at 100% 0%, rgba(20,184,166,0.28) 0%, transparent 70%),' +
              'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
          }}
        >
          <p className="text-[11px] text-slate-200 leading-relaxed inline-flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300 flex-shrink-0 mt-0.5" />
            <span>
              След посетена консултация през Zubite.bg клиниката ще ви
              предостави <strong className="text-teal-100">Zubite Care Pass</strong>{' '}
              — отстъпки за продукти за орална хигиена.
            </span>
          </p>
        </div>
      </div>
    </aside>
  )
}

/* "Подходяща ли е тази клиника за мен?" panel */
function ClinicFitPanel({ clinic }: { clinic: RecommendedClinic }) {
  const treatmentList =
    (clinic.treatments_supported && clinic.treatments_supported.length > 0
      ? clinic.treatments_supported
      : clinic.treatments) || []
  const treatmentLabels = treatmentList
    .slice(0, 4)
    .map((t) => TREATMENT_LABELS[t] || t)
    .join(', ')

  return (
    <section
      className="rounded-2xl bg-gradient-to-br from-teal-50/65 via-white/70 to-white/60 backdrop-blur-xl ring-1 ring-teal-100/70 shadow-[0_14px_40px_-22px_rgba(13,148,136,0.18)] p-5 sm:p-6"
      data-testid="profile-fit-panel"
    >
      <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-1">
        Подходяща ли е тази клиника за мен?
      </h2>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Ето какво знаем за клиниката, за да прецените сами дали е подходяща
        опция за вашия случай.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FitCard
          label="Лечение / фокус"
          value={
            treatmentLabels ||
            'Конкретните направления ще бъдат потвърдени при разговор.'
          }
          testid="fit-card-treatments"
        />
        <FitCard
          label="Град / достъпност"
          value={clinic.city_name || 'Града ще бъде потвърден от клиниката.'}
          testid="fit-card-city"
        />
        <FitCard
          label="Тип заявка"
          value="Безплатно първо обаждане от клиниката за уточняване на следваща стъпка."
          testid="fit-card-request-type"
        />
        <FitCard
          label="Следваща стъпка"
          value={
            clinic.response_expectation ||
            'Клиниката ще се свърже с вас според процеса си за обработка на заявки.'
          }
          testid="fit-card-next-step"
        />
      </div>
      <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
        Може да е подходяща опция, ако търсите{' '}
        {treatmentLabels ? <span className="text-slate-700">{treatmentLabels.toLowerCase()}</span> : 'обща стоматологична консултация'}
        {clinic.city_name ? <> в {clinic.city_name}</> : null}. Препоръката
        е базирана на партньорската информация — Zubite не поставя диагноза.
      </p>
    </section>
  )
}

function FitCard({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div
      className="rounded-xl bg-white/65 backdrop-blur-md ring-1 ring-white/75 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.18)] p-3.5"
      data-testid={testid}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </p>
      <p className="text-sm text-slate-700 leading-snug">{value}</p>
    </div>
  )
}

/* "Какво се случва след заявката?" 3-step timeline */
function PostRequestTimeline() {
  const steps = [
    {
      title: 'Изпращате заявка',
      body: 'Потвърждавате телефона си и Zubite споделя заявката с клиниката.',
    },
    {
      title: 'Клиниката се свързва с вас',
      body: 'Клиниката ще ви се обади според процеса си за обработка на заявки.',
    },
    {
      title: 'Посещавате консултация',
      body: 'След посетена консултация клиниката ви предоставя Zubite Care Pass.',
    },
  ]
  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
      data-testid="profile-post-request-timeline"
    >
      <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-1">
        Какво се случва след заявката?
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        Прозрачен 3-стъпков процес — без автоматични обаждания от Zubite.
      </p>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="flex gap-3 items-start"
            data-testid={`timeline-step-${i + 1}`}
          >
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-50 text-teal-700 font-semibold text-sm flex items-center justify-center ring-1 ring-teal-100">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{s.title}</p>
              <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                {s.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-[11px] text-slate-500 leading-relaxed inline-flex items-start gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
        <span>
          Zubite не поставя диагноза и не заменя преглед при лекар.
        </span>
      </p>
    </section>
  )
}

/* "Сигнали за доверие" — uses real available data only */
function TrustSignalsSection({ clinic }: { clinic: RecommendedClinic }) {
  type Item = { key: string; label: string; value: string }
  const items: Item[] = []

  const sources = clinic.review_signals?.sources || []
  for (const src of sources) {
    const platformLabel: Record<string, string> = {
      google: 'Google ревюта',
      facebook: 'Facebook ревюта',
      superdoc: 'Superdoc ревюта',
    }
    const label = platformLabel[src.platform] || `${src.platform} ревюта`
    const rating =
      typeof src.rating === 'number' && src.rating > 0
        ? `${src.rating.toFixed(1)} ★`
        : ''
    const count = src.review_count > 0 ? `${src.review_count.toLocaleString('bg-BG')} мнения` : ''
    const value = [rating, count].filter(Boolean).join(' · ') || 'Налично'
    items.push({ key: `review-${src.platform}`, label, value })
  }

  const caseCount = clinic.clinic_profile?.case_library?.length || 0
  if (caseCount > 0) {
    items.push({
      key: 'case-library',
      label: 'Добавени пациентски случаи',
      value: `${caseCount} ${caseCount === 1 ? 'случай' : 'случая'}`,
    })
  }

  if (clinic.clinic_profile?.profile_status === 'published') {
    items.push({
      key: 'published-profile',
      label: 'Публикуван профил',
      value: 'Партньорска информация е потвърдена в Zubite',
    })
  }

  if (clinic.partner_since_year) {
    items.push({
      key: 'partner-since',
      label: 'Партньор на Zubite от',
      value: String(clinic.partner_since_year),
    })
  }

  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
      data-testid="profile-trust-signals-section"
    >
      <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-1">
        Сигнали за доверие
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Използваме само налична партньорска информация — без измислени отзиви.
      </p>
      {items.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((it) => (
            <li
              key={it.key}
              className="rounded-xl bg-teal-50/55 backdrop-blur-md ring-1 ring-teal-100/70 p-3.5"
              data-testid={`trust-signal-${it.key}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                {it.label}
              </p>
              <p className="text-sm text-slate-800 font-medium">{it.value}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="text-sm text-slate-600 leading-relaxed"
          data-testid="profile-trust-signals-empty"
        >
          Все още няма добавени review сигнали за тази клиника.
        </p>
      )}
      {clinic.review_signals?.disclaimer && (
        <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
          {clinic.review_signals.disclaimer}
        </p>
      )}
    </section>
  )
}

/* FAQ accordion (local React state, no new deps) */
function ClinicFAQSection() {
  const items = [
    {
      q: 'Какво става след като изпратя заявка?',
      a: 'Клиниката получава вашата заявка и ще се свърже с вас според своя процес за обработка. Zubite не извършва автоматични обаждания.',
    },
    {
      q: 'Zubite избира ли клиниката вместо мен?',
      a: 'Не. Zubite ви помага с яснота и насочване — изборът е изцяло ваш. Ако не сте сигурни, може да поискате помощ при избор от Zubite.',
    },
    {
      q: 'Получавам ли Care Pass?',
      a: 'Zubite Care Pass се предоставя от клиниката след реално посетена консултация, заявена през Zubite.bg. Картата носи партньорски ползи — например отстъпки от марки за орална хигиена.',
    },
    {
      q: 'Това диагноза ли е?',
      a: 'Не. Zubite не поставя диагноза и не заменя преглед при лекар. Целта е да направите по-ясна следваща стъпка.',
    },
    {
      q: 'Мога ли да се върна към другите клиники?',
      a: 'Да. Може да разгледате до 3 препоръчани клиники, преди да изберете от коя да поискате обаждане.',
    },
  ]

  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-7"
      data-testid="profile-faq-section"
    >
      <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-4">
        Често задавани въпроси
      </h2>
      <ul className="divide-y divide-slate-100">
        {items.map((it, i) => {
          const open = openIdx === i
          return (
            <li key={it.q} className="py-2">
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-3 py-2 text-left"
                data-testid={`faq-question-${i}`}
              >
                <span className="text-sm font-medium text-slate-900">
                  {it.q}
                </span>
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center transition-transform ${open ? 'rotate-45' : ''}`}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
              {open && (
                <p
                  className="pb-3 text-sm text-slate-600 leading-relaxed"
                  data-testid={`faq-answer-${i}`}
                >
                  {it.a}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* Mobile-only floating CTA card so the desktop sticky sidebar's
   primary action stays visually accessible on small screens too. */
function MobileDecisionStrip({
  isThisSelected,
  hasAnySelection,
  onOpenModal,
}: {
  isThisSelected: boolean
  hasAnySelection: boolean
  onOpenModal: () => void
}) {
  return (
    <div
      className="lg:hidden rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_14px_40px_-22px_rgba(15,23,42,0.40)] p-4 sm:p-5"
      style={{
        background:
          'radial-gradient(ellipse 60% 60% at 100% 0%, rgba(20,184,166,0.30) 0%, transparent 60%),' +
          'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
      }}
      data-testid="profile-mobile-decision-strip"
    >
      <div className="flex flex-col gap-2.5">
        <RequestCallCta
          isSelected={isThisSelected}
          hasAnySelection={hasAnySelection}
          onClick={onOpenModal}
          testid="profile-mobile-cta"
        />
        <p className="text-[11px] text-slate-200 leading-relaxed inline-flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-300 flex-shrink-0 mt-0.5" />
          <span>
            При посетена консултация ще получите{' '}
            <strong className="text-teal-100">Zubite Care Pass</strong>{' '}
            — отстъпки за продукти за орална хигиена.
          </span>
        </p>
      </div>
    </div>
  )
}


