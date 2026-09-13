'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, ListChecks, Calendar, BarChart3, MessageSquare, LogOut, Building2,
  CalendarClock, Clock,
} from 'lucide-react'

interface ClinicUser {
  id: string
  clinic_name: string
  email: string
  city: string
}

const NAV = [
  { href: '/clinic/dashboard', label: 'Преглед', icon: LayoutDashboard, exact: true },
  { href: '/clinic/dashboard/requests', label: 'Заявки', icon: ListChecks },
  { href: '/clinic/dashboard/bookings', label: 'Заявки за час', icon: CalendarClock },
  { href: '/clinic/dashboard/online-orientation', label: 'Онлайн ориентация', icon: Calendar },
  { href: '/clinic/dashboard/calendar', label: 'Календар', icon: Calendar },
  { href: '/clinic/dashboard/availability', label: 'Наличности', icon: Clock },
  { href: '/clinic/dashboard/performance', label: 'Резултати', icon: BarChart3 },
  { href: '/clinic/dashboard/reviews', label: 'Ревюта', icon: MessageSquare },
]

export function ClinicShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<ClinicUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Cookie-based session probe. Fetch the clinic profile to populate
    // the header info; if the cookie is missing/invalid, redirect to login.
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
    fetch(`${API_URL}/api/clinic/profile`, { credentials: 'include' as RequestCredentials })
      .then(async (r) => {
        if (!r.ok) {
          try { localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_user') } catch { /* noop */ }
          router.replace('/clinic')
          return
        }
        try {
          const data = await r.json()
          setUser({
            id: data.id,
            clinic_name: data.clinic_name,
            email: data.email,
            city: data.city,
          })
        } catch { /* noop */ }
        setReady(true)
      })
      .catch(() => router.replace('/clinic'))
  }, [router])

  const logout = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      await fetch(`${API_URL}/api/clinic/logout`, { method: 'POST', credentials: 'include' as RequestCredentials })
    } catch { /* noop */ }
    try { localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_user') } catch { /* noop */ }
    router.push('/clinic')
  }

  if (!ready) return null

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/clinic/dashboard" className="font-serif text-xl font-semibold text-slate-900">
              Zubite<span className="text-teal-500">.bg</span>
            </Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-slate-600 font-medium hidden sm:inline">Клинично табло</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-slate-500" />
                <div className="leading-tight">
                  <div className="font-medium text-slate-700">{user.clinic_name}</div>
                  <div className="text-xs text-slate-400">{user.email}{user.city ? ` · ${user.city}` : ''}</div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-full border border-transparent hover:border-rose-200 transition-colors"
              data-testid="clinic-logout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Изход</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="lg:sticky lg:top-20 lg:self-start" data-testid="clinic-sidebar">
          <nav className="bg-white border border-slate-200 rounded-xl p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`clinic-nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-teal-500 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  )
}
