'use client'

/**
 * <ClinicProfileView />
 * ------------------------------------------------------------------
 * Phase C1 — tier-aware clinic-home redesign.
 * Phase C1.1 — layout refinement: compact hero, overview grid,
 *              anchor nav, two-column desktop with sticky action panel.
 *
 * The page should feel like a clinic's premium home inside Zubite,
 * not a CMS stack. No new features; structure + density only.
 *
 * Trust rules preserved:
 *  • No fake clinic claims, prices, reviews, cases, or expert answers.
 *  • Sponsored badge always reads "Спонсорирано", separated from tier.
 *  • Demo clinics carry a sticky banner; route layer adds noindex.
 */

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Building2, MapPin, ShieldCheck, Sparkles, Video, Gift,
  Phone, Check, MessagesSquare, Stethoscope, UserCircle2,
  Award, Quote, FileText, Megaphone, ChevronDown,
  CalendarClock, MessageCircle,
} from 'lucide-react'
import {
  CLINIC_CONTACT_ACTION_COPY, type PublicClinic, treatmentLabel, cityDisplay,
} from '@/lib/publicClinics'
import ConsultationScheduler from './ConsultationScheduler'
import EmptyStateCard from './EmptyStateCard'

const PublicContactModal = dynamic(() => import('./PublicContactModal'), { ssr: false })
const PatientChatModal = dynamic(
  () => import('@/components/patient/PatientChatModal').then((module) => module.PatientChatModal),
  { ssr: false },
)

const SUGGESTED_QUESTIONS: Array<{ topic: string; question: string }> = [
  { topic: 'Цена', question: 'Каква е приблизителната цена за моя случай и от какво зависи финалната сума?' },
  { topic: 'Подходящ за мен', question: 'Кои методи са подходящи за моя случай и кои бихте препоръчали по-внимателно?' },
  { topic: 'Времева линия', question: 'Колко време обикновено отнема целият процес — от консултация до завършване?' },
  { topic: 'Алтернативи', question: 'Има ли алтернативни лечения, които си струва да обмисля заедно с предложения план?' },
  { topic: 'Рискове', question: 'Какви са основните рискове на това лечение и как ги минимизирате?' },
  { topic: 'Поддръжка', question: 'Какво се случва след края на активното лечение — ретенция, контролни прегледи?' },
]

type SchedulerState = 'available' | 'enabled_no_slots' | 'disabled' | null

const BULGARIAN_NUMBER = new Intl.NumberFormat('bg-BG')

function completedCasesLabel(count: number): string {
  const formatted = BULGARIAN_NUMBER.format(count)
  return count === 1
    ? `${formatted} завършен случай`
    : `${formatted} завършени случая`
}

function clinicLongevityLabel(years: number, foundedYear: number): string {
  if (years < 1) return `Основана през ${foundedYear} г.`
  if (years === 1) return `1 година практика · от ${foundedYear} г.`
  return `${years} години практика · от ${foundedYear} г.`
}

function doctorInitials(name: string): string {
  const cleanName = name.replace(/^д-р\s+/i, '').trim()
  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('bg-BG'))
    .join('') || 'ДР'
}

type ClinicActionVariant = {
  label: string
  description: string
  onClick: () => void
  kind: 'visit' | 'online' | 'contact'
  testId?: string
}

interface Props {
  clinic: PublicClinic
  /**
   * Present ONLY when rendered from lead-context
   * (`/results/[leadId]/clinics/[clinicId]`) — never from the public
   * Present when the visitor already has a `leadId` from the quiz flow —
   * the chat CTA renders regardless (gated on the package entitlement
   * alone), but a visitor with no quiz history gets a name-gate inside
   * the chat widget itself instead of a token minted straight from this.
   */
  chatContext?: { leadId: string }
}

export default function ClinicProfileView({ clinic, chatContext }: Props) {
  const [contactCtx, setContactCtx] = useState<
    | { consultationType: 'general' | 'online' }
    | null
  >(null)
  const [sourcePath, setSourcePath] = useState<string>('')
  const [schedulerState, setSchedulerState] = useState<SchedulerState>(null)
  const [chatOpen, setChatOpen] = useState(false)
  // Bumped on every CTA click so the widget can re-maximize itself if the
  // patient had minimized it — `chatOpen` alone only controls whether the
  // widget is mounted at all, and stays true while minimized (unmounting
  // it would kill the background polling that keeps the unread badge live).
  const [chatOpenSignal, setChatOpenSignal] = useState(0)
  const consultationRef = useRef<HTMLDivElement>(null)
  const sectionNavSentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSourcePath(window.location.pathname || '')
    }
  }, [])

  // Section gating reads server-computed entitlements (from
  // `entitlements.py`), NOT `partner_tier`.
  //
  // The old gate was `partner_tier !== 'standard'` / `=== 'premium'`.
  // `partner_tier` is a legacy audit field that is never written from the
  // canonical `base_package`, so the API reports "standard" for every
  // clinic created since the Feb-2026 revamp — which silently rendered
  // paying Growth Partners (€199/mo) as minimum Verified profiles: no
  // approach, no team, no questions, no case library, no story.
  //
  // Fallback to the legacy read only if `entitlements` is missing (older
  // cached payload), so this degrades to previous behaviour rather than
  // erasing sections outright.
  const ent = clinic.entitlements
  const isEnhanced = ent
    ? ent.enhanced_clinic_profile
    : clinic.partner_tier !== 'standard'
  const canShowCases = ent
    ? ent.case_library_eligibility
    : clinic.partner_tier === 'premium'
  const canShowExpertQa = ent
    ? ent.expert_qa
    : clinic.partner_tier === 'premium'
  const maxTreatmentSections = ent?.max_treatment_sections ?? 3
  const treatmentCaseCounts = clinic.treatment_case_counts || []
  /**
   * Trust signals — team, treatments, location, clinic focus — are sold
   * with BOTH packages. The locked pricing lists them verbatim under
   * Verified Profile ("Structured trust signals: team, treatments,
   * location, clinic-focus info"), but clinic focus and team used to sit
   * behind the enhanced gate, so a Verified clinic paying for them got
   * only treatments + location. True for both packages by default;
   * still an entitlement so an admin override can withdraw it.
   */
  const hasTrustSignals = ent ? ent.structured_trust_signals : true
  const hasFocusSignals = clinic.treatment_focus.length > 0
    || (isEnhanced && treatmentCaseCounts.length > 0)
  const hasDoctorSpotlight = isEnhanced && !!clinic.doctor_spotlight?.name
  const hasTeamContent = !!(clinic.team_image_url || clinic.team_note)
  const hasServices = clinic.treatments.length > 0
  const doctorAnchorLabel = clinic.doctor_spotlight?.kind === 'owner'
    ? 'Собственик'
    : 'Водещ лекар'
  // Gates the chat CTA on the package entitlement alone — available on
  // EVERY Growth clinic's profile, quiz or not. Independent of
  // `viber_phone`, since a clinic can offer in-platform chat without
  // configuring Viber. A visitor with no `chatContext` (never took the
  // quiz) still gets the button; the widget's own name-gate view handles
  // bootstrapping an identity for them.
  const canChat = !!ent?.patient_chat_channels

  const tierBadgeStyle =
    clinic.base_package === 'growth_partner'
      ? 'bg-teal-50 text-teal-800 ring-teal-100'
      : 'bg-slate-50 text-slate-700 ring-slate-200'

  const scrollTo = useCallback((id: string) => {
    if (typeof document !== 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Phase C1.1 — Hero CTA decision tree
  const openContact = useCallback(
    () => setContactCtx({ consultationType: 'general' }),
    [],
  )

  const heroPrimary: ClinicActionVariant = useMemo(() => {
    // Feb 2026 booking engine — when the clinic has `booking_enabled`
    // (Growth Partner or explicit admin override), the primary CTA
    // navigates to the full booking calendar. Otherwise fall back to
    // the existing online-orientation path.
    if (clinic.booking_enabled) {
      return {
        label: 'Запази консултация',
        description: 'Запазваш посещение в клиниката. Екипът потвърждава избрания час.',
        onClick: () => {
          const returnTo = encodeURIComponent(window.location.pathname)
          window.location.href = `/booking/${clinic.id}?returnTo=${returnTo}`
        },
        kind: 'visit',
        testId: 'clinic-book-consultation-cta',
      }
    }
    if (schedulerState === 'available') {
      return {
        label: 'Запази онлайн консултация',
        description: 'Избираш час за кратък дистанционен разговор с клиниката.',
        onClick: () => scrollTo('consultation'),
        kind: 'online',
      }
    }
    return {
      label: CLINIC_CONTACT_ACTION_COPY.label,
      description: CLINIC_CONTACT_ACTION_COPY.description,
      onClick: openContact,
      kind: 'contact',
    }
  }, [clinic.booking_enabled, clinic.id, schedulerState, openContact, scrollTo])

  const heroSecondary: ClinicActionVariant | null = useMemo(() => {
    if (heroPrimary.kind !== 'contact') {
      return {
        label: CLINIC_CONTACT_ACTION_COPY.label,
        description: CLINIC_CONTACT_ACTION_COPY.description,
        onClick: openContact,
        kind: 'contact',
      }
    }
    return null
  }, [heroPrimary.kind, openContact])

  const heroNote =
    schedulerState === 'enabled_no_slots'
      ? 'Клиниката приема заявки за онлайн консултация, но няма публикувани свободни часове.'
      : null

  // Anchors must track the same entitlements as the sections they point
  // at — a link to a section the clinic isn't entitled to scrolls nowhere.
  const visibleAnchors = useMemo(() => {
    const all: Array<{ id: string; label: string }> = [{ id: 'overview', label: 'Обзор' }]
    if (hasTrustSignals && hasFocusSignals) all.push({ id: 'focus', label: 'Фокус' })
    if (hasDoctorSpotlight) all.push({ id: 'lead-doctor', label: doctorAnchorLabel })
    if (hasServices) all.push({ id: 'services', label: 'Лечения' })
    if (isEnhanced) all.push({ id: 'approach', label: 'Подход' })
    if (isEnhanced) all.push({ id: 'questions', label: 'Въпроси' })
    if (hasTrustSignals && hasTeamContent) all.push({ id: 'team', label: 'Екип' })
    if (canShowCases) all.push({ id: 'cases', label: 'Случаи' })
    all.push({ id: 'location', label: 'Локация' })
    all.push({ id: 'consultation', label: 'Консултация' })
    return all
  }, [isEnhanced, canShowCases, hasTrustSignals, hasFocusSignals, hasDoctorSpotlight, doctorAnchorLabel, hasServices, hasTeamContent])

  const hasRealZubiteFeedback = false  // Reserved — never faked.

  const anchorIds = useMemo(() => visibleAnchors.map((a) => a.id), [visibleAnchors])
  const activeAnchor = useActiveSection(anchorIds)
  const sectionNavIsRail = useProfileSectionNavRail(sectionNavSentinelRef)

  return (
    <main
      // No overflow-x-hidden here: <body> (app/layout.tsx) already clips
      // horizontal bleed at the true viewport level. Repeating it on this
      // <main> made *this* element the nearest non-visible-overflow
      // ancestor of the right-column `sticky` action panel below, which
      // silently breaks position: sticky (it becomes contained to main's
      // box instead of the page viewport) — the panel scrolled off after
      // one screen and left a multi-thousand-px blank void in its place.
      className="taste-clinic-profile-page min-h-screen bg-[#FCFAF8] relative pb-24"
      data-testid="public-clinic-profile"
      data-clinic-id={clinic.id}
      data-tier={clinic.partner_tier}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(94,234,212,0.18) 0%, rgba(94,234,212,0) 60%),' +
            'radial-gradient(ellipse 50% 40% at 90% 30%, rgba(165,243,252,0.22) 0%, rgba(165,243,252,0) 60%)',
        }}
      />

      {clinic.is_demo && <DemoBanner />}

      <section className="relative pt-10 sm:pt-14 pb-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <Link
            href="/kliniki"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs text-slate-500 hover:text-teal-700 mb-3 transition-colors"
            data-testid="profile-back-to-listing"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Към каталога с клиники
          </Link>

          {/* ═══════════ Immersive Hero ═══════════
              The clinic's own photo (or team shot) carries the section as a
              darkened background, with the identity + key facts overlaid on
              top. This is the "mini-site" moment: the clinic's room, not a
              Zubite card with a thumbnail bolted to the side.

              Contrast: the scrim below is a bottom-weighted black gradient,
              so white text sits on ~70-85% black regardless of how light the
              uploaded photo is. Never rely on the photo being dark. */}
          <Reveal as="header">
            <div
              id="overview"
              className="relative rounded-2xl overflow-hidden ring-1 ring-slate-900/10 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] scroll-mt-20 min-h-[420px] sm:min-h-[460px] flex"
              data-testid="profile-hero"
            >
              {/* Background image / fallback */}
              <div aria-hidden className="absolute inset-0">
                {clinic.hero_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={clinic.hero_image_url}
                    alt=""
                    decoding="async"
                    fetchPriority="high"
                    className="w-full h-full object-cover"
                    data-testid="profile-hero-image"
                  />
                ) : (
                  /* No photo yet — a calm branded field rather than a broken
                     frame. Never a stock dental photo. */
                  <div className="w-full h-full bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 grid place-items-center">
                    <Building2 className="w-16 h-16 text-white/10" />
                  </div>
                )}
              </div>

              {/* Darkening scrim — bottom-weighted so the copy block is
                  always legible, top kept lighter so the photo still reads. */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(2,20,24,0.45) 0%, rgba(2,20,24,0.30) 30%, rgba(2,20,24,0.78) 78%, rgba(2,20,24,0.92) 100%)',
                }}
              />
              {/* Subtle brand tint so every clinic photo still feels Zubite */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none mix-blend-soft-light"
                style={{
                  background:
                    'radial-gradient(ellipse 70% 60% at 15% 100%, rgba(45,212,191,0.55) 0%, rgba(45,212,191,0) 70%)',
                }}
              />

              {/* Content */}
              <div className="relative w-full flex flex-col justify-end p-5 sm:p-7 lg:p-9">
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md"
                    data-testid="profile-tier-label"
                  >
                    <Sparkles className="w-3 h-3" />
                    {clinic.public_status_label}
                  </span>
                  {clinic.is_sponsored && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900/50 text-white/90 ring-1 ring-white/20 backdrop-blur-md"
                      data-testid="profile-sponsored-label"
                      title="Спонсорираната видимост е обозначена отделно и не влияе на органичното подреждане."
                    >
                      <Megaphone className="w-3 h-3" />
                      Спонсорирано
                    </span>
                  )}
                  {clinic.chat_presence && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md"
                      data-testid="profile-chat-presence-label"
                    >
                      {clinic.chat_presence === 'online' ? (
                        <span className="relative flex w-2 h-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                      ) : (
                        <MessagesSquare className="w-3 h-3" />
                      )}
                      {clinic.chat_presence === 'online' ? 'Онлайн сега' : 'Приема онлайн консултации'}
                    </span>
                  )}
                </div>

                <h1
                  className="font-display text-[28px] sm:text-4xl lg:text-[44px] font-semibold text-white leading-[1.05] tracking-tight drop-shadow-sm"
                  data-testid="profile-name"
                >
                  {clinic.name}
                </h1>
                <p className="mt-2 text-sm text-white/75 inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {clinic.city_name || cityDisplay(clinic.city_slug || '')}
                  {clinic.area && ` · ${clinic.area}`}
                </p>

                {clinic.short_description && (
                  <p
                    className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl line-clamp-3"
                    data-testid="profile-short-description"
                  >
                    {clinic.short_description}
                  </p>
                )}

                {/* Key-fact containers — only render what the clinic actually
                    has. No placeholders, no invented stats. */}
                <HeroFacts clinic={clinic} />

                <ClinicActionHub
                  primary={heroPrimary}
                  secondary={heroSecondary}
                  viberPhone={clinic.viber_phone}
                  canChat={canChat}
                  onOpenChat={() => {
                    setChatOpen(true)
                    setChatOpenSignal((s) => s + 1)
                  }}
                />
                {heroNote && (
                  <p
                    className="mt-2 text-[11px] text-amber-200/90 leading-snug"
                    data-testid="profile-cta-note"
                  >
                    {heroNote}
                  </p>
                )}
                {clinic.is_sponsored && (
                  <p
                    className="mt-2 text-[10px] text-white/55 leading-snug"
                    data-testid="profile-sponsored-helper"
                  >
                    Спонсорираната видимост е обозначена отделно и не влияе на органичното подреждане.
                  </p>
                )}
              </div>
            </div>
          </Reveal>

          {/* ═══════════ Overview cards ═══════════ */}
          <Reveal delay={80}>
            <ClinicFactRail
              clinic={clinic}
              schedulerState={schedulerState}
            />
          </Reveal>

          {/* Showcase-only listing-card preview */}
          {clinic.is_addons_showcase && (
            <Reveal delay={120}>
              <ShowcaseListingCardPreview clinic={clinic} />
            </Reveal>
          )}

          {/* ═══════════ Section navigation ═══════════
              It begins as a horizontal in-page menu. On wide screens,
              once this sentinel clears the site header, the same element
              reshapes into a fixed vertical rail in the left page gutter.
              The placeholder preserves document flow while it is fixed. */}
          <div ref={sectionNavSentinelRef} className="mt-6 h-px" aria-hidden="true" />
          {sectionNavIsRail && <div className="taste-profile-section-nav-placeholder" aria-hidden="true" />}
          <nav
            className="taste-profile-section-nav sticky top-20 z-20 -mx-4 overflow-x-auto border-y border-[#E5E5E5] bg-[#F5F4F2]/95 px-4 sm:mx-0 sm:rounded-xl sm:border"
            data-testid="profile-anchor-nav"
            data-layout={sectionNavIsRail ? 'rail' : 'horizontal'}
            aria-label="Навигация в профила"
          >
            <ul className="inline-flex gap-6 py-3 px-1">
              {visibleAnchors.map((a) => {
                const isActive = activeAnchor === a.id
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(a.id)}
                      className={
                        'relative inline-flex min-h-11 min-w-11 items-center justify-center px-1 py-1 text-[12px] font-semibold transition-colors whitespace-nowrap ' +
                        (isActive
                          ? 'text-black after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:bg-[#EC6B2D]'
                          : 'text-[#686868] hover:text-black')
                      }
                      data-testid={`anchor-${a.id}`}
                      data-active={isActive ? 'true' : 'false'}
                    >
                      {a.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* ═══════════ Two-column layout ═══════════
              The left column is no longer a flat vertical stack of
              identical full-width cards — sections that share the same
              entitlement gate (so one never renders without the other)
              are paired side by side; sections with independent gates
              compute their own presence first so an unpaired survivor
              spans the full row instead of leaving an empty grid cell. */}
          <div className="taste-profile-body mx-auto mt-10 max-w-5xl">
            {/* ── Left main column ── */}
            <div className="space-y-5 min-w-0">
              {/* Clinic focus is available to both packages. Growth profiles
                  can additionally show clinic-declared completed-case totals
                  per treatment as a structured experience signal. */}
              {hasTrustSignals && hasFocusSignals && (
                <Reveal>
                  <SectionShell
                    id="focus"
                    testid="profile-section-focus"
                    eyebrow="Фокус на клиниката"
                    title="Леченията, в които клиниката е специализирана"
                    subtitle="Тези направления са посочени от самата клиника като областите, в които има най-силен практически опит."
                  >
                    {clinic.treatment_focus.length > 0 && (
                      <ul className="flex flex-wrap gap-2" data-testid="clinic-focus-list">
                        {clinic.treatment_focus.map((treatment) => (
                          <li
                            key={treatment}
                            className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-[13px] font-medium text-teal-800"
                          >
                            <Award className="h-3.5 w-3.5" aria-hidden="true" />
                            {treatmentLabel(treatment)}
                          </li>
                        ))}
                      </ul>
                    )}

                    {isEnhanced && treatmentCaseCounts.length > 0 && (
                      <div className={clinic.treatment_focus.length > 0 ? 'mt-6 border-t border-slate-200 pt-5' : ''}>
                        <div className="mb-3 flex items-start gap-3">
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-white">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Практически опит по лечения</h3>
                            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                              Брой завършени случаи, деклариран от клиниката. Това не е броят на публикуваните случаи в Zubite.
                            </p>
                          </div>
                        </div>
                        <ul className="grid gap-2 sm:grid-cols-2" data-testid="treatment-case-counts">
                          {treatmentCaseCounts.map((row) => (
                            <li
                              key={`${row.treatment}-${row.as_of_year || 'undated'}`}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {treatmentLabel(row.treatment)}
                              </p>
                              <p className="mt-2 font-display text-2xl font-semibold leading-none text-slate-950">
                                {completedCasesLabel(row.completed_cases)}
                              </p>
                              <p className="mt-2 text-[11px] leading-snug text-slate-500">
                                Данни, предоставени от клиниката{row.as_of_year ? ` · към ${row.as_of_year} г.` : ''}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </SectionShell>
                </Reveal>
              )}

              {hasDoctorSpotlight && clinic.doctor_spotlight && (
                <Reveal>
                  <DoctorSpotlightFeature clinic={clinic} />
                </Reveal>
              )}

              {/* Treatments offered (services anchor retained for URL compatibility). */}
              {hasServices && (
                <SectionShell id="services" testid="profile-section-services" title="Предлагани лечения">
                  <div>
                    <ul className="flex flex-wrap gap-1">
                      {clinic.treatments.map((t) => (
                        <li
                          key={t}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 text-[12px]"
                        >
                          {treatmentLabel(t)}
                        </li>
                      ))}
                    </ul>
                    {/* Expanded per-treatment detail. `max_treatment_sections`
                        is the paid boundary between the packages (Verified 3 /
                        Growth 8) and was previously not enforced anywhere on
                        the public page — every clinic rendered all of them.
                        The chip list above always shows the full set; only the
                        expanded sections are capped. */}
                    {isEnhanced && (
                      <div className="mt-3 space-y-1" data-testid="profile-treatments-accordion">
                        {clinic.treatments.slice(0, maxTreatmentSections).map((t, i) => (
                          <TreatmentAccordion
                            key={t}
                            slug={t}
                            detail={clinic.treatment_details[t]}
                            defaultOpen={i === 0}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </SectionShell>
              )}

              {/* Premium block. Approach stays full width (its own internal
                  split already carries visual variety); process and
                  questions share one gate (`isEnhanced`, no independent
                  sub-condition) so they always co-occur or co-absent
                  together — a genuinely safe pair, not a forced one. */}
              {isEnhanced && (
                <>
                  {/* Approach — patient-intro text alongside a highlighted
                      first-consultation quote. Kept as a genuine two-column
                      split (not the generic AI "headline left / filler
                      paragraph right" pattern) because both sides carry
                      real, distinct content. */}
                  <Reveal>
                    <SectionShell
                      id="approach"
                      testid="profile-section-approach"
                      title="Подходът на клиниката"
                    >
                      {clinic.patient_intro || clinic.philosophy ? (
                        <div className="grid md:grid-cols-[1.4fr,1fr] gap-4 items-start">
                          <div>
                            {clinic.patient_intro && (
                              <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">
                                {clinic.patient_intro}
                              </p>
                            )}
                          </div>
                          <div className="rounded-xl bg-teal-50/60 ring-1 ring-teal-100 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 mb-1.5">
                              Първа консултация
                            </p>
                            {clinic.philosophy ? (
                              <blockquote className="text-[13px] text-slate-700 italic leading-relaxed border-l-2 border-teal-400 pl-3">
                                „{clinic.philosophy}"
                              </blockquote>
                            ) : (
                              <p className="text-[12px] text-slate-500 italic leading-snug">
                                Клиниката още не е добавила обобщение на философията си.
                              </p>
                            )}
                            <p className="mt-3 text-[11px] text-slate-500 leading-snug">
                              Заявката не е автоматично потвърждение. Клиниката следва своя процес за първичен преглед.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <EmptyStateCard testid="empty-patient-intro" />
                      )}
                    </SectionShell>
                  </Reveal>

                  <PairRow
                    left={
                      <SectionShell testid="profile-section-process" title="Как протича консултацията">
                        {clinic.consultation_process ? (
                          <Accordion
                            items={consultationStepsFromText(clinic.consultation_process)}
                            testid="accordion-process"
                            defaultOpenIdx={0}
                          />
                        ) : (
                          <EmptyStateCard testid="empty-process" />
                        )}
                      </SectionShell>
                    }
                    right={
                      <SectionShell id="questions" testid="profile-section-questions" title="Въпроси, които можеш да зададеш" subtitle="Неутрални предложения от Zubite — не са твърдения на клиниката.">
                        <Accordion
                          items={SUGGESTED_QUESTIONS.map((q, i) => ({
                            id: `q-${i}`,
                            head: q.topic,
                            body: q.question,
                          }))}
                          testid="accordion-questions"
                          defaultOpenIdx={-1}
                        />
                      </SectionShell>
                    }
                  />
                </>
              )}

              {/* The lead clinician now has a dedicated full-width feature
                  near the top. This later pair is reserved for the wider
                  team and the clinic's technology. */}
              <PairRow
                left={
                  hasTrustSignals && hasTeamContent && (
                    <SectionShell id="team" testid="profile-section-team" title="Екипът на клиниката">
                      {(clinic.team_image_url || clinic.team_note) ? (
                        <div>
                          {clinic.team_image_url && (
                            <figure data-testid="profile-team-figure">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={clinic.team_image_url}
                                alt={`Екипът на ${clinic.name}`}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-48 sm:h-64 object-cover rounded-xl ring-1 ring-slate-200"
                                data-testid="profile-team-image"
                              />
                              <figcaption className="mt-1.5 text-[11px] text-slate-500 leading-snug">
                                Екипът на клиниката
                              </figcaption>
                            </figure>
                          )}
                          {clinic.team_note && (
                            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                              {clinic.team_note}
                            </p>
                          )}
                        </div>
                      ) : (
                        <EmptyStateCard hint="Екип" message="Клиниката все още не е добавила представяне на екипа." testid="empty-team" />
                      )}
                    </SectionShell>
                  )
                }
                right={
                  isEnhanced && (
                    <SectionShell testid="profile-section-technology" title="Технологии и дигитален работен процес">
                      {clinic.technology_section.length > 0 ? (
                        <Accordion
                          items={clinic.technology_section.map((t, i) => ({
                            id: `tech-${i}`,
                            head: t.split(/[—:.]/, 1)[0].trim() || `Технология ${i + 1}`,
                            body: t,
                          }))}
                          testid="accordion-technology"
                          defaultOpenIdx={-1}
                        />
                      ) : (
                        <EmptyStateCard hint="Технологии" message="Все още няма публикувана информация за технологии и дигитален работен процес." testid="empty-technology" />
                      )}
                    </SectionShell>
                  )
                }
              />

              {/* Enhanced-profile block (Growth Partner). Individual
                  sub-sections carry their own entitlement gate where the
                  entitlement is distinct — case library and expert Q&A can
                  be granted or withheld independently via add-ons/overrides,
                  so they must not ride on the enhanced-profile flag. Story
                  and cases stay full width (long text / images need the
                  room); the compact accordion-shaped sections pair up. */}
              {isEnhanced && (
                <>
                  <SectionShell testid="profile-section-story" title="Историята на клиниката">
                    {(clinic.long_description || clinic.environment_image_url) ? (
                      <div>
                        {clinic.environment_image_url && (
                          <figure className="mb-3" data-testid="profile-environment-figure">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={clinic.environment_image_url}
                              alt={`Средата в ${clinic.name}`}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-48 sm:h-64 object-cover rounded-xl ring-1 ring-slate-200"
                              data-testid="profile-environment-image"
                            />
                            <figcaption className="mt-1.5 text-[11px] text-slate-500 leading-snug">
                              Средата в клиниката
                            </figcaption>
                          </figure>
                        )}
                        {clinic.long_description && (
                          <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
                            {clinic.long_description}
                          </p>
                        )}
                        {clinic.environment_description && (
                          <div className="mt-3 rounded-md bg-teal-50/40 ring-1 ring-teal-100 p-2.5 text-[12px] text-slate-700 leading-snug">
                            {clinic.environment_description}
                          </div>
                        )}
                        {clinic.philosophy && (
                          <blockquote className="mt-3 border-l-2 border-teal-400 pl-3 text-[13px] text-slate-700 italic">
                            {clinic.philosophy}
                          </blockquote>
                        )}
                      </div>
                    ) : (
                      <EmptyStateCard testid="empty-story" />
                    )}
                  </SectionShell>

                  <PairRow
                    left={
                      canShowExpertQa && (
                        <SectionShell testid="profile-section-expert-qa" title="Експертни отговори">
                          {clinic.expert_qa.length > 0 ? (
                            <Accordion
                              items={clinic.expert_qa.map((qa, i) => ({
                                id: `eqa-${i}`,
                                head: qa.question,
                                body: qa.answer,
                              }))}
                              testid="accordion-expert-qa"
                              defaultOpenIdx={-1}
                            />
                          ) : (
                            <EmptyStateCard hint="Експертни отговори" message="Клиниката все още не е добавила отговори на често задавани пациентски въпроси." testid="empty-expert-qa" />
                          )}
                        </SectionShell>
                      )
                    }
                    right={
                      <SectionShell testid="profile-section-prices" title="Ценови ориентири">
                        {clinic.price_ranges.length > 0 ? (
                          <details className="group rounded-xl bg-white ring-1 ring-slate-200/70 open:ring-teal-200 transition-colors" data-testid="prices-accordion">
                            <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] font-medium text-slate-800">
                              <span>Виж ценовите ориентири ({clinic.price_ranges.length})</span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden />
                            </summary>
                            <ul className="px-3.5 pb-3 divide-y divide-slate-100/80 text-[13px]">
                              {clinic.price_ranges.map((p, i) => (
                                <li key={i} className="py-2 flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-900">
                                      {treatmentLabel(p.treatment)}
                                    </p>
                                    {p.note && (
                                      <p className="text-[11px] text-slate-500 mt-0.5">{p.note}</p>
                                    )}
                                  </div>
                                  <p className="text-slate-700 whitespace-nowrap">
                                    {formatPriceRange(p)}
                                  </p>
                                </li>
                              ))}
                              <li className="pt-2 text-[11px] text-slate-500 leading-snug">
                                Точната цена зависи от конкретния клиничен случай и се определя след преглед.
                              </li>
                            </ul>
                          </details>
                        ) : (
                          <EmptyStateCard hint="Ценови ориентири" message="Клиниката все още не е добавила ценови ориентири. Точната цена зависи от конкретния клиничен случай и се определя след преглед." testid="empty-prices" />
                        )}
                      </SectionShell>
                    }
                  />

                  {/* Cases — rich showcase with before/after images and
                      treatment details. Own entitlement; the API also
                      withholds the data itself when not eligible. */}
                  {canShowCases && (
                    <SectionShell id="cases" testid="profile-section-cases" title="Библиотека със случаи" subtitle="Публикуват се само случаи с потвърдено пациентско съгласие.">
                      {clinic.case_library.length > 0 ? (
                        <div className="space-y-4" data-testid="case-library-showcase">
                          {clinic.case_library.map((c, i) => (
                            <CaseShowcaseCard key={c.id || `case-${i}`} caseItem={c} index={i} />
                          ))}
                        </div>
                      ) : (
                        <EmptyStateCard hint="Реални случаи" message="Клиниката все още не е предоставила реални случаи за публикуване." testid="empty-cases" />
                      )}
                    </SectionShell>
                  )}

                  <PairRow
                    left={
                      clinic.category_authority && (
                        <SectionShell testid="profile-section-category-authority" title="Сила на профила">
                          <p className="text-[13px] text-slate-700 leading-relaxed">
                            {clinic.category_authority}
                          </p>
                        </SectionShell>
                      )
                    }
                    right={
                      <SectionShell id="location" testid="profile-section-location" title="Локация">
                        <p className="text-[13px] text-slate-700">
                          {clinic.city_name || cityDisplay(clinic.city_slug || '')}
                          {clinic.area && (
                            <span className="text-slate-500"> · {clinic.area}</span>
                          )}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">За час или обратна връзка използвай действията в началото на профила.</p>
                      </SectionShell>
                    }
                  />

                  {hasRealZubiteFeedback && (
                    <SectionShell testid="profile-section-zubite-feedback" title="Сигнал от Zubite пациенти">
                      <p className="text-xs text-slate-500">Реален Zubite-сигнал предстои.</p>
                    </SectionShell>
                  )}

                  <ContentAttribution clinic={clinic} />
                </>
              )}

              {/* Location is not always paired above — a Verified clinic
                  (isEnhanced false) never reaches the block containing it,
                  so it needs its own always-rendered fallback here. Only
                  one of the two ever mounts: the isEnhanced check makes
                  them mutually exclusive. */}
              {!isEnhanced && (
                <SectionShell id="location" testid="profile-section-location" title="Локация">
                  <p className="text-[13px] text-slate-700">
                    {clinic.city_name || cityDisplay(clinic.city_slug || '')}
                    {clinic.area && (
                      <span className="text-slate-500"> · {clinic.area}</span>
                    )}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">За час или обратна връзка използвай действията в началото на профила.</p>
                </SectionShell>
              )}

              {/* Phase B scheduler — sits inside the left main column at
                  the `consultation` anchor. Renders nothing when disabled. */}
              <div ref={consultationRef} id="consultation" className="scroll-mt-20">
                <ConsultationScheduler
                  clinic={clinic}
                  sourcePath={sourcePath}
                  onStateResolved={setSchedulerState}
                />
              </div>

              {clinic.care_pass_partner && <CarePassContextBlock />}
            </div>
          </div>

          <p
            className="mt-8 text-[11px] text-slate-400 text-center leading-snug max-w-2xl mx-auto"
            data-testid="profile-trust-note"
          >
            Zubite.bg не поставя диагноза и не определя „най-добра" клиника.
            Окончателната оценка се прави от стоматолог или специалист.
          </p>
        </div>
      </section>

      {contactCtx && (
        <PublicContactModal
          clinics={[clinic]}
          source="clinic_profile"
          consultationType={contactCtx.consultationType}
          prefillCity={clinic.city_slug}
          prefillTreatment={clinic.treatments[0]}
          onClose={() => setContactCtx(null)}
        />
      )}

      {chatOpen && (
        <PatientChatModal
          leadId={chatContext?.leadId}
          clinic={{ id: clinic.id, name: clinic.name }}
          openSignal={chatOpenSignal}
          onClose={() => setChatOpen(false)}
        />
      )}
    </main>
  )
}

// ─── One deliberate action hub ─────────────────────────────────

function ClinicActionHub({
  primary, secondary, viberPhone, canChat, onOpenChat,
}: {
  primary: ClinicActionVariant
  secondary: ClinicActionVariant | null
  viberPhone?: string | null
  canChat: boolean
  onOpenChat: () => void
}) {
  const PrimaryIcon = primary.kind === 'contact' ? Phone : CalendarClock

  return (
    <section className="taste-profile-action-hub" aria-labelledby="profile-actions-title" data-testid="profile-action-hub">
      <div className="taste-profile-action-hub__heading">
        <h2 id="profile-actions-title">Как искаш да продължиш?</h2>
        <p>Избери според това дали искаш час, обратна връзка или директен разговор.</p>
      </div>

      <div className="taste-profile-action-hub__main">
        <button
          type="button"
          onClick={primary.onClick}
          className="taste-profile-action taste-profile-action--primary"
          data-testid="profile-cta-primary"
        >
          <PrimaryIcon className="taste-profile-action__icon" aria-hidden="true" />
          <span>
            <strong>{primary.label}</strong>
            <small>{primary.description}</small>
          </span>
        </button>

        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            className="taste-profile-action taste-profile-action--secondary"
            data-testid="profile-cta-secondary"
          >
            <Phone className="taste-profile-action__icon" aria-hidden="true" />
            <span>
              <strong>{secondary.label}</strong>
              <small>{secondary.description}</small>
            </span>
          </button>
        )}
      </div>

      {(viberPhone || canChat) && (
        <div className="taste-profile-action-hub__messages">
          <p>Предпочиташ да пишеш?</p>
          <div>
            {viberPhone && (
              <a
                href={`viber://chat?number=${encodeURIComponent(viberPhone)}`}
                className="taste-profile-message-action"
                data-testid="profile-cta-viber"
              >
                <MessageCircle aria-hidden="true" />
                <span>
                  <strong>Пиши във Viber</strong>
                  <small>Отваря разговор с клиниката във Viber.</small>
                </span>
              </a>
            )}
            {canChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="taste-profile-message-action"
                data-testid="profile-cta-chat"
              >
                <MessagesSquare aria-hidden="true" />
                <span>
                  <strong>Започни чат с клиниката</strong>
                  <small>Отваря онлайн чат в Zubite.bg.</small>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Lead clinician feature ─────────────────────────────────────

function DoctorSpotlightFeature({ clinic }: { clinic: PublicClinic }) {
  const doctor = clinic.doctor_spotlight
  if (!doctor?.name) return null

  const relationshipLabel = doctor.kind === 'owner'
    ? 'Собственик на клиниката'
    : 'Водещ лекар'
  const doctorSpecialties = doctor.specialties || []

  return (
    <section
      id="lead-doctor"
      className="taste-profile-doctor-spotlight scroll-mt-24 overflow-hidden rounded-2xl bg-[#09251F] text-white"
      data-testid="profile-section-doctor"
    >
      <div className="grid md:grid-cols-[minmax(260px,0.86fr)_minmax(0,1.14fr)]">
        {clinic.doctor_spotlight_image_url ? (
          <figure className="min-h-[280px] md:min-h-[430px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clinic.doctor_spotlight_image_url}
              alt={`${doctor.name} — ${relationshipLabel.toLocaleLowerCase('bg-BG')}`}
              loading="lazy"
              decoding="async"
              className="h-full min-h-[280px] w-full object-cover md:min-h-[430px]"
              data-testid="profile-doctor-image"
            />
          </figure>
        ) : (
          <div className="relative grid min-h-[230px] place-items-center overflow-hidden bg-[#0E3C32] md:min-h-[430px]" aria-hidden="true">
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 font-display text-[clamp(8rem,20vw,15rem)] font-semibold leading-none text-white/[0.055]">
              {doctorInitials(doctor.name)}
            </span>
            <span className="relative grid h-32 w-32 place-items-center rounded-full border border-white/20 bg-white/[0.06] font-display text-5xl font-semibold tracking-[-0.035em] text-[#7DE2C8]">
              {doctorInitials(doctor.name)}
            </span>
          </div>
        )}

        <div className="flex flex-col justify-center px-6 py-9 sm:px-9 sm:py-12 lg:px-12">
          <p className="taste-doctor-relationship inline-flex w-fit items-center gap-2 rounded-full border border-[#69D4B8]/35 px-3 py-1.5 text-xs font-semibold text-[#8DE8D0]">
            <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {relationshipLabel}
          </p>
          <h2 className="mt-5 max-w-xl text-balance font-display text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-white">
            {doctor.name}
          </h2>
          {doctor.role && (
            <p className="taste-doctor-role mt-4 max-w-2xl text-base font-medium leading-relaxed text-[#A9D8CC]">
              {doctor.role}
            </p>
          )}

          {doctorSpecialties.length > 0 && (
            <div className="mt-7" data-testid="profile-doctor-specialties">
              <p className="taste-doctor-specialties-label text-xs font-semibold text-white/60">Основни специалности</p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {doctorSpecialties.map((specialty) => (
                  <li key={specialty} className="taste-doctor-specialty rounded-full bg-white/[0.08] px-3 py-1.5 text-[13px] font-medium text-white ring-1 ring-inset ring-white/10">
                    {specialty}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {doctor.bio && (
            <p className="taste-doctor-bio mt-7 max-w-[68ch] whitespace-pre-line text-[14px] leading-7 text-white/[0.78]">
              {doctor.bio}
            </p>
          )}

          <div className="taste-doctor-footer mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.12] pt-5 text-[11px] leading-relaxed text-white/[0.55]">
            <span>Информацията е предоставена от клиниката.</span>
            {typeof clinic.founded_year === 'number' && typeof clinic.years_in_business === 'number' && (
              <span className="taste-doctor-longevity inline-flex items-center gap-1.5 text-[#8DE8D0]">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                {clinicLongevityLabel(clinic.years_in_business, clinic.founded_year)}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Editorial fact rail ────────────────────────────────────────

function ClinicFactRail({
  clinic, schedulerState,
}: {
  clinic: PublicClinic
  schedulerState: SchedulerState
}) {
  const audience = clinic.accepts_adults && clinic.accepts_children
    ? 'Възрастни и деца'
    : clinic.accepts_children
      ? 'Деца'
      : clinic.accepts_adults
        ? 'Възрастни'
        : null

  const facts: Array<{
    key: string
    eyebrow: string
    value: string
    icon: React.ReactNode
  }> = []

  if (typeof clinic.founded_year === 'number' && typeof clinic.years_in_business === 'number') {
    facts.push({
      key: 'longevity',
      eyebrow: 'Опит на клиниката',
      value: clinicLongevityLabel(clinic.years_in_business, clinic.founded_year),
      icon: <Building2 className="h-4 w-4" />,
    })
  }

  facts.push({
    key: 'consultation',
    eyebrow: 'Консултация',
    value: schedulerState === 'available' ? 'Има публикувани часове' : 'Клиниката приема запитвания',
    icon: <CalendarClock className="h-4 w-4" />,
  })

  if (clinic.treatments.length > 0) {
    facts.push({
      key: 'services',
      eyebrow: 'Предлагани лечения',
      value: clinic.treatments.slice(0, 3).map(treatmentLabel).join(' · '),
      icon: <Stethoscope className="h-4 w-4" />,
    })
  }

  if (clinic.treatment_focus.length > 0) {
    facts.push({
      key: 'focus',
      eyebrow: 'Фокус на клиниката',
      value: clinic.treatment_focus.slice(0, 2).map(treatmentLabel).join(' · '),
      icon: <Award className="h-4 w-4" />,
    })
  }

  if (
    facts.length < 4
    && (clinic.profile_information_reviewed || clinic.online_consultation || audience)
  ) {
    const trustValue = [
      clinic.profile_information_reviewed ? 'Профилът е прегледан' : null,
      clinic.online_consultation ? 'Онлайн консултация' : null,
      audience,
    ].filter(Boolean).join(' · ')
    facts.push({
      key: 'trust',
      eyebrow: 'Практична информация',
      value: trustValue,
      icon: <ShieldCheck className="h-4 w-4" />,
    })
  }

  const railColumns = facts.length === 1
    ? 'grid-cols-1'
    : facts.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : facts.length === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'

  return (
    <ul className={`taste-profile-fact-rail mt-6 grid gap-px overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#E5E5E5] ${railColumns}`} data-testid="profile-overview-grid">
      {facts.map((fact) => (
        <li key={fact.key} className="min-h-36 bg-white p-5" data-testid={`overview-${fact.key}`}>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#007956]">
            {fact.icon}
            {fact.eyebrow}
          </p>
          <p className="mt-4 font-display text-lg font-semibold leading-snug text-black">{fact.value}</p>
        </li>
      ))}
    </ul>
  )
}

// ─── Legacy overview grid (kept for compatibility with older snapshots) ──

function OverviewGrid({
  clinic, schedulerState,
  onJumpConsultation, onJumpServices, onJumpFit, onOpenContact,
}: {
  clinic: PublicClinic
  schedulerState: SchedulerState
  onJumpConsultation: () => void
  onJumpServices: () => void
  onJumpFit: () => void
  onOpenContact: () => void
}) {
  const consultationBody = (() => {
    if (schedulerState === 'available') {
      return { line: 'Свободни часове налични — избери подходящ час.', cta: 'Виж часовете', onCta: onJumpConsultation }
    }
    if (schedulerState === 'enabled_no_slots') {
      return { line: 'Без публикувани часове — изпрати заявка.', cta: 'Заяви контакт', onCta: onOpenContact }
    }
    if (clinic.online_consultation) {
      return { line: 'Клиниката приема заявки за онлайн консултация.', cta: 'Заяви контакт', onCta: onOpenContact }
    }
    return { line: 'Свържи се за първоначална консултация.', cta: 'Заяви контакт', onCta: onOpenContact }
  })()

  const focusPreview = clinic.treatment_focus.slice(0, 2)
  const treatmentsPreview = clinic.treatments.slice(0, 4)
  const trustChips: Array<{ label: string; icon: React.ReactNode; key: string }> = []
  if (clinic.profile_information_reviewed) trustChips.push({ label: 'Профил прегледан', icon: <ShieldCheck className="w-3 h-3 text-teal-600" />, key: 'rev' })

  return (
    <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="profile-overview-grid">
      <OverviewCard
        icon={<CalendarClock className="w-3.5 h-3.5" />}
        title="Консултация"
        testid="overview-consultation"
      >
        <p className="text-[12px] text-slate-600 leading-snug mb-2">{consultationBody.line}</p>
        <button
          type="button"
          onClick={consultationBody.onCta}
          className="text-[12px] font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 transition-colors"
          data-testid="overview-consultation-cta"
        >
          {consultationBody.cta} →
        </button>
      </OverviewCard>

      <OverviewCard
        icon={<Check className="w-3.5 h-3.5" />}
        title="Фокус на клиниката"
        testid="overview-focus"
      >
        {focusPreview.length > 0 ? (
          <ul className="text-[12px] text-slate-600 leading-snug space-y-0.5 mb-2">
            {focusPreview.map((treatment, i) => (
              <li key={i} className="line-clamp-1">· {treatmentLabel(treatment)}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-slate-500 italic mb-2 leading-snug">
            Все още няма публикуван фокус на клиниката.
          </p>
        )}
        <button
          type="button"
          onClick={onJumpFit}
          className="text-[12px] font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
        >
          Виж детайли →
        </button>
      </OverviewCard>

      <OverviewCard
        icon={<Stethoscope className="w-3.5 h-3.5" />}
        title="Предлагани лечения"
        testid="overview-services"
      >
        {treatmentsPreview.length > 0 ? (
          <ul className="flex flex-wrap gap-1 mb-2">
            {treatmentsPreview.map((t) => (
              <li
                key={t}
                className="inline-flex items-center px-1.5 py-0 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 text-[11px]"
              >
                {treatmentLabel(t)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-slate-500 italic mb-2 leading-snug">
            Все още без публикуван списък.
          </p>
        )}
        <button
          type="button"
          onClick={onJumpServices}
          className="text-[12px] font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
        >
          Всички лечения →
        </button>
      </OverviewCard>

      <OverviewCard
        icon={<ShieldCheck className="w-3.5 h-3.5" />}
        title="Доверие"
        testid="overview-trust"
      >
        {trustChips.length > 0 ? (
          <ul className="space-y-0.5 mb-1">
            {trustChips.map((c) => (
              <li key={c.key} className="inline-flex items-center gap-1 text-[12px] text-slate-700">
                {c.icon}
                {c.label}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-[11px] text-slate-500 leading-snug mt-1">
          Zubite не определя „най-добра" клиника.
        </p>
      </OverviewCard>
    </ul>
  )
}

/** One consistent light treatment across all four cards — the previous
 *  version singled the "Консултация" card out in a dark navy gradient
 *  with a decorative glow blob, so the grid split 1-dark-of-4 for no
 *  reason tied to content. Same surface for all four now; the row still
 *  differentiates itself by content and CTA, not by a visual gimmick. */
function OverviewCard({
  icon, title, testid, children,
}: {
  icon: React.ReactNode
  title: string
  testid: string
  children: React.ReactNode
}) {
  return (
    <li
      className="rounded-xl p-3.5 bg-white ring-1 ring-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_4px_16px_-8px_rgba(15,23,42,0.12)]"
      data-testid={testid}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 mb-1.5 text-slate-500">
        <span className="w-5 h-5 rounded-md grid place-items-center bg-teal-50 ring-1 ring-teal-100">
          {icon}
        </span>
        {title}
      </p>
      <div>{children}</div>
    </li>
  )
}

// ─── Other sub-components ────────────────────────────────────────

function DemoBanner() {
  return (
    <div
      className="sticky top-0 z-30 bg-amber-100/95 backdrop-blur ring-1 ring-amber-200 text-amber-900 text-[12px]"
      data-testid="demo-clinic-banner"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-start gap-2">
        <Megaphone className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p className="leading-snug">
          Демо профил — примерна визуализация на партньорски функции.
          Данните не представят реална клиника.
        </p>
      </div>
    </div>
  )
}

function ContentAttribution({ clinic }: { clinic: PublicClinic }) {
  const published = useMemo(() => {
    if (!clinic.profile_published_at) return null
    try {
      const d = new Date(clinic.profile_published_at)
      // Pinned to Sofia time: without an explicit timeZone, the server
      // (UTC in Docker) and the visitor's browser (Europe/Sofia) can land
      // on different calendar days for a timestamp near midnight UTC,
      // producing a server/client text mismatch that forces React to
      // discard the SSR markup and re-render the whole tree client-side.
      return d.toLocaleDateString('bg-BG', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Sofia' })
    } catch {
      return null
    }
  }, [clinic.profile_published_at])
  return (
    <SectionShell testid="profile-section-attribution" title="За съдържанието">
      <p className="text-[11px] text-slate-500 leading-snug">
        Информацията в този профил е предоставена от клиниката.
        {clinic.profile_information_reviewed
          ? ' Прегледана е от екипа на Zubite.'
          : ' Профилът все още не е преминал ръчен Zubite преглед.'}
        {published && (
          <>
            {' '}Последна публикация: <strong className="text-slate-700">{published}</strong>.
          </>
        )}
      </p>
    </SectionShell>
  )
}

/**
 * Places two sections side by side when both are actually present, so the
 * main content column stops reading as one flat vertical stack. Content-
 * aware, not decorative: `left`/`right` are the ALREADY entitlement-gated
 * JSX (`condition && <SectionShell/>`, which evaluates to `false` when
 * absent), so this never has to know WHY a section is missing — only
 * whether it is. Per the "no empty grid cells" rule, a lone survivor
 * renders at full width rather than leaving a half-empty row: a Verified
 * clinic with a doctor spotlight but no Growth-only technology section
 * still gets "Водещ лекар" at full width, not squeezed into a half column
 * next to nothing.
 */
function PairRow({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const hasLeft = left !== false && left !== null && left !== undefined
  const hasRight = right !== false && right !== null && right !== undefined
  if (!hasLeft && !hasRight) return null
  if (hasLeft && !hasRight) return <>{left}</>
  if (hasRight && !hasLeft) return <>{right}</>
  // No `items-start` — CSS Grid's default `stretch` makes both cards
  // match the taller one's height. `items-start` (the first version of
  // this) let a short card (e.g. a collapsed accordion) sit next to a
  // tall one (e.g. a doctor photo) with a ragged gap underneath —
  // exactly the "random white space" a mismatched pair produces.
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {left}
      {right}
    </div>
  )
}

/**
 * The workhorse section wrapper — used by ~10 of the profile's sections.
 * Deliberately plain: a solid card, one hairline border, a real shadow
 * tinted to the page's own hue (never pure black). No backdrop-blur —
 * nothing moves behind these while the page is static, so blur here was
 * decorative cost with no function, unlike the hero (a real photo) or
 * the sticky nav (a genuinely floating element over scrolling content).
 * No icon-in-a-colored-box before the title either — repeated ~10 times
 * down one page, that badge stopped signalling anything and just added
 * visual noise before every single heading.
 */
function SectionShell({
  id, testid, title, subtitle, eyebrow, children,
}: {
  id?: string
  testid: string
  title: string
  subtitle?: string
  /** Rationed deliberately — used on at most one section per page (the
   *  first content section after the hero), never on every heading. */
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="border-t border-[#D7D4D0] bg-transparent py-8 sm:py-10 scroll-mt-24"
      data-testid={testid}
    >
      <div className="mb-6">
        {eyebrow && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#007956]">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-black sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#686868]">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function BadgePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/85 ring-1 ring-slate-200 text-[10px] text-slate-700">
      {icon}
      {label}
    </li>
  )
}

/**
 * Glass fact containers overlaid on the hero photo.
 *
 * Strictly opt-in per fact: a container only appears when the clinic
 * genuinely has that data. Nothing is placeheld, defaulted or inferred —
 * an incomplete profile shows fewer containers rather than empty or
 * invented ones. Review data in particular is only rendered when a real
 * rating exists (`review.count > 0`); it is never faked or rounded up.
 */
function HeroFacts({ clinic }: { clinic: PublicClinic }) {
  const facts: Array<{ icon: React.ReactNode; label: string; value: string }> = []

  const treatments = clinic.treatment_focus?.length
    ? clinic.treatment_focus
    : clinic.treatments || []
  if (treatments.length > 0) {
    facts.push({
      icon: <Stethoscope className="w-3.5 h-3.5" />,
      label: 'Основен фокус',
      value: treatments.slice(0, 2).map(treatmentLabel).join(' · '),
    })
  }

  if (clinic.review && clinic.review.count > 0) {
    facts.push({
      icon: <Award className="w-3.5 h-3.5" />,
      label: 'Оценка',
      value: `${clinic.review.rating.toFixed(1)} (${clinic.review.count})`,
    })
  }

  if (clinic.online_consultation) {
    facts.push({
      icon: <Video className="w-3.5 h-3.5" />,
      label: 'Консултация',
      value: clinic.online_consultation_label || 'Онлайн',
    })
  }

  // Who the clinic treats — only stated when explicitly set, since a
  // null here means "not specified", not "no".
  const audience =
    clinic.accepts_adults && clinic.accepts_children
      ? 'Възрастни и деца'
      : clinic.accepts_children
      ? 'Деца'
      : clinic.accepts_adults
      ? 'Възрастни'
      : null
  if (audience) {
    facts.push({
      icon: <UserCircle2 className="w-3.5 h-3.5" />,
      label: 'Приема',
      value: audience,
    })
  }


  if (facts.length === 0) return null

  return (
    <ul
      className="mt-5 grid grid-cols-2 sm:flex sm:flex-wrap gap-2"
      data-testid="profile-hero-facts"
    >
      {facts.map((f) => (
        <li
          key={f.label}
          className="rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 px-3 py-2 min-w-0"
        >
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/55 inline-flex items-center gap-1">
            {f.icon}
            {f.label}
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-white truncate">
            {f.value}
          </p>
        </li>
      ))}
    </ul>
  )
}

interface AccordionItem {
  id: string
  head: string
  body: string
}

function Accordion({
  items, testid, defaultOpenIdx = -1,
}: {
  items: AccordionItem[]
  testid: string
  defaultOpenIdx?: number
}) {
  return (
    <ul className="space-y-1" data-testid={testid}>
      {items.map((it, idx) => (
        <li key={it.id}>
          <details
            className="group rounded-lg bg-white ring-1 ring-slate-200/70 open:ring-teal-200 transition-colors"
            data-testid={`${testid}-item-${idx}`}
            open={idx === defaultOpenIdx}
          >
            <summary
              className="list-none cursor-pointer flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-medium text-slate-800 hover:text-slate-900"
              data-testid={`${testid}-summary-${idx}`}
            >
              <span className="flex-1">{it.head}</span>
              <ChevronDown
                className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0"
                aria-hidden
              />
            </summary>
            <div className="px-3 pb-2.5 text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">
              {it.body}
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}

function TreatmentAccordion({
  slug, detail, defaultOpen,
}: {
  slug: string
  detail: PublicClinic['treatment_details'][string] | undefined
  defaultOpen?: boolean
}) {
  const hasContent = !!(detail && (detail.who_for || detail.note || detail.remote_start_possible !== null))
  return (
    <details
      className="group rounded-lg bg-white/80 ring-1 ring-slate-200/70 open:ring-teal-200"
      data-testid={`treatment-accordion-${slug}`}
      open={defaultOpen}
    >
      <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-medium text-slate-800">
        <span>{treatmentLabel(slug)}</span>
        <ChevronDown
          className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform"
          aria-hidden
        />
      </summary>
      <div className="px-3 pb-2.5 text-[13px] text-slate-600 leading-relaxed">
        {hasContent ? (
          <>
            {detail?.who_for && (
              <p>
                <strong className="text-slate-800">За кого е подходящо: </strong>
                {detail.who_for}
              </p>
            )}
            {detail?.remote_start_possible !== null && detail?.remote_start_possible !== undefined && (
              <p className="mt-1 text-[11px] text-slate-500">
                {detail.remote_start_possible
                  ? 'Първият разговор може да започне дистанционно.'
                  : 'Първият разговор обикновено е на място.'}
              </p>
            )}
            {detail?.note && (
              <p className="mt-1 text-[11px] text-slate-500 italic">
                {detail.note}
              </p>
            )}
          </>
        ) : (
          <p className="text-[11px] text-slate-500 italic">
            Все още без разширено описание за това лечение.
          </p>
        )}
      </div>
    </details>
  )
}

// ─── Phase C1.2 — motion + scroll-aware helpers ─────────────────

/** Intersection-observer wrapper that fades + slides children in.
 *  Respects `prefers-reduced-motion`. CSS-only, no extra deps. */
function Reveal({
  children, delay = 0, as: As = 'div',
}: {
  children: React.ReactNode
  delay?: number
  as?: 'div' | 'section' | 'header' | 'aside' | 'nav'
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) { setVisible(true); return }
    if (!ref.current) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true)
            obs.disconnect()
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [reducedMotion])

  const Tag = As as React.ElementType
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: reducedMotion
          ? 'none'
          : `opacity .55s ease ${delay}ms, transform .55s cubic-bezier(.2,.7,.2,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  )
}

function useReducedMotion(): boolean {
  const [v, setV] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setV(mq.matches)
    const h = (e: MediaQueryListEvent) => setV(e.matches)
    mq.addEventListener?.('change', h)
    return () => mq.removeEventListener?.('change', h)
  }, [])
  return v
}

/** Tracks which anchor section is currently in view (top half of viewport).
 *  Used for the sticky-nav active highlight. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] || null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const observers: IntersectionObserver[] = []
    const visible = new Set<string>()
    for (const id of ids) {
      const el = document.getElementById(id)
      if (!el) continue
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visible.add(id)
          } else {
            visible.delete(id)
          }
          // Pick the topmost id that's currently visible (closest to top of viewport).
          let best: { id: string; top: number } | null = null
          for (const vid of visible) {
            const node = document.getElementById(vid)
            if (!node) continue
            const top = node.getBoundingClientRect().top
            if (best === null || top < best.top) best = { id: vid, top }
          }
          if (best) setActive(best.id)
        },
        { rootMargin: '-25% 0px -55% 0px', threshold: 0 },
      )
      obs.observe(el)
      observers.push(obs)
    }
    return () => { for (const o of observers) o.disconnect() }
  }, [ids])
  return active
}

/**
 * Switches the section menu from its horizontal in-page state to a fixed
 * left rail after its original position passes the site header. The rail is
 * reserved for wide screens where there is a real page gutter; tablets and
 * phones keep the horizontal sticky menu.
 */
function useProfileSectionNavRail(
  sentinelRef: React.RefObject<HTMLDivElement | null>,
): boolean {
  const [isRail, setIsRail] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const wideViewport = window.matchMedia('(min-width: 1240px)')
    let frame = 0

    const update = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const sentinel = sentinelRef.current
        const next = Boolean(
          wideViewport.matches
          && sentinel
          && sentinel.getBoundingClientRect().top <= 104,
        )
        setIsRail((current) => current === next ? current : next)
      })
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    wideViewport.addEventListener?.('change', update)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      wideViewport.removeEventListener?.('change', update)
    }
  }, [sentinelRef])

  return isRail
}

/** Contextual partner benefit — deliberately not part of the action hierarchy. */
function CarePassContextBlock() {
  return (
    <section className="taste-profile-care-pass grid gap-5 rounded-2xl border border-[#D7D4D0] bg-[#F0ECE7] p-6 sm:grid-cols-[auto,1fr,auto] sm:items-center" data-testid="profile-care-pass-context">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#007956]">
        <Gift className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#007956]">След реално посещение</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-black">Care Pass за ежедневна орална грижа</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5C5C5C]">
          След проведена консултация чрез Zubite.bg получаваш достъп до предложения за продукти за орална хигиена. Не е отстъпка от лечение.
        </p>
      </div>
      <Link href="/care-pass" className="inline-flex items-center gap-2 text-sm font-bold text-[#B84900] hover:underline">
        Как работи <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
      </Link>
    </section>
  )
}

// ─── Showcase-only: enhanced listing card preview ────────────────
// Renders inside the addons-showcase profile only (`is_addons_showcase`
// flag). Purpose: give sales / QA / partners a visual reference of all
// possible listing-tile add-on chips WITHOUT modifying the real
// `PublicClinicCard` component or polluting `/kliniki` listings.

function ShowcaseListingCardPreview({ clinic }: { clinic: PublicClinic }) {
  return (
    <section
      className="mt-5 rounded-2xl bg-white ring-1 ring-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5"
      data-testid="showcase-listing-card-preview-section"
    >
      <header className="mb-3">
        <h2 className="font-display text-[15px] sm:text-base font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-amber-50 ring-1 ring-amber-100 grid place-items-center">
            <Megaphone className="w-3.5 h-3.5 text-amber-700" />
          </span>
          Как изглежда картата в списъка
        </h2>
        <p className="mt-0.5 ml-8 text-[11px] text-slate-500 leading-snug">
          Визуализация на разширената listing-карта за партньори. Този
          модул се показва само в showcase профила и не променя реалните
          `/kliniki` карти.
        </p>
      </header>

      {/* Mock listing card (kept self-contained — does not import
          PublicClinicCard so the real component stays untouched). */}
      <article
        className="max-w-md rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.20)] overflow-hidden"
        data-testid="showcase-listing-card-mock"
      >
        <div className="relative h-40 w-full overflow-hidden">
          {clinic.hero_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={clinic.hero_image_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-100 via-cyan-50 to-white" />
          )}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none"
          />
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/95 ring-1 ring-amber-200 text-amber-800 backdrop-blur-sm">
            <Sparkles className="w-3 h-3" />
            Growth Partner
          </span>
          {/* Sponsored — visually separated from tier badge, on right */}
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900/80 text-white ring-1 ring-white/20">
            <Megaphone className="w-3 h-3" />
            Спонсорирано
          </span>
        </div>

        <div className="p-4">
          {/* Add-on chips row */}
          <ul className="flex flex-wrap gap-1 mb-2.5">
            <ListingChip icon={<Video className="w-2.5 h-2.5" />} label="Онлайн консултация" />
            <ListingChip icon={<CalendarClock className="w-2.5 h-2.5" />} label="Свободни часове" tone="teal-strong" />
            <ListingChip icon={<ShieldCheck className="w-2.5 h-2.5 text-teal-600" />} label="Профил прегледан" />
            <ListingChip icon={<FileText className="w-2.5 h-2.5" />} label="Реални случаи" />
            <ListingChip icon={<Quote className="w-2.5 h-2.5" />} label="Експертни отговори" />
            <ListingChip icon={<Video className="w-2.5 h-2.5" />} label="Видео представяне" />
          </ul>

          <h3 className="font-display text-[18px] font-semibold text-slate-900 leading-snug">
            {clinic.name}
          </h3>
          <p className="mt-1 text-[12px] text-slate-500 inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {clinic.city_name}
            {clinic.area && ` · ${clinic.area}`}
          </p>
          <p className="mt-2 text-[12px] text-slate-600 leading-snug line-clamp-2">
            {clinic.short_description}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-full text-white text-[12px] font-medium opacity-90 cursor-default"
              style={{
                backgroundImage:
                  'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
              }}
              data-testid="showcase-listing-card-cta"
            >
              Виж клиниката
            </button>
            <span className="text-[11px] text-slate-400">
              (визуализация)
            </span>
          </div>
        </div>
      </article>

      <p className="mt-3 text-[11px] text-slate-500 leading-snug">
        Add-on chip-овете се показват само когато реални данни ги
        поддържат. „Спонсорирано“ е винаги визуално отделена от tier
        badge и не променя органичното подреждане.
      </p>
    </section>
  )
}

function ListingChip({
  icon, label, tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  tone?: 'neutral' | 'teal-strong'
}) {
  const cls = tone === 'teal-strong'
    ? 'bg-teal-600 text-white ring-teal-600'
    : 'bg-teal-50/70 text-teal-800 ring-teal-100'
  return (
    <li
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 text-[10px] ${cls}`}
    >
      {icon}
      {label}
    </li>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatPriceRange(p: PublicClinic['price_ranges'][number]): string {
  const cur = p.currency || 'BGN'
  if (p.price_from != null && p.price_to != null) {
    return `${p.price_from}–${p.price_to} ${cur}`
  }
  if (p.price_from != null) return `от ${p.price_from} ${cur}`
  if (p.price_to != null) return `до ${p.price_to} ${cur}`
  return '—'
}

function consultationStepsFromText(text: string): AccordionItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const steps: AccordionItem[] = []
  for (const ln of lines) {
    const m = ln.match(/^(\d+)[.)\s-]*\s*(.+)$/)
    if (m) {
      const head = m[2].length > 60 ? m[2].slice(0, 60) + '…' : m[2]
      steps.push({ id: `step-${m[1]}`, head: `${m[1]}. ${head}`, body: m[2] })
    } else {
      if (steps.length > 0) {
        steps[steps.length - 1].body += '\n' + ln
      } else {
        steps.push({ id: `step-0`, head: ln.slice(0, 60), body: ln })
      }
    }
  }
  return steps.length > 0 ? steps : [{ id: 'step-only', head: 'Процес', body: text }]
}


// ─── CaseShowcaseCard ─────────────────────────────────────────────
// Rich per-case card used inside the "Библиотека със случаи" section.
// Shows treatment metadata + optional before/after gallery. Falls back
// gracefully when older cases carry only text.

type CaseItem = PublicClinic['case_library'][number]

function CaseShowcaseCard({ caseItem: c, index }: { caseItem: CaseItem; index: number }) {
  const beforeList = Array.isArray(c.before_images) ? c.before_images.filter(Boolean) : []
  const afterList = Array.isArray(c.after_images) ? c.after_images.filter(Boolean) : []
  const hasImages = beforeList.length > 0 || afterList.length > 0

  const meta: Array<{ label: string; value: string }> = []
  if (c.treatment_type) meta.push({ label: 'Тип лечение', value: c.treatment_type })
  if (c.duration)       meta.push({ label: 'Продължителност', value: c.duration })
  if (c.price)          meta.push({ label: 'Цена', value: c.price })
  if (c.materials)      meta.push({ label: 'Материали', value: c.materials })

  return (
    <article
      className="rounded-2xl bg-white ring-1 ring-slate-200/70 overflow-hidden"
      data-testid={`case-card-${index}`}
    >
      {/* Header */}
      <header className="px-4 sm:px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 mb-1">
              {c.category || 'Случай'}
            </p>
            <h4 className="font-display text-lg font-semibold text-slate-900 leading-tight">
              {c.title}
            </h4>
          </div>
          {hasImages && (
            <span className="hidden sm:inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-semibold uppercase tracking-wider px-2 py-1">
              Преди · След
            </span>
          )}
        </div>
      </header>

      {/* Before / After gallery */}
      {hasImages && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-100">
          <CaseImageColumn label="Преди" images={beforeList} testid={`case-${index}-before`} />
          <CaseImageColumn label="След"  images={afterList}  testid={`case-${index}-after`} />
        </div>
      )}

      {/* Body */}
      <div className="px-4 sm:px-5 py-4 space-y-4">
        {c.summary && (
          <p className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-line" data-testid={`case-${index}-summary`}>
            {c.summary}
          </p>
        )}
        {c.specifics && (
          <div className="rounded-lg bg-slate-50/80 ring-1 ring-slate-100 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">
              Особености
            </p>
            <p className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-line" data-testid={`case-${index}-specifics`}>
              {c.specifics}
            </p>
          </div>
        )}
        {meta.length > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-1" data-testid={`case-${index}-meta`}>
            {meta.map((m) => (
              <div key={m.label} className="flex items-start justify-between gap-3 border-b border-slate-100/80 pb-2 last:border-0">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500 font-medium flex-shrink-0">
                  {m.label}
                </dt>
                <dd className="text-[13px] text-slate-800 text-right min-w-0">
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  )
}

function CaseImageColumn({
  label, images, testid,
}: { label: string; images: string[]; testid: string }) {
  if (images.length === 0) {
    return (
      <div className="bg-white p-4 grid place-items-center text-[11px] text-slate-400 italic min-h-[140px]">
        Няма снимка „{label}“
      </div>
    )
  }
  return (
    <div className="bg-white p-2" data-testid={testid}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 px-2 pt-1 pb-2">
        {label}
      </p>
      <div className={images.length > 1 ? 'grid grid-cols-3 gap-1.5' : ''}>
        {images.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${url}-${i}`}
            src={url}
            alt={`${label} ${i + 1}`}
            loading="lazy"
            decoding="async"
            className={
              images.length > 1
                ? 'w-full aspect-square object-cover rounded-md ring-1 ring-slate-200/70'
                : 'w-full aspect-[4/3] object-cover rounded-md ring-1 ring-slate-200/70'
            }
            data-testid={`${testid}-img-${i}`}
          />
        ))}
      </div>
    </div>
  )
}
