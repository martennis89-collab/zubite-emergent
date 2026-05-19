'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Star, Clock, CheckCircle2, XCircle, ShieldCheck, Inbox,
  Building2, MessageSquare, Filter,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type Status = 'pending' | 'approved' | 'rejected'
type Tab = 'pending' | 'approved' | 'rejected' | 'all'

interface Review {
  id: string
  clinic_id: string
  clinic_name?: string
  status: Status
  source: string
  submitted_at: string
  rating_overall?: number | null
  patient_name_optional?: string | null
  patient_initials_public?: string | null
  treatment_type?: string | null
  feedback_text?: string | null
  private_note_to_clinic?: string | null
  consent_public_display?: boolean
  consent_contact_if_needed?: boolean
  display_permission?: boolean
  moderated_at?: string | null
  moderation_notes?: string | null
  patient_contact_optional?: string | null
}

interface ListResponse {
  reviews: Review[]
  counts: { pending: number; approved: number; rejected: number }
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'В преглед',
  approved: 'Одобрено',
  rejected: 'Отхвърлено',
}

const STATUS_TONE: Record<Status, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'pending',  label: 'В преглед' },
  { key: 'approved', label: 'Одобрени' },
  { key: 'rejected', label: 'Отхвърлени' },
  { key: 'all',      label: 'Всички' },
]

export default function AdminReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [tab, setTab] = useState<Tab>('pending')
  const [clinicFilter, setClinicFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [notesById, setNotesById] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (tab !== 'all') qs.set('status', tab)
      if (clinicFilter.trim()) qs.set('clinic_id', clinicFilter.trim())
      const r = await fetch(`${API_URL}/api/admin/reviews?${qs.toString()}`, {
        credentials: 'include' as RequestCredentials,
      })
      if (r.status === 401 || r.status === 403) {
        try {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
        } catch { /* noop */ }
        router.replace('/admin')
        return
      }
      if (r.ok) {
        const j = (await r.json()) as ListResponse
        setReviews(j.reviews || [])
        setCounts(j.counts || { pending: 0, approved: 0, rejected: 0 })
      }
    } finally {
      setLoading(false)
    }
  }, [tab, clinicFilter, router])

  useEffect(() => { load() }, [load])

  const moderate = async (id: string, action: 'approve' | 'reject') => {
    setActingId(id)
    try {
      const notes = (notesById[id] || '').trim()
      const r = await fetch(`${API_URL}/api/admin/reviews/${id}/${action}`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notes ? { moderation_notes: notes } : {}),
      })
      if (r.ok) {
        setNotesById((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        await load()
      }
    } finally {
      setActingId(null)
    }
  }

  const tabCount = (k: Tab): number | null => {
    if (k === 'pending')  return counts.pending
    if (k === 'approved') return counts.approved
    if (k === 'rejected') return counts.rejected
    return null
  }

  const filtered = useMemo(() => reviews, [reviews])

  return (
    <div className="min-h-screen bg-[#FCFAF8]">
      <AdminHeader pageTitle="Ревюта" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Преглед на пациентски мнения
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Всяко подадено мнение остава скрито, докато не бъде одобрено тук.
              Само одобрените мнения със съгласие за публикуване ще бъдат
              показани публично (R2).
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            Модерационна опашка
          </div>
        </header>

        {/* Tabs */}
        <div
          className="flex flex-wrap gap-2 border-b border-slate-200"
          data-testid="admin-reviews-tabs"
        >
          {TABS.map((t) => {
            const c = tabCount(t.key)
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ' +
                  (active
                    ? 'border-teal-500 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900')
                }
                data-testid={`admin-reviews-tab-${t.key}`}
                aria-current={active ? 'page' : undefined}
              >
                {t.label}
                {c !== null && (
                  <span
                    className={
                      'inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[11px] rounded-full ring-1 ' +
                      (active
                        ? 'bg-teal-50 text-teal-700 ring-teal-200'
                        : 'bg-slate-100 text-slate-600 ring-slate-200')
                    }
                  >
                    {c}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Clinic filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={clinicFilter}
              onChange={(e) => setClinicFilter(e.target.value)}
              placeholder="Филтър по clinic_id (опционално)"
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white w-72 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300"
              data-testid="admin-reviews-clinic-filter"
            />
          </div>
          {clinicFilter && (
            <button
              type="button"
              onClick={() => setClinicFilter('')}
              className="text-[11px] text-teal-600 hover:text-teal-700"
            >
              Изчисти
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="grid place-items-center py-24" data-testid="admin-reviews-loading">
            <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="bg-white rounded-2xl border border-slate-200 grid place-items-center text-center py-16"
            data-testid="admin-reviews-empty"
          >
            <Inbox className="w-9 h-9 text-slate-300 mb-2" />
            <p className="text-sm text-slate-600">
              {tab === 'pending'
                ? 'Нямате чакащи мнения за преглед.'
                : 'Няма мнения за този филтър.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="admin-reviews-list">
            {filtered.map((r) => {
              const isPending = r.status === 'pending'
              const acting = actingId === r.id
              return (
                <article
                  key={r.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5"
                  data-testid={`admin-review-${r.id}`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className={
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ' +
                        STATUS_TONE[r.status]
                      }
                      data-testid={`admin-review-status-${r.id}`}
                    >
                      {r.status === 'pending'  && <Clock className="w-3 h-3" />}
                      {r.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                      {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {STATUS_LABEL[r.status]}
                    </span>
                    {typeof r.rating_overall === 'number' && r.rating_overall > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-amber-600 text-xs">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-3.5 h-3.5"
                            fill={i < (r.rating_overall || 0) ? 'currentColor' : 'none'}
                          />
                        ))}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {new Date(r.submitted_at).toLocaleString('bg-BG')}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">
                        {r.clinic_name || r.clinic_id}
                      </span>
                    </span>
                  </div>

                  <p
                    className="text-sm text-slate-800 leading-relaxed whitespace-pre-line"
                    data-testid={`admin-review-feedback-${r.id}`}
                  >
                    {r.feedback_text}
                  </p>

                  {(r.patient_name_optional || r.treatment_type || r.patient_contact_optional) && (
                    <p className="mt-2 text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-1">
                      {r.patient_name_optional && <span>{r.patient_name_optional}</span>}
                      {r.treatment_type && <span>· {r.treatment_type}</span>}
                      {r.patient_contact_optional && (
                        <span className="text-slate-400">· контакт: {r.patient_contact_optional}</span>
                      )}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span>Източник: <span className="font-mono text-slate-700">{r.source}</span></span>
                    <span>
                      Съгласие за публикуване:{' '}
                      <span className={r.consent_public_display ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                        {r.consent_public_display ? 'Да' : 'Не'}
                      </span>
                    </span>
                    <span>
                      Съгласие за контакт:{' '}
                      <span className={r.consent_contact_if_needed ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                        {r.consent_contact_if_needed ? 'Да' : 'Не'}
                      </span>
                    </span>
                  </div>

                  {r.private_note_to_clinic && (
                    <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Лично съобщение към клиниката (не се публикува)
                      </p>
                      <p className="text-xs text-slate-700 whitespace-pre-line">
                        {r.private_note_to_clinic}
                      </p>
                    </div>
                  )}

                  {r.moderation_notes && !isPending && (
                    <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Бележки от модерацията
                      </p>
                      <p className="text-xs text-slate-700 whitespace-pre-line">
                        {r.moderation_notes}
                      </p>
                    </div>
                  )}

                  {isPending && (
                    <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
                      <textarea
                        rows={2}
                        value={notesById[r.id] || ''}
                        onChange={(e) =>
                          setNotesById((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        placeholder="Бележки от модерацията (опционално)"
                        className="w-full text-xs rounded-md border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300"
                        data-testid={`admin-review-notes-${r.id}`}
                      />
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => moderate(r.id, 'reject')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium disabled:opacity-50"
                          data-testid={`admin-review-reject-${r.id}`}
                        >
                          {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Отхвърли
                        </button>
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => moderate(r.id, 'approve')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50"
                          data-testid={`admin-review-approve-${r.id}`}
                        >
                          {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Одобри
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
