'use client'

// Interactive answers section for a community question page.
// Split out from the (server-rendered, SEO-facing) page shell because
// upvote state, "already answered" gating, and the peer-answer form all
// depend on the viewer's patient session — which the server-side fetch
// can't see (it doesn't forward the browser's cookie). We render the
// SSR-anonymous snapshot first, then re-fetch personalized state on mount.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Users, ThumbsUp, Loader2, Flag, Send } from 'lucide-react'
import { OtpLoginModal } from '@/components/OtpLoginModal'
import { getMe, type PatientMe } from '@/lib/patientAuth'
import {
  getQuestion, createPeerAnswer, upvoteAnswer, reportAnswer,
  type QuestionDetail, type Answer,
} from '@/lib/community'

function AnswerCard({
  answer, tone, onUpvote, onReport,
}: {
  answer: Answer
  tone: 'expert' | 'peer'
  onUpvote: (id: string) => void
  onReport: (id: string) => void
}) {
  const isExpert = tone === 'expert'
  return (
    <div
      className={
        isExpert
          ? 'rounded-2xl border border-teal-200 bg-teal-50/40 p-5'
          : 'rounded-2xl border border-slate-200 bg-white p-5'
      }
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        {isExpert ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-800">
            <ShieldCheck className="h-4 w-4" /> {answer.author_display}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{answer.author_display}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">личен опит</span>
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-slate-700">{answer.body}</p>
      <div className="mt-3 flex items-center gap-4 text-sm">
        <button
          onClick={() => onUpvote(answer.id)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition ${
            answer.has_upvoted
              ? 'bg-teal-100 text-teal-800'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" /> Това ми помогна{answer.upvotes > 0 ? ` (${answer.upvotes})` : ''}
        </button>
        <button
          onClick={() => onReport(answer.id)}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <Flag className="h-3.5 w-3.5" /> Докладвай
        </button>
      </div>
    </div>
  )
}

export function QuestionThread({
  slug, initialQuestion,
}: { slug: string; initialQuestion: QuestionDetail }) {
  const [question, setQuestion] = useState<QuestionDetail>(initialQuestion)
  const [patient, setPatient] = useState<PatientMe | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [pendingAction, setPendingAction] = useState<null | 'answer' | 'upvote'>(null)
  const [pendingAnswerId, setPendingAnswerId] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Re-fetch personalized state (has_upvoted / can_answer) once mounted.
  useEffect(() => {
    getQuestion(slug).then((q) => { if (q) setQuestion(q) }).catch(() => {})
    getMe().then(setPatient).catch(() => setPatient(null))
  }, [slug])

  const requireLogin = (action: 'answer' | 'upvote', answerId?: string) => {
    setPendingAction(action)
    setPendingAnswerId(answerId ?? null)
    setShowLogin(true)
  }

  // performUpvote/performSubmitAnswer assume the caller already knows the
  // patient is logged in — the auth GATE lives only in doUpvote/submitAnswer
  // below. onLoggedIn calls these directly with the freshly-logged-in
  // patient's identity, since `patient` state hasn't re-rendered yet at
  // that point (setPatient is async) and re-checking it would just bounce
  // straight back into requireLogin.
  const performUpvote = async (answerId: string) => {
    try {
      const res = await upvoteAnswer(answerId)
      setQuestion((q) => ({
        ...q,
        answers: q.answers.map((a) =>
          a.id === answerId
            ? { ...a, has_upvoted: res.upvoted, upvotes: a.upvotes + (res.upvoted ? 1 : -1) }
            : a,
        ),
      }))
    } catch { /* transient — the button simply doesn't update */ }
  }

  const performSubmitAnswer = async () => {
    if (draft.trim().length < 10) {
      setError('Отговорът трябва да е поне 10 символа.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await createPeerAnswer(question.id, draft.trim())
      const fresh = await getQuestion(slug)
      if (fresh) setQuestion(fresh)
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка')
    } finally {
      setSubmitting(false)
    }
  }

  const doUpvote = (answerId: string) => {
    if (!patient) return requireLogin('upvote', answerId)
    performUpvote(answerId)
  }

  const doReport = async (answerId: string) => {
    try {
      await reportAnswer(answerId, 'Докладвано от читател')
    } catch { /* silent — best-effort */ }
  }

  const submitAnswer = () => {
    if (!patient) return requireLogin('answer')
    performSubmitAnswer()
  }

  const onLoggedIn = (me: PatientMe) => {
    setPatient(me)
    setShowLogin(false)
    if (pendingAction === 'upvote' && pendingAnswerId) performUpvote(pendingAnswerId)
    if (pendingAction === 'answer') performSubmitAnswer()
    setPendingAction(null)
    setPendingAnswerId(null)
  }

  const experts = question.answers.filter((a) => a.is_expert)
  const peers = question.answers.filter((a) => !a.is_expert)

  return (
    <>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {question.answer_count > 0 ? `Отговори (${question.answer_count})` : 'Отговори'}
        </h2>

        {question.answers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-500">
              Все още няма отговори. Проверените клиники и други пациенти скоро ще могат да отговорят.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {experts.length > 0 && (
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700">
                  <ShieldCheck className="h-4 w-4" /> Експертни отговори
                </div>
                <div className="space-y-3">
                  {experts.map((a) => (
                    <AnswerCard key={a.id} answer={a} tone="expert" onUpvote={doUpvote} onReport={doReport} />
                  ))}
                </div>
              </div>
            )}
            {peers.length > 0 && (
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <Users className="h-4 w-4" /> От общността
                </div>
                <div className="space-y-3">
                  {peers.map((a) => (
                    <AnswerCard key={a.id} answer={a} tone="peer" onUpvote={doUpvote} onReport={doReport} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Peer-answer form */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          {question.can_answer || !patient ? (
            <>
              <h3 className="mb-2 font-medium text-slate-900">Споделете вашия опит</h3>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={3000}
                placeholder={patient ? 'Напишете отговор…' : 'Влезте, за да отговорите…'}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              <button
                onClick={submitAnswer}
                disabled={submitting}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {patient ? 'Изпрати отговор' : 'Вход и отговор'}
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500">Вече отговорихте на този въпрос. Благодарим!</p>
          )}
        </div>
      </section>

      <OtpLoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        reason={pendingAction === 'upvote' ? 'за да гласувате' : 'за да отговорите'}
        onSuccess={onLoggedIn}
      />
    </>
  )
}
