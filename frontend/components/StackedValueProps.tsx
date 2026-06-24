'use client'

import { ReactNode } from 'react'
import { HelpCircle, MessagesSquare, ShieldCheck, Gift } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// StackedValueProps — full-width sticky-stacking value cards
// for the "Какво е Zubite.bg" section.
//
// Layout per spec:
//   • Each card is a wide horizontal banner (max-w-6xl) with a
//     shorter height than tall card variants — feels like an
//     editorial poster rather than a CMS tile.
//   • On md+ the 4 cards use `position: sticky` with progressive
//     top offsets so each one stacks atop the previous on scroll,
//     leaving the prior card's number + eyebrow visible above.
//   • On mobile we drop to a calm vertical stack — no sticky trap.
//
// Palette (brand-consistent):
//   01 cream  → 02 brand-green → 03 mint → 04 brand-green
//   Both dark cards use the SAME brand green (#0F4F4A) to keep
//   the visual language unified.
// ─────────────────────────────────────────────────────────────

const BRAND_DARK_GREEN = '#0F4F4A'

type ValueCard = {
  t: string
  s: string
  long: string
  icon: ReactNode
}

const cards: ValueCard[] = [
  {
    t: 'По-малко объркване',
    s: 'Разбираш дали има смисъл от наблюдение, профилактика или консултация.',
    long: 'Не всеки симптом изисква лечение веднага. Понякога е достатъчно наблюдение или подобрена ежедневна грижа. Получаваш ориентир коя посока е по-вероятна за теб.',
    icon: <HelpCircle className="w-6 h-6" aria-hidden />,
  },
  {
    t: 'По-добри въпроси',
    s: 'Отиваш на преглед по-подготвен.',
    long: 'Когато попиташ правилно, получаваш по-полезен отговор. Zubite ти показва кои въпроси да зададеш на стоматолог или ортодонт за твоя конкретен случай.',
    icon: <MessagesSquare className="w-6 h-6" aria-hidden />,
  },
  {
    t: 'По-малко натиск',
    s: 'Продължаваш само ако решиш.',
    long: 'Никой не те задължава да продължиш към клиника или лечение. Може просто да получиш ориентира си и да го обмислиш на спокойствие.',
    icon: <ShieldCheck className="w-6 h-6" aria-hidden />,
  },
  {
    t: 'Допълнителна стойност',
    s: 'След консултация получаваш Care Pass с отстъпки за продукти за орална хигиена.',
    long: 'Когато заявиш насочване чрез Zubite.bg и посетиш консултацията, партньорската клиника ти предоставя Zubite Care Pass — карта с отстъпки за продукти за орална хигиена.',
    icon: <Gift className="w-6 h-6" aria-hidden />,
  },
]

type Palette = {
  bg: string // raw CSS color (for arbitrary brand hex)
  text: string
  sub: string
  iconBg: string
  numCol: string
  divider: string
  eyebrow: string
  ringClass: string
}

// Light → brand-green → light → brand-green
const palettes: Palette[] = [
  {
    bg: '#FCFAF8',
    text: 'text-slate-900',
    sub: 'text-slate-600',
    iconBg: 'bg-teal-50 text-teal-700 ring-teal-100',
    numCol: 'text-teal-700/15',
    divider: 'border-slate-200/70',
    eyebrow: 'text-teal-700',
    ringClass: 'ring-stone-200/70',
  },
  {
    bg: BRAND_DARK_GREEN,
    text: 'text-white',
    sub: 'text-teal-50/85',
    iconBg: 'bg-white/10 text-teal-100 ring-white/20',
    numCol: 'text-teal-200/15',
    divider: 'border-white/15',
    eyebrow: 'text-teal-200',
    ringClass: 'ring-white/10',
  },
  {
    bg: '#E6F4F2',
    text: 'text-slate-900',
    sub: 'text-slate-700',
    iconBg: 'bg-white text-teal-700 ring-teal-100',
    numCol: 'text-teal-700/15',
    divider: 'border-teal-700/15',
    eyebrow: 'text-teal-700',
    ringClass: 'ring-teal-200/60',
  },
  {
    bg: BRAND_DARK_GREEN,
    text: 'text-white',
    sub: 'text-teal-50/85',
    iconBg: 'bg-white/10 text-teal-100 ring-white/20',
    numCol: 'text-teal-200/15',
    divider: 'border-white/15',
    eyebrow: 'text-teal-200',
    ringClass: 'ring-white/10',
  },
]

function CardBody({ card, palette, index }: { card: ValueCard; palette: Palette; index: number }) {
  return (
    <article
      className={`relative overflow-hidden rounded-3xl ring-1 ${palette.ringClass} shadow-[0_30px_80px_-32px_rgba(15,23,42,0.28)] px-6 py-8 sm:px-10 sm:py-10 md:px-14 md:py-12`}
      style={{ backgroundColor: palette.bg }}
      data-testid={`stacked-benefit-card-${index}`}
    >
      {/* oversized numeral, decorative, right-aligned, full height */}
      <span
        aria-hidden
        className={`pointer-events-none select-none absolute -top-4 right-6 sm:right-10 font-serif font-semibold leading-none ${palette.numCol}`}
        style={{ fontSize: 'clamp(7rem, 16vw, 14rem)' }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Horizontal flow: icon column on the left (desktop), text on the right */}
      <div className="relative grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-8 md:gap-10 items-center">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ring-1 ${palette.iconBg}`}>
          {card.icon}
        </div>

        <div className="min-w-0">
          <p className={`text-[11px] uppercase tracking-[0.22em] font-semibold ${palette.eyebrow}`}>
            {String(index + 1).padStart(2, '0')} · Защо Zubite
          </p>
          <h3 className={`mt-1.5 font-serif text-2xl sm:text-3xl lg:text-[2.25rem] font-semibold leading-[1.12] ${palette.text} max-w-2xl`}>
            {card.t}
          </h3>
          <p className={`mt-2.5 text-base sm:text-lg leading-relaxed max-w-2xl ${palette.sub}`}>
            {card.s}
          </p>
          <p className={`mt-3 pt-3 border-t ${palette.divider} text-sm sm:text-[15px] leading-relaxed max-w-3xl ${palette.sub} opacity-95`}>
            {card.long}
          </p>
        </div>
      </div>
    </article>
  )
}

export function StackedValueProps() {
  return (
    <div className="w-full" data-testid="stacked-value-props">
      {/* Mobile fallback — simple stack, no sticky trap */}
      <div className="grid gap-4 md:hidden px-5">
        {cards.map((c, i) => (
          <CardBody key={c.t} card={c} palette={palettes[i % palettes.length]} index={i} />
        ))}
      </div>

      {/* Desktop / tablet — full-width sticky stacking */}
      <div className="hidden md:block relative max-w-6xl mx-auto px-5 sm:px-8">
        {cards.map((c, i) => (
          <div
            key={c.t}
            className="sticky"
            // Each card sticks ~2.25rem lower than the previous so a clear
            // sliver of every preceding card (number + eyebrow) stays
            // visible above as new ones land on top.
            style={{
              top: `calc(5rem + ${i * 2.25}rem)`,
              marginBottom: i === cards.length - 1 ? 0 : '18vh',
              zIndex: 10 + i,
            }}
          >
            <CardBody card={c} palette={palettes[i % palettes.length]} index={i} />
          </div>
        ))}
        {/* tail spacer so the last card lingers a beat before page continues */}
        <div aria-hidden className="h-[18vh]" />
      </div>
    </div>
  )
}

export default StackedValueProps
