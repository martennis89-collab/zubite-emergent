'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Loader2, ArrowLeft, ChevronRight } from 'lucide-react'

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
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    
    const fetchLeads = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
        const response = await fetch(`${API_URL}/api/admin/leads`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        
        const data = await response.json()
        setLeads(data)
      } catch {
        localStorage.removeItem('admin_token')
        router.push('/admin')
      } finally {
        setLoading(false)
      }
    }
    
    fetchLeads()
  }, [router])
  
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </main>
    )
  }
  
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад към таблото</span>
          </Link>
          
          <h1 className="font-serif text-3xl font-semibold text-white mb-8">Всички лийдове</h1>
          
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Име</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Контакт</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Град</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Лечение</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Дата</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="py-4 px-4 text-white">{lead.name || 'Без име'}</td>
                      <td className="py-4 px-4">
                        <div className="text-slate-300 text-sm">{lead.email}</div>
                        <div className="text-slate-400 text-sm">{lead.phone}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-300 capitalize">{lead.city_slug}</td>
                      <td className="py-4 px-4 text-slate-300">{lead.treatment_type}</td>
                      <td className="py-4 px-4 text-slate-400">
                        {new Date(lead.created_at).toLocaleDateString('bg-BG')}
                      </td>
                      <td className="py-4 px-4">
                        <Link 
                          href={`/admin/leads/${lead.id}`}
                          className="text-sky-400 hover:text-sky-300 transition-colors"
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
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
