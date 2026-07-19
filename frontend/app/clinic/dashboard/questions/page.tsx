'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClinicShell } from '@/components/ClinicShell'
import { Loader2, MessageCircleQuestion, ShieldCheck, Inbox, Send } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface QueueQuestion {
  id: string
  slug: string
  topic: string
  topic_label: string | null
  title: string
  body: string
  asker_display: string | null
  answer_count: number
  created_at: string | null
}

export default function ClinicQuestionsPage() {
  const [items, setItems] = useState<QueueQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/clinic/community/questions`, {
        credentials: 'include' as RequestCredentials,
      })
      if (r.ok) {
        const j = await r.json()
        setItems(j.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const submit = async (id: string) => {
    const body = (drafts[id] || '').trim()
    if (body.length < 10) {
      setError('Отговорът трябва да е поне 10 символа.')
      return
    }
    setError('')
    setSendingId(id)
    try {
      const r = await fetch(`${API_URL}/api/clinic/community/questions/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify({ body }),
      })
      if (r.ok) {
        setDoneIds((s) => new Set(s).add(id))
      } else {
        const d = await r.json().catch(() => ({}))
        setError(typeof d?.detail === 'string' ? d.detail : 'Неуспешно изпращане')
      }
    } finally {
      setSendingId(null)
    }
  }

  return (
    <ClinicShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Въпроси за отговор</h1>
          <p className="mt-1 text-sm text-slate-500">
            Публикувани въпроси от Общността, съответстващи на вашите лечения. Отговорите ви се
            публикуват незабавно с бадж „Проверена клиника“ — образователно съдържание, без линкове
            или контакти.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
            <Inbox className="mx-auto mb-2 h-8 w-8" /> Няма нови въпроси във вашите теми в момента.
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((q) => (
              <li key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-700">{q.topic_label}</span>
                  <span>{q.asker_display}</span>
                </div>
                <h3 className="font-semibold text-slate-900">{q.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{q.body}</p>

                {doneIds.has(q.id) ? (
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Отговорът е публикуван
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={drafts[q.id] || ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                      rows={3}
                      maxLength={3000}
                      placeholder="Образователен отговор — без линкове или лични данни…"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      onClick={() => submit(q.id)}
                      disabled={sendingId === q.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                    >
                      {sendingId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Публикувай отговор
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </ClinicShell>
  )
}
