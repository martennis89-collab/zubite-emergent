'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  {
    id: 'about',
    label: 'Какво е Zubite.bg',
    href: '/#how-it-works',
    match: ['/'],
  },
  {
    id: 'symptoms',
    label: 'Симптоми',
    href: '/symptoms',
    match: ['/symptoms', '/crooked-teeth'],
  },
  {
    id: 'treatments',
    label: 'Лечения',
    href: '/treatments',
    match: [
      '/treatments',
      '/orthodontics',
      '/implants',
      '/cosmetic-dentistry',
      '/tmj',
      '/sleep-airway',
      '/braces',
      '/invisalign-bulgaria',
      '/invisalign-price',
      '/implant-price',
      '/what-is-invisalign',
      '/aligners-vs-braces',
      '/aligners-comparison',
    ],
  },
  {
    id: 'articles',
    label: 'Статии',
    href: '/blog',
    match: ['/blog', '/full-picture-dental-assessment'],
  },
  {
    id: 'community',
    label: 'Общност',
    href: '/community',
    match: ['/community', '/ask', '/recognition'],
  },
] as const

export function Header({ home = false }: { home?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  const activeFor = (item: (typeof NAV_ITEMS)[number]) => {
    if (home) return false
    return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  }

  return (
    <header
      className="sticky top-0 z-50 bg-transparent px-4 py-3 sm:px-6"
      data-testid="site-nav"
    >
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-12 shrink-0 items-center rounded-full border border-[#E5E5E5] bg-white px-4 font-display text-xl font-bold tracking-[-0.04em] text-[#0A0A0A] shadow-[0_6px_18px_-6px_rgba(15,15,15,0.18),0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#D4D4D4] focus-visible:ring-2 focus-visible:ring-[#007956] focus-visible:ring-offset-2 sm:text-2xl"
          aria-label="Zubite.bg начало"
          data-testid="logo"
        >
          Zubite<span className="text-[#007956]">.bg</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <nav
            className="hidden items-center gap-1 rounded-full border border-[#E5E5E5] bg-white p-1.5 shadow-[0_6px_18px_-6px_rgba(15,15,15,0.18),0_1px_2px_rgba(0,0,0,0.04)] lg:flex"
            aria-label="Главна навигация"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeFor(item)

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'relative inline-flex min-h-11 items-center rounded-full px-4 py-2 text-[13px] font-medium tracking-[-0.01em] outline-none transition-[color,transform,background-color] duration-200 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-[#007956] ' +
                    (active
                      ? 'bg-[#F5F4F2] text-[#0A0A0A]'
                      : 'text-[#525252] hover:bg-[#F5F4F2] hover:text-[#0A0A0A]')
                  }
                  data-testid={`nav-${item.id}`}
                >
                  {item.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#FF6B00]"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center rounded-full border border-[#E5E5E5] bg-white p-1.5 shadow-[0_6px_18px_-6px_rgba(15,15,15,0.18),0_1px_2px_rgba(0,0,0,0.04)] lg:hidden">
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full border border-[#E5E5E5] text-[#0A0A0A] outline-none transition-colors hover:bg-[#F5F4F2] focus-visible:ring-2 focus-visible:ring-[#007956] lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="site-mobile-navigation"
              aria-label={open ? 'Затвори менюто' : 'Отвори менюто'}
              data-testid="mobile-menu"
            >
              {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <nav
          id="site-mobile-navigation"
          className="mx-auto mt-3 max-w-[1280px] rounded-2xl border border-[#E5E5E5] bg-white px-5 py-5 shadow-[0_14px_32px_-8px_rgba(0,0,0,0.18)] lg:hidden"
          aria-label="Мобилна навигация"
          data-testid="mobile-menu-drawer"
        >
          <div className="mx-auto flex max-w-[1280px] flex-col">
            {NAV_ITEMS.map((item) => {
              const active = activeFor(item)

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={
                    'flex min-h-11 items-center border-b border-[#E5E5E5] py-3 text-base outline-none transition-colors last:border-0 focus-visible:ring-2 focus-visible:ring-[#007956] ' +
                    (active ? 'font-semibold text-[#006A61]' : 'text-[#171717] hover:text-[#006A61]')
                  }
                  data-testid={`mobile-nav-${item.id}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}
