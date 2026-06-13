'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
  Star,
  ChevronDown,
  ChevronUp,
  XCircle,
  RefreshCw,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ImageRequirement {
  id: string
  article_id: string
  type: string // "featured" | "support"
  expected_filename: string
  alt: string
  title: string
  caption: string
  placement: string
  placeholder: string | null
  uploaded_file_url: string | null
  uploaded_file_name: string | null
  upload_status: string // "missing" | "attached"
  matched_by: string | null
  implicit?: boolean
  created_at: string
  updated_at: string
}

interface UnmatchedFile {
  filename: string
  uploaded_file_url?: string
  uploaded_file_name?: string
  reason: string
  message?: string
}

interface ConflictFile {
  filename: string
  uploaded_file_url?: string
  uploaded_file_name?: string
  reason: string
  candidate_requirement_ids?: string[]
}

interface PanelData {
  article_id: string
  article_title: string | null
  article_slug: string | null
  article_is_published: boolean
  featured_image: string | null
  requirements: ImageRequirement[]
  warnings: string[]
  all_attached: boolean
}

interface BulkResult {
  attached: { requirement_id: string; filename: string; matched_by: string }[]
  unmatched: UnmatchedFile[]
  conflicts: ConflictFile[]
}

interface Props {
  articleId: string
}

function placeholderToken(placeholder: string | null): string {
  if (!placeholder) return ''
  // Implicit reqs store full "{{image:x}}", explicit store "x"
  if (placeholder.startsWith('{{image:')) return placeholder
  return `{{image:${placeholder}}}`
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'attached') {
    return (
      <span
        data-testid="req-status-attached"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      >
        <CheckCircle2 className="w-3 h-3" />
        Прикачено
      </span>
    )
  }
  return (
    <span
      data-testid="req-status-missing"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 ring-1 ring-amber-200"
    >
      <AlertTriangle className="w-3 h-3" />
      Липсва
    </span>
  )
}

function MatchedByBadge({ matchedBy }: { matchedBy: string | null }) {
  if (!matchedBy) return null
  const label =
    matchedBy === 'filename'
      ? 'По име на файл'
      : matchedBy === 'normalized_filename'
      ? 'По нормализирано име'
      : 'Ръчно'
  return (
    <span className="text-[10.5px] text-slate-500 italic">
      Съвпадение: {label}
    </span>
  )
}

export function ImageRequirementsPanel({ articleId }: Props) {
  const [data, setData] = useState<PanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null)
  const [assigningTo, setAssigningTo] = useState<string | null>(null)
  const [assignReqId, setAssignReqId] = useState<string>('')
  const bulkInputRef = useRef<HTMLInputElement>(null)
  const slotInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(
        `${API_URL}/api/admin/blog/${articleId}/image-requirements`,
        { credentials: 'include' as RequestCredentials }
      )
      if (res.status === 404) {
        // Article doesn't exist yet or no requirements – hide panel
        setData(null)
        return
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const body = (await res.json()) as PanelData
      setData(body)
    } catch (e) {
      setError('Грешка при зареждане на изискванията за изображения.')
    } finally {
      setLoading(false)
    }
  }, [articleId])

  useEffect(() => {
    if (articleId) fetchData()
  }, [articleId, fetchData])

  const handleSlotUpload = async (
    req: ImageRequirement,
    file: File | null
  ) => {
    if (!file) return
    setUploadingReqId(req.id)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(
        `${API_URL}/api/admin/blog/${articleId}/image-requirements/${req.id}/upload`,
        {
          method: 'POST',
          credentials: 'include' as RequestCredentials,
          body: fd,
        }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          body?.detail?.message ||
          `Грешка при качване (HTTP ${res.status}).`
        setError(msg)
      } else {
        await fetchData()
      }
    } catch (e) {
      setError('Мрежова грешка при качване.')
    } finally {
      setUploadingReqId(null)
    }
  }

  const handleBulkUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setBulkUploading(true)
    setBulkResult(null)
    setError(null)
    try {
      const fd = new FormData()
      Array.from(fileList).forEach((f) => fd.append('files', f))
      const res = await fetch(
        `${API_URL}/api/admin/blog/${articleId}/image-requirements/bulk-upload`,
        {
          method: 'POST',
          credentials: 'include' as RequestCredentials,
          body: fd,
        }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          body?.detail?.message ||
            `Грешка при групово качване (HTTP ${res.status}).`
        )
      } else {
        setBulkResult({
          attached: body.attached || [],
          unmatched: body.unmatched || [],
          conflicts: body.conflicts || [],
        })
        await fetchData()
      }
    } catch (e) {
      setError('Мрежова грешка при групово качване.')
    } finally {
      setBulkUploading(false)
      if (bulkInputRef.current) bulkInputRef.current.value = ''
    }
  }

  const handleAssign = async (
    fileUrl: string,
    fileName: string | undefined,
    requirementId: string
  ) => {
    setAssigningTo(fileUrl)
    setError(null)
    try {
      const res = await fetch(
        `${API_URL}/api/admin/blog/${articleId}/image-requirements/${requirementId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include' as RequestCredentials,
          body: JSON.stringify({
            uploaded_file_url: fileUrl,
            uploaded_file_name: fileName,
          }),
        }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          body?.detail?.message ||
            `Грешка при свързване (HTTP ${res.status}).`
        )
      } else {
        // Remove this entry from bulkResult.unmatched
        setBulkResult((prev) =>
          prev
            ? {
                ...prev,
                unmatched: prev.unmatched.filter(
                  (u) => u.uploaded_file_url !== fileUrl
                ),
              }
            : prev
        )
        await fetchData()
      }
    } catch (e) {
      setError('Мрежова грешка при свързване.')
    } finally {
      setAssigningTo(null)
      setAssignReqId('')
    }
  }

  if (loading) {
    return (
      <div
        data-testid="image-requirements-loading"
        className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-2 text-slate-500 text-sm"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Зареждам изисквания за изображения…
      </div>
    )
  }

  if (!data || data.requirements.length === 0) {
    // Hide panel when there are no requirements (regular manual articles)
    return null
  }

  const featuredReqs = data.requirements.filter(
    (r) => (r.type || '').toLowerCase() === 'featured'
  )
  const supportReqs = data.requirements.filter(
    (r) => (r.type || '').toLowerCase() !== 'featured'
  )

  const renderReq = (req: ImageRequirement, isFeatured: boolean) => {
    const isUploading = uploadingReqId === req.id
    return (
      <div
        key={req.id}
        data-testid={`image-req-${req.id}`}
        className={
          'rounded-lg border p-4 ' +
          (isFeatured
            ? 'border-amber-200 bg-amber-50/50'
            : 'border-slate-200 bg-white')
        }
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isFeatured ? (
                <Star className="w-4 h-4 text-amber-600" />
              ) : (
                <ImageIcon className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-sm font-semibold text-slate-900">
                {isFeatured
                  ? 'Featured изображение — не се вмъква в тялото'
                  : `Поставя се при ${placeholderToken(req.placeholder)}`}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-0.5">
              {req.expected_filename && (
                <div>
                  Очаквано име:{' '}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded">
                    {req.expected_filename}
                  </code>
                </div>
              )}
              {req.alt && (
                <div>
                  Alt: <span className="italic">{req.alt}</span>
                </div>
              )}
              {req.caption && <div>Caption: {req.caption}</div>}
              {req.implicit && (
                <div className="text-amber-700 italic">
                  (имплицитен слот — placeholder в тялото без IMAGE_ASSETS
                  запис)
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={req.upload_status} />
            <MatchedByBadge matchedBy={req.matched_by} />
          </div>
        </div>

        {req.upload_status === 'attached' && req.uploaded_file_url ? (
          <div className="flex items-center gap-3">
            <img
              src={`${API_URL}${req.uploaded_file_url}`}
              alt={req.alt || 'Preview'}
              className="w-20 h-20 object-cover rounded ring-1 ring-slate-200"
              data-testid={`req-preview-${req.id}`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-700 truncate">
                {req.uploaded_file_name}
              </div>
              <button
                type="button"
                onClick={() => slotInputRefs.current[req.id]?.click()}
                className="mt-1 text-xs text-teal-700 hover:text-teal-800 underline"
                data-testid={`req-replace-${req.id}`}
              >
                Замени файл
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => slotInputRefs.current[req.id]?.click()}
            disabled={isUploading}
            data-testid={`req-upload-${req.id}`}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-teal-700 bg-teal-50 ring-1 ring-teal-200 hover:bg-teal-100 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Качване…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Качи изображение
              </>
            )}
          </button>
        )}

        <input
          ref={(el) => {
            slotInputRefs.current[req.id] = el
          }}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            handleSlotUpload(req, file)
            e.target.value = ''
          }}
        />
      </div>
    )
  }

  return (
    <div
      data-testid="image-requirements-panel"
      className="bg-white rounded-xl border border-slate-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-teal-600" />
            Изисквания за изображения
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.requirements.length} слот(а) · Featured-ите се прикрепват към
            статията, support-ите се вмъкват по placeholder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchData()}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-slate-600 hover:bg-slate-100"
            data-testid="image-req-refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Обнови
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-slate-600 hover:bg-slate-100"
          >
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
            {collapsed ? 'Покажи' : 'Скрий'}
          </button>
        </div>
      </div>

      {error && (
        <div
          data-testid="image-req-error"
          className="mb-3 px-3 py-2 rounded-md text-xs bg-red-50 text-red-800 ring-1 ring-red-200"
        >
          {error}
        </div>
      )}

      {/* Summary status */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        {data.all_attached ? (
          <span
            data-testid="image-req-all-attached"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Готово за преглед — всички изображения са прикачени
          </span>
        ) : (
          <span
            data-testid="image-req-needs-images"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 ring-1 ring-amber-200"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Чакат се изображения
          </span>
        )}<button
          type="button"
          onClick={() => bulkInputRef.current?.click()}
          disabled={bulkUploading}
          data-testid="image-req-bulk-upload"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60"
        >
          {bulkUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          Качи няколко наведнъж
        </button>
        <input
          ref={bulkInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleBulkUpload(e.target.files)}
        />
      </div>

      {!collapsed && (
        <>
          {/* Publish protection warning */}
          {!data.all_attached && (
            <div
              data-testid="image-req-publish-blocked"
              className="mb-3 px-3 py-2 rounded-md text-xs bg-red-50 ring-1 ring-red-200 text-red-800 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Тази статия не може да бъде публикувана, докато всички image
                placeholders не са свързани с качени изображения.
              </span>
            </div>
          )}

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div
              data-testid="image-req-warnings"
              className="mb-4 px-3 py-2 rounded-md text-xs bg-amber-50 ring-1 ring-amber-200 text-amber-900"
            >
              <div className="font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Предупреждения
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                {data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Bulk result */}
          {bulkResult && (
            <div
              data-testid="bulk-upload-result"
              className="mb-4 p-3 rounded-md bg-slate-50 ring-1 ring-slate-200 text-xs space-y-2"
            >
              <div className="font-semibold text-slate-700">
                Резултат от груповото качване
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" />
                  Прикачени: {bulkResult.attached.length}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                  <AlertTriangle className="w-3 h-3" />
                  Без съвпадение: {bulkResult.unmatched.length}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700">
                  <XCircle className="w-3 h-3" />
                  Конфликти: {bulkResult.conflicts.length}
                </span>
              </div>
              {bulkResult.unmatched.length > 0 && (
                <div>
                  <div className="text-slate-600 mb-1">
                    Файлове без съвпадение — избери слот, към който да ги
                    свържеш:
                  </div>
                  <ul className="space-y-1">
                    {bulkResult.unmatched.map((u, i) => (
                      <li
                        key={i}
                        data-testid={`unmatched-row-${i}`}
                        className="flex items-center gap-2 flex-wrap"
                      >
                        <code className="bg-white px-1.5 py-0.5 rounded ring-1 ring-slate-200">
                          {u.filename}
                        </code>
                        <span className="text-slate-500">·</span>
                        {u.uploaded_file_url ? (
                          <>
                            <select
                              data-testid={`assign-select-${i}`}
                              className="text-xs px-2 py-1 rounded ring-1 ring-slate-200 bg-white"
                              value={
                                assigningTo === u.uploaded_file_url
                                  ? assignReqId
                                  : ''
                              }
                              onChange={(e) => setAssignReqId(e.target.value)}
                            >
                              <option value="">— избери слот —</option>
                              {data.requirements
                                .filter(
                                  (r) => r.upload_status !== 'attached'
                                )
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.type === 'featured'
                                      ? 'Featured'
                                      : placeholderToken(r.placeholder) ||
                                        r.expected_filename ||
                                        r.id.slice(0, 6)}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={
                                !assignReqId ||
                                assigningTo === u.uploaded_file_url
                              }
                              onClick={() =>
                                handleAssign(
                                  u.uploaded_file_url!,
                                  u.uploaded_file_name,
                                  assignReqId
                                )
                              }
                              data-testid={`assign-confirm-${i}`}
                              className="text-xs px-2 py-1 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                            >
                              Свържи
                            </button>
                          </>
                        ) : (
                          <span className="text-red-700">
                            {u.message || u.reason}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {bulkResult.conflicts.length > 0 && (
                <div className="text-red-800">
                  Конфликтите изискват ръчно качване от съответния слот по-долу.
                </div>
              )}
            </div>
          )}

          {/* Featured */}
          {featuredReqs.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Featured
              </div>
              <div className="space-y-3">
                {featuredReqs.map((r) => renderReq(r, true))}
              </div>
            </div>
          )}

          {/* Support */}
          {supportReqs.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Support
              </div>
              <div className="space-y-3">
                {supportReqs.map((r) => renderReq(r, false))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ImageRequirementsPanel
