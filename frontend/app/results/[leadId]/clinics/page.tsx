'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import {
  AlertCircle, Compass, ArrowLeft, ShieldCheck, Sparkles,
  Loader2,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {
  getRecommendedClinics,
  type RecommendedClinicsResponse,
} from '@/lib/api'
import { ClinicRecommendationCard } from '@/components/patient/ClinicRecommendationCard'
import { ClinicMatchEmptyState } from '@/components/patient/ClinicMatchEmptyState'

type ErrKind = 'not_found' | 'expired' | 'rate_limited' | 'generic' | null

export default function ClinicMatchPage() {
  const params = useParams()
  const leadId = params.leadId as string

  const [data, setData] = useState<RecommendedClinicsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [errKind, setErrKind] = useState<ErrKind>(null)
  const [assistedPreview, setAssistedPreview] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErrKind(null)
    try {
      const r = await getRecommendedClinics(leadId, 3)
      setData(r)
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

  useEffect(() => {
    if (leadId) load()
  }, [leadId, load])

  return (
    <main className="min-h-screen bg-slate-50 overflow-x-hidden">
      <Header />

      <section className="pt-24 pb-12 md:pt-28 md:pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href={`/results/${leadId}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
            data-testid="match-back-link"
          >
            <ArrowLeft className="w-4 h-4" />
            Към резултата
          </Link>

          {/* Title block */}
          <div className="mb-10 max-w-3xl">
            <p className="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-sky-600 mb-3">
              Препоръчани клиники
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
              Ето до 3 подходящи клиники според вашия резултат
            </h1>
            <p className="text-slate-600 mt-3 leading-relaxed">
              Подбрахме партньорски клиники според града и типа заявка. Изберете
              една, ако искате клиниката да се свърже с вас, или поискайте
              помощ от Zubite.
            </p>
          </div>

          {/* Body */}
          {loading ? (
            <CardSkeletons />
          ) : errKind ? (
            <ErrorPanel kind={errKind} onRetry={load} leadId={leadId} />
          ) : data && data.clinic_count === 0 ? (
            <ClinicMatchEmptyState message={data.message} />
          ) : data ? (
            <>
              {/* Selection-rule banner */}
              <div
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-3 text-sm text-slate-600"
                data-testid="selection-rule-banner"
              >
                <ShieldCheck className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">
                  Може да разгледате до{' '}
                  <strong>{data.selection_rule.can_view_clinics}</strong>{' '}
                  клиники. Заявка за обаждане ще може да изпратите към{' '}
                  <strong>{data.selection_rule.can_request_call_from_clinics}</strong>{' '}
                  клиника. Ако се колебаете, използвайте „Помогнете ми да избера“.
                </p>
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
                  />
                ))}
              </div>

              {/* Assisted choice panel — non-submitting in P3 */}
              <section
                className="mt-10 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-6 sm:p-8 max-w-3xl mx-auto"
                data-testid="assisted-choice-panel"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900">
                    Не сте сигурни коя клиника да изберете?
                  </h2>
                </div>
                <p className="text-slate-600 leading-relaxed mb-5">
                  Можем да ви помогнем да изберете следваща стъпка според
                  ситуацията ви.
                </p>
                <button
                  type="button"
                  onClick={() => setAssistedPreview(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-full hover:bg-slate-50 transition-colors"
                  data-testid="assisted-choice-btn"
                >
                  <Compass className="w-4 h-4" />
                  Помогнете ми да избера
                </button>
              </section>
            </>
          ) : null}

          {/* Trust note — always rendered */}
          <p
            className="mt-12 text-xs text-slate-400 text-center max-w-2xl mx-auto leading-relaxed"
            data-testid="match-trust-note"
          >
            Zubite не поставя диагноза и не заменя преглед при лекар. Целта е да
            ви помогне да направите по-ясна следваща стъпка. Препоръките са
            базирани на наличните партньорски клиники и контекста на вашата
            заявка.
          </p>
        </div>
      </section>

      {assistedPreview && (
        <AssistedNextStepModal onClose={() => setAssistedPreview(false)} />
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
          className="bg-white border border-slate-200 rounded-2xl p-7 animate-pulse"
          data-testid={`match-skeleton-${i}`}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 mb-4" />
          <div className="h-5 w-3/4 bg-slate-100 rounded mb-2" />
          <div className="h-3 w-1/2 bg-slate-100 rounded mb-5" />
          <div className="h-3 w-full bg-slate-100 rounded mb-1.5" />
          <div className="h-3 w-5/6 bg-slate-100 rounded mb-6" />
          <div className="h-10 w-full bg-slate-100 rounded-full" />
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
      className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl mx-auto"
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors"
            data-testid="match-error-restart"
          >
            Започни отново
          </Link>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors"
            data-testid="match-error-retry"
          >
            <Loader2 className="w-4 h-4" />
            Опитай отново
          </button>
        )}
        <Link
          href={`/results/${leadId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-full hover:bg-slate-50 transition-colors"
        >
          Към резултата
        </Link>
      </div>
    </div>
  )
}

function AssistedNextStepModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assisted-title"
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center px-4 py-6"
      onClick={onClose}
      data-testid="assisted-preview-modal"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="assisted-title"
          className="font-serif text-xl font-semibold text-slate-900 mb-3"
        >
          Следваща стъпка
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed mb-5">
          В следващата стъпка ще потвърдите телефона си и ще дадете съгласие
          експерт от Zubite да ви се обади. Никакви данни няма да бъдат
          споделяни с трета страна, освен ако вие изрично не одобрите.
        </p>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 leading-relaxed mb-5">
          Тази стъпка все още се изгражда. Засега виждате преглед на това какво
          ще се случи.
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
          >
            Затвори
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="px-5 py-2 bg-slate-100 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed"
            data-testid="assisted-preview-disabled-cta"
          >
            Ще бъде активирано скоро
          </button>
        </div>
      </div>
    </div>
  )
}
