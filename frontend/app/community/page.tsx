import { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircleQuestion, ShieldCheck, Users } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TopicChipRow } from '@/components/community/TopicChipRow'
import { QuestionFeed } from '@/components/community/QuestionFeed'
import { listTopics, listQuestions } from '@/lib/community'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Общност | Въпроси и отговори за дентално здраве | Zubite.bg',
  description:
    'Задайте въпрос за зъбите си и получете отговор от други пациенти и от проверени партньорски клиники. Независимо, модерирано и без реклами.',
  alternates: { canonical: 'https://zubite.bg/community' },
}

export default async function CommunityHome() {
  const [topics, recent] = await Promise.all([
    listTopics(),
    listQuestions({ sort: 'new', limit: 12 }),
  ])

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Hero */}
        <section className="mb-10">
          <h1 className="text-3xl font-bold text-[#0a0a0a] sm:text-4xl">Общност</h1>
          <p className="mt-2 max-w-2xl text-[#525252]">
            Задайте въпрос за зъбите си и получете отговор от други пациенти и от
            проверени партньорски клиники. Независимо и модерирано.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/ask" className="taste-button taste-button-accent">
              <MessageCircleQuestion className="h-4 w-4" />
              Задай въпрос
            </Link>
            <span className="inline-flex items-center gap-1.5 text-sm text-[#525252]">
              <ShieldCheck className="h-4 w-4 text-[#007956]" /> Отговори от проверени клиники
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-[#525252]">
              <Users className="h-4 w-4 text-[#007956]" /> Опит от други пациенти
            </span>
          </div>
        </section>

        {/* Topics */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-[#0a0a0a]">Теми</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <Link
                key={t.slug}
                href={`/community/${t.slug}`}
                className="group rounded-2xl border border-[#e5e5e5] bg-white p-5 transition hover:border-[#007956] hover:shadow-[0_14px_30px_-12px_rgba(15,15,15,0.18)]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-[#0a0a0a]">{t.label}</h3>
                  <span className="rounded-full bg-[#f5f4f2] px-2 py-0.5 text-xs text-[#525252]">
                    {t.question_count}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#525252]">{t.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Feed */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#0a0a0a]">Скорошни въпроси</h2>
          <TopicChipRow topics={topics} />
          <QuestionFeed initial={recent} />
        </section>
      </main>
      <Footer />
    </>
  )
}
