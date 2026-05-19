import { MetadataRoute } from 'next'
import { CITIES, TREATMENTS } from '@/lib/data'

interface BlogSitemapEntry {
  slug: string
  updated_at?: string
  published_at?: string
}

async function fetchPublishedBlogPosts(): Promise<BlogSitemapEntry[]> {
  try {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL || ''
    if (!API_URL) return []
    const res = await fetch(`${API_URL}/api/blog/posts?limit=500`, {
      next: { revalidate: 300 }, // refresh every 5 min
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.posts || []) as BlogSitemapEntry[]
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zubite.bg'
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/symptoms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      // Canonical trust-layer page — Zubite Clinic Standard explainer.
      url: `${baseUrl}/standart-za-kliniki`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
  
  // SEO content pages (high value)
  const seoContentPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/aligners-comparison`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/aligners-vs-braces`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/invisalign-price`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/invisalign-bulgaria`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/what-is-invisalign`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    },
    {
      url: `${baseUrl}/implant-price`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/crooked-teeth`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    },
  ]
  
  // Treatment pages (high priority)
  const treatmentPages: MetadataRoute.Sitemap = Object.keys(TREATMENTS).map((treatment) => ({
    url: `${baseUrl}/${treatment}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))
  
  // City-treatment pages
  const cityTreatmentPages: MetadataRoute.Sitemap = []
  for (const city of Object.keys(CITIES)) {
    for (const treatment of Object.keys(TREATMENTS)) {
      cityTreatmentPages.push({
        url: `${baseUrl}/${city}/${treatment}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })
    }
  }
  
  // Blog posts (published only) — pulled from API
  const posts = await fetchPublishedBlogPosts()
  const blogIndex: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
  ]
  const blogPages: MetadataRoute.Sitemap = posts
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at || p.published_at || Date.now()),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))

  return [...staticPages, ...seoContentPages, ...treatmentPages, ...cityTreatmentPages, ...blogIndex, ...blogPages]
}
