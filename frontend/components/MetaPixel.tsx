'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

const PIXEL_ID = '26074948688761177'

// Extend window type for fbq
declare global {
  interface Window {
    fbq: (...args: any[]) => void
    _fbq: any
  }
}

export function MetaPixel() {
  const [consentGranted, setConsentGranted] = useState(false)

  useEffect(() => {
    // Check if marketing consent was already given (page refresh scenario)
    const savedPreferences = localStorage.getItem('zubite_cookie_preferences')
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences)
        if (prefs.marketing) {
          setConsentGranted(true)
          // Grant consent if pixel is already loaded
          if (window.fbq) {
            window.fbq('consent', 'grant')
          }
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Listen for cookie consent event (when user accepts marketing cookies)
    const handleConsentChange = (event: Event) => {
      const consentEvent = event as CustomEvent
      if (consentEvent.detail) {
        setConsentGranted(true)
        // Grant consent to Meta Pixel
        if (window.fbq) {
          window.fbq('consent', 'grant')
          // Re-fire PageView after consent
          window.fbq('track', 'PageView')
        }
      }
    }

    // Listen for the marketing consent event from CookieConsent component
    window.addEventListener('cookie-consent-marketing', handleConsentChange)

    return () => {
      window.removeEventListener('cookie-consent-marketing', handleConsentChange)
    }
  }, [])

  return (
    <>
      {/* Meta Pixel Base Code */}
      <Script
        id="meta-pixel-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            
            // GDPR: Revoke consent by default - no tracking until user consents
            fbq('consent', 'revoke');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `
        }}
      />
      
      {/* Noscript fallback - only render if consent already granted */}
      {consentGranted && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}
    </>
  )
}

// ============================================
// Event Tracking Utilities for Quiz Funnel
// ============================================

/**
 * Track when a user starts the quiz
 */
export function trackQuizStart() {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'QuizStart', {
      quiz_name: 'orthodontic_assessment',
      content_category: 'quiz'
    })
  }
}

/**
 * Track when a user answers a question
 */
export function trackQuestionAnswered(questionNumber: number, answer: string) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'QuestionAnswered', {
      quiz_name: 'orthodontic_assessment',
      question_number: questionNumber,
      answer: answer
    })
  }
}

/**
 * Track when a user completes the quiz
 */
export function trackQuizComplete(stage: string, score: number) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'QuizComplete', {
      quiz_name: 'orthodontic_assessment',
      result_stage: stage,
      score: score,
      content_category: 'quiz'
    })
  }
}

/**
 * Track soft commit (user clicks "Yes, show me options")
 */
export function trackSoftCommit(accepted: boolean) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'SoftCommit', {
      quiz_name: 'orthodontic_assessment',
      accepted: accepted
    })
  }
}

/**
 * Track when a user submits the lead form (standard Lead event)
 */
export function trackLeadSubmit(city: string, formVersion: string) {
  if (typeof window !== 'undefined' && window.fbq) {
    // Use standard Lead event for better optimization
    window.fbq('track', 'Lead', {
      content_name: 'orthodontic_assessment',
      content_category: 'quiz_lead',
      city: city,
      form_version: formVersion
    })
  }
}

/**
 * Track page views manually (for SPA navigation)
 */
export function trackPageView() {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView')
  }
}
