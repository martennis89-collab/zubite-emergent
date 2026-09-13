'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, MapPin, ShieldCheck, Sparkle, Sparkles, ArrowRight, CheckCircle2, ChevronDown, Gift, Video, CalendarDays } from 'lucide-react'
import type { RecommendedClinic } from '@/lib/api'
import { TREATMENT_LABELS } from '@/lib/consultationLabels'
import { RequestCallModal } from '@/components/patient/RequestCallModal'
import { AlignerBrandChips } from '@/components/patient/AlignerBrandChips'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { getStoredLeadContact } from '@/lib/leadContact'

interface Props {
  clinic: RecommendedClinic
  position: number  // 1-based for accessibility
  leadId: string    // required so the card can deep-link to the profile page
  // P4/P5 selection state — drives 3-way CTA rendering:
  //   1. this clinic is the pinned selection → green "Заявката е изпратена"
  //   2. another clinic is pinned OR lead asked Zubite help → disabled label
  //   3. nothing pinned → original "Искам обаждане"
  selectedClinicId?: string | null
  hasAssistedChoice?: boolean
  // The personalized showcase can keep several clinic requests active at once.
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
      ? 'bg-amber-50/85 text-amber-800 ring-1 ring-amber-100'
      : 'bg-slate-50/85 text-slate-700 ring-1 ring-slate-200'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide backdrop-blur-md ${styles}`}
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
  selectedClinicId,
  hasAssistedChoice,
  requestedClinicIds,
  onSubmitted,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const requestedIds = requestedClinicIds ?? (selectedClinicId ? [selectedClinicId] : [])
  const hasAnySelection = requestedIds.length > 0
  const isSelected = requestedIds.includes(clinic.id)
  // When the lead has asked for Zubite help, every clinic CTA is locked
  // with a different label ("Вече поискахте помощ от Zubite").
  const lockedByAssisted = !requestedClinicIds && !!hasAssistedChoice && !hasAnySelection

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
      className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 text-xs"
    >
      {TREATMENT_LABELS[t] || t}
    </span>
  ))

  const tier = clinic.partner_tier
  const showPlacement =
    !!clinic.placement_label && (tier === 'premium' || tier === 'featured')

  return (
    <article
      className="group relative rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-white/80 overflow-hidden flex flex-col h-full shadow-[0_10px_30px_-22px_rgba(15,23,42,0.20)] hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_22px_50px_-22px_rgba(13,148,136,0.28)] hover:ring-teal-200/60 transition-all duration-300"
      data-testid={`clinic-card-${clinic.id}`}
      data-tier={tier || 'standard'}
      aria-label={`Препоръка ${position}: ${clinic.name}`}
    >
      {/* ─── Media strip — visually aligns with PublicClinicCard.
          Premium clinics with a published hero image show it; everyone
          else gets the same teal-gradient placeholder as the public card
          (consistent silhouette across the two card systems). Lead-context
          features (position number, placement badge) overlay on top. */}
      <div className="relative h-32 sm:h-36 w-full overflow-hidden flex-shrink-0">
        {clinic.clinic_profile?.hero_image_url ? (
          <Image
            src={clinic.clinic_profile.hero_image_url}
            alt={clinic.name}
            width={480}
            height={144}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div
            aria-hidden
            className="w-full h-full bg-gradient-to-br from-teal-100 via-cyan-50 to-white grid place-items-center"
          >
            <Sparkles className="w-9 h-9 text-teal-200" />
          </div>
        )}
        {/* Bottom gradient so the placement badge always reads */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/35 to-transparent pointer-events-none"
        />
        {/* Position pill — quiet top-right, mono numerals */}
        <span
          className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-md ring-1 ring-white/90 text-[10px] tracking-[0.18em] uppercase text-slate-600 font-mono"
          data-testid={`clinic-card-position-${clinic.id}`}
        >
          #{String(position).padStart(2, '0')}
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

      {/* Soft inner top gloss for liquid-glass feel (under content) */}
      <span aria-hidden className="pointer-events-none absolute inset-x-6 top-[8.5rem] sm:top-[9.5rem] h-1/4 rounded-full bg-white/45 blur-md opacity-70" />

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

      {/* Treatments + city/Care Pass chip row.

          The Care Pass chip renders ONLY when `clinic.care_pass_partner === true`
          (Feb 2026 brief): we never imply that every clinic participates.
          A separate "В твоя град" chip surfaces when the backend has confirmed
          the same-city match (all recommended clinics pass this filter today,
          but we gate on the explicit flag in case the contract evolves). */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {clinic.same_city === true && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-200 text-[11px] font-medium"
            data-testid={`clinic-card-same-city-${clinic.id}`}
          >
            <MapPin className="w-3 h-3" /> В твоя град
          </span>
        )}
        {treatmentBadges}
        {clinic.care_pass_partner === true && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 text-[11px] font-medium"
            data-testid={`clinic-card-carepass-chip-${clinic.id}`}
            title="Възможни ползи след физическа консултация."
          >
            <Gift className="w-3 h-3" /> Care Pass
          </span>
        )}
      </div>

      {/* Aligner brand chips — compact form, omitted when no brands. */}
      <AlignerBrandChips chips={clinic.aligner_brands_supported} layout="card" />

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
              {clinic.care_pass_partner === true && (
                <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1">•</span><span>Участваща в Care Pass — ползи може да се отключат след физическа консултация</span></li>
              )}
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
          className="group/cta relative w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-medium transition-all hover:-translate-y-0.5 shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
          style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
          data-testid={`clinic-card-view-profile-${clinic.id}`}
          aria-label={`Виж профила на ${clinic.name}`}
        >
          <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
          <span className="relative inline-flex items-center gap-2">
            Виж профила
            <ArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>

        {/* Real booking CTA — reuses the existing /booking/[clinicId] slot
            flow (not the request-call P4 flow), so it is NOT gated by
            isSelected/lockedByAssisted/hasAnySelection: booking a specific
            time is a separate action from requesting a callback. Wording is
            always "Заяви час за консултация" rather than "Запази консултация"
            because the card has no way to know ahead of time whether this
            clinic has real bookable slots — /booking/[clinicId] itself
            resolves that and falls back to a "no online calendar" state. */}
        <Link
          href={`/booking/${encodeURIComponent(clinic.id)}?leadId=${encodeURIComponent(leadId)}&source=clinic_recommendation`}
          onClick={() => {
            trackPatientEvent('consultation_booking_started', {
              lead_id: leadId,
              clinic_id: clinic.id,
              source: 'clinic_recommendation',
              partner_tier: tier || 'standard',
              rank_position: position,
            })
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-teal-50/80 backdrop-blur-md ring-1 ring-teal-100 text-teal-800 text-sm font-medium rounded-full hover:bg-teal-100/80 hover:-translate-y-0.5 transition-all"
          data-testid={`clinic-card-book-${clinic.id}`}
        >
          <CalendarDays className="w-4 h-4" aria-hidden="true" />
          Заяви час за консултация
        </Link>

        {isSelected ? (
          <div
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50/85 backdrop-blur-md ring-1 ring-emerald-100 text-emerald-800 text-sm font-medium rounded-full"
            data-testid={`clinic-card-submitted-${clinic.id}`}
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Заявката е изпратена
          </div>
        ) : lockedByAssisted ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            onClick={() => {
              trackPatientEvent('matching_choice_blocked', {
                lead_id: leadId,
                clinic_id: clinic.id,
                reason: 'already_requested_zubite_help',
                attempted_action: 'request_call',
              })
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100/80 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed"
            data-testid={`clinic-card-locked-by-assisted-${clinic.id}`}
          >
            Вече поискахте помощ от Zubite
          </button>
        ) : hasAnySelection ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            onClick={() => {
              trackPatientEvent('matching_choice_blocked', {
                lead_id: leadId,
                clinic_id: clinic.id,
                reason: 'already_selected_clinic',
                attempted_action: 'request_call',
              })
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100/80 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed"
            data-testid={`clinic-card-disabled-${clinic.id}`}
          >
            Вече избрахте клиника
          </button>
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
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/65 backdrop-blur-xl ring-1 ring-white/80 text-slate-800 text-sm font-medium rounded-full hover:bg-white hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-14px_rgba(15,23,42,0.18)]"
            data-testid={`clinic-card-cta-${clinic.id}`}
          >
            Заяви контакт
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
