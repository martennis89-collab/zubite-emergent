import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { ALIGNER_BRANDS, BRAND_COMPARISON_DISCLAIMER, PRICE_DISCLAIMER } from '@/lib/pricing'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, MapPin, Clock, Shield, Users, Award, Smile, Target, Heart, Zap, AlertCircle } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'
import { AlignersVsBracesQuiz } from '@/components/AlignersVsBracesQuiz'

const treatment = TREATMENTS.orthodontics

export const metadata: Metadata = {
  title: `Ортодонтия в България | Брекети, Алайнери, Invisalign | Zubite.bg`,
  description: `Защо ортодонтското лечение е основата на здравата усмивка. Научете кога е нужна ортодонтия, сравнете алайнери и брекети, и намерете подходящото лечение.`,
  keywords: 'ортодонтия, ортодонт София, криви зъби лечение, лечение на захапка, алайнери, брекети, Invisalign, алайнери или брекети',
  alternates: {
    canonical: 'https://zubite.bg/orthodontics',
  },
  openGraph: {
    title: `Ортодонтия | Брекети и Алайнери | Zubite.bg`,
    description: 'Защо ортодонтското лечение е основата на здравата усмивка. Сравнете методите и намерете подходящия за вас.',
    url: 'https://zubite.bg/orthodontics',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

const WHY_ORTHO_FIRST = [
  { 
    title: 'Основа за други лечения', 
    description: 'Правилната позиция на зъбите е предпоставка за успешни импланти, коронки и естетични процедури. Ортодонтията подготвя устата за всичко останало.',
    icon: Target
  },
  { 
    title: 'Превенция на проблеми', 
    description: 'Неправилната захапка води до износване на емайла, проблеми с TMJ ставата и дори главоболие. Ортодонтията предотвратява тези усложнения.',
    icon: Shield
  },
  { 
    title: 'По-лесна хигиена', 
    description: 'Правилно подредените зъби се чистят много по-лесно. Това намалява риска от кариеси и заболявания на венците.',
    icon: Heart
  },
  { 
    title: 'Дълготрайни резултати', 
    description: 'За разлика от козметичните процедури, ортодонтското лечение решава проблема от корена и дава трайни резултати.',
    icon: Zap
  }
]

const TREATMENT_OPTIONS = [
  {
    name: 'Invisalign (Прозрачни алайнери)',
    description: 'Най-напредналата система за изправяне на зъби в света. Подходяща от 6-годишна възраст до най-сложните случаи при възрастни.',
    features: ['Почти невидими', 'Свалящи се за хранене', '3D планиране с ClinCheck', 'От First (6г.) до сложни случаи'],
    price: '4,000 - 8,000 лв',
    duration: '6-24 месеца',
    best_for: 'Всички възрасти, от леки до много сложни случаи',
    highlighted: true
  },
  {
    name: 'Керамични брекети',
    description: 'По-дискретен вариант на фиксираните брекети. Изработени от материал, близък до цвета на зъбите.',
    features: ['По-естетични от металните', 'Ефективни за сложни случаи', 'Фиксирани - работят 24/7'],
    price: '3,000 - 5,000 лв',
    duration: '12-24 месеца',
    best_for: 'Възрастни, които искат по-дискретен вариант'
  },
  {
    name: 'Метални брекети',
    description: 'Класическият и доказан метод за ортодонтско лечение. Най-ефективни при тежки случаи.',
    features: ['Най-достъпна цена', 'Доказана ефективност', 'Подходящи за всички случаи'],
    price: '2,000 - 3,500 лв',
    duration: '12-36 месеца',
    best_for: 'Деца, тийнейджъри и сложни случаи'
  },
  {
    name: 'Лингвални брекети',
    description: 'Брекети, поставени от вътрешната страна на зъбите. Напълно невидими отвън.',
    features: ['100% невидими', 'Ефективни за сложни случаи', 'Изискват адаптация'],
    price: '5,000 - 10,000 лв',
    duration: '18-36 месеца',
    best_for: 'Възрастни с висока нужда от дискретност'
  }
]

const COMPARISON_TABLE = [
  { feature: 'Видимост', aligners: 'Почти невидими', braces: 'Видими' },
  { feature: 'Комфорт', aligners: 'Много комфортни', braces: 'Адаптация 1-2 седмици' },
  { feature: 'Хранене', aligners: 'Без ограничения', braces: 'Избягване на твърди храни' },
  { feature: 'Хигиена', aligners: 'Лесна - свалят се', braces: 'По-трудна' },
  { feature: 'Сложни случаи', aligners: 'Да (с Invisalign)', braces: 'Да' },
  { feature: 'Деца', aligners: 'От 6г. (Invisalign First)', braces: 'От 10-12г.' },
  { feature: 'Посещения', aligners: 'На 6-8 седмици', braces: 'На 4-6 седмици' },
]

const WHO_NEEDS_ORTHO = [
  'Криви или накривени зъби',
  'Разстояния между зъбите (диастема)',
  'Препокриване на зъбите (crowding)',
  'Неправилна захапка (overbite, underbite, crossbite)',
  'Проблеми с дъвченето или говора',
  'Подготовка за импланти или естетични процедури',
  'TMJ проблеми, свързани със захапката',
  'Хъркане и сънна апнея (в някои случаи)'
]

const FAQS = [
  { q: 'На каква възраст може да се започне ортодонтско лечение?', a: 'С Invisalign First - от 6-годишна възраст. Традиционните брекети обикновено се поставят между 10-14 години. При възрастни няма горна граница - все повече хора над 40 и 50 избират да изправят зъбите си.' },
  { q: 'Трябва ли ми ортодонтия преди други дентални процедури?', a: 'В много случаи - да. Правилната позиция на зъбите е основа за успешни импланти, мостове, коронки и естетични процедури. Вашият дентален специалист ще ви посъветва.' },
  { q: 'Invisalign или брекети - кое е по-добре?', a: 'Зависи от вашия случай и предпочитания. Invisalign е най-напредналата система и може да лекува от 6-годишна възраст до много сложни случаи. Брекетите са по-достъпни и не изискват дисциплина за носене.' },
  { q: 'Колко време трае ортодонтското лечение?', a: 'Обикновено 12-24 месеца за повечето случаи. Леките корекции с алайнери могат да се завършат за 6-12 месеца. Сложните случаи могат да отнемат до 36 месеца.' },
  { q: 'Болезнено ли е ортодонтското лечение?', a: 'Може да има лек дискомфорт в първите дни след поставяне или при смяна на шини/затягане. Това е нормално и преминава бързо.' },
  { q: 'Какво става след свалянето на брекетите/алайнерите?', a: 'Носите ретейнер, за да запазите резултата. Първоначално целодневно, след това само през нощта. Ретейнерът е ключов за дълготрайния успех.' }
]

const STATS = [
  { value: '70%', label: 'от хората имат нужда от ортодонтия' },
  { value: '14M+', label: 'лекувани с Invisalign' },
  { value: '6+', label: 'години минимална възраст' }
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
                Ортодонтия
              </h1>
              <p className="text-lg text-sky-600 font-medium mb-4">Основата на здравата и красива усмивка</p>
              <p className="text-slate-600 leading-relaxed">
                Ортодонтията не е само за изправяне на криви зъби. Това е специалност, която коригира 
                позицията на зъбите и захапката, създавайки основата за цялостното дентално здраве. 
                Често е първата стъпка преди други дентални процедури.
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
              href="/orthodontics/quiz"
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="cta-quiz"
            >
              <Smile className="w-5 h-5" />
              Разберете кой метод е за вас
            </Link>
            <Link
              href="#comparison"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              Алайнери vs Брекети
            </Link>
          </div>
        </div>
      </section>

      {/* Why Orthodontics First */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Защо ортодонтията е основата на денталното здраве?
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Много пациенти се нуждаят от ортодонтско лечение преди импланти, коронки или естетични процедури. 
            Правилната позиция на зъбите е предпоставка за успеха на всички други лечения.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {WHY_ORTHO_FIRST.map((item, index) => (
              <div 
                key={index}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-200 card-hover-subtle"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Needs Orthodontics */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Кога е нужна ортодонтия?
          </h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="grid md:grid-cols-2 gap-4">
              {WHO_NEEDS_ORTHO.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-slate-600 mb-4">Не сте сигурни дали имате нужда от ортодонтия?</p>
            <Link
              href="/orthodontics/quiz"
              className="text-sky-600 font-medium hover:text-sky-700 inline-flex items-center gap-2"
            >
              Направете безплатна оценка
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Treatment Options */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Методи за ортодонтско лечение
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Днес имате избор между няколко ефективни метода. Всеки има своите предимства.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {TREATMENT_OPTIONS.map((option, index) => (
              <div 
                key={index} 
                className={`rounded-2xl border-2 p-6 ${
                  option.highlighted 
                    ? 'border-sky-500 bg-sky-50' 
                    : 'border-slate-200 bg-white'
                }`}
              >
                {option.highlighted && (
                  <div className="bg-sky-500 text-white text-xs font-medium px-3 py-1 rounded-full inline-block mb-3">
                    Най-напреднала система
                  </div>
                )}
                <h3 className="font-medium text-xl text-slate-900 mb-2">{option.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{option.description}</p>
                
                <div className="space-y-2 mb-4">
                  {option.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      {feature}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div>
                    <span className="text-sm text-slate-500">Цена:</span>
                    <span className="ml-2 font-medium text-sky-600">{option.price}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Време:</span>
                    <span className="ml-2 text-slate-700">{option.duration}</span>
                  </div>
                </div>
                
                <div className="mt-4 bg-slate-100 rounded-lg p-3">
                  <span className="text-sm text-slate-600">
                    <strong>Подходящ за:</strong> {option.best_for}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Aligners vs Braces Comparison */}
      <section id="comparison" className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Алайнери vs Брекети: Бързо сравнение
          </h2>
          <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
            Двата основни типа ортодонтско лечение имат различни характеристики. 
            Ето кратко сравнение, което ще ви помогне да разберете разликите.
          </p>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-4 font-medium text-slate-500">Характеристика</div>
              <div className="p-4 font-medium text-sky-600 text-center">Алайнери (Invisalign)</div>
              <div className="p-4 font-medium text-slate-700 text-center">Брекети</div>
            </div>
            
            {COMPARISON_TABLE.map((row, index) => (
              <div key={index} className="grid grid-cols-3 border-b border-slate-100 last:border-0">
                <div className="p-4 text-slate-700">{row.feature}</div>
                <div className="p-4 text-center text-sky-700 bg-sky-50/50">{row.aligners}</div>
                <div className="p-4 text-center text-slate-600">{row.braces}</div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Link
              href="/aligners-vs-braces"
              className="text-sky-600 font-medium hover:text-sky-700 inline-flex items-center gap-2"
            >
              Прочетете пълното сравнение
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Invisalign Highlight */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl p-8 md:p-10 text-white">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <h2 className="font-serif text-2xl font-semibold mb-4">
                  Invisalign: Най-напредналата система в света
                </h2>
                <p className="text-sky-100 mb-4">
                  С над 14 милиона лекувани пациенти, Invisalign е световен лидер в прозрачната ортодонтия. 
                  Системата използва патентована SmartTrack технология и 3D планиране с ClinCheck.
                </p>
                <ul className="space-y-2 text-sky-100">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-sky-200" />
                    <span>Invisalign First - от 6-годишна възраст</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-sky-200" />
                    <span>Лечение на сложни случаи при възрастни</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-sky-200" />
                    <span>Виртуална визуализация на резултата преди старт</span>
                  </li>
                </ul>
              </div>
              <div className="text-center md:text-right">
                <div className="text-5xl font-bold mb-2">14M+</div>
                <div className="text-sky-200">лекувани пациенти</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* City Links */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Намерете ортодонт по град
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

      {/* CTA Section - Aligners vs Braces Quiz */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <AlignersVsBracesQuiz />
        </div>
      </section>

      <Footer />
    </main>
  )
}
