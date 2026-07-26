'use client'

import { usePathname } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'

/**
 * Wraps every /admin/* page with the persistent left sidebar (desktop) —
 * except the login screen itself, which has no nav to show. Lives in
 * app/admin/layout.tsx so individual pages don't each need to opt in.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const isLoginScreen = pathname === '/admin'

  if (isLoginScreen) return <>{children}</>

  return (
    <>
      <AdminSidebar />
      <div className="lg:pl-60">{children}</div>
    </>
  )
}
