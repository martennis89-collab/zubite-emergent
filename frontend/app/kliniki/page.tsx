import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ClinicListingPage from '@/components/public-clinics/ClinicListingPage'
import {
  buildClinicListingJsonLd, buildClinicBreadcrumbJsonLd, safeJsonLd,
} from '@/lib/seo/clinicJsonLd'
import { clinicFiltersFromSearchParams, listPublicClinics, type ClinicDirectorySearchParams } from '@/lib/publicClinics'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Дентални клиники в България | Zubite.bg',
  description:
    'Сравнете дентални клиники според локация, специализация и онлайн консултация. Профилна информация, прегледана от Zubite. Без фалшиви класации.',
  alternates: { canonical: 'https://zubite.bg/kliniki' },
}

export default async function KlinikiRoot({ searchParams }: { searchParams: Promise<ClinicDirectorySearchParams> }) {
  const initialFilters = clinicFiltersFromSearchParams(await searchParams)
  // Server-side fetch for ItemList enrichment. Failure is non-fatal —
  // the page still renders without an enriched ItemList in that case.
  let clinics: Awaited<ReturnType<typeof listPublicClinics>>['clinics'] = []
  try {
    const data = await listPublicClinics({})
    clinics = data.clinics
  } catch {
    /* swallow — JSON-LD is a nice-to-have, not a hard requirement */
  }
  const jsonLd = [
    ...buildClinicListingJsonLd({
      clinics,
      canonicalPath: '/kliniki',
      pageName: 'Дентални клиники в България',
    }),
    buildClinicBreadcrumbJsonLd({}),
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
      <ClinicListingPage initialFilters={initialFilters} syncToUrl={{ basePath: '/kliniki' }} />
      <Footer />
    </>
  )
}
