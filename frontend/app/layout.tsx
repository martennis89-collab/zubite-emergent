import type { Metadata, Viewport } from 'next'
import './globals.css'
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/schema'
import { CookieConsent } from '@/components/CookieConsent'
import { MetaPixel } from '@/components/MetaPixel'
import { AttributionTracker } from '@/components/AttributionTracker'
import { GoogleAnalyticsConsent } from '@/components/analytics/GoogleAnalyticsConsent'
import { GA_MEASUREMENT_ID } from '@/lib/analytics/gtag'
import { Suspense } from 'react'
import { RouteDesignScope } from '@/components/RouteDesignScope'

export const metadata: Metadata = {
  metadataBase: new URL('https://zubite.bg'),
  title: 'Дентални решения в България | Ортодонтия, Импланти, Естетика | Zubite.bg',
  description: 'Открийте най-доброто решение за вашите зъби. Ортодонтия, зъбни импланти, естетична стоматология, сънна апнея и TMJ лечение.',
  keywords: 'дентални решения, ортодонтия, зъбни импланти, естетична стоматология, invisalign, брекети, сънна апнея, TMJ, зъболекар софия, пловдив, варна',
  authors: [{ name: 'Zubite.bg' }],
  creator: 'Zubite.bg',
  publisher: 'Zubite.bg',
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'bg_BG',
    url: 'https://zubite.bg',
    siteName: 'Zubite.bg',
    title: 'Дентални решения в България | Zubite.bg',
    description: 'Открийте най-доброто решение за вашите зъби. Ортодонтия, импланти, естетична стоматология.',
    images: [
      {
        url: 'https://zubite.bg/og/og-home.jpg',
        width: 1200,
        height: 630,
        alt: 'Zubite.bg - Дентални решения в България',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Дентални решения в България | Zubite.bg',
    description: 'Открийте най-доброто решение за вашите зъби.',
    images: ['https://zubite.bg/og/og-home.jpg'],
    creator: '@zubitebg',
  },
  verification: {
    google: 'google-site-verification-code',
  },
  category: 'health',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f4f2',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const organizationSchema = generateOrganizationSchema()
  const websiteSchema = generateWebSiteSchema()

  return (
    <html lang="bg">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {/*
          GA4 + Google Consent Mode v2 bootstrap.
          MUST run before the external gtag/js loader so the very first
          network hit carries the correct consent defaults. Inlined directly
          in <head> (not via next/script) because beforeInteractive inline
          scripts are not guaranteed to run pre-hydration in App Router.
        */}
        <script
          id="ga4-consent-default"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('consent', 'default', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                functionality_storage: 'granted',
                security_storage: 'granted'
              });
              try {
                var flag = localStorage.getItem('zubite_cookie_consent');
                if (flag) {
                  var prefs = JSON.parse(localStorage.getItem('zubite_cookie_preferences') || '{}');
                  var update = {};
                  if (prefs && prefs.analytics) update.analytics_storage = 'granted';
                  if (prefs && prefs.marketing) {
                    update.ad_storage = 'granted';
                    update.ad_user_data = 'granted';
                    update.ad_personalization = 'granted';
                  }
                  if (Object.keys(update).length) gtag('consent', 'update', update);
                }
              } catch (e) { /* localStorage may be unavailable */ }
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                anonymize_ip: true,
                send_page_view: false
              });
            `,
          }}
        />
        {/* External GA4 loader — async, loads after consent defaults are
            already in dataLayer (above). Rendered as a vanilla async
            script so it bypasses any client-side Suspense boundary. */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      </head>
      <body className="overflow-x-hidden bg-[#F5F4F2] text-[#0A0A0A] antialiased">
        <Suspense fallback={null}>
          <AttributionTracker />
        </Suspense>
        <GoogleAnalyticsConsent />
        <RouteDesignScope>{children}</RouteDesignScope>
        <CookieConsent />
        <MetaPixel />
        {/* Hide Emergent badge injected by platform */}
        <style dangerouslySetInnerHTML={{ __html: `
          #emergent-badge,
          [id*="emergent"],
          [class*="emergent-badge"],
          a[href*="emergentagent.com"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            left: -9999px !important;
          }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function removeEmergentBadge() {
              var selectors = [
                '#emergent-badge',
                '[id*="emergent"]',
                '[class*="emergent-badge"]',
                'a[href*="emergentagent.com"]'
              ];
              selectors.forEach(function(sel) {
                document.querySelectorAll(sel).forEach(function(el) {
                  el.remove();
                });
              });
            }
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', removeEmergentBadge);
            } else {
              removeEmergentBadge();
            }
            // Also run after a delay and observe for dynamic injection
            setTimeout(removeEmergentBadge, 1000);
            setTimeout(removeEmergentBadge, 3000);
            var observer = new MutationObserver(removeEmergentBadge);
            observer.observe(document.body, { childList: true, subtree: true });
          })();
        `}} />
      </body>
    </html>
  )
}
