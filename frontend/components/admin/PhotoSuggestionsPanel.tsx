'use client'

/**
 * Photos pulled from the links a clinic pasted into its intake photo fields.
 *
 * Clinics often paste a page of their site ("about us", the doctor's page)
 * instead of an image link. The backend (clinic_photo_import.py) finds the
 * fitting photo on that page and stores it as a suggestion; nothing reaches
 * the public profile until it is accepted here.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, ImageOff, Loader2, RefreshCw, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export const PHOTO_SLOTS = [
  { key: 'hero_image_url', label: 'Главна снимка' },
  { key: 'doctor_spotlight_image_url', label: 'Снимка на лекаря' },
  { key: 'team_image_url', label: 'Снимка на екипа' },
  { key: 'environment_image_url', label: 'Снимка на клиниката' },
] as const

export interface PhotoSuggestion {
  status: 'pending' | 'accepted' | 'rejected' | 'not_found' | 'failed'
  source_page?: string
  image_url?: string
  image_source_url?: string
  width?: number
  height?: number
  reason?: string
  method?: 'claude' | 'heuristic'
}

export interface PhotoImportState {
  status: 'running' | 'done' | 'failed'
  started_at?: string
  finished_at?: string
  error?: string
}

const STATUS_CHIP: Record<PhotoSuggestion['status'], { label: string; cls: string }> = {
  pending: { label: 'Чака решение', cls: 'bg-amber-50 text-amber-700' },
  accepted: { label: 'Приета', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Отказана', cls: 'bg-slate-100 text-slate-600' },
  not_found: { label: 'Няма подходяща', cls: 'bg-slate-100 text-slate-600' },
  failed: { label: 'Грешка', cls: 'bg-rose-50 text-rose-700' },
}

export function PhotoSuggestionsPanel({
  appId,
  links,
  initialSuggestions,
  initialImport,
  approved,
}: {
  appId: string
  links: Partial<Record<(typeof PHOTO_SLOTS)[number]['key'], string | null | undefined>>
  initialSuggestions?: Record<string, PhotoSuggestion> | null
  initialImport?: PhotoImportState | null
  approved: boolean
}) {
  const [suggestions, setSuggestions] = useState<Record<string, PhotoSuggestion>>(initialSuggestions || {})
  const [importState, setImportState] = useState<PhotoImportState | null>(initialImport || null)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasLinks = PHOTO_SLOTS.some(({ key }) => {
    const v = links[key]
    return typeof v === 'string' && v.trim() && !v.startsWith('/api/files/')
  })

  const refresh = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/clinic-applications/${appId}/photo-import`, {
      credentials: 'include' as RequestCredentials,
    })
    if (!res.ok) return null
    const data = await res.json()
    setSuggestions(data.photo_suggestions || {})
    setImportState(data.photo_import || null)
    return data.photo_import as PhotoImportState | null
  }, [appId])

  // Poll while a run is in progress (started here, or on intake submission).
  useEffect(() => {
    if (importState?.status !== 'running') return
    pollRef.current = setTimeout(() => { refresh() }, 3000)
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [importState, refresh])

  const startImport = async () => {
    setMessage(null)
    const res = await fetch(`${API_URL}/api/admin/clinic-applications/${appId}/photo-import`, {
      method: 'POST', credentials: 'include' as RequestCredentials,
    })
    if (res.ok || res.status === 409) {
      setImportState({ status: 'running', started_at: new Date().toISOString() })
      return
    }
    const body = await res.json().catch(() => ({}))
    setMessage({ tone: 'error', text: typeof body.detail === 'string' ? body.detail : 'Извличането не стартира.' })
  }

  const decide = async (slot: string, decision: 'accept' | 'reject') => {
    setBusySlot(slot)
    setMessage(null)
    try {
      const res = await fetch(
        `${API_URL}/api/admin/clinic-applications/${appId}/photo-suggestions/${slot}/${decision}`,
        { method: 'POST', credentials: 'include' as RequestCredentials },
      )
      if (!res.ok) {
        setMessage({ tone: 'error', text: 'Решението не беше записано. Опитайте отново.' })
        return
      }
      const data = await res.json()
      setSuggestions((prev) => ({
        ...prev,
        [slot]: { ...prev[slot], status: decision === 'accept' ? 'accepted' : 'rejected' },
      }))
      if (decision === 'accept') {
        setMessage({
          tone: 'ok',
          text: data.clinic_updated
            ? 'Снимката е в профила на клиниката.'
            : 'Снимката е запазена и ще влезе в профила при одобрение.',
        })
      }
    } finally {
      setBusySlot(null)
    }
  }

  const running = importState?.status === 'running'

  return (
    <div data-testid="photo-suggestions-panel">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Снимки от сайта</h3>
        {hasLinks && (
          <button
            type="button"
            onClick={startImport}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-teal-500 hover:text-teal-700 disabled:opacity-60"
            data-testid="photo-import-start"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {running ? 'Търсим снимки…' : Object.keys(suggestions).length ? 'Извлечи отново' : 'Извлечи снимките от сайта'}
          </button>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-4">
        {!hasLinks && Object.keys(suggestions).length === 0 && (
          <p className="text-sm text-slate-500">Клиниката не е посочила линкове в полетата за снимки.</p>
        )}
        {importState?.status === 'failed' && (
          <p className="text-sm text-rose-700">Извличането се провали: {importState.error || 'неизвестна грешка'}</p>
        )}
        {message && (
          <p className={`text-sm font-medium ${message.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`} role="status">
            {message.text}
          </p>
        )}

        {PHOTO_SLOTS.map(({ key, label }) => {
          const link = links[key]
          const s = suggestions[key]
          if (!link && !s) return null
          const chip = s ? STATUS_CHIP[s.status] : null
          return (
            <div key={key} className="flex gap-4" data-testid={`photo-suggestion-${key}`}>
              <div className="h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200 grid place-items-center">
                {s?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API_URL}${s.image_url}`} alt={label} className="h-full w-full object-cover" />
                ) : running ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                ) : (
                  <ImageOff className="h-5 w-5 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  {chip && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.cls}`}>{chip.label}</span>}
                </div>
                {(s?.source_page || link) && (
                  <a
                    href={s?.source_page || link || '#'}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-slate-500 hover:text-teal-700"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s?.source_page || link}</span>
                  </a>
                )}
                {s?.reason && <p className="mt-1 text-xs text-slate-600">{s.reason}</p>}
                {s?.width && s?.height && (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {s.width}×{s.height}{s.method === 'heuristic' ? ' · избрана автоматично по описание' : ''}
                  </p>
                )}
                {s?.image_url && s.status !== 'accepted' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => decide(key, 'accept')}
                      disabled={busySlot === key}
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-teal-600 px-3 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                      data-testid={`photo-accept-${key}`}
                    >
                      <Check className="h-3.5 w-3.5" /> Приеми
                    </button>
                    {s.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => decide(key, 'reject')}
                        disabled={busySlot === key}
                        className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:border-slate-300 disabled:opacity-60"
                        data-testid={`photo-reject-${key}`}
                      >
                        <X className="h-3.5 w-3.5" /> Откажи
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {approved && (
          <p className="text-[11px] text-slate-400">
            Кандидатурата е одобрена — приетите снимки влизат директно в профила на клиниката.
          </p>
        )}
      </div>
    </div>
  )
}
