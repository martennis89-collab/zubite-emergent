'use client'

/**
 * Social-kit generator — admin UI over the SVG masters in
 * public/social-kit/templates.
 *
 * Runs entirely client-side. The masters and the brand fonts are already
 * public static assets, so the merge needs no backend and no storage —
 * which is also what makes it work in production, where Vercel's
 * filesystem is read-only and the CLI's write-to-disk approach cannot
 * run. Generated files are downloaded, not persisted server-side.
 *
 * The merge logic itself is shared verbatim with the CLI (see
 * lib/socialKit/merge.mjs) so the two can never drift.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileImage, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import {
  TEMPLATES,
  downloadPng,
  downloadSvg,
  fetchTemplate,
  merge,
  sizeOf,
  slotsOf,
  type TemplateSlot,
} from '@/lib/socialKit/browser'

/** Slots that are chrome rather than message — collapsed by default so the
 *  editor sees headline/body first, not the boilerplate disclaimer. */
const SECONDARY = new Set(['disclaimer', 'url', 'aiDisclosure', 'sourceNote', 'photoNote'])

export default function AdminSocialKitPage() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const [master, setMaster] = useState('')
  const [slots, setSlots] = useState<TemplateSlot[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<'png' | null>(null)
  const [showSecondary, setShowSecondary] = useState(false)

  const meta = useMemo(() => TEMPLATES.find((t) => t.id === templateId)!, [templateId])

  // Load the master and pre-fill every field with its own copy, so the
  // editor edits real text instead of guessing at empty boxes.
  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError('')
    try {
      const svg = await fetchTemplate(id)
      const found = slotsOf(svg).filter((s) => s.kind === 'text')
      setMaster(svg)
      setSlots(found)
      setValues(Object.fromEntries(found.map((s) => [s.name, s.lines.join('\n')])))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неуспешно зареждане')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(templateId) }, [load, templateId])

  // Each textarea line becomes one <tspan>; the shared merge keeps the
  // template's own leading and its final accent line.
  const generated = useMemo(() => {
    if (!master) return ''
    const asLines = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.split('\n').map((l) => l.trim()).filter(Boolean)]),
    )
    return merge(master, asLines)
  }, [master, values])

  const previewSrc = useMemo(
    () => (generated ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generated)}` : ''),
    [generated],
  )

  const { width, height } = useMemo(
    () => (master ? sizeOf(master) : { width: 1080, height: 1350 }),
    [master],
  )

  const primary = slots.filter((s) => !SECONDARY.has(s.name))
  const secondary = slots.filter((s) => SECONDARY.has(s.name))

  const setValue = (name: string, v: string) => setValues((p) => ({ ...p, [name]: v }))

  const onPng = async () => {
    setExporting('png')
    try {
      await downloadPng(generated, `${templateId}.png`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PNG експортът не успя')
    } finally {
      setExporting(null)
    }
  }

  const field = (s: TemplateSlot) => (
    <label key={s.name} className="block">
      <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
        {s.name}
        {s.multiline && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            всеки ред = нов ред
          </span>
        )}
      </span>
      {s.multiline ? (
        <textarea
          value={values[s.name] ?? ''}
          onChange={(e) => setValue(s.name, e.target.value)}
          rows={Math.max(2, (values[s.name] ?? '').split('\n').length)}
          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-100"
          data-testid={`slot-${s.name}`}
        />
      ) : (
        <input
          value={values[s.name] ?? ''}
          onChange={(e) => setValue(s.name, e.target.value)}
          className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-100"
          data-testid={`slot-${s.name}`}
        />
      )}
    </label>
  )

  return (
    <main className="min-h-screen bg-slate-50">
      <AdminHeader pageTitle="Social kit" />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-teal-700">
              Генератор на публикации
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Social kit</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Смени текста в шаблон и свали готовия файл. Дизайнът, шрифтовете и цветовете
              остават точно както в оригинала.
            </p>
          </div>
          <Sparkles className="h-8 w-8 text-orange-500" />
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* ── Editor ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Шаблон</span>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-teal-500 focus:outline-none"
                data-testid="template-select"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {t.size}
                  </option>
                ))}
              </select>
            </label>

            {meta.photo && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                Този шаблон стъпва върху снимка. Фонът се генерира отделно (виж
                <span className="font-mono"> VISUAL_PROMPT_PACK.md</span>) — тук се
                редактира само текстът, а изнесеният файл запазва фона на оригинала.
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                {error}
              </p>
            )}

            {loading ? (
              <div className="grid min-h-64 place-items-center">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-3">{primary.map(field)}</div>

                {secondary.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSecondary((v) => !v)}
                      className="text-xs font-medium text-teal-700 hover:text-teal-800"
                    >
                      {showSecondary ? 'Скрий' : 'Покажи'} стандартните полета ({secondary.length})
                    </button>
                    {showSecondary && <div className="mt-3 space-y-3">{secondary.map(field)}</div>}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => downloadSvg(generated, `${templateId}.svg`)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    data-testid="download-svg"
                  >
                    <Download className="h-4 w-4" />
                    Свали SVG
                  </button>
                  <button
                    type="button"
                    onClick={onPng}
                    disabled={exporting === 'png'}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    data-testid="download-png"
                  >
                    {exporting === 'png' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileImage className="h-4 w-4" />
                    )}
                    Свали PNG ({width}×{height})
                  </button>
                  <button
                    type="button"
                    onClick={() => void load(templateId)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
                    data-testid="reset"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Върни оригинала
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Live preview ───────────────────────────────────── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-medium text-slate-500">
                Преглед · {width}×{height}
              </p>
              {previewSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewSrc}
                  alt="Преглед на публикацията"
                  className="w-full rounded-lg border border-slate-100 bg-white"
                  data-testid="preview"
                />
              ) : (
                <div className="grid h-64 place-items-center text-sm text-slate-400">
                  Няма преглед
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
