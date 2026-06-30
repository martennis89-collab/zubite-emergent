/**
 * Zubite.bg lead attribution & source tracking helper.
 *
 * Responsibilities:
 *   - Capture UTMs, click IDs, referrer, page type on every page load.
 *   - Maintain first-touch (immutable) and latest-touch (mutable) attribution.
 *   - Track the content path (latest 20 page views) before conversion.
 *   - Provide `attachAttributionToLead()` for any lead submission flow.
 *
 * Non-blocking: every operation is wrapped in try/catch and silently fails so
 * lead submission must NEVER break because of attribution code.
 */

const FIRST_TOUCH_KEY = 'zubite_attr_first_touch'
const LATEST_TOUCH_KEY = 'zubite_attr_latest_touch'
const CONTENT_PATH_KEY = 'zubite_attr_content_path'
const FIRST_SEEN_KEY = 'zubite_attr_first_seen'
const MAX_PATH_ENTRIES = 20

const UTM_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign',
  'utm_adset', 'utm_ad', 'utm_campaign_id', 'utm_adset_id', 'utm_ad_id',
  'utm_content', 'utm_term',
] as const

const CLICK_ID_KEYS = ['fbclid', 'gclid', 'msclkid', 'ttclid'] as const

export type LeadSourceType =
  | 'paid'
  | 'organic_search'
  | 'organic_social'
  | 'referral'
  | 'direct'
  | 'blog'
  | 'internal_content'
  | 'unknown'

export type PageType =
  | 'homepage'
  | 'quiz'
  | 'blog'
  | 'article'
  | 'treatment_page'
  | 'comparison_page'
  | 'city_page'
  | 'clinic_page'
  | 'contact_page'
  | 'other'

export interface AttributionTouch {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_adset?: string | null
  utm_ad?: string | null
  utm_campaign_id?: string | null
  utm_adset_id?: string | null
  utm_ad_id?: string | null
  utm_content?: string | null
  utm_term?: string | null
  fbclid?: string | null
  gclid?: string | null
  msclkid?: string | null
  ttclid?: string | null
  landing_page?: string | null
  landing_page_type?: PageType | null
  referrer?: string | null
  lead_source_type?: LeadSourceType | null
  article_slug?: string | null
  article_title?: string | null
  seen_at?: string | null
}

export interface ContentPathEntry {
  path: string
  page_type: PageType
  article_slug?: string | null
  article_title?: string | null
  timestamp: string
}

export interface AttributionPayload {
  // First-touch (immutable once set)
  first_utm_source?: string | null
  first_utm_medium?: string | null
  first_utm_campaign?: string | null
  first_utm_adset?: string | null
  first_utm_ad?: string | null
  first_utm_campaign_id?: string | null
  first_utm_adset_id?: string | null
  first_utm_ad_id?: string | null
  first_utm_content?: string | null
  first_utm_term?: string | null
  first_fbclid?: string | null
  first_gclid?: string | null
  first_msclkid?: string | null
  first_ttclid?: string | null
  first_landing_page?: string | null
  first_landing_page_type?: PageType | null
  first_referrer?: string | null
  first_lead_source_type?: LeadSourceType | null
  first_article_slug?: string | null
  first_article_title?: string | null
  first_seen_at?: string | null

  // Latest-touch (updated when new attribution data appears)
  latest_utm_source?: string | null
  latest_utm_medium?: string | null
  latest_utm_campaign?: string | null
  latest_utm_adset?: string | null
  latest_utm_ad?: string | null
  latest_utm_campaign_id?: string | null
  latest_utm_adset_id?: string | null
  latest_utm_ad_id?: string | null
  latest_utm_content?: string | null
  latest_utm_term?: string | null
  latest_fbclid?: string | null
  latest_gclid?: string | null
  latest_msclkid?: string | null
  latest_ttclid?: string | null
  latest_landing_page?: string | null
  latest_landing_page_type?: PageType | null
  latest_referrer?: string | null
  latest_lead_source_type?: LeadSourceType | null
  latest_article_slug?: string | null
  latest_article_title?: string | null
  last_seen_at?: string | null

  // Aliases for compatibility with the spec
  original_lead_source_type?: LeadSourceType | null

  // Conversion data
  content_path_before_conversion?: ContentPathEntry[] | null
  pages_viewed_before_conversion?: number | null
  blog_assisted_conversion?: boolean | null
  internal_content_assisted_conversion?: boolean | null
  conversion_page?: string | null
  submitted_at?: string | null
  time_to_submit_seconds?: number | null
}

// ─── Storage helpers ─────────────────────────────────────────────

function safeGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage?.getItem(key) ?? window.sessionStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return
    try { window.localStorage?.setItem(key, value) } catch { /* ignore */ }
    try { window.sessionStorage?.setItem(key, value) } catch { /* ignore */ }
  } catch {
    // ignore
  }
}

function getJson<T>(key: string): T | null {
  const raw = safeGet(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

function setJson<T>(key: string, value: T): void {
  try { safeSet(key, JSON.stringify(value)) } catch { /* ignore */ }
}

// ─── Detectors ──────────────────────────────────────────────────

const SEARCH_ENGINES = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'yandex.', 'baidu.', 'ecosia.']
const SOCIAL_PLATFORMS = ['facebook.com', 'instagram.com', 'tiktok.com', 'linkedin.com', 'youtube.com', 't.co', 'twitter.com', 'x.com']

function isSearchEngine(host: string): boolean {
  const h = host.toLowerCase()
  return SEARCH_ENGINES.some((s) => h.includes(s))
}

function isSocial(host: string): boolean {
  const h = host.toLowerCase()
  return SOCIAL_PLATFORMS.some((s) => h.includes(s))
}

function refHost(referrer: string): string {
  try { return new URL(referrer).hostname } catch { return '' }
}

const BLOG_PATHS = ['/blog/', '/statii/', '/articles/']
const CONTENT_PATHS = [
  '/oralna-higiena', '/breketi', '/alaineri', '/invisalign',
  '/implantologia', '/estetichna-stomatologia', '/parodontologia',
  '/aligners-vs-braces', '/teen', '/airway', '/tmj', '/symptoms',
  '/sleep-airway', '/cosmetic-dentistry', '/orthodontics',
]

export function detectPageType(pathname: string): PageType {
  const p = pathname.toLowerCase()
  if (p === '/' || p === '') return 'homepage'
  if (p.startsWith('/quiz') || p.includes('/assessment')) return 'quiz'
  if (BLOG_PATHS.some((b) => p.startsWith(b))) return 'blog'
  if (CONTENT_PATHS.some((c) => p.startsWith(c))) return 'internal_content' as PageType extends 'internal_content' ? PageType : never as PageType
  if (p.startsWith('/clinic') || p.startsWith('/za-kliniki')) return 'clinic_page'
  if (p.startsWith('/contact') || p === '/contact') return 'contact_page'
  if (/^\/[a-z-]+\/[a-z-]+$/.test(p)) return 'city_page' // e.g. /sofia/orthodontics
  if (/^\/[a-z-]+\/(orthodontics|implants|invisalign|cosmetic-dentistry|tmj|sleep-airway)$/.test(p)) return 'treatment_page'
  return 'other'
}

export function detectArticleData(pathname: string): { slug?: string; title?: string } {
  const m = pathname.match(/^\/(?:blog|statii|articles)\/([^/?#]+)/i)
  if (!m) return {}
  const slug = decodeURIComponent(m[1])
  let title: string | undefined
  if (typeof document !== 'undefined') {
    title = document.title?.split('|')[0]?.trim() || undefined
  }
  return { slug, title }
}

export function classifyLeadSource(
  utm: Record<string, string | null>,
  clickIds: Record<string, string | null>,
  referrer: string,
  pageType: PageType,
): LeadSourceType {
  const med = (utm.utm_medium || '').toLowerCase()
  const paidMediums = ['paid_social', 'cpc', 'ppc', 'paid', 'ads', 'paid-search']
  if (paidMediums.some((m) => med.includes(m))) return 'paid'
  if (Object.values(clickIds).some((v) => !!v)) return 'paid'

  const refH = refHost(referrer)
  if (refH && isSearchEngine(refH)) return 'organic_search'
  if (refH && isSocial(refH)) return 'organic_social'

  // Article landing without paid/search/social referral counts as blog/internal_content
  if (pageType === 'blog') return 'blog'
  if (pageType === 'article' || pageType === 'treatment_page' || pageType === 'comparison_page' || pageType === 'city_page') {
    return 'internal_content'
  }

  if (refH && refH !== 'zubite.bg' && refH !== 'www.zubite.bg' && !isSearchEngine(refH) && !isSocial(refH)) {
    return 'referral'
  }
  if (!refH && Object.values(utm).every((v) => !v) && Object.values(clickIds).every((v) => !v)) {
    return 'direct'
  }
  return 'unknown'
}

// ─── Capture ────────────────────────────────────────────────────

function readUrlParams(): { utm: Record<string, string | null>; clickIds: Record<string, string | null> } {
  const utm: Record<string, string | null> = {}
  const clickIds: Record<string, string | null> = {}
  if (typeof window === 'undefined') return { utm, clickIds }
  try {
    const sp = new URL(window.location.href).searchParams
    for (const k of UTM_KEYS) utm[k] = sp.get(k)
    for (const k of CLICK_ID_KEYS) clickIds[k] = sp.get(k)
  } catch {
    // ignore
  }
  return { utm, clickIds }
}

function buildTouch(): AttributionTouch {
  if (typeof window === 'undefined') return { seen_at: new Date().toISOString() }
  const { utm, clickIds } = readUrlParams()
  const referrer = typeof document !== 'undefined' ? document.referrer || '' : ''
  const pathname = window.location.pathname
  const pageType = detectPageType(pathname)
  const sourceType = classifyLeadSource(utm, clickIds, referrer, pageType)
  const article = detectArticleData(pathname)
  return {
    ...utm,
    ...clickIds,
    landing_page: pathname,
    landing_page_type: pageType,
    referrer: referrer || null,
    lead_source_type: sourceType,
    article_slug: article.slug || null,
    article_title: article.title || null,
    seen_at: new Date().toISOString(),
  }
}

function hasMeaningfulSignal(t: AttributionTouch): boolean {
  // Treat a touch as meaningful if it carries any UTM, click ID, referrer, or
  // a recognised content page (blog/internal_content/treatment_page).
  if (UTM_KEYS.some((k) => !!t[k])) return true
  if (CLICK_ID_KEYS.some((k) => !!t[k])) return true
  if (t.referrer) return true
  return ['blog', 'internal_content', 'treatment_page'].includes(t.landing_page_type || '')
}

/**
 * Run on every page load. Captures the current touch, persists first-touch
 * if not yet set, and updates latest-touch only when there's a real signal.
 */
export function captureAttribution(): void {
  try {
    if (typeof window === 'undefined') return
    const touch = buildTouch()

    // First-touch: only set once
    if (!getJson<AttributionTouch>(FIRST_TOUCH_KEY)) {
      setJson(FIRST_TOUCH_KEY, touch)
      safeSet(FIRST_SEEN_KEY, touch.seen_at || new Date().toISOString())
    }

    // Latest-touch: only update on a meaningful new signal so a later "direct"
    // visit doesn't erase the original campaign.
    if (hasMeaningfulSignal(touch)) {
      setJson(LATEST_TOUCH_KEY, touch)
    } else if (!getJson<AttributionTouch>(LATEST_TOUCH_KEY)) {
      // No latest yet — at least record the current page as latest seed.
      setJson(LATEST_TOUCH_KEY, touch)
    } else {
      // Update only the seen_at on the existing latest touch
      const existing = getJson<AttributionTouch>(LATEST_TOUCH_KEY)
      if (existing) {
        setJson(LATEST_TOUCH_KEY, { ...existing, seen_at: touch.seen_at })
      }
    }

    // Content path
    const path = getJson<ContentPathEntry[]>(CONTENT_PATH_KEY) || []
    const last = path[path.length - 1]
    if (!last || last.path !== touch.landing_page) {
      const article = detectArticleData(touch.landing_page || '')
      path.push({
        path: touch.landing_page || '',
        page_type: (touch.landing_page_type as PageType) || 'other',
        article_slug: article.slug || null,
        article_title: article.title || null,
        timestamp: touch.seen_at || new Date().toISOString(),
      })
      while (path.length > MAX_PATH_ENTRIES) path.shift()
      setJson(CONTENT_PATH_KEY, path)
    }
  } catch {
    // never throw
  }
}

// ─── Public API for lead submission ─────────────────────────────

export function getStoredAttribution(): {
  first: AttributionTouch | null
  latest: AttributionTouch | null
  path: ContentPathEntry[]
  firstSeen: string | null
} {
  return {
    first: getJson<AttributionTouch>(FIRST_TOUCH_KEY),
    latest: getJson<AttributionTouch>(LATEST_TOUCH_KEY),
    path: getJson<ContentPathEntry[]>(CONTENT_PATH_KEY) || [],
    firstSeen: safeGet(FIRST_SEEN_KEY),
  }
}

/**
 * Build the attribution payload to attach to a lead submission. Always returns
 * a valid object (with mostly nulls) — never throws.
 */
export function attachAttributionToLead(): AttributionPayload {
  try {
    const stored = getStoredAttribution()
    const first = stored.first || {}
    const latest = stored.latest || stored.first || {}
    const submittedAt = new Date().toISOString()
    const conversionPage = typeof window !== 'undefined' ? window.location.pathname : null

    const firstSeen = stored.firstSeen
    let timeToSubmit: number | null = null
    if (firstSeen) {
      try {
        const seconds = (Date.now() - new Date(firstSeen).getTime()) / 1000
        if (Number.isFinite(seconds) && seconds >= 0) timeToSubmit = Math.round(seconds)
      } catch { /* ignore */ }
    }

    const blogAssisted = stored.path.some((p) => p.page_type === 'blog' || !!p.article_slug)
    const internalAssisted = stored.path.some((p) =>
      ['blog', 'internal_content', 'treatment_page', 'comparison_page', 'city_page'].includes(p.page_type),
    )

    return {
      // First-touch
      first_utm_source: first.utm_source ?? null,
      first_utm_medium: first.utm_medium ?? null,
      first_utm_campaign: first.utm_campaign ?? null,
      first_utm_adset: first.utm_adset ?? null,
      first_utm_ad: first.utm_ad ?? null,
      first_utm_campaign_id: first.utm_campaign_id ?? null,
      first_utm_adset_id: first.utm_adset_id ?? null,
      first_utm_ad_id: first.utm_ad_id ?? null,
      first_utm_content: first.utm_content ?? null,
      first_utm_term: first.utm_term ?? null,
      first_fbclid: first.fbclid ?? null,
      first_gclid: first.gclid ?? null,
      first_msclkid: first.msclkid ?? null,
      first_ttclid: first.ttclid ?? null,
      first_landing_page: first.landing_page ?? null,
      first_landing_page_type: first.landing_page_type ?? null,
      first_referrer: first.referrer ?? null,
      first_lead_source_type: first.lead_source_type ?? null,
      first_article_slug: first.article_slug ?? null,
      first_article_title: first.article_title ?? null,
      first_seen_at: first.seen_at ?? firstSeen ?? null,
      original_lead_source_type: first.lead_source_type ?? null,

      // Latest-touch
      latest_utm_source: latest.utm_source ?? null,
      latest_utm_medium: latest.utm_medium ?? null,
      latest_utm_campaign: latest.utm_campaign ?? null,
      latest_utm_adset: latest.utm_adset ?? null,
      latest_utm_ad: latest.utm_ad ?? null,
      latest_utm_campaign_id: latest.utm_campaign_id ?? null,
      latest_utm_adset_id: latest.utm_adset_id ?? null,
      latest_utm_ad_id: latest.utm_ad_id ?? null,
      latest_utm_content: latest.utm_content ?? null,
      latest_utm_term: latest.utm_term ?? null,
      latest_fbclid: latest.fbclid ?? null,
      latest_gclid: latest.gclid ?? null,
      latest_msclkid: latest.msclkid ?? null,
      latest_ttclid: latest.ttclid ?? null,
      latest_landing_page: latest.landing_page ?? null,
      latest_landing_page_type: latest.landing_page_type ?? null,
      latest_referrer: latest.referrer ?? null,
      latest_lead_source_type: latest.lead_source_type ?? null,
      latest_article_slug: latest.article_slug ?? null,
      latest_article_title: latest.article_title ?? null,
      last_seen_at: latest.seen_at ?? null,

      // Conversion data
      content_path_before_conversion: stored.path,
      pages_viewed_before_conversion: stored.path.length,
      blog_assisted_conversion: blogAssisted,
      internal_content_assisted_conversion: internalAssisted,
      conversion_page: conversionPage,
      submitted_at: submittedAt,
      time_to_submit_seconds: timeToSubmit,
    }
  } catch {
    return {}
  }
}
