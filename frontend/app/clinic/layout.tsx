import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Портал за клиники | Zubite.bg',
  robots: { index: false, follow: false },
}

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return children
}
