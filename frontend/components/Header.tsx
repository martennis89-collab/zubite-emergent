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

  const navLinks = [
    { href: '/', label: 'Начало' },
    { href: '/symptoms', label: 'Симптоми' },
    { href: '/orthodontics', label: 'Ортодонтия' },
    { href: '/blog', label: 'Журнал' },
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
            ? 'bg-white/45 backdrop-blur-2xl ring-1 ring-white/55 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.20),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(15,23,42,0.05)]'
            : 'bg-white/20 backdrop-blur-2xl ring-1 ring-white/35 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(15,23,42,0.03)]')
        }
      >
        {/* Liquid glass inner top highlight */}
        <div aria-hidden className="absolute inset-x-6 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none opacity-80" />
        <div aria-hidden className="absolute inset-x-6 bottom-0.5 h-px rounded-full bg-gradient-to-r from-transparent via-slate-900/8 to-transparent pointer-events-none" />

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

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  'transition-colors ' +
                  (isActive(link.href)
                    ? 'text-teal-700 font-medium'
                    : 'text-slate-600 hover:text-slate-900')
                }
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side — desktop CTA + mobile menu button */}
          <div className="flex items-center gap-2">
            <Link
              href="/quiz"
              className="group relative hidden sm:inline-flex items-center gap-1.5 rounded-full text-white text-xs sm:text-sm font-medium px-3.5 sm:px-4 py-2 transition-all hover:-translate-y-0.5 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] overflow-hidden"
              style={{ backgroundImage: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)' }}
              data-testid="nav-cta"
            >
              <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/15 blur-sm pointer-events-none" />
              <span className="relative inline-flex items-center gap-1.5">
                Провери случая
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

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

        {/* Mobile menu drawer */}
        {isOpen && (
          <nav className="md:hidden border-t border-white/40 px-5 py-4 animate-fade-in-down">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  'block py-2.5 text-sm transition-colors ' +
                  (isActive(link.href) ? 'text-teal-700 font-medium' : 'text-slate-700 hover:text-slate-900')
                }
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/quiz"
              onClick={() => setIsOpen(false)}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full text-white text-sm font-medium px-4 py-2.5"
              style={{ backgroundImage: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)' }}
            >
              Провери случая <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        )}
      </header>
    </div>
  )
}
