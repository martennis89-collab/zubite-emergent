import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { FAQAccordion } from '@/components/FAQAccordion'
import { CheckCircle, XCircle, ArrowRight, Clock, Wallet, Eye, Smile, Wrench, Star, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Алайнери vs Брекети: Кое е по-добро? | Сравнение 2025 | Zubite.bg',
  description: 'Подробно сравнение между Invisalign/алайнери и брекети. Научете за цени, продължителност, комфорт и резултати. Кой метод е подходящ за вас?',
  keywords: 'алайнери vs брекети, Invisalign или брекети, алайнери или брекети, сравнение ортодонтия, най добрите алайнери',
  alternates: {
    canonical: 'https://zubite.bg/aligners-vs-braces',
  },
  openGraph: {
    title: 'Алайнери vs Брекети: Пълно сравнение | Zubite.bg',
    description: 'Коя ортодонтска система е по-добра за вас? Сравняваме Invisalign, алайнери и брекети по всички критерии.',
    url: 'https://zubite.bg/aligners-vs-braces',
  },
}

const COMPARISON_DATA = [
  { 
    feature: 'Видимост', 
    aligners: 'Почти невидими', 
    braces: 'Видими (метални/керамични)', 
    winner: 'aligners',
    alignersIcon: <Eye className="w-5 h-5" />,
    bracesIcon: <Eye className="w-5 h-5" />
  },
  { 
    feature: 'Комфорт', 
    aligners: 'Много комфортни, без остри ръбове', 
    braces: 'Може да дразнят устата в началото', 
    winner: 'aligners',
    alignersIcon: <Smile className="w-5 h-5" />,
    bracesIcon: <Smile className="w-5 h-5" />
  },
  { 
    feature: 'Поддръжка', 
    aligners: 'Свалят се за хранене и миене', 
    braces: 'Изискват специална грижа', 
    winner: 'aligners',
    alignersIcon: <Wrench className="w-5 h-5" />,
    bracesIcon: <Wrench className="w-5 h-5" />
  },
  { 
    feature: 'Ефективност при сложни случаи', 
    aligners: 'Ограничени възможности', 
    braces: 'Отлични за всички случаи', 
    winner: 'braces',
    alignersIcon: <Star className="w-5 h-5" />,
    bracesIcon: <Star className="w-5 h-5" />
  },
  { 
    feature: 'Продължителност', 
    aligners: '6-18 месеца', 
    braces: '12-36 месеца', 
    winner: 'aligners',
    alignersIcon: <Clock className="w-5 h-5" />,
    bracesIcon: <Clock className="w-5 h-5" />
  },
  { 
    feature: 'Цена', 
    aligners: '4,000 - 8,000 лв', 
    braces: '2,000 - 5,000 лв', 
    winner: 'braces',
    alignersIcon: <Wallet className="w-5 h-5" />,
    bracesIcon: <Wallet className="w-5 h-5" />
  },
]

const ALIGNERS_PROS = [
  'Почти невидими при носене',
  'Могат да се свалят за хранене',
  'По-лесна хигиена на зъбите',
  'По-малко посещения при ортодонта',
  'Без ограничения в храната',
  'По-бързи резултати при леки случаи'
]

const ALIGNERS_CONS = [
  'По-скъпи от традиционните брекети',
  'Изискват дисциплина (20-22ч носене)',
  'Не са подходящи за тежки случаи',
  'Могат да се загубят'
]

const BRACES_PROS = [
  'Ефективни при всички видове проблеми',
  'По-ниска начална цена',
  'Работят 24/7 без нужда от дисциплина',
  'По-предвидими резултати при сложни случаи',
  'Различни естетични опции (керамични, лингвални)'
]

const BRACES_CONS = [
  'Видими при усмивка',
  'Ограничения в храната',
  'По-трудна хигиена',
  'Може да причинят дискомфорт'
]

const FAQS = [
  { 
    q: 'Коя система е по-бърза - алайнери или брекети?', 
    a: 'При леки до умерени случаи, алайнерите обикновено са по-бързи (6-18 месеца). При сложни случаи, брекетите може да дадат по-предвидими резултати за 18-24 месеца.' 
  },
  { 
    q: 'Мога ли да си позволя алайнери?', 
    a: 'Алайнерите струват между 4,000-8,000 лв в България. Повечето клиники предлагат разсрочено плащане на 12-24 месеца, което ги прави достъпни.' 
  },
  { 
    q: 'Болезнени ли са брекетите в сравнение с алайнерите?', 
    a: 'И двете системи причиняват лек дискомфорт в началото. Брекетите могат да дразнят бузите, докато алайнерите причиняват само натиск върху зъбите.' 
  },
  { 
    q: 'Мога ли да ям всичко с алайнери?', 
    a: 'Да! Тъй като алайнерите се свалят за хранене, няма ограничения. При брекетите трябва да избягвате твърди и лепкави храни.' 
  },
  { 
    q: 'Кое е по-добре за тийнейджъри?', 
    a: 'Зависи от дисциплината. Ако тийнейджърът е отговорен, алайнерите са отличен избор. В противен случай брекетите са по-надеждни, защото работят постоянно.' 
  }
]

export default function AlignersVsBracesPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sky-500 font-medium text-sm tracking-wide uppercase mb-4">
            Сравнение 2025
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6">
            Алайнери vs Брекети:<br />Кое е по-добре за вас?
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Пълно сравнение между Invisalign/прозрачни алайнери и традиционни брекети. 
            Научете за цени, продължителност, комфорт и кой метод е идеален за вашия случай.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/orthodontics"
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
            >
              Направи оценка
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-sky-50 rounded-2xl border border-sky-200 p-8">
            <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">
              Кратко резюме
            </h2>
            <p className="text-slate-600 mb-4">
              <strong>Изберете алайнери</strong> ако искате дискретно лечение, имате лек до умерен проблем и сте дисциплинирани да ги носите 20-22 часа на ден.
            </p>
            <p className="text-slate-600">
              <strong>Изберете брекети</strong> ако имате сложен случай, предпочитате по-ниска начална цена или не искате да се притеснявате дали носите апарата достатъчно.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Подробно сравнение
          </h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-4 font-medium text-slate-500">Критерий</div>
              <div className="p-4 font-medium text-sky-600 text-center">Алайнери</div>
              <div className="p-4 font-medium text-slate-700 text-center">Брекети</div>
            </div>
            
            {COMPARISON_DATA.map((item, index) => (
              <div key={index} className="grid grid-cols-3 border-b border-slate-100 last:border-0">
                <div className="p-4 font-medium text-slate-900">{item.feature}</div>
                <div className={`p-4 text-center ${item.winner === 'aligners' ? 'bg-sky-50 text-sky-700' : 'text-slate-600'}`}>
                  <div className="flex items-center justify-center gap-2">
                    {item.winner === 'aligners' && <CheckCircle className="w-4 h-4 text-sky-500" />}
                    <span className="text-sm">{item.aligners}</span>
                  </div>
                </div>
                <div className={`p-4 text-center ${item.winner === 'braces' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'}`}>
                  <div className="flex items-center justify-center gap-2">
                    {item.winner === 'braces' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    <span className="text-sm">{item.braces}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pros and Cons */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Предимства и недостатъци
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Aligners */}
            <div>
              <h3 className="font-medium text-lg text-sky-600 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-sky-600" />
                </div>
                Прозрачни алайнери
              </h3>
              
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 mb-4">
                <h4 className="font-medium text-emerald-700 mb-3">Предимства</h4>
                <ul className="space-y-2">
                  {ALIGNERS_PROS.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                      <span className="text-sm">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h4 className="font-medium text-red-700 mb-3">Недостатъци</h4>
                <ul className="space-y-2">
                  {ALIGNERS_CONS.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-700">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-1" />
                      <span className="text-sm">{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Braces */}
            <div>
              <h3 className="font-medium text-lg text-slate-700 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Smile className="w-4 h-4 text-slate-600" />
                </div>
                Традиционни брекети
              </h3>
              
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 mb-4">
                <h4 className="font-medium text-emerald-700 mb-3">Предимства</h4>
                <ul className="space-y-2">
                  {BRACES_PROS.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                      <span className="text-sm">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h4 className="font-medium text-red-700 mb-3">Недостатъци</h4>
                <ul className="space-y-2">
                  {BRACES_CONS.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-700">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-1" />
                      <span className="text-sm">{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Price Comparison */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Цени в България 2025
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-medium text-lg text-sky-600 mb-4">Прозрачни алайнери</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Invisalign Full</span>
                  <span className="font-medium text-slate-900">5,500 - 8,000 лв</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Invisalign Lite</span>
                  <span className="font-medium text-slate-900">4,000 - 5,500 лв</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Други марки алайнери</span>
                  <span className="font-medium text-slate-900">3,000 - 5,000 лв</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-medium text-lg text-slate-700 mb-4">Традиционни брекети</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Метални брекети</span>
                  <span className="font-medium text-slate-900">2,000 - 3,500 лв</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Керамични брекети</span>
                  <span className="font-medium text-slate-900">3,000 - 5,000 лв</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Лингвални брекети</span>
                  <span className="font-medium text-slate-900">5,000 - 10,000 лв</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-slate-400 text-center mt-6">
            * Цените са ориентировъчни и могат да варират според клиниката и сложността на случая
          </p>
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
              Не сте сигурни кое е по-добре за вас?
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto">
              Преминете нашата безплатна оценка и ще ви помогнем да определите кой метод е идеален за вашия случай.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/orthodontics/quiz"
                className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-white text-sky-600 font-medium hover:bg-sky-50"
              >
                Направи безплатна оценка
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Related Pages */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Свързани статии
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/what-is-invisalign" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 transition-colors">
              <h3 className="font-medium text-slate-900 mb-2">Какво е Invisalign?</h3>
              <p className="text-sm text-slate-500">Пълен гид за прозрачните алайнери</p>
            </Link>
            <Link href="/invisalign-price" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 transition-colors">
              <h3 className="font-medium text-slate-900 mb-2">Invisalign цена</h3>
              <p className="text-sm text-slate-500">Актуални цени в България 2025</p>
            </Link>
            <Link href="/orthodontics" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 transition-colors">
              <h3 className="font-medium text-slate-900 mb-2">Ортодонтия</h3>
              <p className="text-sm text-slate-500">Всичко за изправяне на зъби</p>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
