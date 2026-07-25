'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const OUTBRAIN_MARKETER_ID = '00e7b0fc672435d96b35c9460e220bab89'
const OUTBRAIN_SCRIPT_URL = 'https://amplify.outbrain.com/cp/obtp.js'

// Keep authenticated B2B traffic out of patient-acquisition reporting.
const PIXEL_EXEMPT_PREFIXES = ['/admin', '/clinic'] as const

function isPixelExemptPath(pathname: string | null): boolean {
  if (!pathname) return false
  return PIXEL_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

type OutbrainApi = ((...args: any[]) => void) & {
  dispatch?: (...args: any[]) => void
  queue?: any[][]
  version?: string
  loaded?: boolean
  marketerId?: string | string[]
}

declare global {
  interface Window {
    obApi?: OutbrainApi
  }
}

function ensureOutbrainPixel(): OutbrainApi | undefined {
  if (typeof window === 'undefined') return undefined

  if (window.obApi) {
    const currentIds = Array.isArray(window.obApi.marketerId)
      ? window.obApi.marketerId
      : window.obApi.marketerId
        ? [window.obApi.marketerId]
        : []

    if (!currentIds.includes(OUTBRAIN_MARKETER_ID)) {
      window.obApi.marketerId = [...currentIds, OUTBRAIN_MARKETER_ID]
    }
    return window.obApi
  }

  const api = function (...args: any[]) {
    if (api.dispatch) {
      api.dispatch(...args)
    } else {
      api.queue?.push(args)
    }
  } as OutbrainApi

  api.version = '1.1'
  api.loaded = true
  api.marketerId = OUTBRAIN_MARKETER_ID
  api.queue = []
  window.obApi = api

  if (!document.querySelector('script[data-zubite-outbrain-pixel]')) {
    const script = document.createElement('script')
    script.async = true
    script.src = OUTBRAIN_SCRIPT_URL
    script.type = 'text/javascript'
    script.setAttribute('data-obct', '')
    script.dataset.zubiteOutbrainPixel = 'true'

    const firstScript = document.getElementsByTagName('script')[0]
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript)
    } else {
      document.head.appendChild(script)
    }
  }

  return api
}

/**
 * Fires the Outbrain "Lead" conversion. Named to match the Meta Pixel event
 * at the same trigger point (see trackLeadSubmit in MetaPixel.tsx) so both
 * platforms report the same conversion moment under a recognizable name.
 *
 * Requires a pixel-based custom conversion named "Lead" to be created in the
 * Outbrain dashboard (Conversion Tracking) before this will show conversions
 * there — the track call alone does not create it.
 *
 * No-ops if marketing consent hasn't been granted (window.obApi is only
 * defined once ensureOutbrainPixel() has run, see the consent effect above).
 */
export function trackOutbrainLead() {
  window.obApi?.('track', 'Lead')
}

export function OutbrainPixel() {
  const pathname = usePathname()
  const exempt = isPixelExemptPath(pathname)
  const [consentGranted, setConsentGranted] = useState(false)
  const lastPageViewPath = useRef<string | null>(null)

  useEffect(() => {
    if (exempt) {
      setConsentGranted(false)
      lastPageViewPath.current = null
      return
    }

    function applyMarketingConsent(granted: boolean) {
      if (granted) {
        ensureOutbrainPixel()
        setConsentGranted(true)
      } else {
        setConsentGranted(false)
        lastPageViewPath.current = null
      }
    }

    try {
      const savedPreferences = localStorage.getItem('zubite_cookie_preferences')
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences)
        applyMarketingConsent(Boolean(preferences?.marketing))
      }
    } catch {
      // Invalid or unavailable storage means consent remains denied.
    }

    function handleConsentChange(event: Event) {
      applyMarketingConsent(Boolean((event as CustomEvent<boolean>).detail))
    }

    window.addEventListener('cookie-consent-marketing', handleConsentChange)
    return () => {
      window.removeEventListener('cookie-consent-marketing', handleConsentChange)
    }
  }, [exempt])

  useEffect(() => {
    if (!consentGranted || exempt || !pathname || !window.obApi) return

    const pagePath = `${pathname}${window.location.search}`
    if (lastPageViewPath.current === pagePath) return
    lastPageViewPath.current = pagePath

    window.obApi('track', 'PAGE_VIEW')
  }, [consentGranted, exempt, pathname])

  return null
}
