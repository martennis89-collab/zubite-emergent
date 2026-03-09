import { Metadata } from 'next'
import { OrthodonticsQuiz } from '@/components/OrthodonticsQuiz'

export const metadata: Metadata = {
  title: 'Ортодонтска оценка | Zubite.bg',
  description: 'Кратка ортодонтска оценка, която ще ви помогне да се ориентирате между алайнери, брекети и следващи стъпки.',
  robots: 'noindex, nofollow'
}

export default function AssessmentQuizPage() {
  return <OrthodonticsQuiz />
}
