'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import {
  ArrowLeft, Building2, MapPin, ShieldCheck, Calendar,
  Sparkle, AlertCircle, X, Compass, Loader2, PlayCircle,
  Stethoscope, Users, Image as ImageIcon, FileText,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {
  getRecommendedClinics,
  type RecommendedClinic,
} from '@/lib/api'
import { TREATMENT_LABELS } from '@/lib/consultationLabels'
import { ReviewSignalsSection } from '@/components/patient/ReviewSignalsSection'

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
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<ErrKind>(null)
  const [preview, setPreview] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await getRecommendedClinics(leadId, 3)
      const match = r.clinics.find((c) => c.id === clinicId)
      if (!match) {
        setErr('clinic_not_in_list')
        setClinic(null)
      } else {
        setClinic(match)
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

  useEffect(() => {
    if (leadId && clinicId) load()
  }, [leadId, clinicId, load])

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
              onOpenPreview={() => setPreview(true)}
            />
          ) : null}
        </div>
      </section>

      {preview && clinic && (
        <NextStepModal
          clinicName={clinic.name}
          onClose={() => setPreview(false)}
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
  onOpenPreview,
}: {
  clinic: RecommendedClinic
  leadId: string
  onOpenPreview: () => void
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
      {/* ── HERO ─────────────────────────────────────────────
          Premium: 2-column with media placeholder
          Featured & Standard: single-column compact header
      */}
      {isPremium ? (
        <PremiumHero
          clinic={clinic}
          showPlacement={showPlacement}
          onOpenPreview={onOpenPreview}
          leadId={leadId}
        />
      ) : (
        <CompactHero
          clinic={clinic}
          showPlacement={showPlacement}
          onOpenPreview={onOpenPreview}
          tier={tier}
        />
      )}

      {/* ── Видео представяне (Premium only) ───────────────── */}
      {isPremium && <VideoIntroSection />}

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

      {/* ── За клиниката (Featured + Premium) ───────────────── */}
      {(isFeatured || isPremium) && (
        <PlaceholderSection
          testid="profile-about-section"
          tierLabel={isPremium ? 'premium' : 'featured'}
          title="За клиниката"
          icon={<FileText className="w-4 h-4 text-sky-600" />}
          body="Клиниката все още не е добавила подробно описание към профила си."
        />
      )}

      {/* ── Екип и лекари + Среда и оборудване (Premium only) */}
      {isPremium && (
        <>
          <PlaceholderSection
            testid="profile-team-section"
            tierLabel="premium"
            title="Екип и лекари"
            icon={<Users className="w-4 h-4 text-sky-600" />}
            body="Информация за екипа ще бъде добавена от клиниката."
          />
          <PlaceholderSection
            testid="profile-environment-section"
            tierLabel="premium"
            title="Среда и оборудване"
            icon={<Stethoscope className="w-4 h-4 text-sky-600" />}
            body="Тук клиниката ще може да представи средата, технологиите и удобствата за пациента."
          />
        </>
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

      {/* ── Какво се случва, ако изберете тази клиника ──────── */}
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
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors"
            data-testid="profile-bottom-cta"
          >
            Искам обаждане от тази клиника
          </button>
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
}: {
  clinic: RecommendedClinic
  showPlacement: boolean
  onOpenPreview: () => void
  tier: 'featured' | 'standard'
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
        <button
          type="button"
          onClick={onOpenPreview}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors"
          data-testid="profile-top-cta"
        >
          Искам обаждане от тази клиника
        </button>
      </div>
    </header>
  )
}

function PremiumHero({
  clinic,
  showPlacement,
  onOpenPreview,
  leadId,
}: {
  clinic: RecommendedClinic
  showPlacement: boolean
  onOpenPreview: () => void
  leadId: string
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
            <button
              type="button"
              onClick={onOpenPreview}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors"
              data-testid="profile-top-cta"
            >
              Искам обаждане от тази клиника
            </button>
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

        {/* Right column — image placeholder */}
        <ClinicImagePlaceholder />
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

function NextStepModal({
  clinicName,
  onClose,
}: {
  clinicName: string
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-next-step-title"
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center px-4 py-6"
      onClick={onClose}
      data-testid="profile-next-step-modal"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3
              id="profile-next-step-title"
              className="font-serif text-xl font-semibold text-slate-900"
            >
              Следваща стъпка
            </h3>
            <p className="text-sm text-slate-500 mt-1">За {clinicName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="Затвори"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed mb-5">
          В следващата стъпка ще потвърдите телефона си и ще дадете съгласие
          Zubite да сподели заявката ви с избраната клиника.
        </p>

        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 leading-relaxed mb-5">
          Тази стъпка все още се изгражда. Засега виждате преглед на това какво
          ще се случи.
        </div>

        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full px-5 py-3 bg-slate-100 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed"
          data-testid="profile-next-step-disabled-cta"
        >
          Ще бъде активирано в следващата стъпка
        </button>
      </div>
    </div>
  )
}
