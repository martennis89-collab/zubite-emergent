'use client'

/**
 * Premium Zubite.bg branded review-collection poster.
 * Used on the clinic dashboard "Принтиране на постер" flow.
 *
 * Design language: Care Pass aesthetic — warm ivory base, soft sky-blue
 * accents, serif wordmark, rounded cards, dotted/blob decorative motifs.
 *
 * Renders for A4 portrait at print time. The screen preview (when
 * `previewMode` is set) is a scaled-down on-screen render so the user can
 * see what they will print before clicking Print.
 */
import { QRCodeCanvas } from 'qrcode.react'
import { ShieldCheck, Sparkles, Eye } from 'lucide-react'

interface Props {
  clinicName?: string | null
  cityName?: string | null
  reviewUrl: string
  /**
   * 'print' (default) → poster renders at exact A4 dimensions.
   * 'preview'         → poster renders inline on screen at a controlled
   *                     width with the same proportions, so the user can
   *                     visually check it before printing.
   */
  variant?: 'print' | 'preview'
}

export function ReviewPoster({
  clinicName,
  cityName,
  reviewUrl,
  variant = 'print',
}: Props) {
  const isPreview = variant === 'preview'

  return (
    <div
      className={
        'review-poster relative overflow-hidden mx-auto bg-[#FAFBFD] ' +
        (isPreview
          ? 'w-full max-w-[420px] aspect-[210/297] rounded-2xl shadow-lg ring-1 ring-slate-200'
          : 'w-[210mm] h-[297mm]')
      }
      data-testid="review-poster"
      data-variant={variant}
    >
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 w-[60%] aspect-square rounded-full bg-gradient-to-br from-sky-200/60 via-sky-100/50 to-transparent blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 w-[55%] aspect-square rounded-full bg-gradient-to-tr from-cyan-100/50 via-sky-50/40 to-transparent blur-3xl"
      />

      {/* Dot pattern bottom-right */}
      <svg
        aria-hidden
        className="pointer-events-none absolute bottom-6 right-6 w-24 h-24 opacity-50"
        viewBox="0 0 100 100"
      >
        <defs>
          <pattern id="rp-dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#7dd3fc" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#rp-dots)" />
      </svg>

      {/* Inner padded canvas */}
      <div
        className={
          'relative h-full flex flex-col ' +
          (isPreview ? 'px-7 py-7' : 'px-[18mm] py-[18mm]')
        }
      >
        {/* Brand wordmark */}
        <div className="flex items-center justify-between">
          <div
            className={
              'font-serif font-bold tracking-tight leading-none ' +
              (isPreview ? 'text-[28px]' : 'text-[44px]')
            }
            data-testid="review-poster-brand"
          >
            <span className="text-slate-900">Zubite</span>
            <span className="text-sky-500">.bg</span>
          </div>
          <span
            className={
              'inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-sky-100 text-sky-700 font-medium ' +
              (isPreview ? 'text-[10px] px-2.5 py-1' : 'text-xs px-3 py-1.5')
            }
          >
            <ShieldCheck className={isPreview ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Платформа за орална грижа
          </span>
        </div>

        {/* Hero copy */}
        <div className={isPreview ? 'mt-6' : 'mt-10'}>
          <p
            className={
              'uppercase tracking-[0.18em] text-sky-600/80 font-semibold ' +
              (isPreview ? 'text-[9px]' : 'text-[11px]')
            }
          >
            Обратна връзка от пациенти
          </p>
          <h1
            className={
              'font-serif font-semibold text-slate-900 leading-[1.05] mt-2 ' +
              (isPreview ? 'text-[26px]' : 'text-[44px]')
            }
            data-testid="review-poster-headline"
          >
            Споделете <span className="text-sky-500">мнение</span>
            <br />
            за вашето посещение
          </h1>
          {clinicName && (
            <p
              className={
                'mt-3 text-slate-600 ' +
                (isPreview ? 'text-[12px]' : 'text-[18px]')
              }
              data-testid="review-poster-clinic"
            >
              <span className="font-medium text-slate-900">{clinicName}</span>
              {cityName ? <span className="text-slate-400"> · {cityName}</span> : null}
            </p>
          )}
        </div>

        {/* QR card */}
        <div
          className={
            'relative mt-auto mb-auto self-center w-full max-w-[320mm] ' +
            (isPreview ? '' : 'mt-12')
          }
        >
          <div
            className={
              'relative mx-auto bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_-12px_rgba(14,165,233,0.18)] ' +
              (isPreview
                ? 'p-4 max-w-[260px]'
                : 'p-8 max-w-[110mm]')
            }
          >
            <div className="grid place-items-center">
              <QRCodeCanvas
                value={reviewUrl}
                size={isPreview ? 180 : 380}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0f172a"
                data-testid="review-poster-qr"
              />
            </div>
            <p
              className={
                'mt-3 text-center text-slate-500 font-mono break-all ' +
                (isPreview ? 'text-[8px]' : 'text-[11px]')
              }
            >
              {reviewUrl}
            </p>
          </div>

          <p
            className={
              'mt-4 text-center text-slate-700 ' +
              (isPreview ? 'text-[11px]' : 'text-[16px]')
            }
          >
            Сканирайте QR кода и оставете кратка обратна връзка.
          </p>
        </div>

        {/* Trust strip */}
        <div
          className={
            'flex items-center justify-center flex-wrap gap-x-3 gap-y-2 text-slate-600 ' +
            (isPreview ? 'text-[10px] mt-2' : 'text-[13px] mt-6')
          }
          data-testid="review-poster-trust"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className={(isPreview ? 'w-3 h-3 ' : 'w-4 h-4 ') + 'text-sky-500'} />
            Около 60 секунди
          </span>
          <span className="inline-block w-1 h-1 rounded-full bg-sky-300" aria-hidden />
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className={(isPreview ? 'w-3 h-3 ' : 'w-4 h-4 ') + 'text-sky-500'} />
            Без регистрация
          </span>
          <span className="inline-block w-1 h-1 rounded-full bg-sky-300" aria-hidden />
          <span className="inline-flex items-center gap-1.5">
            <Eye className={(isPreview ? 'w-3 h-3 ' : 'w-4 h-4 ') + 'text-sky-500'} />
            Преглежда се преди публикуване
          </span>
        </div>

        {/* Footer */}
        <div
          className={
            'pt-4 border-t border-sky-100/70 text-center ' +
            (isPreview ? 'mt-4' : 'mt-8')
          }
        >
          <p
            className={
              'font-serif text-slate-700 ' +
              (isPreview ? 'text-[11px]' : 'text-[15px]')
            }
          >
            Вашето мнение помага на други пациенти да направят
            <br className={isPreview ? 'hidden' : ''} />{' '}
            по-информиран избор.
          </p>
          <p
            className={
              'mt-1 text-slate-400 ' +
              (isPreview ? 'text-[9px]' : 'text-[11px]')
            }
          >
            zubite.bg · Платформа за ортодонтски насоки
          </p>
        </div>
      </div>
    </div>
  )
}
