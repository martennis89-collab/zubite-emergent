'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, Phone, Clock, MapPin } from 'lucide-react'
import { trackPageView } from '@/components/MetaPixel'

// Stage display info
const STAGE_INFO: Record<string, { title: string; color: string; bgColor: string }> = {
  early: {
    title: 'Ранен етап',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50'
  },
  developing: {
    title: 'Развиващ се етап',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  advanced: {
    title: 'Напреднал етап',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  }
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  
  // Get data from URL params
  const stage = searchParams.get('stage') || 'early'
  const city = searchParams.get('city') || ''
  const name = searchParams.get('name') || ''
  
  const stageInfo = STAGE_INFO[stage] || STAGE_INFO.early

  useEffect(() => {
    setMounted(true)
    // Track page view for conversion tracking
    trackPageView()
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    )
  }

  return (
    <>
      {/* Success Content */}
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-slate-900 mb-4">
            Благодарим ти{name ? `, ${name}` : ''}!
          </h1>
          
          <p className="text-lg text-slate-600 max-w-md mx-auto">
            Получихме твоите данни и ще се свържем с теб скоро с персонализирани препоръки за клиники.
          </p>
        </div>

        {/* Result Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-8 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">
            Твоят резултат
          </h2>
          
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${stageInfo.bgColor} ${stageInfo.color} font-medium mb-6`}>
            {stageInfo.title}
          </div>

          <div className="space-y-4 text-slate-600">
            {city && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-400" />
                <span>Град: <strong className="text-slate-900">{city === 'sofia' ? 'София' : city === 'plovdiv' ? 'Пловдив' : city}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* What Happens Next */}
        <div className="bg-sky-50 rounded-2xl p-6 md:p-8 mb-8">
          <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">
            Какво следва?
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="text-slate-700">
                  <strong>Ще прегледаме резултата ти</strong> и ще подберем 3 подходящи клиники според твоя етап и местоположение.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="text-slate-700">
                  <strong>Ще се свържем с теб</strong> по телефон в рамките на 24-48 часа с нашите препоръки.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="text-slate-700">
                  <strong>Ще ти помогнем</strong> да запазиш консултация в избраната от теб клиника.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="text-center text-slate-500 text-sm mb-8">
          <p className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Очаквай обаждане в рамките на 24-48 часа
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sky-600 font-medium hover:text-sky-700 transition-colors"
          >
            <span>Обратно към началото</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  )
}

export default function QuizSuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="font-serif text-2xl font-semibold text-slate-900">
            Zubite<span className="text-sky-500">.bg</span>
          </Link>
        </div>
      </header>

      <Suspense fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
        </div>
      }>
        <SuccessContent />
      </Suspense>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Zubite.bg — Платформа за ориентация в ортодонтското лечение</p>
        </div>
      </footer>
    </main>
  )
}
