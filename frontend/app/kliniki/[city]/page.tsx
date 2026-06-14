import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ClinicListingPage from '@/components/public-clinics/ClinicListingPage'
import { cityDisplay } from '@/lib/publicClinics'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ city: string }>
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

export default async function KlinikiByCity({ params }: PageProps) {
  const { city } = await params
  return (
    <>
      <Header />
      <ClinicListingPage
        initialCity={city}
        syncToUrl={{ basePath: '/kliniki' }}
      />
      <Footer />
    </>
  )
}
