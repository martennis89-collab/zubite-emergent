import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Потвърждение за контакт | Zubite.bg',
  robots: { index: false, follow: false, nocache: true },
}

export default function VerifyLayout({ children }: { children: ReactNode }) {
  return children
}
