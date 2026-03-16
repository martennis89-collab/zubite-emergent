import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Calendar, ArrowLeft, ArrowRight, Tag, User } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  featured_image: string | null
  meta_title: string | null
  meta_description: string | null
  published_at: string
  updated_at: string
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

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    // Use internal URL for server-side requests
    const API_URL = process.env.BACKEND_INTERNAL_URL 
      ? `${process.env.BACKEND_INTERNAL_URL}/api`
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api')
    const response = await fetch(`${API_URL}/blog/posts/${slug}`, {
      next: { revalidate: 60 },
      cache: 'no-store', // Disable caching for dynamic content
    })
    
    if (!response.ok) {
      return null
    }
    
    return response.json()
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    return {
      title: 'Статия не е намерена | Zubite.bg',
    }
  }
  
  return {
    title: `${post.meta_title || post.title} | Zubite.bg`,
    description: post.meta_description || post.excerpt,
    alternates: {
      canonical: `https://zubite.bg/blog/${post.slug}`,
    },
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      url: `https://zubite.bg/blog/${post.slug}`,
      siteName: 'Zubite',
      locale: 'bg_BG',
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      images: post.featured_image ? [post.featured_image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
    },
  }
}

// Simple markdown to HTML converter
function parseMarkdown(content: string): string {
  let html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="font-serif text-xl font-semibold text-slate-900 mt-8 mb-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="font-serif text-2xl font-semibold text-slate-900 mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="font-serif text-3xl font-semibold text-slate-900 mt-10 mb-4">$1</h1>')
    // Bold and Italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-sky-500 hover:text-sky-600 underline">$1</a>')
    // Unordered lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    // Line breaks / paragraphs
    .replace(/\n\n/g, '</p><p class="text-slate-700 leading-relaxed mb-4">')
    .replace(/\n/g, '<br />')
  
  // Wrap in paragraph if not starting with a block element
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol')) {
    html = `<p class="text-slate-700 leading-relaxed mb-4">${html}</p>`
  }
  
  // Wrap list items
  html = html.replace(/(<li.*<\/li>)/g, '<ul class="list-disc list-inside mb-4 space-y-2 text-slate-700">$1</ul>')
  
  return html
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Article Header */}
      <article className="pt-24 md:pt-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link 
              href="/blog"
              className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад към блога
            </Link>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
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
            {post.author_name && (
              <span className="flex items-center gap-1.5 text-slate-400">
                <User className="w-4 h-4" />
                {post.author_name}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            {post.excerpt}
          </p>

          {/* Featured Image */}
          {post.featured_image && (
            <div className="mb-10 rounded-2xl overflow-hidden">
              <img 
                src={post.featured_image} 
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Content */}
          <div 
            className="prose prose-slate max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 py-6 border-t border-slate-200">
              <Tag className="w-4 h-4 text-slate-400" />
              {post.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl p-8 md:p-10 mt-8 mb-12 text-center">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-3">
              Имате въпроси за ортодонтията?
            </h2>
            <p className="text-slate-600 mb-6">
              Направете безплатна оценка и разберете кое лечение е подходящо за вас.
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-sky-500 text-white font-medium hover:bg-sky-600 transition-all"
            >
              Направете оценка
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
