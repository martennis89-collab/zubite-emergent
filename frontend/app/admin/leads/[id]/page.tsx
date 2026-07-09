'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Save, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { LeadAttributionPanel } from '@/components/LeadAttributionPanel'
import { AdminHeader } from '@/components/admin/AdminHeader'

// Quiz questions mapping — covers both legacy (q1-q10) and new MasterQuiz
// segments (a1-a10 adult, t1-t8 teen, c1-c8 child). Keep both so old leads
// still render, while new multi-segment leads also show their answers.
const QUESTIONS: Record<string, string> = {
  // Legacy single-track quiz
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
  // Adult segment
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
  // Teen segment
  t1: 'Коя от тези усмивки е най-близка до тази на детето?',
  t2: 'Притеснява ли се детето от усмивката си?',
  t3: 'Изглежда ли захапката му/ѝ неравномерна?',
  t4: 'Дъвче ли повече от едната страна?',
  t5: 'Има ли вече постоянни зъби, които са струпани или нямат място?',
  t6: 'Диша ли често през устата?',
  t7: 'Има ли затруднения с говор или произнасяне на определени звуци?',
  t8: 'Мислиш ли, че ще има нужда от ортодонтско лечение?',
  // Child segment
  c1: 'Как изглеждат зъбите на детето?',
  c2: 'Диша ли често през устата (особено нощем)?',
  c3: 'Хърка ли или има неспокоен сън?',
  c4: 'Смуче ли пръст или използва ли биберон дълго време?',
  c5: 'Изглежда ли челюстта тясна или зъбите нямат достатъчно място?',
  c6: 'Има ли видима разлика в захапката (горни/долни зъби)?',
  c7: 'Държи ли устата си често отворена през деня?',
  c8: 'Мислиш ли, че има нужда от преглед при ортодонт?',
  // Intake questions (Phase 1 Smart Consultation Flow) — appended to
  // MasterQuiz after the diagnostic segment questions, same IDs for
  // adult/teen/child.
  treatment_interest: 'Какво лечение обмисляш в момента?',
  readiness_timeline: 'Кога искаш да направиш следваща стъпка?',
  budget_mindset: 'Как мислиш за бюджета?',
  second_opinion: 'Искаш ли да сравниш повече от едно мнение?',
  has_files: 'Имаш ли снимка, план или оферта от клиника?',
}

// Answer labels — covers both legacy yes/no/sometimes and MasterQuiz visual values
const ANSWER_LABELS: Record<string, string> = {
  yes: 'Да',
  sometimes: 'Понякога',
  unsure: 'Не съм сигурен/а',
  no: 'Не',
  crowded: 'Видимо струпани',
  mild: 'Леко струпани',
  aligned: 'Подредени',
  past: 'Преди да, вече не',
  // treatment_interest
  aligners: 'Алайнери / Invisalign',
  braces: 'Брекети',
  both: 'И двете',
  ask_doctor: 'Искам лекар да ми каже',
  // readiness_timeline
  asap: 'Възможно най-скоро',
  within_1_month: 'До 1 месец',
  in_1_3_months: 'След 1–3 месеца',
  just_researching: 'Само проучвам',
  // budget_mindset
  affordable: 'Търся най-достъпен вариант',
  balanced: 'Искам баланс цена/качество',
  premium_if_justified: 'Готов/а съм за премиум решение, ако има смисъл',
  unknown_pricing: 'Не знам какви са реалните цени',
  // second_opinion
  compare_up_to_3: 'Да, искам да сравня до 3 опции',
  single_clinic: 'Не, искам да избера една клиника',
  zubite_help_first: 'Първо искам Zubite да ми помогне',
  // has_files
  has_opg: 'Да, имам OPG / панорамна снимка',
  has_plan_or_offer: 'Да, имам план или оферта',
  has_smile_photos: 'Да, имам снимки на усмивката/зъбите',
  none: 'Не',
}

// Reserved keys we never want to render as a question row
const RESERVED_ANSWER_KEYS = new Set([
  'quiz_score', 'quiz_band', 'quiz_flags', 'segment', 'form_version',
  'session_id', 'source',
])

// Status labels
const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Нов' },
  { value: 'CONTACTED', label: 'Свързан' },
  { value: 'SCHEDULED', label: 'Записан' },
  { value: 'COMPLETED', label: 'Завършен' },
  { value: 'CANCELLED', label: 'Отказан' }
]

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  city_slug: string
  treatment_type: string
  band: string
  status: string
  created_at: string
  answers?: Record<string, string>
  notes?: string
}

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Editable fields
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    city_slug: '',
    status: '',
    notes: ''
  })
  
  useEffect(() => {
    const fetchLead = async () => {
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
          throw new Error('Failed')
        }
        
        const leads = await response.json()
        const foundLead = leads.find((l: Lead) => l.id === leadId)
        
        if (foundLead) {
          setLead(foundLead)
          setEditForm({
            name: foundLead.name || '',
            phone: foundLead.phone || '',
            email: foundLead.email || '',
            city_slug: foundLead.city_slug || '',
            status: foundLead.status || 'NEW',
            notes: foundLead.notes || ''
          })
        }
      } catch {
        localStorage.removeItem('admin_token')
        router.push('/admin')
      } finally {
        setLoading(false)
      }
    }
    
    fetchLead()
  }, [router, leadId])
  
  const handleSave = async () => {
    if (!lead) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm), credentials: 'include' as RequestCredentials,})
      
      if (!response.ok) throw new Error('Failed to update')
      
      const updatedLead = await response.json()
      setLead(updatedLead)
      setMessage({ type: 'success', text: 'Лийдът е обновен успешно!' })
    } catch {
      setMessage({ type: 'error', text: 'Грешка при запазване' })
    } finally {
      setSaving(false)
    }
  }
  
  const handleDelete = async () => {
    if (!lead) return
    
    if (!confirm('Сигурен ли си, че искаш да изтриеш този лийд?')) return
    
    setDeleting(true)
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/leads/${lead.id}`, {
        method: 'DELETE', credentials: 'include' as RequestCredentials,})
      
      if (!response.ok) throw new Error('Failed to delete')
      
      router.push('/admin/leads')
    } catch {
      setMessage({ type: 'error', text: 'Грешка при изтриване' })
      setDeleting(false)
    }
  }
  
  if (loading) {
    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <AdminHeader
          pageTitle="Детайли на лийд"
          backHref="/admin/leads"
          backLabel="Към лийдовете"
        />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      </main>
    )
  }
  
  if (!lead) {
    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <AdminHeader
          pageTitle="Детайли на лийд"
          backHref="/admin/leads"
          backLabel="Към лийдовете"
        />
        <div className="flex items-center justify-center py-32">
          <p className="text-slate-600">Лийдът не е намерен</p>
        </div>
      </main>
    )
  }
  
  // Extract quiz answers from answers object — support legacy q1..q10 and new
  // MasterQuiz segments a1-a10 (adult), t1-t8 (teen), c1-c8 (child).
  const quizAnswers = lead.answers || {}
  const segment = (quizAnswers.segment as string) || ''
  const segmentLabel: Record<string, string> = { adult: 'Възрастен', teen: 'Тийнейджър', child: 'Дете' }
  const answeredQuestions = Object.entries(quizAnswers)
    .filter(([key, value]) => {
      if (RESERVED_ANSWER_KEYS.has(key)) return false
      if (typeof value !== 'string') return false
      // Match q1, q10, a1, a10, t1, c8 — letter prefix + 1-2 digits
      return /^[qatc]\d{1,2}$/i.test(key)
    })
    .sort((a, b) => {
      const numA = parseInt(a[0].slice(1), 10)
      const numB = parseInt(b[0].slice(1), 10)
      return numA - numB
    })
  
  return (
    <main className="min-h-screen bg-[#FCFAF8]">
      <AdminHeader
        pageTitle="Детайли на лийд"
        backHref="/admin/leads"
        backLabel="Към лийдовете"
      />
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-end gap-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          <span>Изтрий</span>
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Запази</span>
        </button>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Контактна информация</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Име</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Име на клиента"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Телефон</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="+359..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Имейл</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="email@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Град</label>
                  <select
                    value={editForm.city_slug}
                    onChange={e => setEditForm(prev => ({ ...prev, city_slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Избери град</option>
                    <option value="sofia">София</option>
                    <option value="plovdiv">Пловдив</option>
                    <option value="varna">Варна</option>
                    <option value="burgas">Бургас</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Статус</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Бележки</h2>
              <textarea
                value={editForm.notes}
                onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                placeholder="Добави бележки..."
              />
            </div>
            
            {/* Meta Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Информация</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Създаден</span>
                  <span className="text-slate-900">{new Date(lead.created_at).toLocaleString('bg-BG')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Резултат</span>
                  <span className={`font-medium ${
                    quizAnswers.quiz_band === 'early' ? 'text-emerald-600' :
                    quizAnswers.quiz_band === 'developing' || quizAnswers.quiz_band === 'progressing' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {quizAnswers.quiz_band === 'early' ? 'Ранен етап' :
                     quizAnswers.quiz_band === 'developing' || quizAnswers.quiz_band === 'progressing' ? 'Развиващ се' :
                     quizAnswers.quiz_band === 'advanced' ? 'Напреднал' : lead.band}
                  </span>
                </div>
                {quizAnswers.quiz_score !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Точки</span>
                    <span className="text-slate-900">{quizAnswers.quiz_score}</span>
                  </div>
                )}
                {quizAnswers.form_version && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Форма версия</span>
                    <span className="text-slate-900">{quizAnswers.form_version}</span>
                  </div>
                )}
                {segment && (
                  <div className="flex justify-between" data-testid="lead-segment">
                    <span className="text-slate-500">Сегмент</span>
                    <span className="text-slate-900">{segmentLabel[segment] || segment}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Quiz Answers */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-6">Отговори на въпросите</h2>
              
              {answeredQuestions.length > 0 ? (
                <div className="space-y-4">
                  {answeredQuestions.map(([key, value]) => {
                    const questionText = QUESTIONS[key] || key
                    const answerText = ANSWER_LABELS[value] || value
                    
                    return (
                      <div key={key} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-500 mb-1">
                              Въпрос {key.replace('q', '')}
                            </p>
                            <p className="text-slate-900">{questionText}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            value === 'yes' || value === 'crowded' ? 'bg-red-100 text-red-700' :
                            value === 'sometimes' || value === 'mild' || value === 'past' ? 'bg-amber-100 text-amber-700' :
                            value === 'unsure' ? 'bg-slate-200 text-slate-700' :
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
                <p className="text-slate-500 text-center py-8">
                  Няма записани отговори
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Attribution panel — full width below the two-column layout */}
        <div className="mt-6">
          <LeadAttributionPanel lead={lead as unknown as Parameters<typeof LeadAttributionPanel>[0]['lead']} />
        </div>
      </div>
    </main>
  )
}
