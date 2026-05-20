import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { FAQAccordion } from '@/components/FAQAccordion'
import { CheckCircle, ArrowRight, AlertCircle, Clock, Smile, Eye, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Криви Зъби: Причини и Лечение | Как Се Изправят? | Zubite.bg',
  description: 'Научете защо зъбите стават криви и какви са методите за лечение. Invisalign, брекети, алайнери - кое е най-доброто за вас? Пълен гид за криви зъби.',
  keywords: 'криви зъби, криви зъби лечение, как се изправят криви зъби, изправяне на криви зъби, ортодонт криви зъби',
  alternates: {
    canonical: 'https://zubite.bg/crooked-teeth',
  },
  openGraph: {
    title: 'Криви Зъби: Причини и Лечение | Zubite.bg',
    description: 'Защо зъбите стават криви и как се лекуват? Научете за методите за изправяне на зъби.',
    url: 'https://zubite.bg/crooked-teeth',
  },
}

const CAUSES = [
  { title: 'Генетика', description: 'Размерът на челюстта и зъбите често се наследява.' },
  { title: 'Загуба на млечни зъби рано', description: 'Ранното падане на млечни зъби може да наруши подреждането.' },
  { title: 'Лоши навици в детството', description: 'Смучене на палец, биберон след 3г. възраст.' },
  { title: 'Травми', description: 'Удари по лицето могат да изместят зъбите.' },
  { title: 'Липсващи зъби', description: 'Останалите зъби се изместват към празното място.' },
  { title: 'Заболявания на венците', description: 'Тежки заболявания могат да разхлабят зъбите.' }
]

const PROBLEMS = [
  'Трудно почистване и по-висок риск от кариеси',
  'Проблеми със захапката и дъвченето',
  'Болки в челюстта и TMJ проблеми',
  'Износване на емайла',
  'Проблеми с говора',
  'Ниско самочувствие и социални притеснения'
]

const TREATMENTS = [
  { 
    name: 'Прозрачни алайнери (Invisalign)',
    description: 'Невидими, свалящи се шини за леки до умерени случаи',
    duration: '6-18 месеца',
    price: '€1 500 – €5 000',
    pros: ['Почти невидими', 'Свалят се за хранене', 'Комфортни'],
    best_for: 'Възрастни и тийнейджъри, които искат дискретно лечение'
  },
  { 
    name: 'Керамични брекети',
    description: 'По-дискретни от металните, фиксирани брекети',
    duration: '12-24 месеца',
    price: '€1 535 – €2 555',
    pros: ['По-естетични', 'Ефективни за сложни случаи', 'Не изискват дисциплина'],
    best_for: 'Хора, които искат естетичен вариант за сложни проблеми'
  },
  { 
    name: 'Метални брекети',
    description: 'Класическият и най-ефективен метод',
    duration: '12-36 месеца',
    price: '€1 025 – €1 790',
    pros: ['Най-ефективни', 'Най-достъпни', 'Подходящи за всички случаи'],
    best_for: 'Деца и тийнейджъри, сложни ортодонтски проблеми'
  },
  { 
    name: 'Лингвални брекети',
    description: 'Брекети от вътрешната страна на зъбите',
    duration: '18-36 месеца',
    price: '€2 555 – €5 110',
    pros: ['Напълно невидими', 'Ефективни за сложни случаи'],
    best_for: 'Хора, които искат напълно невидимо лечение'
  }
]

const FAQS = [
  { q: 'На каква възраст трябва да се лекуват кривите зъби?', a: 'Най-добре е да се започне между 10-14 години, когато челюстта все още расте. Но лечение е възможно на всяка възраст - все повече възрастни избират да си изправят зъбите.' },
  { q: 'Мога ли да изправя зъбите си без брекети?', a: 'Да! Прозрачните алайнери (като Invisalign) са отлична алтернатива за леки до умерени случаи. Те са почти невидими и се свалят за хранене.' },
  { q: 'Колко време отнема изправянето на криви зъби?', a: 'Зависи от сложността: 6-12 месеца за леки случаи, 12-24 месеца за умерени, до 36 месеца за тежки случаи.' },
  { q: 'Болезнено ли е изправянето на зъби?', a: 'Може да има лек дискомфорт в първите дни след поставяне или затягане, но това е временно и се контролира лесно.' },
  { q: 'Ще си личи, че нося брекети?', a: 'При алайнери и лингвални брекети - почти не. Керамичните брекети са по-дискретни от металните. Изборът зависи от вашите приоритети.' }
]

export default function CrookedTeethPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-teal-500 font-medium text-sm tracking-wide uppercase mb-4">
            Пълен гид
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6">
            Криви Зъби:<br />Причини и Лечение
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Научете защо зъбите стават криви, какви проблеми причиняват и какви са съвременните 
            методи за изправяне. Намерете най-подходящото решение за вас.
          </p>
          <Link
            href="/orthodontics/quiz"
            className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
          >
            Безплатна оценка
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* What are crooked teeth */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-6">
            Какво са криви зъби?
          </h2>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed mb-4">
              Криви зъби (или зъбна скученост) е състояние, при което зъбите не са подредени правилно в зъбната дъга. 
              Те могат да бъдат накривени, ротирани, припокриващи се или разположени извън реда.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Това е една от най-честите ортодонтски проблеми, засягаща около 50-70% от хората. 
              Добрата новина е, че кривите зъби могат да се коригират на всяка възраст с правилното лечение.
            </p>
          </div>
        </div>
      </section>

      {/* Causes */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Защо зъбите стават криви?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {CAUSES.map((cause, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-medium text-slate-900 mb-1">{cause.title}</h3>
                <p className="text-sm text-slate-500">{cause.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Какви проблеми причиняват кривите зъби?
          </h2>
          
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              <span className="font-medium text-amber-700">Нелекуваните криви зъби могат да доведат до:</span>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {PROBLEMS.map((problem, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-1">•</span>
                  <span className="text-slate-700">{problem}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Treatments */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Методи за лечение на криви зъби
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {TREATMENTS.map((treatment, index) => (
              <div key={index} className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-medium text-lg text-slate-900 mb-2">{treatment.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{treatment.description}</p>
                
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Clock className="w-4 h-4" />
                    {treatment.duration}
                  </div>
                  <div className="text-teal-600 font-medium">{treatment.price}</div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {treatment.pros.map((pro, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      {pro}
                    </div>
                  ))}
                </div>
                
                <div className="bg-teal-50 rounded-lg p-3">
                  <span className="text-sm text-teal-700">
                    <strong>Най-подходящ за:</strong> {treatment.best_for}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison hint */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-teal-50 rounded-2xl border border-teal-200 p-8 text-center">
            <Smile className="w-12 h-12 text-teal-500 mx-auto mb-4" />
            <h2 className="font-serif text-xl font-semibold text-slate-900 mb-3">
              Не сте сигурни кой метод е подходящ за вас?
            </h2>
            <p className="text-slate-600 mb-6">
              Сравнете алайнери и брекети, за да разберете кое е по-доброто решение за вашия случай.
            </p>
            <Link
              href="/aligners-vs-braces"
              className="text-teal-600 font-medium hover:text-teal-700 inline-flex items-center gap-2"
            >
              Алайнери vs Брекети - Пълно сравнение
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-slate-50">
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
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Готови ли сте да изправите зъбите си?
            </h2>
            <p className="text-teal-100 mb-8 max-w-lg mx-auto">
              Направете безплатна оценка и разберете кой метод е най-подходящ за вашия случай.
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

      {/* Related */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Свързани статии
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/aligners-vs-braces" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-300 transition-colors">
              <h3 className="font-medium text-slate-900 mb-2">Алайнери vs Брекети</h3>
              <p className="text-sm text-slate-500">Подробно сравнение на методите</p>
            </Link>
            <Link href="/invisalign-price" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-300 transition-colors">
              <h3 className="font-medium text-slate-900 mb-2">Invisalign цена</h3>
              <p className="text-sm text-slate-500">Актуални цени в България</p>
            </Link>
            <Link href="/orthodontics" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-300 transition-colors">
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
