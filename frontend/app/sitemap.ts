import { MetadataRoute } from 'next'
import { CITIES, TREATMENTS } from '@/lib/data'

interface BlogSitemapEntry { slug: string; updated_at?: string; published_at?: string }
interface PublicClinicEntry {
  slug?: string | null
  city_slug?: string | null
  treatments?: string[] | null
  treatments_supported?: string[] | null
  is_demo?: boolean
  is_addons_showcase?: boolean
  is_active?: boolean
  clinic_status?: string | null
  status?: string | null
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    // Sitemap generation runs server-side inside the frontend container, so
    // a host-published URL like `REACT_APP_BACKEND_URL=http://localhost:8010`
    // doesn't resolve there — `localhost` inside that container is the
    // container itself, not the host. INTERNAL_API_URL / BACKEND_INTERNAL_URL
    // are the container-network addresses meant for exactly this (same fix
    // already applied in lib/publicClinics.ts's resolveApiUrl); prefer them
    // and fall back to the public vars only if neither is set.
    const API_URL =
      process.env.INTERNAL_API_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.REACT_APP_BACKEND_URL ||
      ''
    if (!API_URL) return null
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

const fetchPublishedBlogPosts = (): Promise<BlogSitemapEntry[]> =>
  fetchJson<{ posts?: BlogSitemapEntry[] }>('/api/blog/posts?limit=500').then(
    (d) => d?.posts || [],
  )

interface CommunityQuestionSitemapEntry {
  slug: string
  published_at?: string | null
  created_at?: string | null
}
interface CommunityTopicSitemapEntry { slug: string }

const fetchPublishedCommunityQuestions = (): Promise<CommunityQuestionSitemapEntry[]> =>
  // /api/community/questions caps `limit` at 500 (raised specifically for
  // this call, mirroring the blog endpoint above) — see backend/routers/community.py.
  fetchJson<{ items?: CommunityQuestionSitemapEntry[] }>(
    '/api/community/questions?limit=500&sort=new',
  ).then((d) => d?.items || [])

const fetchCommunityTopics = (): Promise<CommunityTopicSitemapEntry[]> =>
  fetchJson<{ topics?: CommunityTopicSitemapEntry[] }>('/api/community/topics').then(
    (d) => d?.topics || [],
  )

const fetchPublicClinics = (): Promise<PublicClinicEntry[]> =>
  // Public clinics endpoint caps `limit` at 100; using 500 returns an empty
  // payload (validation rejection) and silently drops every profile from the
  // sitemap. 100 is sufficient until the BG market exceeds that many active
  // partner clinics, at which point we'll paginate.
  fetchJson<{ clinics?: PublicClinicEntry[] }>(
    '/api/public/clinics?limit=100',
  ).then((d) => d?.clinics || [])

// Symptom-detail pages — currently only one `SYMPTOMS_DATA` slug ships. We
// keep the list inline so the sitemap doesn't depend on running the
// `app/symptoms/[symptomSlug]/page.tsx` import graph at build time.
const SYMPTOM_SLUGS = ['bleeding-gums'] as const

// Bulgarian-friendly specialty slugs surfaced on /clinics/[city]/[specialty].
// Mirrors the canonical URL forms our public listing route accepts (see
// `SPECIALTY_URL_MAP` in lib/publicClinics.ts).
const SPECIALTY_URL_SLUGS = [
  'invisalign',
  'aligners',
  'ortodontia',
  'implants',
  'estetichna-stomatologia',
  'detska-stomatologia',
] as const

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zubite.bg'
  const now = new Date()

  // ── Static public pages ───────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl,                              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${baseUrl}/contact`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/symptoms`,                lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/treatments`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${baseUrl}/braces`,                 lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${baseUrl}/care-pass`,               lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/community`,               lastModified: now, changeFrequency: 'daily',   priority: 0.75 },
    { url: `${baseUrl}/for-clinics`,              lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/clinic-standard`,     lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy`,                 lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${baseUrl}/terms`,                   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // ── Symptom detail pages ──────────────────────────────────────
  const symptomDetailPages: MetadataRoute.Sitemap = SYMPTOM_SLUGS.map((s) => ({
    url: `${baseUrl}/symptoms/${s}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }))

  // ── High-value SEO content pages ──────────────────────────────
  const seoContentPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/aligners-comparison`,  priority: 0.95 },
    { url: `${baseUrl}/aligners-vs-braces`,   priority: 0.9 },
    { url: `${baseUrl}/invisalign-price`,     priority: 0.95 },
    { url: `${baseUrl}/invisalign-bulgaria`,  priority: 0.95 },
    { url: `${baseUrl}/what-is-invisalign`,   priority: 0.85 },
    { url: `${baseUrl}/implant-price`,        priority: 0.95 },
    { url: `${baseUrl}/crooked-teeth`,        priority: 0.85 },
  ].map((e) => ({ ...e, lastModified: now, changeFrequency: 'weekly' as const }))

  // ── Treatment hub pages ───────────────────────────────────────
  const treatmentPages: MetadataRoute.Sitemap = Object.keys(TREATMENTS).map(
    (treatment) => ({
      url: `${baseUrl}/${treatment}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }),
  )

  // ── /[city]/[treatment] dynamic landing pages ────────────────
  const cityTreatmentPages: MetadataRoute.Sitemap = []
  for (const city of Object.keys(CITIES)) {
    for (const treatment of Object.keys(TREATMENTS)) {
      cityTreatmentPages.push({
        url: `${baseUrl}/${city}/${treatment}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })
    }
  }

  // ── Public clinic catalog: /clinics, /clinics/[city], /clinics/[city]/[specialty] ──
  const klinikiRoot: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/clinics`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ]
  const klinikiCityPages: MetadataRoute.Sitemap = Object.keys(CITIES).map(
    (city) => ({
      url: `${baseUrl}/clinics/${city}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }),
  )
  const klinikiCitySpecialtyPages: MetadataRoute.Sitemap = []
  for (const city of Object.keys(CITIES)) {
    for (const specialty of SPECIALTY_URL_SLUGS) {
      klinikiCitySpecialtyPages.push({
        url: `${baseUrl}/clinics/${city}/${specialty}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })
    }
  }

  // ── Public clinic profile pages (dynamic, filtered) ──────────
  // Visibility rules — match the `/api/public/clinics` whitelist:
  //   • is_demo !== true (demo/showcase excluded)
  //   • is_addons_showcase !== true
  //   • is_active !== false
  //   • clinic_status / status NOT in {pending, suspended, draft}
  //   • slug + city_slug + ≥1 treatment must exist (otherwise no canonical URL)
  const clinics = await fetchPublicClinics()
  let skippedClinics = 0
  const clinicProfilePages: MetadataRoute.Sitemap = []
  for (const c of clinics) {
    const isHidden =
      c.is_demo === true ||
      c.is_addons_showcase === true ||
      c.is_active === false ||
      ['pending', 'suspended', 'draft'].includes(
        (c.clinic_status || c.status || '').toLowerCase(),
      )
    if (isHidden) { skippedClinics++; continue }

    const slug = c.slug
    const city = c.city_slug
    const treatments = c.treatments || c.treatments_supported || []
    if (!slug || !city || treatments.length === 0) { skippedClinics++; continue }

    // The public profile route requires a specialty path segment. We use the
    // first treatment that maps to an SEO-friendly URL slug; fall back to
    // `klinika` to avoid inventing a slug that isn't a real specialty.
    const firstTreatment = treatments[0]
    const specialtySlug =
      typeof firstTreatment === 'string' && firstTreatment.length > 0
        ? firstTreatment
        : 'klinika'

    clinicProfilePages.push({
      url: `${baseUrl}/clinics/${city}/${specialtySlug}/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })
  }
  // Surface skip count for build-time visibility (Vercel build logs).
  if (process.env.NODE_ENV !== 'production' && skippedClinics > 0) {
    // eslint-disable-next-line no-console
    console.info(`[sitemap] Skipped ${skippedClinics} clinic(s) without a publishable slug/city/specialty.`)
  }

  // ── Blog ──────────────────────────────────────────────────────
  const posts = await fetchPublishedBlogPosts()
  const blogIndex: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.75,
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

  // ── Общност (Q&A) ────────────────────────────────────────────
  const [communityTopics, communityQuestions] = await Promise.all([
    fetchCommunityTopics(),
    fetchPublishedCommunityQuestions(),
  ])
  const communityTopicPages: MetadataRoute.Sitemap = communityTopics
    .filter((t) => t.slug)
    .map((t) => ({
      url: `${baseUrl}/community/${t.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }))
  const communityQuestionPages: MetadataRoute.Sitemap = communityQuestions
    .filter((q) => q.slug)
    .map((q) => ({
      url: `${baseUrl}/community/v/${q.slug}`,
      lastModified: new Date(q.published_at || q.created_at || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }))

  return [
    ...staticPages,
    ...symptomDetailPages,
    ...seoContentPages,
    ...treatmentPages,
    ...cityTreatmentPages,
    ...klinikiRoot,
    ...klinikiCityPages,
    ...klinikiCitySpecialtyPages,
    ...clinicProfilePages,
    ...blogIndex,
    ...blogPages,
    ...communityTopicPages,
    ...communityQuestionPages,
  ]
}
