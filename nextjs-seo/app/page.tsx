import Link from 'next/link'
import { MapPin, ArrowRight, Shield, Clock, Users, ChevronRight, Star, CheckCircle } from 'lucide-react'

const CITIES = [
  { slug: 'sofia', name: 'София', nameEn: 'Sofia' },
  { slug: 'plovdiv', name: 'Пловдив', nameEn: 'Plovdiv' },
  { slug: 'varna', name: 'Варна', nameEn: 'Varna' }
]

const TREATMENTS = [
  { 
    slug: 'orthodontics', 
    name: 'Ортодонтско лечение', 
    description: 'Алайнери и брекети',
    icon: '🦷'
  },
  { 
    slug: 'implants', 
    name: 'Зъбни импланти', 
    description: 'Трайно решение за липсващи зъби',
    icon: '🔧'
  },
  { 
    slug: 'full-mouth', 
    name: 'Пълна възстановителна терапия', 
    description: 'Комплексно възстановяване',
    icon: '✨'
  },
  { 
    slug: 'bonding', 
    name: 'Естетика на усмивката', 
    description: 'Бондинг, форма, дължина',
    icon: '💎'
  }
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0f172a]">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="font-serif text-2xl font-semibold text-white" data-testid="logo">
              Zubite<span className="text-sky-400">.bg</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-medium text-sky-400" data-testid="nav-home">
                Начало
              </Link>
              <Link href="/symptoms" className="text-sm font-medium text-slate-300 hover:text-white transition-colors" data-testid="nav-symptoms">
                Симптоми
              </Link>
              <Link href="/contact" className="text-sm font-medium text-slate-300 hover:text-white transition-colors" data-testid="nav-contact">
                Контакти
              </Link>
              
              {/* Language Toggle */}
              <div className="flex items-center gap-2 ml-4 border-l border-slate-700 pl-4">
                <button className="text-sm font-medium px-2 py-1 rounded bg-sky-500/20 text-sky-400" data-testid="lang-bg">
                  BG
                </button>
                <span className="text-slate-600">|</span>
                <Link href="/en" className="text-sm font-medium px-2 py-1 rounded text-slate-400 hover:text-white transition-colors" data-testid="lang-en">
                  EN
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sky-400 font-medium text-sm tracking-wider uppercase mb-4 animate-fade-in">
            Навигатор за дентални решения
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight mb-6 animate-fade-in-up">
            Намерете идеалното<br />
            <span className="gradient-text">дентално решение</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 animate-fade-in-up animate-delay-100">
            Изберете вашия град и открийте най-добрите клиники за ортодонтия, импланти и естетична стоматология
          </p>

          {/* City Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-16">
            {CITIES.map((city, index) => (
              <Link
                key={city.slug}
                href={`/city/${city.slug}`}
                className={`card-hover group glass rounded-2xl p-6 text-center animate-fade-in-up`}
                style={{ animationDelay: `${(index + 2) * 100}ms` }}
                data-testid={`city-${city.slug}`}
              >
                <div className="w-14 h-14 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="font-medium text-white text-lg">{city.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Избери</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Clock, title: '60-90 секунди', desc: 'Бърза оценка' },
              { icon: Shield, title: 'Защита на данни', desc: 'GDPR съответствие' },
              { icon: Users, title: 'Партньорски клиники', desc: 'Проверени специалисти' }
            ].map((item, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-500/10 mb-4">
                  <item.icon className="w-6 h-6 text-sky-400" />
                </div>
                <h4 className="font-medium text-white mb-1">{item.title}</h4>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Identification Section */}
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
              С какъв проблем се сблъсквате?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Изберете категорията, която най-добре описва вашата ситуация
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TREATMENTS.map((treatment, index) => (
              <Link
                key={treatment.slug}
                href={`/city/sofia/${treatment.slug}`}
                className="card-hover group glass rounded-2xl p-6 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`treatment-${treatment.slug}`}
              >
                <div className="text-4xl mb-4">{treatment.icon}</div>
                <h3 className="font-medium text-white text-lg mb-2">{treatment.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{treatment.description}</p>
                <div className="flex items-center text-sky-400 text-sm font-medium group-hover:text-sky-300 transition-colors">
                  <span>Научи повече</span>
                  <ChevronRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
              Как работи
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Три прости стъпки до вашето дентално решение
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '1', t: 'Изберете град', d: 'Изберете вашия град от списъка с налични локации' },
              { n: '2', t: 'Изберете лечение', d: 'Определете типа дентално лечение, от което се нуждаете' },
              { n: '3', t: 'Преминете оценка', d: 'Отговорете на кратък въпросник и получете персонализирана препоръка' }
            ].map((step, index) => (
              <div key={step.n} className="text-center animate-fade-in-up" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-sky-500 to-sky-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6 glow">
                  {step.n}
                </div>
                <h3 className="font-medium text-white text-lg mb-3">{step.t}</h3>
                <p className="text-slate-400">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
              Доверени от хиляди пациенти
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Мария И.', city: 'София', text: 'Благодарение на Zubite намерих перфектната клиника за моето ортодонтско лечение.' },
              { name: 'Георги П.', city: 'Пловдив', text: 'Бързо и лесно намерих специалист за зъбни импланти. Препоръчвам!' },
              { name: 'Елена Д.', city: 'Варна', text: 'Професионално обслужване и отлични резултати. Много съм доволна!' }
            ].map((testimonial, index) => (
              <div key={index} className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-4">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-medium">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium">{testimonial.name}</p>
                    <p className="text-sm text-slate-400">{testimonial.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass rounded-3xl p-12 glow">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
              Готови ли сте да започнете?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Изберете вашия град и направете първата стъпка към перфектната усмивка
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/city/sofia"
                className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2"
                data-testid="cta-sofia"
              >
                <MapPin className="w-5 h-5" />
                Започни в София
              </Link>
              <Link
                href="/ortho"
                className="btn-secondary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2"
                data-testid="cta-ortho"
              >
                <CheckCircle className="w-5 h-5" />
                Направи теста за ортодонтия
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <span className="font-serif text-xl font-semibold text-white">
                Zubite<span className="text-sky-400">.bg</span>
              </span>
              <p className="text-slate-400 text-sm mt-2">Навигатор за дентални решения</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">Информация</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <Link href="/privacy" className="block hover:text-white transition-colors">Поверителност</Link>
                <Link href="/terms" className="block hover:text-white transition-colors">Условия</Link>
                <Link href="/contact" className="block hover:text-white transition-colors">Контакти</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">Градове</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <Link href="/city/sofia" className="block hover:text-white transition-colors">София</Link>
                <Link href="/city/plovdiv" className="block hover:text-white transition-colors">Пловдив</Link>
                <Link href="/city/varna" className="block hover:text-white transition-colors">Варна</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-white mb-3">Лечения</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <Link href="/city/sofia/orthodontics" className="block hover:text-white transition-colors">Ортодонтия</Link>
                <Link href="/city/sofia/implants" className="block hover:text-white transition-colors">Импланти</Link>
                <Link href="/city/sofia/full-mouth" className="block hover:text-white transition-colors">Пълна реставрация</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Zubite.bg. Всички права запазени.
          </div>
        </div>
      </footer>
    </main>
  )
}
