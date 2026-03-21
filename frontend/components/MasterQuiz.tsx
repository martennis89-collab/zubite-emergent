'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, MapPin, Phone, X } from 'lucide-react'
import { 
  trackQuizStart, 
  trackQuestionAnswered, 
  trackQuizComplete, 
  trackSoftCommit, 
  trackLeadSubmit 
} from './MetaPixel'

// Quiz questions
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

// Micro-insights after specific questions
const MICRO_INSIGHTS: Record<number, string> = {
  2: 'Повечето хора с такива усещания нямат болка… но това често е началото.',
  5: 'Около 60% от хората имат подобни признаци — но малко от тях действат навреме.',
  6: 'Остава малко — почти си готов.',
  8: 'Когато се стигне до износване, решението рядко остава толкова лесно, колкото в началото.',
}

// Result bands with content
type ResultBand = 'early' | 'progressing' | 'advanced'

interface ResultContent {
  bandLabel: string
  headline: string
  explanation: string
  urgency: string
  education: string
}

const RESULT_CONTENT: Record<ResultBand, ResultContent> = {
  early: {
    bandLabel: 'Ранен етап',
    headline: 'Вероятно си в ранен етап.',
    explanation: 'Показваш леки сигнали, които често остават незабелязани в началото. Това не означава непременно сериозен проблем, но не е и нещо, което трябва напълно да игнорираш.',
    urgency: 'Добър момент е да потърсиш оценка навреме — преди ситуацията да стане по-сложна.',
    education: 'Ранният етап често е най-лесният за корекция. Важно е да се знае, че този резултат не определя какво лечение ти трябва, а само показва, че има смисъл от професионална оценка.'
  },
  progressing: {
    bandLabel: 'Развиващ се етап',
    headline: 'Има признаци, че проблемът се развива.',
    explanation: 'Отговорите ти показват модел, който често се задълбочава с времето. Това не означава автоматично тежък случай, но означава, че не е добра идея да отлагаш.',
    urgency: 'Добре е да потърсиш професионална оценка скоро, за да разбереш какви са вариантите ти, преди лечението да стане по-сложно.',
    education: 'Този резултат не определя конкретно лечение. Той показва, че вече има достатъчно сигнали, за да си струва по-сериозна оценка от специалист.'
  },
  advanced: {
    bandLabel: 'Напреднал етап',
    headline: 'Вероятно си в по-напреднал етап.',
    explanation: 'Отговорите ти показват повече сигнали, които често се свързват с по-изразен или по-дълго развиващ се проблем. Това не означава автоматично какво лечение ти трябва — но означава, че не бива да отлагаш.',
    urgency: 'Добре е да потърсиш професионална помощ възможно най-скоро, за да разбереш какви са реалните ти опции.',
    education: 'Този резултат не е диагноза и не означава автоматично импланти, брекети или алайнери. Той просто показва, че ситуацията вероятно изисква по-бърза и по-внимателна оценка от специалист.'
  }
}

const CITIES = [
  { value: 'sofia', label: 'София' },
  { value: 'plovdiv', label: 'Пловдив' },
]

const calculateBand = (totalScore: number): ResultBand => {
  if (totalScore <= 5) return 'early'
  if (totalScore <= 12) return 'progressing'
  return 'advanced'
}

const getBandStyles = (band: ResultBand) => {
  switch (band) {
    case 'early':
      return {
        bgGradient: 'from-emerald-50 to-emerald-100/30',
        borderColor: 'border-emerald-200',
        textColor: 'text-emerald-800',
        accentBg: 'bg-emerald-100',
        dotColor: 'bg-emerald-500',
        labelBg: 'bg-emerald-100',
        labelText: 'text-emerald-700'
      }
    case 'progressing':
      return {
        bgGradient: 'from-amber-50 to-amber-100/30',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        accentBg: 'bg-amber-100',
        dotColor: 'bg-amber-500',
        labelBg: 'bg-amber-100',
        labelText: 'text-amber-700'
      }
    case 'advanced':
      return {
        bgGradient: 'from-red-50 to-red-100/30',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        accentBg: 'bg-red-100',
        dotColor: 'bg-red-500',
        labelBg: 'bg-red-100',
        labelText: 'text-red-700'
      }
  }
}

// Generate session ID for analytics
const generateSessionId = () => {
  return `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function MasterQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ questionId: string; value: string; score: number }[]>([])
  const [result, setResult] = useState<{ band: ResultBand; score: number } | null>(null)
  const [step, setStep] = useState<'quiz' | 'insight' | 'result' | 'soft_commit' | 'form' | 'exit' | 'success'>('quiz')
  const [formVersion, setFormVersion] = useState<'A' | 'B'>('A')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showInsight, setShowInsight] = useState(false)
  const [currentInsight, setCurrentInsight] = useState('')
  
  const sessionId = useRef<string>('')
  const startTime = useRef<number>(0)
  const questionStartTime = useRef<number>(0)

  useEffect(() => {
    setIsClient(true)
    // Randomly assign form version A or B for A/B testing
    setFormVersion(Math.random() > 0.5 ? 'A' : 'B')
    // Generate session ID
    sessionId.current = generateSessionId()
    startTime.current = Date.now()
    questionStartTime.current = Date.now()
    
    // Track quiz start (internal analytics)
    trackEvent('quiz_start', { session_id: sessionId.current })
    
    // Track quiz start (Meta Pixel)
    trackQuizStart()
  }, [])

  // Track analytics event
  const trackEvent = async (eventType: string, data: Record<string, unknown>) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      await fetch(`${API_URL}/api/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          session_id: sessionId.current,
          timestamp: new Date().toISOString(),
          ...data
        })
      })
    } catch {
      // Silent fail for analytics
    }
  }

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

  const handleAnswer = (questionId: string, value: string, score: number) => {
    const timeSpent = Date.now() - questionStartTime.current
    
    // Track question answer (internal analytics)
    trackEvent('question_answered', {
      question_id: questionId,
      question_index: currentQuestion + 1,
      answer: value,
      score,
      time_spent_ms: timeSpent
    })
    
    // Track question answer (Meta Pixel)
    trackQuestionAnswered(currentQuestion + 1, value)

    setIsTransitioning(true)
    
    const newAnswers = [...answers, { questionId, value, score }]
    setAnswers(newAnswers)

    const nextQuestionIndex = currentQuestion + 1

    setTimeout(() => {
      // Check if we need to show micro-insight
      const insightText = MICRO_INSIGHTS[nextQuestionIndex]
      
      if (insightText && nextQuestionIndex <= QUIZ_QUESTIONS.length) {
        setCurrentInsight(insightText)
        setShowInsight(true)
        setStep('insight')
      } else if (nextQuestionIndex < QUIZ_QUESTIONS.length) {
        setCurrentQuestion(nextQuestionIndex)
        questionStartTime.current = Date.now()
      } else {
        // Calculate final result
        const totalScore = newAnswers.reduce((sum, a) => sum + a.score, 0)
        const band = calculateBand(totalScore)
        setResult({ band, score: totalScore })
        
        // Track quiz completion (internal analytics)
        const totalTime = Date.now() - startTime.current
        trackEvent('quiz_completed', {
          total_score: totalScore,
          band,
          total_time_ms: totalTime,
          answers: newAnswers.map(a => ({ q: a.questionId, v: a.value, s: a.score }))
        })
        
        // Track quiz completion (Meta Pixel)
        trackQuizComplete(band, totalScore)
        
        setStep('result')
      }
      setIsTransitioning(false)
    }, 200)
  }

  const handleInsightContinue = () => {
    setShowInsight(false)
    setStep('quiz')
    setCurrentQuestion(prev => prev + 1)
    questionStartTime.current = Date.now()
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setAnswers(prev => prev.slice(0, -1))
      setCurrentQuestion(prev => prev - 1)
      questionStartTime.current = Date.now()
    }
  }

  const handleSoftCommitYes = () => {
    trackEvent('soft_commit', { choice: 'yes' })
    trackSoftCommit(true) // Meta Pixel
    setStep('form')
  }

  const handleSoftCommitNo = () => {
    trackEvent('soft_commit', { choice: 'no' })
    trackSoftCommit(false) // Meta Pixel
    setStep('exit')
  }

  const handleSubmit = async () => {
    // Validate required fields based on form version
    if (formVersion === 'A') {
      if (!formData.name.trim()) {
        setError('Моля, въведете името си')
        return
      }
    }
    if (!formData.phone.trim()) {
      setError('Моля, въведете телефонен номер')
      return
    }
    if (!formData.city) {
      setError('Моля, изберете град')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const answersObj: Record<string, string> = {}
      answers.forEach(a => {
        answersObj[a.questionId] = a.value
      })

      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      
      const leadData = {
        city_slug: formData.city,
        treatment_type: 'master_quiz',
        answers: {
          ...answersObj,
          quiz_score: result?.score || 0,
          quiz_band: result?.band || '',
          form_version: formVersion,
          session_id: sessionId.current,
          source: 'master_quiz_v3'
        },
        score_total: result?.score || 0,
        band: result?.band === 'early' ? 'GREEN' : result?.band === 'progressing' ? 'YELLOW' : 'RED',
        name: formData.name || '',
        phone: formData.phone,
        email: formData.email || '',
        consent: true,
        source: 'master_quiz_v3',
        form_version: formVersion
      }

      const response = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      })

      if (!response.ok) {
        throw new Error('Failed to submit')
      }

      // Track form submission (internal analytics)
      trackEvent('form_submitted', {
        form_version: formVersion,
        city: formData.city,
        has_name: !!formData.name,
        has_email: !!formData.email
      })
      
      // Track lead submission (Meta Pixel - standard Lead event)
      trackLeadSubmit(formData.city, formVersion)

      setStep('success')
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // INSIGHT SCREEN
  if (step === 'insight' && showInsight) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="pt-14 min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg animate-fade-in-up">
            <div className="bg-slate-800 rounded-2xl p-8 sm:p-10 text-center shadow-xl">
              <p className="text-white/90 text-lg sm:text-xl leading-relaxed mb-8 font-light">
                „{currentInsight}"
              </p>
              
              <button
                onClick={handleInsightContinue}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 font-medium rounded-full hover:bg-slate-100 transition-all duration-300 group"
                data-testid="insight-continue-btn"
              >
                <span>Продължи</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // QUIZ SCREEN
  if (step === 'quiz' && !result) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
              <span className="text-sm text-slate-500">
                {currentQuestion + 1} / {QUIZ_QUESTIONS.length}
              </span>
            </div>
          </div>
        </header>

        <div className="pt-14 min-h-screen flex flex-col">
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

          <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
            <div className="w-full max-w-xl">
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
                          option.value,
                          option.score
                        )}
                        className="w-full text-left p-4 sm:p-5 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50/50 transition-all duration-200 group"
                        style={{ animationDelay: `${index * 60}ms` }}
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
            </div>
          </div>
        </div>
      </main>
    )
  }

  // RESULT SCREEN
  if (step === 'result' && result) {
    const content = RESULT_CONTENT[result.band]
    const styles = getBandStyles(result.band)

    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center h-14">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="pt-14 min-h-screen px-4 py-8 sm:py-12">
          <div className="w-full max-w-2xl mx-auto">
            <div className={`bg-gradient-to-br ${styles.bgGradient} rounded-2xl border-2 ${styles.borderColor} p-6 sm:p-8 mb-8 animate-fade-in-up`}>
              <div className="flex items-center gap-2 mb-6">
                <span className={`w-2.5 h-2.5 rounded-full ${styles.dotColor}`} />
                <span className={`text-sm font-semibold ${styles.labelText} ${styles.labelBg} px-3 py-1 rounded-full`}>
                  {content.bandLabel}
                </span>
              </div>

              <h1 className={`font-serif text-2xl sm:text-3xl font-semibold ${styles.textColor} mb-6 leading-tight`}>
                {content.headline}
              </h1>

              <p className="text-slate-700 text-base sm:text-lg leading-relaxed mb-6">
                {content.explanation}
              </p>

              <div className={`${styles.accentBg} rounded-xl p-4 mb-6`}>
                <p className={`${styles.textColor} font-medium`}>
                  {content.urgency}
                </p>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed border-t border-slate-200/50 pt-6">
                {content.education}
              </p>
            </div>

            {/* Continue to soft commit */}
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <button
                onClick={() => {
                  trackEvent('result_to_soft_commit', { band: result.band })
                  setStep('soft_commit')
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-300 group"
                data-testid="result-continue-btn"
              >
                <span>Виж какви са опциите ти</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // SOFT COMMIT SCREEN
  if (step === 'soft_commit') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center h-14">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="pt-14 min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg animate-fade-in-up">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 sm:p-10 text-center">
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
                Искаш ли да видиш какви са опциите ти оттук нататък?
              </h1>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-10">
                Можем да ти препоръчаме 3 подходящи клиники според твоя резултат и град.
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleSoftCommitYes}
                  className="w-full px-8 py-4 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-300 flex items-center justify-center gap-2 group"
                  data-testid="soft-commit-yes"
                >
                  <span>Да, покажете ми опциите</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  onClick={handleSoftCommitNo}
                  className="w-full px-8 py-4 text-slate-500 font-medium rounded-full hover:text-slate-700 hover:bg-slate-100 transition-all duration-300"
                  data-testid="soft-commit-no"
                >
                  Не сега
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // EXIT SCREEN
  if (step === 'exit') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center h-14">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="pt-14 min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg animate-fade-in-up">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <X className="w-7 h-7 text-slate-400" />
              </div>

              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Разбираемо. Ако решиш по-късно, винаги можеш да провериш отново.
              </p>

              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-100 text-slate-700 font-medium rounded-full hover:bg-slate-200 transition-all duration-300"
                data-testid="exit-home-btn"
              >
                Обратно към началото
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // FORM SCREEN
  if (step === 'form') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center h-14">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="pt-14 min-h-screen px-4 py-8 sm:py-12">
          <div className="w-full max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 animate-fade-in-up">
              
              {/* Form Value Prop */}
              <div className="text-center mb-8 pb-6 border-b border-slate-100">
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-3">
                  Получете 3 препоръчани клиники
                </h2>
                <p className="text-slate-600 text-sm sm:text-base">
                  Ще получиш 3 реални препоръки според твоя случай — не просто списък с клиники.
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                
                {/* Version A: Full form */}
                {formVersion === 'A' && (
                  <>
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Име <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                        placeholder="Вашето име"
                        data-testid="input-name"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Телефон <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                        placeholder="+359 888 123 456"
                        data-testid="input-phone"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Имейл
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                        placeholder="email@example.com"
                        data-testid="input-email"
                      />
                    </div>
                  </>
                )}

                {/* Version B: Simplified form */}
                {formVersion === 'B' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Телефон <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                      placeholder="+359 888 123 456"
                      data-testid="input-phone"
                    />
                  </div>
                )}

                {/* City - Both versions */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Град <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CITIES.map(city => (
                      <button
                        key={city.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, city: city.value }))}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 font-medium ${
                          formData.city === city.value
                            ? 'bg-sky-50 border-sky-500 text-sky-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                        data-testid={`city-${city.value}`}
                      >
                        <MapPin className="w-4 h-4" />
                        {city.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-xl">
                    {error}
                  </p>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full mt-4 px-8 py-4 bg-sky-500 text-white font-semibold rounded-full hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Изпращане...
                    </>
                  ) : (
                    <>
                      Изпрати и получи 3 опции
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Trust Text */}
                <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">
                  Без ангажимент. Не сме клиника.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // SUCCESS SCREEN
  if (step === 'success') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center h-14">
              <Link href="/" className="font-serif text-xl font-semibold text-slate-900">
                Zubite<span className="text-sky-500">.bg</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="pt-14 min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg animate-fade-in-up">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 sm:p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
                Получихме твоите данни.
              </h1>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-6">
                Ще прегледаме отговорите ти и ще се свържем с теб с 3 подходящи опции за клиники според твоята ситуация и избрания град.
              </p>

              <p className="text-sm text-slate-500 mb-8 pb-8 border-b border-slate-100">
                Този резултат не е диагноза, а насока кога е добре да потърсиш професионална оценка.
              </p>

              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 transition-all duration-300 group"
                data-testid="back-home-btn"
              >
                <span>Обратно към началото</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return null
}
