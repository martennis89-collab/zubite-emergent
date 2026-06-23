'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 6)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setIsOpen(false) }, [pathname])

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/')

  // Public header navigation (Feb 2026 cleanup):
  //   • No `Клиники` — clinic discovery is reached contextually through
  //     symptoms/treatments/articles/quiz, not as a dominant global nav item.
  //   • No persistent `Започни анализа` CTA — keeps the platform feeling
  //     like a dental decision platform, not a quiz-conversion funnel.
  //   • `Какво е Zubite.bg` first, as the informational anchor. Links to
  //     the homepage explainer section (`#kakvo-e-zubite`) regardless of
  //     which public route the header renders on.
  const navLinks = [
    { href: '/symptoms', label: 'Симптоми' },
    { href: '/treatments', label: 'Лечения' },
    { href: '/care-pass', label: 'Care Pass' },
    { href: '/blog', label: 'Статии' },
    { href: '/za-kliniki', label: 'За клиники' },
    { href: '/#kakvo-e-zubite', label: 'Какво е Zubite.bg' },
  ]

  return (
    <div
      className="fixed top-3 sm:top-4 inset-x-3 sm:inset-x-6 z-50 flex justify-center pointer-events-none"
      data-testid="site-nav"
    >
      <header
        className={
          'pointer-events-auto w-full max-w-5xl rounded-3xl md:rounded-full transition-all duration-300 relative ' +
          (scrolled
            ? 'bg-white/15 backdrop-blur-[28px] ring-1 ring-white/40 shadow-[0_14px_44px_-12px_rgba(15,23,42,0.18),0_2px_8px_-2px_rgba(15,23,42,0.06)]'
            : 'bg-white/10 backdrop-blur-[28px] ring-1 ring-white/35 shadow-[0_10px_36px_-12px_rgba(15,23,42,0.15),0_2px_8px_-2px_rgba(15,23,42,0.05)]')
        }
      >
        {/* Liquid glass top highlight — strong specular like real glass */}
        <div aria-hidden className="absolute inset-x-4 top-px h-1/2 rounded-t-full bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none" />
        {/* Liquid glass bottom shadow — refraction depth */}
        <div aria-hidden className="absolute inset-x-6 bottom-px h-1/3 rounded-b-full bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
        {/* Bottom inner thin line — subtle refraction edge */}
        <div aria-hidden className="absolute inset-x-8 bottom-0.5 h-px rounded-full bg-gradient-to-r from-transparent via-slate-900/8 to-transparent pointer-events-none" />

        <div className="px-4 sm:px-6 h-14 sm:h-15 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="font-serif text-lg sm:text-xl font-semibold tracking-tight"
            data-testid="logo"
          >
            <span className="text-slate-900">Zubite</span>
            <span className="text-teal-600">.bg</span>
          </Link>

          {/* Desktop nav — tighter gap, smaller label size to fit 6 items
              cleanly on a 5xl-max-w container without wrapping. */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-[13px]">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  'whitespace-nowrap transition-colors ' +
                  (isActive(link.href)
                    ? 'text-teal-700 font-medium'
                    : 'text-slate-600 hover:text-slate-900')
                }
                data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '')}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side — mobile menu button only (Feb 2026 cleanup:
              removed persistent `Започни анализа` desktop CTA per brief). */}
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              data-testid="mobile-menu"
              aria-label={isOpen ? 'Затвори меню' : 'Отвори меню'}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer — categorized */}
        {isOpen && (
          <nav
            className="md:hidden border-t border-white/40 px-5 py-4 animate-fade-in-down max-h-[80vh] overflow-y-auto"
            data-testid="mobile-menu-drawer"
          >
            {/* Primary */}
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    'block py-2 text-sm transition-colors ' +
                    (isActive(link.href) ? 'text-teal-700 font-medium' : 'text-slate-700 hover:text-slate-900')
                  }
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <MobileMenuGroup
              label="Лечения"
              links={[
                { href: '/orthodontics', label: 'Ортодонтия' },
                { href: '/implants', label: 'Импланти' },
                { href: '/cosmetic-dentistry', label: 'Естетична стоматология' },
                { href: '/tmj', label: 'TMJ / челюстни ставни' },
                { href: '/sleep-airway', label: 'Сън и дишане' },
              ]}
              onLinkClick={() => setIsOpen(false)}
              isActive={isActive}
            />

            <MobileMenuGroup
              label="Ръководства"
              links={[
                { href: '/symptoms', label: 'Симптоми' },
                { href: '/crooked-teeth', label: 'Криви зъби' },
                { href: '/what-is-invisalign', label: 'Какво е Invisalign' },
                { href: '/invisalign-bulgaria', label: 'Invisalign в България' },
                { href: '/aligners-vs-braces', label: 'Алайнери vs Брекети' },
                { href: '/aligners-comparison', label: 'Сравнение на алайнери' },
              ]}
              onLinkClick={() => setIsOpen(false)}
              isActive={isActive}
            />

            <MobileMenuGroup
              label="Цени"
              links={[
                { href: '/invisalign-price', label: 'Цена Invisalign' },
                { href: '/implant-price', label: 'Цена импланти' },
              ]}
              onLinkClick={() => setIsOpen(false)}
              isActive={isActive}
            />

            <MobileMenuGroup
              label="Платформа"
              links={[
                { href: '/care-pass', label: 'Care Pass' },
                { href: '/standart-za-kliniki', label: 'Zubite стандарт' },
                { href: '/za-kliniki', label: 'За клиники' },
                { href: '/contact', label: 'Контакти' },
              ]}
              onLinkClick={() => setIsOpen(false)}
              isActive={isActive}
            />

            {/* Mobile drawer "Започни анализа" CTA removed Feb 2026 per
                user request — keeps the drawer focused on navigation,
                not conversion. Quiz is reachable from in-page hero and
                section CTAs across the site. */}
          </nav>
        )}
      </header>
    </div>
  )
}


interface MobileMenuGroupProps {
  label: string
  links: { href: string; label: string }[]
  onLinkClick: () => void
  isActive: (path: string) => boolean
}

function MobileMenuGroup({ label, links, onLinkClick, isActive }: MobileMenuGroupProps) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-200/60">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold px-1 mb-1.5">
        {label}
      </p>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onLinkClick}
          className={
            'block py-1.5 px-1 text-[13.5px] transition-colors ' +
            (isActive(link.href)
              ? 'text-teal-700 font-medium'
              : 'text-slate-700 hover:text-slate-900')
          }
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}
