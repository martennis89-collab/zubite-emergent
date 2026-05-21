/**
 * Normalise image URLs coming from the CMS / blog API for browser rendering.
 *
 * Three real-world inputs we receive:
 *
 *  1. **Backend-relative paths** (most common, e.g. `/api/files/<uuid>`).
 *     These break in production because the frontend lives on `zubite.bg`
 *     while the API lives on a different host. We prepend
 *     `NEXT_PUBLIC_API_URL` (which equals the backend origin).
 *
 *  2. **Google Drive "view" links** like
 *     `https://lh3.googleusercontent.com/d/{id}` or
 *     `https://drive.google.com/file/d/{id}/view`. These do not always
 *     render as a direct image. We rewrite them to the direct-image
 *     endpoint `https://drive.google.com/uc?export=view&id={id}`.
 *
 *  3. **Absolute https URLs** from a CDN — pass through untouched.
 *
 * Empty/null inputs return an empty string so callers can guard with
 * `{src && <img …/>}` without runtime errors.
 */

const DRIVE_ID_RE =
  /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=|lh3\.googleusercontent\.com\/d\/)([\w-]{20,})/

// Retired Emergent backend hostnames that some legacy blog records still
// reference. Any /api/files/... URL pointing at one of these gets rewritten
// to the active backend host (NEXT_PUBLIC_API_URL) so existing images keep
// rendering after backend migrations.
const RETIRED_HOSTS = [
  'orthodontics-quiz-1.emergent.host',
  'orthodontics-quiz-2.emergent.host',
]

export function resolveImageUrl(src: string | null | undefined): string {
  if (!src) return ''
  const trimmed = src.trim()
  if (!trimmed) return ''

  // Google Drive normalisation — prefer the direct `lh3` content URL,
  // which bypasses the redirect chain through drive.usercontent.google.com.
  // Browsers sometimes refuse to render those redirected images in <img>
  // tags. The `=w1600` size param requests a sensibly-sized JPEG.
  const driveMatch = trimmed.match(DRIVE_ID_RE)
  if (driveMatch) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}=w1600`
  }

  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    ''
  ).replace(/\/$/, '')

  // Rewrite retired backend hostnames so existing /api/files/... paths
  // still resolve. If `NEXT_PUBLIC_API_URL` is configured (cross-origin
  // setup like preview), prepend it; otherwise fall back to a same-origin
  // relative path — the browser will resolve `/api/files/...` against the
  // current host, which is what we want when the API lives on the same
  // origin as the frontend (production zubite.bg).
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed)
      if (RETIRED_HOSTS.includes(u.host)) {
        const path = `${u.pathname}${u.search}`
        return apiBase ? `${apiBase}${path}` : path
      }
    } catch {
      /* malformed URL — fall through and return as-is */
    }
    return trimmed
  }

  // data:/blob:
  if (/^(data:|blob:)/i.test(trimmed)) {
    return trimmed
  }

  // Backend-relative — prepend the API origin so production cross-domain works
  if (trimmed.startsWith('/')) {
    if (apiBase) {
      return `${apiBase}${trimmed}`
    }
    return trimmed
  }

  return trimmed
}
