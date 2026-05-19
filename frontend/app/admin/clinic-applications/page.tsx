'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, FileText, Building2, Users,
  CheckCircle, XCircle, X, Clock, Search, ChevronLeft,
  Globe, MapPin, Phone, Mail, Calendar, Shield, Target,
  MessageSquare, Save, ArrowLeft, KeyRound, Copy, Check,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ClinicApplication {
  id: string
  clinic_name: string
  city: string
  address: string
  website: string | null
  contact_name: string
  phone: string
  email: string
  offers_aligners: boolean
  offers_braces: boolean
  offers_implants: boolean
  treats_adults: boolean
  treats_children: boolean
  years_experience: number | null
  number_of_cases_per_month: string | null
  do_you_use_digital_scans: boolean | null
  what_types_of_patients_are_best_for_you: string | null
  average_response_time: string | null
  status: string
  notes: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Изчаква', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  approved: { label: 'Одобрена', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  rejected: { label: 'Отхвърлена', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  waiting_list: { label: 'Лист на чакащите', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
}

const RESPONSE_TIME_LABELS: Record<string, string> = {
  '<1h': 'Под 1 час',
  '1-6h': '1 – 6 часа',
  '24h': 'До 24 часа',
  '>24h': 'Над 24 часа',
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`} data-testid={`status-badge-${status}`}>
      {cfg.label}
    </span>
  )
}

function ServiceTags({ app }: { app: ClinicApplication }) {
  const tags: string[] = []
  if (app.offers_aligners) tags.push('Алайнери')
  if (app.offers_braces) tags.push('Брекети')
  if (app.offers_implants) tags.push('Импланти')
  if (tags.length === 0) return <span className="text-slate-400 text-sm">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(t => (
        <span key={t} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{t}</span>
      ))}
    </div>
  )
}

// ─── Detail View ─────────────────────────────────────────
function DetailView({ app, onClose, onUpdate }: {
  app: ClinicApplication
  onClose: () => void
  onUpdate: (id: string, data: { status?: string; notes?: string }) => Promise<{ clinic_credentials?: { email: string; temporary_password: string } } | null>
}) {
  const [notes, setNotes] = useState(app.notes || '')
  const [saving, setSaving] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(app.status)
  const [credentials, setCredentials] = useState<{ email: string; temporary_password: string } | null>(null)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenResult, setRegenResult] = useState<{ email: string; password: string; email_sent: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleRegeneratePassword = async () => {
    setRegenLoading(true)
    setRegenResult(null)
    try {
      const res = await fetch(`${API_URL}/api/admin/clinic-applications/${app.id}/regenerate-password`, {
        method: 'POST', credentials: 'include' as RequestCredentials,})
      if (res.ok) {
        const data = await res.json()
        setRegenResult({ email: data.credentials.email, password: data.credentials.password, email_sent: data.email_sent })
      }
    } catch (e) { /* silent */ }
    setRegenLoading(false)
  }

  const copyPassword = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true)
    setCurrentStatus(newStatus)
    const result = await onUpdate(app.id, { status: newStatus })
    if (result?.clinic_credentials) {
      setCredentials(result.clinic_credentials)
    }
    setSaving(false)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    await onUpdate(app.id, { notes })
    setSaving(false)
  }

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ElementType }) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-8 pb-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()} data-testid="application-detail-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900" data-testid="detail-clinic-name">{app.clinic_name}</h2>
            <p className="text-sm text-slate-500">{app.city} &middot; {new Date(app.created_at).toLocaleDateString('bg-BG')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" data-testid="close-detail-btn">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Buttons */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Статус</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  disabled={saving}
                  onClick={() => handleStatusChange(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    currentStatus === key
                      ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-current`
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  data-testid={`status-btn-${key}`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Credentials Alert (shown after approval) */}
          {credentials && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200" data-testid="credentials-alert">
              <p className="text-sm font-semibold text-emerald-800 mb-2">Акаунт за клиника е създаден</p>
              <div className="space-y-1 text-sm text-emerald-700">
                <p>Имейл: <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{credentials.email}</code></p>
                <p>Парола: <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{credentials.temporary_password}</code></p>
              </div>
              <p className="text-xs text-emerald-600 mt-2">Изпратете тези данни на клиниката. Вход: /clinic</p>
            </div>
          )}

          {/* Regenerate Password (only for approved clinics) */}
          {currentStatus === 'approved' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200" data-testid="regenerate-password-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-medium text-slate-700">Парола за клиника</p>
                </div>
                <button
                  onClick={handleRegeneratePassword}
                  disabled={regenLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  data-testid="regenerate-password-btn"
                >
                  {regenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Генерирай нова парола
                </button>
              </div>
              {regenResult && (
                <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg" data-testid="regenerated-credentials">
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>Имейл: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{regenResult.email}</code></p>
                    <div className="flex items-center gap-2">
                      <p>Парола: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{regenResult.password}</code></p>
                      <button onClick={() => copyPassword(regenResult.password)} className="p-1 hover:bg-slate-100 rounded transition-colors" data-testid="copy-password-btn">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs mt-2 text-slate-500">
                    {regenResult.email_sent ? '✓ Имейл с новата парола е изпратен.' : 'Имейлът не беше изпратен — копирайте паролата ръчно.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Clinic Info */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Клиника
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <InfoRow label="Име" value={app.clinic_name} icon={Building2} />
              <InfoRow label="Град" value={app.city} icon={MapPin} />
              <InfoRow label="Адрес" value={app.address} icon={MapPin} />
              <InfoRow label="Уебсайт" value={app.website} icon={Globe} />
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Контакт
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <InfoRow label="Лице" value={app.contact_name} icon={Users} />
              <InfoRow label="Телефон" value={app.phone} icon={Phone} />
              <InfoRow label="Имейл" value={app.email} icon={Mail} />
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Услуги & Пациенти
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Алайнери', value: app.offers_aligners },
                  { label: 'Брекети', value: app.offers_braces },
                  { label: 'Импланти', value: app.offers_implants },
                  { label: 'Възрастни', value: app.treats_adults },
                  { label: 'Деца', value: app.treats_children },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 py-1.5">
                    <span className={`w-2 h-2 rounded-full ${item.value ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-sm ${item.value ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Qualification */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Квалификация
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <InfoRow label="Години опит" value={app.years_experience?.toString()} />
              <InfoRow label="Случаи / месец" value={app.number_of_cases_per_month} />
              <InfoRow label="Дигитални сканове" value={app.do_you_use_digital_scans === true ? 'Да' : app.do_you_use_digital_scans === false ? 'Не' : null} />
            </div>
          </div>

          {/* Positioning & Operations */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Позициониране & Операции
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <InfoRow label="Тип пациенти" value={app.what_types_of_patients_are_best_for_you} />
              <InfoRow label="Време за отговор" value={app.average_response_time ? (RESPONSE_TIME_LABELS[app.average_response_time] || app.average_response_time) : null} icon={Clock} />
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Бележки (само за админ)</h3>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors outline-none resize-none"
              placeholder="Добави бележка..."
              data-testid="admin-notes-input"
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              data-testid="save-notes-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Запази бележка
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────
export default function ClinicApplicationsPage() {
  const [applications, setApplications] = useState<ClinicApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<ClinicApplication | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/clinic-applications`, {
        credentials: 'include' as RequestCredentials,
      })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          try { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') } catch { /* noop */ }
          router.push('/admin')
        }
        return
      }
      const data = await res.json()
      setApplications(data.applications || [])
    } catch (err) {
      console.error('Failed to fetch applications', err)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const handleUpdate = async (id: string, data: { status?: string; notes?: string }): Promise<{ clinic_credentials?: { email: string; temporary_password: string } } | null> => {
    try {
      const res = await fetch(`${API_URL}/api/admin/clinic-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), credentials: 'include' as RequestCredentials,})
      if (res.ok) {
        const result = await res.json()
        if (result.clinic_account_created) {
          setMessage({ type: 'success', text: `Акаунт за клиника е създаден. Парола: ${result.clinic_credentials.temporary_password}` })
        } else {
          setMessage({ type: 'success', text: data.status ? `Статусът е обновен на "${STATUS_CONFIG[data.status]?.label}"` : 'Бележката е запазена' })
        }
        setApplications(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
        if (selectedApp?.id === id) {
          setSelectedApp(prev => prev ? { ...prev, ...data } : prev)
        }
        return result
      }
    } catch {
      setMessage({ type: 'error', text: 'Грешка при обновяване' })
    }
    return null
  }

  const filtered = applications.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      return (
        a.clinic_name.toLowerCase().includes(s) ||
        a.contact_name.toLowerCase().includes(s) ||
        a.city.toLowerCase().includes(s) ||
        a.email.toLowerCase().includes(s)
      )
    }
    return true
  })

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    waiting_list: applications.filter(a => a.status === 'waiting_list').length,
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FCFAF8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8]" data-testid="clinic-applications-page">
      <AdminHeader pageTitle="Кандидатури за клиники" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900" data-testid="page-title">Кандидатури от клиники</h1>
            <p className="text-sm text-slate-500 mt-1">{counts.all} общо &middot; {counts.pending} изчакват</p>
          </div>
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Към лийдовете
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { key: '', label: 'Всички', count: counts.all, color: 'bg-slate-50 border-slate-200 text-slate-700' },
            { key: 'pending', label: 'Изчакват', count: counts.pending, color: 'bg-amber-50 border-amber-200 text-amber-700' },
            { key: 'approved', label: 'Одобрени', count: counts.approved, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { key: 'rejected', label: 'Отхвърлени', count: counts.rejected, color: 'bg-red-50 border-red-200 text-red-700' },
            { key: 'waiting_list', label: 'Чакащи', count: counts.waiting_list, color: 'bg-teal-50 border-teal-200 text-teal-700' },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setFilterStatus(s.key)}
              className={`p-4 rounded-xl border text-left transition-all ${filterStatus === s.key ? `${s.color} ring-2 ring-offset-1 ring-current` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
              data-testid={`filter-${s.key || 'all'}`}
            >
              <p className="text-2xl font-semibold">{s.count}</p>
              <p className="text-xs mt-1">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Търси по име на клиника, контакт, град или имейл..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors outline-none"
            data-testid="search-input"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="applications-table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Клиника</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Град</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Контакт</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Услуги</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Статус</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Дата</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400" data-testid="empty-state">
                      {searchTerm || filterStatus ? 'Няма намерени резултати' : 'Няма кандидатури'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(app => (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      data-testid={`row-${app.id}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 text-sm">{app.clinic_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{app.city}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-800">{app.contact_name}</p>
                        <p className="text-xs text-slate-400">{app.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <ServiceTags app={app} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-500">{new Date(app.created_at).toLocaleDateString('bg-BG')}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedApp && (
        <DetailView
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={handleUpdate}
        />
      )}
    </main>
  )
}
