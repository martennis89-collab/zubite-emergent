'use client'

import Link from 'next/link'
import {
  MapPin, ShieldCheck, Sparkles, Video, Heart, CheckCircle2,
  Users, Baby, Plus, Check, Phone,
} from 'lucide-react'
import {
  type PublicClinic, clinicProfileHref, treatmentLabel,
} from '@/lib/publicClinics'

interface Props {
  clinic: PublicClinic
  isInCompare: boolean
  onToggleCompare: () => void
  onRequestContact: () => void
  onRequestOnline: () => void
}

/**
 * Public clinic card — used on `/kliniki`, `/kliniki/[city]`, and the
 * compare tray. Soft, decision-oriented, no fake claims.
 *
 * - Review block renders ONLY when rating AND count exist.
 * - Online consultation badge renders ONLY when `online_consultation`.
 * - Reviews never lead the card; treatment fit + "why this clinic appears"
 *   come first per spec §4.
 */
export default function PublicClinicCard({
  clinic,
  isInCompare,
  onToggleCompare,
  onRequestContact,
  onRequestOnline,
}: Props) {
  const profileHref = clinicProfileHref(clinic)
  const treatments = clinic.treatments.slice(0, 4)
  const bestFor = clinic.best_for.slice(0, 3)
  const why = clinic.why_this_clinic_appears.slice(0, 4)
  const trustBadges: { icon: React.ComponentType<{ className?: string }>; label: string; key: string }[] =
    []
  // All clinics get a public_status_label badge — soft signal of package
  // richness. Standard tier renders the badge in a neutral slate style;
  // Premium / Authority tiers use the amber accent.
  trustBadges.push({
    icon: Sparkles,
    label: clinic.public_status_label,
    key: 'tier',
  })
  if (clinic.online_consultation) {
    trustBadges.push({ icon: Video, label: 'Онлайн консултация', key: 'online' })
  }
  if (clinic.care_pass_partner) {
    trustBadges.push({ icon: Heart, label: 'Care Pass', key: 'cp' })
  }
  if (clinic.profile_information_reviewed) {
    trustBadges.push({
      icon: ShieldCheck,
      label: 'Профил прегледан от Zubite',
      key: 'reviewed',
    })
  }

  return (
    <article
      className="group relative flex flex-col rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/75 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.25)] transition-shadow p-5 sm:p-6"
      data-testid={`public-clinic-card-${clinic.id}`}
      data-tier={clinic.partner_tier}
    >
      {/* Cover/hero */}
      {clinic.hero_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clinic.hero_image_url}
          alt={clinic.name}
          className="absolute inset-x-0 top-0 h-32 w-full object-cover rounded-t-2xl opacity-60"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 rounded-t-2xl bg-gradient-to-br from-teal-100/50 via-cyan-50/40 to-white"
        />
      )}
      <div className="relative pt-32 -mt-3">
        {/* Tier badge top-left */}
        <span
          className={
            'absolute -top-28 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur text-[10.5px] font-medium ring-1 ' +
            (clinic.partner_tier !== 'standard'
              ? 'bg-white/90 ring-amber-100 text-amber-800'
              : 'bg-white/90 ring-slate-200 text-slate-700')
          }
          data-testid={`card-tier-${clinic.id}`}
        >
          <Sparkles className="w-3 h-3" />
          {clinic.public_status_label}
        </span>

        {/* Name + city */}
        <h3
          className="font-serif text-lg sm:text-xl font-semibold text-slate-900 leading-snug line-clamp-2"
          data-testid={`card-name-${clinic.id}`}
        >
          <Link href={profileHref} className="hover:text-teal-700 transition-colors">
            {clinic.name}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {clinic.city_name || clinic.city_slug || '—'}
          {clinic.area && <span className="text-slate-400"> · {clinic.area}</span>}
        </p>

        {/* Treatment fit */}
        {treatments.length > 0 && (
          <div className="mt-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Основни направления
            </p>
            <ul className="flex flex-wrap gap-1">
              {treatments.map((t) => (
                <li
                  key={t}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 text-[11px]"
                >
                  {treatmentLabel(t)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Best suited for */}
        {bestFor.length > 0 && (
          <div className="mt-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Подходяща за
            </p>
            <ul className="text-[13px] text-slate-700 leading-snug space-y-0.5">
              {bestFor.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Why this clinic appears — mandatory per spec §5 */}
        {why.length > 0 && (
          <div
            className="mt-3 rounded-lg bg-slate-50/60 ring-1 ring-slate-100 p-3"
            data-testid={`card-why-${clinic.id}`}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Защо виждаш тази клиника
            </p>
            <ul className="text-[12px] text-slate-600 leading-snug space-y-0.5">
              {why.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-teal-600 mt-0.5 flex-shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trust badges */}
        {trustBadges.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {trustBadges.map(({ icon: I, label, key }) => (
              <li
                key={key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/85 ring-1 ring-slate-200 text-[11px] text-slate-700"
                data-testid={`card-badge-${clinic.id}-${key}`}
              >
                <I className="w-3 h-3 text-teal-600" />
                {label}
              </li>
            ))}
          </ul>
        )}

        {/* Audience hints */}
        {(clinic.accepts_adults || clinic.accepts_children) && (
          <div className="mt-2 flex gap-2 text-[11px] text-slate-500">
            {clinic.accepts_adults && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" /> Възрастни
              </span>
            )}
            {clinic.accepts_children && (
              <span className="inline-flex items-center gap-1">
                <Baby className="w-3 h-3" /> Деца
              </span>
            )}
          </div>
        )}

        {/* Review — only when both rating AND count exist. Source-labelled
            visually; never promoted into JSON-LD unless source==='zubite'. */}
        {clinic.review && (
          <div
            className="mt-2 text-[11px] text-slate-500"
            data-testid={`card-review-${clinic.id}`}
          >
            {clinic.review.source === 'google'
              ? `Google рейтинг: ${clinic.review.rating.toFixed(1)} от ${clinic.review.count} отзива`
              : clinic.review.source === 'superdoc'
              ? `Superdoc рейтинг: ${clinic.review.rating.toFixed(1)} от ${clinic.review.count} отзива`
              : `Zubite рейтинг: ${clinic.review.rating.toFixed(1)} от ${clinic.review.count} отзива`}
          </div>
        )}

        {/* Online consultation availability label */}
        {clinic.online_consultation && clinic.online_consultation_label && (
          <p className="mt-2 text-[11px] text-teal-700 inline-flex items-center gap-1">
            <Video className="w-3 h-3" />
            Онлайн консултация: {clinic.online_consultation_label}
          </p>
        )}

        {/* CTAs */}
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={profileHref}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-full bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors"
            data-testid={`card-view-profile-${clinic.id}`}
          >
            Виж профила
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRequestContact}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-100 text-[12px] font-medium hover:bg-teal-100 transition-colors"
              data-testid={`card-request-contact-${clinic.id}`}
            >
              <Phone className="w-3.5 h-3.5" />
              Заяви контакт
            </button>
            <button
              type="button"
              onClick={onToggleCompare}
              className={
                'flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full text-[12px] font-medium transition-colors ring-1 ' +
                (isInCompare
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
              }
              data-testid={`card-toggle-compare-${clinic.id}`}
            >
              {isInCompare ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {isInCompare ? 'В сравнение' : 'Сравни'}
            </button>
          </div>
          {clinic.online_consultation && (
            <button
              type="button"
              onClick={onRequestOnline}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full bg-cyan-50 text-cyan-800 ring-1 ring-cyan-100 text-[12px] font-medium hover:bg-cyan-100 transition-colors"
              data-testid={`card-request-online-${clinic.id}`}
            >
              <Video className="w-3.5 h-3.5" />
              Заяви онлайн консултация
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
