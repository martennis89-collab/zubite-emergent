'use client'

/**
 * Lead-context clinic profile route.
 *
 * Feb 2026 — Pass B unification: this page now REUSES the same
 * `ClinicProfileView` component that powers the public profile route
 * (`/kliniki/[city]/[specialty]/[clinicSlug]`). Patients in the post-quiz
 * funnel get the identical premium clinic profile experience, wrapped with
 * lead-context chrome only:
 *   • `ResultsHeader` (logo + „Ориентир, не диагноза" pill — no public nav)
 *   • Back link → `/results/[leadId]/clinics`
 *   • Recommendation reason banner — „Защо виждаш тази клиника" + same-city +
 *     Care Pass participation
 *   • Already-selected banner when the lead has already requested this clinic
 *
 * Public CTAs ("Заяви контакт" / "Запази час за консултация") inside the
 * profile open the public contact/scheduler modals — per Feb 2026 user
 * decision: the lead-context request modal is no longer wired in here.
 *
 * Privacy: route inherits `noindex/nofollow` from `/app/results/layout.tsx`.
 * No patient PII appears in metadata or JSON-LD.
 *
 * Data flow:
 *   1. `getLead(leadId)` → access gate (locked → redirect to /results/[leadId])
 *   2. `getRecommendedClinics(leadId, 3)` → locate the recommended clinic by id
 *      (preserves the "is this clinic actually in your shortlist?" invariant)
 *   3. `getPublicClinic(slug ?? clinicId)` → full public profile payload that
 *      `ClinicProfileView` expects (`getPublicClinic` accepts both slug AND id)
 *   4. `getSelectionState(leadId)` → already-selected banner state
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import {
  ArrowLeft, AlertCircle, Compass, Loader2, CheckCircle2, ShieldCheck,
  Gift, MapPin,
} from 'lucide-react'
import { ResultsHeader } from '@/components/ResultsHeader'
import { Footer } from '@/components/Footer'
import ClinicProfileView from '@/components/public-clinics/ClinicProfileView'
import {
  getLead,
  getRecommendedClinics,
  getSelectionState,
  type RecommendedClinic,
  type SelectionState,
} from '@/lib/api'
import { getPublicClinic, type PublicClinic } from '@/lib/publicClinics'

type ErrKind =
  | null
  | 'not_found'
  | 'expired'
  | 'rate_limited'
  | 'clinic_not_in_list'
  | 'profile_unavailable'
  | 'generic'

export default function ClinicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string
  const clinicId = params.clinicId as string

  // Lead-context data (recommendation reason, selection state, gate)
  const [recommended, setRecommended] = useState<RecommendedClinic | null>(null)
  const [selection, setSelection] = useState<SelectionState | null>(null)
  // Full public profile data (powers `ClinicProfileView`).
  const [publicProfile, setPublicProfile] = useState<PublicClinic | null>(null)
  const [gateChecked, setGateChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<ErrKind>(null)

  // ─── Access gate ────────────────────────────────────────────
  // Patients who haven't unlocked the result aren't allowed to view a
  // specific clinic profile in lead-context — they would otherwise see
  // a clinic name + city before submitting contact details. We send
  // them back to `/results/[leadId]?notice=locked` where the unlock
  // form is the primary action.
  useEffect(() => {
    if (!leadId) return
    let cancelled = false
    ;(async () => {
      try {
        const lead = await getLead(leadId)
        if (cancelled) return
        const unlocked =
          lead?.full_result_unlocked === true &&
          lead?.contact_details_submitted === true
        if (!unlocked) {
          router.replace(`/results/${leadId}?notice=locked`)
          return
        }
        setGateChecked(true)
      } catch {
        if (cancelled) return
        router.replace(`/results/${leadId}?notice=locked`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [leadId, router])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      // Step 1 — recommendations + selection state (lead context)
      const [r, s] = await Promise.all([
        getRecommendedClinics(leadId, 3),
        getSelectionState(leadId).catch(() => null),
      ])
      const match = r.clinics.find((c) => c.id === clinicId)
      if (!match) {
        setErr('clinic_not_in_list')
        setRecommended(null)
        return
      }
      setRecommended(match)
      setSelection(s)

      // Step 2 — full public profile. `getPublicClinic` accepts slug OR id,
      // so we prefer slug (richer cached URL) and fall back to id if the
      // partner clinic has no slug yet. This keeps the route resilient as
      // the slug rollout completes.
      const slugOrId = (match.slug && match.slug.length > 0) ? match.slug : match.id
      try {
        const profile = await getPublicClinic(slugOrId)
        setPublicProfile(profile)
      } catch {
        // Profile fetch failed (404 / non-2xx) — the clinic exists in the
        // recommendations whitelist but its public profile isn't published.
        // We still render a minimal lead-context shell so the patient has
        // useful info + a back link.
        setErr('profile_unavailable')
      }
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

  // Only start the heavy fetch chain once the access gate passes.
  useEffect(() => {
    if (gateChecked) load()
  }, [gateChecked, load])

  // ─── Loading / gate intermediate states ─────────────────────
  if (!gateChecked) {
    return (
      <main
        className="min-h-screen bg-[#FCFAF8] flex items-center justify-center"
        data-testid="lead-profile-gate-loading"
      >
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8] relative" data-testid="lead-clinic-profile-page">
      <ResultsHeader />

      {/* Lead-context wrapper — sits ABOVE the public ClinicProfileView so
          the patient never loses orientation about WHY they're seeing this
          clinic and HOW to return to their shortlist. */}
      <section className="pt-20 sm:pt-24" data-testid="lead-context-wrapper">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href={`/results/${leadId}/clinics`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition-colors mb-4"
            data-testid="profile-back-link"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад към препоръчаните клиники
          </Link>

          {loading && (
            <div className="rounded-2xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 p-10 flex items-center justify-center" data-testid="lead-profile-loading">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
            </div>
          )}

          {!loading && err && err !== 'profile_unavailable' && (
            <LeadProfileError kind={err} leadId={leadId} onRetry={load} />
          )}

          {/* Recommendation reason — small calm banner shown above the
              public profile body. Mirrors the language used on the
              recommendation page so the journey feels continuous. */}
          {!loading && recommended && (
            <RecommendationReasonBanner
              clinic={recommended}
              alreadyRequested={
                selection?.has_selected_clinic === true &&
                selection?.selected_clinic_id === clinicId
              }
            />
          )}
        </div>
      </section>

      {/* ─── Public profile body ─────────────────────────────────
          The exact same `<ClinicProfileView />` powering
          `/kliniki/[city]/[specialty]/[clinicSlug]`. Public CTAs intact. */}
      {publicProfile && !err && (
        <ClinicProfileView clinic={publicProfile} />
      )}

      {/* When the public profile is unavailable but the lead-context
          recommendation IS present, we show a minimal shell so the patient
          still has the back link + recommendation reason and a clear note. */}
      {!loading && err === 'profile_unavailable' && recommended && (
        <ProfileUnavailableShell clinic={recommended} leadId={leadId} />
      )}

      <Footer />
    </main>
  )
}

// ─── Lead-context recommendation banner ──────────────────────────
function RecommendationReasonBanner({
  clinic,
  alreadyRequested,
}: {
  clinic: RecommendedClinic
  alreadyRequested: boolean
}) {
  // Build the small reason chips — same set as on the recommendation
  // grid card so the journey feels continuous.
  const chips: { icon: typeof ShieldCheck; label: string; testid: string }[] = []
  if (clinic.same_city) chips.push({ icon: MapPin, label: 'В твоя град', testid: 'reason-chip-same-city' })
  if (clinic.care_pass_partner) chips.push({ icon: Gift, label: 'Care Pass участваща', testid: 'reason-chip-care-pass' })
  if (clinic.placement_label) chips.push({ icon: ShieldCheck, label: clinic.placement_label, testid: 'reason-chip-placement' })

  return (
    <article
      className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.20)] p-5 sm:p-6 mb-8 sm:mb-10"
      data-testid="recommendation-reason-banner"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 ring-1 ring-teal-100 text-teal-700 flex-shrink-0">
          <Compass className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-teal-700">
            Защо виждаш тази клиника
          </p>
          <h2 className="mt-1.5 font-serif text-base sm:text-lg text-slate-900 leading-snug">
            Релевантна за твоята заявка
            {clinic.city_name ? <> в <span className="text-teal-700">{clinic.city_name}</span></> : null}
          </h2>
          {clinic.reason && (
            <p className="mt-1.5 text-[13px] text-slate-600 leading-relaxed" data-testid="reason-text">
              {clinic.reason}
            </p>
          )}
          {chips.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" data-testid="reason-chips">
              {chips.map(({ icon: I, label, testid }) => (
                <li
                  key={testid}
                  data-testid={testid}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 ring-1 ring-teal-100 text-[11px] text-teal-700 font-medium"
                >
                  <I className="w-3 h-3" />
                  {label}
                </li>
              ))}
            </ul>
          )}

          {alreadyRequested && (
            <div
              className="mt-4 inline-flex items-start gap-2 rounded-xl ring-1 ring-emerald-200 bg-emerald-50/80 px-3 py-2 text-[12px] text-emerald-900 leading-snug"
              data-testid="already-requested-banner"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" />
              <span>
                Заявката е изпратена към тази клиника. Тя ще се свърже с теб според процеса си за обработка на заявки.
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── Profile-unavailable fallback ────────────────────────────────
function ProfileUnavailableShell({
  clinic,
  leadId,
}: {
  clinic: RecommendedClinic
  leadId: string
}) {
  return (
    <section className="py-12" data-testid="profile-unavailable-shell">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-white/80 p-8 sm:p-10 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 ring-1 ring-amber-100 text-amber-700 mb-4">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-2">
            {clinic.name}
          </h2>
          <p className="text-slate-600 text-[14.5px] leading-relaxed mb-2">
            <MapPin className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-slate-400" />
            {clinic.city_name}
          </p>
          <p className="text-slate-600 text-[13.5px] leading-relaxed mb-6">
            Подробният профил на тази клиника все още не е публикуван. Може да заявиш контакт през препоръчания списък — клиниката ще се свърже с теб.
          </p>
          <Link
            href={`/results/${leadId}/clinics`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/65 backdrop-blur-xl ring-1 ring-white/80 text-slate-700 text-sm font-medium hover:bg-white transition-all"
            data-testid="profile-unavailable-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад към препоръчаните клиники
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Error state ─────────────────────────────────────────────────
function LeadProfileError({
  kind,
  leadId,
  onRetry,
}: {
  kind: Exclude<ErrKind, null | 'profile_unavailable'>
  leadId: string
  onRetry: () => void
}) {
  const MSG: Record<typeof kind, { title: string; body: string }> = {
    not_found: {
      title: 'Тази заявка не съществува',
      body: 'Линкът може да е изтекъл или невалиден.',
    },
    expired: {
      title: 'Заявката е изтекла',
      body: 'Заради пациентската сигурност резултатите се пазят временно.',
    },
    rate_limited: {
      title: 'Твърде много заявки',
      body: 'Изчакай малко и опитай отново.',
    },
    clinic_not_in_list: {
      title: 'Клиниката не е в твоя списък',
      body: 'Виж 3-те препоръчани клиники в твоя личен списък.',
    },
    generic: {
      title: 'Възникна грешка',
      body: 'Опитай отново. Ако проблемът продължи, използвай назад към препоръчаните клиники.',
    },
  }
  const m = MSG[kind]
  return (
    <div
      className="rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] p-8 sm:p-10 text-center"
      data-testid={`lead-profile-error-${kind}`}
    >
      <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 text-amber-700 grid place-items-center mb-4">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h2 className="font-serif text-xl text-slate-900 mb-2">{m.title}</h2>
      <p className="text-slate-600 text-sm leading-relaxed mb-5">{m.body}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/65 backdrop-blur-xl ring-1 ring-white/80 text-slate-700 text-sm font-medium hover:bg-white transition-all"
          data-testid="lead-profile-retry"
        >
          Опитай отново
        </button>
        <Link
          href={`/results/${leadId}/clinics`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium shadow-[0_10px_28px_-10px_rgba(13,148,136,0.55)] hover:-translate-y-0.5 transition-all"
          style={{ backgroundImage: 'linear-gradient(135deg,#5eead4 0%,#2dd4bf 60%,#14b8a6 100%)' }}
          data-testid="lead-profile-back-to-clinics"
        >
          <ArrowLeft className="w-4 h-4" />
          Препоръчаните клиники
        </Link>
      </div>
    </div>
  )
}
