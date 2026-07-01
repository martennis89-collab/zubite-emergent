'use client'

import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, ExternalLink } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ImageUploadFieldProps {
  label: string
  value: string
  onChange: (url: string) => void
  hint?: string | null
  testid: string
  aspect?: 'square' | 'landscape' | 'portrait'
  maxBytes?: number
}

/**
 * Reusable "upload OR paste URL" image field for the admin clinic editor.
 * Reuses the existing `/api/admin/upload` endpoint (jpeg/png/webp, ≤5MB by default).
 * Renders a live preview when a URL is present.
 *
 * Behaviour rules:
 *  • Uploading a new file OVERWRITES the persisted URL.
 *  • The "Изчисти" button clears the field (sets empty string).
 *  • Paste-URL mode lets ops paste an external CDN URL (matches
 *    existing `hero_image_url` behaviour).
 */
export function ImageUploadField({
  label, value, onChange, hint, testid, aspect = 'landscape', maxBytes = 5 * 1024 * 1024,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setErr(null)
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setErr('Поддържат се само JPEG, PNG или WebP.')
      return
    }
    if (file.size > maxBytes) {
      setErr(`Файлът е по-голям от ${Math.round(maxBytes / (1024 * 1024))} MB.`)
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${API_URL}/api/admin/upload`, {
        method: 'POST', body: fd,
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setErr(typeof j.detail === 'string' ? j.detail : 'Грешка при качване.')
        return
      }
      const j = await r.json()
      // The upload endpoint returns either a full URL or a `/api/files/{id}` path.
      // Persist as absolute so the public renderer works regardless of origin.
      const url: string = j.url && j.url.startsWith('/api/') ? `${API_URL}${j.url}` : j.url
      onChange(url)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const aspectCls = aspect === 'square' ? 'aspect-square'
    : aspect === 'portrait' ? 'aspect-[3/4]'
    : 'aspect-video'

  return (
    <div className="space-y-2" data-testid={`${testid}-wrapper`}>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 flex-1">
          <ImageIcon className="w-3.5 h-3.5 text-slate-500" /> {label}
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium disabled:opacity-50"
          data-testid={`${testid}-upload-btn`}
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {value ? 'Замени' : 'Качи'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1 px-2 h-8 rounded-full text-xs text-rose-600 hover:bg-rose-50"
            data-testid={`${testid}-clear-btn`}
          >
            <X className="w-3 h-3" /> Изчисти
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }}
          data-testid={`${testid}-file-input`}
        />
      </div>

      {hint && <p className="text-[11px] text-amber-700 italic leading-relaxed">{hint}</p>}
      {err && <p className="text-[11px] text-rose-600" data-testid={`${testid}-error`}>{err}</p>}

      {/* URL text input — lets ops paste an external CDN URL. */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={500}
        placeholder="или залепи URL (https://…)"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
        data-testid={`${testid}-url-input`}
      />

      {/* Preview */}
      {value ? (
        <div className={`relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ${aspectCls} max-w-md`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            data-testid={`${testid}-preview`}
          />
          <a
            href={value}
            target="_blank" rel="noreferrer"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow"
            title="Отвори в нов таб"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <div className={`grid place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-[11px] text-slate-400 italic ${aspectCls} max-w-md`}>
          Няма качено изображение
        </div>
      )}
    </div>
  )
}
