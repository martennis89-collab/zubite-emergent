'use client'

/**
 * <ClientParallaxMount /> — tiny client-only mount that activates the
 * global `--py` scroll variable on a server-rendered page. The
 * background blobs and decorative SVG layers already use
 *   transform: translate3d(0, calc(var(--py,0) * -0.08px), 0)
 * via inline styles — so once `--py` starts updating, those layers
 * drift on scroll. No DOM is rendered by this component itself.
 *
 * Drop one of these at the top of any server page (e.g. /care-pass,
 * /treatments, /breketi) to opt that page into the parallax system
 * that has lived on the homepage since June 2026. Mobile / reduced
 * motion are honoured inside the hook itself.
 */

import { useEffect } from 'react'

export function ClientParallaxMount() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const update = () => {
      document.documentElement.style.setProperty('--py', String(window.scrollY))
      raf = 0
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return null
}
