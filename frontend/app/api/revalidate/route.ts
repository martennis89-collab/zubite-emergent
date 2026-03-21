import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

// Secret key for securing the revalidation endpoint
// In production, this should be set in environment variables
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'zubite-revalidate-secret-2024'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { secret, path, slug, action } = body

    // Validate secret
    if (secret !== REVALIDATE_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Invalid secret' },
        { status: 401 }
      )
    }

    // Revalidate paths based on action type
    const revalidatedPaths: string[] = []

    // Always revalidate the blog listing page
    revalidatePath('/blog')
    revalidatedPaths.push('/blog')

    // Always revalidate the homepage (for recent articles section)
    revalidatePath('/')
    revalidatedPaths.push('/')

    // If a specific slug is provided, revalidate that post page
    if (slug) {
      revalidatePath(`/blog/${slug}`)
      revalidatedPaths.push(`/blog/${slug}`)
    }

    // If a specific path is provided, revalidate it
    if (path) {
      revalidatePath(path)
      revalidatedPaths.push(path)
    }

    console.log(`[Revalidation] Action: ${action || 'unknown'}, Paths: ${revalidatedPaths.join(', ')}`)

    return NextResponse.json({
      success: true,
      revalidated: true,
      paths: revalidatedPaths,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Revalidation Error]', error)
    return NextResponse.json(
      { success: false, message: 'Failed to revalidate', error: String(error) },
      { status: 500 }
    )
  }
}

// Also support GET for simple revalidation (with query params)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const secret = searchParams.get('secret')
  const path = searchParams.get('path')
  const slug = searchParams.get('slug')

  if (secret !== REVALIDATE_SECRET) {
    return NextResponse.json(
      { success: false, message: 'Invalid secret' },
      { status: 401 }
    )
  }

  const revalidatedPaths: string[] = []

  // Always revalidate main pages
  revalidatePath('/blog')
  revalidatedPaths.push('/blog')
  
  revalidatePath('/')
  revalidatedPaths.push('/')

  if (slug) {
    revalidatePath(`/blog/${slug}`)
    revalidatedPaths.push(`/blog/${slug}`)
  }

  if (path) {
    revalidatePath(path)
    revalidatedPaths.push(path)
  }

  return NextResponse.json({
    success: true,
    revalidated: true,
    paths: revalidatedPaths,
    timestamp: new Date().toISOString()
  })
}
