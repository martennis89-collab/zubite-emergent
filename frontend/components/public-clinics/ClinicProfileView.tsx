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
import {
  ArrowLeft, Building2, MapPin, ShieldCheck, Sparkles, Video, Heart,
  Phone, Check, X, MessagesSquare, Stethoscope, UserCircle2, BookOpenCheck,
  Cpu, ListChecks, Award, Quote, FileText, Megaphone, ChevronDown,
  CalendarClock,
} from 'lucide-react'
import {
  type PublicClinic, treatmentLabel, cityDisplay,
} from '@/lib/publicClinics'
import PublicContactModal from './PublicContactModal'
import ConsultationScheduler from './ConsultationScheduler'
import EmptyStateCard from './EmptyStateCard'

const SUGGESTED_QUESTIONS: Array<{ topic: string; question: string }> = [
  { topic: 'Цена', question: 'Каква е приблизителната цена за моя случай и от какво зависи финалната сума?' },
  { topic: 'Подходящ за мен', question: 'Кои методи са подходящи за моя случай и кои бихте препоръчали по-внимателно?' },
  { topic: 'Времева линия', question: 'Колко време обикновено отнема целият процес — от консултация до завършване?' },
  { topic: 'Алтернативи', question: 'Има ли алтернативни лечения, които си струва да обмисля заедно с предложения план?' },
  { topic: 'Рискове', question: 'Какви са основните рискове на това лечение и как ги минимизирате?' },
  { topic: 'Поддръжка', question: 'Какво се случва след края на активното лечение — ретенция, контролни прегледи?' },
]

type SchedulerState = 'available' | 'enabled_no_slots' | 'disabled' | null

interface Props {
  clinic: PublicClinic
}

export default function ClinicProfileView({ clinic }: Props) {
  const [contactCtx, setContactCtx] = useState<
    | { consultationType: 'general' | 'online' }
    | null
  >(null)
  const [sourcePath, setSourcePath] = useState<string>('')
  const [schedulerState, setSchedulerState] = useState<SchedulerState>(null)
  const consultationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSourcePath(window.location.pathname || '')
    }
  }, [])

  const isPremium = clinic.partner_tier !== 'standard'
  const isAuthority = clinic.partner_tier === 'premium'

  const tierBadgeStyle =
    clinic.partner_tier === 'premium'
      ? 'bg-amber-50 text-amber-800 ring-amber-100'
      : clinic.partner_tier === 'featured'
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

  type CTAVariant = { label: string; onClick: () => void }
  const heroPrimary: CTAVariant = useMemo(() => {
    if (schedulerState === 'available') {
      return { label: 'Запази час за консултация', onClick: () => scrollTo('consultation') }
    }
    return { label: 'Заяви контакт', onClick: openContact }
  }, [schedulerState, openContact, scrollTo])

  const heroSecondary: CTAVariant | null = useMemo(() => {
    if (schedulerState === 'available') {
      return { label: 'Заяви контакт', onClick: openContact }
    }
    return null
  }, [schedulerState, openContact])

  const heroNote =
    schedulerState === 'enabled_no_slots'
      ? 'Клиниката приема заявки за онлайн консултация, но няма публикувани свободни часове.'
      : null

  const visibleAnchors = useMemo(() => {
    const all: Array<{ id: string; label: string }> = [
      { id: 'overview', label: 'Обзор' },
      { id: 'consultation', label: 'Консултация' },
      { id: 'services', label: 'Услуги' },
    ]
    if (isPremium) all.push({ id: 'approach', label: 'Подход' }, { id: 'team', label: 'Екип' })
    if (isAuthority) all.push({ id: 'cases', label: 'Случаи' })
    if (isPremium) all.push({ id: 'questions', label: 'Въпроси' })
    all.push({ id: 'location', label: 'Локация' })
    return all
  }, [isPremium, isAuthority])

  const hasRealZubiteFeedback = false  // Reserved — never faked.

  return (
    <main
      className="min-h-screen bg-[#FCFAF8] overflow-x-hidden relative pb-24"
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/kliniki"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 mb-3 transition-colors"
            data-testid="profile-back-to-listing"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Към каталога с клиники
          </Link>

          {/* ═══════════ Compact Hero ═══════════ */}
          <header
            id="overview"
            className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/75 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.18)] overflow-hidden"
            data-testid="profile-hero"
          >
            <div className="grid sm:grid-cols-[1fr,260px] lg:grid-cols-[1fr,320px]">
              <div className="p-5 sm:p-6 order-2 sm:order-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span
                    className={
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ' +
                      tierBadgeStyle
                    }
                    data-testid="profile-tier-label"
                  >
                    <Sparkles className="w-3 h-3" />
                    {clinic.public_status_label}
                  </span>
                  {clinic.is_sponsored && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                      data-testid="profile-sponsored-label"
                      title="Спонсорираната видимост е обозначена отделно и не влияе на органичното подреждане."
                    >
                      <Megaphone className="w-3 h-3" />
                      Спонсорирано
                    </span>
                  )}
                </div>
                {clinic.is_sponsored && (
                  <p
                    className="mt-0.5 text-[10px] text-slate-500 leading-snug"
                    data-testid="profile-sponsored-helper"
                  >
                    Спонсорираната видимост е обозначена отделно и не влияе на органичното подреждане.
                  </p>
                )}
                <h1
                  className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 leading-tight"
                  data-testid="profile-name"
                >
                  {clinic.name}
                </h1>
                <p className="mt-1 text-sm text-slate-500 inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {clinic.city_name || cityDisplay(clinic.city_slug || '')}
                  {clinic.area && ` · ${clinic.area}`}
                </p>

                {clinic.short_description && (
                  <p
                    className="mt-3 text-sm text-slate-700 leading-relaxed line-clamp-3"
                    data-testid="profile-short-description"
                  >
                    {clinic.short_description}
                  </p>
                )}

                <ul className="mt-3 flex flex-wrap gap-1" data-testid="profile-trust-chips">
                  {clinic.online_consultation && (
                    <BadgePill icon={<Video className="w-2.5 h-2.5" />} label="Онлайн консултация" />
                  )}
                  {clinic.care_pass_partner && (
                    <BadgePill icon={<Heart className="w-2.5 h-2.5 text-rose-500" />} label="Care Pass" />
                  )}
                  {clinic.profile_information_reviewed && (
                    <BadgePill
                      icon={<ShieldCheck className="w-2.5 h-2.5 text-teal-600" />}
                      label="Профил прегледан"
                    />
                  )}
                </ul>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={heroPrimary.onClick}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-medium hover:-translate-y-0.5 transition-all shadow-[0_12px_28px_-12px_rgba(13,148,136,0.50)]"
                    style={{
                      backgroundImage:
                        'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
                    }}
                    data-testid="profile-cta-primary"
                  >
                    {schedulerState === 'available'
                      ? <CalendarClock className="w-4 h-4" />
                      : <Phone className="w-4 h-4" />}
                    {heroPrimary.label}
                  </button>
                  {heroSecondary && (
                    <button
                      type="button"
                      onClick={heroSecondary.onClick}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white ring-1 ring-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                      data-testid="profile-cta-secondary"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {heroSecondary.label}
                    </button>
                  )}
                </div>
                {heroNote && (
                  <p
                    className="mt-2 text-[11px] text-amber-800 leading-snug"
                    data-testid="profile-cta-note"
                  >
                    {heroNote}
                  </p>
                )}
              </div>

              {/* Hero image — right-side panel on desktop, top on mobile */}
              <div className="order-1 sm:order-2 relative">
                {clinic.hero_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={clinic.hero_image_url}
                    alt={clinic.name}
                    className="w-full h-32 sm:h-full sm:min-h-[200px] object-cover"
                  />
                ) : (
                  <div className="w-full h-32 sm:h-full sm:min-h-[200px] bg-gradient-to-br from-teal-100/60 via-cyan-50/40 to-white grid place-items-center">
                    <Building2 className="w-10 h-10 text-teal-200" />
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ═══════════ Overview cards ═══════════ */}
          <OverviewGrid
            clinic={clinic}
            schedulerState={schedulerState}
            onJumpConsultation={() => scrollTo('consultation')}
            onJumpServices={() => scrollTo('services')}
            onJumpFit={() => scrollTo('suitability')}
            onOpenContact={openContact}
          />

          {/* ═══════════ Showcase-only: listing-card preview ═══════════ */}
          {clinic.is_addons_showcase && <ShowcaseListingCardPreview clinic={clinic} />}

          {/* ═══════════ Anchor nav ═══════════ */}
          <nav
            className="mt-5 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto"
            data-testid="profile-anchor-nav"
            aria-label="Навигация в профила"
          >
            <ul className="inline-flex gap-1 py-1">
              {visibleAnchors.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(a.id)}
                    className="px-3 py-1.5 rounded-full bg-white/70 ring-1 ring-slate-200/70 text-[12px] text-slate-700 hover:bg-white hover:ring-teal-300 hover:text-teal-700 transition-colors whitespace-nowrap"
                    data-testid={`anchor-${a.id}`}
                  >
                    {a.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* ═══════════ Two-column layout ═══════════ */}
          <div className="mt-5 grid lg:grid-cols-[1fr,300px] gap-5">
            {/* ── Left main column ── */}
            <div className="space-y-4 min-w-0">
              {/* Suitability */}
              {isPremium && (
                <SectionShell id="suitability" testid="profile-section-fit" title="Подходяща ли е тази клиника за вас?" icon={<Check className="w-4 h-4 text-teal-700" />}>
                  {(clinic.best_for.length > 0 || clinic.not_ideal_for.length > 0) ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {clinic.best_for.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-1.5">
                            Подходяща за
                          </p>
                          <ul className="space-y-1 text-[13px] text-slate-700">
                            {clinic.best_for.map((b, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {clinic.not_ideal_for.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1.5">
                            Може да не е идеална за
                          </p>
                          <ul className="space-y-1 text-[13px] text-slate-700">
                            {clinic.not_ideal_for.map((n, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <X className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <span>{n}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyStateCard testid="empty-fit" />
                  )}
                </SectionShell>
              )}

              {/* Services accordion (services anchor) */}
              <SectionShell id="services" testid="profile-section-services" title="Услуги и направления" icon={<Stethoscope className="w-4 h-4 text-teal-700" />}>
                {clinic.treatments.length > 0 ? (
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
                    {clinic.treatment_focus.length > 0 && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Допълнителен фокус: {clinic.treatment_focus.join(', ')}
                      </p>
                    )}
                    {isPremium && (
                      <div className="mt-3 space-y-1" data-testid="profile-treatments-accordion">
                        {clinic.treatments.map((t, i) => (
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
                ) : (
                  <EmptyStateCard hint="Услуги" message="Клиниката все още не е публикувала пълен списък с лечения." testid="empty-treatments" />
                )}
              </SectionShell>

              {/* Premium block */}
              {isPremium && (
                <>
                  {/* Approach */}
                  <SectionShell id="approach" testid="profile-section-approach" title="Подход и първа консултация" icon={<BookOpenCheck className="w-4 h-4 text-teal-700" />}>
                    {clinic.patient_intro ? (
                      <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
                        {clinic.patient_intro}
                      </p>
                    ) : (
                      <EmptyStateCard testid="empty-patient-intro" />
                    )}
                  </SectionShell>

                  {/* Consultation process — accordion */}
                  <SectionShell testid="profile-section-process" title="Как протича консултацията" icon={<Sparkles className="w-4 h-4 text-teal-700" />}>
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

                  {/* Doctor */}
                  <SectionShell id="team" testid="profile-section-doctor" title="Водещ лекар" icon={<UserCircle2 className="w-4 h-4 text-teal-700" />}>
                    {clinic.doctor_spotlight?.name ? (
                      <div>
                        <p className="font-medium text-slate-900 text-[14px]">
                          {clinic.doctor_spotlight.name}
                        </p>
                        {clinic.doctor_spotlight.role && (
                          <p className="text-[12px] text-slate-500 mt-0.5">
                            {clinic.doctor_spotlight.role}
                          </p>
                        )}
                        {clinic.doctor_spotlight.bio && (
                          <p className="mt-1.5 text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
                            {clinic.doctor_spotlight.bio}
                          </p>
                        )}
                        {clinic.team_note && (
                          <p className="mt-2 text-[11px] text-slate-500 italic">
                            {clinic.team_note}
                          </p>
                        )}
                      </div>
                    ) : (
                      <EmptyStateCard hint="Водещ лекар" message="Профилът на водещия лекар все още не е добавен." testid="empty-doctor" />
                    )}
                  </SectionShell>
                </>
              )}

              {/* Authority block */}
              {isAuthority && (
                <>
                  {/* Deep clinic story */}
                  <SectionShell testid="profile-section-story" title="Историята на клиниката" icon={<BookOpenCheck className="w-4 h-4 text-teal-700" />}>
                    {clinic.long_description ? (
                      <div>
                        <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
                          {clinic.long_description}
                        </p>
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

                  {/* Technology — collapsed */}
                  <SectionShell testid="profile-section-technology" title="Технологии и дигитален работен процес" icon={<Cpu className="w-4 h-4 text-teal-700" />}>
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

                  {/* Expert Q&A — collapsed */}
                  <SectionShell testid="profile-section-expert-qa" title="Експертни отговори" icon={<Quote className="w-4 h-4 text-teal-700" />}>
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

                  {/* Cases — collapsed only when empty */}
                  <SectionShell id="cases" testid="profile-section-cases" title="Реални случаи" subtitle="Публикуват се само случаи с потвърдено пациентско съгласие." icon={<FileText className="w-4 h-4 text-teal-700" />}>
                    {clinic.case_library.length > 0 ? (
                      <Accordion
                        items={clinic.case_library.map((c, i) => ({
                          id: c.id || `case-${i}`,
                          head: c.title + (c.category ? ` · ${c.category}` : ''),
                          body: c.summary,
                        }))}
                        testid="accordion-cases"
                        defaultOpenIdx={0}
                      />
                    ) : (
                      <EmptyStateCard hint="Реални случаи" message="Клиниката все още не е предоставила реални случаи за публикуване." testid="empty-cases" />
                    )}
                  </SectionShell>

                  {/* Prices — collapsed via accordion when data exists, compact empty otherwise */}
                  <SectionShell testid="profile-section-prices" title="Ценови ориентири" icon={<ListChecks className="w-4 h-4 text-teal-700" />}>
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

                  {/* Category authority */}
                  {clinic.category_authority && (
                    <SectionShell testid="profile-section-category-authority" title="Сила на профила" icon={<Award className="w-4 h-4 text-amber-600" />}>
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        {clinic.category_authority}
                      </p>
                    </SectionShell>
                  )}

                  {hasRealZubiteFeedback && (
                    <SectionShell testid="profile-section-zubite-feedback" title="Сигнал от Zubite пациенти" icon={<MessagesSquare className="w-4 h-4 text-teal-700" />}>
                      <p className="text-xs text-slate-500">Реален Zubite-сигнал предстои.</p>
                    </SectionShell>
                  )}

                  <ContentAttribution clinic={clinic} />
                </>
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

              {/* Questions checklist — Premium+ collapsed by default */}
              {isPremium && (
                <SectionShell id="questions" testid="profile-section-questions" title="Въпроси, които можеш да зададеш" subtitle="Неутрални предложения от Zubite — не са твърдения на клиниката." icon={<MessagesSquare className="w-4 h-4 text-teal-700" />}>
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
              )}

              {/* Location */}
              <SectionShell id="location" testid="profile-section-location" title="Локация и контакт" icon={<MapPin className="w-4 h-4 text-teal-700" />}>
                <p className="text-[13px] text-slate-700">
                  {clinic.city_name || cityDisplay(clinic.city_slug || '')}
                  {clinic.area && (
                    <span className="text-slate-500"> · {clinic.area}</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={openContact}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white ring-1 ring-slate-300 text-slate-700 text-[12px] font-medium hover:bg-slate-50 transition-colors"
                  data-testid="profile-location-cta"
                >
                  <Phone className="w-3 h-3" />
                  Заяви контакт
                </button>
              </SectionShell>
            </div>

            {/* ── Right sticky action panel (desktop only) ── */}
            <aside className="hidden lg:block">
              <StickyActionPanel
                clinic={clinic}
                schedulerState={schedulerState}
                primaryLabel={heroPrimary.label}
                onPrimary={heroPrimary.onClick}
                onContact={openContact}
                primaryIsSchedule={schedulerState === 'available'}
              />
            </aside>
          </div>

          {/* Bottom mobile CTA (always-on small block) */}
          <div className="mt-8 lg:hidden">
            <BottomMobileCTA primaryLabel={heroPrimary.label} onPrimary={heroPrimary.onClick} schedulerState={schedulerState} />
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
    </main>
  )
}

// ─── Overview grid ───────────────────────────────────────────────

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

  const bestForPreview = clinic.best_for.slice(0, 2)
  const treatmentsPreview = clinic.treatments.slice(0, 4)
  const trustChips: Array<{ label: string; icon: React.ReactNode; key: string }> = []
  if (clinic.care_pass_partner) trustChips.push({ label: 'Care Pass', icon: <Heart className="w-3 h-3 text-rose-500" />, key: 'cp' })
  if (clinic.profile_information_reviewed) trustChips.push({ label: 'Профил прегледан', icon: <ShieldCheck className="w-3 h-3 text-teal-600" />, key: 'rev' })

  return (
    <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" data-testid="profile-overview-grid">
      <OverviewCard
        icon={<CalendarClock className="w-3.5 h-3.5" />}
        title="Консултация"
        testid="overview-consultation"
      >
        <p className="text-[12px] text-slate-600 leading-snug mb-2">{consultationBody.line}</p>
        <button
          type="button"
          onClick={consultationBody.onCta}
          className="text-[12px] font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
          data-testid="overview-consultation-cta"
        >
          {consultationBody.cta} →
        </button>
      </OverviewCard>

      <OverviewCard
        icon={<Check className="w-3.5 h-3.5" />}
        title="Подходяща за"
        testid="overview-fit"
      >
        {bestForPreview.length > 0 ? (
          <ul className="text-[12px] text-slate-600 leading-snug space-y-0.5 mb-2">
            {bestForPreview.map((b, i) => (
              <li key={i} className="line-clamp-1">· {b}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-slate-500 italic mb-2 leading-snug">
            Все още няма публикуван профил на подходящи случаи.
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
        title="Услуги"
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
          Всички направления →
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
      className="rounded-xl bg-white/75 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.20)] p-3.5"
      data-testid={testid}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1.5 mb-1.5">
        <span className="w-5 h-5 rounded-md bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
          {icon}
        </span>
        {title}
      </p>
      {children}
    </li>
  )
}

// ─── Sticky action panel (desktop) ────────────────────────────────

function StickyActionPanel({
  clinic, schedulerState, primaryLabel, onPrimary, onContact, primaryIsSchedule,
}: {
  clinic: PublicClinic
  schedulerState: SchedulerState
  primaryLabel: string
  onPrimary: () => void
  onContact: () => void
  primaryIsSchedule: boolean
}) {
  return (
    <div
      className="sticky top-20 space-y-3"
      data-testid="profile-sticky-panel"
    >
      <div className="rounded-2xl bg-white/85 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.18)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Следваща стъпка
        </p>
        <button
          type="button"
          onClick={onPrimary}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-medium hover:-translate-y-0.5 transition-all shadow-[0_12px_28px_-12px_rgba(13,148,136,0.50)]"
          style={{
            backgroundImage:
              'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
          }}
          data-testid="sticky-cta-primary"
        >
          {primaryIsSchedule ? <CalendarClock className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          {primaryLabel}
        </button>

        {schedulerState === 'available' && (
          <p className="mt-2 text-[11px] text-slate-500 leading-snug">
            Свободни часове за дистанционна консултация
            <span className="text-slate-400"> · телефонен разговор</span>
          </p>
        )}
        {schedulerState === 'enabled_no_slots' && (
          <p className="mt-2 text-[11px] text-amber-700 leading-snug">
            Клиниката приема заявки за онлайн консултация, но няма
            публикувани свободни часове.
          </p>
        )}

        {primaryIsSchedule && (
          <button
            type="button"
            onClick={onContact}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors"
            data-testid="sticky-cta-secondary"
          >
            <Phone className="w-3 h-3" />
            или заяви контакт
          </button>
        )}

        {clinic.care_pass_partner && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="inline-flex items-center gap-1 text-[12px] text-slate-700 font-medium">
              <Heart className="w-3 h-3 text-rose-500" />
              Care Pass партньор
            </p>
            <Link
              href="/care-pass"
              className="mt-0.5 block text-[11px] text-teal-700 hover:text-teal-800"
            >
              Виж как работи →
            </Link>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 leading-snug px-1">
        Заявката се изпраща към клиниката. Zubite не потвърждава автоматично записване.
      </p>
    </div>
  )
}

function BottomMobileCTA({
  primaryLabel, onPrimary, schedulerState,
}: {
  primaryLabel: string
  onPrimary: () => void
  schedulerState: SchedulerState
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-teal-50/85 via-white/70 to-white/60 backdrop-blur-xl ring-1 ring-teal-100/70 p-5" data-testid="mobile-bottom-cta">
      <p className="text-sm text-slate-700 mb-3 leading-snug">
        {schedulerState === 'available'
          ? 'Готов ли си да запазиш час?'
          : 'Готов ли си за следваща стъпка?'}
      </p>
      <button
        type="button"
        onClick={onPrimary}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-medium shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50)]"
        style={{
          backgroundImage:
            'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
        }}
        data-testid="mobile-bottom-cta-button"
      >
        {schedulerState === 'available' ? <CalendarClock className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
        {primaryLabel}
      </button>
    </div>
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
      return d.toLocaleDateString('bg-BG', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return null
    }
  }, [clinic.profile_published_at])
  return (
    <SectionShell testid="profile-section-attribution" title="За съдържанието" icon={<FileText className="w-4 h-4 text-slate-500" />}>
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

function SectionShell({
  id, testid, title, subtitle, icon, children,
}: {
  id?: string
  testid: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.18)] p-4 sm:p-5 scroll-mt-20"
      data-testid={testid}
    >
      <div className="mb-2.5">
        <h2 className="font-serif text-[15px] sm:text-base font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
            {icon}
          </span>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 ml-8 text-[10px] text-slate-500 leading-snug">
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

// ─── Showcase-only: enhanced listing card preview ────────────────
// Renders inside the addons-showcase profile only (`is_addons_showcase`
// flag). Purpose: give sales / QA / partners a visual reference of all
// possible listing-tile add-on chips WITHOUT modifying the real
// `PublicClinicCard` component or polluting `/kliniki` listings.

function ShowcaseListingCardPreview({ clinic }: { clinic: PublicClinic }) {
  return (
    <section
      className="mt-5 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-4 sm:p-5"
      data-testid="showcase-listing-card-preview-section"
    >
      <header className="mb-3">
        <h2 className="font-serif text-[15px] sm:text-base font-semibold text-slate-900 inline-flex items-center gap-2">
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
            Authority Partner
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
            <ListingChip icon={<Heart className="w-2.5 h-2.5 text-rose-500" />} label="Care Pass" />
            <ListingChip icon={<ShieldCheck className="w-2.5 h-2.5 text-teal-600" />} label="Профил прегледан" />
            <ListingChip icon={<FileText className="w-2.5 h-2.5" />} label="Реални случаи" />
            <ListingChip icon={<Quote className="w-2.5 h-2.5" />} label="Експертни отговори" />
            <ListingChip icon={<Video className="w-2.5 h-2.5" />} label="Видео представяне" />
          </ul>

          <h3 className="font-serif text-[18px] font-semibold text-slate-900 leading-snug">
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
