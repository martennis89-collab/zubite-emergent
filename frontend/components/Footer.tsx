import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Mail } from 'lucide-react'

interface FooterProps {
  treatmentSlug?: string
}

export function Footer({ treatmentSlug }: FooterProps) {
  return (
    <footer className="relative bg-[#0E1A1A] text-slate-300 pt-16 pb-10 overflow-hidden" data-testid="site-footer">
      {/* Subtle glassy top border */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
      <div aria-hidden className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 md:gap-8">
          {/* Brand */}
          <div>
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

          {/* Platform */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Платформа</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/quiz" className="hover:text-teal-400 transition-colors">Провери случая</Link></li>
              <li><Link href="/orthodontics" className="hover:text-teal-400 transition-colors">Ортодонтия</Link></li>
              <li><Link href="/aligners-vs-braces" className="hover:text-teal-400 transition-colors">Алайнери vs Брекети</Link></li>
              <li><Link href="/symptoms" className="hover:text-teal-400 transition-colors">Симптоми</Link></li>
              <li><Link href="/blog" className="hover:text-teal-400 transition-colors">Журнал</Link></li>
            </ul>
          </div>

          {/* For clinics */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">За клиники</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/za-kliniki" className="hover:text-teal-400 transition-colors">Стани партньор</Link></li>
              <li><Link href="/clinic" className="hover:text-teal-400 transition-colors">Клиничен вход</Link></li>
              <li><Link href="/contact" className="hover:text-teal-400 transition-colors">Контакти</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Право</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/privacy" className="hover:text-teal-400 transition-colors">Поверителност</Link></li>
              <li><Link href="/terms" className="hover:text-teal-400 transition-colors">Условия</Link></li>
              <li><Link href="/cookies" className="hover:text-teal-400 transition-colors">Бисквитки</Link></li>
              <li><Link href="/contact" className="inline-flex items-center gap-1.5 hover:text-teal-400 transition-colors"><Mail className="w-3.5 h-3.5" /> Контакти</Link></li>
            </ul>
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
