'use client'

/**
 * Lightweight client-side analytics helper. Sends events through the existing
 * `/api/analytics/track` endpoint and Meta Pixel's `fbq` if available.
 *
 * Use sparingly — only for the article-level events that have explicit business
 * meaning: article_view, article_cta_click, related_article_click,
 * external_source_click.
 */

interface FbqLike {
  (action: 'trackCustom' | 'track', name: string, params?: Record<string, unknown>): void
}

function getFbq(): FbqLike | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { fbq?: FbqLike }
  return typeof w.fbq === 'function' ? w.fbq : null
}

export function trackArticleEvent(
  event: 'article_view' | 'article_cta_click' | 'related_article_click' | 'external_source_click',
  payload: { slug: string; title: string; href?: string; cta?: string },
) {
  // Meta Pixel custom event (graceful no-op if not loaded)
  try {
    getFbq()?.('trackCustom', event, payload as Record<string, unknown>)
  } catch {
    // ignore
  }

  // First-party logger — fire-and-forget so it never blocks UI.
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
    let sessionId = ''
    try {
      sessionId = localStorage.getItem('zubite_session_id') || ''
      if (!sessionId) {
        sessionId = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
        localStorage.setItem('zubite_session_id', sessionId)
      }
    } catch {
      // localStorage unavailable
    }
    fetch(`${API_URL}/api/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: event,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        // AnalyticsEvent schema accepts extra fields via Optional values; flatten the payload.
        post_slug: payload.slug,
        post_title: payload.title,
        href: payload.href,
        cta: payload.cta,
      }),
      keepalive: true,
    }).catch(() => {
      // ignore network errors — analytics must never throw
    })
  } catch {
    // ignore
  }
}
