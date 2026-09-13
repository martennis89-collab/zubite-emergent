import { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircleQuestion, ShieldCheck, Users } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TopicChipRow } from '@/components/community/TopicChipRow'
import { QuestionFeed } from '@/components/community/QuestionFeed'
import { ClinicSpotlight } from '@/components/community/ClinicSpotlight'
import { CommunityRecentArticles } from '@/components/community/CommunityRecentArticles'
import { listTopics, listQuestions, getSpotlight, listRecentArticles } from '@/lib/community'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Общност | Въпроси и отговори за дентално здраве | Zubite.bg',
  description:
    'Задай въпрос за зъбите си и получи отговор от други пациенти и от проверени партньорски клиники. Независимо, модерирано и без реклами.',
  alternates: { canonical: 'https://zubite.bg/community' },
}

export default async function CommunityHome() {
  const [topics, recent, spotlight, articles] = await Promise.all([
    listTopics(),
    listQuestions({ sort: 'new', limit: 12 }),
    getSpotlight(),
    listRecentArticles(3),
  ])

  return (
    <>
      <Header />
      <main className="taste-community-page">
      <div className="taste-community-shell grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        {/* Hero */}
        <section className="taste-community-hero">
          <p className="taste-community-kicker">Независима и модерирана общност</p>
          <h1>Въпроси от хора.{' '}<br />Проверени отговори.</h1>
          <p className="taste-community-lede">
            Задай въпрос за зъбите си и получи човешки опит от други пациенти и
            професионални отговори от проверени партньорски клиники.
          </p>
          <div className="taste-community-hero-actions">
            <Link href="/ask" className="taste-button taste-button-accent">
              <MessageCircleQuestion className="h-4 w-4" />
              Задай въпрос
            </Link>
            <span className="taste-community-trust-point">
              <ShieldCheck className="h-4 w-4" /> Проверени профили
            </span>
            <span className="taste-community-trust-point">
              <Users className="h-4 w-4" /> Реален пациентски опит
            </span>
          </div>
        </section>

        {/* Topics */}
        <section className="taste-community-section">
          <div className="taste-community-section-heading">
            <p className="taste-community-kicker">Разгледай по тема</p>
            <h2>Какво те интересува?</h2>
          </div>
          <div className="taste-community-topic-grid grid sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <Link
                key={t.slug}
                href={`/community/${t.slug}`}
                className="taste-community-topic-card group"
              >
                <div className="flex items-center justify-between">
                  <h3>{t.label}</h3>
                  <span className="taste-community-topic-count">
                    {t.question_count}
                  </span>
                </div>
                <p>{t.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Feed */}
        <section className="taste-community-feed-section">
          <div className="taste-community-section-heading">
            <p className="taste-community-kicker">Последни разговори</p>
            <h2>Скорошни въпроси</h2>
          </div>
          <TopicChipRow topics={topics} />
          <QuestionFeed initial={recent} />
        </section>
      </div>

      <aside className="taste-community-aside lg:sticky lg:top-24 lg:self-start">
        <ClinicSpotlight clinic={spotlight} />
      </aside>
      </div>
      <CommunityRecentArticles articles={articles} />
      </main>
      <Footer />
    </>
  )
}
