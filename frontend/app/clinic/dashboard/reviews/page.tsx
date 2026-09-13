'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toPng } from 'html-to-image'
import { QRCodeCanvas } from 'qrcode.react'
import { ClinicShell } from '@/components/ClinicShell'
import { ReviewPoster, type PaperSize } from '@/components/ReviewPoster'
import {
  Loader2, Copy, Check, Star, ShieldCheck, Clock,
  CheckCircle2, XCircle, Inbox, Eye, ExternalLink, Download,
} from 'lucide-react'

// Print CSS renders at 96 CSS-px/inch; scaling captured output to a target
// DPI produces a print-quality file from the same mm-dimensioned DOM node
// the browser already lays out normally. A3 is capped lower than A4's
// 300 DPI (a ~17-megapixel canvas) because html-to-image's rasterization
// is synchronous and was measured to hang the tab's main thread for that
// size in this environment. 150 DPI is standard professional print
// quality for large-format posters viewed at a distance — the resolution
// drop isn't visible in practice, only the file-size/render-time is.
const PRINT_DPI: Record<PaperSize, number> = { A4: 300, A3: 150 }
const pixelRatioFor = (paperSize: PaperSize) => PRINT_DPI[paperSize] / 96

// html-to-image's default font auto-discovery clones and scans every
// stylesheet on the page to find @font-face rules to embed — against this
// app's 5000+ line globals.css that hangs indefinitely. Passing the exact
// @font-face rules the poster actually uses (mirrored from globals.css)
// as `fontEmbedCss` skips that scan entirely.
const POSTER_FONT_EMBED_CSS = `
@font-face { font-family: 'Manrope'; src: url('/fonts/taste/Manrope-Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Manrope'; src: url('/fonts/taste/Manrope-Medium.ttf') format('truetype'); font-weight: 500 600; font-style: normal; }
@font-face { font-family: 'Manrope'; src: url('/fonts/taste/Manrope-Bold.ttf') format('truetype'); font-weight: 700 800; font-style: normal; }
@font-face { font-family: 'Playfair Display'; src: url('/fonts/taste/PlayfairDisplay-SemiBold.ttf') format('truetype'); font-weight: 600; font-style: normal; }
@font-face { font-family: 'IBM Plex Mono'; src: url('/fonts/taste/IBMPlexMono-Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
`

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type Status = 'pending' | 'approved' | 'rejected'

interface Review {
  id: string
  status: Status
  source: string
  submitted_at: string
  rating_overall?: number | null
  patient_name_optional?: string | null
  patient_initials_public?: string | null
  treatment_type?: string | null
  feedback_text?: string | null
  private_note_to_clinic?: string | null
  consent_public_display?: boolean
  consent_contact_if_needed?: boolean
  display_permission?: boolean
  moderated_at?: string | null
}

interface LinkPayload {
  clinic_id: string
  clinic_name?: string | null
  city_name?: string | null
  logo_url?: string | null
  review_url: string
  qr_status: string
  qr_note?: string
  counts: { pending: number; approved: number; rejected: number }
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'В преглед',
  approved: 'Одобрено',
  rejected: 'Отхвърлено',
}

const STATUS_TONE: Record<Status, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export default function ClinicReviewsPage() {
  const [link, setLink] = useState<LinkPayload | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showPosterPreview, setShowPosterPreview] = useState(false)
  const [downloadingPoster, setDownloadingPoster] = useState<PaperSize | null>(null)
  const [downloadingQr, setDownloadingQr] = useState(false)
  const [downloadPaperSize, setDownloadPaperSize] = useState<PaperSize>('A4')
  const posterExportRef = useRef<HTMLDivElement>(null)
  const qrExportRef = useRef<HTMLCanvasElement>(null)

  // The backend default base URL ("https://zubite.bg") is a deployment
  // placeholder — it 404s in preview environments. The QR code MUST
  // always point to a host that actually serves the review page. Since
  // the clinic dashboard is loaded from the same origin that hosts the
  // public review route, `window.location.origin` is the only host we
  // are guaranteed works. We rebuild the public URL from the clinic_id
  // returned by the backend, and only fall back to the backend-supplied
  // string on the server (SSR) where `window` is unavailable.
  const [reviewUrl, setReviewUrl] = useState('')
  useEffect(() => {
    if (!link) return
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : ''
    setReviewUrl(
      origin
        ? `${origin}/review/clinic/${link.clinic_id}`
        : link.review_url || ''
    )
  }, [link])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, b] = await Promise.all([
        fetch(`${API_URL}/api/clinic/reviews/collection-link`, {
          credentials: 'include' as RequestCredentials,
        }),
        fetch(`${API_URL}/api/clinic/reviews`, {
          credentials: 'include' as RequestCredentials,
        }),
      ])
      if (a.ok) setLink(await a.json())
      if (b.ok) {
        const j = await b.json()
        setReviews(j.reviews || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCopy = async () => {
    if (!reviewUrl) return
    try {
      await navigator.clipboard.writeText(reviewUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  const triggerDownload = (dataUrl: string, filename: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }

  // Clinic names are Bulgarian (Cyrillic) — [^a-z0-9]+ strips every
  // character from a Cyrillic string, leaving an empty/dash-only
  // filename. Fall back to the stable clinic_id (always ASCII) rather
  // than silently producing "--poster-A4.png".
  const clinicFileSlug = () => {
    const fromName = (link?.clinic_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    return fromName || link?.clinic_id || 'zubite-clinic'
  }

  const downloadPoster = async (paperSize: PaperSize) => {
    setDownloadingPoster(paperSize)
    try {
      // The export node renders off-screen at whatever paperSize is
      // currently set — flip it first and let React commit before
      // capturing, or html-to-image would snapshot the previous size.
      setDownloadPaperSize(paperSize)
      await new Promise((resolve) => setTimeout(resolve, 60))
      const node = posterExportRef.current
      if (!node) return
      const dataUrl = await toPng(node, {
        pixelRatio: pixelRatioFor(paperSize),
        cacheBust: true,
        fontEmbedCSS: POSTER_FONT_EMBED_CSS,
      })
      triggerDownload(dataUrl, `${clinicFileSlug()}-poster-${paperSize}.png`)
    } finally {
      setDownloadingPoster(null)
    }
  }

  const downloadQrOnly = async () => {
    setDownloadingQr(true)
    try {
      const canvas = qrExportRef.current
      if (!canvas) return
      const dataUrl = canvas.toDataURL('image/png')
      triggerDownload(dataUrl, `${clinicFileSlug()}-qr-code.png`)
    } finally {
      setDownloadingQr(false)
    }
  }

  const filtered = filter === 'all'
    ? reviews
    : reviews.filter((r) => r.status === filter)

  if (loading) {
    return (
      <ClinicShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
        </div>
      </ClinicShell>
    )
  }

  return (
    <ClinicShell>
      <section className="space-y-6 pb-12" data-testid="clinic-reviews-page">
        <header>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Обратна връзка от пациенти
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Споделете линка с вашите пациенти. Подадените мнения се преглеждат
            от Zubite, преди да станат публични.
          </p>
        </header>

        {/* Link + QR + Print */}
        {link && (
          <div
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 grid lg:grid-cols-[1fr_auto] gap-5 print:hidden"
            data-testid="clinic-review-link-card"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Линк за ревюта
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <span
                  className="text-xs sm:text-sm text-teal-700 truncate font-mono flex-1 min-w-0"
                  data-testid="clinic-review-url"
                  title={reviewUrl}
                >
                  {reviewUrl || 'Зареждане…'}
                </span>
                <button
                  type="button"
                  onClick={() => reviewUrl && window.open(reviewUrl, '_blank', 'noopener,noreferrer')}
                  disabled={!reviewUrl}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-40"
                  data-testid="clinic-review-open-btn"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Отвори
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-teal-600 hover:bg-teal-50"
                  data-testid="clinic-review-copy-btn"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Копирано' : 'Копирай линк'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setShowPosterPreview((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-medium"
                  data-testid="clinic-review-preview-btn"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showPosterPreview ? 'Скрий преглед' : 'Преглед на постера'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadPoster('A4')}
                  disabled={!reviewUrl || downloadingPoster !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50"
                  data-testid="clinic-review-download-a4-btn"
                >
                  {downloadingPoster === 'A4' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Изтегли постер A4
                </button>
                <button
                  type="button"
                  onClick={() => downloadPoster('A3')}
                  disabled={!reviewUrl || downloadingPoster !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium disabled:opacity-50"
                  data-testid="clinic-review-download-a3-btn"
                >
                  {downloadingPoster === 'A3' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Изтегли постер A3
                </button>
                <button
                  type="button"
                  onClick={downloadQrOnly}
                  disabled={!reviewUrl || downloadingQr}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium disabled:opacity-50"
                  data-testid="clinic-review-download-qr-btn"
                >
                  {downloadingQr ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Само QR код
                </button>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 basis-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Само админ преглежда мненията.
                </span>
              </div>
            </div>

            {/* QR code (locally rendered) */}
            <div
              className="rounded-xl border border-slate-200 bg-white p-4 grid place-items-center text-center min-w-[180px]"
              data-testid="clinic-review-qr"
            >
              <QRCodeCanvas
                value={reviewUrl}
                size={144}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0f172a"
                data-testid="clinic-review-qr-canvas"
              />
              <p className="mt-2 text-[11px] text-slate-500 leading-snug max-w-[150px]">
                Сканирайте за оставяне на мнение
              </p>
            </div>
          </div>
        )}

        {/* Counts */}
        <div className="grid grid-cols-3 gap-3 print:hidden">
          {(['pending', 'approved', 'rejected'] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={
                'rounded-2xl border bg-white p-4 text-left transition ' +
                (filter === s ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-200 hover:border-slate-300')
              }
              data-testid={`clinic-review-count-${s}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {STATUS_LABEL[s]}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {link?.counts[s] ?? 0}
              </p>
            </button>
          ))}
        </div>

        {filter !== 'all' && (
          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="text-xs text-teal-600 hover:text-teal-700"
            >
              Покажи всички
            </button>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div
              className="grid place-items-center text-center py-12 text-slate-500"
              data-testid="clinic-reviews-empty"
            >
              <Inbox className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-sm">Все още няма получени мнения.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Споделете линка по-горе с пациентите си.
              </p>
            </div>
          ) : (
            filtered.map((r) => (
              <article
                key={r.id}
                className="p-5"
                data-testid={`clinic-review-${r.id}`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ' +
                      STATUS_TONE[r.status]
                    }
                    data-testid={`clinic-review-status-${r.id}`}
                  >
                    {r.status === 'pending' && <Clock className="w-3 h-3" />}
                    {r.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                    {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
                    {STATUS_LABEL[r.status]}
                  </span>
                  {typeof r.rating_overall === 'number' && r.rating_overall > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600 text-xs">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5"
                          fill={i < (r.rating_overall || 0) ? 'currentColor' : 'none'}
                        />
                      ))}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">
                    {new Date(r.submitted_at).toLocaleString('bg-BG')}
                  </span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {r.feedback_text}
                </p>
                {(r.patient_name_optional || r.treatment_type) && (
                  <p className="mt-2 text-xs text-slate-500">
                    {r.patient_name_optional ? <span>{r.patient_name_optional}</span> : null}
                    {r.patient_name_optional && r.treatment_type ? ' · ' : ''}
                    {r.treatment_type ? <span>{r.treatment_type}</span> : null}
                  </p>
                )}
                {r.private_note_to_clinic && (
                  <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Лично съобщение към клиниката
                    </p>
                    <p className="text-xs text-slate-700 whitespace-pre-line">
                      {r.private_note_to_clinic}
                    </p>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {/* Inline poster preview (on-screen, scaled) */}
        {link && showPosterPreview && (
          <div
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 print:hidden"
            data-testid="clinic-review-poster-preview"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Преглед на постера
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Така ще изглежда вашият принтиран постер (A4, портрет).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPosterPreview(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Затвори
              </button>
            </div>
            <div className="flex justify-center bg-slate-50 rounded-xl p-4 sm:p-6">
              <ReviewPoster
                clinicName={link.clinic_name}
                cityName={link.city_name}
                reviewUrl={reviewUrl}
                logoUrl={link.logo_url}
                variant="preview"
              />
            </div>
          </div>
        )}

        {/* Off-screen export sources — laid out at full physical size (not
            display:none, which would give html-to-image nothing to
            measure) but positioned far outside the viewport so the clinic
            never sees them. downloadPoster() flips downloadPaperSize, waits
            a tick for the resize to commit, then captures this node. */}
        {link && (
          <div
            aria-hidden
            style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1 }}
          >
            <div ref={posterExportRef} data-testid="clinic-review-poster-export">
              <ReviewPoster
                clinicName={link.clinic_name}
                cityName={link.city_name}
                reviewUrl={reviewUrl}
                logoUrl={link.logo_url}
                variant="print"
                paperSize={downloadPaperSize}
              />
            </div>
            {/* Large enough to be a genuinely usable standalone QR file —
                the on-screen 144px canvas above is a thumbnail, not this. */}
            <QRCodeCanvas
              ref={qrExportRef}
              value={reviewUrl}
              size={1024}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0A0A0A"
            />
          </div>
        )}
      </section>
    </ClinicShell>
  )
}
