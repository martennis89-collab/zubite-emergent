'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Upload, FileText, Save, Send, AlertTriangle, CheckCircle2,
  Plus, Trash2, Eye, Loader2, Sparkles,
} from 'lucide-react'
import {
  parseArticlePackage,
  validateArticle,
  generateSlug,
  ParsedArticle,
  ParsedFaqItem,
  ParsedLinkItem,
  ParsedSourceItem,
  ParsedCta,
} from '@/lib/articleParser'

const TEMPLATE = `# ZUBITE_ARTICLE_PACKAGE

## ARTICLE_META
Title: Заглавие на статията
SEO Title: До 60 символа за Google
Meta Description: До 155 символа описание за SERP-а
Slug: zaglavie-na-statiyata
Category: orthodontics
Tags: алайнери, ортодонтия, зъби
Author: Zubite.bg редакция
Language: bg
Status: draft

## ARTICLE_BODY
Тук започва markdown съдържанието на статията.

## Подзаглавие
Параграфи и обяснения.

## FAQ
Q: Първи въпрос?
A: Отговор на първия въпрос.

Q: Втори въпрос?
A: Отговор на втория въпрос.

## INTERNAL_LINKS
- Label: Какво е Инвизалайн
  URL: /what-is-invisalign

- Label: Цени на импланти
  URL: /implant-price

## EXTERNAL_SOURCES
- Title: AAO — American Association of Orthodontists
  URL: https://www.aaoinfo.org

## CTA_BLOCK
Title: Готови ли сте за първата стъпка?
Text: Направете безплатен тест за 60 секунди.
Button: Започнете теста
URL: /quiz
Type: primary

## IMAGE_ALT_TEXTS
Featured Image Alt: Описание на главното изображение
- Alt: Алт текст 1
- Alt: Алт текст 2

## FAQ_SCHEMA_JSON_LD
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": []
}

## ARTICLE_SCHEMA_JSON_LD
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
  const [token, setToken] = useState<string | null>(null)
  const [rawMd, setRawMd] = useState('')
  const [parsed, setParsed] = useState<ParsedArticle | null>(null)
  const [parseError, setParseError] = useState<string>('')
  const [isSaving, setIsSaving] = useState<'draft' | 'publish' | null>(null)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('admin_token')
    if (!t) {
      router.push('/admin')
      return
    }
    setToken(t)
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
    if (!parsed || !token) return
    setSavedMessage('')

    if (publish && validation && !validation.ok) {
      setSavedMessage('❌ Не може да се публикува: ' + validation.errors.join(' '))
      return
    }

    setIsSaving(publish ? 'publish' : 'draft')

    const payload = {
      title: parsed.title,
      slug: parsed.slug,
      excerpt: parsed.metaDescription || parsed.title.slice(0, 160),
      content: parsed.contentMarkdown,
      featured_image: null,
      category: parsed.category,
      tags: parsed.tags,
      meta_title: parsed.seoTitle,
      meta_description: parsed.metaDescription,
      is_published: publish,
      seo_title: parsed.seoTitle,
      language: parsed.language || 'bg',
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSavedMessage(`❌ Грешка: ${err.detail || res.statusText}`)
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

  if (!token) return null

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm"
            data-testid="importer-back-link"
          >
            <ArrowLeft className="w-4 h-4" /> Назад към блога
          </Link>
          <h1 className="font-serif text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            Импортиране на статия
          </h1>
          <div className="w-32" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Input */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Структуриран Markdown</h2>
            <div className="flex items-center gap-2">
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
            className="w-full h-[480px] font-mono text-sm border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            data-testid="importer-textarea"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleParse}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-sky-500 text-white font-medium hover:bg-sky-600 transition-colors"
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
            </div>
          )}

          {parsed && (
            <div className="mt-6 pt-6 border-t border-slate-200 flex items-center gap-3 flex-wrap">
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
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-sky-500 text-white font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
          props.hasError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-sky-500/30'
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
          props.hasError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-sky-500/30'
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
          props.error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-sky-500/30'
        }`}
        data-testid={props.testId}
      />
      {props.error && (
        <p className="text-xs text-red-600 mt-1">JSON грешка: {props.error}</p>
      )}
    </div>
  )
}
