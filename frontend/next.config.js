/** @type {import('next').NextConfig} */

// ─── SEC-003 / hardening ─────────────────────────────────────────────
// Security headers — defence-in-depth so a sanitizer slip or accidental
// inline-handler injection still cannot exfiltrate / hijack visitors.
//
// CSP notes:
//   • Next.js needs `'unsafe-inline'` for styles (Tailwind injects critical
//     CSS) and we keep it for now. Next 14 hydration also requires
//     `'unsafe-inline'` for scripts unless we adopt nonces — adopting
//     nonces would touch every dangerouslySetInnerHTML on the site and
//     is out of scope for this P0 cleanup. We therefore ship a baseline
//     that materially shrinks XSS blast radius (no third-party JS hosts
//     other than the ones we actually use) and note the remaining gap.
//   • Analytics: GTM + Meta Pixel are loaded after consent — their hosts
//     are in script-src and img-src.
//   • Backend API + storage hosts are listed in connect-src / img-src.
//
// If CSP needs further tightening (strict-dynamic + nonces), do it in a
// follow-up with a dedicated test of every page that uses inline scripts.
// ─────────────────────────────────────────────────────────────────────

// Dev-only allowance so Impeccable live mode can load. Guarded by NODE_ENV.
const __impeccableLiveDev =
  process.env.NODE_ENV === 'development' ? ' http://localhost:8400' : ''

const CSP = [
  "default-src 'self'",
  // Scripts — Next needs unsafe-inline for hydration; restrict third-parties
  // to the analytics/pixel hosts we actually load post-consent.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://amplify.outbrain.com${__impeccableLiveDev}`,
  // Styles — Tailwind / Next inject inline styles
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images — allow http(s), data URLs for inline diagrams, and our own
  // preview/prod backends.
  "img-src 'self' data: blob: https: http:",
  // Media (video previews etc.)
  "media-src 'self' https: data:",
  // Network calls — same origin, plus analytics endpoints.
  `connect-src 'self' https: https://www.google-analytics.com https://*.facebook.com https://www.facebook.com${__impeccableLiveDev}`,
  // Frames — only Make.com/embedded video if needed in future; for now keep tight.
  "frame-src 'self' https://www.youtube.com https://www.facebook.com",
  // Workers / object — block plugins / java applets
  "object-src 'none'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  // Upgrade mixed content in production
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // HSTS — only meaningful on HTTPS. The production domain serves HTTPS
  // via the platform ingress, so it is safe to send.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig = {
  reactStrictMode: true,
  // This is a self-contained Vercel project rooted at frontend/. Avoid
  // monorepo lockfiles outside this directory influencing standalone traces.
  outputFileTracingRoot: __dirname,
  images: {
    domains: [],
    unoptimized: false,
  },
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8001'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
  // Legacy Bulgarian routes → English canonicals. Permanent (301) so search
  // engines transfer ranking and old links / QR codes keep working. The
  // nested clinic-catalog path (`/kliniki/[city]/[specialty]/[slug]`) is
  // covered by the `:path*` wildcard rule.
  async redirects() {
    return [
      { source: '/kliniki', destination: '/clinics', permanent: true },
      { source: '/kliniki/:path*', destination: '/clinics/:path*', permanent: true },
      { source: '/breketi', destination: '/braces', permanent: true },
      { source: '/za-kliniki', destination: '/for-clinics', permanent: true },
      { source: '/standart-za-kliniki', destination: '/clinic-standard', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        // Apply to every route. The headers are inert for API routes that
        // return JSON — they just travel along the response.
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/clinic-intake/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
