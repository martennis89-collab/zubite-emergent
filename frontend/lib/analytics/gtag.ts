/**
 * Google Analytics 4 helpers — Consent Mode v2 compliant.
 *
 * Single source of truth for the GA4 measurement ID and the gtag wrapper.
 * Loading + consent-default initialisation lives in `app/layout.tsx`;
 * `GoogleAnalyticsConsent.tsx` bridges later banner changes. This module
 * exposes type-safe helpers without leaking window typings to feature code.
 */

export const GA_MEASUREMENT_ID = 'G-1EXHPR6JYS'

// localStorage keys (mirrored from CookieConsent.tsx — kept in sync there
// so a single source of truth for the persisted choice).
export const COOKIE_CONSENT_KEY = 'zubite_cookie_consent'
export const COOKIE_PREFERENCES_KEY = 'zubite_cookie_preferences'

export interface CookiePreferencesShape {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

// Augment the global Window so TS knows about dataLayer + gtag.
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function safeGtag(...args: unknown[]) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag(...args)
}

/** Read persisted cookie-consent preferences (null if user has not chosen). */
export function readStoredPreferences(): CookiePreferencesShape | null {
  if (typeof window === 'undefined') return null
  try {
    const flag = window.localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!flag) return null
    const raw = window.localStorage.getItem(COOKIE_PREFERENCES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CookiePreferencesShape>
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    }
  } catch {
    return null
  }
}

/** Move analytics_storage to granted (call when user accepts analytics). */
export function grantAnalyticsConsent() {
  safeGtag('consent', 'update', { analytics_storage: 'granted' })
}

/** Move analytics_storage back to denied. */
export function denyAnalyticsConsent() {
  safeGtag('consent', 'update', { analytics_storage: 'denied' })
}

/** Toggle the three ad-related signals together. */
export function updateMarketingConsent(granted: boolean) {
  const value = granted ? 'granted' : 'denied'
  safeGtag('consent', 'update', {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  })
}

/**
 * Explicit page-view escape hatch for flows outside normal App Router
 * navigation. Regular page views come from GA4 Enhanced Measurement so this
 * helper must not be wired globally or it will create duplicate hits.
 */
export function trackPageView(url: string) {
  safeGtag('event', 'page_view', {
    page_path: url,
    page_location: typeof window !== 'undefined' ? window.location.href : url,
  })
}

export type GAEventParams = Record<string, string | number | boolean | undefined>

/**
 * Send a custom event. Consent Mode v2 will gate hits server-side based on
 * analytics_storage, so callers don't need to gate at the call site.
 */
export function trackEvent(name: string, params: GAEventParams = {}) {
  safeGtag('event', name, params)
}
