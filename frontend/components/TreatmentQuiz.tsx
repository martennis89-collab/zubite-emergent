'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CITIES, TREATMENTS, getQuizQuestions } from '@/lib/data'
import { createLead } from '@/lib/api'
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, AlertCircle, XCircle, Phone, MapPin } from 'lucide-react'

type Band = 'green' | 'yellow' | 'red'

interface QuizResult {
  band: Band
  score: number
  title: string
  description: string
  recommendation: string
}

interface TreatmentQuizProps {
  treatment: string
}

// Scoring logic based on answers
const calculateScore = (answers: Record<string, string>, treatment: string): { score: number; band: Band } => {
  let score = 0
  
  // Seriousness/Intent scoring
  if (answers.seriousness === 'searching' || answers.missing_teeth || answers.main_problem) {
    score += 30
  } else if (answers.seriousness === 'considering') {
    score += 20
  } else if (answers.seriousness === 'browsing') {
    score += 5
  }
  
  // Timing scoring
  if (answers.timing === '0-3') {
    score += 30
  } else if (answers.timing === '3-6') {
    score += 20
  } else if (answers.timing === '6+') {
    score += 10
  } else if (answers.timing === 'not_sure') {
    score += 5
  }
  
  // Importance scoring
  if (answers.importance === 'quality') {
    score += 20
  } else if (answers.importance === 'comfort') {
    score += 15
  } else if (answers.importance === 'price') {
    score += 10
  }
  
  // Readiness scoring
  if (answers.readiness === 'yes') {
    score += 20
  } else if (answers.readiness === 'maybe') {
    score += 10
  } else if (answers.readiness === 'no') {
    score += 0
  }
  
  // Treatment-specific scoring
  if (treatment === 'implants') {
    if (answers.missing_teeth === '1-2') score += 15
    else if (answers.missing_teeth === '3-5') score += 20
    else if (answers.missing_teeth === '6+') score += 25
  }
  
  // Can visit scoring
  if (answers.can_visit === 'yes') {
    score += 10
  }
  
  // Determine band
  let band: Band = 'yellow'
  if (score >= 70) {
    band = 'green'
  } else if (score >= 40) {
    band = 'yellow'
  } else {
    band = 'red'
  }
  
  return { score, band }
}

const getResultContent = (band: Band, treatment: string): QuizResult => {
  const treatmentNames: Record<string, string> = {
    orthodontics: 'ортодонтско лечение',
    implants: 'зъбни импланти',
    'cosmetic-dentistry': 'естетична стоматология',
    'sleep-airway': 'лечение на сънна апнея',
    tmj: 'TMJ терапия'
  }
  
  const treatmentName = treatmentNames[treatment] || 'дентално лечение'
  
  if (band === 'green') {
    return {
      band: 'green',
      score: 0,
      title: 'Отличен кандидат!',
      description: `Въз основа на вашите отговори, вие сте много подходящ кандидат за ${treatmentName}. Вашите цели и времева рамка съвпадат отлично с това, което можем да предложим.`,
      recommendation: 'Препоръчваме да запишете консултация възможно най-скоро, за да обсъдим индивидуален план за лечение.'
    }
  } else if (band === 'yellow') {
    return {
      band: 'yellow',
      score: 0,
      title: 'Необходима е допълнителна информация',
      description: `Въз основа на вашите отговори, има добри показатели, че ${treatmentName} може да бъде подходящо за вас, но ни е необходима повече информация, за да ви дадем точна препоръка.`,
      recommendation: 'Препоръчваме безплатна консултация, на която ще обсъдим вашия конкретен случай и ще ви дадем персонализирана препоръка.'
    }
  } else {
    return {
      band: 'red',
      score: 0,
      title: 'Може да има по-добри опции',
      description: `Въз основа на вашите отговори, ${treatmentName} може да не е най-подходящото решение в момента. Това не означава, че лечението е невъзможно – просто искаме да сме сигурни, че получавате най-доброто за вашата ситуация.`,
      recommendation: 'Препоръчваме разговор с наш консултант, който ще ви помогне да разберете всички налични опции и да вземете информирано решение.'
    }
  }
}

export function TreatmentQuiz({ treatment }: TreatmentQuizProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizComplete, setQuizComplete] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactData, setContactData] = useState({ name: '', phone: '', email: '', consent: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const treatmentData = TREATMENTS[treatment as keyof typeof TREATMENTS]
  const cityData = selectedCity ? CITIES[selectedCity as keyof typeof CITIES] : null
  
  if (!isClient) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </main>
    )
  }
  
  if (!treatmentData) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-900">Страницата не беше намерена</div>
      </main>
    )
  }
  
  // City selection step
  if (!selectedCity) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        
        <section className="pt-24 pb-16 md:pt-32 md:pb-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <Link 
              href={`/${treatment}`}
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-all duration-200 hover:-translate-x-1 mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад към {treatmentData.name}</span>
            </Link>
            
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-teal-600" />
                </div>
                <h1 className="font-serif text-2xl font-semibold text-slate-900 mb-2">
                  В кой град търсите лечение?
                </h1>
                <p className="text-slate-500">
                  Изберете вашия град, за да ви покажем подходящи клиники и цени
                </p>
              </div>
              
              <div className="space-y-3">
                {Object.values(CITIES).map((city) => (
                  <button
                    key={city.slug}
                    onClick={() => setSelectedCity(city.slug)}
                    className="w-full text-left p-4 rounded-xl border-2 transition-all duration-200 bg-white border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-teal-50 flex items-center gap-4"
                    data-testid={`city-select-${city.slug}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">{city.name}</span>
                      <span className="text-slate-400 ml-2 text-sm">({city.nameEn})</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 ml-auto" />
                  </button>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                <p className="text-sm text-slate-400">
                  Скоро ще добавим още градове
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <Footer />
      </main>
    )
  }
  
  const questions = getQuizQuestions(treatment, cityData?.name || '')
  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  
  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentQ.id]: value }
    setAnswers(newAnswers)
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      // Quiz complete - calculate score
      const { score, band } = calculateScore(newAnswers, treatment)
      const resultContent = getResultContent(band, treatment)
      resultContent.score = score
      setResult(resultContent)
      setQuizComplete(true)
    }
  }
  
  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    } else {
      // Go back to city selection
      setSelectedCity(null)
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
        city_slug: selectedCity,
        treatment_type: treatment,
        answers,
        score_total: result?.score || 0,
        band: result?.band || 'yellow',
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email,
        consent: contactData.consent,
        source: 'treatment_first_quiz'
      }
      
      await createLead(leadData)
      setSubmitted(true)
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const getBandStyles = (band: Band) => {
    switch (band) {
      case 'green':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: <CheckCircle className="w-16 h-16 text-emerald-500" />,
          iconBg: 'bg-emerald-100',
          titleColor: 'text-emerald-700',
          badgeColor: 'bg-emerald-500'
        }
      case 'yellow':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: <AlertCircle className="w-16 h-16 text-amber-500" />,
          iconBg: 'bg-amber-100',
          titleColor: 'text-amber-700',
          badgeColor: 'bg-amber-500'
        }
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          iconBg: 'bg-red-100',
          titleColor: 'text-red-700',
          badgeColor: 'bg-red-500'
        }
    }
  }
  
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      <section className="pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Link 
            href={`/${treatment}`}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-all duration-200 hover:-translate-x-1 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад към {treatmentData.name}</span>
          </Link>
          
          {/* City indicator */}
          <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="w-4 h-4" />
            <span>{cityData?.name}</span>
            <button 
              onClick={() => setSelectedCity(null)}
              className="text-teal-500 hover:text-teal-600 ml-2"
              data-testid="change-city-btn"
            >
              Промени
            </button>
          </div>
          
          {/* Quiz Questions */}
          {!quizComplete && (
            <>
              <div className="mb-8">
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                  <span>Въпрос {currentQuestion + 1} от {questions.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-400 progress-animated"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8">
                  {currentQ.question}
                </h2>
                
                <div className="space-y-3">
                  {currentQ.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(option.value)}
                      className={`quiz-option w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        answers[currentQ.id] === option.value
                          ? 'bg-teal-50 border-teal-500 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300'
                      }`}
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
                  {currentQuestion === 0 ? 'Промени града' : 'Назад'}
                </button>
              </div>
            </>
          )}
          
          {/* Quiz Result */}
          {quizComplete && !showContactForm && !submitted && result && (
            <div className="quiz-step-enter">
              {(() => {
                const styles = getBandStyles(result.band)
                return (
                  <div className={`${styles.bg} ${styles.border} border-2 rounded-2xl p-8 mb-6`}>
                    <div className="text-center mb-6">
                      <div className={`${styles.iconBg} w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4`}>
                        {styles.icon}
                      </div>
                      <h2 className={`font-serif text-3xl font-semibold ${styles.titleColor} mb-2`}>
                        {result.title}
                      </h2>
                      <div className={`inline-flex items-center gap-2 ${styles.badgeColor} text-white px-4 py-1 rounded-full text-sm font-medium`}>
                        {result.band === 'green' && 'Подходящ кандидат'}
                        {result.band === 'yellow' && 'Необходима консултация'}
                        {result.band === 'red' && 'Нужна е оценка'}
                      </div>
                    </div>
                    
                    <p className="text-slate-700 leading-relaxed mb-4">
                      {result.description}
                    </p>
                    
                    <div className="bg-white/60 rounded-xl p-4 border border-slate-200">
                      <h3 className="font-medium text-slate-900 mb-2">Нашата препоръка:</h3>
                      <p className="text-slate-600">{result.recommendation}</p>
                    </div>
                  </div>
                )
              })()}
              
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Phone className="w-12 h-12 text-teal-500 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold text-slate-900 mb-2">
                  Искате ли да ви се обадим?
                </h3>
                <p className="text-slate-500 mb-6">
                  Нашият консултант ще ви се обади, за да обсъдите вашите възможности и да отговори на въпросите ви.
                </p>
                <button
                  onClick={handleRequestCall}
                  className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8 w-full sm:w-auto"
                  data-testid="request-call-btn"
                >
                  <Phone className="w-5 h-5" />
                  Да, обадете ми се
                </button>
                
                {/* Link to city-specific page */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-sm text-slate-500 mb-3">Или разгледайте</p>
                  <Link
                    href={`/${selectedCity}/${treatment}`}
                    className="text-teal-600 font-medium hover:text-teal-700 inline-flex items-center gap-2"
                    data-testid="view-city-page-link"
                  >
                    {treatmentData.name} в {cityData?.name}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {/* Contact Form */}
          {showContactForm && !submitted && (
            <div className="quiz-step-enter bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-2">
                Заявка за обаждане
              </h2>
              <p className="text-slate-500 mb-8">
                Оставете данните си и ще се свържем с вас в рамките на 24 часа.
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
                    data-testid="input-name"
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
                    data-testid="input-phone"
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
                    data-testid="input-email"
                  />
                </div>
                
                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={contactData.consent}
                    onChange={e => setContactData(prev => ({ ...prev, consent: e.target.checked }))}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                    data-testid="input-consent"
                  />
                  <label htmlFor="consent" className="text-sm text-slate-600">
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
          
          {/* Success State */}
          {submitted && (
            <div className="quiz-step-enter bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-emerald-800 mb-3">
                Заявката е изпратена успешно!
              </h2>
              <p className="text-emerald-700 mb-6">
                Благодарим ви! Наш консултант ще се свърже с вас в рамките на 24 часа на телефон <strong>{contactData.phone}</strong>.
              </p>
              <Link
                href={`/${selectedCity}/${treatment}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
              >
                Разгледайте {treatmentData.name} в {cityData?.name}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
