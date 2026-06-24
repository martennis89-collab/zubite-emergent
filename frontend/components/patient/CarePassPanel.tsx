'use client'

/**
 * CarePassPanel — single source of truth for the Care Pass visual block.
 *
 * Mirrors the dark navy-teal gradient + glossy product card from the new
 * Wave.co-inspired homepage so every Care Pass mention across the site
 * shares the same brand language.
 *
 * Variants:
 *   • `full`     — big section block with glossy Care Pass card mockup +
 *                  4 benefit chips. Used inside the lead-contextual clinic
 *                  profile page below the hero.
 *   • `compact`  — short horizontal block with the card mockup, gift icon,
 *                  one-line strapline + 2 chips. Used on the recommended-
 *                  clinics list and elsewhere a section needs a tighter
 *                  footprint.
 *   • `inline`   — single-row pill with a gift icon. Used inside narrow
 *                  sticky sidebars where height is precious.
 *
 * Strict copy rules (Bulgarian, medical-safe):
 *   • Care Pass is a card with DISCOUNTS for ORAL HYGIENE PRODUCTS provided
 *     by the partner clinic AFTER a consultation booked via Zubite.bg.
 *   • Never frame it as a treatment discount, subscription, family plan,
 *     free treatment, or insurance.
 */

import Link from 'next/link'
import Image from 'next/image'
import { Gift, CheckCircle2, ArrowRight } from 'lucide-react'

const CARE_PASS_CARD_ASSET =
  'https://customer-assets.emergentagent.com/job_25b55d94-1ed6-49c7-af05-4dd6f19863cf/artifacts/kyba9eaq_ChatGPT%20Image%20May%2017%2C%202026%2C%2010_21_45%20AM.png'

interface BaseProps {
  testid?: string
  className?: string
  /** When set, renders a small "Виж повече" link to /care-pass. */
  showLearnMore?: boolean
}

interface FullProps extends BaseProps {
  variant: 'full'
}
interface CompactProps extends BaseProps {
  variant: 'compact'
}
interface InlineProps extends BaseProps {
  variant: 'inline'
}

type Props = FullProps | CompactProps | InlineProps

export function CarePassPanel(props: Props) {
  if (props.variant === 'inline') return <InlineVariant {...props} />
  if (props.variant === 'compact') return <CompactVariant {...props} />
  return <FullVariant {...props} />
}

/* ───────────────────────── full variant ───────────────────────── */

function FullVariant({ testid, className, showLearnMore }: FullProps) {
  return (
    <section
      data-testid={testid ?? 'care-pass-panel-full'}
      className={`relative overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.45)] ${className ?? ''}`}
      style={{
        background:
          'radial-gradient(ellipse 60% 60% at 100% 0%, rgba(20,184,166,0.32) 0%, transparent 60%),' +
          'radial-gradient(ellipse 60% 60% at 0% 100%, rgba(165,243,252,0.18) 0%, transparent 60%),' +
          'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
      }}
    >
      {/* Top edge gloss */}
      <div aria-hidden className="absolute inset-x-6 top-1 h-1/3 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      {/* Bottom shine line */}
      <div aria-hidden className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-300/50 to-transparent pointer-events-none" />

      <div className="relative grid grid-cols-1 sm:grid-cols-[1.05fr_minmax(0,1fr)] gap-6 sm:gap-10 p-6 sm:p-9 items-center">
        {/* Copy column */}
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 ring-1 ring-white/15 text-[11px] uppercase tracking-[0.18em] text-teal-200 font-semibold px-3 py-1.5">
            <Gift className="w-3 h-3" aria-hidden="true" /> Zubite Care Pass
          </span>
          <h3 className="mt-4 font-serif text-2xl sm:text-3xl text-white leading-tight">
            Отстъпки за продукти за орална хигиена — включени за всеки наш пациент.
          </h3>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-md">
            Care Pass е включен в партньорската ни мрежа. Всеки Zubite пациент
            получава Care Pass при посещение в партньорска клиника. Не е
            застраховка и не е автоматична отстъпка от лечение.
          </p>

          {/* Benefit chips */}
          <ul className="mt-5 grid grid-cols-2 gap-2">
            {[
              'Включен за всеки наш пациент',
              'От партньорска клиника',
              'Орална хигиена',
              'Не е отстъпка от лечение',
            ].map((c) => (
              <li
                key={c}
                className="inline-flex items-start gap-1.5 rounded-full bg-white/6 ring-1 ring-white/12 text-[11px] text-slate-200 font-medium px-3 py-1.5 backdrop-blur-xl"
              >
                <CheckCircle2 className="w-3 h-3 mt-0.5 text-teal-300 flex-shrink-0" aria-hidden="true" />
                <span className="leading-snug">{c}</span>
              </li>
            ))}
          </ul>

          {showLearnMore && (
            <Link
              href="/care-pass"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-teal-200 hover:text-teal-100 transition-colors"
              data-testid="care-pass-panel-learn-more"
            >
              Как работи Care Pass
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Card mockup column */}
        <div className="relative w-full max-w-[360px] mx-auto sm:ml-auto sm:mr-0">
          {/* Stacked depth card */}
          <div
            aria-hidden
            className="absolute inset-0 -rotate-6 translate-x-3 translate-y-4 rounded-2xl bg-white/5 ring-1 ring-white/10 pointer-events-none"
          />
          {/* Halo glow */}
          <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-teal-400/20 blur-3xl pointer-events-none" />
          <Image
            src={CARE_PASS_CARD_ASSET}
            alt="Zubite Care Pass — карта с отстъпки за продукти за орална хигиена"
            width={720}
            height={720}
            className="relative w-full h-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
            unoptimized
            priority
          />
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── compact variant ───────────────────────── */

function CompactVariant({ testid, className, showLearnMore }: CompactProps) {
  return (
    <section
      data-testid={testid ?? 'care-pass-panel-compact'}
      className={`relative overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_18px_44px_-20px_rgba(15,23,42,0.45)] ${className ?? ''}`}
      style={{
        background:
          'radial-gradient(ellipse 60% 60% at 100% 0%, rgba(20,184,166,0.30) 0%, transparent 60%),' +
          'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
      }}
    >
      <div aria-hidden className="absolute inset-x-4 top-1 h-1/3 rounded-full bg-white/8 blur-2xl pointer-events-none" />
      <div aria-hidden className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-300/40 to-transparent pointer-events-none" />

      <div className="relative grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-5 sm:gap-6 p-5 sm:p-6 items-center">
        {/* Compact card mockup */}
        <div className="relative w-full max-w-[200px] mx-auto sm:mx-0">
          <div aria-hidden className="absolute -inset-3 rounded-2xl bg-teal-400/18 blur-2xl pointer-events-none" />
          <Image
            src={CARE_PASS_CARD_ASSET}
            alt="Zubite Care Pass"
            width={480}
            height={480}
            className="relative w-full h-auto drop-shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
            unoptimized
          />
        </div>

        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 ring-1 ring-white/15 text-[10px] uppercase tracking-[0.18em] text-teal-200 font-semibold px-2.5 py-1">
            <Gift className="w-3 h-3" aria-hidden="true" /> Zubite Care Pass
          </span>
          <p className="mt-2.5 font-serif text-base sm:text-lg text-white leading-snug">
            Отстъпки за продукти за орална хигиена — включени за всеки наш пациент.
          </p>
          <p className="mt-1.5 text-[12px] text-slate-300/90 leading-relaxed">
            Care Pass е включен в партньорската ни мрежа. Получаваш го при посещение в партньорска клиника. Не е застраховка и не е автоматична отстъпка от лечение.
          </p>
          {showLearnMore && (
            <Link
              href="/care-pass"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-teal-200 hover:text-teal-100 transition-colors"
              data-testid="care-pass-panel-learn-more"
            >
              Как работи Care Pass
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── inline variant ───────────────────────── */

function InlineVariant({ testid, className }: InlineProps) {
  return (
    <div
      data-testid={testid ?? 'care-pass-panel-inline'}
      className={`relative overflow-hidden rounded-xl ring-1 ring-white/10 px-3.5 py-3 flex items-start gap-2.5 ${className ?? ''}`}
      style={{
        background:
          'radial-gradient(ellipse 80% 100% at 100% 0%, rgba(20,184,166,0.28) 0%, transparent 70%),' +
          'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
      }}
    >
      <span className="shrink-0 w-7 h-7 rounded-lg bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
        <Gift className="w-3.5 h-3.5 text-teal-200" aria-hidden="true" />
      </span>
      <p className="text-[11px] text-slate-200 leading-snug">
        <span className="font-semibold text-teal-200">Zubite Care Pass</span>{' '}
        — отстъпки за орална хигиена. Включен за всеки наш пациент при посещение в партньорска клиника.
      </p>
    </div>
  )
}
