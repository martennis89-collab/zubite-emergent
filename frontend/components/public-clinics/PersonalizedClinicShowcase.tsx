'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import {
  ArrowDown,
  ArrowLeft,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import {
  getLead,
  getRecommendedClinics,
  getSelectionState,
  type RecommendedClinicsResponse,
  type SelectionState,
} from '@/lib/api'
import { cityDisplay } from '@/lib/publicClinics'
import { ClinicRecommendationCard } from '@/components/patient/ClinicRecommendationCard'
import { AssistedChoiceModal } from '@/components/patient/AssistedChoiceModal'
import { getStoredLeadContact } from '@/lib/leadContact'
import { trackPatientEvent } from '@/lib/patientAnalytics'

type LoadState = 'loading' | 'ready' | 'empty' | 'invalid' | 'error'

export default function PersonalizedClinicShowcase({ leadId }: { leadId: string }) {
  const [state, setState] = useState<LoadState>('loading')
  const [data, setData] = useState<RecommendedClinicsResponse | null>(null)
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [assistedModalOpen, setAssistedModalOpen] = useState(false)
  const viewedRef = useRef(false)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const lead = await getLead(leadId)
      const canSeeRecommendations =
        lead?.full_result_unlocked === true &&
        lead?.contact_details_submitted === true &&
        lead?.wants_clinic_recommendations === true

      if (!canSeeRecommendations) {
        setState('invalid')
        return
      }

      const [recommendations, currentSelection] = await Promise.all([
        getRecommendedClinics(leadId, 3),
        getSelectionState(leadId).catch(() => null),
      ])
      setData(recommendations)
      setSelection(currentSelection)
      setState(recommendations.clinic_count > 0 ? 'ready' : 'empty')
    } catch (error) {
      if (axios.isAxiosError(error) && [404, 410].includes(error.response?.status || 0)) {
        setState('invalid')
      } else {
        setState('error')
      }
    }
  }, [leadId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (state !== 'ready' || !data || viewedRef.current) return
    viewedRef.current = true
    trackPatientEvent('clinic_recommendations_viewed', {
      lead_id: leadId,
      clinic_count: data.clinic_count,
      source: 'public_clinic_directory',
    })
  }, [data, leadId, state])

  const handleSubmitted = useCallback(
    (selectedClinicId: string, clinicName: string) => {
      setSelection((previous) => {
        const previousIds =
          previous?.requested_clinic_ids ??
          (previous?.selected_clinic_id ? [previous.selected_clinic_id] : [])
        const requestedClinicIds = previousIds.includes(selectedClinicId)
          ? previousIds
          : [...previousIds, selectedClinicId]
        const cityName =
          data?.clinics.find((clinic) => clinic.id === selectedClinicId)?.city_name ?? ''
        const selectedClinic = {
          id: selectedClinicId,
          name: clinicName,
          city_name: cityName,
        }
        const previousClinics = previous?.requested_clinics ?? []
        const requestedClinics = previousClinics.some(
          (clinic) => clinic.id === selectedClinicId,
        )
          ? previousClinics
          : [...previousClinics, selectedClinic]

        const baseSelection: SelectionState = previous ?? {
          lead_id: leadId,
          has_request: false,
          selected_clinic_id: null,
          selected_clinic_request_id: null,
          clinic_selection_source: 'matching_card',
          request_call_status: 'requested',
          selected_clinic_requested_at: null,
        }

        return {
          ...baseSelection,
          request_count: requestedClinicIds.length,
          requested_clinic_ids: requestedClinicIds,
          requested_clinics: requestedClinics,
          has_request: true,
          has_selected_clinic: true,
          selected_clinic_id: selectedClinicId,
          selected_clinic: selectedClinic,
          clinic: selectedClinic,
        }
      })
    },
    [data, leadId],
  )

  const requestedClinicIds =
    selection?.requested_clinic_ids ??
    (selection?.selected_clinic_id ? [selection.selected_clinic_id] : [])
  const requestedClinicCount = requestedClinicIds.length
  const cityName = data?.city_slug ? cityDisplay(data.city_slug) : null
  const recommendationHeading =
    data?.clinic_count === 1
      ? '1 клиника, подбрана за твоите отговори'
      : `${data?.clinic_count ?? 3} клиники, подбрани за твоите отговори`

  return (
    <section
      className="taste-personalized-showcase border-b border-[#D7E3E0] bg-[#F3F7F6]"
      data-testid="personalized-clinic-showcase"
      aria-labelledby="personalized-clinic-heading"
    >
      <div className="bg-[#073B36] text-white">
        <div className="mx-auto max-w-[1280px] px-5 pb-28 pt-12 sm:px-6 sm:pb-32 sm:pt-16">
          <Link
            href={`/results/${leadId}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#BDE9E2] transition-colors hover:text-white"
            data-testid="personalized-back-to-result"
          >
            <ArrowLeft className="h-4 w-4" />
            Към резултата
          </Link>

          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-4xl">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#89E0D4]">
                <Sparkles className="h-4 w-4" />
                Персонален подбор според въпросника
              </p>
              <h1
                id="personalized-clinic-heading"
                className="mt-4 max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-[-0.035em] !text-white sm:text-5xl lg:text-6xl"
              >
                {state === 'loading'
                  ? 'Подготвяме твоите препоръки'
                  : state === 'ready'
                    ? recommendationHeading
                    : 'Твоят персонален подбор'}
              </h1>
              <p className="mt-5 max-w-3xl text-pretty text-base leading-7 text-[#D7EEEA] sm:text-lg">
                Съпоставяме посоката от резултата, локацията и проверената информация
                в профилите. Това е ориентир за по-смислен първи разговор, а не
                медицинска класация.
              </p>
            </div>

            <a
              href="#all-clinics"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#5B8E88] px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-[#89E0D4] hover:bg-[#0B4A43]"
              data-testid="personalized-see-all"
            >
              Всички клиники
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          {data && (
            <div className="mt-8 flex flex-wrap gap-2 text-sm text-[#D7EEEA]">
              {cityName && (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#3F746E] px-3 py-2">
                  <MapPin className="h-3.5 w-3.5 text-[#89E0D4]" />
                  {cityName}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-[#3F746E] px-3 py-2">
                <Compass className="h-3.5 w-3.5 text-[#89E0D4]" />
                Според отговорите ти
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#3F746E] px-3 py-2">
                <ShieldCheck className="h-3.5 w-3.5 text-[#89E0D4]" />
                Контакт с всяка клиника
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto -mt-20 max-w-[1280px] px-5 pb-16 sm:px-6 sm:pb-20">
        {state === 'loading' && <RecommendationSkeletons />}

        {(state === 'invalid' || state === 'error') && (
          <div className="rounded-xl border border-[#C8D8D4] bg-white p-6 sm:p-8" data-testid={`personalized-${state}`}>
            <h2 className="font-display text-2xl font-semibold text-black">
              {state === 'invalid'
                ? 'Този персонален подбор вече не е достъпен.'
                : 'Не успяхме да заредим персоналния подбор.'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45464D]">
              Каталогът с всички партньорски клиники остава достъпен по-долу.
              Можеш също да обновиш подбора или да попълниш въпросника отново.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {state === 'error' && (
                <button
                  type="button"
                  onClick={load}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#006A61] px-4 py-3 text-sm font-semibold text-white hover:bg-[#005850]"
                  data-testid="personalized-retry"
                >
                  <RefreshCw className="h-4 w-4" />
                  Опитай отново
                </button>
              )}
              <Link
                href="/quiz"
                className="inline-flex min-h-11 items-center rounded-lg border border-[#AFC5C0] px-4 py-3 text-sm font-semibold text-[#073B36] hover:border-[#006A61]"
              >
                Нов въпросник
              </Link>
            </div>
          </div>
        )}

        {state === 'empty' && (
          <div className="rounded-xl border border-[#C8D8D4] bg-white p-6 sm:p-8" data-testid="personalized-empty">
            <Compass className="h-7 w-7 text-[#006A61]" />
            <h2 className="mt-4 font-display text-2xl font-semibold text-black">
              В момента нямаме три достатъчно точни съвпадения.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45464D]">
              Няма да запълваме подбора с нерелевантни клиники. Разгледай каталога
              по-долу или промени града и специализацията чрез филтрите.
            </p>
          </div>
        )}

        {state === 'ready' && data && (
          <>
            {requestedClinicCount > 0 && (
              <div
                className="mb-5 flex items-start gap-3 rounded-xl border border-[#9ED8CE] bg-[#E7F6F3] p-4"
                data-testid="personalized-selected-clinic"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#006A61]" />
                <p className="text-sm leading-6 text-[#16443F]">
                  {requestedClinicCount === 1
                    ? 'Изпрати заявка към 1 клиника.'
                    : `Изпрати заявки към ${requestedClinicCount} клиники.`}{' '}
                  Всяка клиника ще се свърже с теб според процеса си за обработка.
                </p>
              </div>
            )}

            <div
              className={`grid gap-5 ${
                data.clinic_count === 1
                  ? 'max-w-xl grid-cols-1'
                  : data.clinic_count === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
              data-testid="personalized-clinics-grid"
            >
              {data.clinics.map((clinic, index) => (
                <div
                  key={clinic.id}
                  className="animate-[fadeInUp_.24s_ease-out_both] motion-reduce:animate-none"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <ClinicRecommendationCard
                    clinic={clinic}
                    position={index + 1}
                    leadId={leadId}
                    requestedClinicIds={requestedClinicIds}
                    onSubmitted={handleSubmitted}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 border-t border-[#C8D8D4] pt-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <p className="max-w-3xl text-sm leading-6 text-[#45464D]">
                Подборът използва локация, посоката от въпросника и публикуваните
                данни на клиниките. Партньорският статус може да влияе на
                видимостта, но не е медицински рейтинг или гаранция за резултат.
              </p>

              {selection?.has_requested_zubite_help ? (
                <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#E7F6F3] px-4 py-3 text-sm font-semibold text-[#006A61]">
                  <CheckCircle2 className="h-4 w-4" />
                  Zubite ще ти помогне
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAssistedModalOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#8CB5AE] bg-white px-4 py-3 text-sm font-semibold text-[#073B36] transition-colors hover:border-[#006A61] hover:text-[#006A61]"
                  data-testid="personalized-assisted-choice"
                >
                  <Sparkles className="h-4 w-4" />
                  Помогни ми да избера
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {assistedModalOpen && (
        <AssistedChoiceModal
          leadId={leadId}
          source="matching_page"
          initialContact={getStoredLeadContact(leadId)}
          onClose={() => setAssistedModalOpen(false)}
          onSuccess={() => {
            setAssistedModalOpen(false)
            getSelectionState(leadId).then(setSelection).catch(() => {})
          }}
        />
      )}
    </section>
  )
}

function RecommendationSkeletons() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Зареждане на препоръките">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-[420px] animate-pulse rounded-xl border border-[#C8D8D4] bg-white"
          data-testid={`personalized-skeleton-${index}`}
        >
          <div className="h-40 bg-[#DDECE8]" />
          <div className="space-y-3 p-6">
            <div className="h-5 w-2/3 rounded bg-[#E7EFED]" />
            <div className="h-4 w-1/3 rounded bg-[#E7EFED]" />
            <div className="h-16 rounded bg-[#F0F5F4]" />
            <div className="h-11 rounded-lg bg-[#DDECE8]" />
          </div>
        </div>
      ))}
      <span className="sr-only"><Loader2 className="h-4 w-4 animate-spin" /></span>
    </div>
  )
}
