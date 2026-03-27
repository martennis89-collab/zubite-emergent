'use client'

import { useEffect } from 'react'

interface BlogViewTrackerProps {
  postSlug: string
}

// Generate a simple visitor ID based on browser fingerprint
function getVisitorId(): string {
  // Try to get existing visitor ID from localStorage
  const storageKey = 'zubite_visitor_id'
  let visitorId = localStorage.getItem(storageKey)
  
  if (!visitorId) {
    // Generate a new visitor ID based on some browser characteristics
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    let fingerprint = ''
    
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('visitor', 2, 2)
      fingerprint = canvas.toDataURL()
    }
    
    // Combine with other factors
    const factors = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      fingerprint.slice(-50) // Use last 50 chars of canvas fingerprint
    ].join('|')
    
    // Simple hash
    let hash = 0
    for (let i = 0; i < factors.length; i++) {
      const char = factors.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    visitorId = `v_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`
    localStorage.setItem(storageKey, visitorId)
  }
  
  return visitorId
}

export function BlogViewTracker({ postSlug }: BlogViewTrackerProps) {
  useEffect(() => {
    const trackView = async () => {
      try {
        const visitorId = getVisitorId()
        const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
        
        await fetch(`${API_URL}/api/blog/track-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            post_slug: postSlug,
            visitor_id: visitorId,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent
          })
        })
      } catch (error) {
        // Silently fail - tracking is not critical
        console.debug('View tracking failed:', error)
      }
    }
    
    // Track view after a short delay to ensure it's a real view
    const timeout = setTimeout(trackView, 2000)
    
    return () => clearTimeout(timeout)
  }, [postSlug])
  
  // This component renders nothing
  return null
}
