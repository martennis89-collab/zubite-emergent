import Link from 'next/link'
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  MapPin,
  MonitorSmartphone,
  UsersRound,
} from 'lucide-react'
import type { SpotlightClinic } from '@/lib/community'
import { treatmentLabel } from '@/lib/publicClinics'

function formatRotationDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00+03:00`)
  if (Number.isNaN(parsed.getTime())) return 'Днес'

  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Sofia',
  }).format(parsed)
}

// Server component — the API supplies a deterministic Sofia-calendar-day
// rotation. No client timer or random choice means every visitor sees the
// same clinic for the day and the card changes cleanly at the next request.
export function ClinicSpotlight({ clinic }: { clinic: SpotlightClinic | null }) {
  if (!clinic || !clinic.slug || !clinic.city_slug) return null

  const blurb = clinic.patient_intro || clinic.short_description
  const location = [clinic.city_name, clinic.area].filter(Boolean).join(' · ')
  const focus = (clinic.treatment_focus || [])
    .filter(Boolean)
    .slice(0, 3)
    .map(treatmentLabel)
  const patientGroups =
    clinic.accepts_adults && clinic.accepts_children
      ? 'За възрастни и деца'
      : clinic.accepts_children
        ? 'Приема деца'
        : clinic.accepts_adults
          ? 'Приема възрастни'
          : null

  const facts = [
    clinic.years_in_business
      ? {
          icon: CalendarDays,
          label: `${clinic.years_in_business} г. практика`,
        }
      : null,
    clinic.online_consultation
      ? {
          icon: MonitorSmartphone,
          label: 'Онлайн консултация',
        }
      : null,
    patientGroups
      ? {
          icon: UsersRound,
          label: patientGroups,
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: typeof CalendarDays
    label: string
  }>

  return (
    <article
      id="clinic-of-day"
      className="taste-community-spotlight"
      aria-labelledby="clinic-of-the-day-name"
    >
      <div className="taste-community-spotlight-heading">
        <span className="taste-community-spotlight-label">Клиника на деня</span>
        <span className="taste-community-spotlight-date">
          {formatRotationDate(clinic.rotation_date)}
        </span>
      </div>

      {clinic.hero_image_url ? (
        <img
          src={clinic.hero_image_url}
          alt={`Интериор или екип на ${clinic.name || 'клиниката'}`}
          loading="lazy"
          decoding="async"
          className="taste-community-spotlight-image"
        />
      ) : (
        <div className="taste-community-spotlight-image taste-community-spotlight-image-placeholder">
          <BadgeCheck className="h-9 w-9" aria-hidden="true" />
          <span>Профил в Zubite</span>
        </div>
      )}

      <div className="taste-community-spotlight-body">
        <div className="taste-community-spotlight-title-row">
          <h3 id="clinic-of-the-day-name">{clinic.name}</h3>
          {clinic.profile_information_reviewed && (
            <BadgeCheck
              className="h-5 w-5 shrink-0 text-[#007956]"
              aria-label="Информацията в профила е прегледана"
            />
          )}
        </div>

        {location && (
          <p className="taste-community-spotlight-location">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {location}
          </p>
        )}

        {blurb && <p className="taste-community-spotlight-blurb">{blurb}</p>}

        {focus.length > 0 && (
          <div className="taste-community-spotlight-focus" aria-label="Основни направления">
            {focus.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}

        {facts.length > 0 && (
          <ul className="taste-community-spotlight-facts">
            {facts.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        )}

        <Link
          href={`/clinics/${clinic.city_slug}/${clinic.specialty_slug}/${clinic.slug}`}
          className="taste-button taste-button-light taste-community-spotlight-cta"
        >
          Разгледай целия профил
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        <p className="taste-community-spotlight-note">
          Профилът се сменя всеки ден. Това не е класация или медицинска
          препоръка.
        </p>
      </div>
    </article>
  )
}
