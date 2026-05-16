'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import axios from 'axios'
import {
  ArrowLeft, Building2, MapPin, ShieldCheck, Calendar,
  Sparkle, AlertCircle, X, Compass, Loader2, PlayCircle,
  Stethoscope, Image as ImageIcon, FileText,
  BookOpenCheck, UserCircle2, Footprints, MessagesSquare,
  CheckCircle2,
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
import { ReviewSignalsSection } from '@/components/patient/ReviewSignalsSection'
import { RequestCallModal } from '@/components/patient/RequestCallModal'
import { trackPatientEvent } from '@/lib/patientAnalytics'

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
  const tier = clinic ? resolveTier(clinic) : 'standard'
  const containerCls =
    tier === 'premium' ? 'max-w-6xl' : tier === 'featured' ? 'max-w-4xl' : 'max-w-3xl'

  return (
    <main className="min-h-screen bg-slate-50 overflow-x-hidden">
      <Header />

      <section className="pt-24 pb-16 md:pt-28 md:pb-24">
        <div className={`${containerCls} mx-auto px-4 sm:px-6 lg:px-8`}>
          <Link
            href={`/results/${leadId}/clinics`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
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
          className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5 flex items-start gap-3"
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

      {/* Care Pass — small premium card near the CTA area. Never larger
          than the hero, never implies treatment discount. */}
      <section
        className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/70 via-white to-white overflow-hidden"
        data-testid="profile-care-pass-section"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-4 sm:gap-5 p-4 sm:p-5 items-center">
          <div className="relative w-full max-w-[200px] sm:max-w-none aspect-[5/4] sm:aspect-square rounded-xl bg-white ring-1 ring-slate-200 overflow-hidden mx-auto sm:mx-0">
            <NextImage
              src="/care-pass.png"
              alt="Zubite Care Pass — карта с партньорски ползи"
              fill
              sizes="(max-width: 640px) 200px, 140px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Zubite Care Pass при посетена консултация
            </div>
            <p className="text-slate-700 text-sm leading-relaxed">
              Ако заявите консултация през Zubite.bg и я посетите, клиниката
              ще ви предостави Care Pass с партньорски ползи — например
              отстъпки от марки за орална хигиена.
            </p>
          </div>
        </div>
      </section>

      {/* ── Видео представяне (Premium only) ─────────────────
          Render real video URL if admin published one; otherwise use
          the existing placeholder block. */}
      {isPremium && (
        clinic.clinic_profile?.clinic_video_url
          ? (
            <section
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
              data-testid="profile-clinic-video-section"
            >
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-3">
                Видео представяне
              </div>
              <video
                src={clinic.clinic_profile.clinic_video_url}
                controls
                className="w-full rounded-xl aspect-video bg-slate-100"
              />
            </section>
          )
          : <VideoIntroSection />
      )}

      {/* ── Why this clinic appeared (all tiers) ───────────── */}
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
        data-testid="profile-reason-section"
      >
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-3">
          Защо виждате тази клиника
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">{clinic.reason}</p>
        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          Тази препоръка е базирана на наличната партньорска информация, града
          и типа заявка.
        </p>
      </section>

      {/* ── Подходяща за (all tiers) ───────────────────────── */}
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
        data-testid="profile-treatments-section"
      >
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-3">
          Подходяща за
        </h2>
        {clinic.treatments && clinic.treatments.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {clinic.treatments.map((t) => (
              <li
                key={t}
                className="inline-flex items-center px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs"
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
            Информацията за конкретните направления ще бъде потвърдена при
            разговор.
          </p>
        )}
        {clinic.partner_since_year && (
          <p className="mt-4 text-xs text-slate-500 inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Партньор на Zubite от {clinic.partner_since_year}
          </p>
        )}
      </section>

      {/* ── За клиниката (Featured only — Premium uses richer sections below) */}
      {isFeatured && (
        clinic.clinic_profile?.patient_intro || clinic.clinic_profile?.short_description
          ? (
            <section
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
              data-testid="profile-about-section"
            >
              <h2 className="font-serif text-lg font-semibold text-slate-900 mb-3">За клиниката</h2>
              {clinic.clinic_profile.patient_intro && (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {clinic.clinic_profile.patient_intro}
                </p>
              )}
              {clinic.clinic_profile.short_description && !clinic.clinic_profile.patient_intro && (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {clinic.clinic_profile.short_description}
                </p>
              )}
            </section>
          )
          : (
            <PlaceholderSection
              testid="profile-about-section"
              tierLabel="featured"
              title="За клиниката"
              icon={<FileText className="w-4 h-4 text-sky-600" />}
              body="Клиниката все още не е добавила подробно описание към профила си."
            />
          )
      )}

      {/* ── Featured-only extra (lighter than Premium) ──────── */}
      {isFeatured && (
        <PlaceholderSection
          testid="profile-featured-extra-section"
          tierLabel="featured"
          title="Допълнителна информация от клиниката"
          icon={<Sparkle className="w-4 h-4 text-sky-600" />}
          body="Тази секция е видима, защото клиниката е представен партньор в Zubite. Клиниката може да добави повече информация за пациентите."
        />
      )}

      {/* ── Review signals (all tiers, only if present) ─────── */}
      {clinic.review_signals && clinic.review_signals.sources && clinic.review_signals.sources.length > 0 && (
        <ReviewSignalsSection signals={clinic.review_signals} />
      )}

      {/* ── Premium-only rich section stack (P3.7) ──────────────
          Per spec, on Premium profiles render after Reviews, in this
          order: Clinic Story (R1), Case Library, Doctor Spotlight,
          Environment/equipment, Patient Journey, Zubite Feedback.
          Each section reads from clinic.clinic_profile if admin
          published real content; otherwise falls back to the existing
          honest placeholder. */}
      {isPremium && (
        <>
          {/* Clinic story — new R1 section, premium only */}
          {clinic.clinic_profile?.clinic_story && (
            <section
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
              data-testid="profile-clinic-story-section"
            >
              <h2 className="font-serif text-lg font-semibold text-slate-900 mb-3">
                История на клиниката
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {clinic.clinic_profile.clinic_story}
              </p>
            </section>
          )}

          {/* Case library — real if any published+consent rows */}
          {clinic.clinic_profile?.case_library && clinic.clinic_profile.case_library.length > 0 ? (
            <section
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
              data-testid="profile-case-library-section"
            >
              <h2 className="font-serif text-lg font-semibold text-slate-900 mb-2">
                Случаи от практиката
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Предоставено от клиниката.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {clinic.clinic_profile.case_library.map((c) => (
                  <div
                    key={c.id || c.title}
                    className="rounded-xl border border-slate-200 p-4 bg-slate-50/50"
                    data-testid={`profile-case-${c.id || c.title}`}
                  >
                    <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                      Категория: {c.category}
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">{c.title}</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {c.summary}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <CaseLibrarySection />
          )}

          {/* Doctor spotlight — real if doctor name set */}
          {clinic.clinic_profile?.doctor_spotlight_name ? (
            <section
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
              data-testid="profile-doctor-spotlight-section"
            >
              <h2 className="font-serif text-lg font-semibold text-slate-900 mb-3">
                Лекарят
              </h2>
              <div className="font-medium text-slate-900">
                {clinic.clinic_profile.doctor_spotlight_name}
              </div>
              {clinic.clinic_profile.doctor_spotlight_role && (
                <div className="text-sm text-slate-500 mt-0.5">
                  {clinic.clinic_profile.doctor_spotlight_role}
                </div>
              )}
              {clinic.clinic_profile.doctor_spotlight_bio && (
                <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {clinic.clinic_profile.doctor_spotlight_bio}
                </p>
              )}
              {clinic.clinic_profile.doctor_video_url && (
                <video
                  src={clinic.clinic_profile.doctor_video_url}
                  controls
                  className="mt-4 w-full rounded-xl aspect-video bg-slate-100"
                />
              )}
              {clinic.clinic_profile.team_note && (
                <p className="mt-4 text-sm text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-3">
                  {clinic.clinic_profile.team_note}
                </p>
              )}
            </section>
          ) : (
            <DoctorSpotlightSection />
          )}

          {/* Environment/equipment — real if set */}
          {clinic.clinic_profile?.environment_description ? (
            <section
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
              data-testid="profile-environment-section"
            >
              <h2 className="font-serif text-lg font-semibold text-slate-900 mb-3">
                Среда и оборудване
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {clinic.clinic_profile.environment_description}
              </p>
            </section>
          ) : (
            <PlaceholderSection
              testid="profile-environment-section"
              tierLabel="premium"
              title="Среда и оборудване"
              icon={<Stethoscope className="w-4 h-4 text-sky-600" />}
              body="Тук клиниката ще може да представи средата, технологиите и удобствата за пациента."
            />
          )}

          {/* Consultation process — show as new section if set, else use
              existing PatientJourneySection placeholder. */}
          {clinic.clinic_profile?.consultation_process ? (
            <section
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
              data-testid="profile-consultation-process-section"
            >
              <h2 className="font-serif text-lg font-semibold text-slate-900 mb-3">
                Процес на консултация
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {clinic.clinic_profile.consultation_process}
              </p>
            </section>
          ) : (
            <PatientJourneySection />
          )}

          <ZubiteFeedbackPlaceholderSection />
        </>
      )}

      {/* ── Какво се случва, ако изберете тази клиника ──────────
          For Premium this content lives inside Patient Journey above,
          so we render the generic block ONLY for Standard + Featured. */}
      {!isPremium && (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
          data-testid="profile-next-step-section"
        >
          <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-3">
            Какво да очаквате при първата стъпка
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Ако изберете тази клиника, в следващата стъпка ще потвърдите телефона
            си и ще дадете съгласие Zubite да сподели заявката ви с клиниката.
          </p>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed inline-flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <span>{clinic.response_expectation}</span>
          </p>
        </section>
      )}

      {/* ── Bottom CTA (all tiers) ──────────────────────────── */}
      <section
        className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-6 sm:p-8"
        data-testid="profile-bottom-cta-row"
      >
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-2">
          Готови ли сте за следваща стъпка?
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">
          Заявка за обаждане може да изпратите само към една клиника. Ако се
          колебаете, разгледайте и другите препоръки.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <RequestCallCta
            isSelected={isThisSelected}
            hasAnySelection={hasAnySelection}
            onClick={onOpenModal}
            testid="profile-bottom-cta"
          />
          <Link
            href={`/results/${leadId}/clinics`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-full hover:bg-slate-50 transition-colors"
            data-testid="profile-bottom-view-others"
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            Виж другите препоръки
          </Link>
        </div>
      </section>

      {/* ── Trust note ──────────────────────────────────────── */}
      <p
        className="text-xs text-slate-400 text-center leading-relaxed pt-2"
        data-testid="profile-trust-note"
      >
        Zubite не поставя диагноза и не заменя преглед при лекар. Целта е да
        ви помогне да направите по-ясна следваща стъпка.
      </p>
    </article>
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
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
      data-testid="profile-header"
    >
      <div className="w-12 h-12 rounded-lg bg-sky-50 grid place-items-center mb-4">
        <Building2 className="w-6 h-6 text-sky-600" />
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
      className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 md:p-10"
      data-testid="profile-header"
    >
      <div className="grid lg:grid-cols-[1.1fr,1fr] gap-8 lg:gap-12 items-stretch">
        {/* Left column — copy + CTAs */}
        <div className="flex flex-col">
          <div className="w-12 h-12 rounded-lg bg-sky-50 grid place-items-center mb-5">
            <Building2 className="w-6 h-6 text-sky-600" />
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
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-sky-600 font-semibold">
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
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-full hover:bg-slate-50 transition-colors"
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
            className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 min-h-[260px] lg:min-h-[420px]"
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
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-sky-100 via-slate-50 to-white border border-slate-200 min-h-[260px] lg:min-h-[420px] flex flex-col items-center justify-center"
      data-testid="profile-clinic-image-placeholder"
    >
      <div className="w-14 h-14 rounded-full bg-white/80 backdrop-blur grid place-items-center mb-3 shadow-sm">
        <ImageIcon className="w-6 h-6 text-sky-600" aria-hidden="true" />
      </div>
      <figcaption className="text-center px-6">
        <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-sky-700 font-semibold mb-1">
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
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
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
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
      data-testid={testid}
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-sky-50 grid place-items-center">
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
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
      data-testid="profile-case-library-section"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-sky-50 grid place-items-center">
            <BookOpenCheck className="w-4 h-4 text-sky-600" aria-hidden="true" />
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
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
      data-testid="profile-doctor-spotlight-section"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-sky-50 grid place-items-center">
            <UserCircle2 className="w-4 h-4 text-sky-600" aria-hidden="true" />
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
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
      data-testid="profile-patient-journey-section"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-sky-50 grid place-items-center">
            <Footprints className="w-4 h-4 text-sky-600" aria-hidden="true" />
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
            <span className="w-7 h-7 rounded-full bg-white border border-slate-200 text-xs font-semibold text-sky-700 grid place-items-center flex-shrink-0 tabular-nums">
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
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
      data-testid="profile-zubite-feedback-section"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-sky-50 grid place-items-center">
            <MessagesSquare className="w-4 h-4 text-sky-600" aria-hidden="true" />
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
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="w-12 h-12 rounded-lg bg-slate-100 mb-4" />
        <div className="h-7 w-3/4 bg-slate-100 rounded mb-2" />
        <div className="h-4 w-1/3 bg-slate-100 rounded mb-6" />
        <div className="h-11 w-56 bg-slate-100 rounded-full" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="h-5 w-1/2 bg-slate-100 rounded mb-3" />
          <div className="h-3 w-full bg-slate-100 rounded mb-2" />
          <div className="h-3 w-5/6 bg-slate-100 rounded" />
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
      className="bg-white border border-slate-200 rounded-2xl p-8"
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors"
            data-testid="profile-error-restart"
          >
            Започни отново
          </Link>
        )}
        {showBackToList && (
          <Link
            href={`/results/${leadId}/clinics`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors"
            data-testid="profile-error-back-to-list"
          >
            Назад към препоръките
          </Link>
        )}
        {kind === 'rate_limited' && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-full hover:bg-slate-50 transition-colors"
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
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-medium rounded-full"
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
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed"
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
      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors"
      data-testid={testid}
    >
      Искам обаждане от тази клиника
    </button>
  )
}

