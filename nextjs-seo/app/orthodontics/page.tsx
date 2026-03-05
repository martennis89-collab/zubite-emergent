import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, MapPin, Clock, Shield, Users, Award, ChevronDown, Smile } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

const treatment = TREATMENTS.orthodontics

export const metadata: Metadata = {
  title: `${treatment.fullName} | Брекети и Алайнери | Zubite.bg`,
  description: `${treatment.description}. Научете за ортодонтско лечение в България - цени, методи, продължителност. Invisalign, метални и керамични брекети.`,
  alternates: {
    canonical: 'https://zubite.bg/orthodontics',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/orthodontics',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    images: [treatment.ogImage],
  },
}

const BENEFITS = [
  { title: 'Почти невидими', description: 'Прозрачните шини са практически невидими - мнозина няма да забележат, че носите ортодонтски апарат.' },
  { title: 'Сваляеми', description: 'Можете да ги свалите за хранене, миене на зъби и специални поводи.' },
  { title: 'Комфортни', description: 'Без метални скоби и телове, които могат да дразнят устата.' },
  { title: 'Предвидими резултати', description: '3D симулация показва очаквания резултат още преди започване на лечението.' }
]

const PROCESS = [
  { step: 1, title: 'Консултация', description: 'Преглед и 3D сканиране на зъбите ви. Обсъждане на целите и очакванията.' },
  { step: 2, title: 'Индивидуален план', description: 'Създаване на персонализиран план за лечение с виртуална симулация на резултата.' },
  { step: 3, title: 'Изработка на апарата', description: 'Производство на вашите индивидуални шини или поставяне на брекети.' },
  { step: 4, title: 'Лечение', description: 'Редовни прегледи за проследяване на напредъка и корекции.' },
  { step: 5, title: 'Завършване', description: 'Ретейнер за поддържане на резултата и проследяващи прегледи.' }
]

const IDEAL_FOR = [
  'Възрастни и тийнейджъри, които искат дискретно лечение',
  'Хора с леки до умерени ортодонтски проблеми',
  'Тези, които искат да избегнат традиционните брекети',
  'Активни хора, спортисти',
  'Професионалисти, които се срещат с клиенти'
]

const FAQS = [
  { q: 'Колко време трае лечението?', a: 'Обикновено между 6 и 24 месеца, в зависимост от сложността на случая. Леките корекции могат да се завършат за 6-12 месеца.' },
  { q: 'Болезнено ли е?', a: 'Може да усетите лек натиск в първите дни на всяка нова шина или след затягане на брекетите, но това е знак, че лечението работи.' },
  { q: 'Колко часа на ден трябва да нося алайнерите?', a: 'Препоръчително е 20-22 часа на ден за оптимални резултати. Свалете ги само за хранене и миене на зъби.' },
  { q: 'Invisalign или брекети - кое е по-добре?', a: 'И двете опции са ефективни. Invisalign е по-дискретен и удобен, но брекетите са по-подходящи за сложни случаи. Ортодонтът ще препоръча най-добрия вариант за вас.' },
  { q: 'Предлагат ли се разсрочени плащания?', a: 'Да, повечето клиники предлагат разсрочено плащане на 6, 12 или 24 месеца.' }
]

const STATS = [
  { value: '12M+', label: 'Пациенти по света' },
  { value: '99%', label: 'Удовлетвореност' },
  { value: '50%', label: 'По-бързо от очакваното' }
]

export default function OrthodonticsPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Ортодонтия', url: 'https://zubite.bg/orthodontics' }
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
              <Smile className="w-10 h-10 text-sky-600" />
            </div>
            
            <div className="flex-1">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-2">
                {treatment.fullName}
              </h1>
              <p className="text-lg text-sky-600 font-medium mb-4">Алайнери, брекети и изправяне на зъби</p>
              <p className="text-slate-600 leading-relaxed">
                Ортодонтското лечение използва различни методи за постепенно преместване на зъбите в желаната позиция. 
                Изберете между прозрачни алайнери като Invisalign или традиционни брекети в зависимост от вашите нужди.
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
              href="/sofia/orthodontics"
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="cta-sofia"
            >
              <MapPin className="w-5 h-5" />
              Клиники в София
            </Link>
            <Link
              href="#methods"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              Методи и цени
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
            Процес на лечение
          </h2>
          
          <div className="relative">
            {/* Timeline line - desktop only */}
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-sky-200" />
            
            <div className="space-y-6">
              {PROCESS.map((step, index) => (
                <div 
                  key={index}
                  className="relative flex gap-6"
                >
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

      {/* Methods & Pricing */}
      <section id="methods" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Методи и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {[
              { name: 'Invisalign / Прозрачни алайнери', desc: 'Невидими, свалящи се, комфортни', price: '4,000 - 8,000 лв' },
              { name: 'Керамични брекети', desc: 'Дискретни, фиксирани, ефективни', price: '3,000 - 5,000 лв' },
              { name: 'Метални брекети', desc: 'Класически, надеждни, достъпни', price: '2,000 - 3,500 лв' },
              { name: 'Лингвални брекети', desc: 'Поставени отвътре, напълно невидими', price: '5,000 - 10,000 лв' }
            ].map((method, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-slate-900 text-lg">{method.name}</h3>
                  <p className="text-slate-500">{method.desc}</p>
                </div>
                <div className="text-sky-600 font-semibold whitespace-nowrap">
                  {method.price}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 text-center mt-6">
            * Цените са ориентировъчни и варират според клиниката и сложността на случая
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
                Това лечение е идеално за:
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
                href={`/${city.slug}/orthodontics`}
                className="city-card group bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 text-center"
                data-testid={`city-${city.slug}`}
              >
                <div className="city-icon w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-medium text-slate-900">{city.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Ортодонтия в {city.name}</p>
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
              Готови ли сте за идеалната усмивка?
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto">
              Преминете през нашата кратка оценка, за да разберете кой метод е подходящ за вас.
            </p>
            <Link 
              href="/sofia/orthodontics"
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
