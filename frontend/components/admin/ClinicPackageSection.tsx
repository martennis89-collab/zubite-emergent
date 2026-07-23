'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Package, Loader2, AlertTriangle, ShieldCheck, Plus, Trash2,
  CheckCircle2, XCircle, Edit3,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type BasePackage = 'verified_profile' | 'growth_partner'
type FoundingStatus = 'none' | 'founding_growth' | 'strategic_private'
type BillingStatus = 'trial' | 'active' | 'past_due' | 'paused' | 'cancelled'
type BillingCadence = 'yearly' | 'custom_private'

const BASE_PACKAGE_LABEL: Record<BasePackage, string> = {
  verified_profile: 'Verified Profile',
  growth_partner:   'Growth Partner',
}
const FOUNDING_LABEL: Record<FoundingStatus, string> = {
  none:              '—',
  founding_growth:   'Founding Growth (€149 × 6м)',
  strategic_private: 'Strategic Private (Legacy Authority)',
}

const PACKAGE_DEFAULTS: Record<BasePackage, {
  monthly: number; annual: number; onboarding: number; cadence: BillingCadence
}> = {
  verified_profile: { monthly: 39,  annual: 468,  onboarding: 199, cadence: 'yearly' },
  growth_partner:   { monthly: 199, annual: 2388, onboarding: 499, cadence: 'yearly' },
}

// The exact ordering of entitlement keys as displayed in the read-only
// section. Values render as boolean checkmarks; string/number values
// render verbatim (e.g. `full` / `limited` / a number).
const ENTITLEMENT_ROWS: Array<{ key: string; label: string }> = [
  { key: 'structured_clinic_profile',            label: 'Structured profile' },
  { key: 'enhanced_clinic_profile',              label: 'Enhanced profile' },
  { key: 'treatment_service_map',                label: 'Treatment map (limited/full)' },
  { key: 'max_treatment_sections',               label: 'Treatment sections limit' },
  { key: 'patient_journey_eligibility',          label: 'Patient journey eligibility' },
  { key: 'quiz_result_flow_eligibility',         label: 'Quiz / result flow eligibility' },
  { key: 'patient_reported_context',             label: 'Patient-reported context' },
  { key: 'source_path_attribution',              label: 'Source / path attribution' },
  { key: 'analytics_dashboard',                  label: 'Analytics dashboard' },
  { key: 'monthly_mini_report',                  label: 'Monthly mini-report' },
  { key: 'quarterly_profile_optimization',       label: 'Quarterly optimization' },
  { key: 'quarterly_spotlight_or_expert_quote',  label: 'Spotlight / expert quote' },
  { key: 'expert_qa_interview_every_six_months', label: 'Expert Q&A / interview' },
  { key: 'case_library_eligibility',             label: 'Case-library eligibility' },
  { key: 'care_pass_access',                     label: 'Care Pass access' },
  { key: 'educational_event_access',             label: 'Educational event access' },
  { key: 'partner_brand_supplier_offers',        label: 'Partner offers' },
  { key: 'selected_beta_access',                 label: 'Beta access' },
  { key: 'annual_category_insight_snapshot',     label: 'Annual insight snapshot' },
  { key: 'partner_access',                       label: 'Partner Access (legacy alias)' },
]

const GUARDRAIL_COPY =
  'Zubite packages and add-ons do not guarantee leads, patients, first '
  + 'position, best-clinic status, clinical superiority, diagnosis, treatment '
  + 'outcomes, or paid ranking. Sponsored visibility must be clearly separated '
  + 'from organic / relevance-based matching.'

interface ClinicPricingBlob {
  base_package?: BasePackage
  founding_status?: FoundingStatus
  billing_status?: BillingStatus
  billing_cadence?: BillingCadence
  monthly_price_eur?: number | null
  annual_price_eur?: number | null
  onboarding_fee_eur?: number | null
  founding_start_date?: string | null
  founding_end_date?: string | null
  private_terms_notes?: string | null
  strategic_public_display?: boolean | null
  legacy_tier?: string | null
  entitlement_overrides?: Array<{ key: string; value: unknown; note?: string; at?: string; by?: string }>
}

interface AddonRow {
  id: string
  clinic_id: string
  add_on_id: string
  category: string
  name: string
  price_eur?: number | null
  billing_type: string
  status: string
  start_date?: string | null
  end_date?: string | null
  public_visibility: string
  affects_organic_matching: boolean
  internal_owner?: string | null
  delivery_notes?: string | null
  invoice_notes?: string | null
}

interface Props {
  clinicId: string
  onNotify?: (m: { type: 'ok' | 'err'; text: string }) => void
  onBasePackageChange?: (basePackage: BasePackage, foundingStatus: FoundingStatus) => void
}

interface CatalogItem {
  add_on_id: string
  category: string
  name: string
  price_eur?: number | null
  billing_type: string
}

// ═════════════════════════════════════════════════════════════════
// Root component — fetches, caches, mounts the three sub-cards.
// ═════════════════════════════════════════════════════════════════
export function ClinicPackageSection({ clinicId, onNotify, onBasePackageChange }: Props) {
  const [loading, setLoading] = useState(true)
  const [pricing, setPricing] = useState<ClinicPricingBlob>({})
  const [addons, setAddons] = useState<AddonRow[]>([])
  const [entitlements, setEntitlements] = useState<Record<string, unknown>>({})
  const [defaults, setDefaults] = useState<{ monthly_price_eur: number; annual_price_eur: number; onboarding_fee_eur: number; billing_cadence: BillingCadence } | null>(null)
  const [catalog, setCatalog] = useState<{ seed: CatalogItem[]; custom: CatalogItem[] }>({ seed: [], custom: [] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detailRes, catRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/clinics/${clinicId}`, { credentials: 'include' as RequestCredentials }),
        fetch(`${API_URL}/api/admin/addon-catalog`, { credentials: 'include' as RequestCredentials }),
      ])
      if (detailRes.ok) {
        const d = await detailRes.json()
        const c = d.clinic || {}
        setPricing({
          base_package:            (c.base_package || 'verified_profile') as BasePackage,
          founding_status:         (c.founding_status || 'none') as FoundingStatus,
          billing_status:          (c.billing_status || 'trial') as BillingStatus,
          billing_cadence:         (c.billing_cadence || 'yearly') as BillingCadence,
          monthly_price_eur:       c.monthly_price_eur ?? null,
          annual_price_eur:        c.annual_price_eur ?? null,
          onboarding_fee_eur:      c.onboarding_fee_eur ?? null,
          founding_start_date:     c.founding_start_date ?? null,
          founding_end_date:       c.founding_end_date ?? null,
          private_terms_notes:     c.private_terms_notes ?? null,
          strategic_public_display: c.strategic_public_display ?? false,
          legacy_tier:             c.legacy_tier ?? null,
          entitlement_overrides:   Array.isArray(c.entitlement_overrides) ? c.entitlement_overrides : [],
        })
        onBasePackageChange?.(
          (c.base_package || 'verified_profile') as BasePackage,
          (c.founding_status || 'none') as FoundingStatus,
        )
        setAddons(Array.isArray(d.addons) ? d.addons as AddonRow[] : [])
        setEntitlements(d.entitlements || {})
        setDefaults(d.package_defaults || null)
      }
      if (catRes.ok) {
        const j = await catRes.json()
        setCatalog({ seed: j.seed || [], custom: j.custom || [] })
      }
    } finally { setLoading(false) }
  }, [clinicId, onBasePackageChange])

  useEffect(() => { load() }, [load])

  const savePricing = async (patch: Partial<ClinicPricingBlob>) => {
    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/api/admin/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify(patch),
      })
      if (r.ok) {
        onNotify?.({ type: 'ok', text: 'Package & billing запазени.' })
        await load()
      } else {
        const j = await r.json().catch(() => ({}))
        onNotify?.({ type: 'err', text: typeof j.detail === 'string' ? j.detail : 'Save failed' })
      }
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 flex items-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Зареждане на package & billing…
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="clinic-package-section">
      <PackageBillingCard
        clinicId={clinicId}
        pricing={pricing}
        defaults={defaults}
        entitlements={entitlements}
        addons={addons}
        saving={saving}
        onSave={savePricing}
      />
      <EntitlementsCard
        pricing={pricing}
        entitlements={entitlements}
        onSaveOverride={async (rows) => savePricing({ entitlement_overrides: rows })}
      />
      <AddonsCard
        clinicId={clinicId}
        addons={addons}
        catalog={catalog}
        onChanged={load}
        onNotify={onNotify}
      />
      <p className="text-[11px] text-slate-500 italic" data-testid="package-guardrail">
        {GUARDRAIL_COPY}
      </p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// Sub-card 1: Package & Billing
// ═════════════════════════════════════════════════════════════════
function PackageBillingCard({
  pricing, defaults, entitlements, addons, saving, onSave,
}: {
  clinicId: string
  pricing: ClinicPricingBlob
  defaults: { monthly_price_eur: number; annual_price_eur: number; onboarding_fee_eur: number; billing_cadence: BillingCadence } | null
  entitlements: Record<string, unknown>
  addons: AddonRow[]
  saving: boolean
  onSave: (patch: Partial<ClinicPricingBlob>) => Promise<void>
}) {
  const [draft, setDraft] = useState<ClinicPricingBlob>(pricing)
  useEffect(() => setDraft(pricing), [pricing])

  const bp: BasePackage = (draft.base_package || 'verified_profile') as BasePackage
  const founding = (draft.founding_status || 'none') as FoundingStatus

  const warnings: string[] = []
  if (bp === 'verified_profile' && entitlements.patient_journey_eligibility === true) {
    warnings.push('Verified Profile с ръчно включена Patient Journey eligibility — конфликтна конфигурация.')
  }
  if (bp === 'verified_profile' && addons.some((a) => a.status === 'active' && a.category === 'partner_campaign')) {
    warnings.push('Verified Profile с активни partner_campaign add-ons — тези добавки не дават Growth-level ranking.')
  }
  if (founding && (founding !== 'none') && !draft.founding_end_date) {
    warnings.push('Founding условията нямат `founding_end_date` — задай край, за да не се задържат неограничено.')
  }
  const isStrategicPrivate = founding === 'strategic_private'
  const isCustomPricing = (draft.billing_cadence === 'custom_private') || isStrategicPrivate

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4" data-testid="package-billing-card">
      <header className="flex items-center gap-2">
        <Package className="w-4 h-4 text-teal-700" />
        <h3 className="font-serif text-lg font-semibold text-slate-900">Package & Billing</h3>
      </header>

      {isCustomPricing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-[12px] text-amber-900" data-testid="pkg-warning-private-terms">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Private terms should not weaken public pricing or imply paid ranking / clinical superiority.</span>
        </div>
      )}

      {warnings.map((w, i) => (
        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-[12px] text-amber-900" data-testid={`pkg-warning-${i}`}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{w}</span>
        </div>
      ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldSelect
          label="Base package"
          value={bp}
          options={[
            { value: 'verified_profile', label: 'Verified Profile' },
            { value: 'growth_partner',   label: 'Growth Partner' },
          ]}
          onChange={(v) => setDraft({ ...draft, base_package: v as BasePackage })}
          testid="pkg-base-package"
        />
        <FieldSelect
          label="Founding status"
          value={founding}
          options={[
            { value: 'none',              label: '—' },
            { value: 'founding_growth',   label: 'Founding Growth' },
            { value: 'strategic_private', label: 'Strategic Private' },
          ]}
          onChange={(v) => setDraft({ ...draft, founding_status: v as FoundingStatus })}
          testid="pkg-founding-status"
        />
        <FieldSelect
          label="Billing status"
          value={draft.billing_status || 'trial'}
          options={[
            { value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' },
            { value: 'past_due', label: 'Past due' }, { value: 'paused', label: 'Paused' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          onChange={(v) => setDraft({ ...draft, billing_status: v as BillingStatus })}
          testid="pkg-billing-status"
        />
        <FieldSelect
          label="Billing cadence"
          value={draft.billing_cadence || 'yearly'}
          options={[
            { value: 'yearly',         label: 'Yearly' },
            { value: 'custom_private', label: 'Custom private' },
          ]}
          onChange={(v) => setDraft({ ...draft, billing_cadence: v as BillingCadence })}
          testid="pkg-billing-cadence"
        />
        <FieldNumber
          label="Monthly (€)"
          value={draft.monthly_price_eur}
          onChange={(v) => setDraft({ ...draft, monthly_price_eur: v })}
          testid="pkg-monthly"
          hint={defaults ? `default: €${defaults.monthly_price_eur}` : undefined}
        />
        <FieldNumber
          label="Annual (€)"
          value={draft.annual_price_eur}
          onChange={(v) => setDraft({ ...draft, annual_price_eur: v })}
          testid="pkg-annual"
          hint={defaults ? `default: €${defaults.annual_price_eur}` : undefined}
        />
        <FieldNumber
          label="Onboarding (€)"
          value={draft.onboarding_fee_eur}
          onChange={(v) => setDraft({ ...draft, onboarding_fee_eur: v })}
          testid="pkg-onboarding"
          hint={defaults ? `default: €${defaults.onboarding_fee_eur}` : undefined}
        />
        <FieldDate
          label="Founding start"
          value={draft.founding_start_date}
          onChange={(v) => setDraft({ ...draft, founding_start_date: v })}
          testid="pkg-founding-start"
        />
        <FieldDate
          label="Founding end"
          value={draft.founding_end_date}
          onChange={(v) => setDraft({ ...draft, founding_end_date: v })}
          testid="pkg-founding-end"
        />
      </div>

      <label className="block text-xs text-slate-600">
        <span>Private terms notes (admin-only)</span>
        <textarea
          value={draft.private_terms_notes || ''}
          onChange={(e) => setDraft({ ...draft, private_terms_notes: e.target.value })}
          maxLength={2000} rows={3}
          className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          data-testid="pkg-private-notes"
        />
      </label>

      {isStrategicPrivate && (
        <label className="inline-flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={!!draft.strategic_public_display}
            onChange={(e) => setDraft({ ...draft, strategic_public_display: e.target.checked })}
            data-testid="pkg-strategic-public"
          />
          Разреши публично „Strategic Partner" етикет (без разкриване на частни условия).
        </label>
      )}

      {pricing.legacy_tier && (
        <div className="text-[11px] text-slate-500">
          Legacy tier: <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{pricing.legacy_tier}</code>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(draft)}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-50"
          data-testid="pkg-save"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Запази package & billing
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// Sub-card 2: Current Entitlements
// ═════════════════════════════════════════════════════════════════
function EntitlementsCard({
  pricing, entitlements, onSaveOverride,
}: {
  pricing: ClinicPricingBlob
  entitlements: Record<string, unknown>
  onSaveOverride: (rows: Array<{ key: string; value: unknown; note?: string }>) => Promise<void>
}) {
  const [editing, setEditing] = useState<{ key: string; currentValue: unknown } | null>(null)
  const [note, setNote] = useState('')
  const [newValue, setNewValue] = useState<boolean>(false)

  const overrides = pricing.entitlement_overrides || []
  const overrideMap = useMemo(() => {
    const m: Record<string, { value: unknown; note?: string }> = {}
    for (const o of overrides) m[o.key] = { value: o.value, note: o.note }
    return m
  }, [overrides])

  const openEdit = (key: string, current: unknown) => {
    setEditing({ key, currentValue: current })
    setNewValue(current === true)
    setNote(overrideMap[key]?.note || '')
  }

  const confirmOverride = async () => {
    if (!editing) return
    if (!note.trim()) {
      alert('Please add a note for the override.')
      return
    }
    const rows = overrides.filter((o) => o.key !== editing.key).concat([
      { key: editing.key, value: newValue, note: note.trim() },
    ])
    await onSaveOverride(rows)
    setEditing(null)
    setNote('')
  }

  const removeOverride = async (key: string) => {
    if (!confirm('Remove override for ' + key + '?')) return
    const rows = overrides.filter((o) => o.key !== key)
    await onSaveOverride(rows)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3" data-testid="entitlements-card">
      <header className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <h3 className="font-serif text-lg font-semibold text-slate-900">Current Entitlements</h3>
        <span className="text-[11px] text-slate-400 ml-auto">Read-only · admin override with confirmation</span>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {ENTITLEMENT_ROWS.map((row) => {
          const val = entitlements[row.key]
          const isBool = typeof val === 'boolean'
          const isOverridden = row.key in overrideMap
          return (
            <li
              key={row.key}
              className="flex items-center justify-between gap-2 py-1"
              data-testid={`ent-row-${row.key}`}
            >
              <div className="min-w-0 flex-1 flex items-center gap-2">
                {isBool ? (
                  val
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-[10px] font-medium px-1.5 py-0.5 flex-shrink-0">
                    {String(val ?? '—')}
                  </span>
                )}
                <span className="text-slate-700 truncate">{row.label}</span>
                {isOverridden && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5">override</span>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-1">
                {isBool && (
                  <button
                    type="button"
                    onClick={() => openEdit(row.key, val)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                    title="Override"
                    data-testid={`ent-edit-${row.key}`}
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
                {isOverridden && (
                  <button
                    type="button"
                    onClick={() => removeOverride(row.key)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remove override"
                    data-testid={`ent-remove-${row.key}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 grid place-items-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()} data-testid="ent-override-modal">
            <h4 className="font-serif text-base font-semibold">Override <code className="px-1 rounded bg-slate-100 text-xs">{editing.key}</code></h4>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={newValue} onChange={(e) => setNewValue(e.target.checked)} data-testid="ent-override-value" />
              Enable ({row_label(editing.key)})
            </label>
            <label className="block text-xs text-slate-600">
              <span>Internal note (required) — recorded in audit log</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                data-testid="ent-override-note" />
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="h-9 px-4 rounded-full border border-slate-200 text-sm">Отказ</button>
              <button type="button" onClick={confirmOverride} className="h-9 px-5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium" data-testid="ent-override-confirm">
                Потвърди override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function row_label(key: string) {
  return ENTITLEMENT_ROWS.find((r) => r.key === key)?.label || key
}

// ═════════════════════════════════════════════════════════════════
// Sub-card 3: Add-ons
// ═════════════════════════════════════════════════════════════════
function AddonsCard({
  clinicId, addons, catalog, onChanged, onNotify,
}: {
  clinicId: string
  addons: AddonRow[]
  catalog: { seed: CatalogItem[]; custom: CatalogItem[] }
  onChanged: () => void
  onNotify?: (m: { type: 'ok' | 'err'; text: string }) => void
}) {
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [selCatId, setSelCatId] = useState('')
  const [customCat, setCustomCat] = useState<{ add_on_id: string; category: string; name: string; price_eur?: number; billing_type: string }>({
    add_on_id: '', category: 'custom_private', name: '', price_eur: undefined, billing_type: 'one_time',
  })

  const catalogMap = useMemo(() => {
    const m: Record<string, CatalogItem> = {}
    for (const i of catalog.seed) m[i.add_on_id] = i
    for (const i of catalog.custom) m[i.add_on_id] = i
    return m
  }, [catalog])

  const addFromCatalog = async () => {
    if (!selCatId) return
    const item = catalogMap[selCatId]
    if (!item) return
    setAdding(true)
    try {
      const r = await fetch(`${API_URL}/api/admin/clinics/${clinicId}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify({
          add_on_id: item.add_on_id,
          category: item.category,
          name: item.name,
          price_eur: item.price_eur ?? null,
          billing_type: item.billing_type,
          status: 'proposed',
          public_visibility: 'internal_only',
        }),
      })
      if (r.ok) {
        setSelCatId('')
        onChanged()
        onNotify?.({ type: 'ok', text: `Add-on „${item.name}" добавен.` })
      } else {
        const j = await r.json().catch(() => ({}))
        onNotify?.({ type: 'err', text: typeof j.detail === 'string' ? j.detail : 'Add-on error' })
      }
    } finally { setAdding(false) }
  }

  const addCustom = async () => {
    if (!customCat.add_on_id || !customCat.name) return
    setAdding(true)
    try {
      const r = await fetch(`${API_URL}/api/admin/clinics/${clinicId}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify({
          add_on_id: customCat.add_on_id.trim().toLowerCase(),
          category: customCat.category,
          name: customCat.name.trim(),
          price_eur: customCat.price_eur ?? null,
          billing_type: customCat.billing_type,
          status: 'proposed',
          public_visibility: 'internal_only',
        }),
      })
      if (r.ok) {
        setCustomCat({ add_on_id: '', category: 'custom_private', name: '', price_eur: undefined, billing_type: 'one_time' })
        onChanged()
        onNotify?.({ type: 'ok', text: 'Custom add-on добавен.' })
      } else {
        const j = await r.json().catch(() => ({}))
        onNotify?.({ type: 'err', text: typeof j.detail === 'string' ? j.detail : 'Custom add-on error' })
      }
    } finally { setAdding(false) }
  }

  const updateStatus = async (row: AddonRow, status: string) => {
    setBusyId(row.id)
    try {
      await fetch(`${API_URL}/api/admin/clinics/${clinicId}/addons/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify({ status }),
      })
      onChanged()
    } finally { setBusyId(null) }
  }

  const deleteAddon = async (row: AddonRow) => {
    if (!confirm(`Delete add-on „${row.name}"?`)) return
    setBusyId(row.id)
    try {
      await fetch(`${API_URL}/api/admin/clinics/${clinicId}/addons/${row.id}`, {
        method: 'DELETE',
        credentials: 'include' as RequestCredentials,
      })
      onChanged()
    } finally { setBusyId(null) }
  }

  const grouped = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {}
    for (const i of catalog.seed) {
      (groups[i.category] ||= []).push(i)
    }
    for (const i of catalog.custom) {
      (groups[i.category] ||= []).push(i)
    }
    return groups
  }, [catalog])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4" data-testid="addons-card">
      <header className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-teal-700" />
        <h3 className="font-serif text-lg font-semibold text-slate-900">Add-ons</h3>
        <span className="text-[11px] text-slate-400 ml-auto">
          Не влияят на organic ranking.
        </span>
      </header>

      {/* Existing add-ons */}
      {addons.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Все още няма активни add-ons.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {addons.map((a) => (
            <li key={a.id} className="p-3 flex flex-wrap items-center gap-2 text-sm" data-testid={`addon-row-${a.id}`}>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900 truncate">{a.name}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {a.category} · {a.billing_type}
                  {a.price_eur != null ? ` · €${a.price_eur}` : ''}
                  {a.public_visibility !== 'internal_only' ? ` · ${a.public_visibility}` : ''}
                </div>
              </div>
              <select
                value={a.status}
                onChange={(e) => updateStatus(a, e.target.value)}
                disabled={busyId === a.id}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                data-testid={`addon-status-${a.id}`}
              >
                {['proposed', 'active', 'delivered', 'paused', 'cancelled'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => deleteAddon(a)}
                disabled={busyId === a.id}
                className="text-rose-500 hover:text-rose-700 p-1"
                data-testid={`addon-delete-${a.id}`}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add from catalog */}
      <div className="rounded-lg bg-slate-50/70 border border-slate-200 p-3 space-y-2">
        <label className="block text-xs text-slate-600 font-medium">Add from catalog</label>
        <div className="flex flex-wrap gap-2">
          <select
            value={selCatId}
            onChange={(e) => setSelCatId(e.target.value)}
            className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            data-testid="addon-catalog-select"
          >
            <option value="">— избери от каталога (28) —</option>
            {Object.entries(grouped).map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map((i) => (
                  <option key={i.add_on_id} value={i.add_on_id}>
                    {i.name}{i.price_eur != null ? ` · €${i.price_eur}` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            onClick={addFromCatalog}
            disabled={!selCatId || adding}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-50"
            data-testid="addon-add-from-catalog"
          >
            {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Plus className="w-4 h-4" /> Добави
          </button>
        </div>
      </div>

      {/* Add custom */}
      <details className="rounded-lg border border-slate-200 p-3" data-testid="addon-custom-details">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Custom add-on</summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <FieldText label="ID (kebab_snake_case)" value={customCat.add_on_id}
            onChange={(v) => setCustomCat({ ...customCat, add_on_id: v })} testid="addon-custom-id" />
          <FieldText label="Name" value={customCat.name}
            onChange={(v) => setCustomCat({ ...customCat, name: v })} testid="addon-custom-name" />
          <FieldSelect
            label="Category"
            value={customCat.category}
            options={['content_authority', 'video_podcast_event', 'analytics_strategy', 'partner_campaign', 'profile_setup', 'custom_private'].map((c) => ({ value: c, label: c }))}
            onChange={(v) => setCustomCat({ ...customCat, category: v })} testid="addon-custom-category"
          />
          <FieldSelect
            label="Billing type"
            value={customCat.billing_type}
            options={['one_time', 'monthly', 'quarterly', 'per_campaign', 'custom'].map((c) => ({ value: c, label: c }))}
            onChange={(v) => setCustomCat({ ...customCat, billing_type: v })} testid="addon-custom-billing"
          />
          <FieldNumber
            label="Price (€)" value={customCat.price_eur ?? null}
            onChange={(v) => setCustomCat({ ...customCat, price_eur: v ?? undefined })}
            testid="addon-custom-price"
          />
        </div>
        <div className="text-right mt-2">
          <button type="button" onClick={addCustom} disabled={adding || !customCat.add_on_id || !customCat.name}
            className="inline-flex items-center gap-1 px-4 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-50"
            data-testid="addon-add-custom">
            {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Добави custom add-on
          </button>
        </div>
      </details>
    </div>
  )
}

// ─── shared field primitives ────────────────────────────────────
function FieldSelect({ label, value, options, onChange, testid }: {
  label: string; value: string; options: Array<{ value: string; label: string }>
  onChange: (v: string) => void; testid?: string
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
        data-testid={testid}>
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  )
}
function FieldText({ label, value, onChange, testid }: { label: string; value: string; onChange: (v: string) => void; testid?: string }) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm"
        data-testid={testid} />
    </label>
  )
}
function FieldNumber({ label, value, onChange, testid, hint }: {
  label: string; value: number | null | undefined; onChange: (v: number | null) => void
  testid?: string; hint?: string
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label} {hint && <span className="text-slate-400">· {hint}</span>}</span>
      <input type="number" step="0.01" value={value == null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm"
        data-testid={testid} />
    </label>
  )
}
function FieldDate({ label, value, onChange, testid }: { label: string; value?: string | null; onChange: (v: string) => void; testid?: string }) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm"
        data-testid={testid} />
    </label>
  )
}
