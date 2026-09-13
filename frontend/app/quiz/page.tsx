import { Metadata } from 'next'
import { Suspense } from 'react'
import { MasterQuiz } from '@/components/MasterQuiz'

export const metadata: Metadata = {
  title: 'Провери на кой етап си | Zubite.bg',
  description: 'Кратка оценка, която ще ти помогне да разбереш дали имаш ранни признаци на проблеми със захапката.',
  robots: 'noindex, nofollow'
}

export default function QuizPage() {
  return (
    <Suspense fallback={null}>
      <MasterQuiz />
    </Suspense>
  )
}
