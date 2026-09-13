'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ADMIN_NAV } from './AdminHeader'

/**
 * Persistent left nav for desktop admin screens (lg+). Replaces the old
 * horizontal top-bar nav, which crammed 11 items into one row and
 * overlapped once every label was visible at lg+. AdminHeader still owns
 * a horizontal fallback nav for narrower screens (<lg), where this
 * sidebar is hidden — see its `lg:hidden` wrapper.
 */
export function AdminSidebar() {
  const pathname = usePathname() || ''

  return (
    <aside
      className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 z-30 w-60 border-r border-slate-200 bg-white"
      data-testid="admin-sidebar"
    >
      <div className="flex h-16 shrink-0 items-center px-5 border-b border-slate-200">
        <Link
          href="/admin/dashboard"
          className="font-serif text-xl font-semibold text-slate-900"
          data-testid="admin-sidebar-brand"
        >
          Zubite<span className="text-teal-600">.bg</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Admin navigation">
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
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ' +
                (active
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
