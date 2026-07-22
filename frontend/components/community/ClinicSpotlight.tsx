import Link from 'next/link'
import type { SpotlightClinic } from '@/lib/community'

// Server component — no interactivity beyond a link, no client island
// needed. Renders nothing at all when there's no eligible clinic (empty
// rotation pool) rather than an empty/broken-looking box.
export function ClinicSpotlight({ clinic }: { clinic: SpotlightClinic | null }) {
  if (!clinic || !clinic.slug || !clinic.city_slug) return null
  const blurb = clinic.patient_intro || clinic.short_description

  return (
    <div className="taste-community-spotlight">
      <span className="taste-community-spotlight-label">
        Профил от каталога
      </span>
      {clinic.hero_image_url && (
        <img
          src={clinic.hero_image_url}
          alt={clinic.name || ''}
          loading="lazy"
          decoding="async"
          className="mt-3 aspect-[16/9] w-full rounded-lg object-cover"
        />
      )}
      <h3 className="mt-3 text-base font-bold text-[#0a0a0a]">{clinic.name}</h3>
      {clinic.city_name && <p className="mt-0.5 text-sm text-[#525252]">{clinic.city_name}</p>}
      {blurb && <p className="mt-2 line-clamp-3 text-sm text-[#525252]">{blurb}</p>}
      <Link
        href={`/clinics/${clinic.city_slug}/${clinic.specialty_slug}/${clinic.slug}`}
        className="taste-button taste-button-light mt-4 w-full border border-[#e5e5e5]"
      >
        Разгледай профила
      </Link>
      <p className="mt-3 text-xs text-[#6b6b6b]">
        Показваме различен проверен профил всеки ден. Това не е класация или медицинска препоръка.
      </p>
    </div>
  )
}
