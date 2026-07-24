import { Metadata } from 'next'
import { ForClinicsLanding } from '@/components/ForClinicsLanding'

export const metadata: Metadata = {
  title: 'За клиники | Партньорска програма | Zubite.bg',
  description: 'Получавайте по-подготвени пациенти, повече релевантна видимост и инструменти за управление на консултации, пациенти и календар чрез Zubite.bg.',
  alternates: {
    canonical: 'https://zubite.bg/for-clinics',
  },
  openGraph: {
    title: 'За клиники | Zubite.bg',
    description: 'Партньорство за по-подготвени пациенти, релевантна видимост, силно онлайн представяне и управление на консултации от едно място.',
    url: 'https://zubite.bg/for-clinics',
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
            url: 'https://zubite.bg/for-clinics',
            provider: { '@type': 'Organization', name: 'Zubite.bg', url: 'https://zubite.bg' },
            areaServed: { '@type': 'Country', name: 'България' },
            audience: {
              '@type': 'BusinessAudience',
              name: 'Дентални клиники и практики в България',
            },
            description:
              'Партньорска програма за дентални клиники в България: профилно представяне, видимост в пациентския път, прозрачни Zubite сигнали за доверие и данни за представянето. Не предлага гарантирано класиране или платено клинично предимство.',
          }),
        }}
      />
      <ForClinicsLanding />
    </>
  )
}
