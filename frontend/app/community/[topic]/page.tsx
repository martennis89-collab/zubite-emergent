import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TopicChipRow } from '@/components/community/TopicChipRow'
import { QuestionFeed } from '@/components/community/QuestionFeed'
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
    listQuestions({ topic, sort: 'new', limit: 12 }),
  ])
  const t = topics.find((x) => x.slug === topic)
  if (!t) notFound()

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/community"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#6b6b6b] hover:text-[#0a0a0a]"
        >
          <ArrowLeft className="h-4 w-4" /> Всички теми
        </Link>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0a0a0a]">{t.label}</h1>
            <p className="mt-1 text-[#525252]">{t.description}</p>
            {t.related_path && (
              <Link href={t.related_path} className="mt-2 inline-block text-sm text-[#007956] hover:underline">
                Научи повече по темата →
              </Link>
            )}
          </div>
          <Link href="/ask" className="taste-button taste-button-accent shrink-0">
            Задай въпрос
          </Link>
        </div>

        <TopicChipRow topics={topics} active={topic} />
        <QuestionFeed topic={topic} initial={list} />
      </main>
      <Footer />
    </>
  )
}
