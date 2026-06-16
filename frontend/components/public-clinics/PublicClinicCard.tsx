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
 * Public clinic card — premium, calm, decision-oriented.
 *
 * Layout: image on top (with tier badge overlaid bottom-left), content
 * panel below. NO floating-above-card badges (that was the legacy bug —
 * `absolute -top-28` over a non-card surface caused header bleed-through).
 */
export default function PublicClinicCard({
  clinic,
  isInCompare,
  onToggleCompare,
  onRequestContact,
  onRequestOnline,
}: Props) {
  const profileHref = clinicProfileHref(clinic)
  const treatments = clinic.treatments.slice(0, 3)
  const bestFor = clinic.best_for.slice(0, 3)
  const why = clinic.why_this_clinic_appears.slice(0, 3)

  const featureChips: { icon: React.ComponentType<{ className?: string }>; label: string; key: string }[] = []
  if (clinic.online_consultation)
    featureChips.push({ icon: Video, label: 'Онлайн консултация', key: 'online' })
  if (clinic.care_pass_partner)
    featureChips.push({ icon: Heart, label: 'Care Pass', key: 'cp' })
  if (clinic.profile_information_reviewed)
    featureChips.push({ icon: ShieldCheck, label: 'Профил прегледан', key: 'reviewed' })

  const tierBadgeStyle =
    clinic.partner_tier === 'premium'
      ? 'bg-white/95 ring-amber-200 text-amber-800'
      : clinic.partner_tier === 'featured'
      ? 'bg-white/95 ring-teal-200 text-teal-800'
      : 'bg-white/95 ring-slate-200 text-slate-700'

  return (
    <article
      className="group flex flex-col rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.20)] hover:shadow-[0_22px_45px_-22px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
      data-testid={`public-clinic-card-${clinic.id}`}
      data-tier={clinic.partner_tier}
    >
      {/* Image area — fixed proportional height, tier badge overlay */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden">
        {clinic.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clinic.hero_image_url}
            alt={clinic.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            aria-hidden
            className="w-full h-full bg-gradient-to-br from-teal-100 via-cyan-50 to-white grid place-items-center"
          >
            <Sparkles className="w-10 h-10 text-teal-200" />
          </div>
        )}
        {/* Soft bottom gradient so the tier badge always reads */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/35 to-transparent pointer-events-none"
        />
        {/* Tier badge — overlay bottom-left */}
        <span
          className={
            'absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 backdrop-blur-sm shadow-sm ' +
            tierBadgeStyle
          }
          data-testid={`card-tier-${clinic.id}`}
        >
          <Sparkles className="w-3 h-3" />
          {clinic.public_status_label}
        </span>
      </div>

      {/* Content panel */}
      <div className="flex flex-col flex-1 p-5 sm:p-6">
        {/* Feature chips (only when there's data) */}
        {featureChips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mb-3" data-testid={`card-feature-chips-${clinic.id}`}>
            {featureChips.map(({ icon: I, label, key }) => (
              <li
                key={key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50/70 ring-1 ring-teal-100 text-[11px] text-teal-800"
                data-testid={`card-badge-${clinic.id}-${key}`}
              >
                <I className="w-3 h-3" />
                {label}
              </li>
            ))}
          </ul>
        )}

        {/* Name */}
        <h3
          className="font-serif text-[19px] sm:text-[21px] font-semibold text-slate-900 leading-snug line-clamp-2"
          data-testid={`card-name-${clinic.id}`}
        >
          <Link href={profileHref} className="hover:text-teal-700 transition-colors">
            {clinic.name}
          </Link>
        </h3>

        {/* Location */}
        <p className="mt-1.5 text-[12px] text-slate-500 inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {clinic.city_name || clinic.city_slug || '—'}
          {clinic.area && <span className="text-slate-400"> · {clinic.area}</span>}
        </p>

        {/* Audience hints */}
        {(clinic.accepts_adults || clinic.accepts_children) && (
          <div className="mt-1.5 flex gap-2 text-[11px] text-slate-500">
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

        {/* Treatment chips */}
        {treatments.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mt-4">
            {treatments.map((t) => (
              <li
                key={t}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 ring-1 ring-slate-100 text-[12px]"
              >
                {treatmentLabel(t)}
              </li>
            ))}
          </ul>
        )}

        {/* Best suited for */}
        {bestFor.length > 0 && (
          <div className="mt-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
              Подходяща за
            </p>
            <ul className="text-[13px] text-slate-700 leading-relaxed space-y-0.5">
              {bestFor.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-teal-600 mt-1 flex-shrink-0" />
                  <span className="line-clamp-1">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Why this clinic appears */}
        {why.length > 0 && (
          <div
            className="mt-4 rounded-xl bg-teal-50/40 ring-1 ring-teal-100/70 p-3"
            data-testid={`card-why-${clinic.id}`}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-teal-800 mb-1.5">
              Защо виждаш тази клиника
            </p>
            <ul className="text-[12.5px] text-slate-700 leading-relaxed space-y-0.5">
              {why.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-teal-600 mt-1 flex-shrink-0" />
                  <span className="line-clamp-1">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Review — labelled by source, never auto-promoted into JSON-LD */}
        {clinic.review && (
          <div
            className="mt-3 text-[11px] text-slate-500"
            data-testid={`card-review-${clinic.id}`}
          >
            {clinic.review.source === 'google'
              ? `Google рейтинг: ${clinic.review.rating.toFixed(1)} от ${clinic.review.count} отзива`
              : clinic.review.source === 'superdoc'
              ? `Superdoc рейтинг: ${clinic.review.rating.toFixed(1)} от ${clinic.review.count} отзива`
              : `Zubite рейтинг: ${clinic.review.rating.toFixed(1)} от ${clinic.review.count} отзива`}
          </div>
        )}

        {clinic.online_consultation && clinic.online_consultation_label && (
          <p className="mt-2 text-[11px] text-teal-700 inline-flex items-center gap-1">
            <Video className="w-3 h-3" />
            Онлайн консултация: {clinic.online_consultation_label}
          </p>
        )}

        {/* CTA stack — pinned to bottom */}
        <div className="mt-auto pt-5 flex flex-col gap-2">
          <Link
            href={profileHref}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors"
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
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-cyan-50 text-cyan-800 ring-1 ring-cyan-100 text-[12px] font-medium hover:bg-cyan-100 transition-colors"
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
