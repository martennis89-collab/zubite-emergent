import Link from 'next/link'
import { ArrowUpRight, BookOpen, CalendarDays } from 'lucide-react'
import type { CommunityArticle } from '@/lib/community'
import { resolveImageUrl } from '@/lib/imageUrl'

const CATEGORY_LABELS: Record<string, string> = {
  orthodontics: 'Ортодонтия',
  aligners: 'Алайнери',
  braces: 'Брекети',
  implants: 'Импланти',
  cosmetic: 'Естетична стоматология',
  tips: 'Практични съвети',
  news: 'Новини',
}

function articleDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function ArticleMedia({
  article,
  compact = false,
}: {
  article: CommunityArticle
  compact?: boolean
}) {
  if (article.featured_image) {
    return (
      <div className={compact ? 'taste-community-article-thumb' : 'taste-community-article-cover'}>
        <img
          src={resolveImageUrl(article.featured_image)}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div
      className={`${compact ? 'taste-community-article-thumb' : 'taste-community-article-cover'} taste-community-article-placeholder`}
      aria-hidden="true"
    >
      <BookOpen className={compact ? 'h-5 w-5' : 'h-8 w-8'} />
    </div>
  )
}

export function CommunityRecentArticles({ articles }: { articles: CommunityArticle[] }) {
  if (articles.length === 0) return null

  const [featured, ...rest] = articles

  return (
    <section className="taste-community-articles" aria-labelledby="community-articles-heading">
      <div className="taste-community-articles-inner">
        <div className="taste-community-articles-heading">
          <div>
            <h2 id="community-articles-heading">Скорошни статии</h2>
            <p>Ясни, експертно прегледани материали за следващия ти въпрос.</p>
          </div>
          <Link href="/blog" className="taste-community-articles-all">
            Всички статии
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="taste-community-articles-layout">
          <article className="taste-community-article-featured">
            <Link href={`/blog/${featured.slug}`}>
              <ArticleMedia article={featured} />
              <div className="taste-community-article-featured-copy">
                <div className="taste-community-article-meta">
                  <span>{CATEGORY_LABELS[featured.category] || featured.category}</span>
                  {articleDate(featured.published_at) && (
                    <time dateTime={featured.published_at}>
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {articleDate(featured.published_at)}
                    </time>
                  )}
                </div>
                <h3>{featured.title}</h3>
                {featured.excerpt && <p>{featured.excerpt}</p>}
                <span className="taste-community-article-read">
                  Прочети статията
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </article>

          {rest.length > 0 && (
            <div className="taste-community-article-list">
              {rest.map((article) => (
                <article key={article.id} className="taste-community-article-compact">
                  <Link href={`/blog/${article.slug}`}>
                    <ArticleMedia article={article} compact />
                    <div>
                      <div className="taste-community-article-meta">
                        <span>{CATEGORY_LABELS[article.category] || article.category}</span>
                        {articleDate(article.published_at) && (
                          <time dateTime={article.published_at}>
                            {articleDate(article.published_at)}
                          </time>
                        )}
                      </div>
                      <h3>{article.title}</h3>
                      <span className="taste-community-article-read">
                        Прочети
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
