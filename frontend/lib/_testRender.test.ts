/**
 * Regression tests for the Test Render validation pipeline.
 *
 * Run with:
 *   cd /app/frontend && ./node_modules/.bin/sucrase-node lib/_testRender.test.ts
 */

import { parseArticlePackage } from './articleParser'
import {
  validateTestRender,
  buildPreviewHtml,
  PreviewImage,
} from './articleTestRender'

let failures = 0
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`)
  } else {
    console.log(`  ✗ ${msg}`)
    failures++
  }
}

// Minimal fixture builder
function fixture(opts: {
  body?: string
  imageAssets?: string
  faqCount?: number
  reviewedBy?: string
  lastReviewed?: string
  externalSourceUrl?: string
  faqContext?: string
  articleContext?: string
  cta?: boolean
}): string {
  const body =
    opts.body ??
    `# Главно

Кратко въведение.

## Подзаглавие
Параграф.`
  const imageAssets =
    opts.imageAssets ??
    `- Type: hero
  File Name: hero.webp
  Alt: Hero alt
  Title: Hero
  Caption:
  Placement: featured_image

- Type: support_1
  File Name: s1.webp
  Alt: Support 1
  Title:
  Caption: cap
  Placement: after_intro
  Placeholder: {{image:support_1}}`
  const faqCount = opts.faqCount ?? 5
  const faqs = Array.from({ length: faqCount }, (_, i) => `Q: Въпрос ${i + 1}?\nA: Отговор ${i + 1}.`).join('\n\n')
  const externalSourceUrl = opts.externalSourceUrl ?? 'https://www.aaoinfo.org'
  const cta = opts.cta === false
    ? ''
    : `<!-- CTA_BLOCK -->
Title: Заглавие
Text: Текст
Button: Бутон
URL: /quiz
Type: primary
`
  return `# ZUBITE_ARTICLE_PACKAGE

<!-- ARTICLE_META -->
Title: Тестова статия
SEO Title: SEO заглавие до 60
Meta Description: Кратко описание до 155 символа.
Excerpt: Кратко.
Slug: testova
Category: orthodontics
Tags: a, b
Author: Test
Reviewed By: ${opts.reviewedBy ?? 'д-р Тест'}
Last Reviewed: ${opts.lastReviewed ?? '2026-02-01'}
Language: bg
Status: draft

<!-- ARTICLE_BODY_START -->
${body}
<!-- ARTICLE_BODY_END -->

<!-- FAQ -->
${faqs}

<!-- INTERNAL_LINKS -->
- Label: Test
  URL: /test

<!-- EXTERNAL_SOURCES -->
- Title: AAO
  URL: ${externalSourceUrl}

${cta}
<!-- IMAGE_ALT_TEXTS -->
Featured Image Alt: alt
- Alt: support alt

<!-- IMAGE_ASSETS -->
${imageAssets}

<!-- FAQ_SCHEMA_JSON_LD -->
{
  "@context": "${opts.faqContext ?? 'https://schema.org'}",
  "@type": "FAQPage",
  "mainEntity": []
}

<!-- ARTICLE_SCHEMA_JSON_LD -->
{
  "@context": "${opts.articleContext ?? 'https://schema.org'}",
  "@type": "Article",
  "headline": "X"
}
`
}

// ── 1. Placeholder priority over Placement ─────────────────────
{
  console.log('Test 1: explicit Placeholder beats Placement (after_intro)')
  const md = fixture({
    body: `# Главно

Въведение.

{{image:support_1}}

## Втора секция
Параграф.`,
  })
  const parsed = parseArticlePackage(md)
  const support = parsed.imageAssets.find((a) => a.type === 'support_1')!
  const images: PreviewImage[] = [
    { asset: parsed.imageAssets.find((a) => a.type === 'hero')!, url: 'https://x/hero.jpg' },
    { asset: support, url: 'https://x/s1.jpg' },
  ]
  const { finalMarkdown, finalHtml } = buildPreviewHtml(parsed, images)
  // Image inserted exactly at the {{image:support_1}} location, not auto-placed
  assert(
    (finalMarkdown.match(/x\/s1\.jpg/g) || []).length === 1,
    'support image inserted exactly once (placeholder beats after_intro)',
  )
  assert(!finalMarkdown.includes('{{image:support_1}}'), 'placeholder token consumed')
  assert(finalHtml.includes('<figure'), 'HTML output contains <figure>')
  assert(!finalHtml.includes('hero.jpg'), 'featured image not in body HTML')

  const report = validateTestRender(parsed, md)
  assert(report.ok, 'no hard errors')
  const checkPh = report.checks.find((c) => c.id === 'placeholders-resolve')!
  assert(checkPh.status === 'pass', 'placeholders-resolve check passes')
}

// ── 2. Featured image not inserted in body ─────────────────────
{
  console.log('\nTest 2: featured image is excluded from body')
  const md = fixture({
    body: `# Главно

Текст {{image:hero}} в средата.

## Подзаглавие`,
  })
  const parsed = parseArticlePackage(md)
  const images: PreviewImage[] = parsed.imageAssets.map((a) => ({ asset: a, url: `https://x/${a.fileName}` }))
  const { finalMarkdown, finalHtml } = buildPreviewHtml(parsed, images)
  assert(!finalMarkdown.includes('hero.webp'), 'featured image URL NOT in body markdown')
  assert(!finalHtml.includes('hero.webp'), 'featured image URL NOT in rendered HTML')
  assert(!finalMarkdown.includes('{{image:hero}}'), 'featured placeholder consumed silently')
  const report = validateTestRender(parsed, md)
  const featuredCheck = report.checks.find((c) => c.id === 'featured-not-in-body')!
  assert(featuredCheck.status === 'pass', 'featured-not-in-body check passes')
}

// ── 3. Missing placeholder warning (Placeholder declared but not in body) ──
{
  console.log('\nTest 3: declared Placeholder without matching token in body')
  const md = fixture({
    body: `# Главно
Параграф без token.`,
    imageAssets: `- Type: hero
  File Name: hero.webp
  Alt: alt
  Title:
  Caption:
  Placement: featured_image

- Type: support_1
  File Name: s1.webp
  Alt: alt
  Title:
  Caption:
  Placement: after_intro
  Placeholder: {{image:support_1}}`,
  })
  const parsed = parseArticlePackage(md)
  const report = validateTestRender(parsed, md)
  const c = report.checks.find((x) => x.id === 'placeholders-resolve')!
  assert(c.status === 'fail', 'placeholders-resolve fails when token missing')
  assert(!report.ok, 'overall report not OK (hard error)')
  assert(
    report.errors.some((e) => e.includes('s1.webp')),
    'error message mentions the offending file',
  )
}

// ── 4. Unused IMAGE_ASSETS warning ─────────────────────────────
{
  console.log('\nTest 4: unused support asset (no token, no Placement)')
  const md = fixture({
    body: `# Главно
Параграф.`,
    imageAssets: `- Type: hero
  File Name: hero.webp
  Alt: alt
  Title:
  Caption:
  Placement: featured_image

- Type: support_1
  File Name: s1.webp
  Alt: alt
  Title:
  Caption:
  Placement:
  Placeholder:`,
  })
  const parsed = parseArticlePackage(md)
  const report = validateTestRender(parsed, md)
  const c = report.checks.find((x) => x.id === 'no-unused')!
  assert(c.status === 'warn', 'no-unused yields a warning')
  assert(
    report.warnings.some((w) => w.includes('s1.webp')),
    'warning lists s1.webp as unused',
  )
}

// ── 5. Duplicate placeholder detection ─────────────────────────
{
  console.log('\nTest 5: duplicate placeholders flagged as warning')
  const md = fixture({
    body: `# Главно

Първо {{image:support_1}}.

## Втора
Пак {{image:support_1}}.`,
    imageAssets: `- Type: hero
  File Name: hero.webp
  Alt: alt
  Title:
  Caption:
  Placement: featured_image

- Type: support_1
  File Name: s1.webp
  Alt: alt
  Title:
  Caption:
  Placement: after_intro
  Placeholder: {{image:support_1}}`,
  })
  const parsed = parseArticlePackage(md)
  const report = validateTestRender(parsed, md)
  const c = report.checks.find((x) => x.id === 'no-duplicates')!
  assert(c.status === 'warn', 'duplicate placeholders flagged as warn')
  assert(
    report.warnings.some((w) => w.toLowerCase().includes('дублиращ')),
    'warning text mentions duplicates',
  )
}

// ── 6. Correct final render order (intro → image → next heading) ──
{
  console.log('\nTest 6: render order respects placeholder position')
  const md = fixture({
    body: `# Главно

Първи параграф.

{{image:support_1}}

## Втора секция

Втори параграф.`,
  })
  const parsed = parseArticlePackage(md)
  const images: PreviewImage[] = parsed.imageAssets.map((a) => ({
    asset: a,
    url: `https://cdn/${a.fileName}`,
  }))
  const { finalHtml } = buildPreviewHtml(parsed, images)
  // Order: H1 → P intro → figure → H2 → P
  const idxIntro = finalHtml.indexOf('Първи параграф')
  const idxFigure = finalHtml.indexOf('cdn/s1.webp')
  const idxH2 = finalHtml.indexOf('Втора секция')
  const idxBottom = finalHtml.indexOf('Втори параграф')
  assert(idxIntro < idxFigure, 'intro paragraph appears before figure')
  assert(idxFigure < idxH2, 'figure appears before H2')
  assert(idxH2 < idxBottom, 'H2 appears before tail paragraph')
  assert(idxFigure > -1, 'figure was actually rendered')
}

// ── 7. Hard errors block: bad JSON-LD context ──────────────────
{
  console.log('\nTest 7: bad JSON-LD @context blocks publish')
  const md = fixture({ faqContext: 'http://schema.org' })
  const parsed = parseArticlePackage(md)
  const report = validateTestRender(parsed, md)
  const c = report.checks.find((x) => x.id === 'jsonld-context')!
  assert(c.status === 'fail', 'jsonld-context fails')
  assert(!report.ok, 'overall not OK')
}

// ── 8. Reviewed By empty + Last Reviewed populated → fail ──────
{
  console.log('\nTest 8: Reviewed By empty but Last Reviewed populated')
  const md = fixture({ reviewedBy: '', lastReviewed: '2026-02-01' })
  const parsed = parseArticlePackage(md)
  const report = validateTestRender(parsed, md)
  const c = report.checks.find((x) => x.id === 'reviewer-consistency')!
  assert(c.status === 'fail', 'reviewer-consistency fails')
}

// ── 9. External source URL with markdown link → fail ───────────
{
  console.log('\nTest 9: external source URL must be plain (no markdown)')
  const md = fixture({ externalSourceUrl: '[AAO](https://example.com)' })
  const parsed = parseArticlePackage(md)
  const report = validateTestRender(parsed, md)
  const c = report.checks.find((x) => x.id === 'sources-plain')!
  assert(c.status === 'fail', 'sources-plain fails on markdown link')
}

// ── 10. Token in body without IMAGE_ASSETS entry → fail ────────
{
  console.log('\nTest 10: orphan token in body without matching IMAGE_ASSETS entry')
  const md = fixture({
    body: `# Главно
Параграф.

{{image:nonexistent}}

Край.`,
  })
  const parsed = parseArticlePackage(md)
  const report = validateTestRender(parsed, md)
  const c = report.checks.find((x) => x.id === 'tokens-resolve')!
  assert(c.status === 'fail', 'tokens-resolve fails for unknown token')
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`)
process.exit(failures === 0 ? 0 : 1)
