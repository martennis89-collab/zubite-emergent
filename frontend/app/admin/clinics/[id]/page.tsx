'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Save, Plus, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type Tier = 'standard' | 'featured' | 'premium'
type ProfileStatus = 'draft' | 'published'

interface CaseRow {
  id?: string
  title: string
  category: string
  summary: string
  status: ProfileStatus
  consent_confirmed: boolean
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

interface ClinicProfile {
  profile_status: ProfileStatus
  short_description?: string
  patient_intro?: string
  treatment_focus?: string[]
  hero_image_url?: string
  clinic_video_url?: string
  doctor_video_url?: string
  doctor_spotlight_name?: string
  doctor_spotlight_role?: string
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
  { value: 'standard', label: 'Standard партньор' },
  { value: 'featured', label: 'Featured партньор' },
  { value: 'premium',  label: 'Premium партньор'  },
]

// Tier visibility helpers — drives the inline "not publicly visible" hints
// in admin so editors understand why a field they're typing won't surface.
const VISIBILITY: Record<string, Tier[]> = {
  short_description:        ['standard', 'featured', 'premium'],
  treatment_focus:          ['standard', 'featured', 'premium'],
  review_sources:           ['standard', 'featured', 'premium'],
  patient_intro:            ['featured', 'premium'],
  hero_image_url:           ['premium'],
  clinic_video_url:         ['premium'],
  doctor_video_url:         ['premium'],
  doctor_spotlight_name:    ['premium'],
  doctor_spotlight_role:    ['premium'],
  doctor_spotlight_bio:     ['premium'],
  team_note:                ['premium'],
  clinic_story:             ['premium'],
  environment_description:  ['premium'],
  consultation_process:     ['premium'],
  case_library:             ['premium'],
}

function visibilityHint(tier: Tier, field: keyof typeof VISIBILITY): string | null {
  const allowed = VISIBILITY[field]
  if (allowed.includes(tier)) return null
  if (allowed.includes('premium') && !allowed.includes('featured')) {
    return 'Това поле ще се вижда публично само при Premium профил.'
  }
  return 'Това поле няма да се вижда публично при Standard профил.'
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
  const [clinicName, setClinicName] = useState('')

  const [profile, setProfile] = useState<ClinicProfile>({ profile_status: 'draft' })
  const [focusInput, setFocusInput] = useState('')
  const [cases, setCases] = useState<CaseRow[]>([])
  const caseKeyRef = useRef<number>(0)
  const [brands, setBrands] = useState<AlignerBrandEntry[]>([])

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
      const rawTier = (c.partner_tier || (c.is_premium ? 'premium' : c.is_featured ? 'featured' : 'standard')) as Tier
      setTier(rawTier)
      setTierBeforeSave(rawTier)
      const p: ClinicProfile = c.clinic_profile || { profile_status: 'draft' }
      setProfile({
        profile_status: (p.profile_status as ProfileStatus) || 'draft',
        short_description: p.short_description || '',
        patient_intro: p.patient_intro || '',
        treatment_focus: p.treatment_focus || [],
        hero_image_url: p.hero_image_url || '',
        clinic_video_url: p.clinic_video_url || '',
        doctor_video_url: p.doctor_video_url || '',
        doctor_spotlight_name: p.doctor_spotlight_name || '',
        doctor_spotlight_role: p.doctor_spotlight_role || '',
        doctor_spotlight_bio: p.doctor_spotlight_bio || '',
        team_note: p.team_note || '',
        clinic_story: p.clinic_story || '',
        environment_description: p.environment_description || '',
        consultation_process: p.consultation_process || '',
        review_sources: p.review_sources || {},
      })
      setCases(
        (p.case_library || []).map((c, i) => ({
          id: c.id,
          title: c.title || '',
          category: c.category || '',
          summary: c.summary || '',
          status: (c.status as ProfileStatus) || 'draft',
          consent_confirmed: !!c.consent_confirmed,
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
          treatment_focus: (profile.treatment_focus || []).filter(Boolean),
          hero_image_url: profile.hero_image_url || null,
          clinic_video_url: profile.clinic_video_url || null,
          doctor_video_url: profile.doctor_video_url || null,
          doctor_spotlight_name: profile.doctor_spotlight_name || null,
          doctor_spotlight_role: profile.doctor_spotlight_role || null,
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

        {/* Section 1 — Партньорски статус */}
        <Section title="Партньорски статус" testid="section-partner-status">
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Партньорският статус контролира видимостта и дълбочината на публичния
            профил. Не означава медицински рейтинг или гаранция за качество.
          </p>
          <div className="flex flex-wrap gap-2">
            {TIER_LABELS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTier(t.value)}
                className={
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors ' +
                  (tier === t.value
                    ? t.value === 'premium'
                      ? 'bg-violet-600 text-white'
                      : t.value === 'featured'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                }
                data-testid={`tier-${t.value}`}
                aria-pressed={tier === t.value}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tier !== tierBeforeSave && (
            <p className="mt-3 text-xs text-amber-700" data-testid="tier-pending">
              Промяната ще се запази след клик на „Запази".
            </p>
          )}
        </Section>

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
          <Field label="Фокус на лечение (до 12 елемента)" hint={visibilityHint(tier, 'treatment_focus')}>
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
                placeholder="напр. aligners"
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
        <Section title="Медия URL-и" testid="section-media">
          <Field label="Hero image URL" hint={visibilityHint(tier, 'hero_image_url')}>
            <input value={profile.hero_image_url || ''} onChange={(e) => setProfile({ ...profile, hero_image_url: e.target.value })}
              maxLength={500} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-hero_image_url" />
          </Field>
          <Field label="Clinic video URL" hint={visibilityHint(tier, 'clinic_video_url')}>
            <input value={profile.clinic_video_url || ''} onChange={(e) => setProfile({ ...profile, clinic_video_url: e.target.value })}
              maxLength={500} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-clinic_video_url" />
          </Field>
          <Field label="Doctor video URL" hint={visibilityHint(tier, 'doctor_video_url')}>
            <input value={profile.doctor_video_url || ''} onChange={(e) => setProfile({ ...profile, doctor_video_url: e.target.value })}
              maxLength={500} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-doctor_video_url" />
          </Field>
        </Section>

        {/* Section 6 — Лекар / екип */}
        <Section title="Лекар / екип" testid="section-doctor">
          <Field label="Име на лекар" hint={visibilityHint(tier, 'doctor_spotlight_name')}>
            <input value={profile.doctor_spotlight_name || ''} onChange={(e) => setProfile({ ...profile, doctor_spotlight_name: e.target.value })}
              maxLength={200} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-doctor_spotlight_name" />
          </Field>
          <Field label="Роля" hint={visibilityHint(tier, 'doctor_spotlight_role')}>
            <input value={profile.doctor_spotlight_role || ''} onChange={(e) => setProfile({ ...profile, doctor_spotlight_role: e.target.value })}
              maxLength={200} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-doctor_spotlight_role" />
          </Field>
          <Field label="Биография (до 1000)" hint={visibilityHint(tier, 'doctor_spotlight_bio')}>
            <textarea value={profile.doctor_spotlight_bio || ''} onChange={(e) => setProfile({ ...profile, doctor_spotlight_bio: e.target.value })}
              maxLength={1000} rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-doctor_spotlight_bio" />
          </Field>
          <Field label="Бележка за екипа" hint={visibilityHint(tier, 'team_note')}>
            <textarea value={profile.team_note || ''} onChange={(e) => setProfile({ ...profile, team_note: e.target.value })}
              maxLength={500} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="field-team_note" />
          </Field>
        </Section>

        {/* Section 7 — Premium съдържание */}
        <Section title="Premium съдържание" testid="section-premium">
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
          <p className="text-xs text-slate-500 mb-3">
            Само текст. Без снимки. Без имена на пациенти. Публикуван случай
            изисква потвърдено съгласие. {visibilityHint(tier, 'case_library')}
          </p>
          <div className="space-y-3">
            {cases.map((row, i) => (
              <div key={row._key} className="rounded-lg border border-slate-200 p-3 space-y-2" data-testid={`case-row-${i}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <TextInput label="Заглавие" maxLength={120} value={row.title} testid={`case-title-${i}`}
                    onChange={(v) => setCases((arr) => arr.map((r, idx) => idx === i ? { ...r, title: v } : r))} />
                  <TextInput label="Категория" maxLength={80} value={row.category} testid={`case-category-${i}`}
                    onChange={(v) => setCases((arr) => arr.map((r, idx) => idx === i ? { ...r, category: v } : r))} />
                </div>
                <Field label="Описание (до 700)">
                  <textarea value={row.summary} onChange={(e) => setCases((arr) => arr.map((r, idx) => idx === i ? { ...r, summary: e.target.value } : r))}
                    maxLength={700} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid={`case-summary-${i}`} />
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={row.consent_confirmed}
                      onChange={(e) => setCases((arr) => arr.map((r, idx) => idx === i ? { ...r, consent_confirmed: e.target.checked } : r))}
                      data-testid={`case-consent-${i}`} />
                    Потвърдено съгласие от пациента
                  </label>
                  <select value={row.status} onChange={(e) => setCases((arr) => arr.map((r, idx) => idx === i ? { ...r, status: e.target.value as ProfileStatus } : r))}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs" data-testid={`case-status-${i}`}>
                    <option value="draft">Чернова</option>
                    <option value="published" disabled={!row.consent_confirmed}>Публикуван</option>
                  </select>
                  <button type="button" onClick={() => setCases((arr) => arr.filter((_, idx) => idx !== i))}
                    className="ml-auto inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-xs" data-testid={`case-remove-${i}`}>
                    <Trash2 className="w-3.5 h-3.5" /> Премахни
                  </button>
                </div>
              </div>
            ))}
            {cases.length < 12 && (
              <button type="button" onClick={() => setCases((arr) => [...arr, {
                title: '', category: '', summary: '', status: 'draft' as ProfileStatus,
                consent_confirmed: false, _key: ++caseKeyRef.current,
              }])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-sm" data-testid="case-add">
                <Plus className="w-3.5 h-3.5" /> Добави случай
              </button>
            )}
          </div>
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
