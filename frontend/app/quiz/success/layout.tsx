import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Резултатът ти | Zubite.bg',
  robots: { index: false, follow: false },
}

export default function QuizSuccessLayout({ children }: { children: ReactNode }) {
  return children
}
