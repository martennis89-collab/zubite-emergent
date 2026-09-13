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
  alternates: { canonical: 'https://zubite.bg/clinics' },
}

export default async function KlinikiRoot({ searchParams }: { searchParams: Promise<ClinicDirectorySearchParams> }) {
  const params = await searchParams
  const initialFilters = clinicFiltersFromSearchParams(params)
  const rawLeadId = Array.isArray(params.leadId) ? params.leadId[0] : params.leadId
  const leadId =
    typeof rawLeadId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawLeadId)
      ? rawLeadId
      : undefined
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
      canonicalPath: '/clinics',
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
      <ClinicListingPage
        initialFilters={initialFilters}
        leadId={leadId}
        syncToUrl={{
          basePath: '/clinics',
          preserve: leadId ? { leadId } : undefined,
          keepCityInQuery: Boolean(leadId),
        }}
      />
      <Footer />
    </>
  )
}
