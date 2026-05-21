import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { resolveImageUrl } from '@/lib/imageUrl'
import { Calendar, ArrowRight, BookOpen, Sparkles } from 'lucide-react'

// Force dynamic rendering - do not pre-render at build time
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Блог | Zubite.bg',
  description: 'Статии и съвети за ортодонтия, алайнери и брекети. Научете повече за грижата за зъбите и ортодонтското лечение.',
  alternates: {
    canonical: 'https://zubite.bg/blog',
  },
}

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  featured_image: string | null
  published_at: string
  view_count: number
  author_name: string
}

const CATEGORY_NAMES: Record<string, string> = {
  orthodontics: 'Ортодонтия',
  aligners: 'Алайнери',
  braces: 'Брекети',
  tips: 'Съвети',
  news: 'Новини',
}

async function getBlogPosts(): Promise<{ posts: BlogPost[], total: number }> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL || ''

    const response = await fetch(`${API_URL}/api/blog/posts?limit=20`, {
      next: { revalidate: 60 },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error('Blog fetch error:', response.status, response.statusText)
      return { posts: [], total: 0 }
    }

    return response.json()
  } catch (error) {
    console.error('Blog fetch exception:', error)
    return { posts: [], total: 0 }
  }
}

export default async function BlogPage() {
  const { posts, total } = await getBlogPosts()

  return (
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden" data-testid="blog-page">
      <Header />

      {/* Hero Section — premium journal */}
      <section className="relative pt-28 md:pt-36 pb-14 md:pb-20">
        <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute top-10 -right-32 w-[30rem] h-[30rem] rounded-full bg-cyan-100/40 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-white/70 text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold px-3 py-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Журнал Zubite
          </span>

          <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 leading-[1.05] tracking-tight">
            Статии и съвети <span className="text-teal-600">за усмивката ви</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Кратки, ясни и медицински прегледани материали — ортодонтия, алайнери, брекети, ежедневна грижа.
          </p>

          {/* Trust chip */}
          <div className="mt-6 inline-flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            <span>Ориентир, не диагноза</span>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {posts.length === 0 ? (
            <div className="text-center py-16 rounded-3xl bg-white/50 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)]" data-testid="blog-empty">
              <BookOpen className="w-12 h-12 text-teal-300 mx-auto mb-4" />
              <h2 className="font-serif text-xl text-slate-700 mb-2">
                Скоро тук ще има статии
              </h2>
              <p className="text-sm text-slate-500">
                Работим върху полезно съдържание за вас.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 mt-6 text-teal-600 hover:text-teal-700 font-medium text-sm"
                data-testid="blog-empty-home-link"
              >
                Към началната страница
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-7">
              {posts.map((post, idx) => (
                <article
                  key={post.id}
                  className={
                    'group relative rounded-3xl overflow-hidden bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.15)] hover:shadow-[0_28px_60px_-22px_rgba(13,148,136,0.25)] hover:ring-teal-200/60 transition-all duration-300 ' +
                    (idx === 0 ? 'md:col-span-2' : '')
                  }
                  data-testid={`blog-card-${post.slug}`}
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    <div className={'flex flex-col ' + (idx === 0 ? 'md:flex-row' : '')}>
                      {/* Thumbnail Image */}
                      {post.featured_image && (
                        <div className={idx === 0 ? 'md:w-1/2 flex-shrink-0' : 'w-full'}>
                          <div className={(idx === 0 ? 'aspect-[16/10] md:aspect-auto md:h-full' : 'aspect-[16/10]') + ' relative overflow-hidden bg-teal-50/40'}>
                            <img
                              src={resolveImageUrl(post.featured_image)}
                              alt={post.title}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                              loading="lazy"
                            />
                            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <div className={'flex-1 p-6 md:p-7 ' + (idx === 0 ? 'md:p-8 lg:p-10' : '')}>
                        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50/80 text-teal-700 font-medium ring-1 ring-teal-100">
                            {CATEGORY_NAMES[post.category] || post.category}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(post.published_at).toLocaleDateString('bg-BG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <h2 className={'font-serif font-semibold text-slate-900 mb-3 group-hover:text-teal-700 transition-colors leading-tight ' + (idx === 0 ? 'text-2xl md:text-3xl' : 'text-xl')}>
                          {post.title}
                        </h2>

                        <p className="text-sm text-slate-600 mb-5 line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>

                        <div className="inline-flex items-center gap-1.5 text-teal-600 font-medium text-sm group-hover:gap-2.5 transition-all">
                          <span>Прочетете повече</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}

          {total > 20 && (
            <div className="text-center mt-10">
              <p className="text-sm text-slate-500">
                Показани {posts.length} от {total} статии
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section — glass */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl bg-gradient-to-br from-teal-50/90 to-white/80 backdrop-blur-md ring-1 ring-teal-200/40 shadow-[0_28px_60px_-22px_rgba(13,148,136,0.25)] p-8 md:p-12 text-center overflow-hidden" data-testid="blog-cta">
            <div aria-hidden className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-teal-200/40 blur-3xl pointer-events-none" />
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold mb-3">
                Първа стъпка
              </p>
              <h2 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 mb-3">
                Готови ли сте за <span className="text-teal-600">ориентир</span>?
              </h2>
              <p className="text-sm md:text-base text-slate-600 mb-7 max-w-lg mx-auto">
                Безплатна оценка за 2 минути. Без диагноза — само ясна посока за следваща стъпка.
              </p>
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-teal-500 text-white font-medium hover:bg-teal-600 transition-all duration-300 shadow-[0_12px_30px_-12px_rgba(13,148,136,0.6)] hover:shadow-[0_18px_40px_-12px_rgba(13,148,136,0.7)]"
                data-testid="blog-cta-quiz-btn"
              >
                Провери етапа си
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
