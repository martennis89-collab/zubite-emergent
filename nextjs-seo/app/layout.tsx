import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://zubite.bg'),
  title: 'Дентални решения в България | Invisalign, Импланти и Естетична стоматология | Zubite.bg',
  description: 'Открийте най-доброто решение за вашите зъби. Научете дали имате нужда от алайнери, брекети, импланти или естетична стоматология и се свържете с проверени клиники.',
  keywords: 'дентални решения, invisalign българия, зъбни импланти, ортодонтия, брекети, естетична стоматология, зъболекар софия, зъбни клиники',
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
    languages: {
      'bg-BG': 'https://zubite.bg',
      'en-US': 'https://zubite.bg/en',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'bg_BG',
    url: 'https://zubite.bg',
    siteName: 'Zubite.bg',
    title: 'Дентални решения в България | Zubite.bg',
    description: 'Открийте най-доброто решение за вашите зъби. Научете дали имате нужда от алайнери, брекети, импланти или естетична стоматология.',
    images: [
      {
        url: '/og-image.jpg',
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
    images: ['/og-image.jpg'],
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
  return (
    <html lang="bg">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-inter antialiased">
        {children}
      </body>
    </html>
  )
}
