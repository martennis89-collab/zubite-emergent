'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Loader2, Users, FileText, TrendingUp, LogOut } from 'lucide-react'

interface Stats {
  total_leads: number
  leads_by_treatment: Record<string, number>
  leads_by_city: Record<string, number>
  recent_leads: Array<{
    id: string
    name: string
    city_slug: string
    treatment_type: string
    created_at: string
  }>
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    
    const fetchStats = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
        const response = await fetch(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        
        const data = await response.json()
        setStats(data)
      } catch {
        localStorage.removeItem('admin_token')
        router.push('/admin')
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [router])
  
  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    router.push('/admin')
  }
  
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
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-serif text-3xl font-semibold text-white">Табло</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Изход
            </button>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Общо лийдове</p>
                  <p className="text-2xl font-semibold text-white">{stats?.total_leads || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">По градове</p>
                  <p className="text-2xl font-semibold text-white">
                    {stats?.leads_by_city ? Object.keys(stats.leads_by_city).length : 0}
                  </p>
                </div>
              </div>
            </div>
            
            <Link href="/admin/leads" className="glass rounded-2xl p-6 card-hover">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Виж всички</p>
                  <p className="text-lg font-medium text-white">Лийдове →</p>
                </div>
              </div>
            </Link>
          </div>
          
          {/* Recent Leads */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-serif text-xl font-semibold text-white mb-4">Последни лийдове</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Име</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Град</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Лечение</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recent_leads?.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-800">
                      <td className="py-3 px-4 text-white">{lead.name || 'Без име'}</td>
                      <td className="py-3 px-4 text-slate-300">{lead.city_slug}</td>
                      <td className="py-3 px-4 text-slate-300">{lead.treatment_type}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(lead.created_at).toLocaleDateString('bg-BG')}
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recent_leads || stats.recent_leads.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
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
