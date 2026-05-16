'use client'

import { useEffect, useState, useCallback } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { ClinicShell } from '@/components/ClinicShell'
import {
  Loader2, Copy, Check, Printer, Star, ShieldCheck, Clock,
  CheckCircle2, XCircle, Inbox,
} from 'lucide-react'

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
    if (!link?.review_url) return
    try {
      await navigator.clipboard.writeText(link.review_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print()
  }

  const filtered = filter === 'all'
    ? reviews
    : reviews.filter((r) => r.status === filter)

  if (loading) {
    return (
      <ClinicShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
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
                Линк за обратна връзка
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <span
                  className="text-xs sm:text-sm text-slate-700 truncate font-mono"
                  data-testid="clinic-review-url"
                >
                  {link.review_url}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-sky-600 hover:bg-sky-50"
                  data-testid="clinic-review-copy-btn"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Копирано' : 'Копирай'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                  data-testid="clinic-review-print-btn"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Принтиране на постер
                </button>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
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
                value={link.review_url}
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
                (filter === s ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-200 hover:border-slate-300')
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
              className="text-xs text-sky-600 hover:text-sky-700"
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

        {/* Print poster (only visible during print) */}
        {link && (
          <div className="hidden print:block" data-testid="clinic-review-print-poster">
            <div className="text-center py-12 px-8">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                Zubite.bg
              </p>
              <h1 className="font-serif text-4xl font-semibold mb-3">
                Споделете обратна връзка за нашата клиника
              </h1>
              <p className="text-base text-slate-700 max-w-md mx-auto">
                Сканирайте QR кода и оставете мнение в Zubite.bg.
              </p>
              <div className="my-10 grid place-items-center">
                <QRCodeCanvas
                  value={link.review_url}
                  size={240}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  data-testid="clinic-review-print-qr"
                />
                <p className="mt-3 text-xs font-mono break-all max-w-md">
                  {link.review_url}
                </p>
              </div>
              <p className="text-sm text-slate-700 mt-6">
                Обратната връзка се преглежда преди публично показване.
              </p>
            </div>
          </div>
        )}

        <style jsx global>{`
          @media print {
            body { background: white !important; }
            nav, aside, header { display: none !important; }
          }
        `}</style>
      </section>
    </ClinicShell>
  )
}
