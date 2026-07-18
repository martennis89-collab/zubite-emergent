import Link from 'next/link'
import { Facebook, Instagram, Mail } from 'lucide-react'

interface FooterProps {
  treatmentSlug?: string
}

interface FooterLink { label: string; href: string }

const TREATMENTS: FooterLink[] = [
  { label: 'Ортодонтия', href: '/orthodontics' },
  { label: 'Импланти', href: '/implants' },
  { label: 'Естетична стоматология', href: '/cosmetic-dentistry' },
  { label: 'TMJ / челюстни ставни', href: '/tmj' },
  { label: 'Сън и дишане', href: '/sleep-airway' },
]

const GUIDES: FooterLink[] = [
  { label: 'Симптоми', href: '/symptoms' },
  { label: 'Криви зъби', href: '/crooked-teeth' },
  { label: 'Какво е Invisalign', href: '/what-is-invisalign' },
  { label: 'Invisalign в България', href: '/invisalign-bulgaria' },
  { label: 'Алайнери vs Брекети', href: '/aligners-vs-braces' },
  { label: 'Сравнение на алайнери', href: '/aligners-comparison' },
]

const PRICES: FooterLink[] = [
  { label: 'Цена Invisalign', href: '/invisalign-price' },
  { label: 'Цена импланти', href: '/implant-price' },
]

const PLATFORM: FooterLink[] = [
  { label: 'Започни анализа', href: '/quiz' },
  { label: 'Care Pass', href: '/care-pass' },
  { label: 'Zubite стандарт', href: '/standart-za-kliniki' },
  { label: 'Журнал', href: '/blog' },
]

const FOR_CLINICS: FooterLink[] = [
  { label: 'Стани партньор', href: '/za-kliniki' },
  { label: 'Клиничен вход', href: '/clinic' },
]

const LEGAL: FooterLink[] = [
  { label: 'Поверителност', href: '/privacy' },
  { label: 'Условия', href: '/terms' },
  { label: 'Бисквитки', href: '/cookies' },
]

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B6B6B]">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[#525252] transition-colors duration-300 hover:text-[#B84900]">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer({ treatmentSlug: _treatmentSlug }: FooterProps) {
  return (
    <footer className="relative overflow-hidden border-t border-[#E5E5E5] bg-[#F5F4F2] pb-10 pt-16 text-[#525252]" data-testid="site-footer">
      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.5fr_repeat(5,1fr)] gap-8 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="inline-flex items-baseline">
              <span className="font-sans text-2xl font-bold tracking-[-0.04em] text-[#0A0A0A]">Zubite</span>
              <span className="font-sans text-2xl font-bold tracking-[-0.04em] text-[#007956]">.bg</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#525252]">
              Спокоен ориентир в денталното здраве. Първо яснота, после избор.
            </p>
            <p className="mt-5 max-w-xs text-[11px] leading-snug text-[#6B6B6B]">
              Не поставяме диагнози. Не заменяме професионален преглед.
              Информацията е ориентировъчна.
            </p>
            {/* Social — only official Zubite profiles. Source: lib/schema.ts.
                LinkedIn intentionally omitted: no official Zubite LinkedIn
                profile exists yet (would have been a placeholder). */}
            <div className="flex items-center gap-2 mt-5">
              {[
                { Icon: Facebook, href: 'https://facebook.com/zubitebg', label: 'Facebook' },
                { Icon: Instagram, href: 'https://instagram.com/zubitebg', label: 'Instagram' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-[#6B6B6B] transition-[transform,border-color,color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-[#B84900] hover:text-[#B84900]"
                  aria-label={label}
                  data-testid={`footer-social-${label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <Column title="Лечения" links={TREATMENTS} />
          <Column title="Ръководства" links={GUIDES} />
          <Column title="Цени" links={PRICES} />
          <Column title="Платформа" links={PLATFORM} />

          {/* Combined: For clinics + Legal stacked on small screens */}
          <div className="space-y-8">
            <Column title="За клиники" links={FOR_CLINICS} />
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B6B6B]">Право</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {LEGAL.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[#525252] transition-colors duration-300 hover:text-[#B84900]">
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/contact" className="inline-flex items-center gap-1.5 text-[#525252] transition-colors duration-300 hover:text-[#B84900]">
                    <Mail className="w-3.5 h-3.5" /> Контакти
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[#E5E5E5] pt-6 text-[11px] text-[#6B6B6B] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Zubite.bg · Всички права запазени.</p>
          <p>Направено с грижа в България.</p>
        </div>
      </div>
    </footer>
  )
}
