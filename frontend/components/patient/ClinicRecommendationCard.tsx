'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Building2, MapPin, ShieldCheck, Sparkle, Sparkles, ArrowRight, CheckCircle2, ChevronDown, Video } from 'lucide-react'
import type { RecommendedClinic } from '@/lib/api'
import { TREATMENT_LABELS } from '@/lib/consultationLabels'
import { AlignerBrandChips } from '@/components/patient/AlignerBrandChips'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { getStoredLeadContact } from '@/lib/leadContact'
import { CLINIC_CONTACT_ACTION_COPY } from '@/lib/publicClinics'

const RequestCallModal = dynamic(
  () => import('@/components/patient/RequestCallModal').then((module) => module.RequestCallModal),
  { ssr: false },
)

interface Props {
  clinic: RecommendedClinic
  position: number  // 1-based for accessibility
  leadId: string    // required so the card can deep-link to the profile page
  // Each clinic keeps its own submitted state; contacting one clinic never
  // disables the others.
  requestedClinicIds?: string[]
  onSubmitted?: (selectedClinicId: string, clinicName: string) => void
}

// Ethical, non-medical placement badge.
//
// The badge is a transparency signal, NOT a quality signal:
//   • "Premium партньор" / "Представена клиника" indicate partnership tier only.
//   • We never imply ranking, certification, or clinical superiority.
// `placement_label` is null for standard clinics so this returns null cleanly.
function PlacementBadge({
  tier,
  label,
  disclosure,
}: {
  tier: 'premium' | 'featured'
  label: string
  disclosure: string | null | undefined
}) {
  // Distinct but quiet visual treatment per tier. Both tiers share the same
  // visual *weight* so neither looks like a winner; only the hue differs to
  // match Zubite's editorial palette (amber for premium, slate for featured).
  const styles =
    tier === 'premium'
      ? 'border border-amber-200 bg-amber-50 text-amber-800'
      : 'border border-slate-200 bg-slate-50 text-slate-700'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${styles}`}
      title={disclosure || undefined}
      data-testid={`clinic-card-placement-${tier}`}
    >
      <Sparkle className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  )
}

export function ClinicRecommendationCard({
  clinic,
  position,
  leadId,
  requestedClinicIds = [],
  onSubmitted,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const isSelected = requestedClinicIds.includes(clinic.id)

  // BG label fallback: prefer the centralized treatment label map, else raw.
  // Prefer canonical `treatments_supported` (Feb 2026 cleanup); fall back to
  // legacy `treatments` for any pre-cleanup cached responses.
  const treatmentList =
    (clinic.treatments_supported && clinic.treatments_supported.length > 0
      ? clinic.treatments_supported
      : clinic.treatments) || []
  const treatmentBadges = treatmentList.slice(0, 3).map((t) => (
    <span
      key={t}
      className="inline-flex items-center rounded-full border border-teal-100 bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700"
    >
      {TREATMENT_LABELS[t] || t}
    </span>
  ))

  const tier = clinic.partner_tier
  const showPlacement =
    !!clinic.placement_label && (tier === 'premium' || tier === 'featured')

  return (
    <article
      className="taste-recommendation-card group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#B9D3CE] bg-white transition duration-200 hover:-translate-y-1 hover:border-[#4F9F95]"
      data-testid={`clinic-card-${clinic.id}`}
      data-tier={tier || 'standard'}
      aria-label={`Препоръка ${position}: ${clinic.name}`}
    >
      {/* ─── Media strip — visually aligns with PublicClinicCard.
          Premium clinics with a published hero image show it; everyone
          else gets the same teal-gradient placeholder as the public card
          (consistent silhouette across the two card systems). Lead-context
          features (position number, placement badge) overlay on top. */}
      <div className="relative h-40 w-full flex-shrink-0 overflow-hidden">
        {clinic.clinic_profile?.hero_image_url ? (
          <Image
            src={clinic.clinic_profile.hero_image_url}
            alt={clinic.name}
            width={480}
            height={160}
            sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1180px) 50vw, 380px"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div
            aria-hidden
            className="grid h-full w-full place-items-center bg-[#E7F6F3]"
          >
            <Sparkles className="h-10 w-10 text-[#79BDB3]" />
          </div>
        )}
        {/* Bottom gradient so the placement badge always reads */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/35 to-transparent pointer-events-none"
        />
        {/* Position pill — quiet top-right, mono numerals */}
        <span
          className="absolute right-3 top-3 inline-flex items-center rounded-full border border-white/80 bg-white px-2.5 py-1 font-mono text-[10px] text-slate-600"
          data-testid={`clinic-card-position-${clinic.id}`}
        >
          Подбор {String(position).padStart(2, '0')}
        </span>
        {/* Placement badge — overlaid bottom-left when available */}
        {showPlacement && (
          <div className="absolute bottom-3 left-3" data-testid="clinic-card-placement-row">
            <PlacementBadge
              tier={tier as 'premium' | 'featured'}
              label={clinic.placement_label as string}
              disclosure={clinic.placement_disclosure}
            />
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="relative p-5 sm:p-6 flex flex-col flex-1">
        {/* Header — name + city */}
        <div className="mb-3 min-w-0">
          <h3 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 leading-snug truncate">
            {clinic.name}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5 inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {clinic.city_name}
          </p>
        </div>

      {/* Treatments + city/district chip row.

          "В твоя квартал" is more specific than "В твоя град" and implies
          it, so at most one of the two ever shows — never both. */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {clinic.same_district === true ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-800"
            data-testid={`clinic-card-same-district-${clinic.id}`}
          >
            <MapPin className="w-3 h-3" /> В твоя квартал
          </span>
        ) : clinic.same_city === true ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-800"
            data-testid={`clinic-card-same-city-${clinic.id}`}
          >
            <MapPin className="w-3 h-3" /> В твоя град
          </span>
        ) : null}
        {treatmentBadges}
      </div>

      {/* Aligner brand chips — compact form, omitted when no brands. */}
      <AlignerBrandChips chips={clinic.aligner_brands_supported} layout="card" />

      {(clinic.assessment_approach_match_labels || []).length > 0 && (
        <div className="mb-3 rounded-xl border border-teal-100 bg-teal-50/70 p-3" data-testid={`clinic-card-approach-match-${clinic.id}`}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
            <Sparkles className="h-3.5 w-3.5" /> Подход, свързан с отговорите ти
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {clinic.assessment_approach_match_labels?.join(' · ')}
          </p>
          <p className="mt-1.5 text-[10px] leading-snug text-slate-500">Критерий за релевантност, не оценка за качество.</p>
        </div>
      )}

      {/* Reason — short visible first line + expand details */}
      <p className="text-sm text-slate-700 leading-relaxed mb-3 flex-1 line-clamp-2" data-testid={`clinic-card-reason-${clinic.id}`}>
        {clinic.reason}
      </p>

      {/* Expandable details — moves response_expectation, partner year and
          placement disclosure into a single optional disclosure to keep the
          default view compact. */}
      <details className="group/details mb-4" data-testid={`clinic-card-details-${clinic.id}`}>
        <summary className="list-none cursor-pointer select-none inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded">
          <span className="group-open/details:hidden">Виж детайли</span>
          <span className="hidden group-open/details:inline">Скрий детайли</span>
          <ChevronDown className="w-3 h-3 transition-transform group-open/details:rotate-180" />
        </summary>
        <div className="mt-2 space-y-1.5 text-xs text-slate-500 border-t border-slate-200/60 pt-2">
          <p className="leading-snug text-slate-700">{clinic.reason}</p>
          <div className="flex items-start gap-1.5">
            <ShieldCheck className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
            <span className="leading-snug">{clinic.response_expectation}</span>
          </div>
          {clinic.partner_since_year && (
            <p className="leading-snug">Партньор на Zubite от {clinic.partner_since_year}.</p>
          )}
          {showPlacement && clinic.placement_disclosure && (
            <p
              className="text-[11px] text-slate-400 leading-snug"
              data-testid="clinic-card-placement-disclosure"
            >
              {clinic.placement_disclosure}
            </p>
          )}

          {/* Why-you-see-this-clinic block — Zubite Clinic Standard trust layer. */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/60">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700 mb-1.5">
              Защо виждаш тази клиника?
            </p>
            <ul className="space-y-1 text-[11.5px] text-slate-600 leading-snug">
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1">•</span><span>Покрива Zubite стандарт за участие</span></li>
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1">•</span><span>Работи с тази категория случаи</span></li>
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1">•</span><span>Релевантна е спрямо посоката от въпросника</span></li>
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1">•</span><span>В твоя град / близо до избраната локация</span></li>
            </ul>
          </div>
        </div>
      </details>

      {/* CTA — P4 dual action, tier- and selection-aware.
          Primary  → "Виж профила" deep-links to the lead-contextual profile.
          Secondary → "Искам обаждане" opens the real RequestCallModal.
                      When the lead has already chosen a clinic, the
                      secondary button is disabled and labelled accordingly. */}
      <div className="relative space-y-2">
        <Link
          href={`/results/${leadId}/clinics/${clinic.id}`}
          onClick={() => {
            trackPatientEvent('clinic_profile_clicked', {
              lead_id: leadId,
              clinic_id: clinic.id,
              partner_tier: tier || 'standard',
              placement_label: clinic.placement_label,
              rank_position: position,
            })
          }}
            className="group/cta inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#006A61] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#005850]"
          data-testid={`clinic-card-view-profile-${clinic.id}`}
          aria-label={`Виж профила на ${clinic.name}`}
        >
            <span className="relative inline-flex items-center gap-2">
            Виж профила
            <ArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>

        {isSelected ? (
          <div
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800"
            data-testid={`clinic-card-submitted-${clinic.id}`}
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Заявката е изпратена
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              trackPatientEvent('request_call_modal_opened', {
                lead_id: leadId,
                clinic_id: clinic.id,
                source: 'matching_card',
                partner_tier: tier || 'standard',
                placement_label: clinic.placement_label,
              })
              setModalOpen(true)
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#B9D3CE] bg-white px-5 py-3 text-slate-800 transition-colors hover:border-[#006A61] hover:text-[#006A61]"
            data-testid={`clinic-card-cta-${clinic.id}`}
          >
            <span className="text-left"><strong className="block text-sm font-medium">{CLINIC_CONTACT_ACTION_COPY.label}</strong><small className="mt-0.5 block text-[11px] font-normal text-slate-500">{CLINIC_CONTACT_ACTION_COPY.description}</small></span>
          </button>
        )}
      </div>
      </div>

      {modalOpen && (
        <RequestCallModal
          leadId={leadId}
          clinic={{ id: clinic.id, name: clinic.name, city_name: clinic.city_name }}
          source="matching_card"
          partnerTier={tier || 'standard'}
          placementLabel={clinic.placement_label || null}
          initialContact={getStoredLeadContact(leadId)}
          onClose={() => setModalOpen(false)}
          onSuccess={(resp) => {
            const pinnedId = resp.clinic.id
            const pinnedName = resp.clinic.name || clinic.name
            onSubmitted?.(pinnedId, pinnedName)
          }}
        />
      )}
    </article>
  )
}
