'use client'

/**
 * Clinic overview card: the clinic's own public profile on zubite.bg, with
 * the full address to copy and share. Before the profile is publicly listed
 * it explains that instead of linking to a page that would 404.
 */

import { useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Globe } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export function ClinicPublicProfileCard() {
  const [path, setPath] = useState<string | null | undefined>(undefined)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/clinic/profile`, { credentials: 'include' as RequestCredentials })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPath(d?.public_profile_path || null))
      .catch(() => setPath(null))
  }, [])

  if (path === undefined) return null

  const fullUrl = path && typeof window !== 'undefined' ? `${window.location.origin}${path}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked — the link is still visible to copy by hand */ }
  }

  return (
    <section
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      data-testid="clinic-public-profile-card"
    >
      <span className="w-10 h-10 shrink-0 rounded-lg bg-teal-50 border border-teal-100 grid place-items-center text-teal-600">
        <Globe className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-slate-900">Вашият профил в Zubite.bg</h2>
        {path ? (
          <p className="mt-0.5 text-sm text-slate-500 truncate" data-testid="clinic-public-profile-url">{fullUrl}</p>
        ) : (
          <p className="mt-0.5 text-sm text-slate-500">
            Профилът ви още не е публичен. Линкът ще се появи тук, когато екипът на Zubite.bg го публикува.
          </p>
        )}
      </div>
      {path && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
            data-testid="clinic-public-profile-copy"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Копиран' : 'Копирай'}
          </button>
          <a
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium"
            data-testid="clinic-public-profile-open"
          >
            Отвори <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </section>
  )
}
