import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArrowLeft, CheckCircle, ArrowRight, Sparkles, Clock, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Алайнери срещу Брекети | Ортодонтия | Zubite.bg',
  description: 'Научете разликите между алайнери (Invisalign) и традиционните брекети. Направете информиран избор за вашето ортодонтско лечение.',
  openGraph: {
    title: 'Алайнери срещу Брекети | Ортодонтия | Zubite.bg',
    description: 'Научете разликите между алайнери и брекети',
  },
}

const ALIGNERS_BENEFITS = [
  'Почти невидими - дискретно лечение',
  'Свалят се за хранене и хигиена',
  'По-комфортни - без метални елементи',
  'По-малко посещения при лекаря',
  'Предвидими резултати с 3D планиране'
]

const BRACES_BENEFITS = [
  'Ефективни при сложни случаи',
  'Постоянно въздействие 24/7',
  'По-достъпна цена',
  'Не изискват дисциплина за носене',
  'Множество стилове (метални, керамични)'
]

export default function OrthoEducationPage() {
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Начало</span>
          </Link>
          
          <div className="text-center mb-16">
            <p className="text-sky-400 font-medium text-sm tracking-wider uppercase mb-4">
              Ортодонтско образование
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
              Алайнери срещу Брекети
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Направете информиран избор за вашето ортодонтско лечение
            </p>
          </div>
          
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {/* Aligners */}
            <div className="glass rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-sky-400" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-white">Алайнери</h2>
              </div>
              <ul className="space-y-3">
                {ALIGNERS_BENEFITS.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-sm text-slate-400">
                  <span className="text-white font-medium">Цена:</span> 4,000 - 8,000 лв
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  <span className="text-white font-medium">Продължителност:</span> 6 - 18 месеца
                </p>
              </div>
            </div>
            
            {/* Braces */}
            <div className="glass rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-white">Брекети</h2>
              </div>
              <ul className="space-y-3">
                {BRACES_BENEFITS.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-sm text-slate-400">
                  <span className="text-white font-medium">Цена:</span> 2,500 - 5,000 лв
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  <span className="text-white font-medium">Продължителност:</span> 12 - 24 месеца
                </p>
              </div>
            </div>
          </div>
          
          {/* Quiz Types */}
          <div className="glass rounded-2xl p-8 mb-12">
            <h2 className="font-serif text-2xl font-semibold text-white mb-6 text-center">
              Коя опция е подходяща за вас?
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Направете краткия тест и разберете кое лечение е най-подходящо за вашия случай
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/ortho/aligners"
                className="card-hover group glass rounded-xl p-6 text-center"
                data-testid="aligners-quiz-btn"
              >
                <Sparkles className="w-8 h-8 text-sky-400 mx-auto mb-3" />
                <h3 className="font-medium text-white mb-2">Тест за алайнери</h3>
                <p className="text-sm text-slate-400 mb-4">Разберете дали алайнерите са подходящи за вас</p>
                <div className="flex items-center justify-center gap-1 text-sky-400 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>60 секунди</span>
                </div>
              </Link>
              
              <Link
                href="/ortho/braces"
                className="card-hover group glass rounded-xl p-6 text-center"
                data-testid="braces-quiz-btn"
              >
                <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-medium text-white mb-2">Тест за брекети</h3>
                <p className="text-sm text-slate-400 mb-4">Разберете дали брекетите са подходящи за вас</p>
                <div className="flex items-center justify-center gap-1 text-emerald-400 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>60 секунди</span>
                </div>
              </Link>
            </div>
          </div>
          
          {/* CTA */}
          <div className="text-center">
            <Link
              href="/ortho/general"
              className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center gap-2"
              data-testid="general-quiz-btn"
            >
              Направете теста
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-sm text-slate-500 mt-4">
              Не сте сигурни? Направете общия тест и ние ще ви препоръчаме най-подходящата опция.
            </p>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
