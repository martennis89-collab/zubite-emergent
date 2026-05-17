'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { createLead } from '@/lib/api'
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, AlertCircle, HelpCircle, Phone, MapPin, Smile, Info } from 'lucide-react'

// Types
type ResultBand = 'strong' | 'possible' | 'needs_evaluation'

interface QuizAnswer {
  questionId: string
  value: string
  score: number
}

interface QuizResult {
  band: ResultBand
  score: number
  title: string
  description: string
}

// Questions configuration with scoring
const QUIZ_QUESTIONS = [
  {
    id: 'main_problem',
    question: 'Какъв е основният проблем, който искате да подобрите?',
    options: [
      { value: 'crooked', label: 'Криви зъби', score: 2 },
      { value: 'spaces', label: 'Разстояния между зъбите', score: 2 },
      { value: 'bite', label: 'Проблем със захапката', score: 3 },
      { value: 'aesthetic_prep', label: 'Подготовка за фасети / естетична промяна', score: 1 },
      { value: 'straighter_smile', label: 'Просто искам по-права усмивка', score: 1 },
      { value: 'unsure', label: 'Не съм сигурен', score: 0 }
    ]
  },
  {
    id: 'age_group',
    question: 'За кого е лечението?',
    options: [
      { value: 'adult', label: 'За мен (възрастен)', score: 2 },
      { value: 'child', label: 'За дете / тийнейджър', score: 2 },
      { value: 'unsure', label: 'Не съм сигурен', score: 0 }
    ]
  },
  {
    id: 'previous_ortho',
    question: 'Имали ли сте брекети или алайнери преди?',
    options: [
      { value: 'never', label: 'Не', score: 2 },
      { value: 'relapse', label: 'Да, но зъбите се разместиха отново', score: 4 },
      { value: 'ongoing', label: 'Да, лечението още продължава', score: 0 },
      { value: 'unsure', label: 'Не съм сигурен', score: 1 }
    ]
  },
  {
    id: 'bite_issue',
    question: 'Имате ли усещане, че захапката ви не е правилна?',
    options: [
      { value: 'yes', label: 'Да, трудно захапвам', score: 4 },
      { value: 'sometimes', label: 'Понякога', score: 2 },
      { value: 'no', label: 'Не', score: 0 },
      { value: 'unsure', label: 'Не съм сигурен', score: 1 }
    ]
  },
  {
    id: 'gum_health',
    question: 'Имате ли проблеми с венците?',
    options: [
      { value: 'no', label: 'Не', score: 2 },
      { value: 'bleeding', label: 'Кървят понякога', score: 0 },
      { value: 'periodontal', label: 'Да, имам пародонтален проблем', score: -2 },
      { value: 'unsure', label: 'Не знам', score: 0 }
    ]
  },
  {
    id: 'price_awareness',
    question: 'Каква според вас е приблизителната цена?',
    infoText: 'Ортодонтското лечение в България обикновено струва между 1500 € и 6000 € в зависимост от сложността.',
    options: [
      { value: 'under_1000', label: 'Под 1000 €', score: -2 },
      { value: '1000_3000', label: '1000 – 3000 €', score: 2 },
      { value: '3000_6000', label: '3000 – 6000 €', score: 3 },
      { value: 'over_6000', label: 'Над 6000 €', score: 1 },
      { value: 'unsure', label: 'Не съм сигурен', score: 1 }
    ]
  },
  {
    id: 'investment_readiness',
    question: 'Ако лечението е подходящо за вас, бихте ли обмислили инвестиция от няколко хиляди евро?',
    options: [
      { value: 'yes', label: 'Да, ако резултатът си заслужава', score: 4 },
      { value: 'maybe', label: 'Възможно е, зависи от плана', score: 2 },
      { value: 'unsure', label: 'Не съм сигурен', score: 1 },
      { value: 'no', label: 'Вероятно не', score: -3 }
    ]
  },
  {
    id: 'timing',
    question: 'Кога бихте искали да започнете лечение?',
    options: [
      { value: '3_months', label: 'В следващите 3 месеца', score: 4 },
      { value: '6_months', label: 'До 6 месеца', score: 3 },
      { value: '1_year', label: 'До година', score: 1 },
      { value: 'research', label: 'Само проучвам', score: 0 }
    ]
  }
]

// City options
const CITIES = [
  { value: 'sofia', label: 'София' },
  { value: 'plovdiv', label: 'Пловдив' },
  { value: 'varna', label: 'Варна' },
  { value: 'burgas', label: 'Бургас' },
  { value: 'ruse', label: 'Русе' },
  { value: 'stara-zagora', label: 'Стара Загора' },
  { value: 'pleven', label: 'Плевен' },
  { value: 'sliven', label: 'Сливен' },
  { value: 'dobrich', label: 'Добрич' },
  { value: 'shumen', label: 'Шумен' },
]

// Calculate score and determine result band
const calculateResult = (answers: QuizAnswer[]): QuizResult => {
  const totalScore = answers.reduce((sum, a) => sum + a.score, 0)
  
  let band: ResultBand
  let title: string
  let description: string
  
  if (totalScore >= 16) {
    band = 'strong'
    title = 'Добра новина'
    description = 'Имате силни индикации, че ортодонтско лечение може да е подходящо за вас. Според вашите отговори има добра вероятност да се възползвате от консултация със специалист. Този резултат е ориентировъчен и не замества клиничен преглед.'
  } else if (totalScore >= 10) {
    band = 'possible'
    title = 'Възможно е ортодонтско лечение да е подходящо за вас'
    description = 'Вашите отговори показват, че има основания да разгледате ортодонтски вариант, но точната посока зависи от клиничен преглед и диагностика.'
  } else {
    band = 'needs_evaluation'
    title = 'Нужна е по-точна оценка'
    description = 'Само чрез онлайн въпросник не може да се даде точна насока. За да разберете дали ортодонтията е подходяща и какви са възможните опции, е нужен преглед.'
  }
  
  return { band, score: totalScore, title, description }
}

// Determine priority based on score and timing
const getPriority = (score: number, timing: string): string => {
  if (score >= 16 && (timing === '3_months' || timing === '6_months')) {
    return 'HIGH'
  } else if (score >= 10) {
    return 'MEDIUM'
  }
  return 'LOW'
}

export function OrthodonticsQuiz() {
  const [step, setStep] = useState<'intro' | 'questions' | 'result' | 'form' | 'success'>('intro')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    problem: '',
    consent: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </main>
    )
  }

  const progress = step === 'questions' 
    ? ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100 
    : 0

  const handleStartQuiz = () => {
    setStep('questions')
  }

  const handleAnswer = (questionId: string, value: string, score: number) => {
    const newAnswers = [...answers, { questionId, value, score }]
    setAnswers(newAnswers)

    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      // Quiz complete - calculate result
      const quizResult = calculateResult(newAnswers)
      setResult(quizResult)
      setStep('result')
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      // Remove last answer and go back
      setAnswers(prev => prev.slice(0, -1))
      setCurrentQuestion(prev => prev - 1)
    } else {
      // Go back to intro
      setStep('intro')
    }
  }

  const handleShowForm = () => {
    setStep('form')
  }

  const handleSubmit = async () => {
    if (!formData.phone) {
      setError('Моля, въведете телефонен номер')
      return
    }
    if (!formData.consent) {
      setError('Моля, дайте съгласие за обработка на данни')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Build answers object for storage
      const answersObj: Record<string, string> = {}
      answers.forEach(a => {
        answersObj[a.questionId] = a.value
      })

      // Get timing for priority calculation
      const timingAnswer = answers.find(a => a.questionId === 'timing')
      const timing = timingAnswer?.value || ''
      const priority = getPriority(result?.score || 0, timing)

      const leadData = {
        city_slug: formData.city || 'sofia',
        treatment_type: 'orthodontics',
        answers: {
          ...answersObj,
          quiz_score: result?.score || 0,
          problem_type: answersObj.main_problem || '',
          previous_ortho: answersObj.previous_ortho || '',
          bite_issue: answersObj.bite_issue || '',
          gum_status: answersObj.gum_health || '',
          price_awareness: answersObj.price_awareness || '',
          investment_readiness: answersObj.investment_readiness || '',
          timing: answersObj.timing || '',
          problem_description: formData.problem || '',
          priority: priority,
          source: 'orthodontics_quiz_v2'
        },
        score_total: result?.score || 0,
        band: result?.band === 'strong' ? 'GREEN' : result?.band === 'possible' ? 'YELLOW' : 'RED',
        name: formData.name,
        phone: formData.phone,
        consent: formData.consent,
        source: 'orthodontics_quiz_v2'
      }

      await createLead(leadData)
      setStep('success')
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getBandStyles = (band: ResultBand) => {
    switch (band) {
      case 'strong':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: <CheckCircle className="w-16 h-16 text-emerald-500" />,
          iconBg: 'bg-emerald-100',
          titleColor: 'text-emerald-700'
        }
      case 'possible':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: <AlertCircle className="w-16 h-16 text-amber-500" />,
          iconBg: 'bg-amber-100',
          titleColor: 'text-amber-700'
        }
      case 'needs_evaluation':
        return {
          bg: 'bg-teal-50',
          border: 'border-teal-200',
          icon: <HelpCircle className="w-16 h-16 text-teal-500" />,
          iconBg: 'bg-teal-100',
          titleColor: 'text-teal-700'
        }
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Link
            href="/orthodontics"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-all duration-200 hover:-translate-x-1 mb-8"
            data-testid="back-to-orthodontics"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад към Ортодонтия</span>
          </Link>

          {/* INTRO SCREEN */}
          {step === 'intro' && (
            <div className="quiz-step-enter bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-6">
                  <Smile className="w-10 h-10 text-teal-600" />
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
                  Разберете дали ортодонтско лечение може да е подходящо за вас
                </h1>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Отговорете на няколко кратки въпроса, за да получите ориентировъчна насока дали ортодонтско лечение би могло да е подходящо за вашия случай.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
                  <p className="text-sm text-amber-800">
                    <strong>Важно:</strong> Този въпросник не замества преглед от специалист.
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartQuiz}
                className="btn-primary w-full inline-flex items-center justify-center gap-2 h-14 px-8"
                data-testid="start-quiz-btn"
              >
                Започнете оценката
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-center text-sm text-slate-400 mt-6">
                8 въпроса • ~60–90 секунди
              </p>
            </div>
          )}

          {/* QUESTIONS */}
          {step === 'questions' && (
            <>
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

              <div className="quiz-step-enter bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                {/* Info text for price awareness question */}
                {QUIZ_QUESTIONS[currentQuestion].infoText && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-teal-800">
                      {QUIZ_QUESTIONS[currentQuestion].infoText}
                    </p>
                  </div>
                )}

                <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8">
                  {QUIZ_QUESTIONS[currentQuestion].question}
                </h2>

                <div className="space-y-3">
                  {QUIZ_QUESTIONS[currentQuestion].options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(
                        QUIZ_QUESTIONS[currentQuestion].id,
                        option.value,
                        option.score
                      )}
                      className="quiz-option w-full text-left p-4 rounded-xl border-2 transition-all duration-200 bg-white border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-teal-50"
                      data-testid={`option-${option.value}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleBack}
                  className="mt-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                  data-testid="quiz-back-btn"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {currentQuestion === 0 ? 'Назад към началото' : 'Назад'}
                </button>
              </div>
            </>
          )}

          {/* RESULT SCREEN */}
          {step === 'result' && result && (
            <div className="quiz-step-enter">
              {(() => {
                const styles = getBandStyles(result.band)
                return (
                  <div className={`${styles.bg} ${styles.border} border-2 rounded-2xl p-8 mb-6`}>
                    <div className="text-center mb-6">
                      <div className={`${styles.iconBg} w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4`}>
                        {styles.icon}
                      </div>
                      <h2 className={`font-serif text-2xl sm:text-3xl font-semibold ${styles.titleColor} mb-4`}>
                        {result.title}
                      </h2>
                    </div>

                    <p className="text-slate-700 leading-relaxed text-center">
                      {result.description}
                    </p>
                  </div>
                )
              })()}

              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Phone className="w-12 h-12 text-teal-500 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold text-slate-900 mb-2">
                  Заяви обаждане
                </h3>
                <p className="text-slate-500 mb-6">
                  Оставете данните си и ще се свържем с вас за безплатна консултация.
                </p>
                <button
                  onClick={handleShowForm}
                  className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8 w-full sm:w-auto"
                  data-testid="show-form-btn"
                >
                  <Phone className="w-5 h-5" />
                  Заяви обаждане
                </button>
              </div>
            </div>
          )}

          {/* LEAD CAPTURE FORM */}
          {step === 'form' && (
            <div className="quiz-step-enter bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-2">
                Заявка за обаждане
              </h2>
              <p className="text-slate-500 mb-8">
                Оставете данните си и ще се свържем с вас скоро.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Име</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    placeholder="Вашето име"
                    data-testid="input-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Телефон *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    placeholder="+359 888 123 456"
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Град</label>
                  <div className="grid grid-cols-3 gap-3">
                    {CITIES.map(city => (
                      <button
                        key={city.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, city: city.value }))}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                          formData.city === city.value
                            ? 'bg-teal-50 border-teal-500 text-teal-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300'
                        }`}
                        data-testid={`city-${city.value}`}
                      >
                        <MapPin className="w-4 h-4" />
                        {city.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Какъв е вашият основен проблем? <span className="text-slate-400 font-normal">(по избор)</span>
                  </label>
                  <textarea
                    value={formData.problem}
                    onChange={e => setFormData(prev => ({ ...prev, problem: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors resize-none"
                    placeholder="Опишете накратко вашата ситуация..."
                    data-testid="input-problem"
                  />
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={formData.consent}
                    onChange={e => setFormData(prev => ({ ...prev, consent: e.target.checked }))}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                    data-testid="input-consent"
                  />
                  <label htmlFor="consent" className="text-sm text-slate-600">
                    Съгласен съм с обработката на лични данни.
                  </label>
                </div>

                {error && (
                  <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => setStep('result')}
                    className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    data-testid="form-back-btn"
                  >
                    ← Назад
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="btn-primary flex-1 px-8 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="submit-btn"
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

          {/* SUCCESS STATE */}
          {step === 'success' && (
            <div className="quiz-step-enter bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-emerald-800 mb-3">
                Благодарим!
              </h2>
              <p className="text-emerald-700 mb-6">
                Нашият екип ще се свърже с вас скоро.
              </p>
              <Link
                href="/orthodontics"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                data-testid="back-to-treatment-link"
              >
                Към Ортодонтия
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer treatmentSlug="orthodontics" />
    </main>
  )
}
