#!/usr/bin/env node
/**
 * Social-kit batch generator.
 *
 * Merges a content file into the editable SVG masters in
 * `public/social-kit/templates/` and writes finished, per-post SVGs to
 * `public/social-kit/batches/<batch>/posts/<id>/`.
 *
 *   node scripts/social-kit/build-batch.mjs <content.json> [--dry]
 *
 * Why this exists instead of a SaaS template tool: the masters here are
 * already the brand — exact palette, type scale and layout live in the
 * SVG. Rebuilding them inside Canva/Placid would re-interpret the design;
 * swapping text nodes in place preserves it byte-for-byte.
 *
 * The slot-merging itself lives in ../../lib/socialKit/merge.mjs, shared
 * verbatim with the admin generator page (app/admin/social-kit) so the
 * two can never drift apart. This file is only the batch/filesystem
 * wrapper around it.
 *
 * Photo-backed templates (09) are deliberately NOT fully automated: the
 * background is generated separately (see the batch's
 * VISUAL_PROMPT_PACK.md) precisely because image models cannot render
 * Bulgarian copy reliably. Pass `background` to embed one; omit it and
 * the post is written with the master's placeholder and reported under
 * "needs artwork".
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applySlot } from '../../lib/socialKit/merge.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const KIT = resolve(HERE, '../../public/social-kit')
const TEMPLATES = join(KIT, 'templates')
const BATCHES = join(KIT, 'batches')

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

/** Swap an <image data-slot="background"> href for an embedded data URI. */
function applyBackground(svg, imagePath, contentDir) {
  const abs = resolve(contentDir, imagePath)
  if (!existsSync(abs)) throw new Error(`background not found: ${abs}`)
  const ext = extname(abs).toLowerCase()
  const mime = MIME[ext]
  if (!mime) throw new Error(`unsupported background type: ${ext}`)
  const b64 = readFileSync(abs).toString('base64')

  const open = /<image\b[^>]*data-slot="background"[^>]*>/.exec(svg)
  if (!open) return { svg, ok: false }
  const replaced = open[0].replace(/href="[^"]*"/, `href="data:${mime};base64,${b64}"`)
  return { svg: svg.slice(0, open.index) + replaced + svg.slice(open.index + open[0].length), ok: true }
}

function main() {
  const [contentArg, ...rest] = process.argv.slice(2)
  const dry = rest.includes('--dry')
  if (!contentArg) {
    console.error('usage: node scripts/social-kit/build-batch.mjs <content.json> [--dry]')
    process.exit(1)
  }

  const contentPath = resolve(process.cwd(), contentArg)
  const contentDir = dirname(contentPath)
  const content = JSON.parse(readFileSync(contentPath, 'utf8'))
  const { batch, defaults = {}, posts = [] } = content
  if (!batch) throw new Error('content file needs a "batch" slug')

  const templateCache = new Map()
  const loadTemplate = (name) => {
    if (!templateCache.has(name)) {
      const p = join(TEMPLATES, `${name}.svg`)
      if (!existsSync(p)) throw new Error(`unknown template "${name}" (${p})`)
      templateCache.set(name, readFileSync(p, 'utf8'))
    }
    return templateCache.get(name)
  }

  const written = []
  const needsArtwork = []
  const warnings = []

  for (const post of posts) {
    const { id, template, slots = {}, background, out } = post
    if (!id || !template) throw new Error(`post missing id/template: ${JSON.stringify(post)}`)

    let svg = loadTemplate(template)

    // defaults fill only slots the post didn't set — a per-post value
    // always wins, so a batch-wide CTA never overwrites a bespoke one.
    const merged = { ...defaults, ...slots }

    for (const [name, value] of Object.entries(merged)) {
      const res = applySlot(svg, name, value)
      if (!res.ok) {
        // Not fatal: defaults legitimately name slots a given template
        // lacks (e.g. `url` exists on 06 but not 01).
        if (!(name in defaults) || name in slots) {
          warnings.push(`post ${id}: template "${template}" has no slot "${name}"`)
        }
        continue
      }
      svg = res.svg
    }

    const wantsBackground = /data-slot="background"/.test(svg)
    if (background) {
      const res = applyBackground(svg, background, contentDir)
      if (!res.ok) warnings.push(`post ${id}: template "${template}" takes no background`)
      else svg = res.svg
    } else if (wantsBackground) {
      needsArtwork.push(`${id} (${template})`)
    }

    const outPath = join(BATCHES, batch, 'posts', id, out || 'feed.svg')
    if (!dry) {
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, svg, 'utf8')
    }
    written.push(outPath.replace(KIT, 'social-kit'))
  }

  console.log(`${dry ? '[dry run] would write' : 'wrote'} ${written.length} file(s) for batch "${batch}"`)
  for (const w of written) console.log('  ' + w)
  if (needsArtwork.length) {
    console.log('\nneeds artwork before export (background not supplied):')
    for (const n of needsArtwork) console.log('  ' + n)
    console.log('  -> generate per the batch VISUAL_PROMPT_PACK.md, then re-run with "background": "<file>"')
  }
  if (warnings.length) {
    console.log('\nwarnings:')
    for (const w of warnings) console.log('  ' + w)
  }
}

main()
