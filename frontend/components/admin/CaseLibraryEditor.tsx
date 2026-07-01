'use client'

import { useRef, useState } from 'react'
import { Plus, Trash2, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export type CaseProfileStatus = 'draft' | 'published'

export interface CaseRow {
  id?: string
  title: string
  category: string
  summary: string
  status: CaseProfileStatus
  consent_confirmed: boolean
  // Revamp fields (Feb 2026)
  treatment_type: string
  duration: string
  price: string
  materials: string
  specifics: string
  before_images: string[]
  after_images: string[]
  _key: number
}

interface CaseLibraryEditorProps {
  cases: CaseRow[]
  onChange: (updater: (arr: CaseRow[]) => CaseRow[]) => void
  visibilityHint: string | null
  disabled?: boolean
}

const MAX_CASES = 12
const MAX_IMAGES_PER_SIDE = 3

const TREATMENT_TYPE_OPTIONS = [
  'Алайнери (Invisalign / Spark / друг)',
  'Метални брекети',
  'Керамични брекети',
  'Импланти',
  'All-on-4 / All-on-6',
  'Естетична стоматология',
  'Фасети',
  'Bleaching / Избелване',
  'Ендодонтия',
  'Хирургия',
  'Друго',
]

export function CaseLibraryEditor({
  cases, onChange, visibilityHint, disabled,
}: CaseLibraryEditorProps) {
  const [addingKey, setAddingKey] = useState<number>(cases.length ? cases[0]._key : 1)
  const nextKey = useRef<number>(
    cases.reduce((m, c) => Math.max(m, c._key), 0) + 1,
  )

  const addCase = () => {
    const k = nextKey.current++
    setAddingKey(k)
    onChange((arr) => [
      ...arr,
      {
        title: '', category: '', summary: '',
        status: 'draft', consent_confirmed: false,
        treatment_type: '', duration: '', price: '',
        materials: '', specifics: '',
        before_images: [], after_images: [],
        _key: k,
      },
    ])
  }

  const updateAt = (i: number, patch: Partial<CaseRow>) => {
    onChange((arr) => arr.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const removeAt = (i: number) => {
    onChange((arr) => arr.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-4" data-testid="case-library-editor">
      {visibilityHint && (
        <p className="text-[11px] text-amber-700 italic">{visibilityHint}</p>
      )}
      <p className="text-xs text-slate-500">
        Публикуван случай изисква потвърдено съгласие от пациента.
        Не включвайте лични данни (име, дата на раждане, лицев профил без анонимизация).
        До {MAX_IMAGES_PER_SIDE} „преди“ и {MAX_IMAGES_PER_SIDE} „след“ снимки на случай.
      </p>

      {cases.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 text-sm">
          Все още няма добавени случаи. Клиниката ще започне да ги вижда веднага след публикация.
        </div>
      )}

      {cases.map((row, i) => (
        <CaseCard
          key={row._key}
          index={i}
          row={row}
          expanded={row._key === addingKey}
          disabled={disabled}
          onExpand={() => setAddingKey(row._key)}
          onCollapse={() => setAddingKey(-1)}
          onChange={(patch) => updateAt(i, patch)}
          onRemove={() => removeAt(i)}
        />
      ))}

      {cases.length < MAX_CASES && (
        <button
          type="button"
          onClick={addCase}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm disabled:opacity-50"
          data-testid="case-add"
        >
          <Plus className="w-4 h-4" /> Добави случай
        </button>
      )}
    </div>
  )
}

function CaseCard({
  index, row, expanded, disabled, onExpand, onCollapse, onChange, onRemove,
}: {
  index: number
  row: CaseRow
  expanded: boolean
  disabled?: boolean
  onExpand: () => void
  onCollapse: () => void
  onChange: (patch: Partial<CaseRow>) => void
  onRemove: () => void
}) {
  const publishBlocked = !row.consent_confirmed

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
      data-testid={`case-row-${index}`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={expanded ? onCollapse : onExpand}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900 truncate">
            {row.title || <span className="italic text-slate-400">Без заглавие</span>}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {[row.category, row.treatment_type, row.duration].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ' +
              (row.status === 'published'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600')
            }
          >
            {row.status === 'published' ? 'Публикуван' : 'Чернова'}
          </span>
          <span className="text-[11px] text-slate-400">
            {row.before_images.length + row.after_images.length > 0
              ? `${row.before_images.length}+${row.after_images.length}`
              : 'без снимки'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          {/* Row 1 — title + category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SmallInput
              label="Заглавие"
              maxLength={120}
              value={row.title}
              onChange={(v) => onChange({ title: v })}
              testid={`case-title-${index}`}
            />
            <SmallInput
              label="Категория"
              maxLength={80}
              value={row.category}
              placeholder="напр. Ортодонтия, Естетика"
              onChange={(v) => onChange({ category: v })}
              testid={`case-category-${index}`}
            />
          </div>

          {/* Row 2 — treatment_type + duration + price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SmallSelect
              label="Тип лечение"
              value={row.treatment_type}
              options={['', ...TREATMENT_TYPE_OPTIONS]}
              onChange={(v) => onChange({ treatment_type: v })}
              testid={`case-treatment-type-${index}`}
            />
            <SmallInput
              label="Продължителност"
              maxLength={80}
              value={row.duration}
              placeholder="напр. 6 месеца, 3 сесии"
              onChange={(v) => onChange({ duration: v })}
              testid={`case-duration-${index}`}
            />
            <SmallInput
              label="Цена (свободен текст)"
              maxLength={120}
              value={row.price}
              placeholder="напр. От 4 500 лв. / По запитване"
              onChange={(v) => onChange({ price: v })}
              testid={`case-price-${index}`}
            />
          </div>

          {/* Row 3 — materials */}
          <SmallInput
            label="Материали / марки"
            maxLength={300}
            value={row.materials}
            placeholder="напр. Invisalign Comprehensive, композит IPS Empress"
            onChange={(v) => onChange({ materials: v })}
            testid={`case-materials-${index}`}
          />

          {/* Row 4 — summary (kept from old schema) */}
          <SmallTextArea
            label="Кратко описание (до 700)"
            value={row.summary}
            maxLength={700}
            rows={3}
            placeholder="Кратък резюмиран разказ за случая. Без лични данни."
            onChange={(v) => onChange({ summary: v })}
            testid={`case-summary-${index}`}
          />

          {/* Row 5 — specifics */}
          <SmallTextArea
            label="Особености (до 700)"
            value={row.specifics}
            maxLength={700}
            rows={3}
            placeholder="Клинични детайли, предизвикателства, подход, планиране."
            onChange={(v) => onChange({ specifics: v })}
            testid={`case-specifics-${index}`}
          />

          {/* Row 6 — before/after images */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ImageBank
              label="„Преди“ снимки"
              testidPrefix={`case-before-${index}`}
              images={row.before_images}
              onChange={(imgs) => onChange({ before_images: imgs })}
            />
            <ImageBank
              label="„След“ снимки"
              testidPrefix={`case-after-${index}`}
              images={row.after_images}
              onChange={(imgs) => onChange({ after_images: imgs })}
            />
          </div>

          {/* Consent + status + remove */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={row.consent_confirmed}
                onChange={(e) => onChange({ consent_confirmed: e.target.checked })}
                data-testid={`case-consent-${index}`}
              />
              Потвърдено съгласие от пациента
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <span>Статус</span>
              <select
                value={row.status}
                onChange={(e) => onChange({ status: e.target.value as CaseProfileStatus })}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                data-testid={`case-status-${index}`}
              >
                <option value="draft">Чернова</option>
                <option value="published" disabled={publishBlocked}>Публикуван</option>
              </select>
            </label>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="ml-auto inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-xs font-medium disabled:opacity-50"
              data-testid={`case-remove-${index}`}
            >
              <Trash2 className="w-3.5 h-3.5" /> Премахни
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageBank({
  label, images, onChange, testidPrefix,
}: {
  label: string
  images: string[]
  onChange: (imgs: string[]) => void
  testidPrefix: string
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setErr(null)
    if (file.size > 5 * 1024 * 1024) {
      setErr('Файлът е по-голям от 5 MB.')
      return
    }
    if (images.length >= MAX_IMAGES_PER_SIDE) {
      setErr(`Максимум ${MAX_IMAGES_PER_SIDE} снимки.`)
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${API_URL}/api/admin/upload`, {
        method: 'POST',
        body: fd,
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setErr(typeof j.detail === 'string' ? j.detail : 'Грешка при качване.')
        return
      }
      const j = await r.json()
      // Store absolute URL so public rendering works regardless of host.
      const url: string = j.url && j.url.startsWith('/api/') ? `${API_URL}${j.url}` : j.url
      onChange([...images, url])
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i))

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-slate-700 inline-flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
          {label} <span className="text-slate-400">({images.length}/{MAX_IMAGES_PER_SIDE})</span>
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES_PER_SIDE}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium disabled:opacity-50"
          data-testid={`${testidPrefix}-upload-btn`}
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Качи
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload(f)
          }}
          data-testid={`${testidPrefix}-input`}
        />
      </div>
      {err && <div className="text-[11px] text-rose-600">{err}</div>}

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => (
            <div key={`${url}-${i}`} className="relative group aspect-square rounded-md overflow-hidden border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${label} ${i + 1}`}
                className="w-full h-full object-cover"
                data-testid={`${testidPrefix}-thumb-${i}`}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition"
                title="Премахни"
                data-testid={`${testidPrefix}-remove-${i}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic">Няма качени снимки.</p>
      )}
    </div>
  )
}

function SmallInput({
  label, value, onChange, maxLength, placeholder, testid,
}: {
  label: string; value: string; onChange: (v: string) => void
  maxLength?: number; placeholder?: string; testid?: string
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm"
        data-testid={testid}
      />
    </label>
  )
}

function SmallSelect({
  label, value, options, onChange, testid,
}: {
  label: string; value: string; options: string[]
  onChange: (v: string) => void; testid?: string
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
        data-testid={testid}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o || '— избери —'}</option>
        ))}
      </select>
    </label>
  )
}

function SmallTextArea({
  label, value, onChange, maxLength, rows, placeholder, testid,
}: {
  label: string; value: string; onChange: (v: string) => void
  maxLength?: number; rows?: number; placeholder?: string; testid?: string
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={rows}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm"
        data-testid={testid}
      />
    </label>
  )
}
