'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ChevronRight } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  city_slug: string
  treatment_type: string
  band: string
  created_at: string
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
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
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-6">
          Всички лийдове
        </h1>

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
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4 text-slate-900">{lead.name || 'Без име'}</td>
                    <td className="py-4 px-4">
                      <div className="text-slate-700 text-sm">{lead.email}</div>
                      <div className="text-slate-500 text-sm">{lead.phone}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-700 capitalize">{lead.city_slug}</td>
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
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Няма лийдове все още
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
