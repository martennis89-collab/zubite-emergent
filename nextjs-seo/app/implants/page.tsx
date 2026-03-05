import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS } from '@/lib/data'
import { TREATMENT_PRICES, PRICE_DISCLAIMER, EDUCATIONAL_DISCLAIMER } from '@/lib/pricing'
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, Target, Info, Shield, Users, AlertCircle, Bone, Crown, LayoutGrid, Anchor } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'
import { LeadCaptureForm } from '@/components/LeadCaptureForm'

const treatment = TREATMENTS.implants

export const metadata: Metadata = {
  title: 'Зъбни импланти | Информация, цени и лечение | Zubite.bg',
  description: 'Научете какво представляват зъбните импланти, какви са ориентировъчните цени и кога това лечение е подходящо.',
  keywords: 'зъбни импланти, имплант цена, липсващ зъб, импланти България, All-on-4, Straumann, Nobel Biocare',
  alternates: {
    canonical: 'https://zubite.bg/implants',
  },
  openGraph: {
    title: 'Зъбни импланти | Информация, цени и лечение | Zubite.bg',
    description: 'Научете какво представляват зъбните импланти, какви са ориентировъчните цени и кога това лечение е подходящо.',
    url: 'https://zubite.bg/implants',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

// Trust cards for hero
const TRUST_CARDS = [
  { icon: Info, title: 'Информация и ориентировъчни цени' },
  { icon: Grid3X3, title: 'Различни методи за възстановяване' },
  { icon: Users, title: 'Помощ при избор на специалист' }
]

// How Zubite works steps
const HOW_IT_WORKS = [
  { 
    step: '1', 
    title: 'Оценка или обаждане', 
    description: 'Отговаряте на кратка оценка или заявявате обаждане.' 
  },
  { 
    step: '2', 
    title: 'Информация и цени', 
    description: 'Получавате информация за възможните лечения и ориентировъчни цени.' 
  },
  { 
    step: '3', 
    title: 'Избор на специалист', 
    description: 'По желание: нашият екип ви свързва с подходящ специалист.' 
  }
]

// When implants are used
const WHEN_IMPLANTS_USED = [
  { title: 'Липсващ един зъб', description: 'Единичен имплант замества липсващия зъб без да се засягат съседните.' },
  { title: 'Липсващи няколко зъба', description: 'Мостова конструкция върху импланти възстановява няколко съседни зъба.' },
  { title: 'Нестабилни протези', description: 'Импланти стабилизират подвижните протези и подобряват комфорта.' },
  { title: 'Пълна липса на зъби', description: 'All-on-4 или All-on-6 концепцията възстановява цяла челюст.' }
]

// Types of implant treatments
const IMPLANT_TYPES = [
  { 
    icon: Crown, 
    title: 'Единичен имплант', 
    description: 'Заместване на един липсващ зъб с имплант и коронка.' 
  },
  { 
    icon: Bone, 
    title: 'Имплант мост', 
    description: 'Мостова конструкция върху два или повече импланта.' 
  },
  { 
    icon: Grid3X3, 
    title: 'All-on-4 / All-on-6', 
    description: 'Пълно възстановяване на челюст върху 4-6 импланта.' 
  },
  { 
    icon: Anchor, 
    title: 'Стабилизиране на протези', 
    description: 'Импланти за закрепване на подвижни протези.' 
  }
]

// Implant systems
const IMPLANT_SYSTEMS = [
  'Straumann',
  'Nobel Biocare',
  'Osstem',
  'Megagen'
]

// Prices (EUR primary, BGN secondary)
const IMPLANT_PRICES = [
  { 
    title: 'Единичен имплант', 
    eurMin: 700, 
    eurMax: 2000, 
    bgnMin: 1400, 
    bgnMax: 4000 
  },
  { 
    title: 'Имплант + корона', 
    eurMin: 1200, 
    eurMax: 3000, 
    bgnMin: 2400, 
    bgnMax: 6000 
  },
  { 
    title: 'All-on-4', 
    eurMin: 5000, 
    eurMax: 9000, 
    bgnMin: 10000, 
    bgnMax: 18000 
  }
]

// Factors to consider
const FACTORS_TO_CONSIDER = [
  { title: 'Състояние на венците', description: 'Здравите венци са важни за успеха на импланта.' },
  { title: 'Наличие на достатъчно кост', description: 'В някои случаи може да е необходима костна аугментация.' },
  { title: 'Общо здравословно състояние', description: 'Някои заболявания могат да повлияят на заздравяването.' },
  { title: 'Навици', description: 'Пушенето и бруксизмът могат да намалят успеваемостта.' }
]

// FAQ
const FAQS = [
  { 
    q: 'Колко време издържат имплантите?', 
    a: 'При правилна грижа и редовни прегледи, имплантите могат да издържат повече от 20-25 години. В много случаи те са решение за цял живот.' 
  },
  { 
    q: 'Болезнена ли е процедурата?', 
    a: 'Процедурата се извършва под местна упойка. Обикновено пациентите изпитват минимален дискомфорт по време на манипулацията. След процедурата може да има лек дискомфорт за няколко дни, който в повечето случаи се контролира с обезболяващи.' 
  },
  { 
    q: 'Колко време продължава лечението?', 
    a: 'Общата продължителност зависи от случая. Обикновено отнема 3-6 месеца за срастване на импланта с костта (остеоинтеграция). При подходящи условия е възможно незабавно натоварване с временни зъби.' 
  },
  { 
    q: 'Може ли всеки да постави импланти?', 
    a: 'Повечето възрастни са подходящи кандидати. Необходима е оценка на костната плътност, състоянието на венците и общото здраве. Някои състояния като неконтролиран диабет или тежко пушене могат да повлияят на успеваемостта.' 
  },
  { 
    q: 'Каква е цената на имплант в България?', 
    a: 'Ориентировъчните цени варират: единичен имплант €700-€2000, с корона €1200-€3000, All-on-4 €5000-€9000. Цената зависи от сложността на случая, използваната система и клиниката. Точна оферта се получава след преглед.' 
  },
  { 
    q: 'Какво става ако нямам достатъчно кост?', 
    a: 'При недостатъчна кост са възможни процедури за костна аугментация или синус лифт. Това добавя време към лечението, но позволява поставяне на импланти в повечето случаи.' 
  }
]

export default function ImplantsPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Зъбни импланти', url: 'https://zubite.bg/implants' }
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
            <div className="w-20 h-20 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-6 icon-hover">
              <Target className="w-10 h-10 text-sky-600" />
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-4">
              Зъбни импланти – трайно решение за липсващи зъби
            </h1>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Научете как работят зъбните импланти, какви са ориентировъчните цени и кога това лечение е подходящо.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <a
                href="#lead-form"
                className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
                data-testid="hero-cta-primary"
              >
                Заяви обаждане
                <ArrowRight className="w-5 h-5" />
              </a>
              <Link
                href="/implants/quiz"
                className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-xl border-2 border-slate-200 text-slate-700 font-medium hover:border-sky-300 hover:bg-sky-50 transition-colors"
                data-testid="hero-cta-secondary"
              >
                Направи бърза оценка
              </Link>
            </div>
            
            {/* Trust Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TRUST_CARDS.map((card, index) => (
                <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <card.icon className="w-5 h-5 text-sky-600" />
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
                <div className="icon-hover w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-medium text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — WHEN IMPLANTS ARE USED */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Кога се използват импланти
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Имплантите заместват корена на естествения зъб и служат като основа за коронка, мост или протеза.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WHEN_IMPLANTS_USED.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-medium text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — TYPES OF IMPLANT TREATMENTS */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-10 text-center">
            Видове имплантни лечения
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {IMPLANT_TYPES.map((item, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — IMPLANT SYSTEMS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Импланти системи
          </h2>
          <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
            Съществуват различни системи за зъбни импланти. Изборът зависи от конкретния случай и препоръката на специалиста.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {IMPLANT_SYSTEMS.map((system, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <span className="text-slate-700 font-medium">{system}</span>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-sm">
                Успехът на имплантологичното лечение зависи основно от правилната диагностика и клинично планиране, а не само от марката на импланта.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — INDICATIVE PRICES */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Ориентировъчни цени
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {IMPLANT_PRICES.map((price, index) => (
              <div key={index} className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-6 text-white text-center">
                <h3 className="font-medium text-lg mb-3 text-sky-100">{price.title}</h3>
                <div className="text-2xl font-bold mb-1">
                  €{price.eurMin.toLocaleString('bg-BG')} – €{price.eurMax.toLocaleString('bg-BG')}
                </div>
                <div className="text-sky-200 text-sm">
                  (≈ {price.bgnMin.toLocaleString('bg-BG')} – {price.bgnMax.toLocaleString('bg-BG')} лв.)
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-slate-500 text-center mt-6">
            Цените са ориентировъчни и зависят от сложността на случая, използваната система и клиниката.
          </p>
        </div>
      </section>

      {/* SECTION 7 — BEFORE YOU CHOOSE IMPLANTS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Преди да изберете импланти
          </h2>
          <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
            Преди поставяне на импланти е необходима оценка на няколко фактора:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FACTORS_TO_CONSIDER.map((factor, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-slate-900 mb-1">{factor.title}</h3>
                  <p className="text-sm text-slate-600">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8 — FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Често задавани въпроси
          </h2>
          
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      {/* SECTION 9 — FINAL CTA with Lead Form */}
      <section id="lead-form" className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4">
                Направете първата стъпка
              </h2>
              <p className="text-slate-600 mb-6">
                Ако не сте сигурни дали имплантите са подходящото решение, нашият екип може да ви помогне да разберете възможностите.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Безплатна първоначална консултация</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Ориентировъчна информация за цени</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Насочване към подходящ специалист</span>
                </div>
              </div>
              
              <div className="mt-6">
                <Link
                  href="/implants/quiz"
                  className="text-sky-600 font-medium hover:text-sky-700 inline-flex items-center gap-2"
                >
                  Или направете бърза оценка
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            
            <LeadCaptureForm treatmentType="implants" source="implants_page" />
          </div>
        </div>
      </section>

      {/* Educational Disclaimer */}
      <div className="py-4 bg-white text-center">
        <p className="text-xs text-slate-400 max-w-2xl mx-auto px-4">
          {EDUCATIONAL_DISCLAIMER}
        </p>
      </div>

      <Footer />
    </main>
  )
}
