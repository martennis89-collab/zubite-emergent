'use client'

// Interactive question + answers section for a community question page.
// Split out from the (server-rendered, SEO-facing) page shell because
// upvote state, "already answered" gating, and the peer-answer form all
// depend on the viewer's patient session — which the server-side fetch
// can't see (it doesn't forward the browser's cookie). We render the
// SSR-anonymous snapshot first, then re-fetch personalized state on mount.
//
// The question header itself (title/body/photos/topic pill) lives here
// too, not in the page shell, so it can share this same personalized
// `question` state for its own upvote control — one client island, one
// source of truth, instead of two separate mechanisms solving the same
// "SSR can't see the cookie" problem.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Users, ThumbsUp, Loader2, Flag, Send, Bell, BellRing } from 'lucide-react'
import { OtpLoginModal } from '@/components/OtpLoginModal'
import { getMe, type PatientMe } from '@/lib/patientAuth'
import {
  getQuestion, createPeerAnswer, upvoteAnswer, upvoteQuestion, reportAnswer,
  toggleFollowQuestion, questionPhotoUrl, type QuestionDetail, type Answer,
} from '@/lib/community'
import { timeAgo, initial } from '@/lib/communityDisplay'
import { enablePushNotifications, pushSupported } from '@/lib/push'

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
          ? 'rounded-2xl border border-[#d0fae5] bg-[#d0fae5]/25 p-5'
          : 'rounded-2xl border border-[#e5e5e5] bg-white p-5'
      }
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              isExpert ? 'bg-[#007956] text-white' : 'bg-[#d0fae5] text-[#007956]'
            }`}
          >
            {initial(answer.author_display)}
          </div>
          {isExpert ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#007956]">
              <ShieldCheck className="h-4 w-4" /> {answer.author_display}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-[#0a0a0a]">{answer.author_display}</span>
              <span className="taste-eyebrow rounded-full bg-[#f5f4f2] px-2 py-0.5 text-[10px] text-[#6b6b6b]">
                личен опит
              </span>
            </span>
          )}
        </div>
        {answer.created_at && <span className="text-xs text-[#6b6b6b]">{timeAgo(answer.created_at)}</span>}
      </div>
      <p className="whitespace-pre-wrap text-[#525252]">{answer.body}</p>
      <div className="mt-3 flex items-center gap-4 text-sm">
        <button
          onClick={() => onUpvote(answer.id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition ${
            answer.has_upvoted
              ? 'bg-[#d0fae5] text-[#007956]'
              : 'text-[#6b6b6b] hover:bg-[#f5f4f2]'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" /> Това ми помогна{answer.upvotes > 0 ? ` (${answer.upvotes})` : ''}
        </button>
        <button
          onClick={() => onReport(answer.id)}
          className="inline-flex items-center gap-1 text-[#6b6b6b] hover:text-[#0a0a0a]"
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
  const [pendingAction, setPendingAction] = useState<null | 'answer' | 'upvote' | 'question-upvote' | 'follow'>(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [pendingAnswerId, setPendingAnswerId] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Re-fetch personalized state (has_upvoted / can_answer) once mounted.
  useEffect(() => {
    getQuestion(slug).then((q) => { if (q) setQuestion(q) }).catch(() => {})
    getMe().then(setPatient).catch(() => setPatient(null))
  }, [slug])

  const requireLogin = (action: 'answer' | 'upvote' | 'question-upvote' | 'follow', answerId?: string) => {
    setPendingAction(action)
    setPendingAnswerId(answerId ?? null)
    setShowLogin(true)
  }

  // performUpvote/performSubmitAnswer/performQuestionUpvote assume the
  // caller already knows the patient is logged in — the auth GATE lives
  // only in doUpvote/submitAnswer/doQuestionUpvote below. onLoggedIn calls
  // these directly with the freshly-logged-in patient's identity, since
  // `patient` state hasn't re-rendered yet at that point (setPatient is
  // async) and re-checking it would just bounce straight back into
  // requireLogin.
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

  const performQuestionUpvote = async () => {
    try {
      const res = await upvoteQuestion(question.id)
      setQuestion((q) => ({
        ...q,
        has_upvoted: res.upvoted,
        upvotes: q.upvotes + (res.upvoted ? 1 : -1),
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

  // Following prompts a browser push permission request right after — a
  // direct continuation of the same click, which is what browsers expect
  // before honoring Notification.requestPermission(). Skipped silently if
  // the browser doesn't support push, push isn't configured server-side, or
  // the patient declines — email notifications keep working either way.
  const performFollow = async () => {
    setFollowBusy(true)
    try {
      const res = await toggleFollowQuestion(question.id)
      setQuestion((q) => ({ ...q, is_following: res.following }))
      if (res.following && pushSupported()) {
        enablePushNotifications().catch(() => {})
      }
    } catch {
      /* transient — the button simply doesn't update */
    } finally {
      setFollowBusy(false)
    }
  }

  const doFollow = () => {
    if (!patient) return requireLogin('follow')
    performFollow()
  }

  const doUpvote = (answerId: string) => {
    if (!patient) return requireLogin('upvote', answerId)
    performUpvote(answerId)
  }

  const doQuestionUpvote = () => {
    if (!patient) return requireLogin('question-upvote')
    performQuestionUpvote()
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
    if (pendingAction === 'question-upvote') performQuestionUpvote()
    if (pendingAction === 'answer') performSubmitAnswer()
    if (pendingAction === 'follow') performFollow()
    setPendingAction(null)
    setPendingAnswerId(null)
  }

  const experts = question.answers.filter((a) => a.is_expert)
  const peers = question.answers.filter((a) => !a.is_expert)

  const loginReason =
    pendingAction === 'follow'
      ? 'за да следите темата'
      : pendingAction === 'upvote' || pendingAction === 'question-upvote'
        ? 'за да гласувате'
        : 'за да отговорите'

  return (
    <>
      {/* Question header */}
      <article className="rounded-2xl border border-[#e5e5e5] bg-white p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="taste-eyebrow rounded-full bg-[#d0fae5] px-2.5 py-1 text-[11px] text-[#007956]">
            {question.topic_label}
          </span>
          <div className="flex items-center gap-1.5 text-sm text-[#525252]">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d0fae5] text-[10px] font-bold text-[#007956]">
              {initial(question.asker_display)}
            </div>
            {question.asker_display}
          </div>
        </div>
        <h1 className="text-xl font-bold text-[#0a0a0a] sm:text-2xl">{question.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-[#525252]">{question.body}</p>

        {question.photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {question.photos.map((p) => (
              <img
                key={p.id}
                src={questionPhotoUrl(question.id, p.id)}
                alt="Снимка към въпроса"
                className="aspect-square w-full rounded-lg object-cover ring-1 ring-[#e5e5e5]"
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={doQuestionUpvote}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
              question.has_upvoted
                ? 'bg-[#d0fae5] text-[#007956]'
                : 'border border-[#e5e5e5] text-[#525252] hover:border-[#0a0a0a]'
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> И аз имам този въпрос{question.upvotes > 0 ? ` (${question.upvotes})` : ''}
          </button>
          <button
            type="button"
            onClick={doFollow}
            disabled={followBusy}
            aria-pressed={question.is_following}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition disabled:opacity-60 ${
              question.is_following
                ? 'bg-[#d0fae5] text-[#007956]'
                : 'border border-[#e5e5e5] text-[#525252] hover:border-[#0a0a0a]'
            }`}
          >
            {question.is_following ? (
              <BellRing className="h-3.5 w-3.5" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            {question.is_following ? 'Следите темата' : 'Следи темата'}
          </button>
          {question.topic_related_path && (
            <Link href={question.topic_related_path} className="text-sm text-[#007956] hover:underline">
              Прочети повече по темата →
            </Link>
          )}
        </div>
      </article>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[#0a0a0a]">
          {question.answer_count > 0 ? `Отговори (${question.answer_count})` : 'Отговори'}
        </h2>

        {question.answers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e5e5e5] p-8 text-center">
            <p className="text-[#525252]">
              Все още няма отговори. Проверените клиники и други пациенти скоро ще могат да отговорят.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {experts.length > 0 && (
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#007956]">
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
                <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#525252]">
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
        <div className="mt-6 rounded-2xl border border-[#e5e5e5] bg-white p-5">
          {question.can_answer || !patient ? (
            <>
              <h3 className="mb-2 font-medium text-[#0a0a0a]">Споделете вашия опит</h3>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={3000}
                placeholder={patient ? 'Напишете отговор…' : 'Влезте, за да отговорите…'}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[#0a0a0a] outline-none focus:border-[#007956] focus:ring-1 focus:ring-[#007956]"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              <button
                onClick={submitAnswer}
                disabled={submitting}
                className="taste-button taste-button-accent mt-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {patient ? 'Изпрати отговор' : 'Вход и отговор'}
              </button>
            </>
          ) : (
            <p className="text-sm text-[#525252]">Вече отговорихте на този въпрос. Благодарим!</p>
          )}
        </div>
      </section>

      <OtpLoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        reason={loginReason}
        onSuccess={onLoggedIn}
      />
    </>
  )
}
