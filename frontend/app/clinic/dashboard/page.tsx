'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, LogOut, Building2, Users, Phone, Mail,
  CheckCircle, XCircle, X, Clock, PhoneOff,
  LayoutDashboard, List, UserCircle, Save, MapPin,
  Lock, Globe, FileText, Eye, EyeOff,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ClinicUser {
  id: string
  clinic_name: string
  city: string
  email: string
  phone: string
  status: string
  address?: string | null
  website?: string | null
  company_name?: string | null
  eik?: string | null
  mol?: string | null
  description?: string | null
}

interface ClinicLead {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  treatment_type: string
  clinic_lead_status: string
  created_at: string
  city_slug: string
  band: string
  score_total: number
}

interface DashboardStats {
  total_leads: number
  leads_contacted: number
  leads_pending: number
  leads_no_response: number
}

const TREATMENT_NAMES: Record<string, string> = {
  orthodontics: 'Ортодонтия',
  master_quiz: 'Основен тест',
  implants: 'Импланти',
  invisalign: 'Инвизалайн',
  'cosmetic-dentistry': 'Естетика',
  full_mouth: 'Цяла уста',
}

const LEAD_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Нов', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  contacted: { label: 'Контактуван', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  no_response: { label: 'Без отговор', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
}

function useClinicAuth() {
  const router = useRouter()
  const getToken = () => {
    const token = localStorage.getItem('clinic_token')
    if (!token) { router.push('/clinic'); return null }
    return token
  }
  const getUser = (): ClinicUser | null => {
    try {
      const raw = localStorage.getItem('clinic_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }
  const logout = () => {
    localStorage.removeItem('clinic_token')
    localStorage.removeItem('clinic_user')
    router.push('/clinic')
  }
  return { getToken, getUser, logout, router }
}

// ─── Overview Tab ────────────────────────────────────────
function OverviewTab({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return null
  const cards = [
    { label: 'Общо лийдове', value: stats.total_leads, color: 'bg-slate-50 border-slate-200 text-slate-700' },
    { label: 'Контактувани', value: stats.leads_contacted, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { label: 'Изчакващи', value: stats.leads_pending, color: 'bg-sky-50 border-sky-200 text-sky-700' },
    { label: 'Без отговор', value: stats.leads_no_response, color: 'bg-amber-50 border-amber-200 text-amber-700' },
  ]
  return (
    <div data-testid="overview-tab">
      <h2 className="text-lg font-semibold text-slate-900 mb-6">Преглед</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`p-5 rounded-xl border ${c.color}`}>
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="text-xs mt-1 opacity-70">{c.label}</p>
          </div>
        ))}
      </div>
      {stats.total_leads === 0 && (
        <div className="mt-8 text-center py-12 bg-white rounded-xl border border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Все още нямате получени лийдове.</p>
          <p className="text-sm text-slate-400 mt-1">Когато пациенти бъдат насочени към вас, ще ги видите тук.</p>
        </div>
      )}
    </div>
  )
}

// ─── Leads Tab ───────────────────────────────────────────
function LeadsTab({ leads, onStatusChange }: {
  leads: ClinicLead[]
  onStatusChange: (id: string, status: string) => Promise<void>
}) {
  const [updating, setUpdating] = useState<string | null>(null)

  const handleStatus = async (leadId: string, status: string) => {
    setUpdating(leadId)
    await onStatusChange(leadId, status)
    setUpdating(null)
  }

  return (
    <div data-testid="leads-tab">
      <h2 className="text-lg font-semibold text-slate-900 mb-6">Получени лийдове</h2>
      {leads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Няма лийдове</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="leads-table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Пациент</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Телефон</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Лечение</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Статус</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Дата</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const statusCfg = LEAD_STATUS_CONFIG[lead.clinic_lead_status] || LEAD_STATUS_CONFIG.new
                  return (
                    <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`lead-row-${lead.id}`}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-900">{lead.name || '—'}</p>
                        {lead.email && <p className="text-xs text-slate-400">{lead.email}</p>}
                      </td>
                      <td className="px-5 py-4">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="text-sm text-sky-600 hover:underline">{lead.phone}</a>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">{TREATMENT_NAMES[lead.treatment_type] || lead.treatment_type}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-500">{new Date(lead.created_at).toLocaleDateString('bg-BG')}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {lead.clinic_lead_status !== 'contacted' && (
                            <button
                              onClick={() => handleStatus(lead.id, 'contacted')}
                              disabled={updating === lead.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                              data-testid={`btn-contacted-${lead.id}`}
                            >
                              {updating === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Контактуван
                            </button>
                          )}
                          {lead.clinic_lead_status !== 'no_response' && (
                            <button
                              onClick={() => handleStatus(lead.id, 'no_response')}
                              disabled={updating === lead.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                              data-testid={`btn-no-response-${lead.id}`}
                            >
                              {updating === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PhoneOff className="w-3 h-3" />}
                              Без отговор
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Profile Tab ─────────────────────────────────────────
function ProfileTab({ user, onSave }: {
  user: ClinicUser
  onSave: (data: Record<string, string | undefined>) => Promise<void>
}) {
  const [form, setForm] = useState({
    clinic_name: user.clinic_name,
    phone: user.phone,
    city: user.city,
    address: user.address || '',
    website: user.website || '',
    company_name: user.company_name || '',
    eik: user.eik || '',
    mol: user.mol || '',
    description: user.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const data: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(form)) {
      if (v) data[k] = v
    }
    await onSave(data)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ type: 'err', text: 'Паролите не съвпадат' })
      return
    }
    if (pwForm.newPw.length < 6) {
      setPwMsg({ type: 'err', text: 'Паролата трябва да е поне 6 символа' })
      return
    }
    setPwSaving(true)
    try {
      const token = localStorage.getItem('clinic_token')
      const res = await fetch(`${API_URL}/api/clinic/change-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.newPw }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwMsg({ type: 'ok', text: 'Паролата е променена успешно' })
        setPwForm({ current: '', newPw: '', confirm: '' })
      } else {
        setPwMsg({ type: 'err', text: data.detail || 'Грешка при промяна' })
      }
    } catch {
      setPwMsg({ type: 'err', text: 'Грешка при свързване' })
    } finally {
      setPwSaving(false)
    }
  }

  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5"
  const sectionClass = "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"

  return (
    <div data-testid="profile-tab" className="space-y-8 max-w-2xl">
      {/* Clinic Profile */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-6" data-testid="profile-form">
        <h2 className="text-lg font-semibold text-slate-900">Профил на клиниката</h2>

        {/* Basic Info */}
        <div>
          <p className={sectionClass}><Building2 className="w-3.5 h-3.5" /> Основна информация</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Име на клиниката</label>
              <input type="text" value={form.clinic_name} onChange={e => setForm(f => ({ ...f, clinic_name: e.target.value }))} className={inputClass} data-testid="profile-clinic-name" />
            </div>
            <div>
              <label className={labelClass}>Град</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} data-testid="profile-city" />
            </div>
            <div>
              <label className={labelClass}>Телефон</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} data-testid="profile-phone" />
            </div>
            <div>
              <label className={labelClass}>Имейл</label>
              <input type="email" value={user.email} disabled className={`${inputClass} bg-slate-50 text-slate-400 cursor-not-allowed`} />
            </div>
            <div>
              <label className={labelClass}>Адрес</label>
              <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputClass} placeholder="ул. Витоша 15, София" data-testid="profile-address" />
            </div>
            <div>
              <label className={labelClass}>Уебсайт</label>
              <input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="https://example.com" data-testid="profile-website" />
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div>
          <p className={sectionClass}><FileText className="w-3.5 h-3.5" /> Фирмени данни</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Наименование на фирмата</label>
              <input type="text" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className={inputClass} placeholder="ЕООД / ООД / ЕТ..." data-testid="profile-company-name" />
            </div>
            <div>
              <label className={labelClass}>ЕИК</label>
              <input type="text" value={form.eik} onChange={e => setForm(f => ({ ...f, eik: e.target.value }))} className={inputClass} placeholder="123456789" data-testid="profile-eik" />
            </div>
            <div>
              <label className={labelClass}>МОЛ</label>
              <input type="text" value={form.mol} onChange={e => setForm(f => ({ ...f, mol: e.target.value }))} className={inputClass} placeholder="Д-р Иванов" data-testid="profile-mol" />
            </div>
          </div>
          <div className="mt-5">
            <label className={labelClass}>Описание на клиниката</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} resize-none`} placeholder="Кратко описание на клиниката и специализациите..." data-testid="profile-description" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50" data-testid="profile-save-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Запази промените
          </button>
          {saved && <span className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Запазено</span>}
        </div>
      </form>

      {/* Password Change */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-5" data-testid="password-form">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Промяна на парола</h3>
          <p className="text-sm text-slate-500 mt-1">Препоръчваме да смените временната парола с лична.</p>
        </div>

        {pwMsg && (
          <div className={`p-3 rounded-lg text-sm ${pwMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`} data-testid="pw-message">
            {pwMsg.text}
          </div>
        )}

        <div>
          <label className={labelClass}>Текуща парола</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showCurrent ? 'text' : 'password'}
              required
              value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
              className={`${inputClass} pl-10 pr-10`}
              data-testid="pw-current"
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Нова парола</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={pwForm.newPw}
                onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                className={`${inputClass} pl-10 pr-10`}
                placeholder="Мин. 6 символа"
                data-testid="pw-new"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Потвърди нова парола</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                className={`${inputClass} pl-10`}
                placeholder="Повтори паролата"
                data-testid="pw-confirm"
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={pwSaving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50" data-testid="pw-save-btn">
          {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Промени паролата
        </button>
      </form>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────
export default function ClinicDashboardPage() {
  const { getToken, getUser, logout } = useClinicAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'profile'>('overview')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [leads, setLeads] = useState<ClinicLead[]>([])
  const [user, setUser] = useState<ClinicUser | null>(null)

  const fetchAll = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const headers = { 'Authorization': `Bearer ${token}` }

    try {
      const [dashRes, leadsRes, profileRes] = await Promise.all([
        fetch(`${API_URL}/api/clinic/dashboard`, { headers }),
        fetch(`${API_URL}/api/clinic/leads`, { headers }),
        fetch(`${API_URL}/api/clinic/profile`, { headers }),
      ])

      if (dashRes.status === 401 || leadsRes.status === 401 || profileRes.status === 401) {
        logout()
        return
      }

      if (dashRes.ok) setStats(await dashRes.json())
      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setLeads(data.leads || [])
      }
      if (profileRes.ok) setUser(await profileRes.json())
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleLeadStatusChange = async (leadId: string, status: string) => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/clinic/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, clinic_lead_status: status } : l))
        // Refresh stats
        const statsRes = await fetch(`${API_URL}/api/clinic/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (statsRes.ok) setStats(await statsRes.json())
      }
    } catch (err) {
      console.error('Failed to update lead status', err)
    }
  }

  const handleProfileSave = async (data: Record<string, string | undefined>) => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/clinic/profile`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        setUser(updated)
        localStorage.setItem('clinic_user', JSON.stringify(updated))
      }
    } catch (err) {
      console.error('Failed to save profile', err)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </main>
    )
  }

  const currentUser = user || getUser()
  if (!currentUser) return null

  const tabs = [
    { key: 'overview' as const, label: 'Преглед', icon: LayoutDashboard },
    { key: 'leads' as const, label: 'Лийдове', icon: List },
    { key: 'profile' as const, label: 'Профил', icon: UserCircle },
  ]

  return (
    <main className="min-h-screen bg-slate-50" data-testid="clinic-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600 hidden sm:inline">{currentUser.clinic_name}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              data-testid="clinic-logout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Изход</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-sky-500 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'leads' && <LeadsTab leads={leads} onStatusChange={handleLeadStatusChange} />}
        {activeTab === 'profile' && <ProfileTab user={currentUser} onSave={handleProfileSave} />}
      </div>
    </main>
  )
}
