import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { FAQAccordion } from '@/components/FAQAccordion'
import { CheckCircle, ArrowRight, MapPin, Shield, Clock, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Зъбни Импланти Цена България 2025 | Колко Струва Имплант? | Zubite.bg',
  description: 'Актуални цени на зъбни импланти в България 2025. Единични импланти, All-on-4, All-on-6. Цени по градове и марки - Straumann, Nobel Biocare, Osstem.',
  keywords: 'зъбни импланти цена, имплант цена, колко струва зъбен имплант, импланти цяла челюст цена, All on 4 импланти, импланти София',
  alternates: {
    canonical: 'https://zubite.bg/implant-price',
  },
  openGraph: {
    title: 'Зъбни Импланти Цена България 2025 | Zubite.bg',
    description: 'Актуални цени на зъбни импланти в България. Единични импланти и цяла челюст.',
    url: 'https://zubite.bg/implant-price',
  },
}

const SINGLE_IMPLANT_PRICES = [
  { brand: 'Osstem (Корея)', price: '800 - 1,200 лв', note: 'Добро съотношение цена-качество' },
  { brand: 'MIS (Израел)', price: '900 - 1,300 лв', note: 'Популярен избор в България' },
  { brand: 'Straumann (Швейцария)', price: '1,400 - 1,800 лв', note: 'Премиум качество', premium: true },
  { brand: 'Nobel Biocare (Швеция)', price: '1,500 - 2,000 лв', note: 'Световен лидер', premium: true }
]

const FULL_SOLUTIONS = [
  { name: 'Единичен имплант + коронка', description: 'Пълно решение за 1 липсващ зъб', price: '1,500 - 3,500 лв' },
  { name: 'Мост върху 2 импланта', description: 'За 3-4 съседни липсващи зъби', price: '3,500 - 6,000 лв' },
  { name: 'All-on-4', description: 'Пълна челюст върху 4 импланта', price: '8,000 - 15,000 лв', popular: true },
  { name: 'All-on-6', description: 'Пълна челюст върху 6 импланта', price: '10,000 - 20,000 лв' }
]

const CITY_PRICES = [
  { city: 'София', slug: 'sofia', range: '1,500 - 20,000 лв', note: 'Най-широк избор на специалисти' },
  { city: 'Пловдив', slug: 'plovdiv', range: '1,300 - 18,000 лв', note: 'Отлични цени за качеството' },
  { city: 'Варна', slug: 'varna', range: '1,200 - 16,000 лв', note: 'Популярна дестинация за дентален туризъм' }
]

const WHATS_INCLUDED = [
  'Консултация и диагностика (CBCT)',
  'Титанов имплант',
  'Хирургична процедура',
  'Анестезия и медикаменти',
  'Контролни прегледи',
  'Абатмент (свързващ елемент)'
]

const NOT_INCLUDED = [
  'Коронка/протеза (отделна цена)',
  'Костна аугментация (ако е нужна)',
  'Синус лифт (при горна челюст)'
]

const FAQS = [
  { q: 'Колко струва един зъбен имплант с коронката?', a: 'Пълната цена за имплант + коронка е между 1,500 и 3,500 лв в зависимост от марката на импланта и материала на коронката (метало-керамика или циркон).' },
  { q: 'Защо цените на имплантите варират толкова много?', a: 'Цената зависи от марката на импланта (Osstem е по-евтин от Straumann), сложността на случая, нуждата от допълнителни процедури и локацията на клиниката.' },
  { q: 'Какво е All-on-4 и защо струва толкова?', a: 'All-on-4 е решение за пълна челюст с 4 импланта и фиксирана протеза. Цената включва хирургия, 4 импланта и временна протеза. Постоянната протеза е допълнителна.' },
  { q: 'Има ли разсрочено плащане за импланти?', a: 'Да, повечето клиники предлагат разсрочено плащане на 6-24 месеца. Първоначалната вноска е обикновено 30-50%.' },
  { q: 'Коя марка импланти да избера?', a: 'За стандартни случаи Osstem или MIS са отличен избор. При по-сложни случаи или ако искате максимална гаранция, изберете Straumann или Nobel Biocare.' }
]

export default function ImplantPricePage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-teal-500 font-medium text-sm tracking-wide uppercase mb-4">
            Актуализирано 2025
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6">
            Зъбни Импланти Цена България
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Пълен ценови гид за зъбни импланти в България 2025. Сравнете марки, научете какво е включено 
            и намерете най-добрата оферта.
          </p>
          
          <div className="bg-teal-50 rounded-2xl border border-teal-200 p-6 inline-block">
            <p className="text-sm text-teal-600 mb-1">Цени от</p>
            <p className="text-4xl font-bold text-teal-700">800 - 20,000 лв</p>
            <p className="text-sm text-slate-500 mt-2">От единичен имплант до пълна челюст</p>
          </div>
        </div>
      </section>

      {/* Single Implant Prices */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Цени по марки (само имплант)
          </h2>
          
          <div className="space-y-4">
            {SINGLE_IMPLANT_PRICES.map((item, index) => (
              <div 
                key={index} 
                className={`rounded-xl border-2 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  item.premium ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{item.brand}</h3>
                    {item.premium && (
                      <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full">Премиум</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{item.note}</p>
                </div>
                <div className="text-xl font-bold text-teal-600">{item.price}</div>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-slate-400 text-center mt-6">
            * Цените са само за импланта. Коронката се заплаща отделно (400-1,200 лв).
          </p>
        </div>
      </section>

      {/* Full Solutions */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Пълни решения
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {FULL_SOLUTIONS.map((solution, index) => (
              <div 
                key={index} 
                className={`rounded-2xl border-2 p-6 ${
                  solution.popular ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'
                }`}
              >
                {solution.popular && (
                  <div className="bg-teal-500 text-white text-xs font-medium px-3 py-1 rounded-full inline-block mb-3">
                    Най-популярен
                  </div>
                )}
                <h3 className="font-medium text-lg text-slate-900 mb-1">{solution.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{solution.description}</p>
                <div className="text-2xl font-bold text-teal-600">{solution.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Какво е включено в цената?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
              <h3 className="font-medium text-emerald-700 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Обикновено включено
              </h3>
              <ul className="space-y-2">
                {WHATS_INCLUDED.map((item, i) => (
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
                Обикновено допълнително
              </h3>
              <ul className="space-y-2">
                {NOT_INCLUDED.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="text-amber-500 flex-shrink-0 mt-1">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-amber-700 mt-4">
                Винаги питайте клиниката какво точно включва офертата.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* City Prices */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Цени по градове
          </h2>
          
          <div className="space-y-4">
            {CITY_PRICES.map((city, index) => (
              <Link 
                key={index}
                href={`/${city.slug}/implants`}
                className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{city.city}</h3>
                      <p className="text-sm text-slate-500">{city.note}</p>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-teal-600">{city.range}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why prices vary */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Защо цените варират?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <Shield className="w-8 h-8 text-teal-500 mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Марка на импланта</h3>
              <p className="text-sm text-slate-500">Премиум марките (Straumann, Nobel) са 2-3 пъти по-скъпи от бюджетните.</p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <Award className="w-8 h-8 text-teal-500 mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Опит на хирурга</h3>
              <p className="text-sm text-slate-500">По-опитните специалисти и реномирани клиники имат по-високи цени.</p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <Clock className="w-8 h-8 text-teal-500 mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Сложност на случая</h3>
              <p className="text-sm text-slate-500">Нужда от костна аугментация или синус лифт увеличава цената.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Често задавани въпроси за цената
          </h2>
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Получете персонализирана оферта
            </h2>
            <p className="text-teal-100 mb-8 max-w-lg mx-auto">
              Направете безплатна оценка и разберете каква е точната цена за вашия случай.
            </p>
            <Link 
              href="/implants/quiz"
              className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-white text-teal-600 font-medium hover:bg-teal-50"
            >
              Безплатна оценка
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
