import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ClinicListingPage from '@/components/public-clinics/ClinicListingPage'
import { cityDisplay, clinicFiltersFromSearchParams, listPublicClinics, type ClinicDirectorySearchParams } from '@/lib/publicClinics'
import {
  buildClinicListingJsonLd, buildClinicBreadcrumbJsonLd, safeJsonLd,
} from '@/lib/seo/clinicJsonLd'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ city: string }>
  searchParams: Promise<ClinicDirectorySearchParams>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params
  const cityName = cityDisplay(city)
  const title = `Дентални клиники в ${cityName} | Zubite.bg`
  return {
    title,
    description: `Сравнете дентални клиники в ${cityName} според специализация, онлайн консултация и Zubite доверителни сигнали.`,
    alternates: { canonical: `https://zubite.bg/kliniki/${city}` },
  }
}

export default async function KlinikiByCity({ params, searchParams }: PageProps) {
  const { city } = await params
  const initialFilters = clinicFiltersFromSearchParams(await searchParams)
  const cityName = cityDisplay(city)
  let clinics: Awaited<ReturnType<typeof listPublicClinics>>['clinics'] = []
  try {
    const data = await listPublicClinics({ city })
    clinics = data.clinics
  } catch {
    /* non-fatal */
  }
  const jsonLd = [
    ...buildClinicListingJsonLd({
      clinics,
      city,
      canonicalPath: `/kliniki/${city}`,
      pageName: `Дентални клиники в ${cityName}`,
    }),
    buildClinicBreadcrumbJsonLd({ city }),
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
        initialFilters={initialFilters}
        syncToUrl={{ basePath: '/kliniki' }}
      />
      <Footer />
    </>
  )
}
