'use client'

/**
 * <ClinicProfileView />
 * ------------------------------------------------------------------
 * Phase C1 — tier-aware clinic-home redesign.
 *
 * Design intent: feel like the clinic's premium home inside Zubite,
 * not a long stack of exposed sections. Tier-included sections are
 * ALWAYS visible — when the clinic hasn't filled in content yet, we
 * render a polished `<EmptyStateCard />` so the patient understands
 * the section is offered but pending, never broken.
 *
 * Hard trust rules (enforced here):
 *  • No fake clinic claims, prices, reviews, cases, or expert answers.
 *  • Generic patient-questions checklist is Zubite-supplied content,
 *    not a clinic claim — labelled as such.
 *  • Sponsored badge always reads "Спонсорирано" and is visually
 *    separated from the tier label; never implies ranking superiority.
 *  • Demo clinics render a sticky banner and never appear in normal
 *    discovery (Phase C1 noindex meta is set in the route file).
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, ShieldCheck, Sparkles, Video, Heart,
  Phone, Check, X, MessagesSquare, Stethoscope, UserCircle2, BookOpenCheck,
  Cpu, ListChecks, Award, Quote, FileText, Megaphone, ChevronDown,
} from 'lucide-react'
import {
  type PublicClinic, treatmentLabel, cityDisplay,
} from '@/lib/publicClinics'
import PublicContactModal from './PublicContactModal'
import ConsultationScheduler from './ConsultationScheduler'
import EmptyStateCard from './EmptyStateCard'

/**
 * Generic patient-questions checklist — labelled as Zubite-supplied
 * neutral guidance, never as a clinic claim. Same list everywhere.
 */
const SUGGESTED_QUESTIONS: Array<{ topic: string; question: string }> = [
  { topic: 'Цена', question: 'Каква е приблизителната цена за моя случай и от какво зависи финалната сума?' },
  { topic: 'Подходящ за мен', question: 'Кои методи са подходящи за моя случай и кои бихте препоръчали по-внимателно?' },
  { topic: 'Времева линия', question: 'Колко време обикновено отнема целият процес — от консултация до завършване?' },
  { topic: 'Алтернативи', question: 'Има ли алтернативни лечения, които си струва да обмисля заедно с предложения план?' },
  { topic: 'Рискове', question: 'Какви са основните рискове на това лечение и как ги минимизирате?' },
  { topic: 'Поддръжка', question: 'Какво се случва след края на активното лечение — ретенция, контролни прегледи?' },
]

interface Props {
  clinic: PublicClinic
}

export default function ClinicProfileView({ clinic }: Props) {
  const [contactCtx, setContactCtx] = useState<
    | { consultationType: 'general' | 'online' }
    | null
  >(null)
  const [sourcePath, setSourcePath] = useState<string>('')
  /** Lifted from `<ConsultationScheduler />` so the Premium "Online
   *  consultation included" empty state can render adjacent when the
   *  scheduler has no settings (`disabled` state). */
  const [schedulerState, setSchedulerState] = useState<
    'available' | 'enabled_no_slots' | 'disabled' | null
  >(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSourcePath(window.location.pathname || '')
    }
  }, [])

  const isPremium =
    clinic.partner_tier === 'featured' || clinic.partner_tier === 'premium'
  const isAuthority = clinic.partner_tier === 'premium'

  const tierBadgeStyle =
    clinic.partner_tier === 'premium'
      ? 'bg-amber-50 text-amber-800 ring-amber-100'
      : clinic.partner_tier === 'featured'
      ? 'bg-teal-50 text-teal-800 ring-teal-100'
      : 'bg-slate-50 text-slate-700 ring-slate-200'

  // Real Zubite-owned patient feedback is the ONLY signal we'd ever
  // render on the Authority profile. Currently no in-DB aggregate is
  // wired through the public payload — so the panel is intentionally
  // not rendered. (NEVER fake patient quotes.)
  const hasRealZubiteFeedback = false

  return (
    <main
      className="min-h-screen bg-[#FCFAF8] overflow-x-hidden relative pb-20"
      data-testid="public-clinic-profile"
      data-clinic-id={clinic.id}
      data-tier={clinic.partner_tier}
    >
      {/* Background blobs */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.22) 0%, rgba(94,234,212,0) 60%),' +
            'radial-gradient(ellipse 60% 50% at 90% 40%, rgba(165,243,252,0.30) 0%, rgba(165,243,252,0) 60%)',
        }}
      />

      {/* Demo / showcase clinic banner — sticky, never on real clinics. */}
      {clinic.is_demo && <DemoBanner />}

      <section className="relative pt-12 sm:pt-16 pb-8 md:pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/kliniki"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-5 transition-colors"
            data-testid="profile-back-to-listing"
          >
            <ArrowLeft className="w-4 h-4" />
            Към каталога с клиники
          </Link>

          {/* ──────────────── Hero ──────────────── */}
          <header
            className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/75 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] overflow-hidden"
            data-testid="profile-hero"
          >
            {clinic.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clinic.hero_image_url}
                alt={clinic.name}
                className="w-full h-48 sm:h-64 object-cover"
              />
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-teal-100/60 via-cyan-50/40 to-white" />
            )}
            <div className="p-5 sm:p-7">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-teal-50 ring-1 ring-teal-100 grid place-items-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-teal-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
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
                        title="Видимостта е спонсорирана. Не влияе на ранкирането."
                      >
                        <Megaphone className="w-3 h-3" />
                        Спонсорирано
                      </span>
                    )}
                  </div>
                  <h1
                    className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight"
                    data-testid="profile-name"
                  >
                    {clinic.name}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {clinic.city_name || cityDisplay(clinic.city_slug || '')}
                    {clinic.area && ` · ${clinic.area}`}
                  </p>
                </div>
              </div>

              {clinic.short_description && (
                <p className="mt-4 text-sm sm:text-base text-slate-700 leading-relaxed">
                  {clinic.short_description}
                </p>
              )}

              {/* Quick trust chips */}
              <ul className="mt-4 flex flex-wrap gap-1.5" data-testid="profile-trust-chips">
                {clinic.online_consultation && (
                  <BadgePill icon={<Video className="w-3 h-3" />} label="Онлайн консултация" />
                )}
                {clinic.care_pass_partner && (
                  <BadgePill icon={<Heart className="w-3 h-3 text-rose-500" />} label="Care Pass" />
                )}
                {clinic.profile_information_reviewed && (
                  <BadgePill
                    icon={<ShieldCheck className="w-3 h-3 text-teal-600" />}
                    label="Профил прегледан"
                  />
                )}
              </ul>

              {/* Primary CTAs */}
              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setContactCtx({ consultationType: 'general' })}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-medium hover:-translate-y-0.5 transition-all shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50)]"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
                  }}
                  data-testid="profile-cta-contact"
                >
                  <Phone className="w-4 h-4" />
                  Заяви контакт
                </button>
                {clinic.online_consultation && (
                  <button
                    type="button"
                    onClick={() => setContactCtx({ consultationType: 'online' })}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-cyan-50 ring-1 ring-cyan-200 text-cyan-800 text-sm font-medium hover:bg-cyan-100 transition-colors"
                    data-testid="profile-cta-online"
                  >
                    <Video className="w-4 h-4" />
                    Заяви онлайн консултация
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* ──────────────── Phone-consultation scheduler ──────────────── */}
          <ConsultationScheduler
            clinic={clinic}
            sourcePath={sourcePath}
            onStateResolved={setSchedulerState}
          />

          {/* Premium+ — Online-consultation included but no scheduler
              configured yet → polished empty state. The scheduler
              owns the available / enabled_no_slots states (Phase B). */}
          {isPremium && clinic.online_consultation && schedulerState === 'disabled' && (
            <SectionShell
              testid="profile-section-online-empty"
              icon={<Video className="w-5 h-5 text-teal-700" />}
              title="Онлайн консултация"
            >
              <EmptyStateCard
                hint="Включено в профила"
                message="Клиниката приема заявки за онлайн консултация, но все още не е публикувала свободни часове. Изпрати заявка и клиниката ще те потърси с предложение за час."
                testid="empty-online-consultation"
              />
            </SectionShell>
          )}

          {/* ──────────────── Care Pass (Premium+) ──────────────── */}
          {isPremium && (
            clinic.care_pass_partner ? (
              <SectionShell
                testid="profile-section-care-pass"
                icon={<Heart className="w-5 h-5 text-rose-500" />}
                title="Zubite Care Pass"
              >
                <p className="text-sm text-slate-700 leading-relaxed">
                  Тази клиника е партньор по Zubite Care Pass. Care Pass
                  предоставя структурирана грижа след активното лечение
                  — ясни ретенционни срокове, контролни прегледи и
                  свързаност с твоя план.
                </p>
                <Link
                  href="/care-pass"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-teal-700 hover:text-teal-800"
                >
                  Виж как работи Care Pass →
                </Link>
              </SectionShell>
            ) : (
              <SectionShell
                testid="profile-section-care-pass-empty"
                icon={<Heart className="w-5 h-5 text-rose-400" />}
                title="Zubite Care Pass"
              >
                <EmptyStateCard
                  hint="Care Pass"
                  message="Тази клиника все още не е партньор по Zubite Care Pass."
                  testid="empty-care-pass"
                />
              </SectionShell>
            )
          )}

          {/* ──────────────── Suitability (Premium+) ──────────────── */}
          {isPremium && (
            clinic.best_for.length > 0 || clinic.not_ideal_for.length > 0 ? (
              <SectionShell
                testid="profile-section-fit"
                icon={<Check className="w-5 h-5 text-teal-700" />}
                title="Подходяща ли е тази клиника за вас?"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  {clinic.best_for.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                        Подходяща за
                      </p>
                      <ul className="space-y-1.5 text-sm text-slate-700">
                        {clinic.best_for.map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {clinic.not_ideal_for.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-2">
                        Може да не е идеална за
                      </p>
                      <ul className="space-y-1.5 text-sm text-slate-700">
                        {clinic.not_ideal_for.map((n, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <X className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </SectionShell>
            ) : (
              <SectionShell
                testid="profile-section-fit-empty"
                icon={<Check className="w-5 h-5 text-teal-600" />}
                title="Подходяща ли е тази клиника за вас?"
              >
                <EmptyStateCard testid="empty-fit" />
              </SectionShell>
            )
          )}

          {/* ──────────────── Services accordion (all tiers) ──────────────── */}
          <SectionShell
            testid="profile-section-services"
            icon={<Stethoscope className="w-5 h-5 text-teal-700" />}
            title="Услуги и направления"
          >
            {clinic.treatments.length > 0 ? (
              <div>
                <ul className="flex flex-wrap gap-1.5">
                  {clinic.treatments.map((t) => (
                    <li
                      key={t}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 text-xs"
                    >
                      {treatmentLabel(t)}
                    </li>
                  ))}
                </ul>
                {clinic.treatment_focus.length > 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    Допълнителен фокус: {clinic.treatment_focus.join(', ')}
                  </p>
                )}
                {/* Per-treatment accordions — only Premium+ shows expanded
                    detail; below standard tier we keep it compact. */}
                {isPremium && (
                  <div className="mt-4 space-y-2" data-testid="profile-treatments-accordion">
                    {clinic.treatments.map((t) => (
                      <TreatmentAccordion
                        key={t}
                        slug={t}
                        detail={clinic.treatment_details[t]}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyStateCard
                hint="Услуги"
                message="Клиниката все още не е публикувала пълен списък с лечения."
                testid="empty-treatments"
              />
            )}
          </SectionShell>

          {/* ─── Premium+ block ─── */}
          {isPremium && (
            <>
              {/* Patient approach (patient_intro) */}
              <SectionShell
                testid="profile-section-approach"
                icon={<BookOpenCheck className="w-5 h-5 text-teal-700" />}
                title="Подход и първа консултация"
              >
                {clinic.patient_intro ? (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {clinic.patient_intro}
                  </p>
                ) : (
                  <EmptyStateCard testid="empty-patient-intro" />
                )}
              </SectionShell>

              {/* Consultation process — accordion */}
              <SectionShell
                testid="profile-section-process"
                icon={<Sparkles className="w-5 h-5 text-teal-700" />}
                title="Как протича консултацията"
              >
                {clinic.consultation_process ? (
                  <Accordion
                    items={consultationStepsFromText(clinic.consultation_process)}
                    testid="accordion-process"
                  />
                ) : (
                  <EmptyStateCard testid="empty-process" />
                )}
              </SectionShell>

              {/* Doctor spotlight */}
              <SectionShell
                testid="profile-section-doctor"
                icon={<UserCircle2 className="w-5 h-5 text-teal-700" />}
                title="Водещ лекар"
              >
                {clinic.doctor_spotlight?.name ? (
                  <div>
                    <p className="font-medium text-slate-900">
                      {clinic.doctor_spotlight.name}
                    </p>
                    {clinic.doctor_spotlight.role && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {clinic.doctor_spotlight.role}
                      </p>
                    )}
                    {clinic.doctor_spotlight.bio && (
                      <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {clinic.doctor_spotlight.bio}
                      </p>
                    )}
                    {clinic.team_note && (
                      <p className="mt-3 text-xs text-slate-500 italic">
                        {clinic.team_note}
                      </p>
                    )}
                  </div>
                ) : (
                  <EmptyStateCard
                    hint="Водещ лекар"
                    message="Профилът на водещия лекар все още не е добавен."
                    testid="empty-doctor"
                  />
                )}
              </SectionShell>

              {/* Questions to ask — Zubite-supplied checklist */}
              <SectionShell
                testid="profile-section-questions"
                icon={<MessagesSquare className="w-5 h-5 text-teal-700" />}
                title="Въпроси, които можеш да зададеш"
                subtitle="Неутрални предложения от Zubite — не са твърдения на клиниката."
              >
                <Accordion
                  items={SUGGESTED_QUESTIONS.map((q, i) => ({
                    id: `q-${i}`,
                    head: q.topic,
                    body: q.question,
                  }))}
                  testid="accordion-questions"
                />
              </SectionShell>

              {/* Patient journey context — why this clinic appears */}
              {clinic.why_this_clinic_appears.length > 0 && (
                <SectionShell
                  testid="profile-section-journey"
                  icon={<ListChecks className="w-5 h-5 text-teal-700" />}
                  title="Защо тази клиника се появява тук"
                >
                  <ul className="space-y-1.5 text-sm text-slate-700">
                    {clinic.why_this_clinic_appears.map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-teal-600 mt-1 flex-shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </SectionShell>
              )}
            </>
          )}

          {/* ─── Authority block ─── */}
          {isAuthority && (
            <>
              {/* Deep clinic story (long_description) */}
              <SectionShell
                testid="profile-section-story"
                icon={<BookOpenCheck className="w-5 h-5 text-teal-700" />}
                title="Историята на клиниката"
              >
                {clinic.long_description ? (
                  <div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {clinic.long_description}
                    </p>
                    {clinic.environment_description && (
                      <div className="mt-4 rounded-lg bg-teal-50/40 ring-1 ring-teal-100 p-3 text-xs text-slate-700 leading-snug">
                        {clinic.environment_description}
                      </div>
                    )}
                    {clinic.philosophy && (
                      <blockquote className="mt-4 border-l-2 border-teal-400 pl-3 text-sm text-slate-700 italic">
                        {clinic.philosophy}
                      </blockquote>
                    )}
                  </div>
                ) : (
                  <EmptyStateCard testid="empty-story" />
                )}
              </SectionShell>

              {/* Technology accordion */}
              <SectionShell
                testid="profile-section-technology"
                icon={<Cpu className="w-5 h-5 text-teal-700" />}
                title="Технологии и дигитален работен процес"
              >
                {clinic.technology_section.length > 0 ? (
                  <Accordion
                    items={clinic.technology_section.map((t, i) => ({
                      id: `tech-${i}`,
                      head: t.split(/[—:.]/, 1)[0].trim() || `Технология ${i + 1}`,
                      body: t,
                    }))}
                    testid="accordion-technology"
                  />
                ) : (
                  <EmptyStateCard
                    hint="Технологии"
                    message="Все още няма публикувана информация за технологии и дигитален работен процес."
                    testid="empty-technology"
                  />
                )}
              </SectionShell>

              {/* Expert Q&A */}
              <SectionShell
                testid="profile-section-expert-qa"
                icon={<Quote className="w-5 h-5 text-teal-700" />}
                title="Експертни отговори"
              >
                {clinic.expert_qa.length > 0 ? (
                  <Accordion
                    items={clinic.expert_qa.map((qa, i) => ({
                      id: `eqa-${i}`,
                      head: qa.question,
                      body: qa.answer,
                    }))}
                    testid="accordion-expert-qa"
                  />
                ) : (
                  <EmptyStateCard
                    hint="Експертни отговори"
                    message="Клиниката все още не е добавила отговори на често задавани пациентски въпроси."
                    testid="empty-expert-qa"
                  />
                )}
              </SectionShell>

              {/* Case library */}
              <SectionShell
                testid="profile-section-cases"
                icon={<FileText className="w-5 h-5 text-teal-700" />}
                title="Реални случаи"
                subtitle="Публикуват се само случаи с потвърдено пациентско съгласие."
              >
                {clinic.case_library.length > 0 ? (
                  <Accordion
                    items={clinic.case_library.map((c, i) => ({
                      id: c.id || `case-${i}`,
                      head: c.title + (c.category ? ` · ${c.category}` : ''),
                      body: c.summary,
                    }))}
                    testid="accordion-cases"
                  />
                ) : (
                  <EmptyStateCard
                    hint="Реални случаи"
                    message="Клиниката все още не е предоставила реални случаи за публикуване."
                    testid="empty-cases"
                  />
                )}
              </SectionShell>

              {/* Category authority framing */}
              <SectionShell
                testid="profile-section-category-authority"
                icon={<Award className="w-5 h-5 text-amber-600" />}
                title="Сила на профила"
              >
                {clinic.category_authority ? (
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {clinic.category_authority}
                  </p>
                ) : (
                  <EmptyStateCard testid="empty-category-authority" />
                )}
              </SectionShell>

              {/* Patient feedback signal — ONLY rendered when real
                  Zubite-owned aggregate exists. NEVER faked. */}
              {hasRealZubiteFeedback && (
                <SectionShell
                  testid="profile-section-zubite-feedback"
                  icon={<MessagesSquare className="w-5 h-5 text-teal-700" />}
                  title="Сигнал от Zubite пациенти"
                >
                  <p className="text-xs text-slate-500">
                    Тук ще се появи Zubite-собствен обобщен сигнал.
                  </p>
                </SectionShell>
              )}

              {/* Price ranges */}
              <SectionShell
                testid="profile-section-prices"
                icon={<ListChecks className="w-5 h-5 text-teal-700" />}
                title="Ценови ориентири"
              >
                {clinic.price_ranges.length > 0 ? (
                  <ul className="divide-y divide-slate-100/80" data-testid="price-list">
                    {clinic.price_ranges.map((p, i) => (
                      <li
                        key={i}
                        className="py-2 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {treatmentLabel(p.treatment)}
                          </p>
                          {p.note && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {p.note}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 whitespace-nowrap">
                          {formatPriceRange(p)}
                        </p>
                      </li>
                    ))}
                    <li className="pt-3 text-[11px] text-slate-500 leading-snug">
                      Точната цена зависи от конкретния клиничен случай и
                      се определя след преглед.
                    </li>
                  </ul>
                ) : (
                  <EmptyStateCard
                    hint="Ценови ориентири"
                    message="Клиниката все още не е добавила ценови ориентири. Точната цена зависи от конкретния клиничен случай и се определя след преглед."
                    testid="empty-prices"
                  />
                )}
              </SectionShell>

              {/* Content / source attribution */}
              <ContentAttribution clinic={clinic} />
            </>
          )}

          {/* ──────────────── Location / contact (all tiers) ──────────────── */}
          <SectionShell
            testid="profile-section-location"
            icon={<MapPin className="w-5 h-5 text-teal-700" />}
            title="Локация и контакт"
          >
            <p className="text-sm text-slate-700">
              {clinic.city_name || cityDisplay(clinic.city_slug || '')}
              {clinic.area && (
                <span className="text-slate-500"> · {clinic.area}</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setContactCtx({ consultationType: 'general' })}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white ring-1 ring-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              data-testid="profile-location-cta"
            >
              <Phone className="w-3.5 h-3.5" />
              Заяви контакт
            </button>
          </SectionShell>

          {/* Premium+ profile trust block */}
          {isPremium && (
            <SectionShell
              testid="profile-section-trust"
              icon={<ShieldCheck className="w-5 h-5 text-teal-700" />}
              title="Проверка на профила"
            >
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 mt-1 flex-shrink-0" />
                  <span>
                    {clinic.profile_information_reviewed
                      ? 'Информацията за профила е прегледана от Zubite.'
                      : 'Профилът все още не е преминал ръчен Zubite преглед.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 mt-1 flex-shrink-0" />
                  <span>
                    Zubite не определя „най-добра" клиника и не претендира
                    за клинична преценка.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 mt-1 flex-shrink-0" />
                  <span>
                    Спонсорираното позициониране (когато се прилага) се
                    маркира отделно и не влияе на органичното подреждане.
                  </span>
                </li>
              </ul>
            </SectionShell>
          )}

          {/* ──────────────── Bottom CTA ──────────────── */}
          <section
            className="mt-8 rounded-2xl bg-gradient-to-br from-teal-50/85 via-white/70 to-white/60 backdrop-blur-xl ring-1 ring-teal-100/70 p-6 sm:p-8"
            data-testid="profile-bottom-cta"
          >
            <h2 className="font-serif text-xl font-semibold text-slate-900 mb-2">
              Готов ли си за следваща стъпка?
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Изпрати заявка — клиниката ще се свърже с теб според процеса
              си за обработка на заявки.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setContactCtx({ consultationType: 'general' })}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-medium hover:-translate-y-0.5 transition-all shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50)]"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
                }}
                data-testid="profile-bottom-cta-button"
              >
                <Phone className="w-4 h-4" />
                Заяви контакт
              </button>
              <Link
                href="/kliniki"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white ring-1 ring-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Виж други клиники
              </Link>
            </div>
          </section>

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

// ─── Sub-components ──────────────────────────────────────────────

function DemoBanner() {
  return (
    <div
      className="sticky top-0 z-30 bg-amber-100/95 backdrop-blur ring-1 ring-amber-200 text-amber-900 text-xs sm:text-sm"
      data-testid="demo-clinic-banner"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-start gap-2">
        <Megaphone className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
    <SectionShell
      testid="profile-section-attribution"
      icon={<FileText className="w-5 h-5 text-slate-500" />}
      title="За съдържанието"
    >
      <p className="text-xs text-slate-500 leading-snug">
        Информацията в този профил е предоставена от клиниката.
        {clinic.profile_information_reviewed
          ? ' Прегледана е от екипа на Zubite за съответствие с правилата ни.'
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
  testid, title, subtitle, icon, children,
}: {
  testid: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      className="mt-6 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-5 sm:p-6"
      data-testid={testid}
    >
      <div className="mb-3">
        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
            {icon}
          </span>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 ml-10 text-[11px] text-slate-500 leading-snug">
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
    <li className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/85 ring-1 ring-slate-200 text-[11px] text-slate-700">
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

function Accordion({ items, testid }: { items: AccordionItem[]; testid: string }) {
  return (
    <ul className="space-y-1.5" data-testid={testid}>
      {items.map((it, idx) => (
        <li key={it.id}>
          <details
            className="group rounded-xl bg-white ring-1 ring-slate-200/70 open:ring-teal-200 transition-colors"
            data-testid={`${testid}-item-${idx}`}
            // Mobile-friendly default: first item open so the section
            // doesn't feel collapsed-blank on landing.
            open={idx === 0}
          >
            <summary
              className="list-none cursor-pointer flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-800 hover:text-slate-900"
              data-testid={`${testid}-summary-${idx}`}
            >
              <span className="flex-1">{it.head}</span>
              <ChevronDown
                className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0"
                aria-hidden
              />
            </summary>
            <div className="px-4 pb-3 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {it.body}
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}

function TreatmentAccordion({
  slug, detail,
}: {
  slug: string
  detail: PublicClinic['treatment_details'][string] | undefined
}) {
  const hasContent = !!(detail && (detail.who_for || detail.note || detail.remote_start_possible !== null))
  return (
    <details
      className="group rounded-xl bg-white/80 ring-1 ring-slate-200/70 open:ring-teal-200"
      data-testid={`treatment-accordion-${slug}`}
    >
      <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-800">
        <span>{treatmentLabel(slug)}</span>
        <ChevronDown
          className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"
          aria-hidden
        />
      </summary>
      <div className="px-4 pb-3 text-sm text-slate-600 leading-relaxed">
        {hasContent ? (
          <>
            {detail?.who_for && (
              <p>
                <strong className="text-slate-800">За кого е подходящо: </strong>
                {detail.who_for}
              </p>
            )}
            {detail?.remote_start_possible !== null && detail?.remote_start_possible !== undefined && (
              <p className="mt-1.5 text-xs text-slate-500">
                {detail.remote_start_possible
                  ? 'Първият разговор може да започне дистанционно.'
                  : 'Първият разговор обикновено е на място.'}
              </p>
            )}
            {detail?.note && (
              <p className="mt-1.5 text-xs text-slate-500 italic">
                {detail.note}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 italic">
            Все още без разширено описание за това лечение.
          </p>
        )}
      </div>
    </details>
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

/** Split a multi-line consultation_process blob ("1. Foo\n2. Bar") into
 *  accordion items. Lines starting with a number become headlines. */
function consultationStepsFromText(text: string): AccordionItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const steps: AccordionItem[] = []
  for (const ln of lines) {
    const m = ln.match(/^(\d+)[.)\s-]*\s*(.+)$/)
    if (m) {
      const head = m[2].length > 60 ? m[2].slice(0, 60) + '…' : m[2]
      steps.push({ id: `step-${m[1]}`, head: `${m[1]}. ${head}`, body: m[2] })
    } else {
      // Continuation line — append to previous step body if any.
      if (steps.length > 0) {
        steps[steps.length - 1].body += '\n' + ln
      } else {
        steps.push({ id: `step-0`, head: ln.slice(0, 60), body: ln })
      }
    }
  }
  return steps.length > 0 ? steps : [{ id: 'step-only', head: 'Процес', body: text }]
}
