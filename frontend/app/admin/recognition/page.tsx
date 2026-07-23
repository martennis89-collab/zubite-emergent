'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Heart, Loader2, XCircle } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
type Status = 'pending' | 'published' | 'rejected'
type Photo = { id: string; kind: 'before' | 'after' }
type Entry = {
  id: string
  status: Status
  message: string
  display_name_public: string
  treatment_label?: string | null
  clinic_name?: string | null
  consent_public_display: boolean
  photo_layout: string
  photos: Photo[]
  created_at: string
}

const tabs: Array<{ value: Status; label: string }> = [
  { value: 'pending', label: 'В преглед' },
  { value: 'published', label: 'Публикувани' },
  { value: 'rejected', label: 'Отхвърлени' },
]

export default function AdminRecognitionPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('pending')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/recognition?status=${status}`, { credentials: 'include' })
      if (response.status === 401 || response.status === 403) {
        router.replace('/admin')
        return
      }
      if (response.ok) setEntries((await response.json()).entries || [])
    } finally {
      setLoading(false)
    }
  }, [router, status])

  useEffect(() => { void load() }, [load])

  const moderate = async (entryId: string, action: 'approve' | 'reject') => {
    setActing(entryId)
    try {
      const response = await fetch(`${API_URL}/api/admin/recognition/${entryId}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moderation_notes: notes[entryId] || null }),
      })
      if (response.ok) await load()
    } finally {
      setActing(null)
    }
  }

  return <main className="min-h-screen bg-slate-50">
    <AdminHeader pageTitle="Wall of Recognition" />
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-teal-700">Отделено от ревютата</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Пациентски благодарности</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Провери текста, съгласието и снимките. Публикуването не влияе на рейтинг или matching.</p></div><Heart className="h-8 w-8 text-orange-500" /></div>
      <div className="mt-7 flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab.value} onClick={() => setStatus(tab.value)} className={`rounded-full px-4 py-2 text-sm font-medium ${status === tab.value ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{tab.label}</button>)}</div>
      {loading ? <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div> : entries.length === 0 ? <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Няма истории в този статус.</div> : <div className="mt-7 space-y-4">{entries.map((entry) => <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{entry.display_name_public || 'Анонимен пациент'}</p><p className="mt-1 text-xs text-slate-500">{entry.treatment_label || 'Без посочена тема'}{entry.clinic_name ? ` · ${entry.clinic_name}` : ''} · {new Date(entry.created_at).toLocaleDateString('bg-BG')}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{entry.photo_layout}</span></div>
        <blockquote className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">„{entry.message}“</blockquote>
        {entry.photos.length > 0 && <div className="mt-4 grid max-w-xl grid-cols-2 gap-2">{entry.photos.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-xl border border-slate-200"><img src={`${API_URL}/api/admin/recognition/${entry.id}/photos/${photo.id}`} alt={photo.kind === 'before' ? 'Снимка преди' : 'Снимка след'} className="aspect-square w-full object-cover" /><figcaption className="p-2 text-center text-xs text-slate-500">{photo.kind === 'before' ? 'Преди' : 'След'}</figcaption></figure>)}</div>}
        {status === 'pending' && <div className="mt-5 border-t border-slate-200 pt-4"><textarea value={notes[entry.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [entry.id]: event.target.value }))} rows={2} className="w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Бележка за модерацията (по избор)" /><div className="mt-3 flex flex-wrap gap-2"><button disabled={acting === entry.id || !entry.consent_public_display} onClick={() => moderate(entry.id, 'approve')} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Публикувай</button><button disabled={acting === entry.id} onClick={() => moderate(entry.id, 'reject')} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"><XCircle className="h-4 w-4" />Отхвърли</button></div></div>}
      </article>)}</div>}
    </section>
  </main>
}
