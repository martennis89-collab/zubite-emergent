/**
 * Public clinic directory — types, API helpers, and tier mapping.
 *
 * Single source of truth for `/kliniki` listing surface. Mirrors the
 * shape of `GET /api/public/clinics` and intentionally lives next to
 * `lib/api.ts` so the quiz-driven results flow stays untouched.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

/** Public partner tier — derived from the existing `partner_tier` field on
 *  the clinic doc. No parallel schema. */
export type PartnerTier = 'standard' | 'featured' | 'premium'

/** Public-facing tier label (never the raw internal tier name).
 *  Feb 2026 pricing revamp: only Verified / Growth are public. Any
 *  legacy `premium` (old Authority) is publicly relabeled as Growth
 *  Partner — the private "Strategic Partner" label is applied only
 *  when `strategic_public_display=true` on the clinic, which is
 *  surfaced via the payload's `public_status_label` string that the
 *  UI should trust as-is. */
export const PUBLIC_STATUS_LABEL: Record<PartnerTier, string> = {
  standard: 'Verified Profile',
  featured: 'Growth Partner',
  premium: 'Growth Partner',
}

export type ReviewSummary = {
  rating: number
  count: number
  source: 'google' | 'superdoc' | 'zubite'
}

export type DoctorSpotlight = {
  name: string | null
  role: string | null
  bio: string | null
}

export type ProfileQA = { question: string; answer: string }

export type ProfilePriceRange = {
  treatment: string
  price_from: number | null
  price_to: number | null
  currency: string
  note: string | null
}

export type ProfileTreatmentDetail = {
  who_for: string | null
  remote_start_possible: boolean | null
  note: string | null
}

export type PublicClinic = {
  id: string
  slug: string
  name: string
  city_slug: string | null
  city_name: string | null
  area: string | null
  treatments: string[]
  specialties: string[]
  short_description: string | null
  patient_intro: string | null
  treatment_focus: string[]
  hero_image_url: string | null
  doctor_spotlight_image_url: string | null
  team_image_url: string | null
  environment_image_url: string | null
  best_for: string[]
  not_ideal_for: string[]
  why_this_clinic_appears: string[]
  online_consultation: boolean
  online_consultation_label: string | null
  care_pass_partner: boolean
  accepts_adults: boolean | null
  accepts_children: boolean | null
  profile_information_reviewed: boolean
  partner_tier: PartnerTier
  public_status_label: string
  /** Feb 2026 booking engine — when true, patient can open the
   *  full booking calendar via `/booking/{id}`. When false, only
   *  the contact CTA (phone / lead form) is shown. */
  booking_enabled?: boolean
  review: ReviewSummary | null
  long_description: string | null
  consultation_process: string | null
  environment_description: string | null
  philosophy: string | null
  doctor_spotlight: DoctorSpotlight | null
  team_note: string | null
  clinic_video_url: string | null
  doctor_video_url: string | null
  // Phase C1 — Premium/Authority enrichment (always present; may be empty)
  technology_section: string[]
  expert_qa: ProfileQA[]
  faq: ProfileQA[]
  category_authority: string | null
  price_ranges: ProfilePriceRange[]
  treatment_details: Record<string, ProfileTreatmentDetail>
  case_library: Array<{
    id?: string
    title: string
    category?: string
    summary: string
    treatment_type?: string | null
    duration?: string | null
    price?: string | null
    materials?: string | null
    specifics?: string | null
    before_images?: string[]
    after_images?: string[]
  }>
  profile_published_at: string | null
  // Phase C1 — sponsorship + demo flags
  is_sponsored: boolean
  sponsored_label: string | null
  is_demo: boolean
  is_addons_showcase: boolean
}

export type ListResponse = {
  clinics: PublicClinic[]
  total: number
  ranking_note: string
}

export type PublicClinicFilters = {
  city?: string
  specialty?: string
  online_consultation?: boolean
  care_pass?: boolean
  accepts_adults?: boolean
  accepts_children?: boolean
}

function buildQuery(f: PublicClinicFilters): string {
  const sp = new URLSearchParams()
  if (f.city) sp.set('city', f.city)
  if (f.specialty) sp.set('specialty', f.specialty)
  if (f.online_consultation) sp.set('online_consultation', 'true')
  if (f.care_pass) sp.set('care_pass', 'true')
  if (f.accepts_adults) sp.set('accepts_adults', 'true')
  if (f.accepts_children) sp.set('accepts_children', 'true')
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function listPublicClinics(
  filters: PublicClinicFilters = {}
): Promise<ListResponse> {
  const res = await fetch(`${API_URL}/api/public/clinics${buildQuery(filters)}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getPublicClinic(slugOrId: string): Promise<PublicClinic> {
  const res = await fetch(`${API_URL}/api/public/clinics/${slugOrId}`, {
    cache: 'no-store',
  })
  if (res.status === 404) {
    throw Object.assign(new Error('not_found'), { code: 'not_found' })
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Treatment slug → Bulgarian label (used for filters + URL routing).
 *  Extend as the clinic data grows. */
export const TREATMENT_LABELS: Record<string, string> = {
  invisalign: 'Invisalign',
  aligners: 'Алайнери',
  ortodontia: 'Ортодонтия',
  orthodontics: 'Ортодонтия',
  implants: 'Импланти',
  implantologia: 'Импланти',
  dentalni_implanti: 'Дентални импланти',
  full_mouth: 'Цялостно лечение',
  cosmetic: 'Естетична стоматология',
  estetichna_stomatologia: 'Естетична стоматология',
  endodontics: 'Ендодонтия',
  pediatric: 'Детска стоматология',
}

/** URL specialty slug → canonical backend treatment key. The backend stores
 *  only a small set of treatment slugs (`invisalign`, `aligners`, `implants`,
 *  `full_mouth`, etc.); the URLs use SEO-friendly Bulgarian phrases. This
 *  map normalises one to the other. URL slugs use hyphens (Next.js convention),
 *  so we also accept the hyphenated form. */
export const SPECIALTY_URL_MAP: Record<string, string> = {
  // direct backend matches
  invisalign: 'invisalign',
  aligners: 'aligners',
  implants: 'implants',
  full_mouth: 'full_mouth',
  cosmetic: 'cosmetic',
  // SEO Bulgarian aliases (hyphenated form used in URLs)
  ortodontia: 'orthodontics',
  ortodontiya: 'orthodontics',
  orthodontics: 'orthodontics',
  implantologia: 'implants',
  'dentalni-implanti': 'implants',
  dentalni_implanti: 'implants',
  'estetichna-stomatologia': 'cosmetic',
  estetichna_stomatologia: 'cosmetic',
  'detska-stomatologia': 'pediatric',
  pediatric: 'pediatric',
}

/** Convert a URL specialty slug into the backend filter value. Returns
 *  `null` when the slug is unknown so callers can show a 404/empty
 *  state instead of silently fetching all clinics. */
export function resolveSpecialtySlug(urlSlug: string): string | null {
  if (!urlSlug) return null
  const k = urlSlug.toLowerCase()
  return SPECIALTY_URL_MAP[k] || null
}

/** Specialty-aware page heading for `/kliniki/[city]/[specialty]`.
 *  Hand-crafted so SEO/intent matches natural Bulgarian search phrases. */
export function specialtyCityHeading(specialtySlug: string, cityName: string): string {
  const k = specialtySlug.toLowerCase()
  const inCity = cityName ? ` в ${cityName}` : ''
  if (k === 'invisalign') return `Invisalign клиники${inCity}`
  if (k === 'ortodontia' || k === 'ortodontiya' || k === 'orthodontics')
    return `Ортодонтски клиники${inCity}`
  if (k === 'implants' || k === 'implantologia' || k === 'dentalni-implanti' || k === 'dentalni_implanti')
    return `Клиники за импланти${inCity}`
  if (k === 'aligners') return `Клиники за алайнери${inCity}`
  if (k === 'cosmetic' || k === 'estetichna-stomatologia' || k === 'estetichna_stomatologia')
    return `Естетична стоматология${inCity}`
  if (k === 'full_mouth') return `Цялостно дентално лечение${inCity}`
  if (k === 'pediatric' || k === 'detska-stomatologia')
    return `Детска стоматология${inCity}`
  // Fallback — generic but never wrong.
  return `${treatmentLabel(k)} клиники${inCity}`
}

/** Specialty-aware SEO meta title. */
export function specialtyCityMetaTitle(specialtySlug: string, cityName: string): string {
  return `${specialtyCityHeading(specialtySlug, cityName)} | Zubite.bg`
}

/** Returns a human label for a treatment slug, falling back to the slug
 *  itself if unknown (defensive — never crash a public render). */
export function treatmentLabel(slug: string): string {
  return TREATMENT_LABELS[slug] || slug.replace(/_/g, ' ')
}

/** Build the canonical profile URL for a clinic — `/kliniki/[city]/[specialty]/[slug]`.
 *  `specialty` is the FIRST treatment slug from the clinic's list, or a
 *  generic `klinika` fallback if treatments is empty (still SEO-safe). */
export function clinicProfileHref(c: PublicClinic): string {
  const city = c.city_slug || 'all'
  const specialty = c.treatments[0] || 'klinika'
  return `/kliniki/${city}/${specialty}/${c.slug || c.id}`
}

/** City slug → Bulgarian display name. Falls back to capitalising the
 *  slug if it's unknown (e.g. a new city the admin added). */
export const CITY_NAMES: Record<string, string> = {
  sofia: 'София',
  plovdiv: 'Пловдив',
  varna: 'Варна',
  burgas: 'Бургас',
  haskovo: 'Хасково',
  ruse: 'Русе',
  stara_zagora: 'Стара Загора',
}

export function cityDisplay(slug: string | undefined | null): string {
  if (!slug) return ''
  return CITY_NAMES[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
}
