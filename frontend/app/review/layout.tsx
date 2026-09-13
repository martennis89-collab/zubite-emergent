import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Сподели отзив | Zubite.bg',
  robots: { index: false, follow: false },
}

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return children
}
