'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, MessageCircleQuestion, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { OtpLoginModal } from '@/components/OtpLoginModal'
import { getMe, type PatientMe } from '@/lib/patientAuth'
import { listTopics, askQuestion, type CommunityTopic, type AskResult } from '@/lib/community'

export default function AskPage() {
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [patient, setPatient] = useState<PatientMe | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  const [topics, setTopics] = useState<CommunityTopic[]>([])
  const [topic, setTopic] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AskResult | null>(null)

  useEffect(() => {
    listTopics().then(setTopics).catch(() => setTopics([]))
    getMe()
      .then(setPatient)
      .catch(() => setPatient(null))
      .finally(() => setLoadingAuth(false))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!patient) {
      setShowLogin(true)
      return
    }
    setSubmitting(true)
    try {
      const res = await askQuestion({ topic, title, body })
      setResult(res)
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
        setPatient(null)
        setShowLogin(true)
      } else {
        setError(err instanceof Error ? err.message : 'Възникна грешка')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success / emergency state ──
  if (result) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12">
          {result.emergency && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="mb-1 flex items-center gap-2 font-semibold text-red-800">
                <AlertTriangle className="h-5 w-5" /> {result.emergency.title}
              </div>
              <p className="text-red-700">{result.emergency.message}</p>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-teal-600" />
            <h1 className="text-xl font-semibold text-slate-900">Въпросът е изпратен</h1>
            <p className="mt-2 text-slate-600">{result.message}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/community" className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50">
                Към Общността
              </Link>
              <Link href="/profile" className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700">
                Моят профил
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Задай въпрос</h1>
        <p className="mt-1 text-slate-600">
          Опишете въпроса си ясно. Не споделяйте лични данни — телефон или имейл се премахват автоматично.
          Отговарят други пациенти и проверени клиники, след кратка модерация.
        </p>

        {!loadingAuth && !patient && (
          <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            За да зададете въпрос, е нужен бърз вход с имейл (без парола).
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Тема</span>
            <select
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="" disabled>Изберете тема…</option>
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Заглавие</span>
            <input
              required
              minLength={10}
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Кратко и ясно — напр. „Боли ме зъб след пломба, нормално ли е?“"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Описание</span>
            <textarea
              required
              minLength={20}
              maxLength={4000}
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Опишете какво се случва, откога, и какво ви притеснява."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            <span className="mt-1 block text-xs text-slate-400">{body.length}/4000</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircleQuestion className="h-4 w-4" />}
            {patient ? 'Изпрати въпроса' : 'Вход и изпращане'}
          </button>
        </form>
      </main>
      <Footer />

      <OtpLoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        reason="за да зададете въпрос"
        onSuccess={(me) => {
          setPatient(me)
          setShowLogin(false)
        }}
      />
    </>
  )
}
