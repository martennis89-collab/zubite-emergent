'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, ShieldCheck, Sparkles, Video, Heart,
  Phone, Check, X, MessagesSquare, Stethoscope, UserCircle2, BookOpenCheck,
} from 'lucide-react'
import {
  type PublicClinic, treatmentLabel, cityDisplay,
} from '@/lib/publicClinics'
import PublicContactModal from './PublicContactModal'
import ConsultationScheduler from './ConsultationScheduler'

const SUGGESTED_QUESTIONS_GENERIC = [
  'Какво включва първоначалната консултация при вас?',
  'Какви са обикновените стъпки преди да започне лечение?',
  'Какво се случва, ако се наложи план B?',
]

interface Props {
  clinic: PublicClinic
}

/**
 * Public clinic profile — soft, decision-oriented, reuses CarePassPanel if
 * the clinic is a Care Pass partner. NO duplicate scheduler — online
 * consultation is request-only per agreed V1 scope (5a).
 */
export default function ClinicProfileView({ clinic }: Props) {
  const [contactCtx, setContactCtx] = useState<
    | { consultationType: 'general' | 'online' }
    | null
  >(null)
  // Canonical profile URL — captured client-side so analytics + the
  // public scheduler lead carry the exact `/kliniki/[city]/[specialty]/[slug]`
  // path the user is viewing.
  const [sourcePath, setSourcePath] = useState<string>('')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSourcePath(window.location.pathname || '')
    }
  }, [])

  const tierIsPartner = clinic.partner_tier !== 'standard'

  return (
    <main
      className="min-h-screen bg-[#FCFAF8] overflow-x-hidden relative pb-20"
      data-testid="public-clinic-profile"
      data-clinic-id={clinic.id}
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

      <section className="relative pt-16 sm:pt-20 pb-8 md:pb-12">
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

          {/* Hero */}
          <header
            className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/75 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] overflow-hidden mb-6"
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
                <div className="min-w-0">
                  <span
                    className={
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium mb-1 ring-1 ' +
                      (tierIsPartner
                        ? 'bg-amber-50 text-amber-800 ring-amber-100'
                        : 'bg-slate-50 text-slate-700 ring-slate-200')
                    }
                    data-testid="profile-tier-label"
                  >
                    <Sparkles className="w-3 h-3" />
                    {clinic.public_status_label}
                  </span>
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

              {/* Badge row */}
              <ul className="mt-4 flex flex-wrap gap-1.5">
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

              {/* CTA row */}
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

          {/* Phase B — Public phone-consultation scheduler.
              Renders nothing when scheduler is disabled. */}
          <ConsultationScheduler clinic={clinic} sourcePath={sourcePath} />

          {/* Online consultation section — only when offered */}
          {clinic.online_consultation && (
            <Section
              testid="profile-section-online"
              icon={<Video className="w-5 h-5 text-teal-700" />}
              title="Онлайн консултация"
            >
              <p className="text-sm text-slate-700 leading-relaxed">
                Тази клиника предлага онлайн консултация за първоначална
                ориентация. Онлайн консултацията може да помогне да обсъдите
                симптоми, цели, възможни лечения и следващи стъпки.
                Окончателна диагноза и точен план обикновено изискват преглед
                на място.
              </p>
              <div className="mt-3 rounded-md bg-amber-50/60 ring-1 ring-amber-100 p-3 text-xs text-amber-900 leading-snug">
                Изпратете заявка и клиниката ще потвърди възможните часове.
                Zubite.bg не показва автоматично свободни часове и не
                потвърждава записването.
              </div>
              {clinic.online_consultation_label && (
                <p className="mt-3 text-xs text-slate-500">
                  Очаквана наличност: <strong className="text-slate-700">{clinic.online_consultation_label}</strong>
                </p>
              )}
              <button
                type="button"
                onClick={() => setContactCtx({ consultationType: 'online' })}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                data-testid="profile-online-cta"
              >
                <Video className="w-4 h-4" />
                Заяви онлайн консултация
              </button>
            </Section>
          )}

          {/* Best for / Not ideal for */}
          {(clinic.best_for.length > 0 || clinic.not_ideal_for.length > 0) && (
            <Section
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
            </Section>
          )}

          {/* Treatments */}
          {clinic.treatments.length > 0 && (
            <Section
              testid="profile-section-treatments"
              icon={<Stethoscope className="w-5 h-5 text-teal-700" />}
              title="Направления и лечения"
            >
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
            </Section>
          )}

          {/* About / long description */}
          {(clinic.patient_intro || clinic.long_description) && (
            <Section
              testid="profile-section-about"
              icon={<BookOpenCheck className="w-5 h-5 text-teal-700" />}
              title="За клиниката"
            >
              {clinic.patient_intro && (
                <p className="text-sm text-slate-700 leading-relaxed">
                  {clinic.patient_intro}
                </p>
              )}
              {clinic.long_description && (
                <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {clinic.long_description}
                </p>
              )}
            </Section>
          )}

          {/* Doctor spotlight */}
          {clinic.doctor_spotlight?.name && (
            <Section
              testid="profile-section-doctor"
              icon={<UserCircle2 className="w-5 h-5 text-teal-700" />}
              title="Водещ лекар / екип"
            >
              <p className="font-medium text-slate-900">{clinic.doctor_spotlight.name}</p>
              {clinic.doctor_spotlight.role && (
                <p className="text-sm text-slate-500 mt-0.5">{clinic.doctor_spotlight.role}</p>
              )}
              {clinic.doctor_spotlight.bio && (
                <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {clinic.doctor_spotlight.bio}
                </p>
              )}
            </Section>
          )}

          {/* Consultation process */}
          {clinic.consultation_process && (
            <Section
              testid="profile-section-process"
              icon={<Sparkles className="w-5 h-5 text-teal-700" />}
              title="Как протича консултацията"
            >
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {clinic.consultation_process}
              </p>
            </Section>
          )}

          {/* Questions to ask */}
          <Section
            testid="profile-section-questions"
            icon={<MessagesSquare className="w-5 h-5 text-teal-700" />}
            title="Въпроси, които можеш да зададеш"
          >
            <ul className="space-y-1.5 text-sm text-slate-700">
              {SUGGESTED_QUESTIONS_GENERIC.map((q) => (
                <li key={q} className="flex items-start gap-2">
                  <MessagesSquare className="w-3.5 h-3.5 text-teal-600 mt-1 flex-shrink-0" />
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Bottom CTA */}
          <section
            className="mt-8 rounded-2xl bg-gradient-to-br from-teal-50/85 via-white/70 to-white/60 backdrop-blur-xl ring-1 ring-teal-100/70 p-6 sm:p-8"
            data-testid="profile-bottom-cta"
          >
            <h2 className="font-serif text-xl font-semibold text-slate-900 mb-2">
              Готови ли сте за следваща стъпка?
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Изпрати заявка — клиниката ще се свърже с теб според процеса си
              за обработка на заявки.
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

function Section({
  testid, title, icon, children,
}: {
  testid: string
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      className="mt-6 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] p-5 sm:p-6"
      data-testid={testid}
    >
      <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 mb-3 inline-flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-teal-50 ring-1 ring-teal-100 grid place-items-center">
          {icon}
        </span>
        {title}
      </h2>
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
