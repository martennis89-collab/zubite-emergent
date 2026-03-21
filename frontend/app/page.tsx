import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowRight, ChevronRight, AlertTriangle, TrendingUp, Clock, Target } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Zubite.bg | Провери на кой етап си — преди да стане по-сложно',
  description: 'Повечето хора вече имат ранни признаци на проблеми със зъбите — но ги осъзнават чак когато лечението стане по-сложно. Провери къде се намираш за 60 секунди.',
  keywords: 'ортодонтия, брекети, алайнери, зъби, захапка, ортодонт, България',
  alternates: {
    canonical: 'https://zubite.bg/',
  },
  openGraph: {
    title: 'Zubite.bg | Провери на кой етап си',
    description: 'Повечето хора чакат, докато стане скъпо. Ти на кой етап си?',
    url: 'https://zubite.bg/',
    siteName: 'Zubite.bg',
    locale: 'bg_BG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zubite.bg | Провери на кой етап си',
    description: 'Повечето хора чакат, докато стане скъпо. Ти на кой етап си?',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
    color: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  {
    stage: 'Средно',
    description: 'вече се усеща',
    color: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  {
    stage: 'Късно',
    description: 'става сложно и скъпо',
    color: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
    text: 'text-red-700',
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
    <main className="min-h-screen bg-white text-slate-900">
      {/* Sticky CTA - Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <Link
          href="/assessment"
          className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white font-medium rounded-full shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition-all"
          aria-label="Провери етапа си"
        >
          <span>Провери етапа си</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6" aria-label="Главна навигация">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="font-serif text-2xl font-semibold text-slate-900" aria-label="Zubite.bg начална страница">
              Zubite<span className="text-sky-500">.bg</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/blog" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Блог
              </Link>
              <Link href="/orthodontics" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Ортодонтия
              </Link>
              <Link
                href="/assessment"
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/25 transition-all"
              >
                Провери етапа си
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* SECTION 1 — HERO */}
      <section className="relative pt-32 md:pt-44 pb-20 md:pb-32 bg-gradient-to-b from-sky-50 to-white" aria-labelledby="hero-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 id="hero-heading" className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight mb-8 animate-fade-in-up">
            <span className="text-slate-900">По-лесно е да оправиш зъбите си навреме.</span>
            <br />
            <span className="text-slate-500">Повечето хора чакат, докато стане скъпо.</span>
            <br />
            <span className="text-sky-600">Ти на кой етап си?</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 animate-fade-in-up animate-delay-100">
            Повечето хора вече имат ранни признаци — но ги осъзнават чак когато лечението стане по-сложно.
          </p>
          
          <div className="animate-fade-in-up animate-delay-200">
            <Link
              href="/assessment"
              className="inline-flex items-center gap-3 px-8 py-4 bg-sky-500 text-white text-lg font-medium rounded-full hover:bg-sky-600 hover:shadow-xl hover:shadow-sky-500/30 transition-all duration-300 group"
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
      <section className="py-20 md:py-28 bg-white" aria-labelledby="interrupt-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4 mb-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center" aria-hidden="true">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h2 id="interrupt-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900">
              Не ти трябва болка, за да има проблем.
            </h2>
          </div>
          
          <div className="space-y-6 mb-12">
            <p className="text-lg text-slate-700 pl-4 border-l-4 border-slate-200">
              Повечето проблеми със захапката започват тихо.
            </p>
            <p className="text-lg text-slate-700 pl-4 border-l-4 border-slate-200">
              Малките размествания → неравномерно износване.
            </p>
            <p className="text-lg text-slate-900 pl-4 border-l-4 border-sky-500 font-medium">
              Ранният етап = най-лесен за корекция.
            </p>
          </div>
          
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 text-sky-600 font-medium hover:text-sky-700 transition-colors group"
          >
            <span>Провери своя етап</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* SECTION 3 — SELF RECOGNITION (Blue Background) */}
      <section className="py-20 md:py-28 bg-sky-600" aria-labelledby="recognition-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 id="recognition-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-12 text-center">
            Звучи ли ти познато?
          </h2>
          
          <ul className="space-y-4 mb-12" role="list">
            {symptoms.map((symptom, index) => (
              <li 
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300"
              >
                <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" aria-hidden="true" />
                <span className="text-white/90">{symptom}</span>
              </li>
            ))}
          </ul>
          
          <div className="text-center">
            <Link
              href="/assessment"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-sky-600 font-medium rounded-full hover:shadow-xl transition-all duration-300 group"
            >
              <span>Провери своя етап</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 4 — PROGRESSION */}
      <section className="py-20 md:py-28 bg-white" aria-labelledby="progression-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4 mb-16">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center" aria-hidden="true">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
            <h2 id="progression-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900">
              Това не остава същото. Влошава се.
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list">
            {stages.map((item, index) => (
              <article 
                key={index}
                className={`relative p-6 rounded-2xl border-2 ${item.color}`}
              >
                {/* Connector line */}
                {index < stages.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-slate-300" aria-hidden="true">
                    <ChevronRight className="w-4 h-4 text-slate-400 absolute -right-1 -top-1.5" />
                  </div>
                )}
                
                <div className={`w-3 h-3 rounded-full ${item.dot} mb-4`} aria-hidden="true" />
                <h3 className={`font-serif text-xl font-semibold ${item.text} mb-2`}>{item.stage}</h3>
                <p className="text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — COST REFRAME */}
      <section className="py-20 md:py-28 bg-slate-50" aria-labelledby="cost-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4 mb-12">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center" aria-hidden="true">
              <Clock className="w-6 h-6 text-sky-600" />
            </div>
            <h2 id="cost-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900">
              Решението навреме и решението по-късно не са едно и също.
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="p-6 rounded-2xl bg-white border-2 border-emerald-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="text-emerald-700 font-semibold">Ранен етап</span>
              </div>
              <p className="text-slate-700">По-лесно, по-бързо, по-предвидимо.</p>
            </article>
            <article className="p-6 rounded-2xl bg-white border-2 border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true" />
                <span className="text-red-700 font-semibold">Късен етап</span>
              </div>
              <p className="text-slate-700">По-сложно, по-скъпо.</p>
            </article>
          </div>
        </div>
      </section>

      {/* SECTION 6 — AUTHORITY / SEO */}
      <section className="py-20 md:py-28 bg-white" aria-labelledby="authority-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4 mb-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center" aria-hidden="true">
              <Target className="w-6 h-6 text-slate-600" />
            </div>
            <h2 id="authority-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900">
              Защо повечето хора пропускат ранния етап
            </h2>
          </div>
          
          <ol className="space-y-4 mb-10" role="list">
            {reasons.map((reason, index) => (
              <li key={index} className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-slate-700">{reason}</span>
              </li>
            ))}
          </ol>
          
          <blockquote className="p-6 rounded-xl bg-slate-50 border-l-4 border-sky-500">
            <p className="text-slate-600 italic">
              "Проучвания показват, че повечето възрастни имат признаци — но малък процент действат навреме."
            </p>
          </blockquote>
        </div>
      </section>

      {/* SECTION 7 — SEO BLOCK */}
      <section className="py-20 md:py-28 bg-slate-50" aria-labelledby="seo-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 id="seo-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900 mb-8">
            Имаш ли реален проблем със зъбите — или е само естетика?
          </h2>
          
          <div className="space-y-6 text-slate-600 leading-relaxed">
            <p>
              Кривите или разместени зъби често се възприемат като чисто естетичен проблем, но много нарушения в захапката започват без болка.
            </p>
            <p>
              Ранните признаци могат да включват неравномерно натоварване, напрежение в челюстта или постепенно разместване.
            </p>
            <p className="text-slate-800 font-medium">
              Разбирането на етапа ти навреме може да предотврати по-сложно лечение в бъдеще.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8 — FINAL CTA (Blue Background) */}
      <section className="py-20 md:py-32 bg-sky-600" aria-labelledby="final-cta-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 id="final-cta-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-10">
            Разбери на кой етап си, преди да стане по-сериозен проблем.
          </h2>
          
          <Link
            href="/assessment"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-sky-600 text-lg font-semibold rounded-full hover:shadow-2xl transition-all duration-300 group"
            data-testid="final-cta"
          >
            <span>Провери къде се намираш</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-sm text-sky-100 mt-6">
            60 секунди. Без регистрация. Без ангажименти.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-200" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="font-serif text-xl font-semibold text-slate-900" aria-label="Zubite.bg начална страница">
              Zubite<span className="text-sky-500">.bg</span>
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600" aria-label="Допълнителна навигация">
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Блог</Link>
              <Link href="/orthodontics" className="hover:text-slate-900 transition-colors">Ортодонтия</Link>
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">Поверителност</Link>
              <Link href="/contact" className="hover:text-slate-900 transition-colors">Контакти</Link>
            </nav>
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Zubite.bg
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 max-w-2xl mx-auto">
              Zubite.bg не е клиника и не предлага медицински консултации. Платформата е създадена да ви помогне да разберете своите опции за ортодонтско лечение.
            </p>
          </div>
        </div>
      </footer>

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Zubite.bg",
            "description": "Платформа за ориентация в ортодонтското лечение в България",
            "url": "https://zubite.bg",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://zubite.bg/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Zubite.bg",
            "url": "https://zubite.bg",
            "description": "Платформа за информирани решения в ортодонтията",
            "areaServed": {
              "@type": "Country",
              "name": "България"
            }
          })
        }}
      />
    </main>
  )
}
