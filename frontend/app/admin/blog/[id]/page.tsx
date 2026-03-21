'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Loader2, LogOut, ArrowLeft, Save, Eye, EyeOff,
  Image as ImageIcon, Tag, FileText, Trash2, RefreshCw
} from 'lucide-react'

export default function EditBlogPostPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category: 'orthodontics',
    tags: '',
    meta_title: '',
    meta_description: '',
    is_published: false
  })

  // Bulgarian Cyrillic to Latin transliteration map
  const cyrillicToLatin: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
    'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': '',
    'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
    'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F',
    'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sht', 'Ъ': 'A', 'Ь': '',
    'Ю': 'Yu', 'Я': 'Ya'
  }

  const transliterate = (text: string): string => {
    return text.split('').map(char => cyrillicToLatin[char] || char).join('')
  }

  const generateSlug = (title: string) => {
    const latinTitle = transliterate(title)
    return latinTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim()
  }

  // Convert Google Drive share link to direct image URL
  const convertGoogleDriveUrl = (url: string): string => {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (match) {
      const fileId = match[1]
      // Use lh3.googleusercontent.com which is more reliable
      return `https://lh3.googleusercontent.com/d/${fileId}`
    }
    return url
  }

  const handleImageUrlChange = (url: string) => {
    const convertedUrl = convertGoogleDriveUrl(url)
    setFormData(prev => ({ ...prev, featured_image: convertedUrl }))
  }

  useEffect(() => {
    const fetchPost = async () => {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin')
        return
      }

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
        const response = await fetch(`${API_URL}/api/admin/blog/posts/${postId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('admin_token')
            router.push('/admin')
            return
          }
          throw new Error('Post not found')
        }

        const post = await response.json()
        setFormData({
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          content: post.content || '',
          featured_image: post.featured_image || '',
          category: post.category || 'orthodontics',
          tags: post.tags?.join(', ') || '',
          meta_title: post.meta_title || '',
          meta_description: post.meta_description || '',
          is_published: post.is_published || false
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Грешка при зареждане')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [router, postId])

  const handleSubmit = async (e: React.FormEvent, publish?: boolean) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    const token = localStorage.getItem('admin_token')
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

    try {
      const updateData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        is_published: publish !== undefined ? publish : formData.is_published
      }

      const response = await fetch(`${API_URL}/api/admin/blog/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to update post')
      }

      // Update local state if publish status changed
      if (publish !== undefined) {
        setFormData(prev => ({ ...prev, is_published: publish }))
      }

      // Show success feedback
      router.push('/admin/blog')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при запазване')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
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
        router.push('/admin/blog')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin')
  }

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
              <Link
                href="/admin/blog"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Назад</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleSubmit(e)}
                disabled={isSaving || !formData.title || !formData.slug}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Запази
              </button>
              {formData.is_published ? (
                <button
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  <EyeOff className="w-4 h-4" />
                  Скрий
                </button>
              ) : (
                <button
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isSaving || !formData.content}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  Публикувай
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors ml-2"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900">
              Редактиране на публикация
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {formData.is_published ? (
                <span className="text-emerald-600">● Публикувана</span>
              ) : (
                <span className="text-slate-400">● Чернова</span>
              )}
            </p>
          </div>
          {formData.is_published && formData.slug && (
            <Link
              href={`/blog/${formData.slug}`}
              target="_blank"
              className="text-sm text-sky-500 hover:text-sky-600"
            >
              Виж публикацията →
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
          {/* Main Content */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Заглавие *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                placeholder="Въведете заглавие..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                URL Slug *
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-500 text-sm">
                  /blog/
                </span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-r-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="url-slug"
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, slug: generateSlug(prev.title) }))}
                  className="px-3 py-3 text-slate-500 hover:text-sky-600 transition-colors"
                  title="Генерирай от заглавие"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Кликнете иконата за да генерирате латински URL от заглавието
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Кратко описание
              </label>
              <textarea
                value={formData.excerpt}
                onChange={e => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                rows={2}
                placeholder="Кратко описание за листинга..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Съдържание *
              </label>
              <textarea
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono text-sm"
                rows={20}
                placeholder="Напишете съдържанието тук... (поддържа Markdown)"
                required
              />
              <p className="text-xs text-slate-400 mt-2">
                Поддържа Markdown форматиране: **bold**, *italic*, # Heading, - list items, [link](url)
              </p>
            </div>
          </div>

          {/* Sidebar Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Медия
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  URL на изображение
                </label>
                <input
                  type="url"
                  value={formData.featured_image}
                  onChange={e => handleImageUrlChange(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  placeholder="https://..."
                />
                <p className="text-xs text-slate-400 mt-1">
                  Google Drive линкове се конвертират автоматично
                </p>
                {formData.featured_image && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                    <img 
                      src={formData.featured_image} 
                      alt="Preview" 
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Категория
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="orthodontics">Ортодонтия</option>
                  <option value="aligners">Алайнери</option>
                  <option value="braces">Брекети</option>
                  <option value="tips">Съвети</option>
                  <option value="news">Новини</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Тагове
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  placeholder="таг1, таг2, таг3"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                SEO
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={e => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  placeholder="SEO заглавие (ако е различно)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Meta Description
                </label>
                <textarea
                  value={formData.meta_description}
                  onChange={e => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  rows={3}
                  placeholder="SEO описание..."
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}
