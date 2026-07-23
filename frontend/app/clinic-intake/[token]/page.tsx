import type { Metadata } from 'next'
import { PrivateClinicIntakeClient } from './PrivateClinicIntakeClient'

export const metadata: Metadata = {
  title: 'Защитен clinic intake | Zubite.bg',
  description: 'Непублична форма за информация от партньорска клиника.',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
}

export const dynamic = 'force-dynamic'

export default function PrivateClinicIntakePage() {
  return <PrivateClinicIntakeClient />
}
