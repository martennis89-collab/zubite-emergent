import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { BlogViewTracker } from '@/components/BlogViewTracker'
import { ArticleBreadcrumbs } from '@/components/ArticleBreadcrumbs'
import { TrackedLink } from '@/components/TrackedLink'
import { Calendar, ArrowRight, Tag, User, Shield } from 'lucide-react'

// Force dynamic rendering - do not pre-render at build time
export const dynamic = 'force-dynamic'

interface FaqItem { q: string; a: string }
interface LinkItem { label: string; url: string }
interface SourceItem { title: string; url: string }
interface CtaBlock {
  title?: string | null
  text?: string | null
  button?: string | null
  url?: string | null
  type?: string | null
}

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
  // Extended structured fields (from article importer)
  seo_title?: string | null
  language?: string | null
  reviewed_by?: string | null
  last_reviewed?: string | null
  faq?: FaqItem[] | null
  internal_links?: LinkItem[] | null
  external_sources?: SourceItem[] | null
  cta?: CtaBlock | null
  featured_image_alt?: string | null
  faq_schema?: object | null
  article_schema?: object | null
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
    // Use the public API URL for server-side rendering
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL || ''
    
    const response = await fetch(`${API_URL}/api/blog/posts/${slug}`, {
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
    title: `${post.seo_title || post.meta_title || post.title} | Zubite.bg`,
    description: post.meta_description || post.excerpt,
    alternates: {
      canonical: `https://zubite.bg/blog/${post.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    openGraph: {
      title: post.seo_title || post.meta_title || post.title,
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
      title: post.seo_title || post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
    },
  }
}

// Simple markdown to HTML converter
function parseMarkdown(content: string): string {
  // Step 1: extract pre-existing <figure>...</figure> HTML blocks (single-line)
  // so the link/paragraph regexes below don't mangle them. We'll re-inject
  // them at the end via opaque placeholders.
  const figures: string[] = []
  let html = content.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (m) => {
    figures.push(m)
    return `\u0000FIG${figures.length - 1}\u0000`
  })

  html = html
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="font-serif text-xl font-semibold text-slate-900 mt-8 mb-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="font-serif text-2xl font-semibold text-slate-900 mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="font-serif text-3xl font-semibold text-slate-900 mt-10 mb-4">$1</h1>')
    // Blockquotes (used for "Накратко" callout boxes etc.)
    .replace(/^> (.*$)/gim, '<blockquote class="article-callout">$1</blockquote>')
    // Bold and Italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Markdown image: ![alt](url "title") — rendered BEFORE links to win the regex race
    .replace(
      /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
      (_m, alt: string, url: string, title?: string) => {
        const t = title ? ` title="${title.replace(/"/g, '&quot;')}"` : ''
        return `<figure class="article-image"><img src="${url}" alt="${alt.replace(/"/g, '&quot;')}"${t} loading="lazy" /></figure>`
      },
    )
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-sky-500 hover:text-sky-600 underline">$1</a>')
    // Unordered lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    // Line breaks / paragraphs
    .replace(/\n\n/g, '</p><p class="text-slate-700 leading-relaxed mb-4">')
    .replace(/\n/g, '<br />')
  
  // Wrap in paragraph if not starting with a block element
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol') && !html.startsWith('<figure') && !html.startsWith('\u0000FIG')) {
    html = `<p class="text-slate-700 leading-relaxed mb-4">${html}</p>`
  }
  
  // Wrap list items
  html = html.replace(/(<li.*<\/li>)/g, '<ul class="list-disc list-inside mb-4 space-y-2 text-slate-700">$1</ul>')

  // Re-inject extracted figure blocks. <p>…<figure>…</p> is invalid HTML, so
  // strip the surrounding <p>…</p> if it only contains the figure placeholder.
  html = html.replace(
    /<p[^>]*>\s*\u0000FIG(\d+)\u0000\s*<\/p>/g,
    (_m, idx: string) => figures[Number(idx)] || '',
  )
  html = html.replace(/\u0000FIG(\d+)\u0000/g, (_m, idx: string) => figures[Number(idx)] || '')

  return html
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    notFound()
  }

  // FAQ in body? If markdown contains an "Често задавани въпроси" or "FAQ" heading
  // we skip the dedicated FAQ section visually (schema is still emitted for SEO).
  const bodyHasFaqHeading = /^##\s+(?:често\s+задавани|faq)/im.test(post.content || '')
  const showFaqSection = post.faq && post.faq.length > 0 && !bodyHasFaqHeading

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <BlogViewTracker postSlug={params.slug} postTitle={post.title} />

      {/* JSON-LD: FAQ + Article schemas (in <head> alternative — emitted in DOM, valid for Google) */}
      {post.faq_schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(post.faq_schema) }}
        />
      )}
      {post.article_schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(post.article_schema) }}
        />
      )}

      {/* Article */}
      <article className="pt-24 md:pt-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* 1. Breadcrumbs */}
          <ArticleBreadcrumbs
            items={[
              { label: 'Начало', href: '/' },
              {
                label: CATEGORY_NAMES[post.category] || post.category,
                href: `/blog?category=${post.category}`,
              },
              { label: post.title },
            ]}
          />

          {/* 2. Title */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 mb-5 leading-tight">
            {post.title}
          </h1>

          {/* 3. Excerpt */}
          {post.excerpt && (
            <p className="text-lg sm:text-xl text-slate-600 mb-6 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* 4. Author / reviewer / date metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-8 text-sm text-slate-500 border-y border-slate-100 py-4">
            {post.author_name && (
              <span className="inline-flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {post.author_name}
              </span>
            )}
            {post.reviewed_by && (
              <span className="inline-flex items-center gap-1.5 text-slate-700" data-testid="article-reviewer">
                <Shield className="w-4 h-4 text-emerald-500" />
                Медицински прегледано: <strong className="font-medium">{post.reviewed_by}</strong>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(post.published_at).toLocaleDateString('bg-BG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {post.last_reviewed && (
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                Последно ревю: {new Date(post.last_reviewed).toLocaleDateString('bg-BG')}
              </span>
            )}
          </div>

          {/* 5. Featured Image */}
          {post.featured_image && (
            <div className="mb-10 rounded-2xl overflow-hidden">
              <img
                src={post.featured_image}
                alt={post.featured_image_alt || post.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* 6. Article body */}
          <div
            className="prose prose-slate max-w-none mb-10"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }}
          />

          {/* 7. CTA — uses imported CTA block when present, falls back to default */}
          {post.cta && (post.cta.title || post.cta.text) ? (
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-8 md:p-10 mt-4 mb-12 text-center" data-testid="article-cta">
              {post.cta.title && (
                <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-3">
                  {post.cta.title}
                </h2>
              )}
              {post.cta.text && (
                <p className="text-slate-600 mb-6">{post.cta.text}</p>
              )}
              {post.cta.url && post.cta.button && (
                <TrackedLink
                  href={post.cta.url}
                  event="article_cta_click"
                  slug={post.slug}
                  title={post.title}
                  cta={post.cta.button}
                  external={/^https?:\/\//.test(post.cta.url)}
                  className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-sky-500 text-white font-medium hover:bg-sky-600 transition-all"
                  testId="article-cta-button"
                >
                  {post.cta.button}
                  <ArrowRight className="w-4 h-4" />
                </TrackedLink>
              )}
            </div>
          ) : (
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-8 md:p-10 mt-4 mb-12 text-center" data-testid="article-cta">
              <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-3">
                Имате въпроси за ортодонтията?
              </h2>
              <p className="text-slate-600 mb-6">
                Направете безплатна оценка и разберете кое лечение е подходящо за вас.
              </p>
              <TrackedLink
                href="/assessment"
                event="article_cta_click"
                slug={post.slug}
                title={post.title}
                cta="Направете оценка"
                className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-sky-500 text-white font-medium hover:bg-sky-600 transition-all"
                testId="article-cta-button"
              >
                Направете оценка
                <ArrowRight className="w-4 h-4" />
              </TrackedLink>
            </div>
          )}

          {/* 8. Related articles */}
          {post.internal_links && post.internal_links.length > 0 && (
            <section className="mb-12 border-t border-slate-200 pt-10" data-testid="article-related">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-1">
                Полезни следващи стъпки
              </h2>
              <p className="text-sm text-slate-500 mb-5">Свързани статии, които може да са ви полезни.</p>
              <ul className="grid sm:grid-cols-2 gap-3">
                {post.internal_links.map((link, i) => (
                  <li key={i}>
                    <TrackedLink
                      href={link.url}
                      event="related_article_click"
                      slug={post.slug}
                      title={post.title}
                      external={/^https?:\/\//.test(link.url)}
                      className="flex items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-sky-300 hover:shadow-sm transition-all group"
                      testId={`article-related-${i}`}
                    >
                      <span className="text-slate-700 group-hover:text-sky-600 flex-1">
                        {link.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                    </TrackedLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 9. Sources */}
          {post.external_sources && post.external_sources.length > 0 && (
            <section className="mb-12" data-testid="article-sources">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="font-serif text-base font-semibold text-slate-700 mb-3">
                  Източници
                </h2>
                <ul className="space-y-1.5 text-sm">
                  {post.external_sources.map((src, i) => (
                    <li key={i}>
                      <TrackedLink
                        href={src.url}
                        event="external_source_click"
                        slug={post.slug}
                        title={post.title}
                        external
                        className="text-sky-700 hover:text-sky-800 hover:underline"
                        testId={`article-source-${i}`}
                      >
                        {src.title}
                      </TrackedLink>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* 10. FAQ — only when not duplicated by FAQ heading inside body */}
          {showFaqSection && post.faq && (
            <section className="mb-12 border-t border-slate-200 pt-10" data-testid="article-faq">
              <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-6">
                Често задавани въпроси
              </h2>
              <div className="space-y-3">
                {post.faq.map((item, i) => (
                  <details
                    key={i}
                    className="group bg-slate-50 rounded-xl p-5 open:bg-sky-50 transition-colors"
                  >
                    <summary className="font-medium text-slate-900 cursor-pointer list-none flex items-center justify-between">
                      <span>{item.q}</span>
                      <span className="text-sky-500 ml-4 group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="mt-3 text-slate-700 leading-relaxed whitespace-pre-line">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* 11. Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 py-6 border-t border-slate-200" data-testid="article-tags">
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
        </div>
      </article>

      <Footer />
    </main>
  )
}
