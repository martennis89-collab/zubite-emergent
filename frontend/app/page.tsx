import { Metadata } from 'next'
import { HomeContent, type HomeBlogPost } from '../components/HomeContent'

export const metadata: Metadata = {
  title: 'Zubite.bg | Първо яснота. После избор.',
  description: 'Отговори на няколко кратки въпроса и получи разбираем ориентир за твоя случай — възможни посоки за лечение, ориентировъчни цени и следваща стъпка към подходяща клиника.',
  keywords: 'ортодонтия, брекети, алайнери, зъби, захапка, ортодонт, импланти, естетична стоматология, България',
  alternates: {
    canonical: 'https://zubite.bg/',
  },
  openGraph: {
    title: 'Zubite.bg | Първо яснота. После избор.',
    description: 'Получи разбираем ориентир за твоя случай — възможни посоки за лечение, ориентировъчни цени и следваща стъпка към подходяща клиника.',
    url: 'https://zubite.bg/',
    siteName: 'Zubite.bg',
    locale: 'bg_BG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zubite.bg | Първо яснота. После избор.',
    description: 'Получи разбираем ориентир за твоя случай — възможни посоки за лечение, ориентировъчни цени и следваща стъпка към подходяща клиника.',
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
            description: 'Платформа за ориентация в денталното здраве в България',
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
            description: 'Платформа за информирани решения в денталното здраве',
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
