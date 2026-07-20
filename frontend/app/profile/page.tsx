'use client'

// Patient profile shell (Общност).
// Client-guarded: if no session, prompt login via the OTP modal. Once logged
// in, shows the editable profile, "Моите въпроси" (own questions + answers),
// and "Известия" (answer notifications).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, User, LogOut, MessageCircleQuestion, Bell, ShieldCheck,
  Clock, CheckCircle2, XCircle, FileText, CalendarCheck,
} from 'lucide-react'
import { getMe, updateMe, logout, type PatientMe } from '@/lib/patientAuth'
import { getMyLeads, getMyBookings, type MyLead, type MyBooking } from '@/lib/api'
import { OtpLoginModal } from '@/components/OtpLoginModal'
import {
  getMyActivity, getNotifications, markNotificationRead, markAllNotificationsRead,
  type MyQuestion, type MyAnswer, type CommunityNotification,
} from '@/lib/community'
import { TREATMENT_LABELS, BOOKING_STATUS_LABELS, BOOKING_STATUS_TONES } from '@/lib/consultationLabels'

const QUESTION_STATUS_LABEL: Record<MyQuestion['status'], string> = {
  pending: 'В преглед',
  published: 'Публикуван',
  rejected: 'Отхвърлен',
}
const QUESTION_STATUS_ICON: Record<MyQuestion['status'], typeof Clock> = {
  pending: Clock,
  published: CheckCircle2,
  rejected: XCircle,
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'днес'
  if (days === 1) return 'вчера'
  if (days < 30) return `преди ${days} дни`
  return new Date(iso).toLocaleDateString('bg-BG')
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<PatientMe | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [citySlug, setCitySlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const [myQuestions, setMyQuestions] = useState<MyQuestion[]>([])
  const [myAnswers, setMyAnswers] = useState<MyAnswer[]>([])
  const [notifications, setNotifications] = useState<CommunityNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [myLeads, setMyLeads] = useState<MyLead[]>([])
  const [myBookings, setMyBookings] = useState<MyBooking[]>([])

  const loadActivity = () => {
    getMyActivity().then((d) => {
      setMyQuestions(d.questions)
      setMyAnswers(d.answers)
    })
    getNotifications().then((d) => {
      setNotifications(d.items)
      setUnreadCount(d.unread_count)
    })
    getMyLeads().then((d) => setMyLeads(d.items)).catch(() => setMyLeads([]))
    getMyBookings().then((d) => setMyBookings(d.items)).catch(() => setMyBookings([]))
  }

  useEffect(() => {
    getMe()
      .then((me) => {
        setPatient(me)
        if (me) {
          setDisplayName(me.display_name || '')
          setCitySlug(me.city_slug || '')
          loadActivity()
        } else {
          setShowLogin(true)
        }
      })
      .catch(() => setShowLogin(true))
      .finally(() => setLoading(false))
  }, [])

  const onLoggedIn = (me: PatientMe) => {
    setPatient(me)
    setDisplayName(me.display_name || '')
    setCitySlug(me.city_slug || '')
    setShowLogin(false)
    loadActivity()
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSavedMsg('')
    try {
      const updated = await updateMe({
        display_name: displayName.trim(),
        city_slug: citySlug.trim(),
      })
      setPatient(updated)
      setSavedMsg('Запазено')
    } catch {
      setSavedMsg('Грешка при запис')
    } finally {
      setSaving(false)
    }
  }

  const onLogout = async () => {
    await logout()
    setPatient(null)
    setShowLogin(true)
  }

  const onNotificationClick = async (n: CommunityNotification) => {
    if (!n.read) {
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
      markNotificationRead(n.id).catch(() => {})
    }
  }

  const onMarkAllRead = async () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    await markAllNotificationsRead().catch(() => {})
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </main>
    )
  }

  if (!patient) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <User className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-xl font-semibold text-slate-900">Вашият профил</h1>
        <p className="mt-1 text-sm text-slate-500">
          Влезте, за да виждате въпросите и отговорите си в Общността.
        </p>
        <button
          onClick={() => setShowLogin(true)}
          className="mt-5 rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700"
        >
          Вход
        </button>
        <OtpLoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={onLoggedIn} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Профил</h1>
          <p className="mt-1 text-sm text-slate-500">{patient.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Изход
        </button>
      </div>

      <form onSubmit={onSave} className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-slate-900">Данни</h2>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Показвано име</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Как да ви наричаме публично"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <span className="mt-1 block text-xs text-slate-400">
            Незадължително. Ако е празно, показваме „Пациент от [град]“.
          </span>
        </label>

        <label className="mb-5 block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Град</span>
          <input
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
            placeholder="напр. sofia"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Запази
          </button>
          {savedMsg && <span className="text-sm text-slate-500">{savedMsg}</span>}
        </div>
        {typeof patient.reputation === 'number' && patient.reputation > 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Репутация в Общността: <span className="font-medium text-slate-700">{patient.reputation}</span>
          </p>
        )}
      </form>

      {myLeads.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            <h3 className="font-medium text-slate-900">Моите резултати</h3>
          </div>
          <ul className="space-y-2">
            {myLeads.map((l) => (
              <li key={l.id}>
                <Link href={`/results/${l.id}`} className="text-sm font-medium text-slate-800 hover:text-teal-700">
                  {TREATMENT_LABELS[l.treatment_type] || l.treatment_type}
                </Link>
                <div className="mt-0.5 text-xs text-slate-400">
                  {timeAgo(l.created_at)} · {l.full_result_unlocked ? 'Отключен резултат' : 'В очакване на контакт'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {myBookings.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-teal-600" />
            <h3 className="font-medium text-slate-900">Моите резервации</h3>
          </div>
          <ul className="space-y-2">
            {myBookings.map((b) => (
              <li key={`${b.type}-${b.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{b.clinic_name || 'Клиника'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BOOKING_STATUS_TONES[b.status] || 'bg-slate-100 text-slate-600'}`}>
                    {BOOKING_STATUS_LABELS[b.status] || b.status}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {b.appointment_display || (b.appointment_at ? new Date(b.appointment_at).toLocaleString('bg-BG') : timeAgo(b.created_at))}
                  {b.treatment_category ? ` · ${TREATMENT_LABELS[b.treatment_category] || b.treatment_category}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Моите въпроси */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-teal-600" />
            <h3 className="font-medium text-slate-900">Моите въпроси</h3>
          </div>
          {myQuestions.length === 0 && myAnswers.length === 0 ? (
            <p className="text-sm text-slate-500">
              Все още нямате активност в Общността.{' '}
              <Link href="/ask" className="text-teal-600 hover:underline">Задайте въпрос →</Link>
            </p>
          ) : (
            <div className="space-y-4">
              {myQuestions.length > 0 && (
                <ul className="space-y-2">
                  {myQuestions.map((q) => {
                    const Icon = QUESTION_STATUS_ICON[q.status]
                    return (
                      <li key={q.id}>
                        {q.status === 'published' ? (
                          <Link href={`/community/v/${q.slug}`} className="text-sm font-medium text-slate-800 hover:text-teal-700">
                            {q.title}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium text-slate-800">{q.title}</span>
                        )}
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                          <Icon className="h-3 w-3" /> {QUESTION_STATUS_LABEL[q.status]}
                          {q.status === 'published' && ` · ${q.answer_count} отговора`}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {myAnswers.length > 0 && (
                <ul className="space-y-2 border-t border-slate-100 pt-3">
                  {myAnswers.map((a) => (
                    <li key={a.id} className="text-sm">
                      <span className="text-slate-500">Отговорихте на: </span>
                      {a.question_slug ? (
                        <Link href={`/community/v/${a.question_slug}`} className="font-medium text-slate-800 hover:text-teal-700">
                          {a.question_title}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-800">{a.question_title}</span>
                      )}
                      {a.upvotes > 0 && (
                        <span className="ml-1.5 text-xs text-teal-600">+{a.upvotes} полезно</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Известия */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-teal-600" />
              <h3 className="font-medium text-slate-900">Известия</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-xs text-slate-400 hover:text-slate-600">
                Отбележи всички
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">Ще ви уведомим, когато някой отговори.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/community/v/${n.question_slug}`}
                    onClick={() => onNotificationClick(n)}
                    className={`block rounded-lg px-2 py-1.5 -mx-2 text-sm transition ${
                      n.read ? 'text-slate-500' : 'bg-teal-50/60 font-medium text-slate-800'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {n.is_expert && <ShieldCheck className="h-3 w-3 text-teal-600" />}
                      {n.answerer_display} отговори на „{n.question_title}“
                    </span>
                    <div className="text-xs text-slate-400">{timeAgo(n.created_at)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
