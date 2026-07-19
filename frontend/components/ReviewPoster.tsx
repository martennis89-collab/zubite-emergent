'use client'

/**
 * Zubite.bg branded review-collection poster.
 * Used on the clinic dashboard "Обратна връзка" download flow.
 *
 * Design language: SOCIAL_BRAND_KIT.md — "The Independent Editorial
 * Guide." Warm Paper canvas, Editorial Ink type, one Signal Orange accent,
 * Trust Emerald for verification/evidence. Composition is editorial
 * structure (headline, precision-border panel, thin dividers) rather than
 * decorative blur blobs or glassmorphism — see SOCIAL_BRAND_KIT.md §2, §7.
 *
 * Renders at exact print dimensions for A4 or A3 portrait. The screen
 * preview (`variant="preview"`) is a scaled-down on-screen render with the
 * same proportions, so the clinic can see what they'll get before
 * downloading.
 */
import type { ReactNode } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { ShieldCheck, Sparkles, Eye } from 'lucide-react'

// Brand kit tokens (SOCIAL_BRAND_KIT.md §3) — not in tailwind.config.js
// since this poster is the only consumer of the full palette; inline
// hex keeps it a single source of truth against the brand-kit table.
const INK = '#0A0A0A'
const MUTED = '#525252'
const FAINT = '#737373'
const BORDER = '#E5E5E5'
const PAPER = '#F5F4F2'
const ORANGE = '#FF6B00'
const EMERALD = '#007956'
const SOFT_TRUST = '#D0FAE5'

const MANROPE = "'Manrope', sans-serif"
const PLAYFAIR = "'Playfair Display', serif"
const MONO = "'IBM Plex Mono', monospace"

export type PaperSize = 'A4' | 'A3'

// A3 is exactly one ISO-216 step up from A4 (√2 linear scale). Sizing
// type/spacing per-paper rather than relying on CSS mm units to scale,
// so A3 reads as a deliberately bigger poster, not a stretched A4.
const PAPER_DIMENSIONS: Record<PaperSize, { widthMm: number; heightMm: number; scale: number }> = {
  A4: { widthMm: 210, heightMm: 297, scale: 1 },
  A3: { widthMm: 297, heightMm: 420, scale: 1.414 },
}

interface Props {
  clinicName?: string | null
  cityName?: string | null
  reviewUrl: string
  /**
   * 'print' (default) → poster renders at exact physical paper dimensions.
   * 'preview'         → poster renders inline on screen at a controlled
   *                     width with the same proportions.
   */
  variant?: 'print' | 'preview'
  paperSize?: PaperSize
  /**
   * Clinic-uploaded logo for co-branding. Placed small in the footer,
   * labeled "С участието на" — SOCIAL_BRAND_KIT.md §5 is explicit that a
   * clinic logo must never sit beside the Zubite wordmark as an equal
   * lockup; Zubite stays the platform owner, the clinic a contributor.
   */
  logoUrl?: string | null
}

export function ReviewPoster({
  clinicName,
  cityName,
  reviewUrl,
  variant = 'print',
  paperSize = 'A4',
  logoUrl,
}: Props) {
  const isPreview = variant === 'preview'
  const { widthMm, heightMm, scale } = PAPER_DIMENSIONS[paperSize]
  // mm() scales a "designed at A4" value up for A3; on-screen preview
  // keeps everything at the A4 scale since it's already a fixed-width
  // scaled-down render (the aspect ratio, not absolute size, is what
  // needs to change between paper sizes there).
  const mm = (a4Value: number) => (isPreview ? a4Value : a4Value * scale)

  return (
    <div
      className={
        'review-poster relative overflow-hidden mx-auto ' +
        (isPreview
          ? 'w-full max-w-[420px] rounded-2xl shadow-lg ring-1 ring-slate-200'
          : '')
      }
      style={{
        backgroundColor: PAPER,
        ...(isPreview
          ? { aspectRatio: `${widthMm} / ${heightMm}` }
          : { width: `${widthMm}mm`, height: `${heightMm}mm` }),
      }}
      data-testid="review-poster"
      data-variant={variant}
      data-paper-size={paperSize}
    >
      {/* Editorial structure: a single precision-border geometric frame,
          not a decorative blur/glow blob (SOCIAL_BRAND_KIT.md §7 — "Do not
          create liveliness with random blobs, excessive blur"). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[6mm] rounded-none"
        style={{ border: `1px solid ${BORDER}` }}
      />

      <div
        className="relative h-full flex flex-col"
        style={{ padding: isPreview ? '7%' : `${mm(18)}mm` }}
      >
        {/* Wordmark — Manrope Extra Bold, Editorial Ink + Trust Emerald
            ".bg" (brand kit §5). Never the old serif/teal treatment. */}
        <div className="flex items-center justify-between">
          <div
            className="font-extrabold tracking-tight leading-none"
            style={{
              fontFamily: MANROPE,
              fontSize: isPreview ? 24 : mm(9),
            }}
            data-testid="review-poster-brand"
          >
            <span style={{ color: INK }}>Zubite</span>
            <span style={{ color: EMERALD }}>.bg</span>
          </div>
          <span
            className="inline-flex items-center gap-1.5 font-medium"
            style={{
              fontFamily: MANROPE,
              backgroundColor: SOFT_TRUST,
              color: EMERALD,
              borderRadius: 999,
              fontSize: isPreview ? 10 : mm(3.2),
              padding: isPreview ? '4px 10px' : `${mm(1.6)}mm ${mm(3.2)}mm`,
            }}
          >
            <ShieldCheck className={isPreview ? 'w-3 h-3' : ''} style={!isPreview ? { width: mm(3.5), height: mm(3.5) } : undefined} />
            Платформа за орална грижа
          </span>
        </div>

        {/* Thin precision divider — replaces the old dotted/blob motif. */}
        <div
          aria-hidden
          style={{
            height: 2,
            backgroundColor: INK,
            width: isPreview ? 40 : mm(14),
            marginTop: isPreview ? 20 : mm(8),
          }}
        />

        {/* Hero copy */}
        <div style={{ marginTop: isPreview ? 14 : mm(6) }}>
          <p
            className="uppercase font-semibold"
            style={{
              fontFamily: MANROPE,
              letterSpacing: '0.12em',
              color: EMERALD,
              fontSize: isPreview ? 10 : mm(3.4),
            }}
          >
            Обратна връзка от пациенти
          </p>
          <h1
            className="font-extrabold leading-[1.05] mt-2"
            style={{ fontFamily: MANROPE, color: INK, fontSize: isPreview ? 26 : mm(10.5) }}
            data-testid="review-poster-headline"
          >
            Споделете{' '}
            <span style={{ fontFamily: PLAYFAIR, fontStyle: 'italic', fontWeight: 600, color: ORANGE }}>
              мнение
            </span>
            <br />
            за вашето посещение
          </h1>
          {clinicName && (
            <p
              className="mt-3"
              style={{ fontFamily: MANROPE, color: MUTED, fontSize: isPreview ? 12 : mm(4.2) }}
              data-testid="review-poster-clinic"
            >
              <span className="font-semibold" style={{ color: INK }}>{clinicName}</span>
              {cityName ? <span style={{ color: FAINT }}> · {cityName}</span> : null}
            </p>
          )}
        </div>

        {/* Evidence/action surface — white panel, precise 1px border, one
            labeled next step (brand kit §7 composition system, layer 3). */}
        <div
          className="relative mt-auto mb-auto self-center w-full"
          style={{ maxWidth: isPreview ? undefined : `${mm(115)}mm` }}
        >
          <div
            className="relative mx-auto bg-white"
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: isPreview ? 20 : mm(8),
              padding: isPreview ? 16 : mm(9),
              maxWidth: isPreview ? 260 : undefined,
            }}
          >
            <div className="grid place-items-center">
              <QRCodeCanvas
                value={reviewUrl}
                size={isPreview ? 180 : Math.round(mm(38) * 3.78)}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor={INK}
                data-testid="review-poster-qr"
              />
            </div>
            <p
              className="mt-3 text-center break-all"
              style={{ fontFamily: MONO, color: FAINT, fontSize: isPreview ? 8 : mm(2.6) }}
            >
              {reviewUrl}
            </p>
          </div>

          <p
            className="mt-4 text-center"
            style={{ fontFamily: MANROPE, color: INK, fontSize: isPreview ? 11 : mm(3.8) }}
          >
            Сканирайте QR кода и оставете кратка обратна връзка.
          </p>
        </div>

        {/* Trust strip — Trust Emerald signals, Soft Trust chip surfaces. */}
        <div
          className="flex items-center justify-center flex-wrap gap-x-3 gap-y-2"
          style={{
            fontFamily: MANROPE,
            color: MUTED,
            fontSize: isPreview ? 10 : mm(3.2),
            marginTop: isPreview ? 8 : mm(5),
          }}
          data-testid="review-poster-trust"
        >
          <TrustChip icon={<ShieldCheck />} label="Около 60 секунди" isPreview={isPreview} mm={mm} />
          <TrustChip icon={<Sparkles />} label="Без регистрация" isPreview={isPreview} mm={mm} />
          <TrustChip icon={<Eye />} label="Преглежда се преди публикуване" isPreview={isPreview} mm={mm} />
        </div>

        {/* Footer — brand sign-off line per SOCIAL_BRAND_KIT.md §1. */}
        <div
          className="text-center"
          style={{
            borderTop: `1px solid ${BORDER}`,
            paddingTop: isPreview ? 12 : mm(5),
            marginTop: isPreview ? 12 : mm(6),
          }}
        >
          <p
            style={{ fontFamily: MANROPE, color: INK, fontSize: isPreview ? 11 : mm(4) }}
          >
            Вашето мнение помага на други пациенти да направят
            {!isPreview && <br />}{' '}по-информиран избор.
          </p>
          <p
            className="mt-1 font-medium uppercase"
            style={{
              fontFamily: MANROPE,
              color: EMERALD,
              letterSpacing: '0.1em',
              fontSize: isPreview ? 9 : mm(2.8),
            }}
          >
            Ориентир, не диагноза.
          </p>
          {logoUrl && (
            <div
              className="flex items-center justify-center"
              style={{ gap: isPreview ? 6 : mm(2), marginTop: isPreview ? 10 : mm(4) }}
              data-testid="review-poster-co-brand"
            >
              <span
                className="uppercase"
                style={{
                  fontFamily: MANROPE,
                  color: FAINT,
                  letterSpacing: '0.08em',
                  fontSize: isPreview ? 8 : mm(2.6),
                }}
              >
                С участието на
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt=""
                style={{ height: isPreview ? 16 : mm(5.5), width: 'auto', maxWidth: isPreview ? 60 : mm(22), objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TrustChip({
  icon, label, isPreview, mm,
}: {
  icon: ReactNode
  label: string
  isPreview: boolean
  mm: (v: number) => number
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        backgroundColor: SOFT_TRUST,
        color: EMERALD,
        borderRadius: 999,
        padding: isPreview ? '3px 8px' : `${mm(1.2)}mm ${mm(3)}mm`,
      }}
    >
      <span
        className={isPreview ? 'w-3 h-3' : ''}
        style={!isPreview ? { width: mm(3.2), height: mm(3.2) } : undefined}
      >
        {icon}
      </span>
      {label}
    </span>
  )
}
