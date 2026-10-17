import { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ClinicListingPage from '@/components/public-clinics/ClinicListingPage'
import {
  cityDisplay, resolveSpecialtySlug, specialtyCityHeading, specialtyCityMetaTitle,
  clinicFiltersFromSearchParams, listPublicClinics, type ClinicDirectorySearchParams,
  getPublicClinic, clinicProfileHref, type PublicClinic,
} from '@/lib/publicClinics'
import { ClinicProfileRoute, clinicProfileMetadata } from '@/components/public-clinics/ClinicProfileRoute'
import {
  buildClinicListingJsonLd, buildClinicBreadcrumbJsonLd, safeJsonLd,
} from '@/lib/seo/clinicJsonLd'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ city: string; specialty: string }>
  searchParams: Promise<ClinicDirectorySearchParams>
}

/**
 * `/clinics/[city]/[x]` serves two kinds of page:
 *   • a known specialty slug (e.g. `orthodontics`) → the city + specialty listing
 *   • anything else → the clinic whose slug (or id) is `x`, i.e. the clinic
 *     profile at `/clinics/sofia/name-of-clinic`
 * An unknown segment that isn't a clinic keeps the old listing fallback.
 * A specialty slug always wins, so a clinic can never shadow a listing.
 */
async function clinicForSegment(segment: string): Promise<PublicClinic | null> {
  if (resolveSpecialtySlug(segment)) return null
  try {
    return await getPublicClinic(segment)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, specialty } = await params
  const clinic = await clinicForSegment(specialty)
  if (clinic) return clinicProfileMetadata(clinic, city)
  const cityName = cityDisplay(city)
  const title = specialtyCityMetaTitle(specialty, cityName)
  const heading = specialtyCityHeading(specialty, cityName)
  return {
    title,
    description: `${heading} — сравнете клиники според лечение, локация, онлайн консултация, профилна информация и Zubite доверителни сигнали.`,
    alternates: {
      canonical: `https://zubite.bg/clinics/${city}/${specialty}`,
    },
  }
}

export default async function KlinikiByCitySpecialty({ params, searchParams }: PageProps) {
  const { city, specialty } = await params
  const clinic = await clinicForSegment(specialty)
  if (clinic) {
    // One canonical address per clinic: fix the city or an id-based URL.
    const canonical = clinicProfileHref(clinic)
    if (canonical !== `/clinics/${city}/${specialty}`) permanentRedirect(canonical)
    return <ClinicProfileRoute clinic={clinic} city={city} />
  }
  const initialFilters = clinicFiltersFromSearchParams(await searchParams)
  const canonicalSpecialty = resolveSpecialtySlug(specialty) || specialty
  const cityName = cityDisplay(city)
  const heading = specialtyCityHeading(specialty, cityName)
  let clinics: Awaited<ReturnType<typeof listPublicClinics>>['clinics'] = []
  try {
    const data = await listPublicClinics({
      city,
      specialty: canonicalSpecialty,
    })
    clinics = data.clinics
  } catch {
    /* non-fatal */
  }
  const jsonLd = [
    ...buildClinicListingJsonLd({
      clinics,
      city,
      specialty,
      canonicalPath: `/clinics/${city}/${specialty}`,
      pageName: heading,
    }),
    buildClinicBreadcrumbJsonLd({ city, specialty }),
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
      <ClinicListingPage
        initialCity={city}
        initialSpecialty={canonicalSpecialty}
        initialFilters={initialFilters}
        headingOverride={heading}
        syncToUrl={{ basePath: '/clinics' }}
      />
      <Footer />
    </>
  )
}
