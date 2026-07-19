import { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircleQuestion, ArrowRight, ShieldCheck, Users } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { listTopics, listQuestions } from '@/lib/community'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Общност | Въпроси и отговори за дентално здраве | Zubite.bg',
  description:
    'Задайте въпрос за зъбите си и получете отговор от други пациенти и от проверени партньорски клиники. Независимо, модерирано и без реклами.',
  alternates: { canonical: 'https://zubite.bg/community' },
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  const days = Math.floor((Date.now() - d) / 86400000)
  if (days <= 0) return 'днес'
  if (days === 1) return 'вчера'
  if (days < 30) return `преди ${days} дни`
  return new Date(iso).toLocaleDateString('bg-BG')
}

export default async function CommunityHome() {
  const [topics, recent] = await Promise.all([
    listTopics(),
    listQuestions({ sort: 'new', limit: 8 }),
  ])

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Hero */}
        <section className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Общност</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Задайте въпрос за зъбите си и получете отговор от други пациенти и от
            проверени партньорски клиники. Независимо и модерирано.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/ask"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700"
            >
              <MessageCircleQuestion className="h-4 w-4" />
              Задай въпрос
            </Link>
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 text-teal-600" /> Отговори от проверени клиники
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
              <Users className="h-4 w-4 text-teal-600" /> Опит от други пациенти
            </span>
          </div>
        </section>

        {/* Topics */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Теми</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <Link
                key={t.slug}
                href={`/community/${t.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">{t.label}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {t.question_count}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{t.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent questions */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Скорошни въпроси</h2>
          {recent.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-500">Все още няма публикувани въпроси.</p>
              <Link href="/ask" className="mt-2 inline-block font-medium text-teal-600 hover:underline">
                Бъди първият, който пита →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recent.items.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/community/v/${q.slug}`}
                    className="group block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-700">
                        {q.topic_label}
                      </span>
                      <span>{timeAgo(q.published_at || q.created_at)}</span>
                    </div>
                    <h3 className="font-medium text-slate-900 group-hover:text-teal-700">
                      {q.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
                      <span>{q.asker_display}</span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircleQuestion className="h-3.5 w-3.5" />
                        {q.answer_count} отговора
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
