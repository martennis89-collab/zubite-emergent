import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowRight, ChevronRight, AlertTriangle, TrendingUp, Clock, Target, Check } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Zubite | Провери на кой етап си — преди да стане по-сложно',
  description: 'Повечето хора вече имат ранни признаци на проблеми със зъбите — но ги осъзнават чак когато лечението стане по-сложно. Провери къде се намираш за 60 секунди.',
  alternates: {
    canonical: 'https://zubite.bg/',
  },
  openGraph: {
    title: 'Zubite | Провери на кой етап си',
    description: 'Повечето хора чакат, докато стане скъпо. Ти на кой етап си?',
    url: 'https://zubite.bg/',
    siteName: 'Zubite',
    locale: 'bg_BG',
    type: 'website',
  },
}

// Self-recognition symptoms
const symptoms = [
  'Дъвчеш повече от едната страна',
  'Зъбите ти са леко струпани',
  'Захапката ти не се усеща равномерна',
  'Събуждаш се с напрежение в челюстта',
  'Чуваш щракане при отваряне на устата',
]

// Progression stages
const stages = [
  {
    stage: 'Рано',
    description: 'почти незабележимо',
    color: 'from-emerald-500/20 to-emerald-500/5',
    dot: 'bg-emerald-400',
  },
  {
    stage: 'Средно',
    description: 'вече се усеща',
    color: 'from-amber-500/20 to-amber-500/5',
    dot: 'bg-amber-400',
  },
  {
    stage: 'Късно',
    description: 'става сложно и скъпо',
    color: 'from-red-500/20 to-red-500/5',
    dot: 'bg-red-400',
  },
]

// Why people miss early stage
const reasons = [
  'Няма болка в началото',
  'Симптомите са леки',
  'Проблемът се развива бавно',
  'Повечето хора не проверяват',
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-white overflow-hidden">
      {/* Sticky CTA */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <Link
          href="/assessment"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium rounded-full shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all"
        >
          <span>Провери етапа си</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="font-serif text-2xl font-semibold text-white">
              Zubite
            </Link>
            <Link
              href="/assessment"
              className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-medium rounded-full hover:shadow-lg hover:shadow-sky-500/25 transition-all"
            >
              Провери етапа си
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* SECTION 1 — HERO */}
      <section className="relative pt-32 md:pt-44 pb-20 md:pb-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight mb-8 animate-fade-in-up">
            <span className="text-white">По-лесно е да оправиш зъбите си навреме.</span>
            <br />
            <span className="text-slate-400">Повечето хора чакат, докато стане скъпо.</span>
            <br />
            <span className="text-sky-400">Ти на кой етап си?</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 animate-fade-in-up animate-delay-100">
            Повечето хора вече имат ранни признаци — но ги осъзнават чак когато лечението стане по-сложно.
          </p>
          
          <div className="animate-fade-in-up animate-delay-200">
            <Link
              href="/assessment"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-lg font-medium rounded-full hover:shadow-xl hover:shadow-sky-500/30 transition-all duration-300 group"
              data-testid="hero-cta"
            >
              <span>Провери къде се намираш</span>
              <span className="text-sky-200">(60 сек)</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-sm text-slate-500 mt-4">
              Без записване. Без натиск. Само яснота.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 — INTERRUPT */}
      <section className="py-20 md:py-28 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4 mb-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
              Не ти трябва болка, за да има проблем.
            </h2>
          </div>
          
          <div className="space-y-6 mb-12">
            <p className="text-lg text-slate-300 pl-4 border-l-2 border-slate-700">
              Повечето проблеми със захапката започват тихо.
            </p>
            <p className="text-lg text-slate-300 pl-4 border-l-2 border-slate-700">
              Малките размествания → неравномерно износване.
            </p>
            <p className="text-lg text-slate-400 pl-4 border-l-2 border-sky-500/50">
              <span className="text-sky-400">Ранният етап = най-лесен за корекция.</span>
            </p>
          </div>
          
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 text-sky-400 font-medium hover:text-sky-300 transition-colors group"
          >
            <span>Провери своя етап</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* SECTION 3 — SELF RECOGNITION */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-12 text-center">
            Звучи ли ти познато?
          </h2>
          
          <div className="space-y-4 mb-12">
            {symptoms.map((symptom, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all duration-300"
              >
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="text-slate-300">{symptom}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Link
              href="/assessment"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium rounded-full hover:shadow-xl hover:shadow-sky-500/30 transition-all duration-300 group"
            >
              <span>Провери своя етап</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 4 — PROGRESSION */}
      <section className="py-20 md:py-28 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4 mb-16">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
              Това не остава същото. Влошава се.
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stages.map((item, index) => (
              <div 
                key={index}
                className={`relative p-6 rounded-2xl bg-gradient-to-b ${item.color} border border-white/5`}
              >
                {/* Connector line */}
                {index < stages.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-slate-700">
                    <ChevronRight className="w-4 h-4 text-slate-600 absolute -right-1 -top-1.5" />
                  </div>
                )}
                
                <div className={`w-3 h-3 rounded-full ${item.dot} mb-4`} />
                <h3 className="font-serif text-xl font-semibold text-white mb-2">{item.stage}</h3>
                <p className="text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — COST REFRAME */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4 mb-12">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-sky-400" />
            </div>
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
              Решението навреме и решението по-късно не са едно и също.
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 font-medium">Ранен етап</span>
              </div>
              <p className="text-slate-300">По-лесно, по-бързо, по-предвидимо.</p>
            </div>
            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-400 font-medium">Късен етап</span>
              </div>
              <p className="text-slate-300">По-сложно, по-скъпо.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — AUTHORITY / SEO */}
      <section className="py-20 md:py-28 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4 mb-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-slate-400" />
            </div>
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
              Защо повечето хора пропускат ранния етап
            </h2>
          </div>
          
          <div className="space-y-4 mb-10">
            {reasons.map((reason, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 font-medium text-sm">
                  {index + 1}
                </div>
                <span className="text-slate-300">{reason}</span>
              </div>
            ))}
          </div>
          
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <p className="text-slate-400 italic">
              "Проучвания показват, че повечето възрастни имат признаци — но малък процент действат навреме."
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 7 — SEO BLOCK */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-8">
            Имаш ли реален проблем със зъбите — или е само естетика?
          </h2>
          
          <div className="space-y-6 text-slate-400 leading-relaxed">
            <p>
              Кривите или разместени зъби често се възприемат като чисто естетичен проблем, но много нарушения в захапката започват без болка.
            </p>
            <p>
              Ранните признаци могат да включват неравномерно натоварване, напрежение в челюстта или постепенно разместване.
            </p>
            <p className="text-slate-300">
              Разбирането на етапа ти навреме може да предотврати по-сложно лечение в бъдеще.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8 — FINAL CTA */}
      <section className="py-20 md:py-32 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-10">
            Разбери на кой етап си, преди да стане по-сериозен проблем.
          </h2>
          
          <Link
            href="/assessment"
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-lg font-medium rounded-full hover:shadow-2xl hover:shadow-sky-500/30 transition-all duration-300 group"
            data-testid="final-cta"
          >
            <span>Провери къде се намираш</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-sm text-slate-500 mt-6">
            60 секунди. Без регистрация. Без ангажименти.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="font-serif text-xl font-semibold text-white">
              Zubite
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <Link href="/blog" className="hover:text-white transition-colors">Блог</Link>
              <Link href="/orthodontics" className="hover:text-white transition-colors">Ортодонтия</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Поверителност</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Контакти</Link>
            </nav>
            <p className="text-sm text-slate-600">
              © {new Date().getFullYear()} Zubite
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-slate-600 max-w-2xl mx-auto">
              Zubite не е клиника и не предлага медицински консултации. Платформата е създадена да ви помогне да разберете своите опции за ортодонтско лечение.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
