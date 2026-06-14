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

/** Public-facing tier label (never the raw internal tier name). */
export const PUBLIC_STATUS_LABEL: Record<PartnerTier, string> = {
  standard: 'Zubite Listed',
  featured: 'Zubite Partner',
  premium: 'Zubite Featured Partner',
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
  review: ReviewSummary | null
  long_description: string | null
  consultation_process: string | null
  doctor_spotlight: DoctorSpotlight | null
  case_library: Array<{ id?: string; title: string; category?: string; summary: string }>
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
  full_mouth: 'Цялостно лечение',
  cosmetic: 'Естетична стоматология',
  endodontics: 'Ендодонтия',
  pediatric: 'Детска стоматология',
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
