import { Metadata } from 'next'
import { OrthodonticsQuiz } from '@/components/OrthodonticsQuiz'

export const metadata: Metadata = {
  title: 'Ортодонтска оценка | Zubite.bg',
  description: 'Разберете дали ортодонтско лечение може да е подходящо за вас. Бърза оценка за алайнери и брекети.',
  robots: 'noindex, nofollow'
}

export default function OrthodonticsQuizPage() {
  return <OrthodonticsQuiz />
}
