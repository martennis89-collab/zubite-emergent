'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, MapPin, ShieldCheck, Calendar, Sparkle, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { RecommendedClinic } from '@/lib/api'
import { TREATMENT_LABELS } from '@/lib/consultationLabels'
import { RequestCallModal } from '@/components/patient/RequestCallModal'

interface Props {
  clinic: RecommendedClinic
  position: number  // 1-based for accessibility
  leadId: string    // required so the card can deep-link to the profile page
  // P4 selection state — drives "Заявката е изпратена" / "Вече избрахте клиника"
  // disabled CTA variants across all sibling cards.
  selectedClinicId?: string | null
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
      ? 'bg-amber-50 text-amber-800 border-amber-100'
      : 'bg-slate-50 text-slate-700 border-slate-200'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium tracking-wide ${styles}`}
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
  onSubmitted,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const hasAnySelection = !!selectedClinicId
  const isSelected = selectedClinicId === clinic.id

  // BG label fallback: prefer the centralized treatment label map, else raw.
  const treatmentBadges = clinic.treatments.slice(0, 3).map((t) => (
    <span
      key={t}
      className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs"
    >
      {TREATMENT_LABELS[t] || t}
    </span>
  ))

  const tier = clinic.partner_tier
  const showPlacement =
    !!clinic.placement_label && (tier === 'premium' || tier === 'featured')

  return (
    <article
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col h-full shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
      data-testid={`clinic-card-${clinic.id}`}
      aria-label={`Препоръка ${position}: ${clinic.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="w-10 h-10 rounded-lg bg-sky-50 grid place-items-center mb-3">
            <Building2 className="w-5 h-5 text-sky-600" />
          </div>

          {/* Placement badge — rendered only when backend supplied a label. */}
          {showPlacement && (
            <div className="mb-2" data-testid="clinic-card-placement-row">
              <PlacementBadge
                tier={tier as 'premium' | 'featured'}
                label={clinic.placement_label as string}
                disclosure={clinic.placement_disclosure}
              />
            </div>
          )}

          <h3 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 leading-snug truncate">
            {clinic.name}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5 inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {clinic.city_name}
          </p>
        </div>
        <span className="text-[10px] tracking-[0.18em] uppercase text-slate-400 font-mono mt-1">
          {String(position).padStart(2, '0')}
        </span>
      </div>

      {/* Treatments */}
      {treatmentBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">{treatmentBadges}</div>
      )}

      {/* Reason */}
      <p className="text-sm text-slate-700 leading-relaxed mb-4 flex-1">
        {clinic.reason}
      </p>

      {/* Meta */}
      <div className="space-y-2 text-xs text-slate-500 mb-5">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
          <span className="leading-snug">{clinic.response_expectation}</span>
        </div>
        {clinic.partner_since_year && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Партньор на Zubite от {clinic.partner_since_year}</span>
          </div>
        )}
        {/* Transparent placement disclosure — small, neutral helper text. */}
        {showPlacement && clinic.placement_disclosure && (
          <p
            className="text-[11px] text-slate-400 leading-snug pt-1"
            data-testid="clinic-card-placement-disclosure"
          >
            {clinic.placement_disclosure}
          </p>
        )}
      </div>

      {/* CTA — P4 dual action, tier- and selection-aware.
          Primary  → "Виж профила" deep-links to the lead-contextual profile.
          Secondary → "Искам обаждане" opens the real RequestCallModal.
                      When the lead has already chosen a clinic, the
                      secondary button is disabled and labelled accordingly. */}
      <div className="space-y-2">
        <Link
          href={`/results/${leadId}/clinics/${clinic.id}`}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors"
          data-testid={`clinic-card-view-profile-${clinic.id}`}
          aria-label={`Виж профила на ${clinic.name}`}
        >
          Виж профила
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>

        {isSelected ? (
          <div
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-medium rounded-full"
            data-testid={`clinic-card-submitted-${clinic.id}`}
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Заявката е изпратена
          </div>
        ) : hasAnySelection ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed"
            data-testid={`clinic-card-disabled-${clinic.id}`}
          >
            Вече избрахте клиника
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-full hover:bg-slate-50 transition-colors"
            data-testid={`clinic-card-cta-${clinic.id}`}
          >
            Искам обаждане
          </button>
        )}
      </div>

      {modalOpen && (
        <RequestCallModal
          leadId={leadId}
          clinic={{ id: clinic.id, name: clinic.name, city_name: clinic.city_name }}
          source="matching_card"
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
