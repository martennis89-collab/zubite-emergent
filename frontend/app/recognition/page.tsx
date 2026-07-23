import type { Metadata } from 'next'
import { RecognitionWall } from '@/components/recognition/RecognitionWall'

export const metadata: Metadata = {
  title: 'Wall of Recognition — благодарности от пациенти | Zubite.bg',
  description: 'Публични пациентски благодарности след дентална грижа — отделени от ревюта, рейтинги и препоръки.',
}

export default function RecognitionPage() {
  return <RecognitionWall />
}
