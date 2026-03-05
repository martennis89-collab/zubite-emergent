import { MetadataRoute } from 'next'
import { CITIES, TREATMENTS } from '@/lib/data'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://zubite.bg'
  
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
  
  return [...staticPages, ...treatmentPages, ...cityTreatmentPages]
}
