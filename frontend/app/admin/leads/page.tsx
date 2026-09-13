'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ChevronRight, Download } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  // Optional: the quiz funnel creates leads before city is known.
  city_slug?: string | null
  treatment_type: string
  band: string
  created_at: string
}

// Bulgarian city labels for the dropdown. We deliberately list ALL
// city_slug values the leads table can store so admins can filter
// by anything that's actually in the database; "all" disables filtering.
const CITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Всички градове' },
  { value: 'sofia', label: 'София' },
  { value: 'plovdiv', label: 'Пловдив' },
  { value: 'varna', label: 'Варна' },
  { value: 'burgas', label: 'Бургас' },
  { value: 'ruse', label: 'Русе' },
  { value: 'stara-zagora', label: 'Стара Загора' },
  { value: 'pleven', label: 'Плевен' },
  { value: 'haskovo', label: 'Хасково' },
]

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [exporting, setExporting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
        const response = await fetch(`${API_URL}/api/admin/leads`, {
          credentials: 'include' as RequestCredentials,
        })

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            try { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') } catch { /* noop */ }
            router.push('/admin')
            return
          }
          throw new Error('Failed to load')
        }

        const data = await response.json()
        setLeads(data)
      } catch {
        router.push('/admin')
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [router])

  // Client-side filtering — backend returns all leads. For the export
  // we hit the dedicated endpoint with the same city_slug filter, so
  // the downloaded spreadsheet matches what the admin sees on screen.
  const filteredLeads = useMemo(() => {
    if (cityFilter === 'all') return leads
    return leads.filter((l) => (l.city_slug || '').toLowerCase() === cityFilter)
  }, [leads, cityFilter])

  const handleExport = async () => {
    setExporting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const url = cityFilter === 'all'
        ? `${API_URL}/api/admin/leads/export/csv`
        : `${API_URL}/api/admin/leads/export/csv?city_slug=${encodeURIComponent(cityFilter)}`
      const res = await fetch(url, { credentials: 'include' as RequestCredentials })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/admin')
          return
        }
        throw new Error('Export failed')
      }
      const blob = await res.blob()
      const dl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = dl
      const stamp = new Date().toISOString().slice(0, 10)
      a.download = cityFilter === 'all'
        ? `zubite-leads-${stamp}.csv`
        : `zubite-leads-${cityFilter}-${stamp}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(dl)
    } catch (err) {
      // Best-effort — surface a calm alert so admin knows it failed.
      console.error('CSV export failed', err)
      alert('Експортът не успя. Опитай отново.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FCFAF8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8]">
      <AdminHeader
        pageTitle="Всички лийдове"
        backHref="/admin/dashboard"
        backLabel="Към таблото"
      />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Всички лийдове
          </h1>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium whitespace-nowrap">Град</span>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                data-testid="admin-leads-city-filter"
              >
                {CITY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 transition-colors"
              data-testid="admin-leads-export-csv"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Сваляне…' : 'Свали CSV'}
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-4" data-testid="admin-leads-count">
          Показани: <span className="font-medium text-slate-800">{filteredLeads.length}</span>
          {cityFilter !== 'all' && ` от ${leads.length}`}
        </p>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">Име</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">Контакт</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">Град</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">Лечение</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">Дата</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-500"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4 text-slate-900">{lead.name || 'Без име'}</td>
                    <td className="py-4 px-4">
                      <div className="text-slate-700 text-sm">{lead.email}</div>
                      <div className="text-slate-500 text-sm">{lead.phone}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-700 capitalize">{lead.city_slug || '—'}</td>
                    <td className="py-4 px-4 text-slate-700">{lead.treatment_type}</td>
                    <td className="py-4 px-4 text-slate-500">
                      {new Date(lead.created_at).toLocaleDateString('bg-BG')}
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      {cityFilter === 'all'
                        ? 'Няма лийдове все още'
                        : 'Няма лийдове за този град'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}
