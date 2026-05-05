/**
 * Zubite.bg Article Package Parser
 *
 * Parses a structured Markdown article package into a typed object.
 * Format spec:
 *
 *   # ZUBITE_ARTICLE_PACKAGE
 *
 *   ## ARTICLE_META
 *   Title: ...
 *   SEO Title: ...
 *   Meta Description: ...
 *   Slug: ...
 *   Category: ...
 *   Tags: tag1, tag2
 *   Author: ...
 *   Language: bg
 *   Status: draft|published
 *
 *   ## ARTICLE_BODY
 *   <markdown body>
 *
 *   ## FAQ
 *   Q: ...
 *   A: ...
 *
 *   ## INTERNAL_LINKS
 *   - Label: ...
 *     URL: ...
 *
 *   ## EXTERNAL_SOURCES
 *   - Title: ...
 *     URL: ...
 *
 *   ## CTA_BLOCK
 *   Title: ...
 *   Text: ...
 *   Button: ...
 *   URL: ...
 *   Type: ...
 *
 *   ## IMAGE_ALT_TEXTS
 *   Featured Image Alt: ...
 *   - Alt: ...
 *
 *   ## FAQ_SCHEMA_JSON_LD
 *   {...}
 *
 *   ## ARTICLE_SCHEMA_JSON_LD
 *   {...}
 *
 * The parser is tolerant to extra whitespace and case-insensitive on key
 * labels, but the section headings must be present exactly as `## SECTION_NAME`.
 */

export interface ParsedFaqItem {
  q: string
  a: string
}

export interface ParsedLinkItem {
  label: string
  url: string
}

export interface ParsedSourceItem {
  title: string
  url: string
}

export interface ParsedCta {
  title?: string
  text?: string
  button?: string
  url?: string
  type?: string
}

export interface ParsedArticle {
  title: string
  seoTitle: string
  metaDescription: string
  slug: string
  category: string
  tags: string[]
  author: string
  language: string
  status: string
  contentMarkdown: string
  faq: ParsedFaqItem[]
  internalLinks: ParsedLinkItem[]
  externalSources: ParsedSourceItem[]
  cta: ParsedCta | null
  featuredImageAlt: string
  imageAltTexts: string[]
  faqSchema: object | null
  articleSchema: object | null
  faqSchemaError?: string
  articleSchemaError?: string
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

const SECTION_HEADERS = [
  'ARTICLE_META',
  'ARTICLE_BODY',
  'FAQ',
  'INTERNAL_LINKS',
  'EXTERNAL_SOURCES',
  'CTA_BLOCK',
  'IMAGE_ALT_TEXTS',
  'FAQ_SCHEMA_JSON_LD',
  'ARTICLE_SCHEMA_JSON_LD',
] as const

/**
 * Split the raw markdown into a map of {sectionName: rawContent}.
 */
function splitSections(raw: string): Record<string, string> {
  const lines = raw.split(/\r?\n/)
  const sections: Record<string, string> = {}
  let currentName: string | null = null
  let buffer: string[] = []

  const headerRegex = /^##\s+([A-Z_]+)\s*$/

  for (const line of lines) {
    const m = line.match(headerRegex)
    if (m && SECTION_HEADERS.includes(m[1] as (typeof SECTION_HEADERS)[number])) {
      if (currentName) {
        sections[currentName] = buffer.join('\n').trim()
      }
      currentName = m[1]
      buffer = []
    } else {
      if (currentName) buffer.push(line)
    }
  }
  if (currentName) {
    sections[currentName] = buffer.join('\n').trim()
  }
  return sections
}

/**
 * Parse a section body that contains Key: Value pairs (multi-line values
 * supported up to next Key: line or blank line).
 */
function parseKeyValue(body: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!body) return result
  const lines = body.split(/\r?\n/)
  let currentKey: string | null = null
  let currentVal: string[] = []
  const keyRegex = /^([A-Za-z][A-Za-z0-9 _-]*?)\s*:\s*(.*)$/

  const flush = () => {
    if (currentKey) {
      result[currentKey.toLowerCase()] = currentVal.join('\n').trim()
    }
  }

  for (const line of lines) {
    const m = line.match(keyRegex)
    if (m) {
      flush()
      currentKey = m[1].trim()
      currentVal = m[2] ? [m[2]] : []
    } else if (currentKey) {
      currentVal.push(line)
    }
  }
  flush()
  return result
}

function parseTags(raw: string): string[] {
  if (!raw) return []
  return raw
    .split(/[,;\n]/)
    .map((t) => t.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
}

/**
 * Parse a section that lists items with leading `-` markers, each
 * containing one or more Key: Value pairs.
 *
 *   - Label: Foo
 *     URL: https://...
 *   - Label: Bar
 *     URL: https://...
 */
function parseItemList(body: string): Record<string, string>[] {
  if (!body) return []
  const items: Record<string, string>[] = []
  const lines = body.split(/\r?\n/)
  let currentBlock: string[] = []
  const flush = () => {
    if (currentBlock.length === 0) return
    const block = currentBlock.join('\n')
    const kv = parseKeyValue(block)
    if (Object.keys(kv).length > 0) items.push(kv)
    currentBlock = []
  }
  for (const rawLine of lines) {
    const line = rawLine
    if (/^\s*-\s+/.test(line)) {
      flush()
      // Strip the leading "- " so the first key is parseable.
      currentBlock.push(line.replace(/^\s*-\s+/, ''))
    } else if (currentBlock.length > 0) {
      currentBlock.push(line.trim())
    }
  }
  flush()
  return items
}

/**
 * Parse the IMAGE_ALT_TEXTS section. Has both a top-level "Featured Image Alt: ..."
 * and a list of "- Alt: ..." entries.
 */
function parseImageAlts(body: string): { featured: string; alts: string[] } {
  if (!body) return { featured: '', alts: [] }
  const lines = body.split(/\r?\n/)
  let featured = ''
  const alts: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    const featuredMatch = trimmed.match(/^Featured\s+Image\s+Alt\s*:\s*(.*)$/i)
    if (featuredMatch) {
      featured = featuredMatch[1].trim()
      continue
    }
    const altMatch = trimmed.match(/^-\s*Alt\s*:\s*(.*)$/i)
    if (altMatch) {
      alts.push(altMatch[1].trim())
    }
  }
  return { featured, alts }
}

function tryParseJson(body: string): { value: object | null; error?: string } {
  if (!body) return { value: null }
  // Strip code-fence wrappers ```json ... ```
  let cleaned = body.trim()
  cleaned = cleaned.replace(/^```(?:json|JSON|json-ld)?\s*/i, '')
  cleaned = cleaned.replace(/```\s*$/i, '')
  cleaned = cleaned.trim()
  if (!cleaned) return { value: null }
  try {
    const parsed = JSON.parse(cleaned)
    if (typeof parsed !== 'object' || parsed === null) {
      return { value: null, error: 'JSON-LD трябва да е обект.' }
    }
    return { value: parsed }
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : 'Невалиден JSON' }
  }
}

export function parseArticlePackage(raw: string): ParsedArticle {
  // Strip the optional "# ZUBITE_ARTICLE_PACKAGE" header
  const cleaned = raw.replace(/^#\s+ZUBITE_ARTICLE_PACKAGE\s*$/im, '').trim()
  const sections = splitSections(cleaned)

  const meta = parseKeyValue(sections.ARTICLE_META || '')
  const body = sections.ARTICLE_BODY || ''
  const faqRaw = sections.FAQ || ''
  const internal = parseItemList(sections.INTERNAL_LINKS || '')
  const external = parseItemList(sections.EXTERNAL_SOURCES || '')
  const ctaRaw = parseKeyValue(sections.CTA_BLOCK || '')
  const imageAlts = parseImageAlts(sections.IMAGE_ALT_TEXTS || '')
  const faqSchemaParsed = tryParseJson(sections.FAQ_SCHEMA_JSON_LD || '')
  const articleSchemaParsed = tryParseJson(sections.ARTICLE_SCHEMA_JSON_LD || '')

  // FAQ — "Q: ...\nA: ..." pairs
  const faq: ParsedFaqItem[] = []
  if (faqRaw) {
    const blocks = faqRaw.split(/\n\s*\n/)
    for (const block of blocks) {
      const qMatch = block.match(/^Q\s*:\s*([\s\S]*?)(?=^A\s*:|$)/im)
      const aMatch = block.match(/^A\s*:\s*([\s\S]*)$/im)
      if (qMatch && aMatch) {
        const q = qMatch[1].trim()
        const a = aMatch[1].trim()
        if (q && a) faq.push({ q, a })
      }
    }
  }

  // CTA
  let cta: ParsedCta | null = null
  if (Object.keys(ctaRaw).length > 0) {
    cta = {
      title: ctaRaw.title || undefined,
      text: ctaRaw.text || undefined,
      button: ctaRaw.button || undefined,
      url: ctaRaw.url || undefined,
      type: ctaRaw.type || undefined,
    }
    // If all values are empty strings → treat as null
    if (!cta.title && !cta.text && !cta.button && !cta.url && !cta.type) cta = null
  }

  return {
    title: meta.title || '',
    seoTitle: meta['seo title'] || meta.seotitle || '',
    metaDescription: meta['meta description'] || meta.metadescription || '',
    slug: meta.slug || '',
    category: meta.category || 'orthodontics',
    tags: parseTags(meta.tags || ''),
    author: meta.author || '',
    language: meta.language || 'bg',
    status: (meta.status || 'draft').toLowerCase(),
    contentMarkdown: body,
    faq,
    internalLinks: internal
      .map((i) => ({ label: i.label || '', url: i.url || '' }))
      .filter((i) => i.label && i.url),
    externalSources: external
      .map((i) => ({ title: i.title || '', url: i.url || '' }))
      .filter((i) => i.title && i.url),
    cta,
    featuredImageAlt: imageAlts.featured,
    imageAltTexts: imageAlts.alts,
    faqSchema: faqSchemaParsed.value,
    articleSchema: articleSchemaParsed.value,
    faqSchemaError: faqSchemaParsed.error,
    articleSchemaError: articleSchemaParsed.error,
  }
}

/**
 * Validate parsed article. Critical = blocks publish. Warning = allowed.
 * If `requirePublish=false`, criticals are still reported but the caller
 * can choose to save as draft anyway.
 */
export function validateArticle(a: ParsedArticle): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!a.title || a.title.trim().length === 0) errors.push('Заглавие (Title) е задължително.')
  if (!a.slug || a.slug.trim().length === 0) errors.push('Slug е задължителен.')
  if (!a.category || a.category.trim().length === 0) errors.push('Категория е задължителна.')
  if (!a.contentMarkdown || a.contentMarkdown.trim().length === 0)
    errors.push('Тяло на статията е задължително.')
  if (!a.seoTitle || a.seoTitle.trim().length === 0)
    errors.push('SEO заглавие е задължително за публикуване.')
  if (!a.metaDescription || a.metaDescription.trim().length === 0)
    errors.push('Meta Description е задължително за публикуване.')

  if (a.seoTitle && a.seoTitle.length > 60)
    errors.push(`SEO заглавието е ${a.seoTitle.length} символа — трябва да е под 60.`)
  if (a.metaDescription && a.metaDescription.length > 155)
    errors.push(
      `Meta description е ${a.metaDescription.length} символа — трябва да е под 155.`,
    )

  if (a.faq.length < 5) warnings.push(`FAQ има ${a.faq.length} въпроса (препоръчително: поне 5).`)
  if (a.faqSchemaError) errors.push(`FAQ JSON-LD е невалиден: ${a.faqSchemaError}`)
  if (a.articleSchemaError) errors.push(`Article JSON-LD е невалиден: ${a.articleSchemaError}`)
  if (!a.cta) warnings.push('CTA блок липсва.')
  if (!a.featuredImageAlt) warnings.push('Featured image alt текст липсва.')
  if (a.internalLinks.length < 2)
    warnings.push(`Препоръчителни са поне 2 вътрешни връзки (имате ${a.internalLinks.length}).`)
  if (a.externalSources.length < 1)
    warnings.push('Препоръчителен е поне 1 външен клиничен източник.')

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * Slug-ify Bulgarian text (transliteration).
 */
const cyrillicToLatin: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: '',
  ю: 'yu', я: 'ya',
}

export function generateSlug(title: string): string {
  const lower = title.toLowerCase()
  const transliterated = lower
    .split('')
    .map((c) => (cyrillicToLatin[c] !== undefined ? cyrillicToLatin[c] : c))
    .join('')
  return transliterated
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
