import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS } from '@/lib/data'
import { PRICE_DISCLAIMER, EDUCATIONAL_DISCLAIMER } from '@/lib/pricing'
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, Info, Users, Moon, AlertCircle, Clock, Banknote, Shield, Zap, Wind, Brain, HeartPulse } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

const treatment = TREATMENTS['sleep-airway']

export const metadata: Metadata = {
  title: 'Сънна апнея и хъркане | Орални апарати и цени | Zubite.bg',
  description: 'Научете повече за денталните решения при хъркане и сънна апнея. Вижте ориентировъчни цени на орални апарати и разберете дали са подходящи за вас.',
  keywords: 'сънна апнея, хъркане, орален апарат, CPAP алтернатива, MAD апарат, мандибуларен апарат, хъркане лечение, апнея цена',
  alternates: {
    canonical: 'https://zubite.bg/sleep-airway',
  },
  openGraph: {
    title: 'Сънна апнея и хъркане | Орални апарати | Zubite.bg',
    description: 'Научете повече за денталните решения при хъркане и сънна апнея. Вижте ориентировъчни цени на орални апарати.',
    url: 'https://zubite.bg/sleep-airway',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

// Trust cards for hero
const TRUST_CARDS = [
  { icon: Info, title: 'Алтернатива на CPAP машина' },
  { icon: Banknote, title: 'Ориентировъчни цени' },
  { icon: Users, title: 'Помощ при избор на подходящо лечение' }
]

// How Zubite works steps
const HOW_IT_WORKS = [
  { 
    step: '1', 
    title: 'Бърза оценка', 
    description: 'Отговаряте на няколко въпроса за вашия случай.' 
  },
  { 
    step: '2', 
    title: 'Разбирате възможностите', 
    description: 'Помагаме ви да разберете кои решения може да са подходящи.' 
  },
  { 
    step: '3', 
    title: 'Избор на специалист', 
    description: 'По желание: свързваме ви с подходящ специалист.' 
  }
]

// Symptoms that oral appliances can help with
const SLEEP_SYMPTOMS = [
  { icon: Wind, title: 'Хъркане', description: 'Силно хъркане, което пречи на партньора или вас самите.' },
  { icon: AlertCircle, title: 'Спиране на дишането', description: 'Прекъсвания на дишането по време на сън.' },
  { icon: Brain, title: 'Дневна сънливост', description: 'Умора и затруднена концентрация през деня.' },
  { icon: HeartPulse, title: 'Събуждане със задух', description: 'Внезапно събуждане с усещане за задушаване.' },
  { icon: Clock, title: 'Главоболие сутрин', description: 'Честа сутрешна болка в главата.' },
  { icon: Moon, title: 'Неспокоен сън', description: 'Чести събуждания и неефективен сън.' }
]

// Treatment options
const TREATMENT_OPTIONS = [
  { 
    icon: Shield, 
    title: 'MAD апарат (Mandibular Advancement Device)', 
    description: 'Най-често използван тип орален апарат. Позиционира долната челюст леко напред.',
    suitable: 'Подходящ при лека до умерена апнея'
  },
  { 
    icon: Wind, 
    title: 'Tongue Retaining Device', 
    description: 'Задържа езика в предна позиция, отваряйки дихателните пътища.',
    suitable: 'За специфични случаи по преценка на специалист'
  }
]

// Oral appliance vs CPAP comparison
const ORAL_VS_CPAP = {
  oral: {
    title: 'Орален апарат',
    advantages: [
      'Преносим и компактен',
      'Не издава шум',
      'Не изисква електричество',
      'Лесен за почистване',
      'По-комфортен за мнозина'
    ],
    considerations: [
      'Ефективен при лека до умерена апнея',
      'Може да причини временен дискомфорт в челюстта',
      'Изисква период на адаптация'
    ]
  },
  cpap: {
    title: 'CPAP машина',
    advantages: [
      'Златен стандарт при тежка апнея',
      'Много ефективен при правилна употреба',
      'Подходящ за всички степени апнея'
    ],
    considerations: [
      'Изисква електричество',
      'Издава шум',
      'По-трудно за пътуване',
      'Някои пациенти трудно толерират маската'
    ]
  }
}

// When oral appliances may not be the first choice
const NOT_SUITABLE_FOR = [
  { title: 'Тежка сънна апнея', description: 'При тежки случаи CPAP обикновено е по-ефективен.' },
  { title: 'Централна апнея', description: 'Оралните апарати работят при обструктивна, не при централна апнея.' },
  { title: 'Тежки зъбни проблеми', description: 'Нужни са здрави зъби за закрепване на апарата.' },
  { title: 'Тежки TMJ проблеми', description: 'Може да влоши съществуващи проблеми със ставата.' }
]

// Prices (EUR primary, BGN secondary)
const SLEEP_PRICES = [
  { 
    title: 'MAD апарат (стандартен)', 
    eurMin: 500, 
    eurMax: 1500, 
    bgnMin: 1000, 
    bgnMax: 3000,
    note: null
  },
  { 
    title: 'MAD апарат (премиум)', 
    eurMin: 1500, 
    eurMax: 2500, 
    bgnMin: 3000, 
    bgnMax: 5000,
    note: null
  },
  { 
    title: 'Tongue Retaining Device', 
    eurMin: 300, 
    eurMax: 800, 
    bgnMin: 600, 
    bgnMax: 1600,
    note: null
  },
  { 
    title: 'Консултация + диагностика', 
    eurMin: 50, 
    eurMax: 150, 
    bgnMin: 100, 
    bgnMax: 300,
    note: null
  }
]

// Who this is suitable for
const SUITABLE_FOR = [
  'Хора с лека до умерена обструктивна сънна апнея',
  'Пациенти, които не толерират CPAP машина',
  'Хора с проблемно хъркане без диагностицирана апнея',
  'Тези, които пътуват често и търсят преносимо решение'
]

// FAQ
const FAQS = [
  { 
    q: 'Какви дентални решения има за хъркане?', 
    a: 'Предлагат се индивидуални орални апарати (MAD – Mandibular Advancement Device), които позиционират долната челюст напред и отварят дихателните пътища. Те са ефективни при хъркане и лека до умерена сънна апнея.' 
  },
  { 
    q: 'Ефективни ли са оралните апарати за сънна апнея?', 
    a: 'Да, оралните апарати са доказано ефективни при лека до умерена обструктивна сънна апнея. Те са призната алтернатива на CPAP според Американската академия по медицина на съня. Ефективността зависи от индивидуалния случай.' 
  },
  { 
    q: 'Какъв е процесът за изработка на орален апарат?', 
    a: 'След консултация и оценка се вземат прецизни отпечатъци на зъбите. Апаратът се изработва индивидуално в лаборатория (1-2 седмици). Следват поставяне, настройка и контролни прегледи за оптимизиране на ефекта.' 
  },
  { 
    q: 'Колко време отнема привикването към апарата?', 
    a: 'Повечето пациенти свикват за 1-2 седмици. В началото може да има лек дискомфорт в челюстта или зъбите, който обикновено преминава. Важно е да се следват инструкциите на специалиста.' 
  },
  { 
    q: 'Може ли оралният апарат да замести CPAP?', 
    a: 'При лека до умерена апнея оралните апарати са ефективна алтернатива. При тежка апнея CPAP обикновено е по-ефективен, но за пациенти с непоносимост към CPAP оралните апарати остават опция, която трябва да се обсъди със специалист.' 
  },
  { 
    q: 'Колко издържа оралният апарат?', 
    a: 'Качествените индивидуални апарати обикновено издържат 3-5 години при правилна грижа. Издръжливостта зависи от материала, интензивността на носене и оралната хигиена.' 
  }
]

export default function SleepAirwayPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Сънна апнея', url: 'https://zubite.bg/sleep-airway' }
  ])
  
  const faqSchema = generateFAQSchema(FAQS)

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />
      
      {/* SECTION 1 — HERO */}
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
          
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-6 icon-hover">
              <Moon className="w-10 h-10 text-teal-600" />
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-4">
              Сънна апнея и хъркане – орални апарати и дентални решения
            </h1>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Разберете дали оралните апарати са подходящи за вас и какви са ориентировъчните цени в България.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link
                href="/sleep-airway/quiz"
                className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
                data-testid="hero-cta-primary"
              >
                Направи бърза оценка
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            
            {/* Trust Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TRUST_CARDS.map((card, index) => (
                <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <card.icon className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-sm text-slate-700 text-left">{card.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — HOW ZUBITE WORKS */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-10 text-center">
            Как работи Zubite.bg
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item, index) => (
              <div 
                key={index} 
                className="text-center animate-fade-in-up" 
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="icon-hover w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-medium text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — SYMPTOMS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Симптоми, при които оралните апарати могат да помогнат
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Ако разпознавате тези симптоми, оралните апарати може да са подходящо решение.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SLEEP_SYMPTOMS.map((symptom, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <symptom.icon className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 mb-1">{symptom.title}</h3>
                  <p className="text-sm text-slate-500">{symptom.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — TREATMENT OPTIONS */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-10 text-center">
            Видове орални апарати
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TREATMENT_OPTIONS.map((item, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-slate-900">{item.title}</h3>
                </div>
                <p className="text-slate-600 mb-3">{item.description}</p>
                <div className="flex items-center gap-2 text-sm text-teal-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>{item.suitable}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — ORAL APPLIANCE VS CPAP */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Орален апарат или CPAP?
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Изборът зависи от степента на апнеята и личните предпочитания. Ето основните разлики:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Oral Appliance */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-serif text-xl font-semibold text-slate-900 mb-4 text-center">
                {ORAL_VS_CPAP.oral.title}
              </h3>
              <div className="space-y-3 mb-4">
                {ORAL_VS_CPAP.oral.advantages.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Да се има предвид:</p>
                {ORAL_VS_CPAP.oral.considerations.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* CPAP */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-serif text-xl font-semibold text-slate-900 mb-4 text-center">
                {ORAL_VS_CPAP.cpap.title}
              </h3>
              <div className="space-y-3 mb-4">
                {ORAL_VS_CPAP.cpap.advantages.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Да се има предвид:</p>
                {ORAL_VS_CPAP.cpap.considerations.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — WHEN NOT SUITABLE */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Кога оралните апарати може да не са първи избор
          </h2>
          <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
            В някои случаи може да са необходими други решения:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NOT_SUITABLE_FOR.map((item, index) => (
              <div key={index} className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-amber-700">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-slate-500 text-center mt-6">
            Специалистът ще определи най-подходящото решение след преглед и диагностика.
          </p>
        </div>
      </section>

      {/* SECTION 7 — PRICING */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Ориентировъчни цени
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SLEEP_PRICES.map((price, index) => (
              <div key={index} className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
                <h3 className="font-medium text-lg mb-3 text-teal-100">
                  {price.title}
                  {price.note && <span className="text-teal-200 text-sm ml-1">{price.note}</span>}
                </h3>
                <div className="text-2xl font-bold mb-1">
                  €{price.eurMin.toLocaleString('bg-BG')} – €{price.eurMax.toLocaleString('bg-BG')}
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-slate-500 text-center mt-6">
            {PRICE_DISCLAIMER}
          </p>
        </div>
      </section>

      {/* SECTION 8 — WHO THIS IS SUITABLE FOR */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            За кого са подходящи оралните апарати
          </h2>
          
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUITABLE_FOR.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-slate-500 mt-6 pt-4 border-t border-slate-200">
              Резултатът зависи от индивидуалния случай. Необходима е диагностика (сънен тест) за определяне на типа и степента на апнеята.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 9 — FAQ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Често задавани въпроси
          </h2>
          
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      {/* SECTION 10 — FINAL CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Moon className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Подобрете качеството на съня си
            </h2>
            <p className="text-teal-100 mb-8 max-w-lg mx-auto">
              Преминете през нашата кратка оценка, за да разберете дали оралните апарати са подходящи за вас.
            </p>
            <Link 
              href="/sleep-airway/quiz"
              className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-teal-600 font-medium hover:bg-teal-50"
              data-testid="start-quiz-cta"
            >
              Направи бърза оценка
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Educational Disclaimer */}
      <div className="py-4 bg-slate-50 text-center">
        <p className="text-xs text-slate-400 max-w-2xl mx-auto px-4">
          {EDUCATIONAL_DISCLAIMER}
        </p>
      </div>

      <Footer treatmentSlug="sleep-airway" />
    </main>
  )
}
