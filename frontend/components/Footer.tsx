import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Mail } from 'lucide-react'

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
  { label: 'Контакти', href: '/contact' },
]

const LEGAL: FooterLink[] = [
  { label: 'Поверителност', href: '/privacy' },
  { label: 'Условия', href: '/terms' },
  { label: 'Бисквитки', href: '/cookies' },
]

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-teal-400 transition-colors">
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
    <footer className="relative bg-[#0E1A1A] text-slate-300 pt-16 pb-10 overflow-hidden" data-testid="site-footer">
      {/* Subtle glassy top border */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
      <div aria-hidden className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.5fr_repeat(5,1fr)] gap-8 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="inline-flex items-baseline">
              <span className="font-serif text-2xl font-semibold text-white">Zubite</span>
              <span className="font-serif text-2xl font-semibold text-teal-400">.bg</span>
            </Link>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs">
              Спокоен ориентир в денталното здраве. Първо яснота, после избор.
            </p>
            <p className="mt-5 text-[11px] text-slate-500 leading-snug max-w-xs">
              Не поставяме диагнози. Не заменяме професионален преглед.
              Информацията е ориентировъчна.
            </p>
            {/* Social */}
            <div className="flex items-center gap-2 mt-5">
              {[
                { Icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
                { Icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
                { Icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-teal-500/15 ring-1 ring-white/10 hover:ring-teal-400/30 flex items-center justify-center text-slate-400 hover:text-teal-300 transition-all"
                  aria-label={label}
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
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Право</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {LEGAL.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-teal-400 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/contact" className="inline-flex items-center gap-1.5 hover:text-teal-400 transition-colors">
                    <Mail className="w-3.5 h-3.5" /> Контакти
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Zubite.bg · Всички права запазени.</p>
          <p>Направено с грижа в България.</p>
        </div>
      </div>
    </footer>
  )
}
