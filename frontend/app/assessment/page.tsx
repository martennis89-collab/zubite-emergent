import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Compass,
  ListChecks,
  BookOpen,
  Lightbulb,
  ClipboardList,
  Target,
  Smile
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Ортодонтска оценка | Zubite.bg',
  description: 'Кратка ортодонтска оценка, която ще ви помогне да се ориентирате между алайнери, брекети и следващи стъпки.',
  alternates: {
    canonical: 'https://zubite.bg/assessment',
  },
  openGraph: {
    title: 'Ортодонтска оценка | Zubite.bg',
    description: 'Кратка ортодонтска оценка, която ще ви помогне да се ориентирате между алайнери, брекети и следващи стъпки.',
    url: 'https://zubite.bg/assessment',
    siteName: 'Zubite',
    locale: 'bg_BG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ортодонтска оценка | Zubite.bg',
    description: 'Кратка ортодонтска оценка за ориентация в ортодонтското лечение.',
  },
}

// What you will get cards
const benefitCards = [
  {
    icon: Compass,
    title: 'По-ясна насока',
    description: 'Ще разберете кой тип ортодонтско лечение може да е по-подходящо за вашия случай.',
  },
  {
    icon: ListChecks,
    title: 'Ориентировъчни следващи стъпки',
    description: 'Ще получите по-ясна представа какво да обсъдите с ортодонт.',
  },
  {
    icon: BookOpen,
    title: 'По-добра подготовка',
    description: 'Ще влезете в консултацията по-информирани и с правилните въпроси.',
  },
]

// How it works steps
const steps = [
  {
    number: '1',
    title: 'Отговаряте на няколко кратки въпроса',
    icon: ClipboardList,
  },
  {
    number: '2',
    title: 'Системата оценява вероятната посока за лечение',
    icon: Lightbulb,
  },
  {
    number: '3',
    title: 'Получавате насока и следващи стъпки',
    icon: Target,
  },
]

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* SECTION 1 — HERO */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-24 bg-gradient-to-br from-white via-teal-50/30 to-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-600 text-sm font-medium mb-6 animate-fade-in">
                <Clock className="w-4 h-4" />
                <span>Около 60 секунди</span>
              </div>
              
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6 animate-fade-in-up">
                Оценете своя ортодонтски случай
              </h1>
              
              <p className="text-lg text-slate-600 mb-8 animate-fade-in-up animate-delay-100 max-w-xl mx-auto lg:mx-0">
                Тази кратка оценка ще ви помогне да разберете дали проблемът ви е по-подходящ за алайнери, брекети или по-задълбочена ортодонтска консултация.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up animate-delay-200">
                <Link
                  href="/assessment/quiz"
                  className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-teal-500 text-white font-medium hover:bg-teal-600 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/25 btn-animate btn-pulse"
                  data-testid="assessment-cta-primary"
                >
                  Започнете оценката
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              
              <p className="text-sm text-slate-500 mt-4 animate-fade-in-up animate-delay-300">
                Отнема около 60 секунди.
              </p>
            </div>
            
            {/* Right Column - Visual */}
            <div className="relative animate-fade-in animate-delay-300">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-teal-500/10 bg-gradient-to-br from-teal-100 via-teal-50 to-white">
                <div className="aspect-[4/3] flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                      <Smile className="w-12 h-12 text-teal-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
                        <span className="text-slate-600 font-medium">Алайнери</span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-teal-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
                        <span className="text-slate-600 font-medium">Брекети</span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: '1s' }} />
                        <span className="text-slate-600 font-medium">Консултация</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-teal-100 rounded-full blur-2xl opacity-60" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-80" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — WHAT YOU WILL GET */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 mb-4 animate-fade-in-up">
              Какво ще получите
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefitCards.map((card, index) => (
              <div 
                key={card.title}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 animate-fade-in-up card-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 mb-6 rounded-xl bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 group-hover:scale-110 transition-all duration-300">
                  <card.icon className="w-7 h-7 text-teal-500" />
                </div>
                <h3 className="font-serif text-xl font-medium text-slate-900 mb-3">{card.title}</h3>
                <p className="text-slate-600 leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — IMPORTANT NOTE */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-8 md:p-10 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-4">
                  Важно уточнение
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  Тази оценка <span className="font-medium">не е медицинска диагноза</span> и не замества преглед при ортодонт.
                </p>
                <p className="text-slate-600 mt-3 leading-relaxed">
                  Тя е създадена, за да ви помогне да се ориентирате по-добре в основните възможности за лечение.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — HOW IT WORKS */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 mb-4 animate-fade-in-up">
              Как протича
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((step, index) => (
              <div 
                key={step.number}
                className="relative text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Connector line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-teal-200 to-teal-100" />
                )}
                
                <div className="relative z-10 inline-block">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/25 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm border-2 border-white shadow">
                    {step.number}
                  </div>
                </div>
                <h3 className="font-medium text-slate-900 text-lg">{step.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — FINAL CTA */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 rounded-3xl p-10 md:p-16 text-white shadow-2xl shadow-teal-500/25 animate-fade-in-up">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold mb-8">
              Готови ли сте да започнете?
            </h2>
            <Link
              href="/assessment/quiz"
              className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-teal-600 font-semibold hover:bg-teal-50 transition-all duration-300 shadow-lg hover:shadow-xl btn-animate"
              data-testid="assessment-final-cta"
            >
              <CheckCircle className="w-5 h-5" />
              Започнете оценката
            </Link>
            <p className="text-teal-100 mt-6 text-sm">
              Безплатно • Около 60 секунди • Без регистрация
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
