import { Metadata } from 'next'
import { ForClinicsContent } from '@/components/ForClinicsContent'

export const metadata: Metadata = {
  title: 'За клиники | Партньорска програма | Zubite.bg',
  description: 'Получавайте подготвени пациенти, които вече разбират от какво имат нужда. Кандидатствайте за партньорство с Zubite.bg.',
  alternates: {
    canonical: 'https://zubite.bg/za-kliniki',
  },
  openGraph: {
    title: 'За клиники | Zubite.bg',
    description: 'Zubite.bg не изпраща случайни запитвания. Пациентите преминават през оценка и образование преди да бъдат свързани с вас.',
    url: 'https://zubite.bg/za-kliniki',
    siteName: 'Zubite.bg',
    locale: 'bg_BG',
    type: 'website',
  },
}

export default function ForClinicsPage() {
  return <ForClinicsContent />
}
