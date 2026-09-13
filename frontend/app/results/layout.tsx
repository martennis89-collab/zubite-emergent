import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Lead-specific result routes must NEVER be indexed.
 *
 * Applies to every route nested under /results:
 *   • /results/[leadId]                 (partial result + contact gate)
 *   • /results/[leadId]/clinics         (personalised recommendations)
 *   • /results/[leadId]/clinics/[id]   (lead-contextual clinic profile)
 *
 * Privacy note: do NOT include patient data in metadata (no leadId, no
 * name, no phone). The robots meta tag is the only surface we touch.
 */
export const metadata: Metadata = {
  title: 'Твоят дентален ориентир | Zubite.bg',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function ResultsLayout({ children }: { children: ReactNode }) {
  return children
}
