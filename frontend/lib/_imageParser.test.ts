/**
 * Focused unit test for the image-placement logic in articleParser.ts.
 *
 * Run with:
 *   cd /app/frontend && ./node_modules/.bin/sucrase-node lib/_imageParser.test.ts
 */

import {
  replaceImagePlaceholders,
  autoInsertRemainingImages,
  UploadedImage,
} from './articleParser'

let failures = 0
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`)
  } else {
    console.log(`  ✗ ${msg}`)
    failures++
  }
}

// ── Scenario 1: explicit Placeholder beats Placement ────────────────
{
  console.log('Scenario 1: explicit {{image:support_1}} placeholder beats Placement')
  const body = `# Heading

Intro paragraph.

{{image:support_1}}

## Next section

Body text.`

  const images: UploadedImage[] = [
    {
      asset: {
        type: 'support_1',
        fileName: 'support1.jpg',
        alt: 'Support image',
        title: 'Support 1',
        caption: 'My caption',
        placement: 'after_intro',
        placeholder: '{{image:support_1}}',
      },
      url: 'https://cdn.example.com/support1.jpg',
    },
  ]

  const { body: replaced, consumed } = replaceImagePlaceholders(body, images)
  const final = autoInsertRemainingImages(replaced, images, consumed)

  assert(final.includes('<figure'), 'figure HTML is inserted')
  assert(!final.includes('{{image:support_1}}'), 'placeholder token is removed')
  assert(
    (final.match(/cdn\.example\.com\/support1\.jpg/g) || []).length === 1,
    'image is inserted exactly once (no duplicate from auto-placement)',
  )
  assert(final.includes('alt="Support image"'), 'alt attribute set')
  assert(final.includes('<figcaption>My caption</figcaption>'), 'caption rendered')
}

// ── Scenario 2: featured image must NEVER be inserted into body ──
{
  console.log('\nScenario 2: featured image is excluded from article body')
  const body = `# Heading

Intro paragraph.

## Next section`

  const images: UploadedImage[] = [
    {
      asset: {
        type: 'featured',
        fileName: 'hero.jpg',
        alt: 'Hero',
        title: '',
        caption: '',
        placement: 'featured_image',
        placeholder: '',
      },
      url: 'https://cdn.example.com/hero.jpg',
    },
  ]

  const { body: replaced, consumed } = replaceImagePlaceholders(body, images)
  const final = autoInsertRemainingImages(replaced, images, consumed)

  assert(!final.includes('hero.jpg'), 'featured image URL is NOT in body')
  assert(!final.includes('<figure'), 'no figure block inserted for featured image')
}

// ── Scenario 3: featured image with body placeholder → consumed but no output
{
  console.log(
    '\nScenario 3: featured image with explicit Placeholder is removed from body',
  )
  const body = `Intro {{image:hero}} more text.`

  const images: UploadedImage[] = [
    {
      asset: {
        type: 'featured',
        fileName: 'hero.jpg',
        alt: 'Hero',
        title: '',
        caption: '',
        placement: 'featured_image',
        placeholder: '{{image:hero}}',
      },
      url: 'https://cdn.example.com/hero.jpg',
    },
  ]

  const { body: replaced, consumed } = replaceImagePlaceholders(body, images)
  const final = autoInsertRemainingImages(replaced, images, consumed)

  assert(!final.includes('{{image:hero}}'), 'placeholder token consumed')
  assert(!final.includes('hero.jpg'), 'featured image URL NOT in body')
  assert(final.includes('Intro') && final.includes('more text'), 'surrounding text preserved')
}

// ── Scenario 4: image with Placement only (no placeholder) → auto-inserted
{
  console.log('\nScenario 4: only Placement (no Placeholder) → auto-insert after_intro')
  const body = `# Heading

Intro paragraph.

## Next section

Body.`

  const images: UploadedImage[] = [
    {
      asset: {
        type: 'support_1',
        fileName: 'support1.jpg',
        alt: 'Support image',
        title: '',
        caption: '',
        placement: 'after_intro',
        placeholder: '',
      },
      url: 'https://cdn.example.com/support1.jpg',
    },
  ]

  const { body: replaced, consumed } = replaceImagePlaceholders(body, images)
  const final = autoInsertRemainingImages(replaced, images, consumed)

  assert(final.includes('cdn.example.com/support1.jpg'), 'image auto-inserted')
  assert(
    (final.match(/cdn\.example\.com\/support1\.jpg/g) || []).length === 1,
    'auto-inserted exactly once',
  )
}

// ── Scenario 5: generic {{image:TYPE}} token still works ──
{
  console.log('\nScenario 5: generic {{image:TYPE}} token resolves by Type')
  const body = `Pre {{image:diagram}} post.`

  const images: UploadedImage[] = [
    {
      asset: {
        type: 'diagram',
        fileName: 'd.jpg',
        alt: 'Diagram',
        title: '',
        caption: '',
        placement: '',
        placeholder: '',
      },
      url: 'https://cdn.example.com/d.jpg',
    },
  ]

  const { body: replaced, consumed } = replaceImagePlaceholders(body, images)
  const final = autoInsertRemainingImages(replaced, images, consumed)

  assert(!final.includes('{{image:diagram}}'), 'generic token consumed')
  assert(final.includes('cdn.example.com/d.jpg'), 'image inserted')
  assert(
    (final.match(/cdn\.example\.com\/d\.jpg/g) || []).length === 1,
    'inserted exactly once (no double from auto-fallback)',
  )
}

// ── Scenario 6: explicit placeholder with multiple occurrences ──
{
  console.log('\nScenario 6: explicit placeholder appearing twice → both replaced')
  const body = `One {{image:support_1}} two {{image:support_1}} done.`

  const images: UploadedImage[] = [
    {
      asset: {
        type: 'support_1',
        fileName: 's.jpg',
        alt: 'S',
        title: '',
        caption: '',
        placement: '',
        placeholder: '{{image:support_1}}',
      },
      url: 'https://cdn.example.com/s.jpg',
    },
  ]

  const { body: replaced, consumed } = replaceImagePlaceholders(body, images)
  const final = autoInsertRemainingImages(replaced, images, consumed)

  assert(
    (final.match(/cdn\.example\.com\/s\.jpg/g) || []).length === 2,
    'replaces every occurrence of the explicit placeholder',
  )
  assert(!final.includes('{{image:support_1}}'), 'no leftover placeholder tokens')
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`)
process.exit(failures === 0 ? 0 : 1)
