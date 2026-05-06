'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { captureAttribution } from '@/lib/attribution'

/**
 * Mounted once near the root of the app. Captures attribution on the initial
 * load and whenever the pathname or search params change (Next.js client-side
 * navigation does not trigger a fresh page load, so we re-capture explicitly).
 */
export function AttributionTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    captureAttribution()
  }, [pathname, searchParams])

  return null
}
