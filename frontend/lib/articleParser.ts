/**
 * Zubite.bg Article Package Parser
 *
 * Parses a structured Markdown article package into a typed object.
 * System sections are delimited by HTML comments so the article body itself
 * can contain any markdown headings (#, ##, ###) without confusing the parser.
 *
 * Format:
 *
 *   <!-- ARTICLE_META -->
 *   Title: ...
 *   SEO Title: ...
 *   Meta Description: ...
 *   Excerpt: ...
 *   Slug: ...
 *   Category: ...
 *   Tags: tag1, tag2
 *   Author: ...
 *   Language: bg
 *   Status: draft|published
 *
 *   <!-- ARTICLE_BODY_START -->
 *   # Free-form markdown
 *   ## any subheadings allowed
 *   <!-- ARTICLE_BODY_END -->
 *
 *   <!-- FAQ -->
 *   Q: ...
 *   A: ...
 *
 *   <!-- INTERNAL_LINKS -->
 *   - Label: ...
 *     URL: ...
 *
 *   <!-- EXTERNAL_SOURCES -->
 *   - Title: ...
 *     URL: ...
 *
 *   <!-- CTA_BLOCK -->
 *   Title: ...
 *   Text: ...
 *   Button: ...
 *   URL: ...
 *   Type: ...
 *
 *   <!-- IMAGE_ALT_TEXTS -->
 *   Featured Image Alt: ...
 *   - Alt: ...
 *
 *   <!-- FAQ_SCHEMA_JSON_LD -->
 *   {...}
 *
 *   <!-- ARTICLE_SCHEMA_JSON_LD -->
 *   {...}
 *
 * The parser is tolerant of extra whitespace and case-insensitive on key
 * labels, but the section markers must be `<!-- NAME -->` (uppercase + underscore).
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
  excerpt: string
  slug: string
  category: string
  tags: string[]
  author: string
  reviewedBy: string
  lastReviewed: string
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
  /** Names of sections that were not found in the source. */
  missingSections: string[]
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

const FLAT_SECTIONS = [
  'ARTICLE_META',
  'FAQ',
  'INTERNAL_LINKS',
  'EXTERNAL_SOURCES',
  'CTA_BLOCK',
  'IMAGE_ALT_TEXTS',
  'FAQ_SCHEMA_JSON_LD',
  'ARTICLE_SCHEMA_JSON_LD',
] as const

type SectionMap = Record<string, string>

/**
 * Find the content for a section delimited by `<!-- NAME -->` (next-marker
 * stops the section, end-of-string is also a valid stop).
 *
 * Whitespace inside the marker (e.g. `<!--   NAME   -->`) is tolerated.
 */
function findFlatSection(raw: string, name: string): string | null {
  const startRegex = new RegExp(`<!--\\s*${name}\\s*-->`, 'i')
  const startMatch = raw.match(startRegex)
  if (!startMatch || startMatch.index === undefined) return null
  const startIdx = startMatch.index + startMatch[0].length
  // Find the next ANY system marker after this one
  const tail = raw.slice(startIdx)
  const nextMarker = tail.match(/<!--\s*[A-Z_]+(?:_START|_END)?\s*-->/i)
  const endIdx = nextMarker && nextMarker.index !== undefined ? nextMarker.index : tail.length
  return tail.slice(0, endIdx).trim()
}

/**
 * Find the article body between `<!-- ARTICLE_BODY_START -->` and
 * `<!-- ARTICLE_BODY_END -->`. Returns null when either marker is missing.
 */
function findBodySection(raw: string): string | null {
  const start = raw.match(/<!--\s*ARTICLE_BODY_START\s*-->/i)
  const end = raw.match(/<!--\s*ARTICLE_BODY_END\s*-->/i)
  if (!start || !end || start.index === undefined || end.index === undefined) return null
  if (end.index < start.index) return null
  const startIdx = start.index + start[0].length
  return raw.slice(startIdx, end.index).trim()
}

/**
 * Build the section map from raw markdown.
 */
function splitSections(raw: string): { sections: SectionMap; missing: string[] } {
  const sections: SectionMap = {}
  const missing: string[] = []

  for (const name of FLAT_SECTIONS) {
    const content = findFlatSection(raw, name)
    if (content === null) missing.push(name)
    else sections[name] = content
  }

  const body = findBodySection(raw)
  if (body === null) missing.push('ARTICLE_BODY')
  else sections.ARTICLE_BODY = body

  return { sections, missing }
}

/**
 * Parse a section body that contains Key: Value pairs (multi-line values
 * supported up to next Key: line).
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
      currentBlock.push(line.replace(/^\s*-\s+/, ''))
    } else if (currentBlock.length > 0) {
      currentBlock.push(line.trim())
    }
  }
  flush()
  return items
}

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
  const { sections, missing } = splitSections(raw)

  const meta = parseKeyValue(sections.ARTICLE_META || '')
  const body = sections.ARTICLE_BODY || ''
  const faqRaw = sections.FAQ || ''
  const internal = parseItemList(sections.INTERNAL_LINKS || '')
  const external = parseItemList(sections.EXTERNAL_SOURCES || '')
  const ctaRaw = parseKeyValue(sections.CTA_BLOCK || '')
  const imageAlts = parseImageAlts(sections.IMAGE_ALT_TEXTS || '')
  const faqSchemaParsed = tryParseJson(sections.FAQ_SCHEMA_JSON_LD || '')
  const articleSchemaParsed = tryParseJson(sections.ARTICLE_SCHEMA_JSON_LD || '')

  // FAQ — pairs of "Q: ..." and "A: ..."
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
    if (!cta.title && !cta.text && !cta.button && !cta.url && !cta.type) cta = null
  }

  return {
    title: meta.title || '',
    seoTitle: meta['seo title'] || meta.seotitle || '',
    metaDescription: meta['meta description'] || meta.metadescription || '',
    excerpt: meta.excerpt || '',
    slug: meta.slug || '',
    category: meta.category || 'orthodontics',
    tags: parseTags(meta.tags || ''),
    author: meta.author || '',
    reviewedBy: meta['reviewed by'] || meta.reviewedby || '',
    lastReviewed: meta['last reviewed'] || meta.lastreviewed || '',
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
    missingSections: missing,
  }
}

/**
 * Validate parsed article. Critical = blocks publish. Warning = allowed.
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

  // Friendly warning per missing section so the user knows where to look.
  for (const name of a.missingSections) {
    warnings.push(`Секция <!-- ${name} --> липсва в подадения markdown.`)
  }

  return { ok: errors.length === 0, errors, warnings }
}

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
