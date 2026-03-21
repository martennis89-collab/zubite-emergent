'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, MapPin, User, Phone, Mail, MessageSquare } from 'lucide-react'

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

// Result bands with EXACT copy
type ResultBand = 'early' | 'progressing' | 'advanced'

interface ResultContent {
  band: ResultBand
  bandLabel: string
  headline: string
  explanation: string
  urgency: string
  education: string
  leadIntro: string
}

const RESULT_CONTENT: Record<ResultBand, Omit<ResultContent, 'band'>> = {
  early: {
    bandLabel: 'Ранен етап',
    headline: 'Вероятно си в ранен етап.',
    explanation: 'Показваш леки сигнали, които често остават незабелязани в началото. Това не означава непременно сериозен проблем, но не е и нещо, което трябва напълно да игнорираш.',
    urgency: 'Добър момент е да потърсиш оценка навреме — преди ситуацията да стане по-сложна.',
    education: 'Ранният етап често е най-лесният за корекция. Важно е да се знае, че този резултат не определя какво лечение ти трябва, а само показва, че има смисъл от професионална оценка.',
    leadIntro: 'Остави данните си и ще се свържем с теб, за да ти препоръчаме 3 подходящи клиники според твоята ситуация.'
  },
  progressing: {
    bandLabel: 'Развиващ се етап',
    headline: 'Има признаци, че проблемът се развива.',
    explanation: 'Отговорите ти показват модел, който често се задълбочава с времето. Това не означава автоматично тежък случай, но означава, че не е добра идея да отлагаш.',
    urgency: 'Добре е да потърсиш професионална оценка скоро, за да разбереш какви са вариантите ти, преди лечението да стане по-сложно.',
    education: 'Този резултат не определя конкретно лечение. Той показва, че вече има достатъчно сигнали, за да си струва по-сериозна оценка от специалист.',
    leadIntro: 'Остави данните си и ще се свържем с теб, за да ти препоръчаме 3 подходящи клиники според твоята ситуация.'
  },
  advanced: {
    bandLabel: 'Напреднал етап',
    headline: 'Вероятно си в по-напреднал етап.',
    explanation: 'Отговорите ти показват повече сигнали, които често се свързват с по-изразен или по-дълго развиващ се проблем. Това не означава автоматично какво лечение ти трябва — но означава, че не бива да отлагаш.',
    urgency: 'Добре е да потърсиш професионална помощ възможно най-скоро, за да разбереш какви са реалните ти опции.',
    education: 'Този резултат не е диагноза и не означава автоматично импланти, брекети или алайнери. Той просто показва, че ситуацията вероятно изисква по-бърза и по-внимателна оценка от специалист.',
    leadIntro: 'Остави данните си и ще се свържем с теб, за да ти препоръчаме 3 подходящи клиники според твоята ситуация.'
  }
}

// City options
const CITIES = [
  { value: 'sofia', label: 'София' },
  { value: 'plovdiv', label: 'Пловдив' },
]

const calculateBand = (totalScore: number): ResultBand => {
  // 0-5 = early, 6-12 = progressing, 13-20 = advanced
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

export function MasterQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ questionId: string; value: string; score: number }[]>([])
  const [result, setResult] = useState<{ band: ResultBand; score: number } | null>(null)
  const [step, setStep] = useState<'quiz' | 'result' | 'success'>('quiz')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
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

  const handleAnswer = (questionId: string, value: string, score: number) => {
    setIsTransitioning(true)
    
    const newAnswers = [...answers, { questionId, value, score }]
    setAnswers(newAnswers)

    setTimeout(() => {
      if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
        setCurrentQuestion(prev => prev + 1)
      } else {
        // Calculate final result
        const totalScore = newAnswers.reduce((sum, a) => sum + a.score, 0)
        const band = calculateBand(totalScore)
        setResult({ band, score: totalScore })
        setStep('result')
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

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      setError('Моля, въведете името си')
      return
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
      // Build answers object
      const answersObj: Record<string, string> = {}
      answers.forEach(a => {
        answersObj[a.questionId] = a.value
      })

      const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL || ''
      
      const leadData = {
        city_slug: formData.city,
        treatment_type: 'master_quiz',
        answers: {
          ...answersObj,
          quiz_score: result?.score || 0,
          quiz_band: result?.band || '',
          message: formData.message || '',
          source: 'master_quiz_v2'
        },
        score_total: result?.score || 0,
        band: result?.band === 'early' ? 'GREEN' : result?.band === 'progressing' ? 'YELLOW' : 'RED',
        name: formData.name,
        phone: formData.phone,
        email: formData.email || '',
        consent: true,
        source: 'master_quiz_v2'
      }

      const response = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      })

      if (!response.ok) {
        throw new Error('Failed to submit')
      }

      setStep('success')
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // QUIZ SCREEN
  if (step === 'quiz' && !result) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Minimal Header */}
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
          {/* Progress Bar */}
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

          {/* Quiz Content */}
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

  // RESULT SCREEN with Lead Form
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
            
            {/* Result Card */}
            <div className={`bg-gradient-to-br ${styles.bgGradient} rounded-2xl border-2 ${styles.borderColor} p-6 sm:p-8 mb-8 animate-fade-in-up`}>
              
              {/* Band Label */}
              <div className="flex items-center gap-2 mb-6">
                <span className={`w-2.5 h-2.5 rounded-full ${styles.dotColor}`} />
                <span className={`text-sm font-semibold ${styles.labelText} ${styles.labelBg} px-3 py-1 rounded-full`}>
                  {content.bandLabel}
                </span>
              </div>

              {/* Headline */}
              <h1 className={`font-serif text-2xl sm:text-3xl font-semibold ${styles.textColor} mb-6 leading-tight`}>
                {content.headline}
              </h1>

              {/* Explanation */}
              <p className="text-slate-700 text-base sm:text-lg leading-relaxed mb-6">
                {content.explanation}
              </p>

              {/* Urgency */}
              <div className={`${styles.accentBg} rounded-xl p-4 mb-6`}>
                <p className={`${styles.textColor} font-medium`}>
                  {content.urgency}
                </p>
              </div>

              {/* Education */}
              <p className="text-slate-600 text-sm leading-relaxed border-t border-slate-200/50 pt-6">
                {content.education}
              </p>
            </div>

            {/* Lead Form Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              
              {/* Lead Intro */}
              <p className="text-slate-600 mb-8 text-center">
                {content.leadIntro}
              </p>

              {/* Form Header */}
              <div className="text-center mb-8 pb-6 border-b border-slate-100">
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-2">
                  Получете 3 препоръчани клиники за вашия случай
                </h2>
                <p className="text-slate-500 text-sm">
                  Попълнете данните си и нашият екип ще прегледа резултата ви и ще се свърже с вас с 3 подходящи опции.
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Име <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    placeholder="Вашето име"
                    data-testid="input-name"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    Телефон <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    placeholder="+359 888 123 456"
                    data-testid="input-phone"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    Имейл
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    placeholder="email@example.com"
                    data-testid="input-email"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
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

                {/* Message */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    Кратко описание или въпрос <span className="text-slate-400 font-normal">(по желание)</span>
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                    placeholder="Опишете накратко вашата ситуация..."
                    data-testid="input-message"
                  />
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
                  Без ангажимент. Ние не сме клиника. Ще използваме отговорите ти само за да ти помогнем да намериш подходящ следващ ход.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    )
  }

  return null
}
