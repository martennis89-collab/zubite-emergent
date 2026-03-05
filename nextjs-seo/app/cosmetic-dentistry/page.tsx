import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, MapPin, Users, Award, Heart } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

const treatment = TREATMENTS['cosmetic-dentistry']

export const metadata: Metadata = {
  title: `${treatment.fullName} | Фасети, Избелване | Zubite.bg`,
  description: `${treatment.description}. Избелване, порцеланови фасети, бондинг, Hollywood Smile. Трансформирайте усмивката си.`,
  alternates: {
    canonical: 'https://zubite.bg/cosmetic-dentistry',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/cosmetic-dentistry',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

const BENEFITS = [
  { title: 'Минимално инвазивно', description: 'Запазва се максимално количество от естествената зъбна структура.' },
  { title: 'Бързи резултати', description: 'Много процедури се извършват в едно посещение.' },
  { title: 'Естествен вид', description: 'Материалите са подбрани да съответстват на цвета на вашите зъби.' },
  { title: 'Достъпно', description: 'По-икономична алтернатива на коронките за естетични корекции.' }
]

const PROCESS = [
  { step: 1, title: 'Консултация', description: 'Обсъждане на вашите цели и очаквания за усмивката.' },
  { step: 2, title: 'Планиране', description: 'Определяне на оптималния подход и дигитална визуализация.' },
  { step: 3, title: 'Подготовка', description: 'Минимална подготовка на зъбната повърхност.' },
  { step: 4, title: 'Нанасяне', description: 'Прецизно нанасяне и оформяне на материала или фасетите.' },
  { step: 5, title: 'Финализиране', description: 'Полиране и проверка на захапката.' }
]

const IDEAL_FOR = [
  'Корекция на малки пукнатини или счупвания',
  'Затваряне на малки разстояния между зъбите',
  'Подобряване на формата на зъбите',
  'Удължаване на къси зъби',
  'Корекция на дисколорации'
]

const FAQS = [
  { q: 'Колко дълго трае бондингът?', a: 'При правилна грижа, бондингът може да издържи 5-10 години.' },
  { q: 'Болезнена ли е процедурата?', a: 'Не, повечето естетични процедури са безболезнени и не изискват упойка.' },
  { q: 'Мога ли да ям нормално след това?', a: 'Да, но избягвайте твърди храни в първите 24 часа при бондинг.' },
  { q: 'Колко издържат фасетите?', a: 'При правилна грижа порцелановите фасети издържат 10-15 години или повече.' },
  { q: 'Какво е Hollywood Smile?', a: 'Пълна трансформация на усмивката с фасети или коронки на всички видими зъби, за ослепителен ефект.' }
]

const STATS = [
  { value: '1-2', label: 'Часа на процедура' },
  { value: '10-15', label: 'Години издръжливост' },
  { value: '100%', label: 'Безболезнено' }
]

export default function CosmeticDentistryPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Естетична стоматология', url: 'https://zubite.bg/cosmetic-dentistry' }
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
              <Heart className="w-10 h-10 text-sky-600" />
            </div>
            
            <div className="flex-1">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-2">
                {treatment.fullName}
              </h1>
              <p className="text-lg text-sky-600 font-medium mb-4">Избелване, фасети, бондинг и усмивка мечта</p>
              <p className="text-slate-600 leading-relaxed">
                Естетичните корекции на усмивката включват процедури като бондинг, фасети и избелване. 
                Тези минимално инвазивни техники могат значително да подобрят външния вид на вашата усмивка.
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
              href="/sofia/cosmetic-dentistry"
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="cta-sofia"
            >
              <MapPin className="w-5 h-5" />
              Клиники в София
            </Link>
            <Link
              href="#services"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              Услуги и цени
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Предимства
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFITS.map((benefit, index) => (
              <div 
                key={index}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-200 card-hover-subtle"
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
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Процес
          </h2>
          
          <div className="relative">
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-sky-200" />
            
            <div className="space-y-6">
              {PROCESS.map((step, index) => (
                <div key={index} className="relative flex gap-6">
                  <div className="hidden md:flex w-16 h-16 rounded-full bg-sky-500 text-white items-center justify-center text-xl font-bold flex-shrink-0 z-10">
                    {step.step}
                  </div>
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 card-hover-subtle">
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

      {/* Services & Pricing */}
      <section id="services" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Услуги и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {[
              { name: 'Професионално избелване', desc: 'Бързи резултати в клиника', price: '200 - 500 лв' },
              { name: 'Порцеланови фасети', desc: 'Трайна промяна на усмивката', price: '400 - 1,200 лв/зъб' },
              { name: 'Композитен бондинг', desc: 'Бърза корекция на форма', price: '150 - 400 лв/зъб' },
              { name: 'Hollywood Smile', desc: 'Пълна трансформация', price: '8,000 - 20,000 лв' }
            ].map((service, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-slate-900 text-lg">{service.name}</h3>
                  <p className="text-slate-500">{service.desc}</p>
                </div>
                <div className="text-sky-600 font-semibold whitespace-nowrap">
                  {service.price}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 text-center mt-6">
            * Цените са ориентировъчни и варират според клиниката
          </p>
        </div>
      </section>

      {/* Ideal For Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Подходящо за
          </h2>
          
          <div className="bg-sky-50 rounded-2xl border border-sky-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-sky-600" />
              <span className="font-medium text-slate-900">
                Тези процедури са идеални за:
              </span>
            </div>
            <ul className="space-y-3">
              {IDEAL_FOR.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* City Links */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Намерете клиника по град
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(CITIES).map((city) => (
              <Link
                key={city.slug}
                href={`/${city.slug}/cosmetic-dentistry`}
                className="city-card group bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 text-center"
                data-testid={`city-${city.slug}`}
              >
                <div className="city-icon w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-medium text-slate-900">{city.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Естетика в {city.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
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
              Подобрете усмивката си днес
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto">
              Преминете през нашата кратка оценка, за да разберете кои естетични процедури са подходящи за вас.
            </p>
            <Link 
              href="/sofia/cosmetic-dentistry"
              className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-sky-600 font-medium hover:bg-sky-50"
              data-testid="start-quiz-cta"
            >
              Започнете оценката
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
