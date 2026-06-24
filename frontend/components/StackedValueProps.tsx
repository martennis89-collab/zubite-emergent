'use client'

import { ReactNode } from 'react'
import { HelpCircle, MessagesSquare, ShieldCheck, Gift } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// StackedValueProps — sticky-stacking value proposition cards
// for the "Какво е Zubite.bg" section. On md+ screens the 4
// tiles use `position: sticky` to stack atop each other as the
// user scrolls (with a small vertical offset that lets each
// previous card peek through). On small screens the cards fall
// back to a simple vertical stack to keep mobile scrolling fast
// and not "trap" the reader.
// ─────────────────────────────────────────────────────────────

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
    icon: <HelpCircle className="w-5 h-5" aria-hidden />,
  },
  {
    t: 'По-добри въпроси',
    s: 'Отиваш на преглед по-подготвен.',
    long: 'Когато попиташ правилно, получаваш по-полезен отговор. Zubite ти показва кои въпроси да зададеш на стоматолог или ортодонт за твоя конкретен случай.',
    icon: <MessagesSquare className="w-5 h-5" aria-hidden />,
  },
  {
    t: 'По-малко натиск',
    s: 'Продължаваш само ако решиш.',
    long: 'Никой не те задължава да продължиш към клиника или лечение. Може просто да получиш ориентира си и да го обмислиш на спокойствие.',
    icon: <ShieldCheck className="w-5 h-5" aria-hidden />,
  },
  {
    t: 'Допълнителна стойност',
    s: 'След консултация получаваш Care Pass с отстъпки за продукти за орална хигиена.',
    long: 'Когато заявиш насочване чрез Zubite.bg и посетиш консултацията, партньорската клиника ти предоставя Zubite Care Pass — карта с отстъпки за продукти за орална хигиена.',
    icon: <Gift className="w-5 h-5" aria-hidden />,
  },
]

type Palette = {
  bg: string
  ring: string
  text: string
  sub: string
  iconBg: string
  numCol: string
  divider: string
  eyebrow: string
}

// Alternating light / dark editorial palette in Zubite's teal family.
const palettes: Palette[] = [
  {
    bg: 'bg-[#FCFAF8]',
    ring: 'ring-stone-200/70',
    text: 'text-slate-900',
    sub: 'text-slate-600',
    iconBg: 'bg-teal-50 text-teal-700 ring-teal-100',
    numCol: 'text-teal-700/15',
    divider: 'border-slate-200/70',
    eyebrow: 'text-teal-700',
  },
  {
    bg: 'bg-[#0F4F4A]',
    ring: 'ring-teal-900/40',
    text: 'text-white',
    sub: 'text-teal-50/85',
    iconBg: 'bg-white/10 text-teal-100 ring-white/20',
    numCol: 'text-teal-200/15',
    divider: 'border-white/15',
    eyebrow: 'text-teal-200',
  },
  {
    bg: 'bg-[#E6F4F2]',
    ring: 'ring-teal-200/60',
    text: 'text-slate-900',
    sub: 'text-slate-700',
    iconBg: 'bg-white text-teal-700 ring-teal-100',
    numCol: 'text-teal-700/15',
    divider: 'border-teal-700/15',
    eyebrow: 'text-teal-700',
  },
  {
    bg: 'bg-[#0A2F2D]',
    ring: 'ring-teal-900/50',
    text: 'text-white',
    sub: 'text-teal-50/80',
    iconBg: 'bg-teal-700/40 text-teal-100 ring-teal-400/30',
    numCol: 'text-teal-200/10',
    divider: 'border-white/15',
    eyebrow: 'text-teal-200',
  },
]

function CardBody({ card, palette, index }: { card: ValueCard; palette: Palette; index: number }) {
  return (
    <article
      className={`relative overflow-hidden rounded-3xl ${palette.bg} ring-1 ${palette.ring} shadow-[0_30px_80px_-30px_rgba(15,23,42,0.28)] p-7 sm:p-9`}
      data-testid={`stacked-benefit-card-${index}`}
    >
      {/* oversized numeral, decorative */}
      <span
        aria-hidden
        className={`pointer-events-none select-none absolute -top-2 right-5 sm:right-7 font-serif font-semibold leading-none ${palette.numCol}`}
        style={{ fontSize: 'clamp(5.5rem, 12vw, 9rem)' }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className={`relative inline-flex items-center justify-center w-11 h-11 rounded-xl ring-1 ${palette.iconBg}`}>
        {card.icon}
      </div>

      <p className={`relative mt-5 text-[11px] uppercase tracking-[0.2em] font-semibold ${palette.eyebrow}`}>
        {String(index + 1).padStart(2, '0')} · Защо Zubite
      </p>
      <h3 className={`relative mt-2 font-serif text-2xl sm:text-3xl lg:text-[2.1rem] font-semibold leading-[1.15] ${palette.text} max-w-md`}>
        {card.t}
      </h3>
      <p className={`relative mt-3 text-base sm:text-lg leading-relaxed max-w-lg ${palette.sub}`}>
        {card.s}
      </p>
      <p className={`relative mt-5 pt-4 border-t ${palette.divider} text-sm sm:text-[15px] leading-relaxed max-w-xl ${palette.sub} opacity-95`}>
        {card.long}
      </p>
    </article>
  )
}

export function StackedValueProps() {
  return (
    <div className="w-full" data-testid="stacked-value-props">
      {/* Mobile fallback — simple stack, no sticky trap */}
      <div className="grid gap-4 md:hidden">
        {cards.map((c, i) => (
          <CardBody key={c.t} card={c} palette={palettes[i % palettes.length]} index={i} />
        ))}
      </div>

      {/* Desktop / tablet — sticky stacking */}
      <div className="hidden md:block relative">
        {cards.map((c, i) => (
          <div
            key={c.t}
            className="sticky"
            // Each card sticks ~2.25rem lower than the previous so a clear
            // sliver of every preceding card (number badge + eyebrow) stays
            // visible as new ones land on top.
            style={{
              top: `calc(5rem + ${i * 2.25}rem)`,
              marginBottom: i === cards.length - 1 ? 0 : '22vh',
              zIndex: 10 + i,
            }}
          >
            <CardBody card={c} palette={palettes[i % palettes.length]} index={i} />
          </div>
        ))}
        {/* tail spacer so the last card lingers a beat before page continues */}
        <div aria-hidden className="h-[22vh]" />
      </div>
    </div>
  )
}

export default StackedValueProps
