import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ClinicListingPage from '@/components/public-clinics/ClinicListingPage'
import {
  cityDisplay, resolveSpecialtySlug, specialtyCityHeading, specialtyCityMetaTitle,
  clinicFiltersFromSearchParams, listPublicClinics, type ClinicDirectorySearchParams,
} from '@/lib/publicClinics'
import {
  buildClinicListingJsonLd, buildClinicBreadcrumbJsonLd, safeJsonLd,
} from '@/lib/seo/clinicJsonLd'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ city: string; specialty: string }>
  searchParams: Promise<ClinicDirectorySearchParams>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, specialty } = await params
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
