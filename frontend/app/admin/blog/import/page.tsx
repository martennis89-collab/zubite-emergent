'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import {
  Upload, FileText, Save, Send, AlertTriangle, CheckCircle2,
  Plus, Trash2, Eye, Loader2, Sparkles, Package, Image as ImageIcon, X,
} from 'lucide-react'
import {
  parseArticlePackage,
  validateArticle,
  generateSlug,
  replaceImagePlaceholders,
  autoInsertRemainingImages,
  ParsedArticle,
  ParsedFaqItem,
  ParsedLinkItem,
  ParsedSourceItem,
  ParsedCta,
  ParsedImageAsset,
  UploadedImage,
} from '@/lib/articleParser'
import { TestRenderModal } from '@/components/TestRenderModal'
import { AdminHeader } from '@/components/admin/AdminHeader'

const TEMPLATE = `# ZUBITE_ARTICLE_PACKAGE

<!-- ARTICLE_META -->
Title: Заглавие на статията
SEO Title: До 60 символа за Google
Meta Description: До 155 символа описание за SERP-а
Excerpt: Кратко резюме (1–2 изречения), което се показва в листинга на блога.
Slug: zaglavie-na-statiyata
Category: orthodontics
Tags: алайнери, ортодонтия, зъби
Author: Zubite.bg редакция
Reviewed By: д-р Име Фамилия, ортодонт
Last Reviewed: 2026-02-01
Language: bg
Status: draft

<!-- ARTICLE_BODY_START -->
# Главно заглавие на статията

{{image:hero}}

Тук започва markdown съдържанието. Може да съдържате всякакви заглавия:

## Първо подзаглавие
Параграф с обяснения. Може да има **bold** и *italic* форматиране.

{{image:infographic}}

## Второ подзаглавие
- Списък точка 1
- Списък точка 2

### Дори вложени заглавия
Без проблем — парсерът няма да ги обърка със системните секции.
<!-- ARTICLE_BODY_END -->

<!-- FAQ -->
Q: Първи въпрос?
A: Отговор на първия въпрос.

Q: Втори въпрос?
A: Отговор на втория въпрос.

Q: Трети въпрос?
A: Отговор на третия въпрос.

Q: Четвърти въпрос?
A: Отговор на четвъртия въпрос.

Q: Пети въпрос?
A: Отговор на петия въпрос.

<!-- INTERNAL_LINKS -->
- Label: Какво е Инвизалайн
  URL: /what-is-invisalign

- Label: Цени на импланти
  URL: /implant-price

<!-- EXTERNAL_SOURCES -->
- Title: AAO — American Association of Orthodontists
  URL: https://www.aaoinfo.org

<!-- CTA_BLOCK -->
Title: Готови ли сте за първата стъпка?
Text: Направете безплатен тест за 60 секунди.
Button: Започнете теста
URL: /quiz
Type: primary

<!-- IMAGE_ALT_TEXTS -->
Featured Image Alt: Описание на главното изображение
- Alt: Алт текст 1
- Alt: Алт текст 2
- Alt: Алт текст 3

<!-- IMAGE_ASSETS -->
- Type: hero
  File Name: example-hero.webp
  Alt: Алт текст за главно изображение
  Title: Главно изображение
  Caption:
  Placement: featured_image

- Type: infographic
  File Name: example-infographic.webp
  Alt: Алт текст за инфографиката
  Title: Инфографика
  Caption: Графика на основните точки
  Placement: after_intro

- Type: social_cover
  File Name: example-social.webp
  Alt: Социална визия
  Title: Кратко заглавие
  Caption:
  Placement: social_only

<!-- FAQ_SCHEMA_JSON_LD -->
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": []
}

<!-- ARTICLE_SCHEMA_JSON_LD -->
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Заглавие"
}
`

const CATEGORIES = [
  { value: 'orthodontics', label: 'Ортодонтия' },
  { value: 'aligners', label: 'Алайнери' },
  { value: 'braces', label: 'Брекети' },
  { value: 'tips', label: 'Съвети' },
  { value: 'news', label: 'Новини' },
]

export default function ArticleImporterPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)
  const [rawMd, setRawMd] = useState('')
  const [parsed, setParsed] = useState<ParsedArticle | null>(null)
  const [parseError, setParseError] = useState<string>('')
  const [isSaving, setIsSaving] = useState<'draft' | 'publish' | null>(null)
  const [savedMessage, setSavedMessage] = useState('')
  // ZIP import state
  const [zipFiles, setZipFiles] = useState<Map<string, Blob>>(new Map())
  const [zipFileName, setZipFileName] = useState('')
  const [isExtractingZip, setIsExtractingZip] = useState(false)
  const [isImportingZip, setIsImportingZip] = useState(false)
  const [zipImportProgress, setZipImportProgress] = useState('')
  // Test Render modal
  const [showTestRender, setShowTestRender] = useState(false)

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
    fetch(`${API_URL}/api/admin/me`, { credentials: 'include' as RequestCredentials })
      .then(r => { if (!r.ok) router.push('/admin') })
      .catch(() => router.push('/admin'))
  }, [router])

  const validation = useMemo(() => (parsed ? validateArticle(parsed) : null), [parsed])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || ''
      setRawMd(text)
      setParsed(null)
      setSavedMessage('')
    }
    reader.readAsText(file)
  }

  const handleParse = () => {
    setParseError('')
    setSavedMessage('')
    if (!rawMd.trim()) {
      setParseError('Моля поставете или качете markdown съдържание.')
      setParsed(null)
      return
    }
    try {
      const result = parseArticlePackage(rawMd)
      // Auto-generate slug if missing
      if (!result.slug && result.title) {
        result.slug = generateSlug(result.title)
      }
      // SEO Title fallback
      if (!result.seoTitle && result.title) result.seoTitle = result.title
      setParsed(result)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Грешка при разбор.')
      setParsed(null)
    }
  }

  const updateField = <K extends keyof ParsedArticle>(key: K, value: ParsedArticle[K]) => {
    setParsed((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const updateCta = (key: keyof ParsedCta, value: string) => {
    setParsed((prev) => {
      if (!prev) return prev
      const cta: ParsedCta = { ...(prev.cta || {}), [key]: value || undefined }
      return { ...prev, cta }
    })
  }

  const handleSave = async (publish: boolean) => {
    if (!parsed) return
    setSavedMessage('')

    if (publish && validation && !validation.ok) {
      setSavedMessage('❌ Не може да се публикува: ' + validation.errors.join(' '))
      return
    }

    setIsSaving(publish ? 'publish' : 'draft')

    const payload = {
      title: parsed.title,
      slug: parsed.slug,
      excerpt: parsed.excerpt || parsed.metaDescription || parsed.title.slice(0, 160),
      content: parsed.contentMarkdown,
      featured_image: null,
      category: parsed.category,
      tags: parsed.tags,
      meta_title: parsed.seoTitle,
      meta_description: parsed.metaDescription,
      is_published: publish,
      seo_title: parsed.seoTitle,
      language: parsed.language || 'bg',
      reviewed_by: parsed.reviewedBy || null,
      last_reviewed: parsed.lastReviewed || null,
      faq: parsed.faq,
      internal_links: parsed.internalLinks,
      external_sources: parsed.externalSources,
      cta: parsed.cta,
      featured_image_alt: parsed.featuredImageAlt || null,
      image_alt_texts: parsed.imageAltTexts,
      faq_schema: parsed.faqSchema,
      article_schema: parsed.articleSchema,
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${API_URL}/api/admin/blog/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), credentials: 'include' as RequestCredentials,})
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const detail = err.detail || res.statusText
        if (typeof detail === 'string' && detail.toLowerCase().includes('slug already exists')) {
          // Suggest a unique slug by appending a short numeric suffix
          const suggestion = `${parsed.slug}-${Math.random().toString(36).slice(2, 6)}`
          setSavedMessage(
            `❌ Slug "${parsed.slug}" вече съществува. Предложение: "${suggestion}". Редактирайте полето Slug и опитайте отново.`,
          )
        } else {
          setSavedMessage(`❌ Грешка: ${detail}`)
        }
      } else {
        const data = await res.json()
        setSavedMessage(
          publish
            ? `✅ Публикувано! Виж: /blog/${data.slug}`
            : '✅ Запазено като чернова.',
        )
        setTimeout(() => router.push('/admin/blog'), 1500)
      }
    } catch (e) {
      setSavedMessage(`❌ Грешка при свързване: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setIsSaving(null)
    }
  }

  // ─── ZIP Import ───────────────────────────────────────────────

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsExtractingZip(true)
    setParseError('')
    setSavedMessage('')
    try {
      const zip = await JSZip.loadAsync(file)
      let articleMd = ''
      const images = new Map<string, Blob>()
      const allowedExt = ['.webp', '.jpg', '.jpeg', '.png']

      const entries = Object.entries(zip.files)
      for (const [path, entry] of entries) {
        if (entry.dir) continue
        const baseName = path.split('/').pop() || ''
        const lowerPath = path.toLowerCase()
        if (lowerPath.endsWith('article.md')) {
          articleMd = await entry.async('string')
        } else if (lowerPath.includes('/images/') || lowerPath.startsWith('images/')) {
          const ext = baseName.toLowerCase().match(/\.[a-z]+$/)?.[0] || ''
          if (allowedExt.includes(ext)) {
            const blob = await entry.async('blob')
            images.set(baseName, blob)
          }
        }
      }

      if (!articleMd) {
        throw new Error('article.md не е намерен в ZIP-а.')
      }

      setRawMd(articleMd)
      setZipFiles(images)
      setZipFileName(file.name)
      // Auto-parse so the user immediately sees the mapping
      try {
        const result = parseArticlePackage(articleMd)
        if (!result.slug && result.title) result.slug = generateSlug(result.title)
        if (!result.seoTitle && result.title) result.seoTitle = result.title
        setParsed(result)
      } catch (parseErr) {
        setParseError(parseErr instanceof Error ? parseErr.message : 'Грешка при разбор.')
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Грешка при разпакетиране на ZIP.')
      setZipFiles(new Map())
      setZipFileName('')
    } finally {
      setIsExtractingZip(false)
      if (zipInputRef.current) zipInputRef.current.value = ''
    }
  }

  const clearZipState = () => {
    setZipFiles(new Map())
    setZipFileName('')
  }

  /**
   * Cross-validate IMAGE_ASSETS vs files actually present in the ZIP.
   * Returns lists of missing & orphan files.
   */
  const zipValidation = useMemo(() => {
    if (!parsed || zipFiles.size === 0) {
      return { missing: [] as string[], orphans: [] as string[], ok: true }
    }
    const declared = new Set(parsed.imageAssets.map((a) => a.fileName))
    const present = new Set(zipFiles.keys())
    const missing = [...declared].filter((n) => n && !present.has(n))
    const orphans = [...present].filter((n) => !declared.has(n))
    return { missing, orphans, ok: missing.length === 0 && orphans.length === 0 }
  }, [parsed, zipFiles])

  const uploadOneImage = async (
    blob: Blob,
    fileName: string,
  ): Promise<string> => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
    // JSZip returns blobs without MIME type; infer from filename extension so
    // the backend's content_type check accepts the upload.
    const ext = fileName.toLowerCase().match(/\.[a-z]+$/)?.[0] || ''
    const mimeMap: Record<string, string> = {
      '.webp': 'image/webp',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    }
    const mime = mimeMap[ext] || blob.type || 'application/octet-stream'
    const typedFile = new File([blob], fileName, { type: mime })
    const fd = new FormData()
    fd.append('file', typedFile)
    const res = await fetch(`${API_URL}/api/admin/upload`, {
      method: 'POST',
      body: fd, credentials: 'include' as RequestCredentials,})
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`${fileName}: ${err.detail || res.statusText}`)
    }
    const data = await res.json()
    return `${API_URL}${data.url}`
  }

  const handleZipImport = async () => {
    if (!parsed) return
    if (zipValidation.missing.length > 0) {
      setSavedMessage(
        `❌ Липсващи файлове в ZIP: ${zipValidation.missing.join(', ')}`,
      )
      return
    }

    setIsImportingZip(true)
    setSavedMessage('')

    try {
      // 1. Upload each image listed in IMAGE_ASSETS
      const uploaded: UploadedImage[] = []
      for (let i = 0; i < parsed.imageAssets.length; i++) {
        const asset = parsed.imageAssets[i]
        const blob = zipFiles.get(asset.fileName)
        if (!blob) continue // already validated above
        setZipImportProgress(`Качване на ${i + 1}/${parsed.imageAssets.length}: ${asset.fileName}`)
        const url = await uploadOneImage(blob, asset.fileName)
        uploaded.push({ asset, url })
      }

      // 2. Replace {{image:TYPE}} placeholders + auto-place remaining (skip social_only & featured)
      setZipImportProgress('Подмяна на placeholders в тялото…')
      const { body: bodyAfterPh, consumed } = replaceImagePlaceholders(
        parsed.contentMarkdown,
        uploaded,
      )
      const finalBody = autoInsertRemainingImages(bodyAfterPh, uploaded, consumed)

      // 3. Featured image = the asset marked Placement: featured_image
      const featuredImage = uploaded.find(
        (u) => (u.asset.placement || '').toLowerCase() === 'featured_image',
      )
      const featuredAlt =
        featuredImage?.asset.alt || parsed.featuredImageAlt || null
      const featuredUrl = featuredImage?.url || null

      // 4. Save as DRAFT
      setZipImportProgress('Запис в базата…')
      const payload = {
        title: parsed.title,
        slug: parsed.slug,
        excerpt: parsed.excerpt || parsed.metaDescription || parsed.title.slice(0, 160),
        content: finalBody,
        featured_image: featuredUrl,
        category: parsed.category,
        tags: parsed.tags,
        meta_title: parsed.seoTitle,
        meta_description: parsed.metaDescription,
        is_published: false,
        seo_title: parsed.seoTitle,
        language: parsed.language || 'bg',
        reviewed_by: parsed.reviewedBy || null,
        last_reviewed: parsed.lastReviewed || null,
        faq: parsed.faq,
        internal_links: parsed.internalLinks,
        external_sources: parsed.externalSources,
        cta: parsed.cta,
        featured_image_alt: featuredAlt,
        image_alt_texts: parsed.imageAltTexts,
        faq_schema: parsed.faqSchema,
        article_schema: parsed.articleSchema,
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${API_URL}/api/admin/blog/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), credentials: 'include' as RequestCredentials,})
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const detail = err.detail || res.statusText
        if (typeof detail === 'string' && detail.toLowerCase().includes('slug already exists')) {
          const suggestion = `${parsed.slug}-${Math.random().toString(36).slice(2, 6)}`
          throw new Error(
            `Slug "${parsed.slug}" вече съществува. Опитайте: "${suggestion}".`,
          )
        }
        throw new Error(detail)
      }
      const data = await res.json()
      setSavedMessage(
        `✅ Импортирано като чернова (${uploaded.length} изображения качени). /blog/${data.slug}`,
      )
      setTimeout(() => router.push('/admin/blog'), 2000)
    } catch (err) {
      setSavedMessage(
        `❌ Грешка при импорт: ${err instanceof Error ? err.message : 'unknown'}`,
      )
    } finally {
      setIsImportingZip(false)
      setZipImportProgress('')
    }
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8]">
      <AdminHeader
        pageTitle="Импортиране на статия"
        backHref="/admin/blog"
        backLabel="Към блога"
      />

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Input */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Структуриран Markdown</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => zipInputRef.current?.click()}
                disabled={isExtractingZip}
                className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                data-testid="importer-zip-upload-btn"
              >
                {isExtractingZip ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Package className="w-4 h-4" />
                )}
                Качи ZIP
              </button>
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip,application/zip"
                hidden
                onChange={handleZipUpload}
                data-testid="importer-zip-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                data-testid="importer-upload-btn"
              >
                <Upload className="w-4 h-4" /> Качи .md
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                hidden
                onChange={handleFileUpload}
                data-testid="importer-file-input"
              />
              <button
                type="button"
                onClick={() => setRawMd(TEMPLATE)}
                className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                data-testid="importer-template-btn"
              >
                <FileText className="w-4 h-4" /> Шаблон
              </button>
            </div>
          </div>
          <textarea
            value={rawMd}
            onChange={(e) => setRawMd(e.target.value)}
            placeholder="Поставете тук # ZUBITE_ARTICLE_PACKAGE..."
            className="w-full h-[480px] font-mono text-sm border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            data-testid="importer-textarea"
          />
          {/* ZIP package status */}
          {zipFileName && (
            <div className="mt-3 flex items-center gap-2 text-xs bg-teal-50 border border-teal-200 rounded-lg p-2.5" data-testid="importer-zip-status">
              <Package className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span className="flex-1 text-slate-700">
                <strong>{zipFileName}</strong> — {zipFiles.size} изображения извлечени
              </span>
              <button
                type="button"
                onClick={clearZipState}
                className="p-1 text-slate-400 hover:text-red-500"
                data-testid="importer-zip-clear"
                aria-label="Изчисти ZIP"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleParse}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
              data-testid="importer-parse-btn"
            >
              <Sparkles className="w-4 h-4" /> Разбор на статията
            </button>
            {parseError && <span className="text-sm text-red-600">{parseError}</span>}
          </div>
        </section>

        {/* RIGHT: Preview / edit */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Преглед и редакция</h2>

          {!parsed ? (
            <div className="text-center text-slate-400 py-20">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Натиснете „Разбор на статията“, за да видите полетата.</p>
            </div>
          ) : (
            <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2">
              {/* Validation banner */}
              {validation && (
                <div className="space-y-2">
                  {validation.errors.map((e, i) => (
                    <div
                      key={`err-${i}`}
                      className="flex items-start gap-2 text-sm bg-red-50 text-red-700 border border-red-100 rounded-lg p-2.5"
                      data-testid={`importer-error-${i}`}
                    >
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{e}</span>
                    </div>
                  ))}
                  {validation.warnings.map((w, i) => (
                    <div
                      key={`warn-${i}`}
                      className="flex items-start gap-2 text-sm bg-amber-50 text-amber-700 border border-amber-100 rounded-lg p-2.5"
                      data-testid={`importer-warning-${i}`}
                    >
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                  {validation.ok && validation.warnings.length === 0 && (
                    <div className="flex items-center gap-2 text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg p-2.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Готово за публикуване.</span>
                    </div>
                  )}
                </div>
              )}

              <FieldText
                label="Заглавие (Title)"
                value={parsed.title}
                onChange={(v) => updateField('title', v)}
                testId="importer-field-title"
              />
              <FieldText
                label={`SEO Title (${parsed.seoTitle.length}/60)`}
                value={parsed.seoTitle}
                onChange={(v) => updateField('seoTitle', v)}
                hasError={parsed.seoTitle.length > 60}
                testId="importer-field-seo-title"
              />
              <FieldTextArea
                label={`Meta Description (${parsed.metaDescription.length}/155)`}
                value={parsed.metaDescription}
                onChange={(v) => updateField('metaDescription', v)}
                rows={2}
                hasError={parsed.metaDescription.length > 155}
                testId="importer-field-meta-desc"
              />
              <FieldTextArea
                label="Excerpt (показва се в листинга)"
                value={parsed.excerpt}
                onChange={(v) => updateField('excerpt', v)}
                rows={2}
                testId="importer-field-excerpt"
              />
              <div className="grid grid-cols-2 gap-3">
                <FieldText
                  label="Slug"
                  value={parsed.slug}
                  onChange={(v) => updateField('slug', v)}
                  testId="importer-field-slug"
                />
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Категория</label>
                  <select
                    value={parsed.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    data-testid="importer-field-category"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <FieldText
                label="Tags (comma-separated)"
                value={parsed.tags.join(', ')}
                onChange={(v) =>
                  updateField('tags', v.split(',').map((s) => s.trim()).filter(Boolean))
                }
                testId="importer-field-tags"
              />
              <div className="grid grid-cols-2 gap-3">
                <FieldText
                  label="Author"
                  value={parsed.author}
                  onChange={(v) => updateField('author', v)}
                  testId="importer-field-author"
                />
                <FieldText
                  label="Language"
                  value={parsed.language}
                  onChange={(v) => updateField('language', v)}
                  testId="importer-field-language"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldText
                  label="Reviewed By (медицински рецензент)"
                  value={parsed.reviewedBy}
                  onChange={(v) => updateField('reviewedBy', v)}
                  testId="importer-field-reviewed-by"
                />
                <FieldText
                  label="Last Reviewed (YYYY-MM-DD)"
                  value={parsed.lastReviewed}
                  onChange={(v) => updateField('lastReviewed', v)}
                  testId="importer-field-last-reviewed"
                />
              </div>
              <FieldTextArea
                label={`Тяло на статията (${parsed.contentMarkdown.length} символа)`}
                value={parsed.contentMarkdown}
                onChange={(v) => updateField('contentMarkdown', v)}
                rows={8}
                testId="importer-field-content"
              />

              <FaqEditor
                items={parsed.faq}
                onChange={(items) => updateField('faq', items)}
              />
              <LinkEditor
                title={`Вътрешни връзки (${parsed.internalLinks.length})`}
                items={parsed.internalLinks}
                onChange={(items) => updateField('internalLinks', items)}
                placeholder={{ label: 'Какво е Инвизалайн', url: '/what-is-invisalign' }}
                testIdPrefix="importer-internal"
              />
              <SourceEditor
                items={parsed.externalSources}
                onChange={(items) => updateField('externalSources', items)}
              />

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">CTA блок</h3>
                <div className="grid grid-cols-1 gap-2">
                  <FieldText
                    label="CTA Title"
                    value={parsed.cta?.title || ''}
                    onChange={(v) => updateCta('title', v)}
                    testId="importer-cta-title"
                  />
                  <FieldText
                    label="CTA Text"
                    value={parsed.cta?.text || ''}
                    onChange={(v) => updateCta('text', v)}
                    testId="importer-cta-text"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldText
                      label="Button"
                      value={parsed.cta?.button || ''}
                      onChange={(v) => updateCta('button', v)}
                      testId="importer-cta-button"
                    />
                    <FieldText
                      label="URL"
                      value={parsed.cta?.url || ''}
                      onChange={(v) => updateCta('url', v)}
                      testId="importer-cta-url"
                    />
                  </div>
                </div>
              </div>

              <FieldText
                label="Featured Image Alt"
                value={parsed.featuredImageAlt}
                onChange={(v) => updateField('featuredImageAlt', v)}
                testId="importer-field-featured-alt"
              />

              <SchemaEditor
                label="FAQ Schema (JSON-LD)"
                value={parsed.faqSchema}
                onChange={(obj, err) =>
                  setParsed((p) =>
                    p ? { ...p, faqSchema: obj, faqSchemaError: err } : p,
                  )
                }
                error={parsed.faqSchemaError}
                testId="importer-field-faq-schema"
              />
              <SchemaEditor
                label="Article Schema (JSON-LD)"
                value={parsed.articleSchema}
                onChange={(obj, err) =>
                  setParsed((p) =>
                    p ? { ...p, articleSchema: obj, articleSchemaError: err } : p,
                  )
                }
                error={parsed.articleSchemaError}
                testId="importer-field-article-schema"
              />

              {/* Image assets mapping (only when assets declared) */}
              {parsed.imageAssets.length > 0 && (
                <div className="border-t border-slate-200 pt-4" data-testid="importer-image-mapping">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-teal-500" />
                    Image Assets ({parsed.imageAssets.length})
                  </h3>

                  {/* ZIP cross-validation */}
                  {zipFiles.size > 0 && (
                    <div className="space-y-2 mb-3">
                      {zipValidation.missing.map((m) => (
                        <div
                          key={`miss-${m}`}
                          className="flex items-start gap-2 text-xs bg-red-50 text-red-700 border border-red-100 rounded-lg p-2"
                          data-testid="importer-zip-missing"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>
                            Файл <code className="font-mono">{m}</code> е в IMAGE_ASSETS, но липсва в /images.
                          </span>
                        </div>
                      ))}
                      {zipValidation.orphans.map((o) => (
                        <div
                          key={`orph-${o}`}
                          className="flex items-start gap-2 text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-lg p-2"
                          data-testid="importer-zip-orphan"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>
                            Файл <code className="font-mono">{o}</code> е в /images, но не е в IMAGE_ASSETS.
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {parsed.imageAssets.map((a, i) => {
                      const inZip = zipFiles.has(a.fileName)
                      const placement = (a.placement || '').toLowerCase()
                      const explicitPh = (a.placeholder || '').trim()
                      const hasExplicitPh = explicitPh.length > 0 && parsed.contentMarkdown.includes(explicitPh)
                      const hasGenericPh = parsed.contentMarkdown.includes(`{{image:${a.type}}}`)
                      const hasPh = hasExplicitPh || hasGenericPh
                      let bodyState: { label: string; cls: string }
                      if (placement === 'featured_image') {
                        // Featured image is NEVER inserted into body, even with a placeholder
                        bodyState = hasPh
                          ? { label: 'featured (placeholder премахнат от тялото)', cls: 'bg-purple-100 text-purple-700' }
                          : { label: 'само featured (не в тялото)', cls: 'bg-purple-100 text-purple-700' }
                      } else if (placement === 'social_only') {
                        bodyState = { label: 'само социална (не в тялото)', cls: 'bg-slate-100 text-slate-600' }
                      } else if (hasExplicitPh) {
                        bodyState = { label: `placeholder ${explicitPh}`, cls: 'bg-emerald-100 text-emerald-700' }
                      } else if (hasGenericPh) {
                        bodyState = { label: `placeholder {{image:${a.type}}}`, cls: 'bg-emerald-100 text-emerald-700' }
                      } else if (['after_intro','after_first_h2','hygiene_section','braces_aligners_section','before_faq'].includes(placement)) {
                        bodyState = { label: `авто-вмъкване (${placement})`, cls: 'bg-emerald-100 text-emerald-700' }
                      } else {
                        bodyState = { label: 'няма placement → пропусната', cls: 'bg-amber-100 text-amber-700' }
                      }
                      const snippet = `<figure class="article-image article-image-${a.type}"><img src="[uploadedUrl]" alt="${a.alt}"${a.title ? ` title="${a.title}"` : ''} loading="lazy" />${a.caption ? `<figcaption>${a.caption}</figcaption>` : ''}</figure>`
                      return (
                        <div
                          key={`asset-${i}`}
                          className="border border-slate-200 rounded-lg p-2.5 text-xs"
                          data-testid={`importer-asset-${i}`}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                              {a.type || '—'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 text-[10px]">
                              {a.placement || '—'}
                            </span>
                            {zipFiles.size > 0 && (
                              <span
                                className={
                                  inZip
                                    ? 'px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px]'
                                    : 'px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px]'
                                }
                              >
                                {inZip ? '✓ намерен' : '✗ липсва'}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] ${bodyState.cls}`}>
                              {bodyState.label}
                            </span>
                          </div>
                          <div className="font-mono text-slate-600 truncate">{a.fileName}</div>
                          {a.alt && <div className="text-slate-500 mt-0.5 line-clamp-1">Alt: {a.alt}</div>}
                          <details className="mt-1.5">
                            <summary className="text-slate-400 cursor-pointer hover:text-slate-600 text-[11px]">
                              Финален HTML
                            </summary>
                            <pre className="mt-1 p-2 bg-slate-50 border border-slate-100 rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">{snippet}</pre>
                          </details>
                        </div>
                      )
                    })}
                  </div>

                  {zipFiles.size > 0 && (
                    <button
                      type="button"
                      onClick={handleZipImport}
                      disabled={
                        isImportingZip ||
                        zipValidation.missing.length > 0 ||
                        !parsed.title ||
                        !parsed.slug
                      }
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="importer-zip-import-btn"
                    >
                      {isImportingZip ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Package className="w-4 h-4" />
                      )}
                      {isImportingZip ? zipImportProgress || 'Импортиране…' : 'Импорт от ZIP като чернова'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {parsed && (
            <div className="mt-6 pt-6 border-t border-slate-200 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setShowTestRender(true)}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-teal-300 bg-teal-50 text-teal-700 font-medium hover:bg-teal-100"
                data-testid="importer-test-render-btn"
              >
                <Eye className="w-4 h-4" />
                Test Render
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving !== null}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
                data-testid="importer-save-draft-btn"
              >
                {isSaving === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Запази като чернова
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving !== null || (validation && !validation.ok) || false}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-teal-500 text-white font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="importer-publish-btn"
              >
                {isSaving === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Публикувай
              </button>
              {savedMessage && (
                <span className="text-sm text-slate-700" data-testid="importer-save-message">
                  {savedMessage}
                </span>
              )}
            </div>
          )}
        </section>
      </div>
      {parsed && (
        <TestRenderModal
          open={showTestRender}
          onClose={() => setShowTestRender(false)}
          parsed={parsed}
          rawMd={rawMd}
          zipBlobs={zipFiles}
        />
      )}
    </main>
  )
}

// ─── Field components ─────────────────────────────────────────────

function FieldText(props: {
  label: string
  value: string
  onChange: (v: string) => void
  hasError?: boolean
  testId?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{props.label}</label>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          props.hasError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-500/30'
        }`}
        data-testid={props.testId}
      />
    </div>
  )
}

function FieldTextArea(props: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  hasError?: boolean
  testId?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{props.label}</label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        rows={props.rows || 3}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          props.hasError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-500/30'
        }`}
        data-testid={props.testId}
      />
    </div>
  )
}

function FaqEditor(props: { items: ParsedFaqItem[]; onChange: (v: ParsedFaqItem[]) => void }) {
  const update = (i: number, patch: Partial<ParsedFaqItem>) => {
    const next = props.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
    props.onChange(next)
  }
  const remove = (i: number) => props.onChange(props.items.filter((_, idx) => idx !== i))
  const add = () => props.onChange([...props.items, { q: '', a: '' }])
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">FAQ ({props.items.length})</h3>
        <button
          type="button"
          onClick={add}
          className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
          data-testid="importer-faq-add"
        >
          <Plus className="w-3 h-3" /> Добави
        </button>
      </div>
      <div className="space-y-2">
        {props.items.map((it, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Q{i + 1}</span>
              <input
                type="text"
                value={it.q}
                onChange={(e) => update(i, { q: e.target.value })}
                placeholder="Въпрос"
                className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                data-testid={`importer-faq-q-${i}`}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-1.5 text-slate-400 hover:text-red-500"
                data-testid={`importer-faq-remove-${i}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              value={it.a}
              onChange={(e) => update(i, { a: e.target.value })}
              placeholder="Отговор"
              rows={2}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
              data-testid={`importer-faq-a-${i}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function LinkEditor(props: {
  title: string
  items: ParsedLinkItem[]
  onChange: (v: ParsedLinkItem[]) => void
  placeholder: { label: string; url: string }
  testIdPrefix: string
}) {
  const update = (i: number, patch: Partial<ParsedLinkItem>) => {
    props.onChange(props.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  const remove = (i: number) => props.onChange(props.items.filter((_, idx) => idx !== i))
  const add = () => props.onChange([...props.items, { label: '', url: '' }])
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">{props.title}</h3>
        <button
          type="button"
          onClick={add}
          className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
          data-testid={`${props.testIdPrefix}-add`}
        >
          <Plus className="w-3 h-3" /> Добави
        </button>
      </div>
      <div className="space-y-2">
        {props.items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-center">
            <input
              type="text"
              value={it.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder={props.placeholder.label}
              className="border border-slate-200 rounded-md px-2 py-1.5 text-sm"
              data-testid={`${props.testIdPrefix}-label-${i}`}
            />
            <input
              type="text"
              value={it.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder={props.placeholder.url}
              className="border border-slate-200 rounded-md px-2 py-1.5 text-sm font-mono"
              data-testid={`${props.testIdPrefix}-url-${i}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1.5 text-slate-400 hover:text-red-500"
              data-testid={`${props.testIdPrefix}-remove-${i}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SourceEditor(props: {
  items: ParsedSourceItem[]
  onChange: (v: ParsedSourceItem[]) => void
}) {
  const update = (i: number, patch: Partial<ParsedSourceItem>) => {
    props.onChange(props.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  const remove = (i: number) => props.onChange(props.items.filter((_, idx) => idx !== i))
  const add = () => props.onChange([...props.items, { title: '', url: '' }])
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">
          Външни клинични източници ({props.items.length})
        </h3>
        <button
          type="button"
          onClick={add}
          className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
          data-testid="importer-source-add"
        >
          <Plus className="w-3 h-3" /> Добави
        </button>
      </div>
      <div className="space-y-2">
        {props.items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-center">
            <input
              type="text"
              value={it.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="AAO"
              className="border border-slate-200 rounded-md px-2 py-1.5 text-sm"
              data-testid={`importer-source-title-${i}`}
            />
            <input
              type="text"
              value={it.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://..."
              className="border border-slate-200 rounded-md px-2 py-1.5 text-sm font-mono"
              data-testid={`importer-source-url-${i}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1.5 text-slate-400 hover:text-red-500"
              data-testid={`importer-source-remove-${i}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SchemaEditor(props: {
  label: string
  value: object | null
  onChange: (obj: object | null, err?: string) => void
  error?: string
  testId?: string
}) {
  const [text, setText] = useState(() => (props.value ? JSON.stringify(props.value, null, 2) : ''))

  // When parent loads new parsed data, sync local text once.
  useEffect(() => {
    setText(props.value ? JSON.stringify(props.value, null, 2) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value])

  const handleChange = (v: string) => {
    setText(v)
    if (!v.trim()) {
      props.onChange(null, undefined)
      return
    }
    try {
      const parsed = JSON.parse(v)
      props.onChange(parsed, undefined)
    } catch (e) {
      props.onChange(null, e instanceof Error ? e.message : 'invalid')
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{props.label}</label>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={4}
        className={`w-full font-mono text-xs border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
          props.error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-500/30'
        }`}
        data-testid={props.testId}
      />
      {props.error && (
        <p className="text-xs text-red-600 mt-1">JSON грешка: {props.error}</p>
      )}
    </div>
  )
}
