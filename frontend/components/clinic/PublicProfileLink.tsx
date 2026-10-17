'use client'

/**
 * Link to a clinic's public profile on zubite.bg.
 *
 * `path` comes from the backend (`public_profile_path`), which only returns
 * one when the profile is actually publicly listed — so a link is never shown
 * to a page that would 404. When it's null, an explanatory "not public yet"
 * label renders instead (unless `hideWhenNotLive`).
 */

import { ExternalLink, EyeOff } from 'lucide-react'

type Variant = 'button' | 'compact'

export function PublicProfileLink({
  path,
  variant = 'button',
  label = 'Публичен профил',
  notLiveLabel = 'Профилът още не е публичен',
  hideWhenNotLive = false,
  testId = 'public-profile-link',
}: {
  path?: string | null
  variant?: Variant
  label?: string
  notLiveLabel?: string
  hideWhenNotLive?: boolean
  testId?: string
}) {
  if (!path) {
    if (hideWhenNotLive) return null
    return (
      <span
        className={
          variant === 'compact'
            ? 'inline-flex items-center gap-1 text-[11px] text-slate-400'
            : 'inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-dashed border-slate-200 text-slate-400 text-sm'
        }
        title="Ще се появи, когато клиниката е активна и публично видима в каталога."
        data-testid={`${testId}-not-live`}
      >
        <EyeOff className={variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4'} />
        {notLiveLabel}
      </span>
    )
  }
  return (
    <a
      href={path}
      target="_blank"
      rel="noopener noreferrer"
      className={
        variant === 'compact'
          ? 'inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-800 hover:underline underline-offset-2'
          : 'inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium'
      }
      data-testid={testId}
    >
      {label}
      <ExternalLink className={variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4'} />
    </a>
  )
}
