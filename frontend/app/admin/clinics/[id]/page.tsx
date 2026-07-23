'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Save, Plus, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { CaseLibraryEditor, type CaseRow as EditorCaseRow } from '@/components/admin/CaseLibraryEditor'
import { ClinicPackageSection } from '@/components/admin/ClinicPackageSection'
import { ImageUploadField } from '@/components/admin/ImageUploadField'
import {
  ASSESSMENT_APPROACH_LABELS,
  treatmentLabel,
  type AssessmentApproach,
} from '@/lib/publicClinics'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Sofia neighbourhoods only. Kept in sync manually with SOFIA_DISTRICTS
// in backend/config.py (same convention as other city/district lists
// duplicated across this codebase, e.g. CITIES in MasterQuiz.tsx).
const SOFIA_DISTRICTS_ADMIN = [
  { value: 'lozenets', label: 'Лозенец' },
  { value: 'mladost', label: 'Младост' },
  { value: 'lyulin', label: 'Люлин' },
  { value: 'druzhba', label: 'Дружба' },
  { value: 'iztok', label: 'Изток' },
  { value: 'izgrev', label: 'Изгрев' },
  { value: 'studentski-grad', label: 'Студентски град' },
  { value: 'vitosha', label: 'Витоша' },
  { value: 'boyana', label: 'Бояна' },
  { value: 'center', label: 'Център' },
  { value: 'krasno-selo', label: 'Красно село' },
  { value: 'ovcha-kupel', label: 'Овча купел' },
  { value: 'nadezhda', label: 'Надежда' },
  { value: 'poduyane', label: 'Подуяне' },
]

type Tier = 'standard' | 'featured' | 'premium'
type ProfileStatus = 'draft' | 'published'

interface CaseRow {
  id?: string
  title: string
  category: string
  summary: string
  status: ProfileStatus
  consent_confirmed: boolean
  treatment_type: string
  duration: string
  price: string
  materials: string
  specifics: string
  before_images: string[]
  after_images: string[]
  _key: number  // local-only stable key for React lists
}

interface ReviewSources {
  google_rating?: number | null
  google_review_count?: number | null
  google_url?: string | null
  facebook_rating?: number | null
  facebook_review_count?: number | null
  facebook_url?: string | null
  superdoc_rating?: number | null
  superdoc_review_count?: number | null
  superdoc_url?: string | null
}

interface TreatmentCaseCountRow {
  treatment: string
  completed_cases: number | null
  as_of_year?: number | null
}

interface ClinicProfile {
  profile_status: ProfileStatus
  short_description?: string
  patient_intro?: string
  founded_year?: number | null
  treatment_focus?: string[]
  treatment_case_counts?: TreatmentCaseCountRow[]
  hero_image_url?: string
  clinic_video_url?: string
  doctor_video_url?: string
  doctor_spotlight_image_url?: string
  team_image_url?: string
  environment_image_url?: string
  doctor_spotlight_name?: string
  doctor_spotlight_kind?: 'owner' | 'lead_doctor'
  doctor_spotlight_role?: string
  doctor_spotlight_specialties?: string[]
  assessment_approaches?: AssessmentApproach[]
  doctor_spotlight_bio?: string
  team_note?: string
  clinic_story?: string
  environment_description?: string
  consultation_process?: string
  review_sources?: ReviewSources
  case_library?: Array<Omit<CaseRow, '_key'>>
}

// Aligner brand tags (Feb 2026) — top-level on the clinic doc.
type AlignerBrandSlug =
  | 'invisalign' | 'spark' | 'angel_aligner'
  | 'dentalign'  | 'clearcorrect' | 'other'

interface AlignerBrandEntry {
  brand: AlignerBrandSlug
  label?: string
  relationship: 'offered' | 'official_provider'
  verification_status: 'unverified' | 'pending_verification' | 'verified'
  visible: boolean
  other_label?: string
}

const ALIGNER_BRAND_OPTIONS: Array<{ slug: AlignerBrandSlug; label: string }> = [
  { slug: 'invisalign',    label: 'Invisalign'    },
  { slug: 'spark',         label: 'Spark'         },
  { slug: 'angel_aligner', label: 'Angel Aligner' },
  { slug: 'dentalign',     label: 'Dentalign'     },
  { slug: 'clearcorrect',  label: 'ClearCorrect'  },
  { slug: 'other',         label: 'Other'         },
]

const RELATIONSHIP_LABELS: Record<AlignerBrandEntry['relationship'], string> = {
  offered:           'Работи с марката',
  official_provider: 'Официален provider',
}

const VERIFICATION_LABELS: Record<AlignerBrandEntry['verification_status'], string> = {
  unverified:           'Неверифицирано',
  pending_verification: 'Чака проверка',
  verified:             'Верифицирано',
}

const TIER_LABELS: Array<{ value: Tier; label: string }> = [
  { value: 'standard', label: 'Verified Profile' },
  { value: 'featured', label: 'Growth Partner' },
  { value: 'premium',  label: 'Growth Partner · Strategic Private' },
]

// Package display config keyed by internal enum. The backend enum stays
// `standard/featured/premium` (kept in DB as `partner_tier` for audit);
// the canonical field is now `base_package` (verified_profile /
// growth_partner). Legacy Authority (`premium`) is publicly relabeled
// as Growth Partner + strategic_private. Source of truth for pricing:
// `entitlements.py::PACKAGE_DEFAULTS` (Feb 2026 pricing revamp).
type TierDisplay = {
  label: string
  positioning: string
  monthly: string
  yearly: string
  onboarding: string
  foundingOffer?: string
  activeCls: string
}
const TIER_DISPLAY: Record<Tier, TierDisplay> = {
  standard: {
    label: 'Verified Profile',
    positioning: 'Entry Presence',
    monthly: '€39/month',
    yearly: 'billed yearly · €468/year',
    onboarding: 'Onboarding: €199 one-time',
    activeCls: 'bg-slate-900 text-white',
  },
  featured: {
    label: 'Growth Partner',
    positioning: 'Recommended',
    monthly: '€199/month',
    yearly: 'billed yearly · €2,388/year',
    onboarding: 'Onboarding: €499 one-time',
    foundingOffer: 'Founding Growth: €149/month for first 6 months',
    activeCls: 'bg-teal-600 text-white',
  },
  premium: {
    label: 'Growth Partner · Strategic Private',
    positioning: 'Legacy Authority · migrated to Growth + private terms',
    monthly: 'Custom private',
    yearly: 'Custom private',
    onboarding: 'Custom private',
    activeCls: 'bg-violet-600 text-white',
  },
}

// Tier ordering used for downgrade detection (lower index = lower tier).
const TIER_ORDER: Tier[] = ['standard', 'featured', 'premium']
const tierRank = (t: Tier) => TIER_ORDER.indexOf(t)

// Tier visibility — extended in Feb 2026 to cover the full Zubite Partner
// Package matrix. Existing profile-field keys are unchanged. The new keys
// describe partner-access + authority + analytics features that surface
// as chips / warnings in this editor (not as new form fields).
const VISIBILITY: Record<string, Tier[]> = {
  // ── existing profile fields ───────────────────────────────────
  short_description:        ['standard', 'featured', 'premium'],
  founded_year:             ['featured', 'premium'],
  treatment_focus:          ['standard', 'featured', 'premium'],
  treatment_case_counts:     ['featured', 'premium'],
  review_sources:           ['standard', 'featured', 'premium'],
  patient_intro:            ['featured', 'premium'],
  hero_image_url:           ['featured', 'premium'],
  doctor_spotlight_image_url:['featured', 'premium'],
  team_image_url:           ['featured', 'premium'],
  environment_image_url:    ['featured', 'premium'],
  clinic_video_url:         ['featured', 'premium'],
  doctor_video_url:         ['featured', 'premium'],
  doctor_spotlight_name:    ['featured', 'premium'],
  doctor_spotlight_kind:    ['featured', 'premium'],
  doctor_spotlight_role:    ['featured', 'premium'],
  doctor_spotlight_specialties:['featured', 'premium'],
  doctor_spotlight_bio:     ['featured', 'premium'],
  team_note:                ['featured', 'premium'],
  clinic_story:             ['featured', 'premium'],
  environment_description:  ['featured', 'premium'],
  consultation_process:     ['featured', 'premium'],
  case_library:             ['featured', 'premium'],
  // ── partner-access matrix (Feb 2026 package doc) ─────────────
  care_pass_partner:         ['featured', 'premium'],
  quiz_result_participation: ['featured', 'premium'],
  patient_context:           ['featured', 'premium'],
  analytics_dashboard:       ['featured', 'premium'],
  monthly_mini_report:       ['featured', 'premium'],
  quarterly_optimization:    ['featured', 'premium'],
  educational_events:        ['featured', 'premium'],
  partner_supplier_offers:   ['featured', 'premium'],
  beta_tools:                ['featured', 'premium'],
  concierge_flow:            ['featured', 'premium'],
  expert_quote:              ['featured', 'premium'],
  clinic_spotlight:          ['featured', 'premium'],
  founding_offer:            ['featured'],
  expert_qa_interview:       ['premium'],
  case_library_participation:['premium'],
  expanded_analytics:        ['premium'],
  quarterly_strategy_review: ['premium'],
  annual_visibility_report:  ['premium'],
  strategic_roundtables:     ['premium'],
  speaker_cohost:            ['premium'],
  podcast_video_opp:         ['premium'],
  authority_content:         ['premium'],
  priority_partner_campaign: ['premium'],
  partner_access_plus:       ['premium'],
}

function visibilityHint(tier: Tier, field: keyof typeof VISIBILITY): string | null {
  const allowed = VISIBILITY[field]
  if (!allowed || allowed.includes(tier)) return null
  const min = allowed[0]
  return `Това поле ще се вижда публично само при ${TIER_DISPLAY[min].label} или по-нагоре.`
}

export default function AdminClinicEditPage() {
  const params = useParams()
  const clinicId = params?.id as string
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [tier, setTier] = useState<Tier>('standard')
  const [tierBeforeSave, setTierBeforeSave] = useState<Tier>('standard')
  // Care Pass partner flag is stored on the clinic document itself (not
  // on ClinicProfile), so we mirror it into local state to gate the
  // Care Pass-specific downgrade warning. Boolean — no admin editing.
  const [carePassPartner, setCarePassPartner] = useState(false)
  const [clinicName, setClinicName] = useState('')
  const [district, setDistrict] = useState('')

  const [profile, setProfile] = useState<ClinicProfile>({ profile_status: 'draft' })
  const [focusInput, setFocusInput] = useState('')
  const [doctorSpecialtyInput, setDoctorSpecialtyInput] = useState('')
  const [supportedTreatments, setSupportedTreatments] = useState<string[]>([])
  const [cases, setCases] = useState<CaseRow[]>([])
  const caseKeyRef = useRef<number>(0)
  const [brands, setBrands] = useState<AlignerBrandEntry[]>([])

  const handleBasePackageChange = useCallback((basePackage: 'verified_profile' | 'growth_partner', foundingStatus: string) => {
    const nextTier: Tier = basePackage === 'growth_partner'
      ? (foundingStatus === 'strategic_private' ? 'premium' : 'featured')
      : 'standard'
    setTier(nextTier)
    setTierBeforeSave(nextTier)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/admin/clinics/${clinicId}`, {
        credentials: 'include' as RequestCredentials,
      })
      if (r.status === 401 || r.status === 403) { router.replace('/admin'); return }
      if (!r.ok) { setMessage({ type: 'err', text: 'Не успяхме да заредим клиниката.' }); return }
      const j = await r.json()
      const c = j.clinic || {}
      setClinicName(c.clinic_name || c.name || '—')
      const rawTier = (
        c.base_package === 'growth_partner'
          ? (c.founding_status === 'strategic_private' ? 'premium' : 'featured')
          : c.base_package === 'verified_profile'
            ? 'standard'
            : (c.partner_tier || (c.is_premium ? 'premium' : c.is_featured ? 'featured' : 'standard'))
      ) as Tier
      setTier(rawTier)
      setTierBeforeSave(rawTier)
      setCarePassPartner(c.care_pass_partner === true)
      setDistrict(c.district_slug || '')
      setSupportedTreatments(
        Array.isArray(c.treatments_supported)
          ? c.treatments_supported
          : Array.isArray(c.treatments_offered)
            ? c.treatments_offered
            : [],
      )
      const p: ClinicProfile = c.clinic_profile || { profile_status: 'draft' }
      setProfile({
        profile_status: (p.profile_status as ProfileStatus) || 'draft',
        short_description: p.short_description || '',
        patient_intro: p.patient_intro || '',
        founded_year: typeof p.founded_year === 'number' ? p.founded_year : null,
        treatment_focus: p.treatment_focus || [],
        treatment_case_counts: p.treatment_case_counts || [],
        hero_image_url: p.hero_image_url || '',
        clinic_video_url: p.clinic_video_url || '',
        doctor_video_url: p.doctor_video_url || '',
        doctor_spotlight_image_url: p.doctor_spotlight_image_url || '',
        team_image_url: p.team_image_url || '',
        environment_image_url: p.environment_image_url || '',
        doctor_spotlight_name: p.doctor_spotlight_name || '',
        doctor_spotlight_kind: p.doctor_spotlight_kind || 'lead_doctor',
        doctor_spotlight_role: p.doctor_spotlight_role || '',
        doctor_spotlight_specialties: p.doctor_spotlight_specialties || [],
        assessment_approaches: p.assessment_approaches || [],
        doctor_spotlight_bio: p.doctor_spotlight_bio || '',
        team_note: p.team_note || '',
        clinic_story: p.clinic_story || '',
        environment_description: p.environment_description || '',
        consultation_process: p.consultation_process || '',
        review_sources: p.review_sources || {},
      })
      setCases(
        (p.case_library || []).map((c) => ({
          id: c.id,
          title: c.title || '',
          category: c.category || '',
          summary: c.summary || '',
          status: (c.status as ProfileStatus) || 'draft',
          consent_confirmed: !!c.consent_confirmed,
          treatment_type: (c as { treatment_type?: string }).treatment_type || '',
          duration: (c as { duration?: string }).duration || '',
          price: (c as { price?: string }).price || '',
          materials: (c as { materials?: string }).materials || '',
          specifics: (c as { specifics?: string }).specifics || '',
          before_images: Array.isArray((c as { before_images?: string[] }).before_images)
            ? (c as { before_images?: string[] }).before_images as string[]
            : [],
          after_images: Array.isArray((c as { after_images?: string[] }).after_images)
            ? (c as { after_images?: string[] }).after_images as string[]
            : [],
          _key: ++caseKeyRef.current,
        })),
      )
      // Aligner brand tags (Feb 2026) — top-level on the clinic doc.
      const rawBrands = Array.isArray(c.aligner_brands_supported)
        ? (c.aligner_brands_supported as Partial<AlignerBrandEntry>[])
        : []
      setBrands(rawBrands.map((b) => ({
        brand: (b.brand as AlignerBrandSlug) || 'invisalign',
        label: b.label,
        relationship: (b.relationship as AlignerBrandEntry['relationship']) || 'offered',
        verification_status: (b.verification_status as AlignerBrandEntry['verification_status']) || 'unverified',
        visible: b.visible !== false,
        other_label: b.other_label || '',
      })))
    } finally { setLoading(false) }
  }, [clinicId, router])

  useEffect(() => { if (clinicId) load() }, [clinicId, load])

  const save = async () => {
    setSaving(true); setMessage(null)
    try {
      const body = {
        partner_tier: tier,
        ...(district ? { district_slug: district } : {}),
        aligner_brands_supported: brands.map((b) => ({
          brand: b.brand,
          relationship: b.relationship,
          verification_status: b.verification_status,
          visible: b.visible,
          ...(b.brand === 'other' ? { other_label: (b.other_label || '').trim() } : {}),
        })),
        clinic_profile: {
          profile_status: profile.profile_status,
          short_description: profile.short_description || null,
          patient_intro: profile.patient_intro || null,
          founded_year: typeof profile.founded_year === 'number' ? profile.founded_year : null,
          treatment_focus: (profile.treatment_focus || []).filter(Boolean),
          treatment_case_counts: (profile.treatment_case_counts || []).flatMap((row) => {
            const treatment = row.treatment.trim()
            const completedCases = row.completed_cases
            if (!treatment || typeof completedCases !== 'number' || !Number.isInteger(completedCases) || completedCases < 1) {
              return []
            }
            return [{
              treatment,
              completed_cases: completedCases,
              as_of_year: typeof row.as_of_year === 'number' ? row.as_of_year : null,
            }]
          }),
          hero_image_url: profile.hero_image_url || null,
          clinic_video_url: profile.clinic_video_url || null,
          doctor_video_url: profile.doctor_video_url || null,
          doctor_spotlight_image_url: profile.doctor_spotlight_image_url || null,
          team_image_url: profile.team_image_url || null,
          environment_image_url: profile.environment_image_url || null,
          doctor_spotlight_name: profile.doctor_spotlight_name || null,
          doctor_spotlight_kind: profile.doctor_spotlight_kind || 'lead_doctor',
          doctor_spotlight_role: profile.doctor_spotlight_role || null,
          doctor_spotlight_specialties: Array.from(new Set(
            (profile.doctor_spotlight_specialties || []).map((item) => item.trim()).filter(Boolean),
          )),
          assessment_approaches: profile.assessment_approaches || [],
          doctor_spotlight_bio: profile.doctor_spotlight_bio || null,
          team_note: profile.team_note || null,
          clinic_story: profile.clinic_story || null,
          environment_description: profile.environment_description || null,
          consultation_process: profile.consultation_process || null,
          review_sources: profile.review_sources || {},
          case_library: cases.map((c) => ({
            id: c.id,
            title: c.title,
            category: c.category,
            summary: c.summary,
            status: c.status,
            consent_confirmed: c.consent_confirmed,
            treatment_type: c.treatment_type || null,
            duration: c.duration || null,
            price: c.price || null,
            materials: c.materials || null,
            specifics: c.specifics || null,
            before_images: c.before_images || [],
            after_images: c.after_images || [],
          })),
        },
      }
      const r = await fetch(`${API_URL}/api/admin/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        const detail = typeof j.detail === 'string' ? j.detail : 'Грешка при запис.'
        setMessage({ type: 'err', text: detail })
        return
      }
      setMessage({ type: 'ok', text: 'Профилът е запазен успешно.' })
      setTierBeforeSave(tier)
      // Refresh from server so we pick up auto-stamped updated_at / published_at + case ids.
      await load()
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FCFAF8]" data-testid="admin-clinic-editor">
        <AdminHeader
          pageTitle="Профил на клиника"
          backHref="/admin/clinics"
          backLabel="Към списъка"
        />
        <div className="grid place-items-center py-32 text-slate-400">Зареждане…</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8] pb-32" data-testid="admin-clinic-editor">
      <AdminHeader
        pageTitle={clinicName ? `Профил: ${clinicName}` : 'Профил на клиника'}
        backHref="/admin/clinics"
        backLabel="Към списъка"
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-end gap-3">
        <Link
          href={`/admin/clinics/${clinicId}/orientation`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium"
          data-testid="admin-clinic-orientation-link"
        >
          Онлайн ориентация
        </Link>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
          data-testid="admin-clinic-save"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Запис…' : 'Запази'}
        </button>
      </div>
      {message && (
        <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-2 text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
          <span className="inline-flex items-center gap-1.5">
            {message.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </span>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Section 0 — Локация */}
        <Section title="Локация" testid="section-location">
          <div className="max-w-xs">
            <Field label="Квартал (само за София)">
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                data-testid="clinic-district-select"
              >
                <option value="">— не е зададено —</option>
                {SOFIA_DISTRICTS_ADMIN.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* Section 1 — Партньорски пакет */}
        <Section title="Партньорски пакет" testid="section-partner-status">
          <p className="text-xs text-slate-500 leading-relaxed mb-4" data-testid="tier-trust-guardrail">
            Пакетът определя дълбочината на профила, достъпа до партньорски функции
            и отчетността. Не означава медицински рейтинг, клинично качество или
            гарантирана позиция.
          </p>
          <p className="text-[11px] text-amber-700 italic leading-relaxed mb-3">
            Обобщение само за преглед. Променяй пакета, founding условията,
            billing, entitlements и add-ons от „Package & Billing" по-долу.
            Така `base_package` остава единственият източник на истина.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TIER_LABELS.map((t) => {
              const d = TIER_DISPLAY[t.value]
              const active = tier === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  disabled
                  className={
                    'relative cursor-default text-left rounded-2xl ring-1 p-4 ' +
                    (active
                      ? 'ring-teal-500 shadow-[0_10px_24px_-14px_rgba(15,118,110,0.35)] bg-white'
                      : 'ring-slate-200 bg-slate-50 hover:bg-white hover:ring-slate-300')
                  }
                  data-testid={`tier-${t.value}`}
                  aria-pressed={active}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ' +
                      (active ? d.activeCls : 'bg-slate-200 text-slate-600')
                    }>
                      {d.positioning}
                    </span>
                    {active && <span className="text-[11px] font-medium text-teal-700">Selected</span>}
                  </div>
                  <p className="mt-3 font-serif text-lg font-semibold text-slate-900 leading-snug">{d.label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{d.monthly}</p>
                  <p className="text-[11.5px] text-slate-500 leading-snug">{d.yearly}</p>
                  <p className="mt-2 text-[11.5px] text-slate-500 leading-snug">{d.onboarding}</p>
                  {d.foundingOffer && (
                    <p className="mt-2 text-[11px] text-teal-700 font-medium leading-snug" data-testid={`tier-${t.value}-founding-hint`}>
                      {d.foundingOffer}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
          {tier !== tierBeforeSave && (
            <p className="mt-3 text-xs text-amber-700" data-testid="tier-pending">
              Промяната ще се запази след клик на „Запази".
            </p>
          )}
          {tier !== tierBeforeSave && tierRank(tier) < tierRank(tierBeforeSave) && (
            <div
              className="mt-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2.5 text-[12px] text-amber-800 leading-relaxed"
              data-testid="tier-downgrade-warning"
            >
              <p className="font-semibold mb-1">Внимание — понижаване на пакет</p>
              <p>
                Този пакет не включва някои вече активни функции. Те няма да се
                показват публично след запазване, освен ако пакетът бъде върнат
                към {TIER_DISPLAY['featured'].label} или {TIER_DISPLAY['premium'].label}.
                Съществуващите данни се запазват — можеш да върнеш пакета по-късно.
              </p>
              {tier === 'standard' && carePassPartner && (
                <p className="mt-2 pt-2 border-t border-amber-200/70" data-testid="care-pass-downgrade-warning">
                  Care Pass е активен, но избраният пакет не го включва.
                  Потвърдете дали да бъде изключен преди запазване.
                </p>
              )}
            </div>
          )}
        </Section>

        {/* Section 1.1 — NEW Package & Billing / Entitlements / Add-ons */}
        <ClinicPackageSection
          clinicId={clinicId}
          onNotify={(m) => setMessage(m)}
          onBasePackageChange={handleBasePackageChange}
        />

        {/* Section 1.5 — Founding Growth Partner offer (only for Growth tier) */}
        {tier === 'featured' && (
          <Section title="Founding Growth Partner offer" testid="section-founding-offer">
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Тази офер важи само за Growth Partner. Показва се тук, защото си
              избрал/а <strong>{TIER_DISPLAY.featured.label}</strong>. Полетата се
              запазват при клика на „Запази" в горния десен ъгъл.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-teal-50/60 ring-1 ring-teal-200/60 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-teal-700">Условия</p>
                <ul className="mt-1.5 space-y-1 text-[13px] text-slate-700">
                  <li>Founding offer monthly price: <span className="font-semibold">€149</span></li>
                  <li>Founding offer duration: <span className="font-semibold">6 месеца</span></li>
                  <li>Followed by standard Growth Partner pricing (€199/month, billed yearly)</li>
                </ul>
              </div>
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">Value-exchange checklist</p>
                <ul className="mt-1.5 space-y-1 text-[13px] text-slate-700 list-disc list-inside marker:text-slate-400">
                  <li>Пълна информация на клиничния профил</li>
                  <li>Разговор за обратна връзка</li>
                  <li>Разрешение за анонимизирани performance learnings</li>
                  <li>Участие в expert quote/interview, ако е подходящо</li>
                  <li>Сътрудничество за подобряване на платформата</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
              Полетата „Founding offer active / start date / end date / private
              approval note" се управляват от Sales admin, не са редактируеми
              от клиниката. За активиране на офер, свържете се с екипа.
            </p>
          </Section>
        )}

        {/* Section 2 — Статус на профила */}
        <Section title="Статус на профила" testid="section-profile-status">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setProfile((p) => ({ ...p, profile_status: 'draft' }))}
              className={
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ' +
                (profile.profile_status === 'draft' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600')
              }
              data-testid="profile-status-draft"
            >
              <EyeOff className="w-3.5 h-3.5" /> Чернова
            </button>
            <button
              type="button"
              onClick={() => setProfile((p) => ({ ...p, profile_status: 'published' }))}
              className={
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ' +
                (profile.profile_status === 'published' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600')
              }
              data-testid="profile-status-published"
            >
              <Eye className="w-3.5 h-3.5" /> Публикуван
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Само публикувани профили се виждат публично. Чернова съдържание остава
            запазено, но не се показва на пациентите.
          </p>
        </Section>

        {/* Section 3 — Основна информация */}
        <Section title="Основна информация" testid="section-basic">
          <Field label="Кратко описание (до 500)" hint={visibilityHint(tier, 'short_description')}>
            <textarea
              value={profile.short_description || ''}
              onChange={(e) => setProfile({ ...profile, short_description: e.target.value })}
              maxLength={500}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              data-testid="field-short_description"
            />
          </Field>
          <Field label="Година на основаване (Growth)" hint={visibilityHint(tier, 'founded_year')}>
            <input
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              step={1}
              value={profile.founded_year ?? ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : Number(e.target.value)
                setProfile({
                  ...profile,
                  founded_year: typeof value === 'number' && Number.isFinite(value) ? value : null,
                })
              }}
              placeholder="напр. 2012"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              data-testid="field-founded_year"
            />
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              В публичния профил Zubite изчислява автоматично годините практика, за да не остарява стойността.
            </p>
          </Field>
          <Field label="Кратко обръщение към пациента (до 500)" hint={visibilityHint(tier, 'patient_intro')}>
            <textarea
              value={profile.patient_intro || ''}
              onChange={(e) => setProfile({ ...profile, patient_intro: e.target.value })}
              maxLength={500}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              data-testid="field-patient_intro"
            />
          </Field>
          <Field label="Фокус на клиниката (до 12 лечения)" hint={visibilityHint(tier, 'treatment_focus')}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(profile.treatment_focus || []).map((tf, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs">
                  {tf}
                  <button type="button" onClick={() => setProfile({
                    ...profile,
                    treatment_focus: (profile.treatment_focus || []).filter((_, idx) => idx !== i),
                  })} className="text-slate-400 hover:text-rose-500">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                maxLength={80}
                placeholder="напр. Алайнери"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                data-testid="field-treatment_focus_input"
              />
              <button
                type="button"
                onClick={() => {
                  const v = focusInput.trim()
                  if (!v) return
                  if ((profile.treatment_focus || []).length >= 12) return
                  setProfile({ ...profile, treatment_focus: [...(profile.treatment_focus || []), v] })
                  setFocusInput('')
                }}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm"
                data-testid="field-treatment_focus_add"
              >+</button>
            </div>
          </Field>

          <Field
            label="Завършени случаи по лечение (Growth)"
            hint={visibilityHint(tier, 'treatment_case_counts')}
          >
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              Попълвайте само официално потвърдени обобщени данни. В публичния профил те се обозначават като предоставени от клиниката и не се смесват с публикуваните пациентски случаи.
            </p>
            <div className="space-y-2" data-testid="field-treatment_case_counts">
              {(profile.treatment_case_counts || []).map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] sm:items-end"
                >
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-600">Лечение</span>
                    {supportedTreatments.length > 0 ? (
                      <select
                        value={row.treatment}
                        onChange={(e) => setProfile({
                          ...profile,
                          treatment_case_counts: (profile.treatment_case_counts || []).map((item, itemIndex) => (
                            itemIndex === index ? { ...item, treatment: e.target.value } : item
                          )),
                        })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Изберете лечение</option>
                        {Array.from(new Set([...supportedTreatments, row.treatment].filter(Boolean))).map((treatment) => (
                          <option key={treatment} value={treatment}>{treatmentLabel(treatment)}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={row.treatment}
                        onChange={(e) => setProfile({
                          ...profile,
                          treatment_case_counts: (profile.treatment_case_counts || []).map((item, itemIndex) => (
                            itemIndex === index ? { ...item, treatment: e.target.value } : item
                          )),
                        })}
                        maxLength={80}
                        placeholder="напр. Импланти"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-600">Завършени случаи</span>
                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      step={1}
                      value={row.completed_cases ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : Number(e.target.value)
                        setProfile({
                          ...profile,
                          treatment_case_counts: (profile.treatment_case_counts || []).map((item, itemIndex) => (
                            itemIndex === index
                              ? { ...item, completed_cases: typeof value === 'number' && Number.isFinite(value) ? value : null }
                              : item
                          )),
                        })
                      }}
                      placeholder="напр. 240"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-600">Към година</span>
                    <input
                      type="number"
                      min={2000}
                      max={new Date().getFullYear()}
                      step={1}
                      value={row.as_of_year ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : Number(e.target.value)
                        setProfile({
                          ...profile,
                          treatment_case_counts: (profile.treatment_case_counts || []).map((item, itemIndex) => (
                            itemIndex === index
                              ? { ...item, as_of_year: typeof value === 'number' && Number.isFinite(value) ? value : null }
                              : item
                          )),
                        })
                      }}
                      placeholder={String(new Date().getFullYear())}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setProfile({
                      ...profile,
                      treatment_case_counts: (profile.treatment_case_counts || []).filter((_, itemIndex) => itemIndex !== index),
                    })}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-600"
                    aria-label={`Премахни данните за ${row.treatment || 'лечението'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if ((profile.treatment_case_counts || []).length >= 12) return
                const usedTreatments = new Set((profile.treatment_case_counts || []).map((row) => row.treatment))
                const nextTreatment = supportedTreatments.find((treatment) => !usedTreatments.has(treatment)) || ''
                if (supportedTreatments.length > 0 && !nextTreatment) return
                setProfile({
                  ...profile,
                  treatment_case_counts: [
                    ...(profile.treatment_case_counts || []),
                    { treatment: nextTreatment, completed_cases: null, as_of_year: new Date().getFullYear() },
                  ],
                })
              }}
              disabled={
                (profile.treatment_case_counts || []).length >= 12
                || (
                  supportedTreatments.length > 0
                  && supportedTreatments.every((treatment) => (
                    (profile.treatment_case_counts || []).some((row) => row.treatment === treatment)
                  ))
                )
              }
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="field-treatment_case_counts_add"
            >
              <Plus className="h-4 w-4" />
              Добави лечение
            </button>
          </Field>
        </Section>

        {/* Section 4 — Външни сигнали за доверие */}
        <Section title="Външни сигнали за доверие" testid="section-reviews">
          {(['google', 'facebook', 'superdoc'] as const).map((src) => (
            <div key={src} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <NumInput label={`${src} рейтинг (0-5)`} min={0} max={5} step={0.1}
                value={(profile.review_sources as Record<string, number | null | undefined>)?.[`${src}_rating`]}
                onChange={(v) => setProfile({
                  ...profile,
                  review_sources: { ...(profile.review_sources || {}), [`${src}_rating`]: v },
                })}
                testid={`rev-${src}-rating`}
              />
              <NumInput label={`${src} брой ревюта`} min={0} step={1}
                value={(profile.review_sources as Record<string, number | null | undefined>)?.[`${src}_review_count`]}
                onChange={(v) => setProfile({
                  ...profile,
                  review_sources: { ...(profile.review_sources || {}), [`${src}_review_count`]: v },
                })}
                testid={`rev-${src}-count`}
              />
              <TextInput label={`${src} URL`}
                value={(profile.review_sources as Record<string, string | null | undefined>)?.[`${src}_url`] || ''}
                onChange={(v) => setProfile({
                  ...profile,
                  review_sources: { ...(profile.review_sources || {}), [`${src}_url`]: v },
                })}
                testid={`rev-${src}-url`}
                maxLength={500}
              />
            </div>
          ))}
        </Section>

        {/* Section 5 — Медия URL-и */}
        <Section title="Медия и снимки" testid="section-media">
          <ImageUploadField
            label="Hero изображение (за horeto на профила)"
            value={profile.hero_image_url || ''}
            onChange={(url) => setProfile({ ...profile, hero_image_url: url })}
            hint={visibilityHint(tier, 'hero_image_url')}
            testid="upload-hero-image"
            aspect="landscape"
          />
          <Field label="Clinic video URL" hint={visibilityHint(tier, 'clinic_video_url')}>
            <input value={profile.clinic_video_url || ''} onChange={(e) => setProfile({ ...profile, clinic_video_url: e.target.value })}
              maxLength={500} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-clinic_video_url" />
          </Field>
          <Field label="Doctor video URL" hint={visibilityHint(tier, 'doctor_video_url')}>
            <input value={profile.doctor_video_url || ''} onChange={(e) => setProfile({ ...profile, doctor_video_url: e.target.value })}
              maxLength={500} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-doctor_video_url" />
          </Field>
        </Section>

        {/* Section 6 — Собственик / водещ лекар / екип */}
        <Section title="Собственик / водещ лекар" testid="section-doctor">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUploadField
              label="Снимка на лекаря (spotlight)"
              value={profile.doctor_spotlight_image_url || ''}
              onChange={(url) => setProfile({ ...profile, doctor_spotlight_image_url: url })}
              hint={visibilityHint(tier, 'doctor_spotlight_image_url')}
              testid="upload-doctor-image"
              aspect="portrait"
            />
            <ImageUploadField
              label="Снимка на екипа"
              value={profile.team_image_url || ''}
              onChange={(url) => setProfile({ ...profile, team_image_url: url })}
              hint={visibilityHint(tier, 'team_image_url')}
              testid="upload-team-image"
              aspect="landscape"
            />
          </div>
          <Field label="Кого представяме" hint={visibilityHint(tier, 'doctor_spotlight_kind')}>
            <select
              value={profile.doctor_spotlight_kind || 'lead_doctor'}
              onChange={(e) => setProfile({
                ...profile,
                doctor_spotlight_kind: e.target.value as 'owner' | 'lead_doctor',
              })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              data-testid="field-doctor_spotlight_kind"
            >
              <option value="lead_doctor">Водещ лекар</option>
              <option value="owner">Собственик на клиниката</option>
            </select>
          </Field>
          <Field label="Име на лекар" hint={visibilityHint(tier, 'doctor_spotlight_name')}>
            <input value={profile.doctor_spotlight_name || ''} onChange={(e) => setProfile({ ...profile, doctor_spotlight_name: e.target.value })}
              maxLength={200} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-doctor_spotlight_name" />
          </Field>
          <Field label="Професионална роля / титла" hint={visibilityHint(tier, 'doctor_spotlight_role')}>
            <input value={profile.doctor_spotlight_role || ''} onChange={(e) => setProfile({ ...profile, doctor_spotlight_role: e.target.value })}
              maxLength={200} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-doctor_spotlight_role" />
          </Field>
          <Field label="Специалности (до 8)" hint={visibilityHint(tier, 'doctor_spotlight_specialties')}>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(profile.doctor_spotlight_specialties || []).map((specialty, index) => (
                <span key={specialty} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                  {specialty}
                  <button
                    type="button"
                    onClick={() => setProfile({
                      ...profile,
                      doctor_spotlight_specialties: (profile.doctor_spotlight_specialties || []).filter((_, itemIndex) => itemIndex !== index),
                    })}
                    className="text-teal-500 hover:text-rose-600"
                    aria-label={`Премахни специалност ${specialty}`}
                  >×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={doctorSpecialtyInput}
                onChange={(e) => setDoctorSpecialtyInput(e.target.value)}
                maxLength={80}
                placeholder="напр. Ортодонтия за възрастни"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                data-testid="field-doctor_specialty_input"
              />
              <button
                type="button"
                onClick={() => {
                  const value = doctorSpecialtyInput.trim()
                  const current = profile.doctor_spotlight_specialties || []
                  if (!value || current.length >= 8) return
                  if (current.some((item) => item.toLocaleLowerCase('bg-BG') === value.toLocaleLowerCase('bg-BG'))) return
                  setProfile({ ...profile, doctor_spotlight_specialties: [...current, value] })
                  setDoctorSpecialtyInput('')
                }}
                disabled={(profile.doctor_spotlight_specialties || []).length >= 8}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="field-doctor_specialty_add"
              >+</button>
            </div>
          </Field>
          <Field label="Биография (до 1000)" hint={visibilityHint(tier, 'doctor_spotlight_bio')}>
            <textarea value={profile.doctor_spotlight_bio || ''} onChange={(e) => setProfile({ ...profile, doctor_spotlight_bio: e.target.value })}
              maxLength={1000} rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-doctor_spotlight_bio" />
          </Field>
          <Field
            label="Подход при оценката"
            hint="Описва какво клиниката включва в оценката. Не е специалност, рейтинг или знак за „най-добър лекар“."
          >
            <div className="grid gap-2 sm:grid-cols-2" data-testid="field-assessment_approaches">
              {(Object.entries(ASSESSMENT_APPROACH_LABELS) as Array<[AssessmentApproach, string]>).map(([value, label]) => {
                const checked = (profile.assessment_approaches || []).includes(value)
                return (
                  <label key={value} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${checked ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setProfile({
                        ...profile,
                        assessment_approaches: checked
                          ? (profile.assessment_approaches || []).filter((item) => item !== value)
                          : [...(profile.assessment_approaches || []), value],
                      })}
                      className="mt-0.5 accent-teal-600"
                    />
                    <span>{label}</span>
                  </label>
                )
              })}
            </div>
          </Field>
          <Field label="Бележка за екипа" hint={visibilityHint(tier, 'team_note')}>
            <textarea value={profile.team_note || ''} onChange={(e) => setProfile({ ...profile, team_note: e.target.value })}
              maxLength={500} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-team_note" />
          </Field>
        </Section>

        {/* Section 7 — Growth profile enrichment */}
        <Section title="Разширено съдържание (Growth)" testid="section-premium">
          <ImageUploadField
            label="Снимка на средата / оборудването"
            value={profile.environment_image_url || ''}
            onChange={(url) => setProfile({ ...profile, environment_image_url: url })}
            hint={visibilityHint(tier, 'environment_image_url')}
            testid="upload-environment-image"
            aspect="landscape"
          />
          <Field label="История на клиниката (до 1500)" hint={visibilityHint(tier, 'clinic_story')}>
            <textarea value={profile.clinic_story || ''} onChange={(e) => setProfile({ ...profile, clinic_story: e.target.value })}
              maxLength={1500} rows={5} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-clinic_story" />
          </Field>
          <Field label="Среда / оборудване (до 1000)" hint={visibilityHint(tier, 'environment_description')}>
            <textarea value={profile.environment_description || ''} onChange={(e) => setProfile({ ...profile, environment_description: e.target.value })}
              maxLength={1000} rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-environment_description" />
          </Field>
          <Field label="Процес на консултация (до 1000)" hint={visibilityHint(tier, 'consultation_process')}>
            <textarea value={profile.consultation_process || ''} onChange={(e) => setProfile({ ...profile, consultation_process: e.target.value })}
              maxLength={1000} rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-consultation_process" />
          </Field>
        </Section>

        {/* Section: Алайнер системи / Provider badges */}
        <Section title="Алайнер системи / Provider badges" testid="section-aligner-brands">
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Добавете марките алайнери, с които клиниката работи. Публично
            <strong> &laquo;Официален provider&raquo;</strong> се показва{' '}
            <strong>само</strong> когато статусът е <em>Верифицирано</em>.
            Иначе на профила се показва безопасното &laquo;Работи с …&raquo;.
          </p>
          <div className="space-y-3">
            {brands.map((b, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end"
                data-testid={`brand-row-${i}`}
              >
                <div className="md:col-span-3">
                  <Field label="Марка">
                    <select
                      value={b.brand}
                      onChange={(e) =>
                        setBrands((arr) =>
                          arr.map((x, idx) =>
                            idx === i ? { ...x, brand: e.target.value as AlignerBrandSlug } : x,
                          ),
                        )
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      data-testid={`brand-slug-${i}`}
                    >
                      {ALIGNER_BRAND_OPTIONS.map((o) => (
                        <option key={o.slug} value={o.slug}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                {b.brand === 'other' && (
                  <div className="md:col-span-3">
                    <Field label="Кратко име (за марка ‘Other’, до 60)">
                      <input
                        type="text"
                        value={b.other_label || ''}
                        onChange={(e) =>
                          setBrands((arr) =>
                            arr.map((x, idx) =>
                              idx === i ? { ...x, other_label: e.target.value.slice(0, 60) } : x,
                            ),
                          )
                        }
                        maxLength={60}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        data-testid={`brand-other-label-${i}`}
                        placeholder="Напр. CustomBrand"
                      />
                    </Field>
                  </div>
                )}
                <div className="md:col-span-3">
                  <Field label="Тип отношение">
                    <select
                      value={b.relationship}
                      onChange={(e) =>
                        setBrands((arr) =>
                          arr.map((x, idx) =>
                            idx === i
                              ? { ...x, relationship: e.target.value as AlignerBrandEntry['relationship'] }
                              : x,
                          ),
                        )
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      data-testid={`brand-relationship-${i}`}
                    >
                      {(Object.keys(RELATIONSHIP_LABELS) as AlignerBrandEntry['relationship'][]).map((k) => (
                        <option key={k} value={k}>{RELATIONSHIP_LABELS[k]}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="md:col-span-3">
                  <Field label="Верификация">
                    <select
                      value={b.verification_status}
                      onChange={(e) =>
                        setBrands((arr) =>
                          arr.map((x, idx) =>
                            idx === i
                              ? { ...x, verification_status: e.target.value as AlignerBrandEntry['verification_status'] }
                              : x,
                          ),
                        )
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      data-testid={`brand-verification-${i}`}
                    >
                      {(Object.keys(VERIFICATION_LABELS) as AlignerBrandEntry['verification_status'][]).map((k) => (
                        <option key={k} value={k}>{VERIFICATION_LABELS[k]}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="md:col-span-12 flex items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={b.visible}
                      onChange={(e) =>
                        setBrands((arr) =>
                          arr.map((x, idx) => (idx === i ? { ...x, visible: e.target.checked } : x)),
                        )
                      }
                      data-testid={`brand-visible-${i}`}
                    />
                    Показвай публично
                  </label>
                  {b.relationship === 'official_provider' && b.verification_status !== 'verified' && (
                    <span className="text-[11px] text-amber-700 bg-amber-50 ring-1 ring-amber-100 rounded-full px-2 py-0.5">
                      Публичното &laquo;официален&raquo; ще се покаже едва след
                      &laquo;Верифицирано&raquo;.
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setBrands((arr) => arr.filter((_, idx) => idx !== i))}
                    className="ml-auto inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-xs"
                    data-testid={`brand-remove-${i}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Премахни
                  </button>
                </div>
              </div>
            ))}
            {brands.length < 12 && (
              <button
                type="button"
                onClick={() =>
                  setBrands((arr) => [
                    ...arr,
                    {
                      brand: 'invisalign',
                      relationship: 'offered',
                      verification_status: 'unverified',
                      visible: true,
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-sm"
                data-testid="brand-add"
              >
                <Plus className="w-3.5 h-3.5" /> Добави марка
              </button>
            )}
          </div>
        </Section>

        {/* Section 8 — Библиотека със случаи */}
        <Section title="Библиотека със случаи" testid="section-cases">
          <CaseLibraryEditor
            cases={cases as EditorCaseRow[]}
            onChange={(updater) => setCases((arr) => updater(arr as EditorCaseRow[]) as CaseRow[])}
            visibilityHint={visibilityHint(tier, 'case_library')}
          />
        </Section>
      </div>

      {/* Sticky bottom save bar for long pages */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-slate-500 truncate">
          Tier: <span className="font-medium text-slate-700">{TIER_LABELS.find((t) => t.value === tier)?.label}</span> ·
          Статус: <span className="font-medium text-slate-700">{profile.profile_status === 'published' ? 'Публикуван' : 'Чернова'}</span>
        </div>
        <button
          type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
          data-testid="admin-clinic-save-sticky"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Запис…' : 'Запази промените'}
        </button>
      </div>
    </main>
  )
}

/* ──────────────── small primitives ──────────────── */

function Section({ title, testid, children }: { title: string; testid: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3" data-testid={testid}>
      <h2 className="font-serif text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-700 mb-1">{label}</label>
      {children}
      {hint && (
        <p className="mt-1 text-[11px] text-amber-700 italic">{hint}</p>
      )}
    </div>
  )
}

function TextInput({
  label, value, onChange, maxLength, testid,
}: {
  label: string; value: string; onChange: (v: string) => void;
  maxLength?: number; testid?: string;
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" data-testid={testid} />
    </label>
  )
}

function NumInput({
  label, value, onChange, min, max, step, testid,
}: {
  label: string; value: number | null | undefined; onChange: (v: number | null) => void;
  min?: number; max?: number; step?: number; testid?: string;
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <input
        type="number" min={min} max={max} step={step}
        value={value === null || value === undefined ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
        data-testid={testid}
      />
    </label>
  )
}
