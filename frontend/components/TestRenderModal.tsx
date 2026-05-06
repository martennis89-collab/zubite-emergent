'use client'

import { useEffect, useMemo } from 'react'
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ImageIcon as ImageBox,
  ArrowRight,
} from 'lucide-react'
import type { ParsedArticle } from '@/lib/articleParser'
import {
  validateTestRender,
  buildPreviewHtml,
  PreviewImage,
} from '@/lib/articleTestRender'

interface Props {
  open: boolean
  onClose: () => void
  parsed: ParsedArticle
  rawMd: string
  /** Map of fileName → Blob from the in-memory ZIP, optional. */
  zipBlobs?: Map<string, Blob>
}

export function TestRenderModal({ open, onClose, parsed, rawMd, zipBlobs }: Props) {
  // Build object URLs for preview (lifecycle-managed)
  const images: PreviewImage[] = useMemo(() => {
    if (!open) return []
    const out: PreviewImage[] = []
    for (const asset of parsed.imageAssets) {
      const blob = zipBlobs?.get(asset.fileName)
      const url = blob
        ? URL.createObjectURL(blob)
        : `data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#64748b" text-anchor="middle" dominant-baseline="middle">Преглед: ${asset.fileName} (не е качено)</text></svg>`,
          )}`
      out.push({ asset, url })
    }
    return out
  }, [open, parsed.imageAssets, zipBlobs])

  // Cleanup object URLs on close
  useEffect(() => {
    return () => {
      for (const img of images) {
        if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url)
      }
    }
  }, [images])

  // Esc to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const report = useMemo(
    () => (open ? validateTestRender(parsed, rawMd) : null),
    [open, parsed, rawMd],
  )
  const rendered = useMemo(
    () => (open ? buildPreviewHtml(parsed, images) : null),
    [open, parsed, images],
  )

  const featured = images.find(
    (i) =>
      (i.asset.placement || '').toLowerCase() === 'featured_image' ||
      (i.asset.type || '').toLowerCase() === 'featured',
  )

  if (!open || !report || !rendered) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="test-render-overlay"
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-5xl my-8"
        onClick={(e) => e.stopPropagation()}
        data-testid="test-render-modal"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-serif text-xl font-semibold text-slate-900">
              Test Render — финален преглед
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Точно това ще види читателят след публикуване.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            data-testid="test-render-close"
            aria-label="Затвори"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* LEFT: Validation checklist + meta summary */}
          <aside className="space-y-4">
            <div
              className={`rounded-lg border p-3 text-sm ${
                report.errors.length > 0
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : report.warnings.length > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
              data-testid="test-render-summary"
            >
              {report.errors.length > 0 ? (
                <span>
                  <strong>{report.errors.length}</strong> блокиращи грешки
                </span>
              ) : report.warnings.length > 0 ? (
                <span>
                  <strong>{report.warnings.length}</strong> предупреждения, готова за save
                </span>
              ) : (
                <span>Готова за публикуване.</span>
              )}
            </div>

            {/* Checklist */}
            <div className="border border-slate-200 rounded-lg" data-testid="test-render-checklist">
              <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Validation Checklist
              </div>
              <ul className="divide-y divide-slate-100">
                {report.checks.map((c) => (
                  <li key={c.id} className="px-3 py-2 flex items-start gap-2 text-xs">
                    {c.status === 'pass' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    )}
                    {c.status === 'warn' && (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    )}
                    {c.status === 'fail' && (
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="flex-1">
                      <span
                        className={
                          c.status === 'fail'
                            ? 'text-red-700 font-medium'
                            : c.status === 'warn'
                            ? 'text-amber-700'
                            : 'text-slate-700'
                        }
                      >
                        {c.label}
                      </span>
                      {c.detail && (
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          {c.detail}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Metadata summary */}
            <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1.5" data-testid="test-render-meta">
              <div className="font-semibold text-slate-700 uppercase tracking-wide text-[11px] mb-1">
                Метаданни
              </div>
              <Row k="Slug" v={parsed.slug} />
              <Row
                k="SEO Title"
                v={`${parsed.seoTitle} (${parsed.seoTitle.length}/60)`}
                bad={parsed.seoTitle.length > 60}
              />
              <Row
                k="Meta Desc"
                v={`${parsed.metaDescription.slice(0, 60)}… (${parsed.metaDescription.length}/155)`}
                bad={parsed.metaDescription.length > 155}
              />
              <Row k="Category" v={parsed.category} />
              <Row k="Tags" v={parsed.tags.join(', ') || '—'} />
              <Row k="Author" v={parsed.author || '—'} />
              <Row k="Reviewed By" v={parsed.reviewedBy || '—'} />
              <Row k="Last Reviewed" v={parsed.lastReviewed || '—'} />
              <Row k="Language" v={parsed.language} />
              <Row k="Status" v={parsed.status} />
            </div>

            {/* Schema validation summary */}
            <div className="border border-slate-200 rounded-lg p-3 text-xs" data-testid="test-render-schemas">
              <div className="font-semibold text-slate-700 uppercase tracking-wide text-[11px] mb-2">
                JSON-LD
              </div>
              <SchemaStatus label="FAQ Schema" value={parsed.faqSchema} error={parsed.faqSchemaError} />
              <SchemaStatus
                label="Article Schema"
                value={parsed.articleSchema}
                error={parsed.articleSchemaError}
              />
            </div>
          </aside>

          {/* RIGHT: Final render preview */}
          <article className="min-w-0">
            {/* Featured image preview */}
            <div className="mb-6" data-testid="test-render-featured">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Featured Image
              </div>
              {featured ? (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.url}
                    alt={featured.asset.alt || parsed.featuredImageAlt || parsed.title}
                    className="w-full h-auto block"
                  />
                  <div className="px-3 py-2 text-xs text-slate-600 bg-slate-50 border-t border-slate-100">
                    <span className="font-mono">{featured.asset.fileName}</span>
                    {' · alt: '}
                    <em>{featured.asset.alt || parsed.featuredImageAlt || '(няма)'}</em>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 flex items-center gap-3 text-slate-400 text-sm">
                  <ImageBox className="w-5 h-5" />
                  Няма featured image декларирана в IMAGE_ASSETS.
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-4 leading-tight">
              {parsed.title || '(без заглавие)'}
            </h1>
            {parsed.excerpt && (
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                {parsed.excerpt}
              </p>
            )}

            {/* Body */}
            <div
              className="prose prose-slate max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: rendered.finalHtml }}
              data-testid="test-render-body"
            />

            {/* CTA preview */}
            {parsed.cta && (parsed.cta.title || parsed.cta.text) && (
              <div
                className="bg-sky-50 border border-sky-100 rounded-2xl p-6 my-8 text-center"
                data-testid="test-render-cta"
              >
                {parsed.cta.title && (
                  <h2 className="font-serif text-xl font-semibold text-slate-900 mb-2">
                    {parsed.cta.title}
                  </h2>
                )}
                {parsed.cta.text && <p className="text-slate-600 mb-4">{parsed.cta.text}</p>}
                {parsed.cta.button && (
                  <span className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-sky-500 text-white font-medium">
                    {parsed.cta.button}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
                {parsed.cta.url && (
                  <div className="text-[11px] text-slate-400 mt-2 font-mono">→ {parsed.cta.url}</div>
                )}
              </div>
            )}

            {/* FAQ preview */}
            {parsed.faq.length > 0 && (
              <section className="mb-6 border-t border-slate-200 pt-6" data-testid="test-render-faq">
                <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">
                  Често задавани въпроси
                </h2>
                <ul className="space-y-3">
                  {parsed.faq.map((it, i) => (
                    <li
                      key={i}
                      className="border border-slate-200 rounded-lg p-3"
                      data-testid={`test-render-faq-${i}`}
                    >
                      <div className="font-medium text-slate-900 text-sm">{it.q}</div>
                      <div className="text-sm text-slate-600 mt-1">{it.a}</div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Related links + sources */}
            {parsed.internalLinks.length > 0 && (
              <section className="mb-4 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Свързани статии</h3>
                <ul className="text-sm space-y-1">
                  {parsed.internalLinks.map((l, i) => (
                    <li key={i}>
                      <span className="text-sky-600 underline">{l.label}</span>
                      <span className="text-slate-400 font-mono text-xs"> ({l.url})</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {parsed.externalSources.length > 0 && (
              <section className="mb-2 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Източници</h3>
                <ul className="text-sm space-y-1 text-slate-600">
                  {parsed.externalSources.map((s, i) => (
                    <li key={i}>
                      {s.title}
                      <span className="text-slate-400 font-mono text-xs"> — {s.url}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-slate-500 w-20 flex-shrink-0">{k}</span>
      <span className={`flex-1 truncate ${bad ? 'text-red-600' : 'text-slate-700'}`} title={v}>
        {v}
      </span>
    </div>
  )
}

function SchemaStatus({
  label,
  value,
  error,
}: {
  label: string
  value: object | null
  error?: string
}) {
  if (error) {
    return (
      <div className="flex items-start gap-1.5 mb-1">
        <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
        <span className="text-red-600 text-[11px]">
          {label}: {error}
        </span>
      </div>
    )
  }
  if (!value) {
    return (
      <div className="flex items-start gap-1.5 mb-1">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
        <span className="text-amber-700 text-[11px]">{label}: липсва</span>
      </div>
    )
  }
  const ctx = (value as Record<string, unknown>)['@context']
  const ctxOk = ctx === 'https://schema.org'
  return (
    <div className="flex items-start gap-1.5 mb-1">
      {ctxOk ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
      )}
      <span className={ctxOk ? 'text-slate-700 text-[11px]' : 'text-red-600 text-[11px]'}>
        {label}: @context = "{String(ctx)}"
      </span>
    </div>
  )
}
