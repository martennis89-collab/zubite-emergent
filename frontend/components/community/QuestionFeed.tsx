'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { OtpLoginModal } from '@/components/OtpLoginModal'
import { getMe, type PatientMe } from '@/lib/patientAuth'
import { listQuestions, upvoteQuestion, type QuestionListItem, type QuestionListResponse } from '@/lib/community'
import { QuestionCard } from './QuestionCard'

const PAGE_SIZE = 12

export function QuestionFeed({ topic, initial }: { topic?: string; initial: QuestionListResponse }) {
  const [items, setItems] = useState<QuestionListItem[]>(initial.items)
  const [total, setTotal] = useState(initial.total)
  const [offset, setOffset] = useState(initial.items.length)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [patient, setPatient] = useState<PatientMe | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => { getMe().then(setPatient).catch(() => setPatient(null)) }, [])

  const runSearch = useCallback(async (term: string) => {
    setSearching(true)
    try {
      const res = await listQuestions({ topic, q: term || undefined, limit: PAGE_SIZE, offset: 0 })
      setItems(res.items)
      setTotal(res.total)
      setOffset(res.items.length)
    } finally {
      setSearching(false)
    }
  }, [topic])

  // Debounced free-text search — the very first render already has `initial`
  // (server-fetched), so skip the effect on mount and only re-fetch once the
  // query actually changes afterward.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    const t = setTimeout(() => { runSearch(query) }, query ? 350 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await listQuestions({ topic, q: query || undefined, limit: PAGE_SIZE, offset })
      setItems((prev) => [...prev, ...res.items])
      setOffset((o) => o + res.items.length)
      setTotal(res.total)
    } finally {
      setLoadingMore(false)
    }
  }

  const performUpvote = async (questionId: string) => {
    try {
      const res = await upvoteQuestion(questionId)
      setItems((prev) => prev.map((it) =>
        it.id === questionId
          ? { ...it, has_upvoted: res.upvoted, upvotes: it.upvotes + (res.upvoted ? 1 : -1) }
          : it,
      ))
    } catch {
      /* transient failure — button simply doesn't update, no crash */
    }
  }

  const handleUpvote = (questionId: string) => {
    if (!patient) { setPendingId(questionId); setShowLogin(true); return }
    performUpvote(questionId)
  }

  const onLoggedIn = (me: PatientMe) => {
    setPatient(me)
    setShowLogin(false)
    if (pendingId) performUpvote(pendingId)
    setPendingId(null)
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-white px-4 py-2.5 focus-within:border-[#007956]">
        <Search className="h-4 w-4 shrink-0 text-[#6b6b6b]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Търсете въпрос…"
          className="w-full bg-transparent text-sm text-[#0a0a0a] outline-none placeholder:text-[#6b6b6b]"
        />
        {searching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6b6b6b]" />}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e5e5e5] p-8 text-center text-[#525252]">
          {query ? 'Няма намерени въпроси.' : 'Все още няма публикувани въпроси.'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((q) => <QuestionCard key={q.id} q={q} onUpvote={handleUpvote} />)}
        </div>
      )}

      {items.length < total && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="taste-button taste-button-light border border-[#e5e5e5] disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            Заредете още ({items.length} от {total})
          </button>
        </div>
      )}

      <OtpLoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        reason="за да гласувате"
        onSuccess={onLoggedIn}
      />
    </>
  )
}
