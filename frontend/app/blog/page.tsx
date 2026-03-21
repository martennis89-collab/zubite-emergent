import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Calendar, ArrowRight, BookOpen } from 'lucide-react'

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
    // For server-side rendering, use internal URL
    const isServer = typeof window === 'undefined'
    const API_URL = isServer 
      ? 'http://localhost:8001' 
      : (process.env.NEXT_PUBLIC_API_URL || '')
    
    const response = await fetch(`${API_URL}/api/blog/posts?limit=20`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
      cache: 'no-store' // Disable caching for now to debug
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
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-12 bg-gradient-to-br from-white via-sky-50/30 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 text-sky-600 text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            <span>Блог</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 mb-4">
            Статии и съвети
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Полезна информация за ортодонтия, грижа за зъбите и различните методи за изправяне на усмивката.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h2 className="font-serif text-xl text-slate-600 mb-2">
                Скоро тук ще има статии
              </h2>
              <p className="text-slate-500">
                Работим върху полезно съдържание за вас.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 mt-6 text-sky-500 hover:text-sky-600 font-medium"
              >
                Към началната страница
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post, index) => (
                <article 
                  key={post.id}
                  className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300"
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    <div className="p-6 md:p-8">
                      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                        <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-600 font-medium">
                          {CATEGORY_NAMES[post.category] || post.category}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          {new Date(post.published_at).toLocaleDateString('bg-BG', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <h2 className="font-serif text-xl md:text-2xl font-semibold text-slate-900 mb-3 group-hover:text-sky-600 transition-colors">
                        {post.title}
                      </h2>
                      
                      <p className="text-slate-600 mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center text-sky-500 font-medium group-hover:gap-3 transition-all">
                        <span>Прочетете повече</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}

          {total > 20 && (
            <div className="text-center mt-12">
              <p className="text-slate-500">
                Показани {posts.length} от {total} статии
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
            Готови да направите първата стъпка?
          </h2>
          <p className="text-slate-600 mb-8">
            Направете безплатна оценка и разберете на какъв етап сте.
          </p>
          <Link
            href="/quiz"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-sky-500 text-white font-medium hover:bg-sky-600 transition-all duration-300 hover:shadow-lg"
          >
            Провери етапа си
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
