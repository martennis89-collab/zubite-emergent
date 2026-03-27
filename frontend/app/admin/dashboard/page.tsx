'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Loader2, LogOut, Users, TrendingUp, MapPin, Phone, Mail, 
  Calendar, Filter, RefreshCw, CheckCircle, 
  AlertCircle, XCircle, FileDown, Search, FileText, X, Save, Trash2, RotateCcw
} from 'lucide-react'

// Quiz questions mapping
const QUESTIONS: Record<string, string> = {
  q1: 'Усещаш ли, че дъвчеш повече от едната страна на устата?',
  q2: 'Имаш ли зъби, които изглеждат леко струпани или застъпени?',
  q3: 'Усещаш ли понякога, че захапката ти не е съвсем равномерна?',
  q4: 'Събуждаш ли се сутрин с напрежение в челюстта или около слепоочията?',
  q5: 'Чуваш ли щракане или пукане при отваряне на устата?',
  q6: 'Има ли зъби, които са по-износени от останалите?',
  q7: 'Имаш ли чувствителност към студено или горещо в определени зъби?',
  q8: 'Забелязваш ли, че венците ти се оттеглят на някои места?',
  q9: 'Имаш ли главоболие или болки във врата, които не можеш да обясниш?',
  q10: 'Получавал/а ли си коментари от зъболекар за неправилна захапка?'
}

const ANSWER_LABELS: Record<string, string> = {
  yes: 'Да',
  sometimes: 'Понякога',
  unsure: 'Не съм сигурен/а',
  no: 'Не'
}

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
  notes?: string
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
  burgas: 'Бургас',
  haskovo: 'Хасково'
}

const TREATMENT_NAMES: Record<string, string> = {
  orthodontics: 'Ортодонтия',
  master_quiz: 'Основен тест',
  implants: 'Импланти',
  'cosmetic-dentistry': 'Естетика',
  'sleep-airway': 'Сънна апнея',
  tmj: 'TMJ',
  invisalign: 'Инвизалайн',
  full_mouth: 'Пълна уста'
}

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Нов' },
  { value: 'CONTACTED', label: 'Контактуван' },
  { value: 'SCHEDULED', label: 'Записан' },
  { value: 'COMPLETED', label: 'Завършен' },
  { value: 'CANCELLED', label: 'Отказан' }
]

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filterBand, setFilterBand] = useState<string>('')
  const [filterCity, setFilterCity] = useState<string>('')
  const [filterTreatment, setFilterTreatment] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', city_slug: '', status: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resettingAnalytics, setResettingAnalytics] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      
      const params = new URLSearchParams()
      if (filterBand) params.append('band', filterBand)
      if (filterCity) params.append('city_slug', filterCity)
      if (filterTreatment) params.append('treatment_type', filterTreatment)
      
      const [leadsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/leads?${params.toString()}`, { headers }),
        fetch(`${API_URL}/api/admin/stats`, { headers })
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
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
    const response = await fetch(`${API_URL}/api/admin/leads/export/csv`, {
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

  const handleResetAnalytics = async () => {
    if (!confirm('Сигурен ли си, че искаш да нулираш всички аналитики? Това действие е необратимо.')) return
    
    const token = localStorage.getItem('admin_token')
    if (!token) return
    
    setResettingAnalytics(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/reset-analytics`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: `Аналитиките са нулирани. Изтрити събития: ${data.deleted_count}` })
      } else {
        throw new Error('Failed')
      }
    } catch {
      setMessage({ type: 'error', text: 'Грешка при нулиране на аналитиките' })
    } finally {
      setResettingAnalytics(false)
    }
  }

  const openLeadModal = (lead: Lead) => {
    setSelectedLead(lead)
    setEditForm({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city_slug: lead.city_slug || '',
      status: lead.status || 'NEW',
      notes: lead.notes || ''
    })
    setMessage(null)
  }

  const closeModal = () => {
    setSelectedLead(null)
    setMessage(null)
  }

  const handleSaveLead = async () => {
    const token = localStorage.getItem('admin_token')
    if (!token || !selectedLead) return
    
    setSaving(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Лийдът е обновен успешно!' })
        fetchData()
        // Update selected lead with new data
        const updatedLead = await response.json()
        setSelectedLead({ ...selectedLead, ...updatedLead })
      } else {
        throw new Error('Failed')
      }
    } catch {
      setMessage({ type: 'error', text: 'Грешка при запазване' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLead = async () => {
    const token = localStorage.getItem('admin_token')
    if (!token || !selectedLead) return
    
    if (!confirm('Сигурен ли си, че искаш да изтриеш този лийд?')) return
    
    setDeleting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/leads/${selectedLead.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        closeModal()
        fetchData()
      } else {
        throw new Error('Failed')
      }
    } catch {
      setMessage({ type: 'error', text: 'Грешка при изтриване' })
    } finally {
      setDeleting(false)
    }
  }
  
  const getBandIcon = (band: string) => {
    switch (band?.toUpperCase()) {
      case 'GREEN':
      case 'EARLY':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'YELLOW':
      case 'DEVELOPING':
      case 'PROGRESSING':
        return <AlertCircle className="w-5 h-5 text-amber-500" />
      default:
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }
  
  const getBandBadge = (band: string) => {
    const normalizedBand = band?.toUpperCase()
    switch (normalizedBand) {
      case 'GREEN':
      case 'EARLY':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Зелен</span>
      case 'YELLOW':
      case 'DEVELOPING':
      case 'PROGRESSING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Жълт</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Червен</span>
    }
  }

  // Extract quiz answers from a lead
  const getQuizAnswers = (lead: Lead) => {
    const answers = lead.answers || {}
    return Object.entries(answers)
      .filter(([key]) => key.startsWith('q') && key.length <= 3)
      .sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)))
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium">Админ Панел</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/analytics"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                <span className="hidden sm:inline">Анализи</span>
              </Link>
              <Link
                href="/admin/blog"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">Блог</span>
              </Link>
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
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global Message */}
        {message && !selectedLead && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
              <p className="text-sm text-slate-500">Зелени (ранен)</p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.by_band.yellow}</p>
              <p className="text-sm text-slate-500">Жълти (развиващ)</p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.by_band.red}</p>
              <p className="text-sm text-slate-500">Червени (напреднал)</p>
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
                onClick={handleResetAnalytics}
                disabled={resettingAnalytics}
                className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                title="Нулирай аналитиките"
              >
                {resettingAnalytics ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span className="hidden md:inline">Нулирай</span>
              </button>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Лийд</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Контакт</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Град</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Резултат</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      Няма намерени лийдове
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => openLeadModal(lead)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {getBandIcon(lead.band)}
                          <div>
                            <p className="font-medium text-slate-900">{lead.name || 'Без име'}</p>
                            <p className="text-xs text-slate-500">ID: {lead.id.slice(0, 8)}...</p>
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
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5" />
                          {CITY_NAMES[lead.city_slug] || lead.city_slug}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getBandBadge(lead.band)}
                          <span className="text-sm text-slate-500">{lead.score_total || 0}pt</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status}
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <p className="text-sm text-slate-500 mt-4">
          Показани: {filteredLeads.length} от {leads.length} лийдове
        </p>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-slate-900">
                  Детайли за лийд
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteLead}
                    disabled={deleting}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    <span>Изтрий</span>
                  </button>
                  <button
                    onClick={handleSaveLead}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Запази</span>
                  </button>
                  <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* Message */}
                {message && (
                  <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span>{message.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left - Contact Info */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-medium text-slate-900 mb-4">Контактна информация</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Име</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Телефон</label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Имейл</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Град</label>
                          <select
                            value={editForm.city_slug}
                            onChange={e => setEditForm(prev => ({ ...prev, city_slug: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="">Избери</option>
                            {Object.entries(CITY_NAMES).map(([slug, name]) => (
                              <option key={slug} value={slug}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Статус</label>
                          <select
                            value={editForm.status}
                            onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-medium text-slate-900 mb-4">Бележки</h3>
                      <textarea
                        value={editForm.notes}
                        onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                        placeholder="Добави бележки..."
                      />
                    </div>

                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-medium text-slate-900 mb-4">Информация</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Създаден</span>
                          <span className="text-slate-900">{new Date(selectedLead.created_at).toLocaleString('bg-BG')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ID</span>
                          <span className="text-slate-900 font-mono text-xs">{selectedLead.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Резултат</span>
                          {getBandBadge(selectedLead.band)}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Точки</span>
                          <span className="text-slate-900">{selectedLead.score_total || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right - Quiz Answers */}
                  <div>
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-medium text-slate-900 mb-4">Отговори на въпросите</h3>
                      {getQuizAnswers(selectedLead).length > 0 ? (
                        <div className="space-y-3">
                          {getQuizAnswers(selectedLead).map(([key, value]) => {
                            const questionText = QUESTIONS[key] || key
                            const answerValue = String(value)
                            const answerText = ANSWER_LABELS[answerValue] || answerValue
                            
                            return (
                              <div key={key} className="p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-slate-400 mb-1">
                                      Въпрос {key.replace('q', '')}
                                    </p>
                                    <p className="text-sm text-slate-900">{questionText}</p>
                                  </div>
                                  <div className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                                    answerValue === 'yes' ? 'bg-red-100 text-red-700' :
                                    answerValue === 'sometimes' ? 'bg-amber-100 text-amber-700' :
                                    answerValue === 'unsure' ? 'bg-slate-200 text-slate-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {answerText}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-8">Няма записани отговори</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
