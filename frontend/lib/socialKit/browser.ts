/**
 * Browser-side helpers for the admin social-kit generator.
 *
 * Everything the generator needs is already a public static asset — the
 * SVG masters under /social-kit/templates and the brand fonts under
 * /fonts/taste — so generation runs entirely client-side. That matters
 * because the production frontend is on Vercel, whose filesystem is
 * read-only and ephemeral: the CLI's "write files to disk" approach
 * cannot work there, but fetch-merge-download can, with no backend and
 * no storage.
 */
import { applySlots, readSize, readSlots } from './merge.mjs'

export interface TemplateSlot {
  name: string
  kind: 'text' | 'image'
  multiline: boolean
  lines: string[]
}

export interface TemplateMeta {
  id: string
  label: string
  /** Canvas size, e.g. "1080×1350". */
  size: string
  /** Photo-backed masters need artwork before export — see note below. */
  photo?: boolean
}

/**
 * The ten masters plus the A4 poster variant. Kept as an explicit list
 * rather than discovered at runtime: `public/` has no directory index to
 * fetch, and an explicit list also lets us carry the human labels and
 * flag which masters expect supplied artwork.
 */
export const TEMPLATES: TemplateMeta[] = [
  { id: '01-educational-portrait', label: '01 · Образователен пост', size: '1080×1350' },
  { id: '02-carousel-cover', label: '02 · Корица за карусел', size: '1080×1350' },
  { id: '03-parent-guide', label: '03 · За родители', size: '1080×1350' },
  { id: '04-clinic-matching', label: '04 · Прозрачност при подбор', size: '1080×1350' },
  { id: '05-proof-square', label: '05 · Карта за доверие', size: '1080×1080' },
  { id: '06-story-question', label: '06 · Story въпрос', size: '1080×1920' },
  { id: '07-reel-cover', label: '07 · Reel корица', size: '1080×1920' },
  { id: '08-care-pass-portrait', label: '08 · Care Pass', size: '1080×1350' },
  { id: '09-hyperreal-fact', label: '09 · Hyperreal Fact', size: '1080×1350', photo: true },
  { id: '10-review-poster-a3', label: '10 · Постер за отзиви (A3)', size: 'A3 print' },
  { id: '10-review-poster-a4', label: '10 · Постер за отзиви (A4)', size: 'A4 print' },
]

export function templateUrl(id: string): string {
  return `/social-kit/templates/${id}.svg`
}

export async function fetchTemplate(id: string): Promise<string> {
  const res = await fetch(templateUrl(id), { cache: 'no-store' })
  if (!res.ok) throw new Error(`Шаблонът не се зареди (${res.status})`)
  return res.text()
}

export function slotsOf(svg: string): TemplateSlot[] {
  return readSlots(svg) as TemplateSlot[]
}

export function sizeOf(svg: string): { width: number; height: number } {
  return readSize(svg)
}

/** Merge edited copy into the master. Values are arrays of lines. */
export function merge(svg: string, values: Record<string, string[]>): string {
  return applySlots(svg, values).svg
}

/**
 * The four brand faces the masters reference. Fetched once and inlined as
 * data URIs for export — see embedFonts.
 */
const FONT_FILES = [
  'Manrope-Regular.ttf',
  'Manrope-Bold.ttf',
  'PlayfairDisplay-Regular.ttf',
  'IBMPlexMono-Medium.ttf',
]

let fontCache: Map<string, string> | null = null

async function loadFonts(): Promise<Map<string, string>> {
  if (fontCache) return fontCache
  const cache = new Map<string, string>()
  await Promise.all(
    FONT_FILES.map(async (file) => {
      const res = await fetch(`/fonts/taste/${file}`, { cache: 'force-cache' })
      if (!res.ok) return
      const buf = await res.arrayBuffer()
      let binary = ''
      const bytes = new Uint8Array(buf)
      const CHUNK = 0x8000
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
      }
      cache.set(file, `data:font/ttf;base64,${btoa(binary)}`)
    }),
  )
  fontCache = cache
  return cache
}

/**
 * Rewrite the masters' relative @font-face URLs to embedded data URIs.
 *
 * Required for export specifically: an SVG rendered through an <img>
 * (which is how canvas rasterises it) refuses to fetch external
 * resources, so without this the fonts silently fall back to Arial and
 * the exported PNG would not match the design. Inline in the DOM the
 * relative URLs resolve fine, so the on-screen preview does not need it.
 */
export async function embedFonts(svg: string): Promise<string> {
  const fonts = await loadFonts()
  let out = svg
  for (const [file, dataUri] of fonts) {
    out = out.split(`url('../../fonts/taste/${file}')`).join(`url('${dataUri}')`)
  }
  return out
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadSvg(svg: string, filename: string) {
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), filename)
}

/**
 * Rasterise to PNG at the master's native size. Removes the manual
 * "export from a design tool" step in PRODUCTION_HANDOFF.md for the
 * text-only masters.
 */
export async function downloadPng(svg: string, filename: string): Promise<void> {
  const withFonts = await embedFonts(svg)
  const { width, height } = sizeOf(svg)
  const url = URL.createObjectURL(new Blob([withFonts], { type: 'image/svg+xml' }))
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('PNG експортът не успя'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas не е достъпен')
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('PNG експортът не успя')
    downloadBlob(blob, filename)
  } finally {
    URL.revokeObjectURL(url)
  }
}
