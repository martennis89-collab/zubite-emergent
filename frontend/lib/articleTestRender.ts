/**
 * Pre-publish "Test Render" validation for the article importer.
 *
 * Runs structural + semantic checks on top of the existing
 * `validateArticle()` and reports HARD ERRORS (block publish) vs WARNINGS
 * (allow save). The checks here are intentionally focused on what a human
 * reviewer would otherwise have to eyeball before hitting publish.
 *
 * Reuses the existing parser output — does NOT introduce a second parser.
 */

import type { ParsedArticle } from './articleParser'

export interface TestRenderCheck {
  id: string
  label: string
  status: 'pass' | 'fail' | 'warn'
  detail?: string
}

export interface TestRenderReport {
  checks: TestRenderCheck[]
  errors: string[]
  warnings: string[]
  ok: boolean
}

const SECTIONS_REQUIRED = ['ARTICLE_META', 'FAQ', 'CTA_BLOCK', 'IMAGE_ASSETS']

/**
 * Find every `{{image:xxx}}` placeholder occurrence in the body, plus any
 * exact custom Placeholder strings declared on IMAGE_ASSETS.
 */
function listGenericTokens(body: string): string[] {
  const re = /\{\{\s*image\s*:\s*([A-Za-z0-9_-]+)\s*\}\}/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    out.push(`{{image:${m[1]}}}`)
  }
  return out
}

export function validateTestRender(parsed: ParsedArticle, rawMd: string): TestRenderReport {
  const checks: TestRenderCheck[] = []
  const errors: string[] = []
  const warnings: string[] = []

  // ── 1. ARTICLE_META exists ──────────────────────────────────────
  {
    const missing = parsed.missingSections.includes('ARTICLE_META')
    checks.push({
      id: 'meta',
      label: 'ARTICLE_META секция съществува',
      status: missing ? 'fail' : 'pass',
    })
    if (missing) errors.push('Липсва секция <!-- ARTICLE_META -->.')
  }

  // ── 2. ARTICLE_BODY_START + END exist ──────────────────────────
  {
    const hasStart = /<!--\s*ARTICLE_BODY_START\s*-->/i.test(rawMd)
    const hasEnd = /<!--\s*ARTICLE_BODY_END\s*-->/i.test(rawMd)
    const ok = hasStart && hasEnd
    checks.push({
      id: 'body-markers',
      label: 'ARTICLE_BODY_START / ARTICLE_BODY_END са налични',
      status: ok ? 'pass' : 'fail',
      detail: ok ? undefined : `start: ${hasStart ? '✓' : '✗'}, end: ${hasEnd ? '✓' : '✗'}`,
    })
    if (!ok) errors.push('Маркерите на тялото на статията липсват.')
  }

  // ── 3. FAQ has ≥ 5 pairs ───────────────────────────────────────
  {
    const missing = parsed.missingSections.includes('FAQ')
    const count = parsed.faq.length
    if (missing) {
      checks.push({ id: 'faq', label: 'FAQ секция съществува', status: 'fail' })
      errors.push('Липсва секция <!-- FAQ -->.')
    } else if (count < 5) {
      checks.push({
        id: 'faq',
        label: `FAQ има поне 5 двойки Q/A (има ${count})`,
        status: 'warn',
      })
      warnings.push(`FAQ има ${count} двойки — препоръчително поне 5.`)
    } else {
      checks.push({
        id: 'faq',
        label: `FAQ има поне 5 двойки Q/A (има ${count})`,
        status: 'pass',
      })
    }
  }

  // ── 4. CTA_BLOCK exists & populated ─────────────────────────────
  {
    const hasCta = !!parsed.cta && !!(parsed.cta.title || parsed.cta.text || parsed.cta.button)
    const sectionMissing = parsed.missingSections.includes('CTA_BLOCK')
    if (sectionMissing || !hasCta) {
      checks.push({ id: 'cta', label: 'CTA_BLOCK секция съществува', status: 'warn' })
      warnings.push('CTA_BLOCK липсва или е празен — ще се покаже общия CTA.')
    } else {
      checks.push({ id: 'cta', label: 'CTA_BLOCK секция съществува', status: 'pass' })
    }
  }

  // ── 5. IMAGE_ASSETS exists ──────────────────────────────────────
  {
    const missing = parsed.missingSections.includes('IMAGE_ASSETS')
    checks.push({
      id: 'image-assets',
      label: 'IMAGE_ASSETS секция съществува',
      status: missing ? 'fail' : 'pass',
    })
    if (missing) errors.push('Липсва секция <!-- IMAGE_ASSETS -->.')
  }

  const body = parsed.contentMarkdown || ''
  const supports = parsed.imageAssets.filter(
    (a) => (a.placement || '').toLowerCase() !== 'featured_image' &&
           (a.type || '').toLowerCase() !== 'featured',
  )
  const featured = parsed.imageAssets.find(
    (a) => (a.placement || '').toLowerCase() === 'featured_image' ||
           (a.type || '').toLowerCase() === 'featured',
  )

  // ── 6. Every support image with Placeholder has matching token ──
  {
    const orphanPlaceholders: string[] = []
    for (const a of supports) {
      const ph = (a.placeholder || '').trim()
      if (!ph) continue
      if (!body.includes(ph)) orphanPlaceholders.push(`${a.fileName} → ${ph}`)
    }
    if (orphanPlaceholders.length > 0) {
      checks.push({
        id: 'placeholders-resolve',
        label: 'Всеки IMAGE_ASSETS Placeholder има съответен токен в тялото',
        status: 'fail',
        detail: orphanPlaceholders.join('; '),
      })
      errors.push(
        `Декларирани Placeholder-и без токен в тялото: ${orphanPlaceholders.join(', ')}.`,
      )
    } else {
      checks.push({
        id: 'placeholders-resolve',
        label: 'Всеки IMAGE_ASSETS Placeholder има съответен токен в тялото',
        status: 'pass',
      })
    }
  }

  // ── 7. Every {{image:TYPE}} or explicit placeholder in body
  //       has a matching IMAGE_ASSETS entry ─────────────────────────
  {
    const explicitTokens = parsed.imageAssets
      .map((a) => (a.placeholder || '').trim())
      .filter(Boolean)
    const genericTokens = listGenericTokens(body)
    const knownTypes = new Set(
      parsed.imageAssets.map((a) => (a.type || '').toLowerCase()).filter(Boolean),
    )
    const orphanInBody: string[] = []
    for (const tok of genericTokens) {
      // tok looks like {{image:TYPE}}
      const t = tok.toLowerCase().match(/\{\{\s*image\s*:\s*([a-z0-9_-]+)\s*\}\}/)
      if (!t) continue
      const type = t[1]
      if (knownTypes.has(type)) continue
      // Maybe matches an explicit placeholder string (e.g. {{image:support_1}}
      // declared as full literal Placeholder)
      if (explicitTokens.some((p) => p.toLowerCase() === tok.toLowerCase())) continue
      orphanInBody.push(tok)
    }
    if (orphanInBody.length > 0) {
      checks.push({
        id: 'tokens-resolve',
        label: 'Всеки токен в тялото има съответен IMAGE_ASSETS запис',
        status: 'fail',
        detail: orphanInBody.join(', '),
      })
      errors.push(`Токени в тялото без IMAGE_ASSETS запис: ${orphanInBody.join(', ')}.`)
    } else {
      checks.push({
        id: 'tokens-resolve',
        label: 'Всеки токен в тялото има съответен IMAGE_ASSETS запис',
        status: 'pass',
      })
    }
  }

  // ── 8. No duplicate placeholders ───────────────────────────────
  {
    const dupSeen = new Map<string, number>()
    const all = listGenericTokens(body).map((t) => t.toLowerCase())
    // Also count explicit placeholders
    for (const a of parsed.imageAssets) {
      const ph = (a.placeholder || '').trim().toLowerCase()
      if (!ph) continue
      // Count occurrences of this exact literal in body
      const escaped = ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(escaped, 'g')
      const count = (body.match(re) || []).length
      if (count > 0) all.push(...Array(count).fill(ph))
    }
    for (const t of all) dupSeen.set(t, (dupSeen.get(t) || 0) + 1)
    const dups = [...dupSeen.entries()].filter(([, n]) => n > 1)
    if (dups.length > 0) {
      const list = dups.map(([t, n]) => `${t} ×${n}`).join(', ')
      checks.push({
        id: 'no-duplicates',
        label: 'Няма дублиращи се placeholders в тялото',
        status: 'warn',
        detail: list,
      })
      warnings.push(`Дублиращи се токени в тялото: ${list}. Ако това е умишлено, игнорирайте.`)
    } else {
      checks.push({
        id: 'no-duplicates',
        label: 'Няма дублиращи се placeholders в тялото',
        status: 'pass',
      })
    }
  }

  // ── 9. No unused IMAGE_ASSETS (support images only) ────────────
  {
    const unused: string[] = []
    for (const a of supports) {
      const ph = (a.placeholder || '').trim()
      const placement = (a.placement || '').toLowerCase()
      const type = (a.type || '').toLowerCase()
      const usedByExplicit = ph && body.includes(ph)
      const usedByGeneric = type && body.includes(`{{image:${type}}}`)
      const placeable = [
        'after_intro',
        'after_first_h2',
        'hygiene_section',
        'braces_aligners_section',
        'before_faq',
      ].includes(placement)
      const allowedUnused = placement === 'social_only'
      if (!usedByExplicit && !usedByGeneric && !placeable && !allowedUnused) {
        unused.push(a.fileName || a.type || '(unnamed)')
      }
    }
    if (unused.length > 0) {
      checks.push({
        id: 'no-unused',
        label: 'Няма неизползвани support assets',
        status: 'warn',
        detail: unused.join(', '),
      })
      warnings.push(
        `Декларирани, но неизползвани изображения (без токен и без Placement): ${unused.join(', ')}.`,
      )
    } else {
      checks.push({
        id: 'no-unused',
        label: 'Няма неизползвани support assets',
        status: 'pass',
      })
    }
  }

  // ── 10. Featured image not inserted in body ────────────────────
  {
    if (featured) {
      const ph = (featured.placeholder || '').trim()
      const type = (featured.type || '').toLowerCase()
      const inBody =
        (ph && body.includes(ph)) ||
        (type && body.includes(`{{image:${type}}}`))
      // The renderer will silently consume those tokens, so "in body" is OK
      // (it produces empty output). Surface as info: pass with detail.
      if (inBody) {
        checks.push({
          id: 'featured-not-in-body',
          label: 'Featured image не се рендерира в тялото на статията',
          status: 'pass',
          detail:
            'Открит placeholder за featured image в тялото — ще бъде консумиран без вмъкване.',
        })
      } else {
        checks.push({
          id: 'featured-not-in-body',
          label: 'Featured image не се рендерира в тялото на статията',
          status: 'pass',
        })
      }
    } else {
      checks.push({
        id: 'featured-not-in-body',
        label: 'Featured image не се рендерира в тялото на статията',
        status: 'warn',
        detail: 'Няма деклариран featured image.',
      })
      warnings.push('Няма Image Asset с Placement: featured_image.')
    }
  }

  // ── 11. External source URLs are plain URLs, not markdown links ─
  {
    const bad: string[] = []
    for (const s of parsed.externalSources) {
      const url = (s.url || '').trim()
      if (/^\[.+\]\(.+\)$/.test(url) || /[\[\]()]/.test(url)) {
        bad.push(url || s.title)
      }
    }
    if (bad.length > 0) {
      checks.push({
        id: 'sources-plain',
        label: 'External sources имат plain URL-и (не markdown links)',
        status: 'fail',
        detail: bad.join('; '),
      })
      errors.push(`External Sources URL-и съдържат markdown форматиране: ${bad.join(', ')}.`)
    } else {
      checks.push({
        id: 'sources-plain',
        label: 'External sources имат plain URL-и (не markdown links)',
        status: 'pass',
      })
    }
  }

  // ── 12. JSON-LD @context = "https://schema.org" ────────────────
  {
    const bad: string[] = []
    const checkSchema = (label: string, schema: object | null) => {
      if (!schema) return
      const ctx = (schema as Record<string, unknown>)['@context']
      if (ctx !== 'https://schema.org') {
        bad.push(`${label}: @context="${ctx ?? '(missing)'}"`)
      }
    }
    checkSchema('FAQ schema', parsed.faqSchema)
    checkSchema('Article schema', parsed.articleSchema)
    if (bad.length > 0) {
      checks.push({
        id: 'jsonld-context',
        label: 'JSON-LD @context е "https://schema.org"',
        status: 'fail',
        detail: bad.join('; '),
      })
      errors.push(`JSON-LD @context невалиден: ${bad.join(', ')}.`)
    } else {
      checks.push({
        id: 'jsonld-context',
        label: 'JSON-LD @context е "https://schema.org"',
        status: 'pass',
      })
    }
    if (parsed.faqSchemaError) errors.push(`FAQ JSON-LD: ${parsed.faqSchemaError}`)
    if (parsed.articleSchemaError) errors.push(`Article JSON-LD: ${parsed.articleSchemaError}`)
  }

  // ── 13. Reviewed By/Last Reviewed consistency ──────────────────
  {
    const hasReviewer = parsed.reviewedBy.trim().length > 0
    const hasDate = parsed.lastReviewed.trim().length > 0
    if (!hasReviewer && hasDate) {
      checks.push({
        id: 'reviewer-consistency',
        label: 'Reviewed By празно ⇒ Last Reviewed също празно',
        status: 'fail',
      })
      errors.push('Last Reviewed е попълнено, но Reviewed By е празно.')
    } else {
      checks.push({
        id: 'reviewer-consistency',
        label: 'Reviewed By празно ⇒ Last Reviewed също празно',
        status: 'pass',
      })
    }
  }

  // Hint about other required sections (other than the explicit ones above)
  for (const name of parsed.missingSections) {
    if (SECTIONS_REQUIRED.includes(name)) continue // already covered
    if (name === 'ARTICLE_BODY') continue // covered by check #2
    warnings.push(`Секция <!-- ${name} --> липсва.`)
  }

  return { checks, errors, warnings, ok: errors.length === 0 }
}

// ─── Renderer for the body with placeholder-aware figure injection ──

import {
  replaceImagePlaceholders,
  autoInsertRemainingImages,
  UploadedImage,
} from './articleParser'
import { parseMarkdown } from './markdownToHtml'

export interface PreviewImage extends UploadedImage {}

/**
 * Build the final body markdown (with figures resolved) + final HTML for
 * preview. Mirrors what `handleZipImport` does at submit time, but works
 * even without uploaded URLs by accepting any caller-supplied image map.
 */
export function buildPreviewHtml(
  parsed: ParsedArticle,
  images: PreviewImage[],
): { finalMarkdown: string; finalHtml: string } {
  const { body: afterPh, consumed } = replaceImagePlaceholders(
    parsed.contentMarkdown,
    images,
  )
  const finalMarkdown = autoInsertRemainingImages(afterPh, images, consumed)
  const finalHtml = parseMarkdown(finalMarkdown)
  return { finalMarkdown, finalHtml }
}
