import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { FAQAccordion } from '@/components/FAQAccordion'
import { CheckCircle, ArrowRight, Clock, Eye, Smile, Shield, Star } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Какво е Invisalign? | Пълен Гид за Прозрачни Алайнери | Zubite.bg',
  description: 'Научете всичко за Invisalign - как работи, за кого е подходящ, процес на лечение и резултати. Invisalign е водещата система за прозрачни алайнери в света.',
  keywords: 'какво е Invisalign, Invisalign, прозрачни алайнери, Invisalign процес, как работи Invisalign',
  alternates: {
    canonical: 'https://zubite.bg/what-is-invisalign',
  },
  openGraph: {
    title: 'Какво е Invisalign? | Пълен Гид | Zubite.bg',
    description: 'Научете всичко за Invisalign - водещата система за прозрачни алайнери в света.',
    url: 'https://zubite.bg/what-is-invisalign',
  },
}

const HOW_IT_WORKS = [
  { step: 1, title: '3D сканиране', description: 'Прецизно цифрово сканиране на вашите зъби без традиционни отпечатъци.' },
  { step: 2, title: 'Индивидуален план', description: 'Създаване на персонализиран план с визуализация на крайния резултат.' },
  { step: 3, title: 'Производство на шини', description: 'Изработка на серия прозрачни шини специално за вашите зъби.' },
  { step: 4, title: 'Смяна на шините', description: 'Смяна на шините на всеки 1-2 седмици за постепенно преместване.' },
  { step: 5, title: 'Ретенция', description: 'Носене на ретейнер за запазване на резултата.' }
]

const BENEFITS = [
  { icon: Eye, title: 'Почти невидими', description: 'Прозрачният материал е практически незабележим.' },
  { icon: Smile, title: 'Максимален комфорт', description: 'Гладки ръбове без дразнене на устата.' },
  { icon: Shield, title: 'Свалящи се', description: 'Махате ги за хранене, миене на зъби и специални поводи.' },
  { icon: Star, title: 'Предвидими резултати', description: '3D симулация показва резултата преди старт.' }
]

const IDEAL_FOR = [
  'Тълпене на зъби (crowding)',
  'Разстояния между зъбите (gaps)',
  'Кръстосана захапка',
  'Отворена захапка',
  'Дълбока захапка',
  'Изнесени зъби'
]

const NOT_IDEAL_FOR = [
  'Много тежки ортодонтски проблеми',
  'Значителни ротации на зъбите',
  'Вертикално изместване на зъби',
  'Някои случаи на скелетни аномалии'
]

const FAQS = [
  { q: 'Колко време трябва да нося Invisalign на ден?', a: 'Препоръчва се 20-22 часа на ден. Свалете ги само за хранене и миене на зъби.' },
  { q: 'Болезнен ли е Invisalign?', a: 'Може да усетите лек натиск в първите дни на всяка нова шина. Това е нормално и означава, че лечението работи.' },
  { q: 'Мога ли да ям и пия с Invisalign?', a: 'Вода - да. За всичко друго трябва да свалите шините, за да избегнете оцветяване и повреда.' },
  { q: 'Колко дълго трае лечението с Invisalign?', a: 'Обикновено 6-18 месеца в зависимост от сложността. Леките случаи се коригират за 6 месеца.' },
  { q: 'На каква възраст може да се прави Invisalign?', a: 'Invisalign е подходящ за тийнейджъри (13+) и възрастни. Има и специална версия Invisalign Teen.' }
]

export default function WhatIsInvisalignPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-sky-500 font-medium text-sm tracking-wide uppercase mb-4 text-center">
            Пълен гид
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6 text-center">
            Какво е Invisalign?
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8 text-center">
            Invisalign е водещата в света система за изправяне на зъби с прозрачни, свалящи се шини (алайнери). 
            Над 14 милиона души по света са постигнали усмивката на мечтите си с Invisalign.
          </p>
          
          <div className="bg-sky-50 rounded-2xl border border-sky-200 p-6 text-center max-w-lg mx-auto">
            <div className="text-4xl font-bold text-sky-700 mb-2">14M+</div>
            <p className="text-slate-600">пациенти по целия свят</p>
          </div>
        </div>
      </section>

      {/* What is Invisalign */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-6">
            Invisalign накратко
          </h2>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed mb-4">
              Invisalign е иновативна ортодонтска система, разработена от компанията Align Technology през 1997 г. 
              За разлика от традиционните метални брекети, Invisalign използва серия от прозрачни, персонализирани 
              пластмасови шини (алайнери), които постепенно преместват зъбите в желаната позиция.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              Всяка шина се носи около 1-2 седмици и премества зъбите с малки, контролирани движения. 
              Материалът SmartTrack е патентован от Invisalign и осигурява оптимален натиск и комфорт.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Днес Invisalign е златен стандарт в прозрачната ортодонтия, предлагайки дискретно и ефективно 
              решение за милиони хора по света.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Предимства на Invisalign
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {BENEFITS.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-6">
                <benefit.icon className="w-8 h-8 text-sky-500 mb-4" />
                <h3 className="font-medium text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-slate-500">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Как работи Invisalign?
          </h2>
          
          <div className="relative">
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-sky-200" />
            
            <div className="space-y-6">
              {HOW_IT_WORKS.map((step, index) => (
                <div key={index} className="relative flex gap-6">
                  <div className="hidden md:flex w-16 h-16 rounded-full bg-sky-500 text-white items-center justify-center text-xl font-bold flex-shrink-0 z-10">
                    {step.step}
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-6">
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

      {/* Who is it for */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            За кого е подходящ Invisalign?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
              <h3 className="font-medium text-emerald-700 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Подходящ за
              </h3>
              <ul className="space-y-2">
                {IDEAL_FOR.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
              <h3 className="font-medium text-amber-700 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Може да изисква допълнителна оценка
              </h3>
              <ul className="space-y-2">
                {NOT_IDEAL_FOR.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="text-amber-500 flex-shrink-0 mt-1">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-amber-700 mt-4">
                Дори при тези случаи, Invisalign може да помогне в комбинация с други методи.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Често задавани въпроси
          </h2>
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Подходящ ли е Invisalign за вас?
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto">
              Направете безплатна оценка и разберете дали Invisalign е правилният избор за вашата усмивка.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/orthodontics/quiz"
                className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-white text-sky-600 font-medium hover:bg-sky-50"
              >
                Безплатна оценка
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/invisalign-price"
                className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border-2 border-white/30 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Вижте цените
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Свързани статии
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/aligners-vs-braces" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 transition-colors">
              <h3 className="font-medium text-slate-900 mb-2">Алайнери vs Брекети</h3>
              <p className="text-sm text-slate-500">Подробно сравнение на двата метода</p>
            </Link>
            <Link href="/invisalign-price" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 transition-colors">
              <h3 className="font-medium text-slate-900 mb-2">Invisalign цена</h3>
              <p className="text-sm text-slate-500">Актуални цени в България 2025</p>
            </Link>
            <Link href="/orthodontics" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 transition-colors">
              <h3 className="font-medium text-slate-900 mb-2">Ортодонтия</h3>
              <p className="text-sm text-slate-500">Всички методи за изправяне на зъби</p>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
