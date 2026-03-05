import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, MapPin, Users, Award, Moon } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

const treatment = TREATMENTS['sleep-airway']

export const metadata: Metadata = {
  title: `${treatment.fullName} | Дентални решения | Zubite.bg`,
  description: `${treatment.description}. Орални апарати за сънна апнея и хъркане. Алтернатива на CPAP.`,
  alternates: {
    canonical: 'https://zubite.bg/sleep-airway',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/sleep-airway',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

const BENEFITS = [
  { title: 'Алтернатива на CPAP', description: 'По-комфортно решение за много пациенти със сънна апнея.' },
  { title: 'Преносимо', description: 'Лесно за пътуване, не изисква електричество.' },
  { title: 'Безшумно', description: 'Без шум от машина, по-добър сън за партньора.' },
  { title: 'Ефективно', description: 'Доказана ефективност при лека до умерена апнея.' }
]

const PROCESS = [
  { step: 1, title: 'Консултация', description: 'Преглед и обсъждане на симптомите и историята на съня.' },
  { step: 2, title: 'Диагностика', description: 'Сънен тест (полисомнография или домашен тест) за диагноза.' },
  { step: 3, title: 'Отпечатък', description: 'Вземане на отпечатъци за изработка на индивидуален апарат.' },
  { step: 4, title: 'Изработка', description: 'Производство на персонализирано устройство.' },
  { step: 5, title: 'Настройка', description: 'Поставяне, настройка и инструкции за използване.' }
]

const SYMPTOMS = [
  'Хъркане',
  'Прекъсвания на дишането по време на сън',
  'Сънливост през деня',
  'Главоболие сутрин',
  'Суха уста при събуждане'
]

const FAQS = [
  { q: 'Какви дентални решения има за хъркане?', a: 'Предлагат се индивидуални орални апарати, които позиционират долната челюст напред и отварят дихателните пътища.' },
  { q: 'Ефективни ли са денталните решения за апнея?', a: 'Да, оралните апарати са доказано ефективни при лека до умерена сънна апнея и са призната алтернатива на CPAP.' },
  { q: 'Трябва ли ми направление от лекар?', a: 'Препоръчително е първо да се консултирате с лекар специалист по съня за диагностика и да получите резултати от сънен тест.' },
  { q: 'Колко време отнема привикването?', a: 'Повечето пациенти свикват за 1-2 седмици. В началото може да има лек дискомфорт в челюстта.' },
  { q: 'Колко бързо ще видя резултат?', a: 'Повечето пациенти забелязват подобрение в хъркането и качеството на съня от първата нощ.' }
]

const STATS = [
  { value: '80%', label: 'Намаление на хъркане' },
  { value: '1-2', label: 'Седмици адаптация' },
  { value: '5+', label: 'Години издръжливост' }
]

export default function SleepAirwayPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Сънна апнея', url: 'https://zubite.bg/sleep-airway' }
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
              <Moon className="w-10 h-10 text-sky-600" />
            </div>
            
            <div className="flex-1">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-2">
                {treatment.fullName}
              </h1>
              <p className="text-lg text-sky-600 font-medium mb-4">Дентални решения за хъркане и апнея</p>
              <p className="text-slate-600 leading-relaxed">
                Оралните апарати са ефективна алтернатива на CPAP за лечение на хъркане и лека до умерена сънна апнея. 
                Индивидуално изработените устройства позиционират челюстта напред и отварят дихателните пътища.
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
              href="/sleep-airway/quiz"
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="cta-quiz"
            >
              <Moon className="w-5 h-5" />
              Направете безплатна оценка
            </Link>
            <Link
              href="#solutions"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              Решения и цени
            </Link>
          </div>
        </div>
      </section>

      {/* Symptoms Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Симптоми, които можем да адресираме
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
            Предимства на оралните апарати
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

      {/* Solutions & Pricing */}
      <section id="solutions" className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Дентални решения и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {[
              { name: 'Mandibular Advancement Device (MAD)', desc: 'Най-често използван тип апарат', price: '800 - 2,000 лв' },
              { name: 'Tongue Retaining Device', desc: 'За специфични случаи', price: '600 - 1,500 лв' },
              { name: 'Комбинирана терапия', desc: 'MAD + допълнителни мерки', price: '1,000 - 2,500 лв' }
            ].map((solution, index) => (
              <div key={index} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-slate-900 text-lg">{solution.name}</h3>
                  <p className="text-slate-500">{solution.desc}</p>
                </div>
                <div className="text-sky-600 font-semibold whitespace-nowrap">
                  {solution.price}
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
                href={`/${city.slug}/sleep-airway`}
                className="city-card group bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 text-center"
                data-testid={`city-${city.slug}`}
              >
                <div className="city-icon w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-medium text-slate-900">{city.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Апнея лечение в {city.name}</p>
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
              Подобрете качеството на съня си
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto">
              Преминете през нашата кратка оценка, за да разберете дали оралните апарати са подходящи за вас.
            </p>
            <Link 
              href="/sleep-airway/quiz"
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
