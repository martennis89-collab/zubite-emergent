'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CITIES, TREATMENTS, getQuizQuestions } from '@/lib/data'
import { createLead } from '@/lib/api'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

export default function QuizPage() {
  const params = useParams()
  const citySlug = params.citySlug as string
  const treatmentType = params.treatmentType as string
  
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactData, setContactData] = useState({ name: '', phone: '', email: '', consent: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const city = CITIES[citySlug as keyof typeof CITIES]
  const treatment = TREATMENTS[treatmentType as keyof typeof TREATMENTS]
  
  if (!isClient) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </main>
    )
  }
  
  if (!city || !treatment) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-white">Страницата не беше намерена</div>
      </main>
    )
  }
  
  const questions = getQuizQuestions(treatmentType, city.name)
  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  
  const handleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: value }))
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      setShowContactForm(true)
    }
  }
  
  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
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
        city_slug: citySlug,
        treatment_type: treatmentType,
        answers,
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email,
        consent: contactData.consent,
        source: 'nextjs_quiz'
      }
      
      const result = await createLead(leadData)
      router.push(`/results/${result.id}`)
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.')
      setIsSubmitting(false)
    }
  }
  
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href={`/city/${citySlug}/${treatmentType}`}
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад</span>
          </Link>
          
          {!showContactForm ? (
            <>
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Въпрос {currentQuestion + 1} от {questions.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              {/* Question */}
              <div className="glass rounded-2xl p-8">
                <h2 className="font-serif text-2xl font-semibold text-white mb-8">
                  {currentQ.question}
                </h2>
                
                <div className="space-y-4">
                  {currentQ.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(option.value)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        answers[currentQ.id] === option.value
                          ? 'bg-sky-500/20 border-sky-500 text-white'
                          : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                      data-testid={`option-${option.value}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                
                {currentQuestion > 0 && (
                  <button
                    onClick={handleBack}
                    className="mt-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Назад
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Contact Form */
            <div className="glass rounded-2xl p-8">
              <h2 className="font-serif text-2xl font-semibold text-white mb-4">
                Почти готово!
              </h2>
              <p className="text-slate-400 mb-8">
                Оставете данните си и ще се свържем с вас, за да обсъдим вашия случай.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Име</label>
                  <input
                    type="text"
                    value={contactData.name}
                    onChange={e => setContactData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="Вашето име"
                    data-testid="input-name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Телефон</label>
                  <input
                    type="tel"
                    value={contactData.phone}
                    onChange={e => setContactData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="+359 ..."
                    data-testid="input-phone"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Имейл</label>
                  <input
                    type="email"
                    value={contactData.email}
                    onChange={e => setContactData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
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
                    className="mt-1 w-4 h-4 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-800"
                    data-testid="input-consent"
                  />
                  <label htmlFor="consent" className="text-sm text-slate-400">
                    Съгласен/а съм с{' '}
                    <Link href="/privacy" className="text-sky-400 hover:underline">Политиката за поверителност</Link>
                  </label>
                </div>
                
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
                
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full btn-primary px-8 py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Изпращане...
                    </>
                  ) : (
                    <>
                      Заяви обаждане
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
