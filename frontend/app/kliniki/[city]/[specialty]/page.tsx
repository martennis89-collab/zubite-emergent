import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ClinicListingPage from '@/components/public-clinics/ClinicListingPage'
import {
  cityDisplay, resolveSpecialtySlug, specialtyCityHeading, specialtyCityMetaTitle,
} from '@/lib/publicClinics'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ city: string; specialty: string }>
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
      canonical: `https://zubite.bg/kliniki/${city}/${specialty}`,
    },
  }
}

export default async function KlinikiByCitySpecialty({ params }: PageProps) {
  const { city, specialty } = await params
  // Normalise the URL specialty slug to a backend treatment key. Unknown
  // slugs simply pass through and yield an empty result set, which the
  // listing page already handles with a friendly empty state.
  const canonicalSpecialty = resolveSpecialtySlug(specialty) || specialty
  const cityName = cityDisplay(city)
  const heading = specialtyCityHeading(specialty, cityName)

  return (
    <>
      <Header />
      <ClinicListingPage
        initialCity={city}
        initialSpecialty={canonicalSpecialty}
        headingOverride={heading}
        syncToUrl={{ basePath: '/kliniki' }}
      />
      <Footer />
    </>
  )
}
