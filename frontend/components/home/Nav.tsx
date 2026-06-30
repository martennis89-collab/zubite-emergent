'use client'

/**
 * Public homepage sticky navigation — extracted from HomeContent.tsx
 * in Feb 2026. See `_shared.tsx` for utilities; no behaviour changes.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  // ESC closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])
  const closeMobile = () => setMobileOpen(false)
  return (
    <div
      className="fixed top-3 sm:top-4 inset-x-3 sm:inset-x-6 z-50 flex justify-center pointer-events-none"
      data-testid="home-nav"
    >
      <header
        className={
          'pointer-events-auto w-full max-w-5xl rounded-3xl md:rounded-full transition-[background-color,box-shadow,backdrop-filter] duration-500 ease-out relative isolate ' +
          'backdrop-blur-xl backdrop-saturate-150 ' +
          (scrolled
            ? 'bg-white/[0.22] ring-1 ring-white/30 shadow-[0_10px_36px_-12px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(15,23,42,0.05)]'
            : 'bg-white/[0.10] ring-1 ring-white/20 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(15,23,42,0.04)]')
        }
      >
        {/* Single soft specular sheen — only the very top edge, dispersed
            like light catching a thin glass surface. Replaces the previous
            3 stacked overlays which read as cloudy/synthetic. */}
        <div
          aria-hidden
          className="absolute inset-x-8 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/55 to-transparent pointer-events-none"
        />
        <div className="px-4 sm:px-6 h-14 sm:h-15 flex items-center justify-between">
          <Link href="/" className="font-serif text-lg sm:text-xl font-semibold tracking-tight">
            <span className="text-slate-900">Zubite</span>
            <span className="text-teal-600">.bg</span>
          </Link>
          {/* Public homepage nav — Feb 2026 cleanup. Same labels as the
              global `<Header />` used on /kliniki, /blog, /care-pass, etc.
              Anchors point to in-page sections when the target lives on
              the homepage (`#kakvo-e-zubite`, `#treatments`, `#care-pass`);
              cross-page links use the canonical route. */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-[13px] text-slate-600">
            <Link href="/symptoms"           className="group/nav relative whitespace-nowrap hover:text-slate-900 transition-colors" data-testid="home-nav-symptoms"><span>Симптоми</span><span aria-hidden="true" className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-teal-600 transition-transform duration-300 ease-out group-hover/nav:scale-x-100" /></Link>
            <Link href="#treatments"         className="group/nav relative whitespace-nowrap hover:text-slate-900 transition-colors" data-testid="home-nav-treatments"><span>Лечения</span><span aria-hidden="true" className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-teal-600 transition-transform duration-300 ease-out group-hover/nav:scale-x-100" /></Link>
            <Link href="#care-pass"          className="group/nav relative whitespace-nowrap hover:text-slate-900 transition-colors" data-testid="home-nav-care-pass"><span>Care Pass</span><span aria-hidden="true" className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-teal-600 transition-transform duration-300 ease-out group-hover/nav:scale-x-100" /></Link>
            <Link href="/blog"               className="group/nav relative whitespace-nowrap hover:text-slate-900 transition-colors" data-testid="home-nav-blog"><span>Статии</span><span aria-hidden="true" className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-teal-600 transition-transform duration-300 ease-out group-hover/nav:scale-x-100" /></Link>
            <Link href="/za-kliniki"         className="group/nav relative whitespace-nowrap hover:text-slate-900 transition-colors" data-testid="home-nav-za-kliniki"><span>За клиники</span><span aria-hidden="true" className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-teal-600 transition-transform duration-300 ease-out group-hover/nav:scale-x-100" /></Link>
            <Link href="#kakvo-e-zubite"     className="group/nav relative whitespace-nowrap hover:text-slate-900 transition-colors" data-testid="home-nav-kakvo"><span>Какво е Zubite.bg</span><span aria-hidden="true" className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-teal-600 transition-transform duration-300 ease-out group-hover/nav:scale-x-100" /></Link>
          </nav>
          <div className="flex items-center gap-2">
            {/* Mobile hamburger — visible only <md. Desktop persistent
                `Започни анализа` CTA removed per Feb 2026 brief. */}
            <button
              type="button"
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Затвори меню' : 'Отвори меню'}
              aria-expanded={mobileOpen}
              aria-controls="home-mobile-menu"
              data-testid="home-mobile-menu-toggle"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer — categorised, opens under the glass nav bar */}
        {mobileOpen && (
          <nav
            id="home-mobile-menu"
            className="md:hidden border-t border-white/40 px-5 py-4 max-h-[80vh] overflow-y-auto"
            data-testid="home-mobile-menu-drawer"
          >
            <div className="space-y-1">
              {[
                { href: '/symptoms',     label: 'Симптоми',         testid: 'home-mobile-link-symptoms-primary' },
                { href: '#treatments',   label: 'Лечения',          testid: 'home-mobile-link-treatments' },
                { href: '#care-pass',    label: 'Care Pass',        testid: 'home-mobile-link-care-pass' },
                { href: '/blog',         label: 'Статии',           testid: 'home-mobile-link-blog' },
                { href: '/za-kliniki',   label: 'За клиники',       testid: 'home-mobile-link-za-kliniki' },
                { href: '#kakvo-e-zubite', label: 'Какво е Zubite.bg', testid: 'home-mobile-link-kakvo' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeMobile}
                  className="block py-2 text-sm text-slate-700 hover:text-slate-900 transition-colors"
                  data-testid={l.testid}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200/60">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold px-1 mb-1.5">
                Лечения и ръководства
              </p>
              {[
                { href: '/symptoms',           label: 'Симптоми',                testid: 'home-mobile-link-symptoms' },
                { href: '/orthodontics',       label: 'Ортодонтия',              testid: 'home-mobile-link-orthodontics' },
                { href: '/implants',           label: 'Импланти',                testid: 'home-mobile-link-implants' },
                { href: '/cosmetic-dentistry', label: 'Естетична стоматология',  testid: 'home-mobile-link-cosmetic' },
                { href: '/tmj',                label: 'TMJ',                     testid: 'home-mobile-link-tmj' },
                { href: '/sleep-airway',       label: 'Сън и дишане',            testid: 'home-mobile-link-sleep' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeMobile}
                  className="block py-1.5 px-1 text-[13.5px] text-slate-700 hover:text-slate-900 transition-colors"
                  data-testid={l.testid}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
    </div>
  )
}

export default Nav
