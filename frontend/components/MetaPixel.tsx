'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const PIXEL_ID = '26074948688761177'
const PIXEL_SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js'

// Internal portals are authenticated B2B surfaces and must not be included
// in patient-acquisition reporting.
const PIXEL_EXEMPT_PREFIXES = ['/admin', '/clinic'] as const

function isPixelExemptPath(pathname: string | null): boolean {
  if (!pathname) return false
  return PIXEL_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

type MetaFbq = ((...args: any[]) => void) & {
  callMethod?: (...args: any[]) => void
  queue?: any[][]
  push?: (...args: any[]) => void
  loaded?: boolean
  version?: string
}

declare global {
  interface Window {
    fbq?: MetaFbq
    _fbq?: MetaFbq
  }
}

/**
 * Installs Meta's queue and downloads the Pixel only after marketing consent.
 * The queue is created synchronously, so events fired before fbevents.js
 * finishes downloading are still delivered in order.
 */
function ensureMetaPixel(): MetaFbq | undefined {
  if (typeof window === 'undefined') return undefined

  if (!window.fbq) {
    const fbq = function (...args: any[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args)
      } else {
        fbq.queue?.push(args)
      }
    } as MetaFbq

    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq

    // We own SPA page views explicitly. Disabling automatic configuration
    // prevents Meta from attaching a stale URL or emitting an extra PageView.
    fbq('set', 'autoConfig', false, PIXEL_ID)
    fbq('init', PIXEL_ID)

    if (!document.querySelector('script[data-zubite-meta-pixel]')) {
      const script = document.createElement('script')
      script.async = true
      script.src = PIXEL_SCRIPT_URL
      script.dataset.zubiteMetaPixel = 'true'
      document.head.appendChild(script)
    }
  }

  window.fbq('consent', 'grant')
  return window.fbq
}

export function MetaPixel() {
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
        ensureMetaPixel()
        setConsentGranted(true)
      } else {
        window.fbq?.('consent', 'revoke')
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
    if (!consentGranted || exempt || !pathname || !window.fbq) return

    const pagePath = `${pathname}${window.location.search}`
    if (lastPageViewPath.current === pagePath) return
    lastPageViewPath.current = pagePath

    window.fbq('track', 'PageView', {
      content_name: pagePath,
      content_category: 'site_page',
      page_path: pagePath,
      page_location: window.location.href,
    })
  }, [consentGranted, exempt, pathname])

  return null
}

// ============================================
// Event Tracking Utilities for Quiz Funnel
// ============================================

export function trackQuizStart() {
  window.fbq?.('trackCustom', 'QuizStart', {
    quiz_name: 'orthodontic_assessment',
    content_category: 'quiz',
  })
}

export function trackQuestionAnswered(questionNumber: number, answer: string) {
  window.fbq?.('trackCustom', 'QuestionAnswered', {
    quiz_name: 'orthodontic_assessment',
    question_number: questionNumber,
    answer,
  })
}

export function trackQuizComplete(stage: string, score: number) {
  window.fbq?.('trackCustom', 'QuizComplete', {
    quiz_name: 'orthodontic_assessment',
    result_stage: stage,
    score,
    content_category: 'quiz',
  })
}

export function trackSoftCommit(accepted: boolean) {
  window.fbq?.('trackCustom', 'SoftCommit', {
    quiz_name: 'orthodontic_assessment',
    accepted,
  })
}

export function trackLeadSubmit(city: string, formVersion: string) {
  window.fbq?.('track', 'Lead', {
    content_name: 'orthodontic_assessment',
    content_category: 'quiz_lead',
    city,
    form_version: formVersion,
  })
}

/**
 * Explicit escape hatch for exceptional page views outside the App Router.
 * Normal route tracking is handled once by <MetaPixel /> above.
 */
export function trackPageView() {
  if (typeof window === 'undefined') return
  window.fbq?.('track', 'PageView', {
    content_name: `${window.location.pathname}${window.location.search}`,
    content_category: 'site_page',
    page_path: `${window.location.pathname}${window.location.search}`,
    page_location: window.location.href,
  })
}
