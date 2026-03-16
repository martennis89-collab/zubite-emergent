'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Loader2, LogOut, Users, TrendingUp, MapPin, Phone, Mail, 
  Calendar, Filter, RefreshCw, ChevronRight, CheckCircle, 
  AlertCircle, XCircle, FileDown, Search, FileText
} from 'lucide-react'

interface Lead {
  id: string
  created_at: string
  city_slug: string
  treatment_type: string
  score_total: number
  band: string
  status: string
  name?: string
  phone?: string
  email?: string
  answers: Record<string, unknown>
}

interface Stats {
  total_leads: number
  new_leads: number
  by_band: {
    green: number
    yellow: number
    red: number
  }
  by_city: Record<string, number>
}

const CITY_NAMES: Record<string, string> = {
  sofia: 'София',
  plovdiv: 'Пловдив',
  varna: 'Варна',
  haskovo: 'Хасково'
}

const TREATMENT_NAMES: Record<string, string> = {
  orthodontics: 'Ортодонтия',
  implants: 'Импланти',
  'cosmetic-dentistry': 'Естетика',
  'sleep-airway': 'Сънна апнея',
  tmj: 'TMJ',
  invisalign: 'Инвизалайн',
  full_mouth: 'Пълна уста'
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Нов',
  CONTACTED: 'Контактуван',
  SCHEDULED: 'Записан',
  COMPLETED: 'Завършен',
  CANCELLED: 'Отказан'
}

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filterBand, setFilterBand] = useState<string>('')
  const [filterCity, setFilterCity] = useState<string>('')
  const [filterTreatment, setFilterTreatment] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      
      // Fetch leads with filters
      const params = new URLSearchParams()
      if (filterBand) params.append('band', filterBand)
      if (filterCity) params.append('city_slug', filterCity)
      if (filterTreatment) params.append('treatment_type', filterTreatment)
      
      const [leadsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/leads?${params.toString()}`, { headers }),
        fetch(`${API_URL}/admin/stats`, { headers })
      ])
      
      if (!leadsRes.ok || !statsRes.ok) {
        if (leadsRes.status === 401 || statsRes.status === 401) {
          localStorage.removeItem('admin_token')
          router.push('/admin')
          return
        }
        throw new Error('Failed to fetch data')
      }
      
      const [leadsData, statsData] = await Promise.all([
        leadsRes.json(),
        statsRes.json()
      ])
      
      setLeads(leadsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router, filterBand, filterCity, filterTreatment])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin')
  }
  
  const handleExportCSV = async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
    const response = await fetch(`${API_URL}/admin/leads/export/csv`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'leads.csv'
      a.click()
    }
  }
  
  const getBandIcon = (band: string) => {
    switch (band) {
      case 'GREEN':
      case 'green':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'YELLOW':
      case 'yellow':
        return <AlertCircle className="w-5 h-5 text-amber-500" />
      default:
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }
  
  const getBandBadge = (band: string) => {
    const normalizedBand = band.toUpperCase()
    switch (normalizedBand) {
      case 'GREEN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Зелен</span>
      case 'YELLOW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Жълт</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Червен</span>
    }
  }
  
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      lead.name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.phone?.includes(search)
    )
  })
  
  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </main>
    )
  }
  
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium">Админ Панел</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Изход</span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-sky-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.total_leads}</p>
              <p className="text-sm text-slate-500">Общо лийдове</p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.by_band.green}</p>
              <p className="text-sm text-slate-500">Зелени (готови)</p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.by_band.yellow}</p>
              <p className="text-sm text-slate-500">Жълти (консултация)</p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.by_band.red}</p>
              <p className="text-sm text-slate-500">Червени (ниска)</p>
            </div>
          </div>
        )}
        
        {/* Filters & Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">Филтри:</span>
              </div>
              
              <select
                value={filterBand}
                onChange={e => setFilterBand(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="">Всички категории</option>
                <option value="GREEN">Зелен</option>
                <option value="YELLOW">Жълт</option>
                <option value="RED">Червен</option>
              </select>
              
              <select
                value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="">Всички градове</option>
                {Object.entries(CITY_NAMES).map(([slug, name]) => (
                  <option key={slug} value={slug}>{name}</option>
                ))}
              </select>
              
              <select
                value={filterTreatment}
                onChange={e => setFilterTreatment(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="">Всички лечения</option>
                {Object.entries(TREATMENT_NAMES).map(([slug, name]) => (
                  <option key={slug} value={slug}>{name}</option>
                ))}
              </select>
              
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Търсене..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sky-500 w-48"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => fetchData()}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Обнови
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                Експорт CSV
              </button>
            </div>
          </div>
        </div>
        
        {/* Leads Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Лийд
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Контакт
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Лечение
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Град
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Резултат
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      Няма намерени лийдове
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {getBandIcon(lead.band)}
                          <div>
                            <p className="font-medium text-slate-900">
                              {lead.name || 'Без име'}
                            </p>
                            <p className="text-xs text-slate-500">
                              ID: {lead.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {lead.phone || lead.email ? (
                          <div className="space-y-1">
                            {lead.phone && (
                              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                <Phone className="w-3.5 h-3.5" />
                                {lead.phone}
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                <Mail className="w-3.5 h-3.5" />
                                {lead.email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Няма данни</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">
                          {TREATMENT_NAMES[lead.treatment_type] || lead.treatment_type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5" />
                          {CITY_NAMES[lead.city_slug] || lead.city_slug}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getBandBadge(lead.band)}
                          <span className="text-sm text-slate-500">{lead.score_total}pt</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {STATUS_LABELS[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(lead.created_at).toLocaleDateString('bg-BG', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="p-2 text-slate-400 hover:text-sky-500 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Leads count */}
        <p className="text-sm text-slate-500 mt-4">
          Показани: {filteredLeads.length} от {leads.length} лийдове
        </p>
      </div>
    </main>
  )
}
