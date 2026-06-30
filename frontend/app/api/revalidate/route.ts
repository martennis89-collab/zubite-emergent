import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

// ─── SEC-002 fix ─────────────────────────────────────────────────────
// Previously: `process.env.REVALIDATE_SECRET || 'zubite-revalidate-secret-2024'`
// — if production omitted the env var, anyone who learned the committed
// default could force repeated ISR rebuilds (cache churn / resource abuse).
// Now: secret is mandatory. Missing env var → 503 + server-side log; the
// endpoint never falls back to a baked-in value.
// ─────────────────────────────────────────────────────────────────────

function getConfiguredSecret(): string | null {
  const s = process.env.REVALIDATE_SECRET
  if (!s || s.length < 16) return null
  return s
}

function unauthorized() {
  return NextResponse.json(
    { success: false, message: 'Invalid secret' },
    { status: 401 },
  )
}

function misconfigured() {
  // Log once per request — production must surface this in monitoring.
  console.error(
    '[Revalidation] REJECTED — REVALIDATE_SECRET env var is missing or too short. ' +
      'No revalidation will be performed until it is configured.',
  )
  return NextResponse.json(
    {
      success: false,
      message: 'Revalidation secret not configured on server',
    },
    { status: 503 },
  )
}

function authorize(provided: string | null | undefined): NextResponse | null {
  const expected = getConfiguredSecret()
  if (!expected) return misconfigured()
  if (!provided || provided !== expected) return unauthorized()
  return null
}

function doRevalidate(slug?: string | null, path?: string | null): string[] {
  const revalidated: string[] = []
  revalidatePath('/blog')
  revalidated.push('/blog')
  revalidatePath('/')
  revalidated.push('/')
  if (slug) {
    revalidatePath(`/blog/${slug}`)
    revalidated.push(`/blog/${slug}`)
  }
  if (path) {
    revalidatePath(path)
    revalidated.push(path)
  }
  return revalidated
}

export async function POST(request: NextRequest) {
  // Authorize FIRST, before touching the body, so a malformed body cannot
  // hide a misconfiguration (or leak a 500 to unauthenticated callers).
  try {
    let secret: unknown = null
    let path: unknown = null
    let slug: unknown = null
    let action: unknown = null
    try {
      const body = await request.json()
      secret = body?.secret
      path = body?.path
      slug = body?.slug
      action = body?.action
    } catch {
      // No / invalid JSON body — fall through and let authorize() reject.
    }

    const denied = authorize(typeof secret === 'string' ? secret : null)
    if (denied) return denied

    const revalidatedPaths = doRevalidate(
      typeof slug === 'string' ? slug : null,
      typeof path === 'string' ? path : null,
    )
    console.log(
      `[Revalidation] Action: ${typeof action === 'string' ? action : 'unknown'}, Paths: ${revalidatedPaths.join(', ')}`,
    )

    return NextResponse.json({
      success: true,
      revalidated: true,
      paths: revalidatedPaths,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Revalidation Error]', error)
    return NextResponse.json(
      { success: false, message: 'Failed to revalidate', error: String(error) },
      { status: 500 },
    )
  }
}

// Also support GET for simple revalidation (with query params)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const secret = searchParams.get('secret')
  const path = searchParams.get('path')
  const slug = searchParams.get('slug')

  const denied = authorize(secret)
  if (denied) return denied

  const revalidatedPaths = doRevalidate(slug, path)

  return NextResponse.json({
    success: true,
    revalidated: true,
    paths: revalidatedPaths,
    timestamp: new Date().toISOString(),
  })
}
