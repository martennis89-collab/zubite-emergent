'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, FileText, Building2, Users,
  CheckCircle, XCircle, X, Clock, Search, ChevronLeft,
  Globe, MapPin, Phone, Mail, Calendar, Shield, Target,
  MessageSquare, Save, ArrowLeft, KeyRound, Copy, Check,
  Layers, BadgeCheck, Plus, Ban, ShieldCheck, Sparkles, AlertTriangle,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

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

interface ClinicApplication {
  id: string
  clinic_name: string
  city: string
  address?: string | null
  district_slug?: string | null
  website: string | null
  contact_name: string
  phone: string
  email: string
  package_interest?: 'verified_profile' | 'growth_partner' | 'unsure'
  clinic_size?: 'solo' | 'small' | 'medium' | 'large' | null
  partnership_goal?: 'qualified_consultations' | 'trusted_profile' | 'patient_communication' | 'market_insight' | 'exploring' | null
  partnership_motivation?: string | null
  contact_consent?: boolean
  offers_aligners: boolean
  offers_braces: boolean
  offers_implants: boolean
  treats_adults: boolean
  treats_children: boolean
  treatments_supported?: string[]
  treatment_focus?: string[]
  short_description?: string | null
  google_url?: string | null
  facebook_url?: string | null
  superdoc_url?: string | null
  aligner_brands?: string[]
  claimed_official_provider_brands?: string[]
  founded_year?: number | null
  patient_intro?: string | null
  treatment_case_counts?: Array<{ treatment: string; completed_cases: number; as_of_year?: number | null }>
  doctor_spotlight_kind?: 'owner' | 'lead_doctor' | null
  doctor_spotlight_name?: string | null
  doctor_spotlight_role?: string | null
  doctor_spotlight_specialties?: string[]
  doctor_spotlight_bio?: string | null
  assessment_approaches?: string[]
  team_note?: string | null
  clinic_story?: string | null
  environment_description?: string | null
  consultation_process?: string | null
  hero_image_url?: string | null
  doctor_spotlight_image_url?: string | null
  team_image_url?: string | null
  environment_image_url?: string | null
  clinic_video_url?: string | null
  doctor_video_url?: string | null
  case_library_summary?: string | null
  case_media_url?: string | null
  patient_consent_available?: boolean | null
  years_experience: number | null
  number_of_cases_per_month: string | null
  do_you_use_digital_scans: boolean | null
  what_types_of_patients_are_best_for_you: string | null
  average_response_time: string | null
  wants_online_booking?: boolean | null
  wants_viber_contact?: boolean | null
  viber_phone?: string | null
  status: string
  notes: string
  created_at: string
  source?: string | null
  intake_label?: string | null
}

interface ClinicIntakeInvite {
  id: string
  clinic_label: string
  contact_email?: string | null
  status: 'pending' | 'submitted' | 'expired' | 'revoked' | 'submitting'
  token_hint?: string | null
  created_at: string
  expires_at?: string | null
  submitted_at?: string | null
  application_id?: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Изчаква', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  approved: { label: 'Одобрена', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  rejected: { label: 'Отхвърлена', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  waiting_list: { label: 'Лист на чакащите', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
}

const RESPONSE_TIME_LABELS: Record<string, string> = {
  '<1h': 'Под 1 час',
  '1-6h': '1 – 6 часа',
  '24h': 'До 24 часа',
  '>24h': 'Над 24 часа',
}

const PACKAGE_INTEREST_LABELS: Record<string, string> = {
  verified_profile: 'Verified Profile',
  growth_partner: 'Growth Partner',
  unsure: 'Не е сигурна',
}

const CLINIC_SIZE_LABELS: Record<string, string> = {
  solo: '1 лекар · индивидуална практика',
  small: '2–4 лекари · малък екип',
  medium: '5–9 лекари · развита клиника',
  large: '10+ лекари · голям екип',
}

const PARTNERSHIP_GOAL_LABELS: Record<string, string> = {
  qualified_consultations: 'Повече подходящи запитвания и консултации',
  trusted_profile: 'По-пълен и надежден публичен профил',
  patient_communication: 'По-добра комуникация с пациентите',
  market_insight: 'Данни за интереса и поведението на пациентите',
  exploring: 'Проучва възможностите за партньорство',
}

const ASSESSMENT_APPROACH_LABELS: Record<string, string> = {
  airway_breathing: 'Дишане и дихателни пътища',
  swallowing_orofacial: 'Преглъщане и орофациални навици',
  speech_articulation: 'Говор и артикулация',
  posture_balance: 'Стойка и мускулен баланс',
  facial_asymmetry: 'Лицева асиметрия',
  functional_orthodontics: 'Функционален ортодонтски подход',
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`} data-testid={`status-badge-${status}`}>
      {cfg.label}
    </span>
  )
}

function ServiceTags({ app }: { app: ClinicApplication }) {
  const tags: string[] = []
  if (app.offers_aligners) tags.push('Алайнери')
  if (app.offers_braces) tags.push('Брекети')
  if (app.offers_implants) tags.push('Импланти')
  for (const treatment of app.treatments_supported || []) {
    if (!tags.some((tag) => tag.toLocaleLowerCase('bg-BG') === treatment.toLocaleLowerCase('bg-BG'))) {
      tags.push(treatment)
    }
  }
  if (tags.length === 0) return <span className="text-slate-400 text-sm">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(t => (
        <span key={t} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{t}</span>
      ))}
    </div>
  )
}

const INTAKE_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Очаква попълване', className: 'bg-amber-50 text-amber-700' },
  submitting: { label: 'Изпраща се', className: 'bg-sky-50 text-sky-700' },
  submitted: { label: 'Получена', className: 'bg-emerald-50 text-emerald-700' },
  expired: { label: 'Изтекъл', className: 'bg-slate-100 text-slate-600' },
  revoked: { label: 'Деактивиран', className: 'bg-rose-50 text-rose-700' },
}

function IntakeInvitePanel({
  invites,
  onChanged,
}: {
  invites: ClinicIntakeInvite[]
  onChanged: () => Promise<void>
}) {
  const [clinicLabel, setClinicLabel] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const createInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/clinic-intake-invites`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_label: clinicLabel,
          contact_email: contactEmail || null,
          expires_in_days: Number(expiresInDays),
        }),
      })
      if (!response.ok) {
        setError('Линкът не беше създаден. Проверете въведените данни.')
        return
      }
      const data = await response.json()
      setCreatedLink(`${window.location.origin}/clinic-intake/${data.token}`)
      setClinicLabel('')
      setContactEmail('')
      await onChanged()
    } catch {
      setError('Възникна грешка при създаването на линка.')
    } finally {
      setCreating(false)
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(createdLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const revoke = async (inviteId: string) => {
    const response = await fetch(`${API_URL}/api/admin/clinic-intake-invites/${inviteId}/revoke`, {
      method: 'PATCH',
      credentials: 'include' as RequestCredentials,
    })
    if (response.ok) await onChanged()
  }

  return (
    <section className="mb-8 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200" data-testid="intake-invite-panel">
      <div className="border-b border-slate-100 px-5 py-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          Непублични intake линкове
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
          Създайте защитен линк за конкретна клиника. Той е еднократен, не се индексира и подадената форма влиза директно в кандидатурите.
        </p>
      </div>

      <form onSubmit={createInvite} className="grid gap-3 bg-slate-50/70 px-5 py-4 md:grid-cols-[1fr_1fr_150px_auto]">
        <label className="text-xs font-medium text-slate-600">
          Име на клиниката
          <input
            required
            minLength={2}
            value={clinicLabel}
            onChange={(event) => setClinicLabel(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            placeholder="Дентална клиника…"
            data-testid="invite-clinic-label"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Имейл за предварително попълване
          <input
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            placeholder="clinic@example.com"
            data-testid="invite-contact-email"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Валиден
          <select
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            data-testid="invite-expiry"
          >
            <option value="7">7 дни</option>
            <option value="14">14 дни</option>
            <option value="30">30 дни</option>
            <option value="60">60 дни</option>
            <option value="90">90 дни</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={creating}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-teal-600 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="create-intake-invite"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Създай линк
        </button>
      </form>

      {error && <p className="px-5 py-3 text-sm text-rose-700" role="alert">{error}</p>}

      {createdLink && (
        <div className="mx-5 my-4 rounded-lg bg-teal-50 p-4 ring-1 ring-teal-200" data-testid="created-intake-link">
          <p className="text-xs font-semibold text-teal-800">Копирайте линка сега — поради сигурност пълният token не се съхранява.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={createdLink} className="h-11 min-w-0 flex-1 rounded-lg bg-white px-3 text-sm text-slate-700 ring-1 ring-teal-200" />
            <button type="button" onClick={copyLink} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800">
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Копиран' : 'Копирай'}
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {invites.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Все още няма създадени линкове.
          </div>
        ) : invites.slice(0, 12).map((invite) => {
          const status = INTAKE_STATUS[invite.status] || INTAKE_STATUS.pending
          return (
            <div key={invite.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center" data-testid={`intake-invite-${invite.id}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{invite.clinic_label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}>{status.label}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {invite.contact_email || 'Без предварително попълнен имейл'}
                  {invite.expires_at ? ` · до ${new Date(invite.expires_at).toLocaleDateString('bg-BG')}` : ''}
                  {invite.token_hint ? ` · token …${invite.token_hint}` : ''}
                </p>
              </div>
              {invite.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => revoke(invite.id)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full px-3 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Деактивирай
                </button>
              )}
              {invite.status === 'submitted' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  В кандидатурите
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// Mirrors TREATMENT_LABELS in backend/clinic_website_prefill.py exactly —
// same duplicated-constant convention as SOFIA_DISTRICTS_ADMIN above.
const PREFILL_TREATMENT_LABELS = [
  'Обща стоматология', 'Ортодонтия', 'Имплантология', 'Естетична стоматология',
  'Детска стоматология', 'Орална хирургия', 'Пародонтология', 'Ендодонтия',
]

interface WebsitePrefillDraft {
  clinic_name: string
  city: string
  address: string
  contact_name: string
  phone: string
  email: string
  offers_aligners: boolean
  offers_braces: boolean
  offers_implants: boolean
  treats_adults: boolean
  treats_children: boolean
  treatments_supported: string[]
  short_description: string
  patient_intro: string
  founded_year?: number | null
  doctor_spotlight_name: string
  doctor_spotlight_role: string
  doctor_spotlight_bio: string
  team_note: string
  clinic_story: string
  environment_description: string
  consultation_process: string
  google_url: string
  facebook_url: string
  review_notes: string
}

function WebsitePrefillPanel({ onSubmitted }: { onSubmitted: () => Promise<void> }) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [crawling, setCrawling] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<WebsitePrefillDraft | null>(null)
  const [crawledPages, setCrawledPages] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/admin/clinic-applications/prefill-status`, { credentials: 'include' as RequestCredentials })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => setEnabled(!!d.enabled))
      .catch(() => setEnabled(false))
  }, [])

  const extract = async (event: React.FormEvent) => {
    event.preventDefault()
    setCrawling(true)
    setError('')
    setDraft(null)
    setSubmitOk(false)
    try {
      const response = await fetch(`${API_URL}/api/admin/clinic-applications/prefill-from-website`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_url: websiteUrl }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body.detail || 'Извличането не бе успешно. Проверете адреса.')
        return
      }
      const data = await response.json()
      setDraft(data.draft)
      setCrawledPages(data.crawled_pages || [])
      setWarnings(data.warnings || [])
    } catch {
      setError('Възникна грешка при свързването със сайта.')
    } finally {
      setCrawling(false)
    }
  }

  const updateDraft = (patch: Partial<WebsitePrefillDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const toggleTreatment = (label: string) => {
    if (!draft) return
    const has = draft.treatments_supported.includes(label)
    updateDraft({
      treatments_supported: has
        ? draft.treatments_supported.filter((t) => t !== label)
        : [...draft.treatments_supported, label],
    })
  }

  const canSubmit = !!draft && !!draft.clinic_name && !!draft.city && !!draft.contact_name && !!draft.phone && !!draft.email

  const submitApplication = async () => {
    if (!draft || !canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/clinic-applications`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          website: websiteUrl,
          contact_consent: true,
          source: 'admin_ai_prefill',
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body.detail || 'Кандидатурата не бе изпратена.')
        return
      }
      setSubmitOk(true)
      setDraft(null)
      setWebsiteUrl('')
      await onSubmitted()
    } catch {
      setError('Възникна грешка при изпращането.')
    } finally {
      setSubmitting(false)
    }
  }

  if (enabled === false) return null // AI prefill not configured — intake links remain the only path.

  return (
    <section className="mb-8 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200" data-testid="website-prefill-panel">
      <div className="border-b border-slate-100 px-5 py-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-teal-600" />
          Попълни от уебсайт (AI)
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
          За клиники с вече съществуващ сайт: извлечете информацията автоматично, прегледайте/редактирайте я и я изпратете
          като кандидатура. За клиники без сайт продължавайте да използвате intake линковете по-горе.
        </p>
      </div>

      <form onSubmit={extract} className="flex flex-col gap-3 bg-slate-50/70 px-5 py-4 sm:flex-row">
        <input
          required
          type="url"
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          placeholder="https://клиника.bg"
          className="h-11 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          data-testid="prefill-website-url"
        />
        <button
          type="submit"
          disabled={crawling || enabled === null}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-teal-600 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="prefill-extract-btn"
        >
          {crawling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {crawling ? 'Извлича се…' : 'Извлечи от сайта'}
        </button>
      </form>
      {crawling && (
        <p className="px-5 pb-3 text-xs text-slate-400">Може да отнеме 15–30 секунди — сайтът се обхожда и AI подготвя чернова.</p>
      )}

      {error && <p className="px-5 py-3 text-sm text-rose-700" role="alert">{error}</p>}

      {submitOk && (
        <p className="mx-5 my-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" data-testid="prefill-submit-success">
          Кандидатурата е изпратена и се появи в таблицата по-долу.
        </p>
      )}

      {draft && (
        <div className="space-y-5 border-t border-slate-100 px-5 py-5" data-testid="prefill-draft-form">
          {draft.review_notes && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{draft.review_notes}</p>
            </div>
          )}
          {crawledPages.length > 0 && (
            <p className="text-xs text-slate-400">Прегледани страници: {crawledPages.join(', ')}</p>
          )}
          {warnings.length > 0 && (
            <ul className="list-inside list-disc text-xs text-slate-400">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Име на клиниката *
              <input required value={draft.clinic_name} onChange={(e) => updateDraft({ clinic_name: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Град *
              <input required value={draft.city || ''} onChange={(e) => updateDraft({ city: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <label className="text-xs font-medium text-slate-600 sm:col-span-2">
              Адрес
              <input value={draft.address || ''} onChange={(e) => updateDraft({ address: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Лице за контакт *
              <input required value={draft.contact_name || ''} onChange={(e) => updateDraft({ contact_name: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Телефон *
              <input required value={draft.phone || ''} onChange={(e) => updateDraft({ phone: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <label className="text-xs font-medium text-slate-600 sm:col-span-2">
              Имейл *
              <input required type="email" value={draft.email || ''} onChange={(e) => updateDraft({ email: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Услуги</p>
            <div className="flex flex-wrap gap-2">
              {PREFILL_TREATMENT_LABELS.map((label) => {
                const active = draft.treatments_supported.includes(label)
                return (
                  <button
                    type="button"
                    key={label}
                    onClick={() => toggleTreatment(label)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { key: 'offers_aligners', label: 'Алайнери' },
              { key: 'offers_braces', label: 'Брекети' },
              { key: 'offers_implants', label: 'Импланти' },
              { key: 'treats_adults', label: 'Възрастни' },
              { key: 'treats_children', label: 'Деца' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!draft[key as keyof WebsitePrefillDraft]}
                  onChange={(e) => updateDraft({ [key]: e.target.checked } as Partial<WebsitePrefillDraft>)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                {label}
              </label>
            ))}
          </div>

          {([
            ['short_description', 'Кратко описание', 2],
            ['patient_intro', 'Обръщение към пациента', 2],
            ['clinic_story', 'История на клиниката', 3],
            ['environment_description', 'Среда / оборудване', 3],
            ['consultation_process', 'Процес на консултация', 3],
            ['team_note', 'Бележка за екипа', 2],
          ] as Array<[keyof WebsitePrefillDraft, string, number]>).map(([key, label, rows]) => (
            <label key={key} className="block text-xs font-medium text-slate-600">
              {label}
              <textarea
                rows={rows}
                value={(draft[key] as string) || ''}
                onChange={(e) => updateDraft({ [key]: e.target.value } as Partial<WebsitePrefillDraft>)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </label>
          ))}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-slate-600">
              Година на основаване
              <input type="number" value={draft.founded_year ?? ''} onChange={(e) => updateDraft({ founded_year: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Име на лекар
              <input value={draft.doctor_spotlight_name || ''} onChange={(e) => updateDraft({ doctor_spotlight_name: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Роля / титла
              <input value={draft.doctor_spotlight_role || ''} onChange={(e) => updateDraft({ doctor_spotlight_role: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
          </div>
          <label className="block text-xs font-medium text-slate-600">
            Биография на лекаря
            <textarea rows={2} value={draft.doctor_spotlight_bio || ''} onChange={(e) => updateDraft({ doctor_spotlight_bio: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Google профил
              <input value={draft.google_url || ''} onChange={(e) => updateDraft({ google_url: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Facebook страница
              <input value={draft.facebook_url || ''} onChange={(e) => updateDraft({ facebook_url: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">{!canSubmit && 'Попълнете полетата, отбелязани с *, преди изпращане.'}</p>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={submitApplication}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="prefill-submit-btn"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Изпрати като кандидатура
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Detail View ─────────────────────────────────────────
function DetailView({ app, onClose, onUpdate }: {
  app: ClinicApplication
  onClose: () => void
  onUpdate: (id: string, data: { status?: string; notes?: string; district_slug?: string }) => Promise<{ clinic_credentials?: { email: string; temporary_password: string } } | null>
}) {
  const [notes, setNotes] = useState(app.notes || '')
  const [district, setDistrict] = useState(app.district_slug || '')
  const [saving, setSaving] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(app.status)
  const [credentials, setCredentials] = useState<{ email: string; temporary_password: string } | null>(null)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenResult, setRegenResult] = useState<{ email: string; password: string; email_sent: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleRegeneratePassword = async () => {
    setRegenLoading(true)
    setRegenResult(null)
    try {
      const res = await fetch(`${API_URL}/api/admin/clinic-applications/${app.id}/regenerate-password`, {
        method: 'POST', credentials: 'include' as RequestCredentials,})
      if (res.ok) {
        const data = await res.json()
        setRegenResult({ email: data.credentials.email, password: data.credentials.password, email_sent: data.email_sent })
      }
    } catch (e) { /* silent */ }
    setRegenLoading(false)
  }

  const copyPassword = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true)
    setCurrentStatus(newStatus)
    const result = await onUpdate(app.id, { status: newStatus })
    if (result?.clinic_credentials) {
      setCredentials(result.clinic_credentials)
    }
    setSaving(false)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    await onUpdate(app.id, { notes, district_slug: district })
    setSaving(false)
  }

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ElementType }) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-8 pb-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()} data-testid="application-detail-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900" data-testid="detail-clinic-name">{app.clinic_name}</h2>
            <p className="text-sm text-slate-500">{app.city} &middot; {new Date(app.created_at).toLocaleDateString('bg-BG')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" data-testid="close-detail-btn">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Buttons */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Статус</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  disabled={saving}
                  onClick={() => handleStatusChange(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    currentStatus === key
                      ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-current`
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  data-testid={`status-btn-${key}`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Credentials Alert (shown after approval) */}
          {credentials && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200" data-testid="credentials-alert">
              <p className="text-sm font-semibold text-emerald-800 mb-2">Акаунт за клиника е създаден</p>
              <div className="space-y-1 text-sm text-emerald-700">
                <p>Имейл: <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{credentials.email}</code></p>
                <p>Парола: <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{credentials.temporary_password}</code></p>
              </div>
              <p className="text-xs text-emerald-600 mt-2">Изпратете тези данни на клиниката. Вход: /clinic</p>
            </div>
          )}

          {/* Regenerate Password (only for approved clinics) */}
          {currentStatus === 'approved' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200" data-testid="regenerate-password-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-medium text-slate-700">Парола за клиника</p>
                </div>
                <button
                  onClick={handleRegeneratePassword}
                  disabled={regenLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  data-testid="regenerate-password-btn"
                >
                  {regenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Генерирай нова парола
                </button>
              </div>
              {regenResult && (
                <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg" data-testid="regenerated-credentials">
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>Имейл: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{regenResult.email}</code></p>
                    <div className="flex items-center gap-2">
                      <p>Парола: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{regenResult.password}</code></p>
                      <button onClick={() => copyPassword(regenResult.password)} className="p-1 hover:bg-slate-100 rounded transition-colors" data-testid="copy-password-btn">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs mt-2 text-slate-500">
                    {regenResult.email_sent ? '✓ Имейл с новата парола е изпратен.' : 'Имейлът не беше изпратен — копирайте паролата ръчно.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Clinic Info */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Клиника
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <InfoRow label="Име" value={app.clinic_name} icon={Building2} />
              <InfoRow label="Източник" value={app.source === 'private_intake' ? `Непубличен intake${app.intake_label ? ` · ${app.intake_label}` : ''}` : 'Публична кандидатура'} />
              <InfoRow label="Град" value={app.city} icon={MapPin} />
              <InfoRow label="Адрес" value={app.address} icon={MapPin} />
              <InfoRow label="Уебсайт" value={app.website} icon={Globe} />
              <InfoRow label="Размер на екипа" value={app.clinic_size ? (CLINIC_SIZE_LABELS[app.clinic_size] || app.clinic_size) : null} icon={Users} />
              <label className="block mt-2">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Квартал (само за София)</span>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  data-testid="district-select"
                >
                  <option value="">— не е зададено —</option>
                  {SOFIA_DISTRICTS_ADMIN.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Контакт
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <InfoRow label="Лице" value={app.contact_name} icon={Users} />
              <InfoRow label="Телефон" value={app.phone} icon={Phone} />
              <InfoRow label="Имейл" value={app.email} icon={Mail} />
            </div>
          </div>

          {(app.partnership_goal || app.partnership_motivation) && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <MessageSquare className="h-3.5 w-3.5" /> Интерес към партньорство
              </h3>
              <div className="rounded-xl bg-slate-50 p-4">
                <InfoRow
                  label="Основна цел"
                  value={app.partnership_goal ? (PARTNERSHIP_GOAL_LABELS[app.partnership_goal] || app.partnership_goal) : null}
                  icon={Target}
                />
                <InfoRow label="Мотивация" value={app.partnership_motivation} />
                <InfoRow label="Съгласие за контакт" value={app.contact_consent ? 'Да' : 'Не е отбелязано'} />
              </div>
            </div>
          )}

          {/* Services */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Услуги & Пациенти
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Алайнери', value: app.offers_aligners },
                  { label: 'Брекети', value: app.offers_braces },
                  { label: 'Импланти', value: app.offers_implants },
                  { label: 'Възрастни', value: app.treats_adults },
                  { label: 'Деца', value: app.treats_children },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 py-1.5">
                    <span className={`w-2 h-2 rounded-full ${item.value ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-sm ${item.value ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
              <InfoRow label="Други лечения" value={app.treatments_supported?.join(', ')} />
              <InfoRow label="Приоритетни лечения" value={app.treatment_focus?.join(', ')} />
            </div>
          </div>

          {/* Requested package & profile content */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Заявен пакет & профил
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <InfoRow label="Интерес към пакет" value={app.package_interest ? (PACKAGE_INTEREST_LABELS[app.package_interest] || app.package_interest) : null} />
              <InfoRow label="Кратко описание" value={app.short_description} />
              <InfoRow label="Google профил" value={app.google_url} icon={Globe} />
              <InfoRow label="Facebook страница" value={app.facebook_url} icon={Globe} />
              <InfoRow label="Superdoc профил" value={app.superdoc_url} icon={Globe} />
              <InfoRow label="Алайнер системи" value={app.aligner_brands?.join(', ')} />
              <InfoRow label="Заявен official provider" value={app.claimed_official_provider_brands?.join(', ')} />
            </div>
          </div>

          {(app.package_interest === 'growth_partner' || app.package_interest === 'unsure' || app.patient_intro || app.doctor_spotlight_name) && (
            <>
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <BadgeCheck className="w-3.5 h-3.5" /> Growth профил
                </h3>
                <div className="bg-slate-50 rounded-xl p-4">
                  <InfoRow label="Година на основаване" value={app.founded_year?.toString()} />
                  <InfoRow label="Обръщение към пациента" value={app.patient_intro} />
                  <InfoRow
                    label="Завършени случаи по лечение"
                    value={app.treatment_case_counts?.map((row) => `${row.treatment}: ${row.completed_cases}${row.as_of_year ? ` (${row.as_of_year})` : ''}`).join(' · ')}
                  />
                  <InfoRow label="Представяме" value={app.doctor_spotlight_kind === 'owner' ? 'Собственик' : app.doctor_spotlight_kind === 'lead_doctor' ? 'Водещ лекар' : null} />
                  <InfoRow label="Име на лекар" value={app.doctor_spotlight_name} />
                  <InfoRow label="Роля / титла" value={app.doctor_spotlight_role} />
                  <InfoRow label="Специалности" value={app.doctor_spotlight_specialties?.join(', ')} />
                  <InfoRow label="Биография" value={app.doctor_spotlight_bio} />
                  <InfoRow label="Подход при оценката" value={app.assessment_approaches?.map((item) => ASSESSMENT_APPROACH_LABELS[item] || item).join(', ')} />
                  <InfoRow label="Бележка за екипа" value={app.team_note} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> История, среда & процес
                </h3>
                <div className="bg-slate-50 rounded-xl p-4">
                  <InfoRow label="История на клиниката" value={app.clinic_story} />
                  <InfoRow label="Среда / оборудване" value={app.environment_description} />
                  <InfoRow label="Процес на консултация" value={app.consultation_process} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" /> Медия & библиотека със случаи
                </h3>
                <div className="bg-slate-50 rounded-xl p-4">
                  <InfoRow label="Hero изображение" value={app.hero_image_url} />
                  <InfoRow label="Снимка на лекаря" value={app.doctor_spotlight_image_url} />
                  <InfoRow label="Снимка на екипа" value={app.team_image_url} />
                  <InfoRow label="Снимка на средата" value={app.environment_image_url} />
                  <InfoRow label="Видео на клиниката" value={app.clinic_video_url} />
                  <InfoRow label="Видео на лекаря" value={app.doctor_video_url} />
                  <InfoRow label="Описание на налични случаи" value={app.case_library_summary} />
                  <InfoRow label="Папка със снимки" value={app.case_media_url} />
                  <InfoRow label="Документирано съгласие" value={app.patient_consent_available === true ? 'Да' : app.patient_consent_available === false ? 'Не' : null} />
                </div>
              </div>
            </>
          )}

          {/* Qualification */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Квалификация
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <InfoRow label="Години опит" value={app.years_experience?.toString()} />
              <InfoRow label="Случаи / месец" value={app.number_of_cases_per_month} />
              <InfoRow label="Дигитални сканове" value={app.do_you_use_digital_scans === true ? 'Да' : app.do_you_use_digital_scans === false ? 'Не' : null} />
            </div>
          </div>

          {/* Positioning & Operations */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Позициониране & Операции
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <InfoRow label="Тип пациенти" value={app.what_types_of_patients_are_best_for_you} />
              <InfoRow label="Време за отговор" value={app.average_response_time ? (RESPONSE_TIME_LABELS[app.average_response_time] || app.average_response_time) : null} icon={Clock} />
              <InfoRow label="Желае онлайн записване" value={app.wants_online_booking === true ? 'Да' : app.wants_online_booking === false ? 'Не' : null} />
              <InfoRow label="Желае Viber контакт" value={app.wants_viber_contact === true ? 'Да' : app.wants_viber_contact === false ? 'Не' : null} />
              <InfoRow label="Viber телефон" value={app.viber_phone} icon={Phone} />
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Бележки (само за админ)</h3>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors outline-none resize-none"
              placeholder="Добави бележка..."
              data-testid="admin-notes-input"
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              data-testid="save-notes-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Запази бележка
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────
export default function ClinicApplicationsPage() {
  const [applications, setApplications] = useState<ClinicApplication[]>([])
  const [intakeInvites, setIntakeInvites] = useState<ClinicIntakeInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<ClinicApplication | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const fetchApplications = useCallback(async () => {
    try {
      const [res, inviteRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/clinic-applications`, {
          credentials: 'include' as RequestCredentials,
        }),
        fetch(`${API_URL}/api/admin/clinic-intake-invites`, {
          credentials: 'include' as RequestCredentials,
        }),
      ])
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          try { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') } catch { /* noop */ }
          router.push('/admin')
        }
        return
      }
      const data = await res.json()
      setApplications(data.applications || [])
      if (inviteRes.ok) {
        const inviteData = await inviteRes.json()
        setIntakeInvites(inviteData.invites || [])
      }
    } catch (err) {
      console.error('Failed to fetch applications', err)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const handleUpdate = async (id: string, data: { status?: string; notes?: string; district_slug?: string }): Promise<{ clinic_credentials?: { email: string; temporary_password: string } } | null> => {
    try {
      const res = await fetch(`${API_URL}/api/admin/clinic-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), credentials: 'include' as RequestCredentials,})
      if (res.ok) {
        const result = await res.json()
        if (result.clinic_account_created) {
          setMessage({ type: 'success', text: `Акаунт за клиника е създаден. Парола: ${result.clinic_credentials.temporary_password}` })
        } else {
          setMessage({ type: 'success', text: data.status ? `Статусът е обновен на "${STATUS_CONFIG[data.status]?.label}"` : 'Бележката е запазена' })
        }
        setApplications(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
        if (selectedApp?.id === id) {
          setSelectedApp(prev => prev ? { ...prev, ...data } : prev)
        }
        return result
      }
      // A refused change -- approving an application whose email already
      // belongs to a clinic, for one -- used to fall through here with no
      // message at all, so the click looked like it had simply done nothing.
      const body = await res.json().catch(() => ({}))
      setMessage({ type: 'error', text: typeof body.detail === 'string' ? body.detail : 'Грешка при обновяване' })
    } catch {
      setMessage({ type: 'error', text: 'Грешка при обновяване' })
    }
    return null
  }

  const filtered = applications.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      return (
        a.clinic_name.toLowerCase().includes(s) ||
        a.contact_name.toLowerCase().includes(s) ||
        a.city.toLowerCase().includes(s) ||
        a.email.toLowerCase().includes(s)
      )
    }
    return true
  })

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    waiting_list: applications.filter(a => a.status === 'waiting_list').length,
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FCFAF8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8]" data-testid="clinic-applications-page">
      <AdminHeader pageTitle="Кандидатури за клиники" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900" data-testid="page-title">Кандидатури от клиники</h1>
            <p className="text-sm text-slate-500 mt-1">{counts.all} общо &middot; {counts.pending} изчакват</p>
          </div>
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Към лийдовете
          </Link>
        </div>

        <IntakeInvitePanel invites={intakeInvites} onChanged={fetchApplications} />
        <WebsitePrefillPanel onSubmitted={fetchApplications} />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { key: '', label: 'Всички', count: counts.all, color: 'bg-slate-50 border-slate-200 text-slate-700' },
            { key: 'pending', label: 'Изчакват', count: counts.pending, color: 'bg-amber-50 border-amber-200 text-amber-700' },
            { key: 'approved', label: 'Одобрени', count: counts.approved, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { key: 'rejected', label: 'Отхвърлени', count: counts.rejected, color: 'bg-red-50 border-red-200 text-red-700' },
            { key: 'waiting_list', label: 'Чакащи', count: counts.waiting_list, color: 'bg-teal-50 border-teal-200 text-teal-700' },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setFilterStatus(s.key)}
              className={`p-4 rounded-xl border text-left transition-all ${filterStatus === s.key ? `${s.color} ring-2 ring-offset-1 ring-current` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
              data-testid={`filter-${s.key || 'all'}`}
            >
              <p className="text-2xl font-semibold">{s.count}</p>
              <p className="text-xs mt-1">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Търси по име на клиника, контакт, град или имейл..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors outline-none"
            data-testid="search-input"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="applications-table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Клиника</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Град</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Контакт</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Услуги</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Статус</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Дата</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400" data-testid="empty-state">
                      {searchTerm || filterStatus ? 'Няма намерени резултати' : 'Няма кандидатури'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(app => (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      data-testid={`row-${app.id}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 text-sm">{app.clinic_name}</p>
                        {app.source === 'private_intake' && (
                          <span className="mt-1 inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                            private intake
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{app.city}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-800">{app.contact_name}</p>
                        <p className="text-xs text-slate-400">{app.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <ServiceTags app={app} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-500">{new Date(app.created_at).toLocaleDateString('bg-BG')}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedApp && (
        <DetailView
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={handleUpdate}
        />
      )}
    </main>
  )
}
