'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X, Cookie, ChevronDown, ChevronUp } from 'lucide-react'

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const COOKIE_CONSENT_KEY = 'zubite_cookie_consent'
const COOKIE_PREFERENCES_KEY = 'zubite_cookie_preferences'

// Routes where the consent banner is NOT legally required because the page
// only uses strictly-necessary cookies (auth/session/CSRF). These are
// authenticated internal B2B portals — no Meta Pixel, no analytics, no
// marketing trackers. Under GDPR + ePrivacy + BG ЗЕС, strictly-necessary
// cookies are exempt from the consent requirement.
const CONSENT_EXEMPT_PREFIXES = ['/admin', '/clinic'] as const

function isConsentExemptPath(pathname: string | null): boolean {
  if (!pathname) return false
  return CONSENT_EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
}

export function CookieConsent() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, can't be changed
    // Per Google Consent Mode v2 + GDPR best practice: optional categories
    // must NOT be pre-checked. The user opts in explicitly via "Приемам"
    // or by toggling individual categories in "Покажи настройките".
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Skip entirely on consent-exempt routes (admin / clinic portals).
    if (isConsentExemptPath(pathname)) {
      setIsVisible(false)
      return
    }
    // Check if user has already given consent
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  const saveConsent = (allAccepted: boolean) => {
    const finalPreferences = allAccepted 
      ? { necessary: true, analytics: true, marketing: true }
      : preferences

    localStorage.setItem(COOKIE_CONSENT_KEY, 'true')
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(finalPreferences))

    // Notify analytics/marketing layers in BOTH directions so denied also
    // propagates to Google Consent Mode v2 / Meta Pixel etc.
    window.dispatchEvent(
      new CustomEvent('cookie-consent-analytics', { detail: finalPreferences.analytics }),
    )
    window.dispatchEvent(
      new CustomEvent('cookie-consent-marketing', { detail: finalPreferences.marketing }),
    )

    setIsVisible(false)
  }

  const acceptAll = () => {
    saveConsent(true)
  }

  const acceptSelected = () => {
    saveConsent(false)
  }

  const rejectAll = () => {
    setPreferences({
      necessary: true,
      analytics: false,
      marketing: false,
    })
    saveConsent(false)
  }

  if (isConsentExemptPath(pathname)) return null
  if (!isVisible) return null

  return (
    <>
      {/* Overlay (visual dim only — clicks pass through so navigation stays usable until user dismisses) */}
      <div className="fixed inset-0 bg-black/30 z-[9998] animate-fade-in pointer-events-none" />
      
      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-slide-up">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-xl font-semibold text-slate-900 mb-2">
                  Използваме бисквитки
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Използваме cookies, за да подобрим работата на сайта и да разберем кои страници са най-полезни. Можеш да приемеш всички cookies или да продължиш само с необходимите.
                </p>
              </div>
            </div>
          </div>

          {/* Details Toggle */}
          <div className="px-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Скрий настройките
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Покажи настройките
                </>
              )}
            </button>
          </div>

          {/* Detailed Preferences */}
          {showDetails && (
            <div className="px-6 py-4 space-y-4 border-t border-slate-100 mt-4 bg-slate-50">
              {/* Necessary */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Строго необходими</p>
                  <p className="text-xs text-slate-500">Необходими за работата на сайта. Не могат да се изключат.</p>
                </div>
                <div className="ml-4">
                  <div className="w-12 h-6 bg-teal-500 rounded-full opacity-50 cursor-not-allowed flex items-center justify-end px-1">
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Аналитични</p>
                  <p className="text-xs text-slate-500">Помагат ни да разберем как използвате сайта.</p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
                      preferences.analytics ? 'bg-teal-500 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </button>
                </div>
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">Маркетингови</p>
                  <p className="text-xs text-slate-500">Използват се за показване на релевантни реклами.</p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
                      preferences.marketing ? 'bg-teal-500 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 pt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={rejectAll}
              className="px-6 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors text-sm"
            >
              Само необходими
            </button>
            
            {showDetails && (
              <button
                onClick={acceptSelected}
                className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                Запази избора
              </button>
            )}
            
            <button
              onClick={acceptAll}
              className="flex-1 sm:flex-none px-8 py-3 bg-teal-500 text-white font-medium rounded-xl hover:bg-teal-600 transition-colors text-sm shadow-lg shadow-teal-500/25"
            >
              Приеми всички
            </button>
          </div>

          {/* Links */}
          <div className="px-6 pb-4 flex items-center justify-center gap-4 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">
              Политика за поверителност
            </Link>
            <span>•</span>
            <Link href="/cookies" className="hover:text-slate-600 transition-colors">
              Политика за бисквитки
            </Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </>
  )
}
