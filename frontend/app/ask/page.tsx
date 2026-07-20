'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, MessageCircleQuestion, AlertTriangle, CheckCircle2, ArrowRight,
  ImagePlus, X,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { OtpLoginModal } from '@/components/OtpLoginModal'
import { getMe, type PatientMe } from '@/lib/patientAuth'
import {
  listTopics, askQuestion, uploadQuestionPhoto,
  type CommunityTopic, type AskResult,
} from '@/lib/community'

const MAX_PHOTOS = 3
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

export default function AskPage() {
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [patient, setPatient] = useState<PatientMe | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  const [topics, setTopics] = useState<CommunityTopic[]>([])
  const [topic, setTopic] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoError, setPhotoError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AskResult | null>(null)
  const [photoWarning, setPhotoWarning] = useState('')

  useEffect(() => {
    listTopics().then(setTopics).catch(() => setTopics([]))
    getMe()
      .then(setPatient)
      .catch(() => setPatient(null))
      .finally(() => setLoadingAuth(false))
  }, [])

  const onPickPhotos = (files: FileList | null) => {
    setPhotoError('')
    const picked = Array.from(files || [])
    const valid = picked.filter((f) => f.type.startsWith('image/') && f.size <= MAX_PHOTO_BYTES)
    if (valid.length < picked.length) {
      setPhotoError('Приемаме само снимки до 8 MB.')
    }
    const combined = [...photos, ...valid].slice(0, MAX_PHOTOS)
    if (photos.length + valid.length > MAX_PHOTOS) {
      setPhotoError(`Максимум ${MAX_PHOTOS} снимки.`)
    }
    setPhotos(combined)
  }

  const removePhoto = (index: number) => {
    setPhotos((list) => list.filter((_, i) => i !== index))
  }

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
      if (photos.length > 0) {
        const outcomes = await Promise.allSettled(
          photos.map((f) => uploadQuestionPhoto(res.id, f)),
        )
        const failed = outcomes.filter((o) => o.status === 'rejected').length
        if (failed > 0) {
          setPhotoWarning(
            failed === photos.length
              ? 'Въпросът е изпратен, но снимките не се качиха.'
              : `Въпросът е изпратен, но ${failed} снимка/и не се качиха.`,
          )
        }
      }
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
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#007956]" />
            <h1 className="text-xl font-semibold text-[#0a0a0a]">Въпросът е изпратен</h1>
            <p className="mt-2 text-[#525252]">{result.message}</p>
            {photoWarning && <p className="mt-2 text-sm text-amber-600">{photoWarning}</p>}
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/community" className="taste-button taste-button-light border border-[#e5e5e5]">
                Към Общността
              </Link>
              <Link href="/profile" className="taste-button taste-button-accent">
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
        <h1 className="text-2xl font-bold text-[#0a0a0a]">Задай въпрос</h1>
        <p className="mt-1 text-[#525252]">
          Опишете въпроса си ясно. Не споделяйте лични данни — телефон или имейл се премахват автоматично.
          Отговарят други пациенти и проверени клиники, след кратка модерация.
        </p>

        {!loadingAuth && !patient && (
          <div className="mt-5 rounded-xl border border-[#d0fae5] bg-[#d0fae5]/40 px-4 py-3 text-sm text-[#007956]">
            За да зададете въпрос, е нужен бърз вход с имейл (без парола).
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#525252]">Тема</span>
            <select
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[#0a0a0a] outline-none focus:border-[#007956] focus:ring-1 focus:ring-[#007956]"
            >
              <option value="" disabled>Изберете тема…</option>
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#525252]">Заглавие</span>
            <input
              required
              minLength={10}
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Кратко и ясно — напр. „Боли ме зъб след пломба, нормално ли е?“"
              className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[#0a0a0a] outline-none focus:border-[#007956] focus:ring-1 focus:ring-[#007956]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#525252]">Описание</span>
            <textarea
              required
              minLength={20}
              maxLength={4000}
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Опишете какво се случва, откога, и какво ви притеснява."
              className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[#0a0a0a] outline-none focus:border-[#007956] focus:ring-1 focus:ring-[#007956]"
            />
            <span className="mt-1 block text-xs text-[#6b6b6b]">{body.length}/4000</span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#525252]">
              Снимки (по избор, до {MAX_PHOTOS}) — захапка, зъби или челюст
            </span>
            <span className="mb-2 block text-xs text-[#6b6b6b]">
              Снимките ще са видими публично, ако въпросът бъде одобрен — точно както текста на въпроса.
            </span>
            {photos.length < MAX_PHOTOS && (
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#e5e5e5] px-3 py-2 text-sm text-[#525252] hover:border-[#007956] hover:text-[#007956]">
                <ImagePlus className="h-4 w-4" />
                Добави снимка
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onPickPhotos(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
            {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}
            {photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((f, i) => (
                  <div key={i} className="relative h-16 w-16">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover ring-1 ring-[#e5e5e5]"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-[#0a0a0a] p-0.5 text-white"
                      aria-label="Премахни снимката"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="taste-button taste-button-accent disabled:opacity-60"
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
