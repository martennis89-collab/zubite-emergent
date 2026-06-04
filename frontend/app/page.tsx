import { Metadata } from 'next'
import { HomeContent, type HomeBlogPost } from '../components/HomeContent'

export const metadata: Metadata = {
  title: 'Zubite.bg – Провери дали може да имаш дентален проблем',
  description:
    'Вместо да разчиташ на случайни мнения в социалните мрежи, Zubite.bg ти помага да се ориентираш дали има сигнал за дентален проблем, какви решения съществуват и каква следваща стъпка има смисъл за твоя случай.',
  keywords:
    'дентален проблем, дентален сигнал, симптоми зъби, ориентация дентално здраве, следваща стъпка зъби, тип специалист, ортодонтия, импланти, естетична стоматология, България',
  alternates: {
    canonical: 'https://zubite.bg/',
  },
  openGraph: {
    title: 'Спри да питаш случайни хора в социалните мрежи за дентални съвети.',
    description:
      'Zubite.bg ти помага да се ориентираш дали има сигнал за дентален проблем, какви решения съществуват и към какъв специалист има смисъл да се насочиш.',
    url: 'https://zubite.bg/',
    siteName: 'Zubite.bg',
    locale: 'bg_BG',
    type: 'website',
    images: [
      {
        url: 'https://zubite.bg/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Zubite.bg — ориентация в денталното здраве',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Спри да питаш случайни хора в социалните мрежи за дентални съвети.',
    description:
      'Zubite.bg ти помага да се ориентираш дали има сигнал за дентален проблем, какви решения съществуват и към какъв специалист има смисъл да се насочиш.',
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
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden" data-testid="home-main">
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
            description:
              'Zubite.bg помага на хората да се ориентират дали има сигнал за дентален проблем, какви решения съществуват и към какъв тип специалист има смисъл да се насочат.',
            areaServed: {
              '@type': 'Country',
              name: 'България',
            },
          }),
        }}
      />
    </main>
  )
}
