'use client'

import { useState, useCallback, useEffect } from 'react'
import { Loader2, RefreshCw, Copy, CheckCircle2, AlertTriangle, XCircle, ExternalLink } from 'lucide-react'

interface SeoStatus {
  post_id: string
  slug: string
  is_published: boolean
  indexable: boolean
  canonical_url: string | null
  canonical_valid: boolean
  in_sitemap: boolean
  robots_allowed: boolean
  has_article_schema: boolean
  has_faq_schema: boolean
  public_status_code: number | null
  public_status_error: string | null
  last_updated: string | null
  last_published: string | null
  errors: string[]
  warnings: string[]
  checked_at: string
}

export function SeoStatusPanel({ postId, autoFetch = true }: { postId: string; autoFetch?: boolean }) {
  const [status, setStatus] = useState<SeoStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchStatus = useCallback(async () => {
    setError('')
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${API_URL}/api/admin/blog/posts/${postId}/seo-status`, {
        credentials: 'include' as RequestCredentials,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || res.statusText)
      }
      setStatus(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка')
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (autoFetch) fetchStatus()
  }, [autoFetch, fetchStatus])

  const copyUrl = async () => {
    if (!status?.canonical_url) return
    try {
      await navigator.clipboard.writeText(status.canonical_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: do nothing
    }
  }

  const Row = ({ ok, label, value }: { ok: boolean | null; label: string; value?: string }) => (
    <div className="flex items-center gap-2 text-sm" data-testid={`seo-row-${label.replace(/\s/g, '-').toLowerCase()}`}>
      {ok === true && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
      {ok === false && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
      {ok === null && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
      <span className="text-slate-700 flex-1">{label}</span>
      {value && <span className="text-slate-500 text-xs font-mono truncate max-w-[200px]">{value}</span>}
    </div>
  )

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white" data-testid="seo-status-panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 text-sm">SEO Indexing Status</h3>
        <button
          type="button"
          onClick={fetchStatus}
          disabled={isLoading}
          className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          data-testid="seo-revalidate-btn"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Revalidate SEO
        </button>
      </div>

      {error && (
        <div className="text-xs bg-red-50 text-red-700 border border-red-100 rounded p-2 mb-2" data-testid="seo-error">
          {error}
        </div>
      )}

      {!status && !isLoading && !error && (
        <p className="text-xs text-slate-400">Натиснете „Revalidate SEO“, за да заредите статуса.</p>
      )}

      {status && (
        <div className="space-y-2">
          <Row ok={status.indexable} label="Indexable" />
          <Row ok={status.canonical_valid} label="Canonical valid" value={status.canonical_url || undefined} />
          <Row ok={status.in_sitemap} label="In sitemap" />
          <Row ok={status.robots_allowed} label="Robots allowed" />
          <Row ok={status.has_article_schema} label="Article schema" />
          <Row ok={status.has_faq_schema} label="FAQ schema" />
          <Row
            ok={status.public_status_code === 200 ? true : status.public_status_code ? false : null}
            label="Public URL status"
            value={status.public_status_code ? String(status.public_status_code) : 'N/A'}
          />

          {status.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {status.errors.map((e, i) => (
                <div key={i} className="text-xs text-red-700 bg-red-50 rounded p-1.5" data-testid={`seo-error-${i}`}>
                  ❌ {e}
                </div>
              ))}
            </div>
          )}
          {status.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {status.warnings.map((w, i) => (
                <div key={i} className="text-xs text-amber-700 bg-amber-50 rounded p-1.5" data-testid={`seo-warn-${i}`}>
                  ⚠️ {w}
                </div>
              ))}
            </div>
          )}

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            {status.last_updated && (
              <div>Последна редакция: {new Date(status.last_updated).toLocaleString('bg-BG')}</div>
            )}
            {status.last_published && (
              <div>Публикувано: {new Date(status.last_published).toLocaleString('bg-BG')}</div>
            )}
          </div>

          {status.canonical_url && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-xs text-slate-500">Public URL за Google Search Console:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1.5 truncate">
                  {status.canonical_url}
                </code>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-xs"
                  data-testid="seo-copy-url-btn"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Копирано' : 'Копирай'}
                </button>
                <a
                  href={status.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-xs"
                  data-testid="seo-open-url-btn"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Отвори
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
