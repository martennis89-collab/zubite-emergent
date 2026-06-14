import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ClinicListingPage from '@/components/public-clinics/ClinicListingPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Дентални клиники в България | Zubite.bg',
  description:
    'Сравнете дентални клиники според локация, специализация и онлайн консултация. Профилна информация, прегледана от Zubite. Без фалшиви класации.',
  alternates: { canonical: 'https://zubite.bg/kliniki' },
}

export default function KlinikiRoot() {
  return (
    <>
      <Header />
      <ClinicListingPage syncToUrl={{ basePath: '/kliniki' }} />
      <Footer />
    </>
  )
}
