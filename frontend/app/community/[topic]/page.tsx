import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TopicChipRow } from '@/components/community/TopicChipRow'
import { QuestionFeed } from '@/components/community/QuestionFeed'
import { ClinicSpotlight } from '@/components/community/ClinicSpotlight'
import { listTopics, listQuestions, getSpotlight } from '@/lib/community'

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
  const [topics, list, spotlight] = await Promise.all([
    listTopics(),
    listQuestions({ topic, sort: 'new', limit: 12 }),
    getSpotlight(),
  ])
  const t = topics.find((x) => x.slug === topic)
  if (!t) notFound()

  return (
    <>
      <Header />
      <main className="taste-community-page taste-community-topic-page">
      <div className="taste-community-shell grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Link
          href="/community"
          className="taste-community-back-link"
        >
          <ArrowLeft className="h-4 w-4" /> Всички теми
        </Link>

        <div className="taste-community-topic-hero flex items-start justify-between gap-6">
          <div>
            <p className="taste-community-kicker">Общност · тема</p>
            <h1>{t.label}</h1>
            <p>{t.description}</p>
            {t.related_path && (
              <Link href={t.related_path} className="taste-community-related-link">
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
      </div>

      <aside className="taste-community-aside lg:sticky lg:top-24 lg:self-start">
        <ClinicSpotlight clinic={spotlight} />
      </aside>
      </div>
      </main>
      <Footer />
    </>
  )
}
