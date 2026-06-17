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
  return (
    <>
      {/* Service schema — describes the Zubite partner program WITHOUT
          implying paid clinical-ranking advantage. Audience is dental
          practices in Bulgaria; offering is profile presentation,
          patient-journey visibility and performance insights — never
          „top placement" or „best clinic" guarantees. (Feb 2026 P1.) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Zubite.bg — Партньорска програма за дентални клиники',
            serviceType: 'Dental clinic partner program',
            url: 'https://zubite.bg/za-kliniki',
            provider: { '@type': 'Organization', name: 'Zubite.bg', url: 'https://zubite.bg' },
            areaServed: { '@type': 'Country', name: 'България' },
            audience: {
              '@type': 'BusinessAudience',
              name: 'Дентални клиники и практики в България',
            },
            description:
              'Партньорска програма за дентални клиники в България: профилно представяне, видимост в пациентския път, прозрачни Zubite сигнали за доверие и performance insights. Не предлага гарантирано класиране или платена клинична превъзходство.',
          }),
        }}
      />
      <ForClinicsContent />
    </>
  )
}
