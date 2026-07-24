'use client'

import { useEffect } from 'react'
import { GA_MEASUREMENT_ID } from '@/lib/analytics/gtag'

/**
 * Runtime bridge between the cookie banner and Google Consent Mode v2.
 *
 * The consent defaults, stored-preference restore, GA configuration and
 * external script loader live in app/layout.tsx so they execute in the
 * correct order. GA4 Enhanced Measurement is the single page-view authority,
 * including App Router history changes. Keeping page views out of this
 * component prevents duplicate SPA hits.
 */
export function GoogleAnalyticsConsent() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    function onAnalytics(event: Event) {
      const granted = Boolean((event as CustomEvent<boolean>).detail)
      window.gtag?.('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
      })
    }

    function onMarketing(event: Event) {
      const value = (event as CustomEvent<boolean>).detail
        ? 'granted'
        : 'denied'
      window.gtag?.('consent', 'update', {
        ad_storage: value,
        ad_user_data: value,
        ad_personalization: value,
      })
    }

    window.addEventListener('cookie-consent-analytics', onAnalytics)
    window.addEventListener('cookie-consent-marketing', onMarketing)
    return () => {
      window.removeEventListener('cookie-consent-analytics', onAnalytics)
      window.removeEventListener('cookie-consent-marketing', onMarketing)
    }
  }, [])

  return null
}

export const __GA_ID__ = GA_MEASUREMENT_ID

export {
  trackEvent,
  trackPageView,
  grantAnalyticsConsent,
  denyAnalyticsConsent,
  updateMarketingConsent,
  readStoredPreferences,
} from '@/lib/analytics/gtag'
