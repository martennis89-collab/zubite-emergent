'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Loader2, LogOut, Plus, Edit, Trash2, Eye, EyeOff,
  Calendar, RefreshCw, Search, FileText, ArrowLeft,
  Users, BarChart3, TrendingUp
} from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  is_published: boolean
  created_at: string
  updated_at: string
  published_at: string | null
  view_count: number
  author_name: string
}

interface BlogAnalytics {
  total_views: number
  total_unique_visitors: number
  total_posts: number
  post_stats: {
    slug: string
    title: string
    total_views: number
    unique_visitors: number
  }[]
}

export default function AdminBlogPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPublished, setFilterPublished] = useState<string>('')
  const [analytics, setAnalytics] = useState<BlogAnalytics | null>(null)
  const router = useRouter()

  const fetchAnalytics = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${API_URL}/api/admin/blog/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }, [])

  const fetchPosts = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const params = new URLSearchParams()
      if (filterPublished !== '') {
        params.append('is_published', filterPublished)
      }

      const response = await fetch(`${API_URL}/api/admin/blog/posts?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_token')
          router.push('/admin')
          return
        }
        throw new Error('Failed to fetch posts')
      }

      const data = await response.json()
      setPosts(data.posts)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router, filterPublished])

  useEffect(() => {
    fetchPosts()
    fetchAnalytics()
  }, [fetchPosts, fetchAnalytics])

  // Helper to get unique visitors for a post
  const getUniqueVisitors = (slug: string): number => {
    if (!analytics) return 0
    const stat = analytics.post_stats.find(s => s.slug === slug)
    return stat?.unique_visitors || 0
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin')
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете тази публикация?')) {
      return
    }

    const token = localStorage.getItem('admin_token')
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

    try {
      const response = await fetch(`${API_URL}/api/admin/blog/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handleTogglePublish = async (post: BlogPost) => {
    const token = localStorage.getItem('admin_token')
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

    try {
      const response = await fetch(`${API_URL}/api/admin/blog/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_published: !post.is_published })
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Error toggling publish:', error)
    }
  }

  const filteredPosts = posts.filter(post => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      post.title.toLowerCase().includes(search) ||
      post.slug.toLowerCase().includes(search)
    )
  })

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium">Блог</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span className="hidden sm:inline">Лийдове</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                data-testid="logout-btn"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Изход</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900">
              Управление на блога
            </h1>
            <p className="text-slate-500 mt-1">
              {total} публикации общо
            </p>
          </div>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
            data-testid="new-post-btn"
          >
            <Plus className="w-5 h-5" />
            Нова публикация
          </Link>
          <Link
            href="/admin/blog/import"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            data-testid="import-article-btn"
          >
            <FileText className="w-5 h-5" />
            Импорт от Markdown
          </Link>
        </div>

        {/* Stats Summary */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Публикации</p>
                  <p className="text-xl font-semibold text-slate-900">{analytics.total_posts}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Уникални посетители</p>
                  <p className="text-xl font-semibold text-slate-900">{analytics.total_unique_visitors}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Общо прегледи</p>
                  <p className="text-xl font-semibold text-slate-900">{analytics.total_views}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={filterPublished}
                onChange={e => setFilterPublished(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="">Всички статуси</option>
                <option value="true">Публикувани</option>
                <option value="false">Чернови</option>
              </select>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Търсене..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sky-500 w-48"
                />
              </div>
            </div>

            <button
              onClick={() => fetchPosts()}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Обнови
            </button>
          </div>
        </div>

        {/* Posts List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {filteredPosts.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Няма намерени публикации</p>
              <Link
                href="/admin/blog/new"
                className="inline-flex items-center gap-2 mt-4 text-sky-500 hover:text-sky-600"
              >
                <Plus className="w-4 h-4" />
                Създайте първата публикация
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 sm:p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-slate-900 truncate">
                          {post.title}
                        </h3>
                        {post.is_published ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Публикувана
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 flex items-center gap-1">
                            <EyeOff className="w-3 h-3" />
                            Чернова
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                        {post.excerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.created_at).toLocaleDateString('bg-BG')}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 font-medium" title="Уникални посетители">
                          <TrendingUp className="w-3 h-3" />
                          {getUniqueVisitors(post.slug)} уникални
                        </span>
                        <span className="text-slate-300">
                          /{post.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePublish(post)}
                        className={`p-2 rounded-lg transition-colors ${
                          post.is_published
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-emerald-500 hover:bg-emerald-50'
                        }`}
                        title={post.is_published ? 'Скрий' : 'Публикувай'}
                      >
                        {post.is_published ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Редактирай"
                      >
                        <Edit className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Изтрий"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {post.is_published && (
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Виж публикацията"
                        >
                          <ArrowLeft className="w-5 h-5 rotate-[135deg]" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500 mt-4">
          Показани: {filteredPosts.length} от {posts.length} публикации
        </p>
      </div>
    </main>
  )
}
