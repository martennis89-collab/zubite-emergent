import type { Metadata } from 'next'
import './globals.css'
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/schema'

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
      <body className="font-inter antialiased">
        {children}
      </body>
    </html>
  )
}
