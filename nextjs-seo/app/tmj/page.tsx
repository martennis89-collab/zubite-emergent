import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, MapPin, Users, Award, Bone } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

const treatment = TREATMENTS.tmj

export const metadata: Metadata = {
  title: `${treatment.fullName} | Челюстни дисфункции | Zubite.bg`,
  description: `${treatment.description}. Диагностика и лечение на TMJ дисфункции - шини, терапия, облекчаване на болката.`,
  alternates: {
    canonical: 'https://zubite.bg/tmj',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/tmj',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

const SYMPTOMS = [
  'Болка в челюстта или лицето',
  'Щракане при отваряне на устата',
  'Главоболие и болки в шията',
  'Затруднено отваряне на устата',
  'Болка в ушите без инфекция',
  'Скърцане със зъби (бруксизъм)'
]

const BENEFITS = [
  { title: 'Облекчаване на болката', description: 'Намаляване на болката в челюстта, лицето и главата.' },
  { title: 'Възстановена функция', description: 'Нормално отваряне на устата и дъвчене без дискомфорт.' },
  { title: 'Защита на зъбите', description: 'Предотвратяване на износване от скърцане.' },
  { title: 'По-добър сън', description: 'Намаляване на нощното стискане и скърцане.' }
]

const PROCESS = [
  { step: 1, title: 'Диагностика', description: 'Клиничен преглед, история на симптомите, снимки.' },
  { step: 2, title: 'Анализ', description: 'Оценка на захапката и функцията на ставата.' },
  { step: 3, title: 'План', description: 'Определяне на подходящия тип лечение.' },
  { step: 4, title: 'Изработка на шина', description: 'Вземане на отпечатъци и производство на апарата.' },
  { step: 5, title: 'Проследяване', description: 'Корекции и мониторинг на напредъка.' }
]

const FAQS = [
  { q: 'Какви симптоми показват TMJ проблеми?', a: 'Типични симптоми са болка в челюстта, щракане при отваряне на устата, главоболие, болки в ушите и затруднено дъвчене.' },
  { q: 'Как се лекува TMJ дисфункция?', a: 'Лечението включва шини за нощно носене, физиотерапия, медикаменти и понякога ортодонтско лечение за корекция на захапката.' },
  { q: 'Колко време трае лечението?', a: 'Лечението обикновено продължава от 3 до 12 месеца в зависимост от тежестта на случая.' },
  { q: 'Може ли стресът да причини TMJ?', a: 'Да, стресът води до стискане на зъбите и напрежение в челюстните мускули, което е честа причина за TMJ проблеми.' },
  { q: 'Може ли TMJ да се излекува напълно?', a: 'При повечето пациенти симптомите значително намаляват или изчезват с правилно лечение.' }
]

const STATS = [
  { value: '85%', label: 'Подобрение на симптомите' },
  { value: '3-12', label: 'Месеца лечение' },
  { value: '90%', label: 'Удовлетвореност' }
]

export default function TMJPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'TMJ', url: 'https://zubite.bg/tmj' }
  ])

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-all duration-200 hover:-translate-x-1"
            data-testid="back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Всички лечения</span>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0 icon-hover">
              <Bone className="w-10 h-10 text-sky-600" />
            </div>
            
            <div className="flex-1">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-2">
                {treatment.fullName}
              </h1>
              <p className="text-lg text-sky-600 font-medium mb-4">Болка в челюстта, щракане, главоболие</p>
              <p className="text-slate-600 leading-relaxed">
                TMJ (темпоромандибуларната става) свързва долната челюст с черепа. 
                Дисфункцията на тази става може да причини болка, ограничено движение и други неприятни симптоми, 
                които могат да бъдат ефективно лекувани.
              </p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {STATS.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 text-center card-hover-subtle">
                <div className="text-2xl font-bold text-sky-600 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
          
          {/* Quick CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/tmj/quiz"
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="cta-quiz"
            >
              <Bone className="w-5 h-5" />
              Направете безплатна оценка
            </Link>
            <Link
              href="#treatments"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              Лечения и цени
            </Link>
          </div>
        </div>
      </section>

      {/* Symptoms Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Типични симптоми на TMJ дисфункция
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SYMPTOMS.map((symptom, index) => (
              <div 
                key={index}
                className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 text-sky-600 flex-shrink-0" />
                <span className="text-slate-700">{symptom}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Ползи от лечението
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFITS.map((benefit, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-6 border border-slate-200 card-hover-subtle"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-1">{benefit.title}</h3>
                    <p className="text-sm text-slate-500">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Процес на лечение
          </h2>
          
          <div className="relative">
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-sky-200" />
            
            <div className="space-y-6">
              {PROCESS.map((step, index) => (
                <div key={index} className="relative flex gap-6">
                  <div className="hidden md:flex w-16 h-16 rounded-full bg-sky-500 text-white items-center justify-center text-xl font-bold flex-shrink-0 z-10">
                    {step.step}
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-6 card-hover-subtle">
                    <div className="md:hidden w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center text-lg font-bold mb-3">
                      {step.step}
                    </div>
                    <h3 className="font-medium text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Treatments & Pricing */}
      <section id="treatments" className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Лечения и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {[
              { name: 'Оклузална шина (сплинт)', desc: 'Защита и релаксация на мускулите', price: '300 - 800 лв' },
              { name: 'Нощна шина', desc: 'Предотвратяване на скърцане', price: '200 - 500 лв' },
              { name: 'Комплексна TMJ терапия', desc: 'Диагностика + лечение + проследяване', price: '500 - 1,500 лв' },
              { name: 'Ортодонтска корекция', desc: 'При проблем със захапката', price: 'По индивидуален план' }
            ].map((t, index) => (
              <div key={index} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-slate-900 text-lg">{t.name}</h3>
                  <p className="text-slate-500">{t.desc}</p>
                </div>
                <div className="text-sky-600 font-semibold whitespace-nowrap">
                  {t.price}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 text-center mt-6">
            * Цените са ориентировъчни и варират според клиниката
          </p>
        </div>
      </section>

      {/* City Links */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Намерете специалист по град
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(CITIES).map((city) => (
              <Link
                key={city.slug}
                href={`/${city.slug}/tmj`}
                className="city-card group bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 text-center"
                data-testid={`city-${city.slug}`}
              >
                <div className="city-icon w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-medium text-slate-900">{city.name}</h3>
                <p className="text-sm text-slate-500 mt-1">TMJ лечение в {city.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Често задавани въпроси
          </h2>
          
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Облекчете болката днес
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto">
              Преминете през нашата кратка оценка, за да разберете кое лечение е подходящо за вас.
            </p>
            <Link 
              href="/tmj/quiz"
              className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-sky-600 font-medium hover:bg-sky-50"
              data-testid="start-quiz-cta"
            >
              Направете безплатна оценка
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
