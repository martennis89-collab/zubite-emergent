'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Loader2, ArrowLeft, Phone, Mail, MapPin, Calendar, 
  CheckCircle, AlertCircle, XCircle, Save, User, FileText
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
  consent: boolean
  answers: Record<string, unknown>
  notes?: string
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

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Нов' },
  { value: 'CONTACTED', label: 'Контактуван' },
  { value: 'SCHEDULED', label: 'Записан' },
  { value: 'COMPLETED', label: 'Завършен' },
  { value: 'CANCELLED', label: 'Отказан' }
]

export default function LeadDetailPage() {
  const params = useParams()
  const leadId = params.id as string
  const router = useRouter()
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  
  const fetchLead = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${API_URL}/admin/leads/${leadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.status === 401) {
        localStorage.removeItem('admin_token')
        router.push('/admin')
        return
      }
      
      if (!response.ok) throw new Error('Failed to fetch lead')
      
      const data = await response.json()
      setLead(data)
      setStatus(data.status)
      setNotes(data.notes || '')
    } catch (error) {
      console.error('Error fetching lead:', error)
    } finally {
      setIsLoading(false)
    }
  }, [leadId, router])
  
  useEffect(() => {
    fetchLead()
  }, [fetchLead])
  
  const handleSave = async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${API_URL}/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      })
      
      if (response.ok) {
        setSaveMessage('Запазено успешно!')
        fetchLead()
      } else {
        setSaveMessage('Грешка при запазване')
      }
    } catch {
      setSaveMessage('Грешка при запазване')
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }
  
  const getBandInfo = (band: string) => {
    const normalizedBand = band.toUpperCase()
    switch (normalizedBand) {
      case 'GREEN':
        return {
          icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          label: 'Зелен - Подходящ кандидат'
        }
      case 'YELLOW':
        return {
          icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          label: 'Жълт - Необходима консултация'
        }
      default:
        return {
          icon: <XCircle className="w-6 h-6 text-red-500" />,
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          label: 'Червен - Нужна е оценка'
        }
    }
  }
  
  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </main>
    )
  }
  
  if (!lead) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Лийдът не беше намерен</div>
      </main>
    )
  }
  
  const bandInfo = getBandInfo(lead.band)
  
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link 
              href="/admin/dashboard"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Назад към панела</span>
            </Link>
          </div>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lead Header */}
        <div className={`${bandInfo.bg} ${bandInfo.border} border-2 rounded-2xl p-6 mb-6`}>
          <div className="flex items-start gap-4">
            {bandInfo.icon}
            <div className="flex-1">
              <h1 className="font-serif text-2xl font-semibold text-slate-900 mb-1">
                {lead.name || 'Без име'}
              </h1>
              <p className={`${bandInfo.text} font-medium`}>{bandInfo.label}</p>
              <p className="text-sm text-slate-500 mt-1">
                Резултат: {lead.score_total} точки
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              Контактна информация
            </h2>
            
            <div className="space-y-4">
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <a href={`tel:${lead.phone}`} className="text-slate-700 hover:text-sky-500">
                    {lead.phone}
                  </a>
                </div>
              )}
              
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <a href={`mailto:${lead.email}`} className="text-slate-700 hover:text-sky-500">
                    {lead.email}
                  </a>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-400" />
                <span className="text-slate-700">
                  {CITY_NAMES[lead.city_slug] || lead.city_slug}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <span className="text-slate-700">
                  {new Date(lead.created_at).toLocaleDateString('bg-BG', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Лечение: <span className="text-slate-700">{TREATMENT_NAMES[lead.treatment_type] || lead.treatment_type}</span>
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Съгласие GDPR: <span className="text-slate-700">{lead.consent ? 'Да' : 'Не'}</span>
              </p>
            </div>
          </div>
          
          {/* Status & Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              Управление
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Статус
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Бележки
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500 resize-none"
                  placeholder="Добавете бележки..."
                />
              </div>
              
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Запази
              </button>
              
              {saveMessage && (
                <p className={`text-sm text-center ${saveMessage.includes('успешно') ? 'text-emerald-600' : 'text-red-600'}`}>
                  {saveMessage}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Answers */}
        {Object.keys(lead.answers).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">
            <h2 className="font-medium text-slate-900 mb-4">Отговори от теста</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(lead.answers).map(([key, value]) => (
                <div key={key} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{key}</p>
                  <p className="text-slate-700">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
