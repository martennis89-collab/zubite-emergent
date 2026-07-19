import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MessageCircleQuestion, ArrowLeft } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { listTopics, listQuestions } from '@/lib/community'

export const dynamic = 'force-dynamic'

type Params = { topic: string }

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { topic } = await params
  const topics = await listTopics()
  const t = topics.find((x) => x.slug === topic)
  if (!t) return { title: 'Тема | Общност | Zubite.bg' }
  return {
    title: `${t.label} | Въпроси и отговори | Zubite.bg`,
    description: t.description,
    alternates: { canonical: `https://zubite.bg/community/${topic}` },
  }
}

export default async function TopicFeed({ params }: { params: Promise<Params> }) {
  const { topic } = await params
  const [topics, list] = await Promise.all([
    listTopics(),
    listQuestions({ topic, sort: 'new', limit: 30 }),
  ])
  const t = topics.find((x) => x.slug === topic)
  if (!t) notFound()

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/community"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Всички теми
        </Link>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.label}</h1>
            <p className="mt-1 text-slate-600">{t.description}</p>
            {t.related_path && (
              <Link href={t.related_path} className="mt-2 inline-block text-sm text-teal-600 hover:underline">
                Научи повече по темата →
              </Link>
            )}
          </div>
          <Link
            href="/ask"
            className="shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Задай въпрос
          </Link>
        </div>

        {list.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-500">Все още няма въпроси в тази тема.</p>
            <Link href="/ask" className="mt-2 inline-block font-medium text-teal-600 hover:underline">
              Задай първия въпрос →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.items.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/community/v/${q.slug}`}
                  className="group block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
                >
                  <h3 className="font-medium text-slate-900 group-hover:text-teal-700">{q.title}</h3>
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
      </main>
      <Footer />
    </>
  )
}
