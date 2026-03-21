'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'

// Quiz questions - EXACT as specified
const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: 'Имаш ли усещане, че някои зъби са леко струпани или застъпени?',
    options: [
      { label: 'Да', value: 'yes', score: 2 },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'q2',
    question: 'Когато захапеш, усещаш ли зъбите си напълно равномерно?',
    options: [
      { label: 'Не', value: 'no', score: 2 },
      { label: 'Не съм сигурен', value: 'unsure', score: 1 },
      { label: 'Да', value: 'yes', score: 0 },
    ]
  },
  {
    id: 'q3',
    question: 'Дъвчеш ли повече от едната страна, без да се замисляш?',
    options: [
      { label: 'Да', value: 'yes', score: 2 },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'q4',
    question: 'Случва ли се да дишаш през устата (особено нощем)?',
    options: [
      { label: 'Да', value: 'yes', score: 2 },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'q5',
    question: 'Чуваш ли щракане или пукане при отваряне на устата?',
    options: [
      { label: 'Да', value: 'yes', score: 2 },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'q6',
    question: 'Събуждаш ли се с напрежение в челюстта или лицето?',
    options: [
      { label: 'Да', value: 'yes', score: 2 },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'q7',
    question: 'Задържа ли се храна на едни и същи места между зъбите?',
    options: [
      { label: 'Да', value: 'yes', score: 2 },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'q8',
    question: 'Забелязал ли си зъбите ти да изглеждат по-износени с времето?',
    options: [
      { label: 'Да', value: 'yes', score: 2 },
      { label: 'Не съм сигурен', value: 'unsure', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'q9',
    question: 'Имаш ли главоболие, напрежение във врата или ушите без ясна причина?',
    options: [
      { label: 'Да', value: 'yes', score: 2 },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'q10',
    question: 'Преди този тест мислеше ли, че имаш проблем със зъбите?',
    options: [
      { label: 'Не', value: 'no', score: 2 },
      { label: 'Не бях сигурен', value: 'unsure', score: 1 },
      { label: 'Да', value: 'yes', score: 0 },
    ]
  },
]

// Result bands
type ResultBand = 'early' | 'progression' | 'advanced'

interface QuizResult {
  band: ResultBand
  score: number
  headline: string
  description: string
  ctaText: string
  ctaLink: string
}

const calculateResult = (totalScore: number): QuizResult => {
  // Max score = 20 (10 questions * 2 points max)
  // Early: 0-6, Progression: 7-12, Advanced: 13-20
  
  if (totalScore <= 6) {
    return {
      band: 'early',
      score: totalScore,
      headline: 'Вероятно си в ранен етап — но не всичко е толкова безобидно.',
      description: 'Добрата новина е, че повечето неща са по-лесни за корекция сега. Но дори и малки признаци могат да се развият, ако бъдат игнорирани.',
      ctaText: 'Виж какво правят хора в твоята ситуация',
      ctaLink: '/orthodontics'
    }
  } else if (totalScore <= 12) {
    return {
      band: 'progression',
      score: totalScore,
      headline: 'Не си в безопасната зона — но все още е лесно да се коригира.',
      description: 'Признаците, които описваш, показват, че нещо вече се развива. Колкото по-рано се вземат мерки, толкова по-прост е процесът.',
      ctaText: 'Виж какво правят хора в твоята ситуация',
      ctaLink: '/orthodontics'
    }
  } else {
    return {
      band: 'advanced',
      score: totalScore,
      headline: 'Вероятно вече си в етап, в който проблемът се развива.',
      description: 'Това не означава, че е твърде късно — но означава, че е време да разбереш какви са опциите ти. Колкото повече чакаш, толкова по-сложно става.',
      ctaText: 'Виж какво правят хора в твоята ситуация',
      ctaLink: '/implants' // placeholder for restorative page
    }
  }
}

export function MasterQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ questionId: string; score: number }[]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </main>
    )
  }

  const progress = result 
    ? 100 
    : ((currentQuestion) / QUIZ_QUESTIONS.length) * 100

  const handleAnswer = (questionId: string, score: number) => {
    setIsTransitioning(true)
    
    const newAnswers = [...answers, { questionId, score }]
    setAnswers(newAnswers)

    setTimeout(() => {
      if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
        setCurrentQuestion(prev => prev + 1)
      } else {
        // Calculate final result
        const totalScore = newAnswers.reduce((sum, a) => sum + a.score, 0)
        const quizResult = calculateResult(totalScore)
        setResult(quizResult)
      }
      setIsTransitioning(false)
    }, 200)
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setAnswers(prev => prev.slice(0, -1))
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const getBandStyles = (band: ResultBand) => {
    switch (band) {
      case 'early':
        return {
          bgGradient: 'from-emerald-50 to-emerald-100/50',
          borderColor: 'border-emerald-200',
          textColor: 'text-emerald-800',
          accentColor: 'bg-emerald-500',
          dotColor: 'bg-emerald-400'
        }
      case 'progression':
        return {
          bgGradient: 'from-amber-50 to-amber-100/50',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-800',
          accentColor: 'bg-amber-500',
          dotColor: 'bg-amber-400'
        }
      case 'advanced':
        return {
          bgGradient: 'from-red-50 to-red-100/50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          accentColor: 'bg-red-500',
          dotColor: 'bg-red-400'
        }
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
              Zubite<span className="text-sky-500">.bg</span>
            </Link>
            {!result && (
              <span className="text-sm text-slate-500">
                {currentQuestion + 1} / {QUIZ_QUESTIONS.length}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="pt-14 min-h-screen flex flex-col">
        {/* Progress Bar */}
        {!result && (
          <div className="sticky top-14 z-40 bg-white/80 backdrop-blur-sm">
            <div className="h-1 bg-slate-100">
              <div
                className="h-full bg-sky-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs text-slate-400 py-2">
              Проверяваме твоята ситуация...
            </p>
          </div>
        )}

        {/* Quiz Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-xl">
            
            {/* Question Screen */}
            {!result && (
              <div 
                className={`transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
              >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                  <h1 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-8 leading-relaxed">
                    {QUIZ_QUESTIONS[currentQuestion].question}
                  </h1>

                  <div className="space-y-3">
                    {QUIZ_QUESTIONS[currentQuestion].options.map((option, index) => (
                      <button
                        key={option.value}
                        onClick={() => handleAnswer(
                          QUIZ_QUESTIONS[currentQuestion].id,
                          option.score
                        )}
                        className="w-full text-left p-4 sm:p-5 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50/50 transition-all duration-200 group"
                        style={{ animationDelay: `${index * 50}ms` }}
                        data-testid={`option-${option.value}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-sm font-medium text-slate-400 group-hover:border-sky-400 group-hover:text-sky-500 transition-colors">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="text-base sm:text-lg">{option.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {currentQuestion > 0 && (
                    <button
                      onClick={handleBack}
                      className="mt-6 flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm"
                      data-testid="quiz-back-btn"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Назад
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Result Screen */}
            {result && (
              <div className="animate-fade-in-up">
                {(() => {
                  const styles = getBandStyles(result.band)
                  return (
                    <div className={`bg-gradient-to-br ${styles.bgGradient} rounded-2xl border-2 ${styles.borderColor} p-6 sm:p-10`}>
                      {/* Result indicator */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-3 h-3 rounded-full ${styles.dotColor}`} />
                        <span className={`text-sm font-medium ${styles.textColor} uppercase tracking-wide`}>
                          {result.band === 'early' ? 'Ранен етап' : result.band === 'progression' ? 'Развиващ се' : 'Напреднал етап'}
                        </span>
                      </div>

                      <h1 className={`font-serif text-2xl sm:text-3xl font-semibold ${styles.textColor} mb-6 leading-tight`}>
                        {result.headline}
                      </h1>

                      <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8">
                        {result.description}
                      </p>

                      <Link
                        href={result.ctaLink}
                        className="inline-flex items-center gap-3 w-full sm:w-auto justify-center px-8 py-4 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-300 group"
                        data-testid="result-cta"
                      >
                        <span>{result.ctaText}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>

                      <div className="mt-8 pt-6 border-t border-slate-200/50">
                        <p className="text-sm text-slate-500 text-center">
                          Тази оценка не замества преглед при специалист.
                        </p>
                      </div>
                    </div>
                  )
                })()}

                {/* Secondary CTA */}
                <div className="mt-6 text-center">
                  <Link
                    href="/"
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Обратно към началото
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  )
}
