import type { Metadata } from 'next'
import './globals.css'
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/schema'
import { CookieConsent } from '@/components/CookieConsent'
import { MetaPixel } from '@/components/MetaPixel'
import { AttributionTracker } from '@/components/AttributionTracker'
import { Suspense } from 'react'

export const metadata: Metadata = {
  metadataBase: new URL('https://zubite.bg'),
  title: 'Дентални решения в България | Ортодонтия, Импланти, Естетика | Zubite.bg',
  description: 'Открийте най-доброто решение за вашите зъби. Ортодонтия, зъбни импланти, естетична стоматология, сънна апнея и TMJ лечение.',
  keywords: 'дентални решения, ортодонтия, зъбни импланти, естетична стоматология, invisalign, брекети, сънна апнея, TMJ, зъболекар софия, пловдив, варна',
  authors: [{ name: 'Zubite.bg' }],
  creator: 'Zubite.bg',
  publisher: 'Zubite.bg',
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
  alternates: {
    canonical: 'https://zubite.bg',
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="antialiased overflow-x-hidden">
        <Suspense fallback={null}>
          <AttributionTracker />
        </Suspense>
        {children}
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
