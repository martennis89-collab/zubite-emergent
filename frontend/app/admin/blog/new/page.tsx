'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Loader2, Save, Eye, EyeOff,
  Image as ImageIcon, Tag, FileText, RefreshCw, Upload
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default function NewBlogPostPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
    fetch(`${API_URL}/api/admin/me`, { credentials: 'include' as RequestCredentials })
      .then(r => { if (!r.ok) router.push('/admin') })
      .catch(() => router.push('/admin'))
  }, [router])

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
    // First transliterate Bulgarian to Latin
    const latinTitle = transliterate(title)
    // Then create slug
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
    // Pattern: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (match) {
      const fileId = match[1]
      // Use lh3.googleusercontent.com which is more reliable
      return `https://lh3.googleusercontent.com/d/${fileId}`
    }
    return url
  }

  const handleImageUrlChange = (url: string) => {
    // Auto-convert Google Drive URLs
    const convertedUrl = convertGoogleDriveUrl(url)
    setFormData(prev => ({ ...prev, featured_image: convertedUrl }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Моля, изберете изображение (JPEG, PNG, GIF, WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Файлът е твърде голям. Максимум 5MB.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include' as RequestCredentials,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Грешка при качване')
      }

      const data = await response.json()
      
      // Set the uploaded image URL
      setFormData(prev => ({ ...prev, featured_image: data.url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при качване на файла')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }))
  }

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

    try {
      const response = await fetch(`${API_URL}/api/admin/blog/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          is_published: publish
        }), credentials: 'include' as RequestCredentials,})

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to create post')
      }

      router.push('/admin/blog')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при създаване на публикацията')
    } finally {
      setIsSaving(false)
    }
  }

  // Logout is now handled by <AdminHeader />.

  return (
    <main className="min-h-screen bg-[#FCFAF8]">
      <AdminHeader
        pageTitle="Нова статия"
        backHref="/admin/blog"
        backLabel="Към статиите"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-end gap-3">
        <button
          onClick={(e) => handleSubmit(e, false)}
          disabled={isSaving || !formData.title || !formData.slug}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Запази като чернова
        </button>
        <button
          onClick={(e) => handleSubmit(e, true)}
          disabled={isSaving || !formData.title || !formData.slug || !formData.content}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          Публикувай
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold text-slate-900">
            Нова публикация
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Main Content */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Заглавие *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={handleTitleChange}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-r-lg text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  placeholder="url-slug"
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, slug: generateSlug(prev.title) }))}
                  className="px-3 py-3 text-slate-500 hover:text-teal-600 transition-colors"
                  title="Генерирай от заглавие"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Автоматично се транслитерира на латиница за по-добро SEO
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Кратко описание
              </label>
              <textarea
                value={formData.excerpt}
                onChange={e => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono text-sm"
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
              
              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 border-2 border-dashed border-teal-200 rounded-lg text-teal-600 hover:bg-teal-100 hover:border-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Качване...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Качи изображение
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  JPEG, PNG, GIF, WebP • Максимум 5MB
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-slate-400">или въведи URL</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  URL на изображение
                </label>
                <input
                  type="url"
                  value={formData.featured_image}
                  onChange={e => handleImageUrlChange(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-teal-500"
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
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-teal-500"
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
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-teal-500"
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
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-teal-500"
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
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-teal-500"
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
