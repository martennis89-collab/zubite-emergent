import { Metadata } from 'next'
import {
  AnimatedHero,
  AnimatedInterruptSection,
  AnimatedSelfRecognitionSection,
  AnimatedProgressionSection,
  AnimatedCostReframeSection,
  AnimatedAuthoritySection,
  AnimatedSeoSection,
  AnimatedRecentArticles,
  AnimatedFinalCTA,
  AnimatedFooter,
  AnimatedStickyCTA,
  AnimatedHeader,
} from '../components/AnimatedHomeSections'

export const metadata: Metadata = {
  title: 'Zubite.bg | Провери на кой етап си — преди да стане по-сложно',
  description: 'Повечето хора вече имат ранни признаци на проблеми със зъбите — но ги осъзнават чак когато лечението стане по-сложно. Провери къде се намираш за 60 секунди.',
  keywords: 'ортодонтия, брекети, алайнери, зъби, захапка, ортодонт, България',
  alternates: {
    canonical: 'https://zubite.bg/',
  },
  openGraph: {
    title: 'Zubite.bg | Провери на кой етап си',
    description: 'Повечето хора чакат, докато стане скъпо. Ти на кой етап си?',
    url: 'https://zubite.bg/',
    siteName: 'Zubite.bg',
    locale: 'bg_BG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zubite.bg | Провери на кой етап си',
    description: 'Повечето хора чакат, докато стане скъпо. Ти на кой етап си?',
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

// Blog post interface
interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  featured_image: string | null
  published_at: string
}

// Fetch recent blog posts for SSR
async function getRecentPosts(): Promise<BlogPost[]> {
  try {
    // Use the public API URL for server-side rendering
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL || ''
    
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
  // Fetch recent blog posts server-side for SEO
  const recentPosts = await getRecentPosts()
  
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Sticky CTA - Mobile */}
      <AnimatedStickyCTA />

      {/* Navigation */}
      <AnimatedHeader />

      {/* SECTION 1 — HERO */}
      <AnimatedHero />

      {/* SECTION 2 — INTERRUPT */}
      <AnimatedInterruptSection />

      {/* SECTION 3 — SELF RECOGNITION (Blue Background) */}
      <AnimatedSelfRecognitionSection />

      {/* SECTION 4 — PROGRESSION */}
      <AnimatedProgressionSection />

      {/* SECTION 5 — COST REFRAME */}
      <AnimatedCostReframeSection />

      {/* SECTION 6 — AUTHORITY / SEO */}
      <AnimatedAuthoritySection />

      {/* SECTION 7 — SEO BLOCK */}
      <AnimatedSeoSection />

      {/* SECTION 7.5 — RECENT ARTICLES (SEO) */}
      <AnimatedRecentArticles posts={recentPosts} />

      {/* SECTION 8 — FINAL CTA (Blue Background) */}
      <AnimatedFinalCTA />

      {/* Footer */}
      <AnimatedFooter />

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Zubite.bg",
            "description": "Платформа за ориентация в ортодонтското лечение в България",
            "url": "https://zubite.bg",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://zubite.bg/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Zubite.bg",
            "url": "https://zubite.bg",
            "description": "Платформа за информирани решения в ортодонтията",
            "areaServed": {
              "@type": "Country",
              "name": "България"
            }
          })
        }}
      />
    </main>
  )
}
