'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Inbox } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type Status = 'pending' | 'published' | 'rejected'
type Tab = Status | 'all'

interface Question {
  id: string
  slug: string
  topic: string
  title: string
  body: string
  asker_display?: string | null
  status: Status
  safety_flag?: boolean
  safety_terms?: string[] | null
  report_count?: number
  created_at?: string
  moderation_notes?: string | null
}

interface ListResponse {
  items: Question[]
  counts: { pending: number; published: number; rejected: number; flagged: number }
}

const STATUS_TONE: Record<Status, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
}
const STATUS_LABEL: Record<Status, string> = {
  pending: 'В преглед',
  published: 'Публикуван',
  rejected: 'Отхвърлен',
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'pending', label: 'В преглед' },
  { key: 'published', label: 'Публикувани' },
  { key: 'rejected', label: 'Отхвърлени' },
  { key: 'all', label: 'Всички' },
]

export default function AdminCommunityPage() {
  const router = useRouter()
  const [items, setItems] = useState<Question[]>([])
  const [counts, setCounts] = useState({ pending: 0, published: 0, rejected: 0, flagged: 0 })
  const [tab, setTab] = useState<Tab>('pending')
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (tab !== 'all') qs.set('status', tab)
      const r = await fetch(`${API_URL}/api/admin/community/questions?${qs.toString()}`, {
        credentials: 'include' as RequestCredentials,
      })
      if (r.status === 401 || r.status === 403) {
        router.replace('/admin')
        return
      }
      if (r.ok) {
        const j = (await r.json()) as ListResponse
        setItems(j.items || [])
        setCounts(j.counts)
      }
    } finally {
      setLoading(false)
    }
  }, [tab, router])

  useEffect(() => { load() }, [load])

  const moderate = async (id: string, action: 'approve' | 'reject') => {
    setActingId(id)
    try {
      const r = await fetch(`${API_URL}/api/admin/community/questions/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify({ moderation_notes: notes[id] || null }),
      })
      if (r.ok) await load()
    } finally {
      setActingId(null)
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Общност — модерация</h1>
          <p className="mt-1 text-sm text-slate-500">
            Прегледайте въпросите преди публикуване. Сигнализираните за спешност са маркирани.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
              {t.key === 'pending' && counts.pending > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-xs text-amber-900">{counts.pending}</span>
              )}
            </button>
          ))}
          {counts.flagged > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 ring-1 ring-red-200">
              <AlertTriangle className="h-4 w-4" /> {counts.flagged} спешни в преглед
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
            <Inbox className="mx-auto mb-2 h-8 w-8" /> Няма въпроси в тази категория.
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((q) => (
              <li key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${STATUS_TONE[q.status]}`}>
                    {STATUS_LABEL[q.status]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{q.topic}</span>
                  {q.safety_flag && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 ring-1 ring-red-200">
                      <AlertTriangle className="h-3 w-3" /> спешно
                    </span>
                  )}
                  {(q.report_count ?? 0) > 0 && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                      {q.report_count} сигнала
                    </span>
                  )}
                  <span className="ml-auto text-xs text-slate-400">{q.asker_display}</span>
                </div>

                <h3 className="font-semibold text-slate-900">{q.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{q.body}</p>

                {q.safety_flag && q.safety_terms && q.safety_terms.length > 0 && (
                  <p className="mt-2 text-xs text-red-600">Задействани маркери: {q.safety_terms.join(', ')}</p>
                )}

                {q.status === 'pending' && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={notes[q.id] || ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
                      placeholder="Бележка (по избор)"
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-teal-500"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={actingId === q.id}
                        onClick={() => moderate(q.id, 'approve')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {actingId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Публикувай
                      </button>
                      <button
                        disabled={actingId === q.id}
                        onClick={() => moderate(q.id, 'reject')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" /> Отхвърли
                      </button>
                    </div>
                  </div>
                )}
                {q.moderation_notes && (
                  <p className="mt-2 text-xs text-slate-400">Бележка: {q.moderation_notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
