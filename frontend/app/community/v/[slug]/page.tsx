import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageCircleQuestion, Compass } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { QuestionThread } from '@/components/community/QuestionThread'
import { getQuestion } from '@/lib/community'
import { buildQuestionJsonLd } from '@/lib/seo/communityJsonLd'
import { safeJsonLd } from '@/lib/seo/clinicJsonLd'

export const dynamic = 'force-dynamic'

type Params = { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { slug } = await params
  const q = await getQuestion(slug)
  if (!q) return { title: 'Въпрос | Общност | Zubite.bg' }
  const desc = q.body.length > 155 ? `${q.body.slice(0, 152)}…` : q.body
  return {
    title: `${q.title} | Общност | Zubite.bg`,
    description: desc,
    alternates: { canonical: `https://zubite.bg/community/v/${slug}` },
  }
}

export default async function QuestionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  // Anonymous SSR snapshot — no session cookie travels with this
  // server-side fetch, so upvote/answer personalization is re-fetched
  // client-side by QuestionThread once mounted.
  const q = await getQuestion(slug)
  if (!q) notFound()

  const jsonLd = buildQuestionJsonLd(q)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={`/community/${q.topic}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#6b6b6b] hover:text-[#0a0a0a]"
        >
          <ArrowLeft className="h-4 w-4" /> {q.topic_label}
        </Link>

        <QuestionThread slug={slug} initialQuestion={q} />

        {/* Funnel CTA — every thread routes toward orientation, not just
            back into the community. Ask stays secondary. */}
        <div className="mt-10 rounded-2xl border border-[#e5e5e5] bg-[#f5f4f2] p-6 text-center">
          <p className="font-medium text-[#0a0a0a]">Искате конкретна насока за вашия случай?</p>
          <p className="mt-1 text-sm text-[#525252]">
            Общността дава ориентир от опит на други хора — безплатният анализ на Zubite ви
            свързва с точния следващ стъпка според вашия случай.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/quiz" className="taste-button taste-button-accent">
              <Compass className="h-4 w-4" /> Ориентирай се безплатно
            </Link>
            <Link href="/ask" className="taste-button taste-button-light border border-[#e5e5e5]">
              <MessageCircleQuestion className="h-4 w-4" /> Задай въпрос
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
