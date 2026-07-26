'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  FileText,
  Building2,
  ClipboardList,
  TrendingUp,
  Newspaper,
  Star,
  MessageCircleQuestion,
  Sparkles,
  Heart,
  LogOut,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Shared admin chrome — single source of truth for the admin top bar
 * across every page under `/admin/*` (except the login screen).
 *
 * Two layouts:
 *   - List pages (e.g. /admin/dashboard, /admin/clinics): nav.
 *   - Detail / editor pages: pass `backHref` + `backLabel` to render a
 *     compact "← Back" link in place of the nav bar. Logout is still
 *     available on the right.
 *
 * Primary navigation on desktop (lg+) now lives in the persistent left
 * AdminSidebar (see components/admin/AdminSidebar.tsx, mounted once in
 * app/admin/layout.tsx) — 11 nav items in one horizontal row was
 * overlapping once every label was shown at lg+. The `<nav>` below is
 * `lg:hidden`: it's kept only as the narrower-screen (mobile/tablet)
 * fallback, where the sidebar is hidden. ADMIN_NAV is the single shared
 * source both components read from.
 */

export interface AdminNavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  testId?: string
  // Optional matcher for the "active" state. Defaults to exact path match
  // OR a startsWith match for sub-routes (e.g. /admin/blog/new is still
  // "Блог" active).
  matchPrefix?: string
}

export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Табло',
    icon: Users,
    testId: 'admin-nav-dashboard',
    matchPrefix: '/admin/dashboard',
  },
  {
    href: '/admin/consultation-requests',
    label: 'Заявки',
    icon: ClipboardList,
    testId: 'admin-nav-consultation-requests',
    matchPrefix: '/admin/consultation-requests',
  },
  {
    href: '/admin/clinics',
    label: 'Партньори',
    icon: Building2,
    testId: 'admin-nav-clinics',
    matchPrefix: '/admin/clinics',
  },
  {
    href: '/admin/clinic-applications',
    label: 'Кандидатури',
    icon: FileText,
    testId: 'admin-nav-applications',
    matchPrefix: '/admin/clinic-applications',
  },
  {
    href: '/admin/online-orientation-bookings',
    label: 'Онлайн заявки',
    icon: ClipboardList,
    testId: 'admin-nav-orient-bookings',
    matchPrefix: '/admin/online-orientation-bookings',
  },
  {
    href: '/admin/reviews',
    label: 'Ревюта',
    icon: Star,
    testId: 'admin-nav-reviews',
    matchPrefix: '/admin/reviews',
  },
  {
    href: '/admin/community',
    label: 'Общност',
    icon: MessageCircleQuestion,
    testId: 'admin-nav-community',
    matchPrefix: '/admin/community',
  },
  {
    href: '/admin/recognition',
    label: 'Благодарности',
    icon: Heart,
    testId: 'admin-nav-recognition',
    matchPrefix: '/admin/recognition',
  },
  {
    href: '/admin/analytics',
    label: 'Анализи',
    icon: TrendingUp,
    testId: 'admin-nav-analytics',
    matchPrefix: '/admin/analytics',
  },
  {
    href: '/admin/blog',
    label: 'Блог',
    icon: Newspaper,
    testId: 'admin-nav-blog',
    matchPrefix: '/admin/blog',
  },
  {
    href: '/admin/content-automation',
    label: 'Автоматизация',
    icon: Sparkles,
    testId: 'admin-nav-content-automation',
    matchPrefix: '/admin/content-automation',
  },
]

interface Props {
  /** Detail-page back link. When set, the nav bar is hidden. */
  backHref?: string
  backLabel?: string
  /** Page-specific subtitle next to "Админ панел". Optional. */
  pageTitle?: string
}

export function AdminHeader({ backHref, backLabel, pageTitle }: Props) {
  const pathname = usePathname() || ''
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
      })
    } catch {
      /* cookie may already be gone */
    }
    try {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
    } catch {
      /* noop */
    }
    router.push('/admin')
  }

  const isDetail = !!backHref

  return (
    <header
      className="taste-admin-header bg-white border-b border-slate-200 sticky top-0 z-40"
      data-testid="admin-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: brand + (optional back link or page title) */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin/dashboard"
              className="font-serif text-xl font-semibold text-slate-900 whitespace-nowrap"
              data-testid="admin-header-brand"
            >
              Zubite<span className="text-teal-600">.bg</span>
            </Link>
            <span className="text-slate-300" aria-hidden>
              |
            </span>
            <span className="text-slate-600 font-medium hidden sm:inline whitespace-nowrap">
              {pageTitle || 'Админ панел'}
            </span>
            {isDetail && (
              <>
                <span className="text-slate-300 hidden md:inline" aria-hidden>
                  ·
                </span>
                <Link
                  href={backHref!}
                  className="hidden md:inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  data-testid="admin-header-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">
                    {backLabel || 'Назад'}
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Right: nav (list mode) OR back link on mobile (detail mode) + logout */}
          <div className="flex items-center gap-1 sm:gap-3">
            {isDetail ? (
              <Link
                href={backHref!}
                className="md:hidden inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                data-testid="admin-header-back-mobile"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="truncate max-w-[120px]">
                  {backLabel || 'Назад'}
                </span>
              </Link>
            ) : (
              <nav
                className="flex items-center gap-1 sm:gap-2 lg:hidden"
                aria-label="Admin navigation (compact)"
              >
                {ADMIN_NAV.map((item) => {
                  const Icon = item.icon
                  const matchAt = item.matchPrefix || item.href
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(matchAt + '/') ||
                    pathname === matchAt
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={item.testId}
                      aria-current={active ? 'page' : undefined}
                      className={
                        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ' +
                        (active
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50')
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden lg:inline">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              data-testid="admin-header-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Изход</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
