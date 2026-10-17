/**
 * Public clinic profile at `/clinics/[city]/[clinicSlug]`.
 *
 * Rendered by `app/clinics/[city]/[specialty]/page.tsx`: that segment is a
 * specialty listing when it's a known specialty slug, otherwise a clinic
 * slug. The old `/clinics/[city]/[specialty]/[clinicSlug]` URLs redirect here.
 */
import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ClinicProfileView from '@/components/public-clinics/ClinicProfileView'
import { cityDisplay, clinicProfileHref, type PublicClinic } from '@/lib/publicClinics'
import {
  buildClinicProfileJsonLd, buildClinicBreadcrumbJsonLd, safeJsonLd,
} from '@/lib/seo/clinicJsonLd'

export function clinicProfileMetadata(clinic: PublicClinic, city: string): Metadata {
  const cityName = cityDisplay(city) || clinic.city_name || ''
  return {
    title: `${clinic.name}${cityName ? ` · ${cityName}` : ''} | Zubite.bg`,
    description:
      clinic.short_description ||
      clinic.patient_intro ||
      `Профил на дентална клиника в Zubite.bg${cityName ? ` (${cityName})` : ''}. Информацията е прегледана от Zubite.`,
    alternates: {
      canonical: `https://zubite.bg${clinicProfileHref(clinic)}`,
    },
    // Phase C1 — demo/showcase clinic profiles must never be indexed.
    // Real clinics still inherit the global robots config (indexable).
    ...(clinic.is_demo
      ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }
      : {}),
  }
}

export function ClinicProfileRoute({ clinic, city }: { clinic: PublicClinic; city: string }) {
  const jsonLd = [
    buildClinicProfileJsonLd(clinic),
    buildClinicBreadcrumbJsonLd({ city, clinic }),
  ]
  return (
    <>
      {jsonLd.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(node) }}
        />
      ))}
      <Header />
      <ClinicProfileView clinic={clinic} />
      <Footer />
    </>
  )
}
