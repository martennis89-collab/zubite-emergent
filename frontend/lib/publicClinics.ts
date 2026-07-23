/**
 * Public clinic directory — types, API helpers, and tier mapping.
 *
 * Single source of truth for `/clinics` listing surface. Mirrors the
 * shape of `GET /api/public/clinics` and intentionally lives next to
 * `lib/api.ts` so the quiz-driven results flow stays untouched.
 */

/**
 * Base URL for the backend.
 *
 * These helpers run in BOTH contexts. On the server (SSR/RSC) the
 * browser-facing `NEXT_PUBLIC_API_URL` may be unreachable — in Docker it
 * points at a host-published port that does not exist inside the
 * container, and in production it takes a needless round trip out to the
 * public internet. `INTERNAL_API_URL` / `BACKEND_INTERNAL_URL` exist for
 * this (the same vars `next.config.js` already uses for its `/api`
 * rewrite), so prefer them server-side and fall back to the public URL.
 *
 * Trailing slashes are stripped: a stray one produces `//api/...` and a
 * 404, and the value is baked in at build time on Vercel — a known
 * migration footgun, so it is handled here rather than trusted to config.
 */
function resolveApiUrl(): string {
  const isServer = typeof window === 'undefined'
  const raw = isServer
    ? process.env.INTERNAL_API_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      ''
    : process.env.NEXT_PUBLIC_API_URL || ''
  return raw.replace(/\/+$/, '')
}

const API_URL = resolveApiUrl()

/** Public partner tier — derived from the existing `partner_tier` field on
 *  the clinic doc. No parallel schema. */
export type PartnerTier = 'standard' | 'featured' | 'premium'

export type AssessmentApproach =
  | 'airway_breathing'
  | 'swallowing_orofacial'
  | 'speech_articulation'
  | 'posture_balance'
  | 'facial_asymmetry'
  | 'functional_orthodontics'

export const ASSESSMENT_APPROACH_LABELS: Record<AssessmentApproach, string> = {
  airway_breathing: 'Дишане и дихателни пътища',
  swallowing_orofacial: 'Преглъщане и орофациални навици',
  speech_articulation: 'Говор и артикулация',
  posture_balance: 'Стойка и мускулен баланс',
  facial_asymmetry: 'Лицева асиметрия',
  functional_orthodontics: 'Функционален ортодонтски подход',
}

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
  kind: 'owner' | 'lead_doctor'
  role: string | null
  specialties: string[]
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

export type TreatmentCaseCount = {
  treatment: string
  completed_cases: number
  as_of_year: number | null
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
  assessment_approaches?: AssessmentApproach[]
  short_description: string | null
  patient_intro: string | null
  founded_year: number | null
  years_in_business: number | null
  treatment_focus: string[]
  treatment_case_counts: TreatmentCaseCount[]
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
  /**
   * LEGACY audit field. Do NOT gate rendering on this — it is not
   * written from the canonical `base_package`, so every clinic created
   * after the Feb-2026 pricing revamp reports "standard" here no matter
   * what they pay. Use `entitlements` below. Kept only for the public
   * status label and for legacy admin code.
   */
  partner_tier: PartnerTier
  /** Canonical commercial package (Feb 2026 revamp). */
  base_package?: 'verified_profile' | 'growth_partner' | null
  /**
   * Entitlement-derived render flags computed server-side from
   * `entitlements.py`. This is the single source of truth for which
   * profile sections a clinic is entitled to.
   */
  entitlements?: {
    enhanced_clinic_profile: boolean
    structured_trust_signals: boolean
    treatment_service_map: 'limited' | 'full'
    max_treatment_sections: number
    case_library_eligibility: boolean
    expert_qa: boolean
    /** Gates the "Съобщение до клиниката" chat CTA. Independent of
     *  `viber_phone` above. */
    patient_chat_channels: boolean
  }
  public_status_label: string
  /** Feb 2026 booking engine — when true, patient can open the
   *  full booking calendar via `/booking/{id}`. When false, only
   *  the contact CTA (phone / lead form) is shown. */
  booking_enabled?: boolean
  /**
   * Clinic's Viber number in E.164, or null. The server only sends it
   * when the package grants the chat channel AND the clinic enabled it,
   * so render the Viber CTA on presence alone — do not combine it with
   * `entitlements` or `base_package` here.
   */
  viber_phone?: string | null
  /**
   * 'online' | 'accepting' | null. 'online' means the clinic has been
   * active within the last 15 minutes (a real signal, not literal
   * live-presence — see `_chat_presence` server-side); 'accepting' means
   * the chat channel is entitled but the clinic hasn't been seen
   * recently; null means don't render a presence badge at all.
   */
  chat_presence?: 'online' | 'accepting' | null
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

export const CLINIC_CONTACT_ACTION_COPY = {
  label: 'Заяви контакт',
  description: 'Клиниката ще се свърже с теб.',
} as const

export type ClinicDirectorySearchParams = Record<string, string | string[] | undefined>

export function clinicFiltersFromSearchParams(
  params: ClinicDirectorySearchParams,
): PublicClinicFilters {
  const first = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  return {
    specialty: first('specialty') || undefined,
    online_consultation: first('online') === '1',
    accepts_adults: first('adults') === '1',
    accepts_children: first('children') === '1',
  }
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
  ortho: 'Ортодонтия',
  implants: 'Импланти',
  implantologia: 'Импланти',
  dentalni_implanti: 'Дентални импланти',
  full_mouth: 'Цялостно лечение',
  cosmetic: 'Естетична стоматология',
  estetichna_stomatologia: 'Естетична стоматология',
  endodontics: 'Ендодонтия',
  pediatric: 'Детска стоматология',
  // Added 2026-07: these slugs are in active use (lib/pricing.ts keys,
  // the /braces + /aligners-vs-braces + /tmj + /sleep-airway routes) but
  // had no label, so `treatmentLabel()` fell through to its raw-slug
  // fallback and printed English ("braces", "veneers") to Bulgarian
  // patients. Labels below match the wording used elsewhere on the site.
  braces: 'Брекети',
  breketi: 'Брекети',
  veneers: 'Фасети',
  bonding: 'Бондинг',
  whitening: 'Избелване',
  tmj: 'TMJ / челюстни стави',
  sleep_airway: 'Сън и дишане',
  'sleep-airway': 'Сън и дишане',
  hygiene: 'Хигиена и венци',
  periodontics: 'Пародонтология',
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

/** Specialty-aware page heading for `/clinics/[city]/[specialty]`.
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

/** Build the canonical profile URL for a clinic — `/clinics/[city]/[specialty]/[slug]`.
 *  `specialty` is the FIRST treatment slug from the clinic's list, or a
 *  generic `klinika` fallback if treatments is empty (still SEO-safe). */
export function clinicProfileHref(c: PublicClinic): string {
  const city = c.city_slug || 'all'
  const specialty = c.treatments[0] || 'klinika'
  return `/clinics/${city}/${specialty}/${c.slug || c.id}`
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
