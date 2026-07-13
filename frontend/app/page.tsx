import { Metadata } from 'next'
import { HomeContent, type HomeBlogPost } from '../components/HomeContent'

export const metadata: Metadata = {
  title: 'Zubite.bg — На кой етап е захапката ти? Провери за 60 секунди',
  description:
    'Кривите зъби и неправилната захапка рядко болят. Разбери дали си в ранен, развиващ се или напреднал етап — кратък въпросник, без диагноза. Ориентир преди избора.',
  keywords:
    'захапка, криви зъби, струпани зъби, ортодонтия, алайнери, брекети, етап на захапката, ориентир зъби, дентална ориентация, България',
  alternates: {
    canonical: 'https://zubite.bg/',
  },
  openGraph: {
    title: 'На кой етап е захапката ти? Провери за 60 секунди | Zubite.bg',
    description:
      'Кривите зъби и неправилната захапка рядко болят. Разбери дали си в ранен, развиващ се или напреднал етап — кратък въпросник, без диагноза.',
    url: 'https://zubite.bg/',
    siteName: 'Zubite.bg',
    locale: 'bg_BG',
    type: 'website',
    images: [
      {
        url: 'https://zubite.bg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Zubite.bg — ориентир за етапа на захапката',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'На кой етап е захапката ти? Провери за 60 секунди | Zubite.bg',
    description:
      'Кривите зъби и неправилната захапка рядко болят. Разбери дали си в ранен, развиващ се или напреднал етап — кратък въпросник, без диагноза.',
    images: ['https://zubite.bg/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

// Fetch recent blog posts for SSR
async function getRecentPosts(): Promise<HomeBlogPost[]> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL || ''
    if (!API_URL) return []

    const response = await fetch(`${API_URL}/api/blog/posts?limit=3`, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.posts || []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const recentPosts = await getRecentPosts()

  return (
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-clip" data-testid="home-main">
      <HomeContent recentPosts={recentPosts} />

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Zubite.bg',
            description:
              'Zubite.bg ти помага да се ориентираш дали има сигнал за дентален проблем, какви решения съществуват и каква следваща стъпка има смисъл за твоя случай.',
            url: 'https://zubite.bg',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://zubite.bg/search?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Zubite.bg',
            url: 'https://zubite.bg',
            logo: 'https://zubite.bg/og-image.png',
            description:
              'Zubite.bg помага на хората да се ориентират дали има сигнал за дентален проблем, какви решения съществуват и към какъв тип специалист има смисъл да се насочат.',
            areaServed: {
              '@type': 'Country',
              name: 'България',
            },
            knowsAbout: [
              'Ортодонтия',
              'Алайнери',
              'Брекети',
              'Дентални импланти',
              'Естетична стоматология',
              'Орална хигиена',
              'Дентални симптоми',
              'Захапка',
            ],
          }),
        }}
      />
      {/* Service schema — Zubite is NOT a clinical provider. We describe the
          platform as a *dental orientation and clinic-matching* Service so
          Google/AI surfaces understand the offering without inferring that
          Zubite diagnoses patients or operates a clinic. Feb 2026 P1. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Zubite.bg — Дентална ориентация и насочване към партньорска клиника',
            serviceType: 'Dental orientation and clinic-matching platform',
            provider: {
              '@type': 'Organization',
              name: 'Zubite.bg',
              url: 'https://zubite.bg',
            },
            areaServed: { '@type': 'Country', name: 'България' },
            audience: { '@type': 'PeopleAudience', name: 'Пациенти със зъбни въпроси и сигнали' },
            description:
              'Платформа за дентална ориентация. Помага на пациента да разбере какъв може да е проблемът, какви са възможните следващи стъпки и към какъв тип консултация или клиника да се насочи. Не поставя диагноза и не замества преглед при стоматолог.',
            url: 'https://zubite.bg/',
          }),
        }}
      />
      {/* FAQPage schema — mirrors the on-page FAQ accordion Q/A verbatim
          (keep in sync with the FAQ() component in HomeContent.tsx).
          Intentionally NOT MedicalWebPage — the platform does not diagnose. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              { q: 'На кой етап съм — как разбирам?', a: 'Не поставяме диагноза. Кратък въпросник ти показва дали описаните признаци приличат на ранен, развиващ се или напреднал етап, и дали има смисъл да го обсъдиш с ортодонт. Точната преценка се прави след преглед.' },
              { q: 'Zubite.bg клиника ли е?', a: 'Не. Zubite.bg е независима платформа за ориентация и насочване. Помагаме ти да разбереш какъв тип проблем описваш, какви следващи стъпки може да имат смисъл и към какъв тип клиника да се насочиш.' },
              { q: 'Платформата ли поставя диагноза?', a: 'Не. Въпросникът дава ориентировъчна информация според твоите отговори. Диагноза, план за лечение и точна цена могат да бъдат потвърдени само след преглед от стоматолог или ортодонт.' },
              { q: 'Колко струва използването?', a: 'Попълването на въпросника е безплатно. Ако решиш да продължиш към клиника, ще видиш каква е следващата стъпка и дали има цена за консултация според конкретната клиника.' },
              { q: 'Как избирате клиники?', a: 'Гледаме категория лечение, град, описан случай, налични услуги и релевантност. Целта е да не получиш случаен списък, а по-подходяща посока според това, което си описал.' },
              { q: 'Какво се случва с моите данни?', a: 'Използваме данните ти, за да подготвим обобщение и, ако поискаш, да те насочим към клиника. Не изпращаме данни към клиника без твое действие за продължаване.' },
              { q: 'Как получавам Zubite Care Pass?', a: 'След като заявиш насочване чрез Zubite.bg и посетиш консултация в партньорска клиника, клиниката ще ти предостави Zubite Care Pass.' },
              { q: 'Какво включва Care Pass?', a: 'Care Pass съдържа отстъпки за партньорски продукти за орална хигиена — например продукти за ежедневна грижа за зъбите и венците. Той не е отстъпка от лечение и не заменя препоръка от стоматолог.' },
            ].map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </main>
  )
}
