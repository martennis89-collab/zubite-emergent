'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { OtpLoginModal } from '@/components/OtpLoginModal'
import { getMe, type PatientMe } from '@/lib/patientAuth'
import {
  listQuestions, upvoteQuestion, toggleFollowQuestion,
  type QuestionListItem, type QuestionListResponse,
} from '@/lib/community'
import { enablePushNotifications, pushSupported } from '@/lib/push'
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
  const [pendingAction, setPendingAction] = useState<null | 'upvote' | 'follow'>(null)
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
    if (!patient) { setPendingAction('upvote'); setPendingId(questionId); setShowLogin(true); return }
    performUpvote(questionId)
  }

  const performFollow = async (questionId: string) => {
    try {
      const res = await toggleFollowQuestion(questionId)
      setItems((prev) => prev.map((it) =>
        it.id === questionId ? { ...it, is_following: res.following } : it,
      ))
      if (res.following && pushSupported()) {
        enablePushNotifications().catch(() => {})
      }
    } catch {
      /* transient — the button simply doesn't update */
    }
  }

  const handleFollow = (questionId: string) => {
    if (!patient) { setPendingAction('follow'); setPendingId(questionId); setShowLogin(true); return }
    performFollow(questionId)
  }

  const onLoggedIn = (me: PatientMe) => {
    setPatient(me)
    setShowLogin(false)
    if (pendingId && pendingAction === 'upvote') performUpvote(pendingId)
    if (pendingId && pendingAction === 'follow') performFollow(pendingId)
    setPendingAction(null)
    setPendingId(null)
  }

  return (
    <>
      <div className="taste-community-search">
        <Search className="h-4 w-4 shrink-0 text-[#6b6b6b]" />
        <input
          aria-label="Търси във въпросите"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Търси въпрос…"
          className="w-full bg-transparent text-sm text-[#0a0a0a] outline-none placeholder:text-[#6b6b6b]"
        />
        {searching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6b6b6b]" aria-label="Търсене" />}
      </div>

      {items.length === 0 ? (
        <div className="taste-community-empty">
          {query ? 'Няма намерени въпроси.' : 'Все още няма публикувани въпроси.'}
        </div>
      ) : (
        <div className="taste-community-question-list space-y-3">
          {items.map((q) => (
            <QuestionCard key={q.id} q={q} onUpvote={handleUpvote} onFollow={handleFollow} />
          ))}
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
            Зареди още ({items.length} от {total})
          </button>
        </div>
      )}

      <OtpLoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        reason={pendingAction === 'follow' ? 'за да следиш темата' : 'за да гласуваш'}
        onSuccess={onLoggedIn}
      />
    </>
  )
}
