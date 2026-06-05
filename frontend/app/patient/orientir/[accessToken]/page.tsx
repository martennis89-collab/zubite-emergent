import { Metadata } from 'next'
import { OrientirContent } from './OrientirContent'

export const metadata: Metadata = {
  title: 'Твоят запазен ориентир | Zubite.bg',
  description:
    'Запазен ориентир от Zubite.bg + обяснение за Care Pass. Това не е диагноза.',
  // Magic-link pages must never end up in search results.
  robots: { index: false, follow: false, nocache: true },
}

// Next.js 14 typed route params — accessToken is captured opaquely
// and forwarded straight to the lookup endpoint. The page itself
// never reads or stores a lead_id.
export default function PatientOrientirPage({
  params,
}: {
  params: { accessToken: string }
}) {
  return <OrientirContent accessToken={params.accessToken} />
}
