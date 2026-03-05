import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MapPin, ArrowRight, Shield, Clock, Users, ChevronRight, Star, CheckCircle, Smile, Target, Heart, Moon, Bone } from 'lucide-react'
import { TREATMENTS, CITIES } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Zubite.bg | Навигатор за дентални решения в България',
  description: 'Отговорете на няколко въпроса и получете препоръка за подходящо дентално лечение, ориентировъчни цени и 2–3 опции за клиники според вашия случай.',
  alternates: {
    canonical: 'https://zubite.bg/',
  },
  openGraph: {
    title: 'Zubite.bg | Навигатор за дентални решения',
    description: 'Персонализирани препоръки за дентално лечение — ортодонтия, импланти, естетика и още. Ориентировъчни цени и опции за клиники.',
    url: 'https://zubite.bg/',
    siteName: 'Zubite.bg',
    locale: 'bg_BG',
    type: 'website',
  },
}

const treatmentList = Object.values(TREATMENTS)
const cityList = Object.values(CITIES)

// Icon mapping for treatments
const treatmentIcons: Record<string, React.ElementType> = {
  orthodontics: Smile,
  implants: Target,
  'cosmetic-dentistry': Heart,
  'sleep-airway': Moon,
  tmj: Bone
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-20 md:pt-36 md:pb-28 bg-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sky-500 font-medium text-sm tracking-wide uppercase mb-4 animate-fade-in">
            Навигатор за дентални решения
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6 animate-fade-in-up">
            Намерете идеалното<br />дентално решение
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-4 animate-fade-in-up animate-delay-100">
            Отговорете на няколко въпроса и ще получите препоръка за подходящо лечение, ориентировъчни цени и 2–3 опции за клиники според вашия случай.
          </p>
          <p className="text-base text-slate-500 max-w-xl mx-auto mb-12 animate-fade-in-up animate-delay-100">
            Не сме директория. Екипът ни ви насочва към правилния специалист според вашия конкретен случай.
          </p>
        </div>
      </section>

      {/* Treatment Selection */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
              Какъв проблем искате да решите?
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Изберете типа лечение, за да научите повече и да намерите подходяща клиника
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {treatmentList.map((treatment, index) => {
              const IconComponent = treatmentIcons[treatment.slug] || Smile
              return (
                <Link
                  key={treatment.slug}
                  href={`/${treatment.slug}`}
                  className="treatment-card group bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                  data-testid={`treatment-${treatment.slug}`}
                >
                  <div className="treatment-icon w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center mb-4">
                    <IconComponent className="w-7 h-7 text-sky-600" />
                  </div>
                  <h3 className="font-medium text-slate-900 text-lg mb-2">{treatment.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{treatment.description}</p>
                  <div className="flex items-center text-sky-500 text-sm font-medium group-hover:text-sky-600 transition-colors">
                    <span>Научи повече</span>
                    <ChevronRight className="w-4 h-4 ml-1 treatment-arrow" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Clock, title: '60-90 секунди', desc: 'Бърза оценка' },
              { icon: Shield, title: 'Защита на данни', desc: 'GDPR съответствие' },
              { icon: Users, title: 'Партньорски клиники', desc: 'Проверени специалисти' }
            ].map((item, index) => (
              <div 
                key={index} 
                className="animate-fade-in" 
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="icon-hover inline-block">
                  <item.icon className="w-8 h-8 text-sky-500 mx-auto mb-3" />
                </div>
                <h4 className="font-medium text-slate-900 mb-1">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 text-center mb-12">
            Как работи
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '1', t: 'Изберете лечение', d: 'Определете типа дентална грижа, от която се нуждаете' },
              { n: '2', t: 'Преминете оценка', d: 'Отговорете на кратък въпросник за вашия случай' },
              { n: '3', t: 'Получете препоръка', d: 'Получете препоръка + ориентировъчни цени и 2–3 опции за клиники според вашия случай' }
            ].map((step, index) => (
              <div 
                key={step.n} 
                className="text-center animate-fade-in-up" 
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="icon-hover w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.n}
                </div>
                <h3 className="font-medium text-slate-900 mb-2">{step.t}</h3>
                <p className="text-sm text-slate-500">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* City Selection */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4">
              Или изберете по град
            </h2>
            <p className="text-slate-500">
              Вижте налични клиники и специалисти във вашия град
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {cityList.map((city, index) => (
              <Link
                key={city.slug}
                href={`/${city.slug}/orthodontics`}
                className="city-card group bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`city-${city.slug}`}
              >
                <div className="city-icon w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-medium text-slate-900">{city.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-sky-500 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span>Разгледай</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Statements */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
              Защо да изберете Zubite
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Персонализирани препоръки', text: 'Препоръки според вашия случай — не според реклама.' },
              { title: 'Прозрачни цени', text: 'Ориентировъчни цени преди да говорите с клиника.' },
              { title: 'Ясен път напред', text: 'По-ясен път: симптом → лечение → опции за клиники.' }
            ].map((item, index) => (
              <div 
                key={index} 
                className="bg-slate-50 rounded-2xl border border-slate-100 p-6 animate-fade-in-up" 
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 mb-4">{item.text}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-medium">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-slate-900 font-medium">{item.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl p-10 md:p-12 text-center text-white">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Готови ли сте да започнете?
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto">
              Изберете вашето лечение и направете първата стъпка към перфектната усмивка
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/orthodontics"
                className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-white text-sky-600 font-medium hover:bg-sky-50"
                data-testid="cta-ortho"
              >
                <CheckCircle className="w-5 h-5" />
                Ортодонтия
              </Link>
              <Link
                href="/implants"
                className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border-2 border-white/30 text-white font-medium hover:bg-white/10 transition-colors"
                data-testid="cta-implants"
              >
                <CheckCircle className="w-5 h-5" />
                Зъбни импланти
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
