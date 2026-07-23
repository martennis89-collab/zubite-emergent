'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Compass,
  Loader2,
  MapPin,
  X,
} from 'lucide-react'
import { submitClinicRecommendationPreference } from '@/lib/api'
import { CITIES } from '@/lib/cityData'
import { trackPatientEvent } from '@/lib/patientAnalytics'

interface ClinicRecommendationChoiceProps {
  leadId: string
  citySlug?: string | null
  onDeclined: () => void
}

export function ClinicRecommendationChoice({
  leadId,
  citySlug,
  onDeclined,
}: ClinicRecommendationChoiceProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState<'yes' | 'no' | null>(null)
  const [error, setError] = useState('')

  const cityName = CITIES.find((city) => city.value === citySlug)?.label

  async function handleChoice(wantsRecommendations: boolean) {
    if (wantsRecommendations && !citySlug) {
      setError('Липсва избран град. Изпрати резултата отново, за да продължиш.')
      return
    }

    setSubmitting(wantsRecommendations ? 'yes' : 'no')
    setError('')

    try {
      await submitClinicRecommendationPreference(leadId, {
        wants_recommendations: wantsRecommendations,
        ...(wantsRecommendations && citySlug ? { city_slug: citySlug } : {}),
      })

      try {
        trackPatientEvent(
          wantsRecommendations
            ? 'clinic_recommendation_accepted'
            : 'clinic_recommendation_declined',
          { lead_id_present: true },
        )
      } catch {
        // Analytics must never block the patient flow.
      }

      if (wantsRecommendations) {
        router.push(`/clinics?leadId=${encodeURIComponent(leadId)}`)
      } else {
        onDeclined()
      }
    } catch {
      setError('Възникна грешка. Опитай отново.')
      setSubmitting(null)
    }
  }

  return (
    <section data-testid="clinic-recommendation-ask" aria-labelledby="clinic-recommendation-title">
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#E7F6F3] text-[#006A61]">
        <Compass className="h-5 w-5" />
      </span>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#006A61]">
        По избор
      </p>
      <h2
        id="clinic-recommendation-title"
        className="mt-2 font-display text-2xl font-semibold leading-tight text-black"
      >
        Искаш ли да ти препоръчаме партньорски клиники?
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#45464D]">
        Ще подберем до 3 клиники според нужната експертиза и локацията
        {cityName ? ` ти в ${cityName}` : ''}. Изборът не те обвързва и
        клиника няма да получи данните ти на този етап.
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs text-[#64748B]">
        <MapPin className="h-3.5 w-3.5 text-[#006A61]" />
        {cityName ? `Локация за подбора: ${cityName}` : 'Локацията не е зададена'}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FFF1F2] px-3 py-2.5 text-sm text-[#93000A]"
          data-testid="clinic-recommendation-error"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleChoice(true)}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#006A61] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#005850] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006A61] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="clinic-recommendation-yes"
        >
          {submitting === 'yes' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Да, покажи ми
          {submitting !== 'yes' && <ArrowRight className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => handleChoice(false)}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-5 py-3.5 text-sm font-semibold text-[#45464D] transition hover:border-[#94A3B8] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006A61] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="clinic-recommendation-no"
        >
          {submitting === 'no' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          Не, благодаря
        </button>
      </div>
    </section>
  )
}
