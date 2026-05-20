import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { FAQAccordion } from '@/components/FAQAccordion'
import { CheckCircle, ArrowRight, MapPin, CreditCard, Clock, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Invisalign Цена България 2025 | Колко Струва Invisalign? | Zubite.bg',
  description: 'Актуални цени на Invisalign в България 2025. Сравнение на Invisalign Full, Lite и Go. Разсрочено плащане. Цени по градове - София, Пловдив, Варна.',
  keywords: 'Invisalign цена, Invisalign цена България, колко струва Invisalign, Invisalign София цена, алайнери цена',
  alternates: {
    canonical: 'https://zubite.bg/invisalign-price',
  },
  openGraph: {
    title: 'Invisalign Цена България 2025 | Zubite.bg',
    description: 'Актуални цени на Invisalign в България. Сравнение на варианти и разсрочено плащане.',
    url: 'https://zubite.bg/invisalign-price',
  },
}

const PRICE_TIERS = [
  {
    name: 'Invisalign Lite',
    description: 'По-леки случаи с ограничен брой движения',
    priceRange: '€1 500 – €2 500',
    duration: '6-9 месеца',
    ideal: 'Леки козметични корекции',
    features: ['до ~14 двойки алайнери', 'кратък план', 'ограничени refinements']
  },
  {
    name: 'Invisalign Moderate',
    description: 'Средни случаи с повече движения и по-дълъг план',
    priceRange: '€2 500 – €3 500',
    duration: '9-15 месеца',
    ideal: 'Умерена сложност',
    features: ['до ~26 двойки алайнери', 'attachments + IPR при нужда', 'умерена сложност']
  },
  {
    name: 'Invisalign Comprehensive',
    description: 'Цялостно лечение и пълен контрол при сложни случаи',
    priceRange: '€3 500 – €5 000',
    duration: '12-24 месеца',
    ideal: 'Сложни ортодонтски случаи',
    features: ['неограничени алайнери в срок', 'включени refinements', 'комбинирани механики'],
    highlighted: true
  }
]

const CITY_PRICES = [
  { city: 'София', slug: 'sofia', range: '€2 300 – €4 100', note: 'Най-широк избор на клиники' },
  { city: 'Пловдив', slug: 'plovdiv', range: '€2 050 – €3 580', note: 'Добро съотношение цена-качество' },
  { city: 'Варна', slug: 'varna', range: '€2 050 – €3 325', note: 'Конкурентни цени' }
]

const WHATS_INCLUDED = [
  'Първоначална консултация и 3D сканиране',
  'Индивидуален план за лечение',
  'Всички шини за целия период',
  'Редовни контролни прегледи',
  'Ретейнер за след лечението',
  'Гаранция за резултата'
]

const FAQS = [
  { 
    q: 'Защо Invisalign е по-скъп от другите алайнери?', 
    a: 'Invisalign използва патентована SmartTrack технология и софтуер за планиране, разработвани над 25 години. Освен това, имате неограничени шини при Full пакета и световна гаранция.' 
  },
  { 
    q: 'Има ли разсрочено плащане за Invisalign?', 
    a: 'Да, почти всички клиники предлагат разсрочено плащане на 6, 12 или 24 месеца. Първоначалната вноска обикновено е 30-50% от цената.' 
  },
  { 
    q: 'Включени ли са ретейнерите в цената?', 
    a: 'В повечето клиники ретейнерите са включени в цената. Винаги уточнявайте това предварително.' 
  },
  { 
    q: 'Колко струва Invisalign за един зъб?', 
    a: 'Invisalign не се предлага за отделни зъби - лечението винаги включва цялата зъбна дъга. За минимални корекции вижте Invisalign Go.' 
  },
  { 
    q: 'Мога ли да намеря по-евтин Invisalign?', 
    a: 'Внимавайте с много ниски цени - може да са за по-стари версии или да не включват всички етапи на лечението. Винаги питайте какво точно е включено.' 
  }
]

export default function InvisalignPricePage() {
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
            Invisalign Цена България
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Пълен преглед на цените на Invisalign в България. Сравнете варианти, научете какво е включено и 
            намерете най-добрата оферта за вашия случай.
          </p>
          
          {/* Quick price summary */}
          <div className="bg-teal-50 rounded-2xl border border-teal-200 p-6 inline-block">
            <p className="text-sm text-teal-600 mb-1">Цени от</p>
            <p className="text-4xl font-bold text-teal-700">€1 500 – €5 000</p>
            <p className="text-sm text-slate-500 mt-2">В зависимост от варианта и клиниката</p>
          </div>
        </div>
      </section>

      {/* Price Tiers */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Варианти и цени
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {PRICE_TIERS.map((tier, index) => (
              <div 
                key={index} 
                className={`rounded-2xl border-2 p-6 ${
                  tier.highlighted 
                    ? 'border-teal-500 bg-teal-50' 
                    : 'border-slate-200 bg-white'
                }`}
              >
                {tier.highlighted && (
                  <div className="bg-teal-500 text-white text-xs font-medium px-3 py-1 rounded-full inline-block mb-4">
                    Най-популярен
                  </div>
                )}
                <h3 className="font-medium text-xl text-slate-900 mb-2">{tier.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{tier.description}</p>
                <div className="text-3xl font-bold text-teal-600 mb-2">{tier.priceRange}</div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                  <Clock className="w-4 h-4" />
                  <span>{tier.duration}</span>
                </div>
                
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Подходящ за: {tier.ideal}</p>
                  <ul className="space-y-2">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-teal-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Какво е включено в цената?
          </h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="grid md:grid-cols-2 gap-4">
              {WHATS_INCLUDED.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Prices by City */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Цени по градове
          </h2>
          
          <div className="space-y-4">
            {CITY_PRICES.map((city, index) => (
              <Link 
                key={index}
                href={`/${city.slug}/orthodontics`}
                className="block bg-slate-50 rounded-xl border border-slate-200 p-6 hover:border-teal-300 transition-colors"
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
                  <div className="text-xl font-bold text-teal-600">
                    {city.range}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Options */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Опции за плащане
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <CreditCard className="w-8 h-8 text-teal-500 mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Разсрочено плащане</h3>
              <p className="text-sm text-slate-500">6, 12 или 24 месечни вноски без лихва в повечето клиники</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <Award className="w-8 h-8 text-teal-500 mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Отстъпка при еднократно плащане</h3>
              <p className="text-sm text-slate-500">До 10% отстъпка при плащане на цялата сума предварително</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <Clock className="w-8 h-8 text-teal-500 mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Плащане по етапи</h3>
              <p className="text-sm text-slate-500">Някои клиники предлагат плащане на всеки етап от лечението</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
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
              href="/orthodontics/quiz"
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
