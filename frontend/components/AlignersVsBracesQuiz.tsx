'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Phone, Loader2, Smile, Shield, Eye, Wallet } from 'lucide-react'
import { createLead } from '@/lib/api'
import {
  MANUAL_RECOMMENDATION_COPY,
  MANUAL_RECOMMENDATION_CTA,
} from '@/lib/manualRecommendationCopy'

type Band = 'green' | 'yellow' | 'red'

interface QuizOption {
  value: string
  label: string
  alignerScore: number
  braceScore: number
}

interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
}

interface QuizResult {
  recommendation: 'aligners' | 'braces' | 'either'
  band: Band
  alignerScore: number
  braceScore: number
  title: string
  description: string
  nextSteps: string
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'problem_severity',
    question: 'Как бихте описали състоянието на зъбите си?',
    options: [
      { value: 'mild', label: 'Леко криви или малки разстояния', alignerScore: 30, braceScore: 20 },
      { value: 'moderate', label: 'Умерено криви, нужна е корекция', alignerScore: 25, braceScore: 25 },
      { value: 'severe', label: 'Силно криви или сериозен проблем със захапката', alignerScore: 10, braceScore: 30 },
      { value: 'not_sure', label: 'Не съм сигурен/а', alignerScore: 15, braceScore: 15 }
    ]
  },
  {
    id: 'visibility_importance',
    question: 'Колко важно е лечението да е дискретно (невидимо)?',
    options: [
      { value: 'very_important', label: 'Много важно - не искам да се вижда', alignerScore: 30, braceScore: 5 },
      { value: 'somewhat', label: 'Предпочитам дискретно, но не е решаващо', alignerScore: 20, braceScore: 15 },
      { value: 'not_important', label: 'Не ми е важно', alignerScore: 10, braceScore: 25 }
    ]
  },
  {
    id: 'discipline',
    question: 'Колко дисциплинирани сте с ежедневни рутини?',
    options: [
      { value: 'very', label: 'Много - винаги спазвам правилата', alignerScore: 30, braceScore: 20 },
      { value: 'moderate', label: 'Умерено - понякога забравям', alignerScore: 15, braceScore: 25 },
      { value: 'low', label: 'Предпочитам нещо, което не изисква постоянно внимание', alignerScore: 5, braceScore: 30 }
    ]
  },
  {
    id: 'eating_lifestyle',
    question: 'Какъв е вашият начин на живот по отношение на храненето?',
    options: [
      { value: 'flexible', label: 'Ям разнообразно, не искам ограничения', alignerScore: 25, braceScore: 10 },
      { value: 'moderate', label: 'Мога да се адаптирам с някои ограничения', alignerScore: 20, braceScore: 20 },
      { value: 'disciplined', label: 'Нямам проблем да избягвам определени храни', alignerScore: 15, braceScore: 25 }
    ]
  },
  {
    id: 'budget',
    question: 'Какъв е вашият бюджет за ортодонтско лечение?',
    options: [
      { value: 'high', label: 'Готов/а съм да платя повече за най-добрия резултат', alignerScore: 25, braceScore: 15 },
      { value: 'moderate', label: 'Търся добър баланс между цена и качество', alignerScore: 20, braceScore: 20 },
      { value: 'budget', label: 'Предпочитам по-достъпен вариант', alignerScore: 10, braceScore: 30 }
    ]
  }
]

const calculateResult = (answers: Record<string, string>): QuizResult => {
  let alignerScore = 0
  let braceScore = 0
  
  QUIZ_QUESTIONS.forEach(question => {
    const answer = answers[question.id]
    const option = question.options.find(o => o.value === answer)
    if (option) {
      alignerScore += option.alignerScore
      braceScore += option.braceScore
    }
  })
  
  const scoreDifference = alignerScore - braceScore
  
  let recommendation: 'aligners' | 'braces' | 'either'
  let band: Band
  let title: string
  let description: string
  let nextSteps: string
  
  if (scoreDifference > 20) {
    recommendation = 'aligners'
    band = 'green'
    title = 'Прозрачни алайнери са идеални за вас!'
    description = 'Въз основа на вашите отговори, прозрачните алайнери (като Invisalign) са отличен избор. Те съответстват на вашия начин на живот, приоритети и очаквания.'
    nextSteps = 'Препоръчваме консултация с ортодонт, специализиран в алайнери, за да получите персонализиран план.'
  } else if (scoreDifference < -20) {
    recommendation = 'braces'
    band = 'green'
    title = 'Брекетите са по-подходящи за вас!'
    description = 'Въз основа на вашите отговори, традиционните брекети (метални или керамични) са по-подходящият избор. Те осигуряват ефективно лечение без нужда от постоянно внимание.'
    nextSteps = 'Препоръчваме консултация с ортодонт, за да обсъдите какъв тип брекети е най-подходящ.'
  } else {
    recommendation = 'either'
    band = 'yellow'
    title = 'И двата метода могат да работят за вас!'
    description = 'Вашите предпочитания са балансирани - както алайнерите, така и брекетите могат да бъдат добър избор. Окончателното решение зависи от специфичния ви ортодонтски проблем.'
    nextSteps = 'Препоръчваме консултация с ортодонт, който ще прегледа зъбите ви и ще препоръча най-подходящия метод.'
  }
  
  return {
    recommendation,
    band,
    alignerScore,
    braceScore,
    title,
    description,
    nextSteps
  }
}

export function AlignersVsBracesQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizComplete, setQuizComplete] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactData, setContactData] = useState({ name: '', phone: '', email: '', consent: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<QuizResult | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const currentQ = QUIZ_QUESTIONS[currentQuestion]
  const progress = ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentQ.id]: value }
    setAnswers(newAnswers)
    
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      const quizResult = calculateResult(newAnswers)
      setResult(quizResult)
      setQuizComplete(true)
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleRequestCall = () => {
    setShowContactForm(true)
  }

  const handleSubmit = async () => {
    if (!contactData.name || !contactData.phone || !contactData.email) {
      setError('Моля, попълнете всички полета')
      return
    }
    if (!contactData.consent) {
      setError('Моля, дайте съгласие за обработка на данни')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const leadData = {
        city_slug: 'sofia',
        treatment_type: 'orthodontics',
        answers,
        score_total: result?.alignerScore || 0,
        band: result?.band || 'yellow',
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email,
        consent: contactData.consent,
        source: 'aligners_vs_braces_quiz',
        quiz_recommendation: result?.recommendation || 'either'
      }
      
      await createLead(leadData)
      setSubmitted(true)
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetQuiz = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setQuizComplete(false)
    setShowContactForm(false)
    setSubmitted(false)
    setResult(null)
    setError('')
    setContactData({ name: '', phone: '', email: '', consent: false })
  }

  const getBandStyles = (band: Band) => {
    switch (band) {
      case 'green':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          iconBg: 'bg-emerald-100',
          titleColor: 'text-emerald-700',
          badgeColor: 'bg-emerald-500'
        }
      case 'yellow':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          iconBg: 'bg-amber-100',
          titleColor: 'text-amber-700',
          badgeColor: 'bg-amber-500'
        }
      default:
        return {
          bg: 'bg-teal-50',
          border: 'border-teal-200',
          iconBg: 'bg-teal-100',
          titleColor: 'text-teal-700',
          badgeColor: 'bg-teal-500'
        }
    }
  }

  if (!isOpen) {
    return (
      <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 md:p-10 text-white text-center">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <Eye className="w-8 h-8" />
          </div>
          <div className="text-5xl font-bold">vs</div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <Smile className="w-8 h-8" />
          </div>
        </div>
        <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
          Алайнери или Брекети?
        </h2>
        <p className="text-teal-100 mb-8 max-w-lg mx-auto">
          Не сте сигурни кой метод е подходящ за вас? Отговорете на 5 въпроса и ще ви помогнем да разберете.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-teal-600 font-medium hover:bg-teal-50"
          data-testid="start-aligners-quiz"
        >
          Започни теста
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-lg">
      {/* Quiz Questions */}
      {!quizComplete && (
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>Въпрос {currentQuestion + 1} от {QUIZ_QUESTIONS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <h3 className="font-serif text-xl md:text-2xl font-semibold text-slate-900 mb-6">
            {currentQ.question}
          </h3>
          
          <div className="space-y-3">
            {currentQ.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  answers[currentQ.id] === option.value
                    ? 'bg-teal-50 border-teal-500 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300'
                }`}
                data-testid={`quiz-option-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-6">
            {currentQuestion > 0 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад
              </button>
            ) : (
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Затвори
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Quiz Result */}
      {quizComplete && !showContactForm && !submitted && result && (
        <div className="p-6 md:p-8">
          {(() => {
            const styles = getBandStyles(result.band)
            return (
              <>
                <div className={`${styles.bg} ${styles.border} border-2 rounded-2xl p-6 mb-6`}>
                  <div className="text-center mb-6">
                    <div className={`${styles.iconBg} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4`}>
                      {result.recommendation === 'aligners' && <Eye className="w-10 h-10 text-emerald-600" />}
                      {result.recommendation === 'braces' && <Smile className="w-10 h-10 text-emerald-600" />}
                      {result.recommendation === 'either' && <Shield className="w-10 h-10 text-amber-600" />}
                    </div>
                    <h3 className={`font-serif text-2xl font-semibold ${styles.titleColor} mb-2`}>
                      {result.title}
                    </h3>
                    <div className={`inline-flex items-center gap-2 ${styles.badgeColor} text-white px-4 py-1 rounded-full text-sm font-medium`}>
                      {result.recommendation === 'aligners' && 'Препоръчани: Алайнери'}
                      {result.recommendation === 'braces' && 'Препоръчани: Брекети'}
                      {result.recommendation === 'either' && 'Консултация препоръчана'}
                    </div>
                  </div>
                  
                  <p className="text-slate-700 leading-relaxed mb-4">
                    {result.description}
                  </p>
                  
                  {/* Score visualization */}
                  <div className="bg-white/60 rounded-xl p-4 border border-slate-200 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-teal-600">Алайнери</span>
                      <span className="text-sm text-slate-500">{result.alignerScore} т.</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                      <div 
                        className="h-full bg-teal-500"
                        style={{ width: `${(result.alignerScore / (result.alignerScore + result.braceScore)) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Брекети</span>
                      <span className="text-sm text-slate-500">{result.braceScore} т.</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-500"
                        style={{ width: `${(result.braceScore / (result.alignerScore + result.braceScore)) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-white/60 rounded-xl p-4 border border-slate-200">
                    <h4 className="font-medium text-slate-900 mb-2">Следваща стъпка:</h4>
                    <p className="text-slate-600 text-sm">{result.nextSteps}</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRequestCall}
                    className="btn-primary flex-1 inline-flex items-center justify-center gap-2 h-14 px-8"
                    data-testid="request-consultation"
                  >
                    <Phone className="w-5 h-5" />
                    {MANUAL_RECOMMENDATION_CTA.requestGuidance}
                  </button>
                  <button
                    onClick={resetQuiz}
                    className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Започни отначало
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      )}
      
      {/* Contact Form */}
      {showContactForm && !submitted && (
        <div className="p-6 md:p-8">
          <h3 className="font-serif text-xl font-semibold text-slate-900 mb-2">
            {MANUAL_RECOMMENDATION_COPY.formIntroHeadline}
          </h3>
          <p className="text-slate-500 mb-6">
            {MANUAL_RECOMMENDATION_COPY.formIntroBody}
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Име *</label>
              <input
                type="text"
                value={contactData.name}
                onChange={e => setContactData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="Вашето име"
                data-testid="quiz-input-name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Телефон *</label>
              <input
                type="tel"
                value={contactData.phone}
                onChange={e => setContactData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="+359 888 123 456"
                data-testid="quiz-input-phone"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Имейл *</label>
              <input
                type="email"
                value={contactData.email}
                onChange={e => setContactData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="email@example.com"
                data-testid="quiz-input-email"
              />
            </div>
            
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="quiz-consent"
                checked={contactData.consent}
                onChange={e => setContactData(prev => ({ ...prev, consent: e.target.checked }))}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                data-testid="quiz-input-consent"
              />
              <label htmlFor="quiz-consent" className="text-sm text-slate-600">
                Съгласен/а съм с{' '}
                <Link href="/privacy" className="text-teal-500 hover:underline">Политиката за поверителност</Link>
                {' '}и обработката на личните ми данни.
              </label>
            </div>
            
            {error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => setShowContactForm(false)}
                className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                ← Назад
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary flex-1 px-8 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="quiz-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Изпращане...
                  </>
                ) : (
                  <>
                    Изпрати заявка
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success State */}
      {submitted && (
        <div className="p-6 md:p-8">
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
            <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-emerald-800 mb-3">
              {MANUAL_RECOMMENDATION_COPY.submittedTitle}
            </h3>
            <p className="text-emerald-700 mb-3">
              {MANUAL_RECOMMENDATION_COPY.submittedBody}
            </p>
            <p className="text-sm text-emerald-700/80 mb-6">
              Ще ти потърсим на <strong>{contactData.phone}</strong>.
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Затвори
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
