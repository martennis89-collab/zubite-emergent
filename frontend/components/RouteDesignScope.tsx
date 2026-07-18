'use client'

import { usePathname } from 'next/navigation'

type RouteFamily =
  | 'home'
  | 'quiz'
  | 'results'
  | 'directory'
  | 'clinic'
  | 'admin'
  | 'editorial'
  | 'flow'
  | 'public'

function routeFamily(pathname: string): RouteFamily {
  if (pathname === '/') return 'home'
  if (pathname === '/quiz') return 'quiz'
  if (pathname.startsWith('/quiz/')) return 'flow'
  if (pathname.startsWith('/results/')) return 'results'
  if (pathname === '/kliniki' || pathname.startsWith('/kliniki/')) return 'directory'
  if (pathname === '/clinic' || pathname.startsWith('/clinic/')) return 'clinic'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin'
  if (pathname === '/blog' || pathname.startsWith('/blog/')) return 'editorial'
  if (
    pathname.startsWith('/booking/') ||
    pathname.startsWith('/review/') ||
    pathname.startsWith('/verify/') ||
    pathname.startsWith('/patient/') ||
    pathname === '/assessment' ||
    pathname.startsWith('/assessment/')
  ) return 'flow'
  return 'public'
}

/**
 * One visual-system boundary for the complete App Router tree.
 *
 * Page logic stays inside each route; this component only exposes a stable
 * family hook so public content, patient flows, directory, clinic portal and
 * admin surfaces can share the TasteSkill tokens without fragile pathname
 * checks scattered through dozens of files.
 */
export function RouteDesignScope({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const family = routeFamily(pathname)

  return (
    <div
      className={`taste-site taste-route-scope taste-family-${family}`}
      data-route-family={family}
    >
      {children}
    </div>
  )
}
