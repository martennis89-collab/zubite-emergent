'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Loader2, LogOut, Users, TrendingUp, MapPin, Phone, Mail, 
  Calendar, Filter, RefreshCw, CheckCircle, 
  AlertCircle, XCircle, FileDown, Search, FileText, X, Save, Trash2, RotateCcw,
  Building2, ShieldCheck, Send, AlertTriangle, Clock,
  Sparkles, ArrowRight,
} from 'lucide-react'
import { AICallPanel } from '@/components/AICallPanel'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Quiz questions mapping — covers both legacy q1-q10 and new MasterQuiz
// segments (a1-a10 adult, t1-t8 teen, c1-c8 child).
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
  q10: 'Получавал/а ли си коментари от зъболекар за неправилна захапка?',
  a1: 'Коя от тези усмивки е най-близка до твоята?',
  a2: 'Когато се усмихваш, криеш ли зъбите си?',
  a3: 'Когато захапеш, усещаш ли зъбите си напълно равномерно?',
  a4: 'Дъвчеш ли повече от едната страна, без да се замисляш?',
  a5: 'Случва ли се да дишаш през устата (особено нощем)?',
  a6: 'Чуваш ли щракане или пукане при отваряне на устата?',
  a7: 'Събуждаш ли се с напрежение в челюстта или лицето?',
  a8: 'Забелязал/а ли си зъбите ти да изглеждат по-износени с времето?',
  a9: 'Имаш ли главоболие, напрежение във врата или ушите без ясна причина?',
  a10: 'Преди този тест мислеше ли, че имаш проблем със зъбите?',
  t1: 'Коя от тези усмивки е най-близка до тази на детето?',
  t2: 'Притеснява ли се детето от усмивката си?',
  t3: 'Изглежда ли захапката му/ѝ неравномерна?',
  t4: 'Дъвче ли повече от едната страна?',
  t5: 'Има ли вече постоянни зъби, които са струпани или нямат място?',
  t6: 'Диша ли често през устата?',
  t7: 'Има ли затруднения с говор или произнасяне на определени звуци?',
  t8: 'Мислиш ли, че ще има нужда от ортодонтско лечение?',
  c1: 'Как изглеждат зъбите на детето?',
  c2: 'Диша ли често през устата (особено нощем)?',
  c3: 'Хърка ли или има неспокоен сън?',
  c4: 'Смуче ли пръст или използва ли биберон дълго време?',
  c5: 'Изглежда ли челюстта тясна или зъбите нямат достатъчно място?',
  c6: 'Има ли видима разлика в захапката (горни/долни зъби)?',
  c7: 'Държи ли устата си често отворена през деня?',
  c8: 'Мислиш ли, че има нужда от преглед при ортодонт?',
}

const ANSWER_LABELS: Record<string, string> = {
  yes: 'Да',
  sometimes: 'Понякога',
  unsure: 'Не съм сигурен/а',
  no: 'Не',
  crowded: 'Видимо струпани',
  mild: 'Леко струпани',
  aligned: 'Подредени',
  past: 'Преди да, вече не',
}

const RESERVED_ANSWER_KEYS = new Set([
  'quiz_score', 'quiz_band', 'quiz_flags', 'segment', 'form_version',
  'session_id', 'source',
])

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
  // Call fields
  call_status?: string
  call_attempts?: number
  last_call_at?: string
  last_call_duration_seconds?: number
  answered_call?: boolean
  interested_in_treatment?: boolean
  treatment_interest?: string
  treatment_timeline?: string
  permission_to_share?: boolean
  call_summary?: string
  call_transcript?: Array<{ role: string; message: string; time_in_call_secs?: number }>
  call_outcome_json?: Record<string, unknown>
  call_error_message?: string
  // Verification & clinic assignment
  assigned_clinic_id?: string
  clinic_lead_status?: string
  verification_status?: string
  // Attribution (Feb 2026)
  first_lead_source_type?: string | null
  latest_lead_source_type?: string | null
  latest_utm_source?: string | null
  latest_utm_medium?: string | null
  latest_utm_campaign?: string | null
  latest_utm_adset?: string | null
  latest_utm_ad?: string | null
  first_article_slug?: string | null
  latest_article_slug?: string | null
  blog_assisted_conversion?: boolean | null
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

const VERIFICATION_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Изпратено', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  verified: { label: 'Потвърдено', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  flagged: { label: 'Флагирано', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertTriangle },
}

interface ClinicOption { id: string; clinic_name: string; city: string }

function ClinicVerificationPanel({ lead, onMessage, onLeadUpdate }: {
  lead: Lead
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void
  onLeadUpdate: (lead: Lead) => void
}) {
  const [clinics, setClinics] = useState<ClinicOption[]>([])
  const [selectedClinicId, setSelectedClinicId] = useState(lead.assigned_clinic_id || '')
  const [assigning, setAssigning] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/admin/clinic-accounts`, { credentials: 'include' as RequestCredentials })
      .then(r => r.json())
      .then(d => setClinics(d.clinics || []))
      .catch(() => {})
  }, [])

  const handleAssign = async () => {
    if (!selectedClinicId) return
    setAssigning(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/leads/${lead.id}/assign-clinic`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: selectedClinicId }), credentials: 'include' as RequestCredentials,})
      const data = await res.json()
      if (res.ok) {
        onMessage({ type: 'success', text: `Лийдът е насочен към ${data.assigned_to}` })
        onLeadUpdate({ ...lead, assigned_clinic_id: selectedClinicId, clinic_lead_status: 'new' })
      } else {
        onMessage({ type: 'error', text: data.detail || 'Грешка' })
      }
    } catch { onMessage({ type: 'error', text: 'Грешка при свързване' }) }
    finally { setAssigning(false) }
  }

  const handleSendVerification = async () => {
    setSendingVerification(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/leads/${lead.id}/send-verification`, {
        method: 'POST', credentials: 'include' as RequestCredentials,})
      const data = await res.json()
      if (res.ok) {
        onMessage({ type: 'success', text: data.message || 'Верификацията е изпратена' })
        onLeadUpdate({ ...lead, verification_status: 'pending' })
      } else {
        onMessage({ type: 'error', text: data.detail || 'Грешка' })
      }
    } catch { onMessage({ type: 'error', text: 'Грешка при свързване' }) }
    finally { setSendingVerification(false) }
  }

  const assignedClinic = clinics.find(c => c.id === lead.assigned_clinic_id)
  const vStatus = lead.verification_status ? VERIFICATION_STATUS[lead.verification_status] : null

  return (
    <div className="bg-slate-50 rounded-xl p-5 space-y-4" data-testid="clinic-verification-panel">
      <h3 className="font-medium text-slate-900 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-slate-400" />
        Клиника & Верификация
      </h3>

      {/* Assign to Clinic */}
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Насочи към клиника</label>
        <div className="flex gap-2">
          <select
            value={selectedClinicId}
            onChange={e => setSelectedClinicId(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            data-testid="assign-clinic-select"
          >
            <option value="">Изберете клиника</option>
            {clinics.map(c => (
              <option key={c.id} value={c.id}>{c.clinic_name} — {c.city}</option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={assigning || !selectedClinicId}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            data-testid="assign-clinic-btn"
          >
            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
            Насочи
          </button>
        </div>
        {assignedClinic && (
          <p className="text-xs text-sky-600 mt-1.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Насочен към: {assignedClinic.clinic_name}
          </p>
        )}
      </div>

      {/* Verification Status & Send */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">Верификация:</span>
          {vStatus ? (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${vStatus.color}`} data-testid="verification-badge">
              <vStatus.icon className="w-3 h-3" />
              {vStatus.label}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Не е изпратена</span>
          )}
        </div>
        <button
          onClick={handleSendVerification}
          disabled={sendingVerification || !lead.assigned_clinic_id || !lead.email}
          title={!lead.assigned_clinic_id ? 'Лийдът трябва да е насочен към клиника' : !lead.email ? 'Лийдът няма имейл' : 'Изпрати верификация'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="send-verification-btn"
        >
          {sendingVerification ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Изпрати верификация
        </button>
      </div>
    </div>
  )
}

function AssistedReviewQueueCard({ count }: { count: number | null }) {
  // Loading state — show a neutral skeleton chip so layout doesn't jump.
  if (count === null) {
    return (
      <div
        className="mb-6 rounded-xl border border-violet-100 bg-violet-50/40 p-4 animate-pulse"
        data-testid="assisted-review-card-loading"
      >
        <div className="h-4 w-32 bg-violet-100 rounded mb-2" />
        <div className="h-3 w-60 bg-violet-100/70 rounded" />
      </div>
    )
  }
  const isEmpty = count === 0
  return (
    <Link
      href="/admin/consultation-requests?status=needs_zubite_review"
      className={
        'group mb-6 flex items-start gap-4 rounded-xl border p-5 transition-colors ' +
        (isEmpty
          ? 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30'
          : 'border-violet-200 bg-violet-50/60 hover:bg-violet-50')
      }
      data-testid="assisted-review-card"
      data-empty={isEmpty ? 'true' : 'false'}
    >
      <div
        className={
          'w-10 h-10 rounded-lg grid place-items-center flex-shrink-0 ' +
          (isEmpty ? 'bg-slate-100' : 'bg-violet-100')
        }
      >
        <Sparkles
          className={'w-5 h-5 ' + (isEmpty ? 'text-slate-400' : 'text-violet-600')}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h3
            className={
              'font-medium ' + (isEmpty ? 'text-slate-700' : 'text-violet-900')
            }
          >
            Чакат преглед
          </h3>
          {!isEmpty && (
            <span
              className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-semibold bg-violet-600 text-white"
              data-testid="assisted-review-count"
            >
              {count}
            </span>
          )}
        </div>
        <p
          className={
            'mt-1 text-sm leading-relaxed ' +
            (isEmpty ? 'text-slate-500' : 'text-violet-800/90')
          }
          data-testid="assisted-review-copy"
        >
          {isEmpty
            ? 'Няма заявки, които чакат преглед.'
            : 'Пациенти са поискали помощ от Zubite при избора на клиника.'}
        </p>
      </div>

      <span
        className={
          'hidden sm:inline-flex items-center gap-1 px-3 h-9 rounded-full text-sm font-medium self-center transition-colors ' +
          (isEmpty
            ? 'text-slate-500 group-hover:text-violet-700'
            : 'bg-violet-600 text-white group-hover:bg-violet-700')
        }
        data-testid="assisted-review-cta"
      >
        Виж заявките
        <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  )
}


export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filterBand, setFilterBand] = useState<string>('')
  const [filterCity, setFilterCity] = useState<string>('')
  const [filterTreatment, setFilterTreatment] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', city_slug: '', status: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [resettingAnalytics, setResettingAnalytics] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  // P5 assisted-choice queue counter (read-only; uses existing admin endpoint).
  const [assistedReviewCount, setAssistedReviewCount] = useState<number | null>(null)
  const router = useRouter()
  
  const fetchData = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const headers = {
        'Content-Type': 'application/json'
      }
      
      const params = new URLSearchParams()
      if (filterBand) params.append('band', filterBand)
      if (filterCity) params.append('city_slug', filterCity)
      if (filterTreatment) params.append('treatment_type', filterTreatment)
      
      const [leadsRes, statsRes, assistedRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/leads?${params.toString()}`, { headers, credentials: 'include' as RequestCredentials }),
        fetch(`${API_URL}/api/admin/stats`, { headers, credentials: 'include' as RequestCredentials }),
        fetch(`${API_URL}/api/admin/consultation-requests?status=needs_zubite_review`, { headers, credentials: 'include' as RequestCredentials }),
      ])
      
      if (!leadsRes.ok || !statsRes.ok) {
        if (leadsRes.status === 401 || statsRes.status === 401 || leadsRes.status === 403 || statsRes.status === 403) {
          try { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') } catch { /* noop */ }
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

      // Best-effort: do not block dashboard render on the assisted-choice
      // count; tolerate transient errors / non-200 silently.
      if (assistedRes.ok) {
        try {
          const j = await assistedRes.json()
          const n = Array.isArray(j?.requests) ? j.requests.length : 0
          setAssistedReviewCount(n)
        } catch {
          setAssistedReviewCount(null)
        }
      } else {
        setAssistedReviewCount(null)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router, filterBand, filterCity, filterTreatment])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  const handleLogout = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      await fetch(`${API_URL}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
      })
    } catch { /* noop — cookie may already be gone */ }
    try { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') } catch { /* noop */ }
    router.push('/admin')
  }
  
  const handleExportCSV = async () => {
    const response = await fetch(`${API_URL}/api/admin/leads/export/csv`, {
        credentials: 'include' as RequestCredentials,
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
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/reset-analytics`, {
        method: 'POST', credentials: 'include' as RequestCredentials,})
      
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
    if (!selectedLead) return
    
    setSaving(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm), credentials: 'include' as RequestCredentials,})
      
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
    if (!selectedLead) return
    
    if (!confirm('Сигурен ли си, че искаш да изтриеш този лийд?')) return
    
    setDeleting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/leads/${selectedLead.id}`, {
        method: 'DELETE', credentials: 'include' as RequestCredentials,})
      
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

  const handleBulkDelete = async () => {
    if (!selectedIds.size === 0) return
    
    if (!confirm(`Сигурен ли си, че искаш да изтриеш ${selectedIds.size} лийда?`)) return
    
    setBulkDeleting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      
      // Delete each selected lead
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`${API_URL}/api/admin/leads/${id}`, {
          method: 'DELETE', credentials: 'include' as RequestCredentials,})
      )
      
      await Promise.all(deletePromises)
      
      setMessage({ type: 'success', text: `${selectedIds.size} лийда са изтрити успешно!` })
      setSelectedIds(new Set())
      fetchData()
    } catch {
      setMessage({ type: 'error', text: 'Грешка при изтриване' })
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)))
    }
  }

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
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

  // Extract quiz answers — supports legacy q1-q10 and new MasterQuiz segments
  // a1-a10 (adult), t1-t8 (teen), c1-c8 (child).
  const getQuizAnswers = (lead: Lead) => {
    const answers = lead.answers || {}
    return Object.entries(answers)
      .filter(([key, value]) => {
        if (RESERVED_ANSWER_KEYS.has(key)) return false
        if (typeof value !== 'string') return false
        return /^[qatc]\d{1,2}$/i.test(key)
      })
      .sort((a, b) => parseInt(a[0].slice(1), 10) - parseInt(b[0].slice(1), 10))
  }
  
  const [filterSource, setFilterSource] = useState<string>('')
  const filteredLeads = leads.filter(lead => {
    if (filterSource) {
      const t = lead.latest_lead_source_type || lead.first_lead_source_type
      if (filterSource === 'blog_assisted' && !lead.blog_assisted_conversion) return false
      if (filterSource !== 'blog_assisted' && t !== filterSource) return false
    }
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      lead.name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.phone?.includes(search) ||
      (lead.latest_utm_campaign || '').toLowerCase().includes(search) ||
      (lead.latest_article_slug || '').toLowerCase().includes(search)
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
                href="/admin/clinics"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                data-testid="nav-partner-clinics"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">Партньори</span>
              </Link>
              <Link
                href="/admin/consultation-requests"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                data-testid="nav-consultation-requests"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">Заявки</span>
              </Link>
              <Link
                href="/admin/clinic-applications"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                data-testid="nav-clinic-apps"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">Кандидатури</span>
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

        {/* P5 — Assisted-choice queue counter */}
        <AssistedReviewQueueCard count={assistedReviewCount} />

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

              <select
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sky-500"
                data-testid="filter-source"
              >
                <option value="">Всички източници</option>
                <option value="paid">Paid</option>
                <option value="organic_search">Organic search</option>
                <option value="organic_social">Organic social</option>
                <option value="referral">Referral</option>
                <option value="direct">Direct</option>
                <option value="blog">Blog landing</option>
                <option value="internal_content">Internal content</option>
                <option value="blog_assisted">Blog-assisted</option>
                <option value="unknown">Unknown</option>
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
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Изтрий ({selectedIds.size})
                </button>
              )}
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
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredLeads.length > 0 && selectedIds.size === filteredLeads.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Лийд</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Контакт</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Град</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Резултат</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Източник</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Кампания</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Верифик.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      Няма намерени лийдове
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => router.push(`/admin/leads/${lead.id}`)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedIds.has(lead.id) ? 'bg-sky-50' : ''}`}
                    >
                      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => {}}
                          onClick={(e) => toggleSelectLead(lead.id, e)}
                          className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                        />
                      </td>
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
                                {/* Call status indicator */}
                                {lead.call_status && lead.call_status !== 'idle' && (
                                  <span className={`ml-2 w-2 h-2 rounded-full ${
                                    lead.call_status === 'completed' ? 'bg-emerald-500' :
                                    lead.call_status === 'calling' ? 'bg-amber-500 animate-pulse' :
                                    lead.call_status === 'no_answer' ? 'bg-orange-500' :
                                    lead.call_status === 'failed' ? 'bg-red-500' : 'bg-slate-400'
                                  }`} title={
                                    lead.call_status === 'completed' ? 'Обаждане завършено' :
                                    lead.call_status === 'calling' ? 'Обаждане в ход' :
                                    lead.call_status === 'no_answer' ? 'Без отговор' :
                                    lead.call_status === 'failed' ? 'Неуспешно обаждане' : ''
                                  } />
                                )}
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
                        {(() => {
                          const t = lead.latest_lead_source_type || lead.first_lead_source_type
                          if (!t) return <span className="text-slate-300 text-xs">—</span>
                          const colors: Record<string, string> = {
                            paid: 'bg-purple-100 text-purple-700',
                            organic_search: 'bg-emerald-100 text-emerald-700',
                            organic_social: 'bg-pink-100 text-pink-700',
                            referral: 'bg-amber-100 text-amber-700',
                            direct: 'bg-slate-100 text-slate-700',
                            blog: 'bg-sky-100 text-sky-700',
                            internal_content: 'bg-indigo-100 text-indigo-700',
                            unknown: 'bg-slate-100 text-slate-500',
                          }
                          return (
                            <div className="flex flex-col gap-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium w-fit ${colors[t] || colors.unknown}`}>
                                {t}
                              </span>
                              {lead.blog_assisted_conversion && (
                                <span className="text-[10px] text-sky-600">📄 blog-assist</span>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-4 max-w-[180px]">
                        {lead.latest_utm_campaign ? (
                          <div className="text-xs">
                            <div className="text-slate-700 truncate" title={lead.latest_utm_campaign}>
                              {lead.latest_utm_campaign}
                            </div>
                            {lead.latest_utm_adset && (
                              <div className="text-slate-400 truncate" title={lead.latest_utm_adset}>
                                {lead.latest_utm_adset}
                              </div>
                            )}
                          </div>
                        ) : lead.latest_article_slug ? (
                          <div className="text-xs text-sky-600 truncate" title={lead.latest_article_slug}>
                            /blog/{lead.latest_article_slug}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {lead.verification_status === 'verified' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Да
                          </span>
                        ) : lead.verification_status === 'flagged' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                            <AlertTriangle className="w-3 h-3" /> Не
                          </span>
                        ) : lead.verification_status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                            <Clock className="w-3 h-3" /> ...
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
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

                    {/* AI Call Panel */}
                    <AICallPanel
                      leadId={selectedLead.id}
                      leadName={selectedLead.name || 'Пациент'}
                      leadPhone={selectedLead.phone}
                      callData={{
                        call_status: selectedLead.call_status as 'idle' | 'calling' | 'completed' | 'failed' | 'no_answer',
                        call_attempts: selectedLead.call_attempts,
                        last_call_at: selectedLead.last_call_at,
                        last_call_duration_seconds: selectedLead.last_call_duration_seconds,
                        answered_call: selectedLead.answered_call,
                        interested_in_treatment: selectedLead.interested_in_treatment,
                        treatment_interest: selectedLead.treatment_interest,
                        treatment_timeline: selectedLead.treatment_timeline,
                        permission_to_share: selectedLead.permission_to_share,
                        call_summary: selectedLead.call_summary,
                        call_transcript: selectedLead.call_transcript,
                        call_outcome_json: selectedLead.call_outcome_json as Record<string, boolean | string | null> | undefined,
                        call_error_message: selectedLead.call_error_message,
                      }}
                      onCallInitiated={() => {
                        setMessage({ type: 'success', text: 'Обаждането е инициирано!' })
                      }}
                      onRefresh={async () => {
                        // Refresh lead data
                        const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
                        const response = await fetch(`${API_URL}/api/admin/leads`, {
        credentials: 'include' as RequestCredentials,
      })
                        if (response.ok) {
                          const data = await response.json()
                          const updatedLead = data.find((l: Lead) => l.id === selectedLead.id)
                          if (updatedLead) {
                            setSelectedLead(updatedLead)
                            setLeads(data)
                          }
                        }
                      }}
                    />

                    {/* Clinic Assignment & Verification Panel */}
                    <ClinicVerificationPanel
                      lead={selectedLead}
                      onMessage={setMessage}
                      onLeadUpdate={(updated) => {
                        setSelectedLead(updated)
                        setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
                      }}
                    />

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
                                      Въпрос {key.replace(/^[qatc]/i, '')}
                                    </p>
                                    <p className="text-sm text-slate-900">{questionText}</p>
                                  </div>
                                  <div className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                                    answerValue === 'yes' || answerValue === 'crowded' ? 'bg-red-100 text-red-700' :
                                    answerValue === 'sometimes' || answerValue === 'mild' || answerValue === 'past' ? 'bg-amber-100 text-amber-700' :
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
