'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  GA_MEASUREMENT_ID,
  trackPageView,
} from '@/lib/analytics/gtag'

/**
 * Google Analytics 4 loader with **Google Consent Mode v2**.
 *
 * Ordering guarantees (critical):
 *   1. `dataLayer` is created and `gtag` is defined.
 *   2. `gtag('consent', 'default', ...)` runs with EVERYTHING that touches
 *      personal data set to "denied" (analytics_storage, ad_storage,
 *      ad_user_data, ad_personalization). Only functionality_storage and
 *      security_storage default to "granted".
 *   3. If the user has previously accepted analytics/marketing, we replay
 *      that choice as a `consent update` immediately after the default —
 *      this happens BEFORE the Google tag script runs, so the first
 *      network hit already carries the correct consent signals.
 *   4. `gtag/js?id=...` is then loaded. `gtag('config', GA_ID, ...)` runs
 *      with `send_page_view: false` so we can send page views manually on
 *      Next.js App Router route changes.
 *
 * Cookie-banner integration:
 *   The existing `CookieConsent` component dispatches
 *   `cookie-consent-analytics` and `cookie-consent-marketing` custom events
 *   on the window with `detail: boolean`. We listen here and forward the
 *   choice into the Google tag via `gtag('consent', 'update', ...)`.
 */
export function GoogleAnalyticsConsent() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  // ── consent-update bridge (banner ↔ GA) ────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    function onAnalytics(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail
      window.gtag?.('consent', 'update', {
        analytics_storage: detail ? 'granted' : 'denied',
      })
      // When analytics is freshly granted, replay the current page_view so
      // the very first session hit is captured.
      if (detail && lastPath.current) {
        trackPageView(lastPath.current)
      }
    }
    function onMarketing(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail
      const v = detail ? 'granted' : 'denied'
      window.gtag?.('consent', 'update', {
        ad_storage: v,
        ad_user_data: v,
        ad_personalization: v,
      })
    }

    window.addEventListener('cookie-consent-analytics', onAnalytics)
    window.addEventListener('cookie-consent-marketing', onMarketing)
    return () => {
      window.removeEventListener('cookie-consent-analytics', onAnalytics)
      window.removeEventListener('cookie-consent-marketing', onMarketing)
    }
  }, [])

  // ── page-view tracking on App Router route changes ─────────────────────
  // Consent Mode v2 drops the hit at the Google tag level if
  // analytics_storage is still denied, so we don't need to gate here.
  // We read query-string from window.location directly to avoid pulling
  // useSearchParams() — which would force this component into a Suspense
  // boundary that may not resolve in time during initial mount.
  useEffect(() => {
    if (!pathname) return
    if (typeof window === 'undefined') return
    const qs = window.location.search
    const url = qs ? `${pathname}${qs}` : pathname
    lastPath.current = url
    trackPageView(url)
  }, [pathname])

  // The inline init script + external gtag/js loader live in
  // `app/layout.tsx` <head>. This component only wires the runtime
  // bridges: cookie-banner events (analytics/marketing toggles) and
  // App Router page_view tracking on pathname change.
  return null
}

// Helper kept here as a no-op getter so tests can verify the ID without
// importing the module under test against window globals.
export const __GA_ID__ = GA_MEASUREMENT_ID

// Re-export helpers so feature code can `import { trackEvent } from
// '@/components/analytics/GoogleAnalyticsConsent'` without a deep path.
export {
  trackEvent,
  trackPageView,
  grantAnalyticsConsent,
  denyAnalyticsConsent,
  updateMarketingConsent,
  readStoredPreferences,
} from '@/lib/analytics/gtag'

/**
 * Suggested custom events (prepared, not yet wired across the app):
 *   - quiz_start
 *   - quiz_complete
 *   - lead_submit
 *   - clinic_profile_view
 *   - clinic_request_click
 *   - care_pass_interest
 *   - article_view
 *
 * To fire one from anywhere:
 *   import { trackEvent } from '@/components/analytics/GoogleAnalyticsConsent'
 *   trackEvent('quiz_complete', { score: 42, band: 'amber' })
 */
