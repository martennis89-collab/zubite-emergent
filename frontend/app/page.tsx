import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { 
  ArrowRight, 
  CheckCircle, 
  Eye, 
  Smile, 
  Clock, 
  Sparkles,
  DollarSign,
  ClipboardList,
  Lightbulb,
  Target,
  Scale,
  BookOpen,
  Award,
  ShieldCheck
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Zubite | Брекети или алайнери? Разберете кое лечение е подходящо за вас',
  description: 'Отговорете на няколко кратки въпроса и получете насока за ортодонтско лечение, ориентировъчни цени и следващи стъпки. Безплатна 60-секундна оценка.',
  alternates: {
    canonical: 'https://zubite.bg/',
  },
  openGraph: {
    title: 'Zubite | Брекети или алайнери?',
    description: 'Разберете кое ортодонтско лечение е подходящо за вашия случай. Безплатна оценка за 60 секунди.',
    url: 'https://zubite.bg/',
    siteName: 'Zubite',
    locale: 'bg_BG',
    type: 'website',
  },
}

// Problem icons data
const problems = [
  { icon: Smile, title: 'Криви зъби', desc: 'Неправилно подредени зъби' },
  { icon: Target, title: 'Струпване', desc: 'Липса на място за зъбите' },
  { icon: ArrowRight, title: 'Разстояния', desc: 'Междини между зъбите' },
  { icon: Scale, title: 'Неправилна захапка', desc: 'Проблеми с прикуса' },
]

// Treatment options data
const treatments = [
  {
    title: 'Алайнери',
    desc: 'Почти невидими прозрачни шини за постепенно изправяне на зъбите.',
    price: '4000–8000 лв',
    icon: Eye,
  },
  {
    title: 'Метални брекети',
    desc: 'Класическо ортодонтско лечение с метални брекети.',
    price: '2000–4000 лв',
    icon: Award,
  },
  {
    title: 'Керамични брекети',
    desc: 'По-дискретна алтернатива на металните брекети.',
    price: '3000–5000 лв',
    icon: Sparkles,
  },
  {
    title: 'Лингвални брекети',
    desc: 'Брекети, поставени от вътрешната страна на зъбите.',
    price: '5000–8000 лв',
    icon: ShieldCheck,
  },
]

// Comparison table data
const comparisonItems = [
  { label: 'Видимост', aligners: 'Почти невидими', braces: 'Видими' },
  { label: 'Комфорт', aligners: 'Висок', braces: 'Среден' },
  { label: 'Продължителност', aligners: '6-18 месеца', braces: '12-24 месеца' },
  { label: 'Хигиена', aligners: 'Лесна', braces: 'По-трудна' },
  { label: 'Цена', aligners: '4000-8000 лв', braces: '2000-5000 лв' },
]

// How it works steps
const steps = [
  {
    number: '1',
    title: 'Отговорете на няколко въпроса',
    desc: 'Кратка оценка за вашия ортодонтски случай.',
    icon: ClipboardList,
  },
  {
    number: '2',
    title: 'Разберете възможните решения',
    desc: 'Ще получите насока дали случаят ви е по-подходящ за алайнери или брекети.',
    icon: Lightbulb,
  },
  {
    number: '3',
    title: 'Следващи стъпки',
    desc: 'Ще научите какво да обсъдите с ортодонт и какви са ориентировъчните разходи.',
    icon: Target,
  },
]

// Trust points
const trustPoints = [
  { icon: BookOpen, title: 'Образователна информация', desc: 'Научете за различните видове лечения' },
  { icon: Scale, title: 'Сравнение на лечения', desc: 'Обективно сравнение между опциите' },
  { icon: DollarSign, title: 'Ориентировъчни цени', desc: 'Информация за разходите' },
  { icon: ShieldCheck, title: 'Неутрална платформа', desc: 'Без реклами на клиники' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* SECTION 1 — HERO */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-24 bg-gradient-to-br from-white via-sky-50/30 to-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6 animate-fade-in-up">
                Брекети или алайнери?
                <span className="block text-sky-500 mt-2">Разберете кое лечение е подходящо за вашия случай.</span>
              </h1>
              
              <p className="text-lg text-slate-600 mb-8 animate-fade-in-up animate-delay-100 max-w-xl mx-auto lg:mx-0">
                Отговорете на няколко кратки въпроса и получете насока за лечение, ориентировъчни цени и следващи стъпки.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up animate-delay-200">
                <Link
                  href="/assessment"
                  className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-sky-500 text-white font-medium hover:bg-sky-600 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/25 btn-animate btn-pulse"
                  data-testid="hero-cta-primary"
                >
                  <Clock className="w-5 h-5" />
                  Направете 60-секундна оценка
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border-2 border-slate-200 text-slate-700 font-medium hover:border-sky-300 hover:text-sky-600 transition-all duration-300"
                  data-testid="hero-cta-secondary"
                >
                  Научете повече
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            
            {/* Right Column - Image */}
            <div className="relative animate-fade-in animate-delay-300">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-sky-500/10">
                <div className="aspect-[4/3] bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <Smile className="w-16 h-16 text-sky-500" />
                    </div>
                    <p className="text-slate-600 font-medium">Перфектната усмивка започва тук</p>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-sky-100 rounded-full blur-2xl opacity-60" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-sky-50 rounded-full blur-3xl opacity-80" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THE PROBLEM */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 mb-6 animate-fade-in-up">
            Много хора знаят, че имат проблем със зъбите си —
            <span className="block text-sky-500 mt-2">но не знаят какво лечение им е необходимо.</span>
          </h2>
          
          <p className="text-slate-600 mb-12 max-w-2xl mx-auto animate-fade-in-up animate-delay-100">
            Различните ортодонтски проблеми изискват различни подходи. Ето най-честите случаи, при които хората търсят помощ:
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {problems.map((problem, index) => (
              <div 
                key={problem.title}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 animate-fade-in-up card-hover-subtle"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 group-hover:scale-110 transition-all duration-300">
                  <problem.icon className="w-7 h-7 text-sky-500" />
                </div>
                <h3 className="font-medium text-slate-900 mb-1">{problem.title}</h3>
                <p className="text-sm text-slate-500">{problem.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — ORTHODONTIC OPTIONS */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 mb-4 animate-fade-in-up">
              Основни методи за изправяне на зъби
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto animate-fade-in-up animate-delay-100">
              Сравнете различните ортодонтски решения и техните характеристики
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {treatments.map((treatment, index) => (
              <div 
                key={treatment.title}
                className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 animate-fade-in-up card-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 mb-4 rounded-xl bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                  <treatment.icon className="w-6 h-6 text-sky-500" />
                </div>
                <h3 className="font-serif text-xl font-medium text-slate-900 mb-2">{treatment.title}</h3>
                <p className="text-sm text-slate-600 mb-4">{treatment.desc}</p>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Цена:</p>
                  <p className="text-lg font-semibold text-sky-600">{treatment.price}</p>
                </div>
                <Link
                  href="/orthodontics"
                  className="mt-4 inline-flex items-center text-sm text-sky-500 font-medium hover:text-sky-600 transition-colors group-hover:gap-2"
                >
                  Научете повече
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — ALIGNERS VS BRACES */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 mb-4 animate-fade-in-up">
              Алайнери vs Брекети
            </h2>
            <p className="text-slate-600 animate-fade-in-up animate-delay-100">
              Кратко сравнение на двата основни метода
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up animate-delay-200">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-4 text-sm font-medium text-slate-500"></div>
              <div className="p-4 text-center text-sm font-semibold text-sky-600">Алайнери</div>
              <div className="p-4 text-center text-sm font-semibold text-slate-700">Брекети</div>
            </div>
            {comparisonItems.map((item, index) => (
              <div 
                key={item.label}
                className={`grid grid-cols-3 ${index !== comparisonItems.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="p-4 text-sm font-medium text-slate-700">{item.label}</div>
                <div className="p-4 text-center text-sm text-slate-600">{item.aligners}</div>
                <div className="p-4 text-center text-sm text-slate-600">{item.braces}</div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Link
              href="/aligners-vs-braces"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full border-2 border-sky-500 text-sky-600 font-medium hover:bg-sky-50 transition-all duration-300"
              data-testid="comparison-cta"
            >
              Виж пълното сравнение
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 5 — HOW ZUBITE WORKS */}
      <section id="how-it-works" className="py-16 md:py-24 bg-white scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 mb-4 animate-fade-in-up">
              Как работи Zubite
            </h2>
            <p className="text-slate-600 animate-fade-in-up animate-delay-100">
              Три прости стъпки до информирано решение
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => (
              <div 
                key={step.number}
                className="relative text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Connector line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-sky-200 to-sky-100" />
                )}
                
                <div className="relative z-10">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg shadow-sky-500/25 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-sm border-2 border-white shadow">
                    {step.number}
                  </div>
                </div>
                <h3 className="font-serif text-xl font-medium text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — WHY TRUST ZUBITE */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 mb-4 animate-fade-in-up">
              Защо да използвате Zubite
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {trustPoints.map((point, index) => (
              <div 
                key={point.title}
                className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition-shadow duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-sky-50 flex items-center justify-center">
                  <point.icon className="w-6 h-6 text-sky-500" />
                </div>
                <h3 className="font-medium text-slate-900 mb-2">{point.title}</h3>
                <p className="text-sm text-slate-500">{point.desc}</p>
              </div>
            ))}
          </div>
          
          {/* Important disclaimer */}
          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-6 md:p-8 text-center animate-fade-in-up">
            <p className="text-slate-700">
              <span className="font-semibold text-sky-700">Важно:</span> Zubite не е клиника и не предлага лечение.
              <span className="block mt-2 text-slate-600">
                Целта ни е да ви помогнем да разберете опциите си и да вземете информирано решение.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 7 — FINAL CTA */}
      <section id="assessment-cta" className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 rounded-3xl p-10 md:p-16 text-white shadow-2xl shadow-sky-500/25 animate-fade-in-up">
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold mb-6">
              Готови ли сте да разберете кое лечение е подходящо за вас?
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto text-lg">
              Безплатна оценка за 60 секунди. Без ангажименти.
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-sky-600 font-semibold hover:bg-sky-50 transition-all duration-300 shadow-lg hover:shadow-xl btn-animate"
              data-testid="final-cta"
            >
              <CheckCircle className="w-5 h-5" />
              Направете безплатна оценка
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
