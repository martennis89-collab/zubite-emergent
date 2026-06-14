import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ClinicProfileView from '@/components/public-clinics/ClinicProfileView'
import { getPublicClinic, cityDisplay } from '@/lib/publicClinics'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ city: string; specialty: string; clinicSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, clinicSlug } = await params
  try {
    const c = await getPublicClinic(clinicSlug)
    const cityName = cityDisplay(city) || c.city_name || ''
    return {
      title: `${c.name}${cityName ? ` · ${cityName}` : ''} | Zubite.bg`,
      description:
        c.short_description ||
        c.patient_intro ||
        `Профил на дентална клиника в Zubite.bg${cityName ? ` (${cityName})` : ''}. Информацията е прегледана от Zubite.`,
      alternates: {
        canonical: `https://zubite.bg/kliniki/${city}/${(await params).specialty}/${clinicSlug}`,
      },
    }
  } catch {
    return { title: 'Клиника | Zubite.bg' }
  }
}

export default async function KlinikiProfilePage({ params }: PageProps) {
  const { clinicSlug } = await params
  try {
    const clinic = await getPublicClinic(clinicSlug)
    return (
      <>
        <Header />
        <ClinicProfileView clinic={clinic} />
        <Footer />
      </>
    )
  } catch (e) {
    notFound()
  }
}
