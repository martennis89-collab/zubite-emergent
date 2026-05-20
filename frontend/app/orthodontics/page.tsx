import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS } from '@/lib/data'
import { ALIGNER_BRANDS, BRAND_COMPARISON_DISCLAIMER, PRICE_DISCLAIMER, TREATMENT_PRICES, EDUCATIONAL_DISCLAIMER } from '@/lib/pricing'
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, XCircle, AlertCircle, Smile, Eye, HelpCircle, ClipboardList, Users, Baby } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

const treatment = TREATMENTS.orthodontics

export const metadata: Metadata = {
  title: `Алайнери или Брекети? | Ортодонтия в България | Zubite.bg`,
  description: `Разберете дали алайнери или брекети са подходящи за вас. Сравнете Invisalign, Spark, Angel Aligner. Цени в EUR, безплатна оценка и препоръка за ортодонт.`,
  keywords: 'ортодонт, брекети, алайнер, invisalign, цена, криви зъби, неправилна захапка, ортодонтия България',
  alternates: {
    canonical: 'https://zubite.bg/orthodontics',
  },
  openGraph: {
    title: `Алайнери или Брекети? | Ортодонтия | Zubite.bg`,
    description: 'Отговорете на кратък тест и разберете кой метод е подходящ за вас. Сравнение на марки алайнери и цени.',
    url: 'https://zubite.bg/orthodontics',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

// How it works steps
const HOW_IT_WORKS = [
  { 
    step: '1', 
    title: 'Отговорете на въпроси', 
    description: 'Кратък тест за вашия случай — проблеми, предпочитания и очаквания.' 
  },
  { 
    step: '2', 
    title: 'Получете препоръка', 
    description: 'Разберете дали алайнери или брекети са по-подходящи за вас.' 
  },
  { 
    step: '3', 
    title: 'Помощ при избор на специалист', 
    description: 'По желание — насочване към подходящ ортодонт за вашия случай.' 
  }
]

// Aligners vs Braces comparison
const ALIGNERS_VS_BRACES = {
  aligners: {
    title: 'Алайнери (прозрачни)',
    pros: [
      'Почти невидими — дискретно лечение',
      'Свалят се при хранене и хигиена',
      'По-лесна орална хигиена',
      'По-малък дискомфорт (обикновено)',
      'Виртуален преглед на резултата преди старт'
    ],
    cons: [
      'Изискват дисциплина — носене 20-22 часа',
      'Не са подходящи за всички случаи',
      'Обикновено по-висока цена'
    ]
  },
  braces: {
    title: 'Брекети',
    pros: [
      'Подходящи за всички случаи',
      'Не изискват самодисциплина',
      'Работят 24/7 без прекъсване',
      'По-ниска цена при повечето варианти',
      'Дълга история и доказана ефективност'
    ],
    cons: [
      'Видими (освен лингвалните)',
      'Ограничения в храната',
      'По-трудна хигиена',
      'По-чести посещения при ортодонт'
    ]
  }
}

// Common orthodontic problems for SEO
const ORTHO_PROBLEMS = [
  {
    title: 'Криви зъби',
    description: 'Зъбите не са подредени правилно и нарушават естетиката на усмивката. Криви зъби могат да затруднят хигиената и да доведат до кариеси.',
    treatable: 'Лечими с алайнери или брекети'
  },
  {
    title: 'Струпани зъби (crowding)',
    description: 'Недостатъчно място в челюстта води до препокриване на зъбите. Често срещан проблем при деца и възрастни.',
    treatable: 'Лечими с алайнери или брекети'
  },
  {
    title: 'Неправилна захапка',
    description: 'Горните и долните зъби не се срещат правилно. Може да причини проблеми при дъвчене и износване на емайла.',
    treatable: 'Лечима с алайнери или брекети'
  },
  {
    title: 'Дълбока захапка (overbite)',
    description: 'Горните зъби покриват прекалено долните. Може да причини износване на зъбите и проблеми с челюстната става.',
    treatable: 'Лечима с алайнери или брекети'
  },
  {
    title: 'Кръстосана захапка (crossbite)',
    description: 'Някои горни зъби захапват зад долните. Може да причини асиметрия на лицето и проблеми при дъвчене.',
    treatable: 'Лечима с алайнери или брекети'
  }
]

// FAQ questions as specified
const FAQS = [
  { 
    q: 'Алайнерите по-добри ли са от брекетите?', 
    a: 'Няма еднозначен отговор — зависи от вашия случай и предпочитания. Алайнерите са по-дискретни и комфортни и при опитен Invisalign provider могат да лекуват много сложни случаи благодарение на SmartTrack материала, attachments и ClinCheck планирането (изискват дисциплина). Брекетите работят 24/7 без нужда от дисциплина и могат да са по-предвидими при много тежки скелетни случаи. Най-важното е правилната диагноза от опитен ортодонт.' 
  },
  { 
    q: 'Колко време трае ортодонтското лечение?', 
    a: 'Обикновено 12-24 месеца за повечето случаи. Леките корекции могат да се завършат за 6-12 месеца. Сложните случаи могат да отнемат до 36 месеца. Продължителността зависи от индивидуалния план, определен от ортодонта.' 
  },
  { 
    q: 'Болезнено ли е ортодонтското лечение?', 
    a: 'Може да има лек дискомфорт в първите дни след поставяне на брекети или при смяна на алайнер. Това е нормално и преминава бързо. Съвременните методи са много по-комфортни от преди.' 
  },
  { 
    q: 'Кога децата трябва да посетят ортодонт?', 
    a: 'Препоръчва се първи преглед около 7-годишна възраст. При симптоми като дишане през устата, струпани зъби или проблеми със захапката — по-рано. Ранната оценка позволява превантивно лечение, ако е необходимо.' 
  },
  { 
    q: 'Колко струват алайнерите?', 
    a: 'Ориентировъчно €1 500 – €6 000, в зависимост от сложността на случая и избраната система. Точната цена се определя след клиничен преглед и план за лечение.' 
  },
  { 
    q: 'Коя марка алайнери е най-добра?', 
    a: 'Няма универсално "най-добра" марка. Invisalign, Spark и Angel Aligner са качествени системи. Най-важният фактор е опитът на ортодонта и правилната диагноза, а не самата марка.' 
  }
]

export default function OrthodonticsPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Ортодонтия', url: 'https://zubite.bg/orthodontics' }
  ])
  
  const faqSchema = generateFAQSchema(FAQS)
  
  const alignersPrice = TREATMENT_PRICES['orthodontics-aligners']
  const bracesPrice = TREATMENT_PRICES['orthodontics-braces']

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
      
      {/* 1. HERO Section */}
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
              <Smile className="w-10 h-10 text-teal-600" />
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-4">
              Алайнери или брекети — какво е подходящо за теб?
            </h1>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Разберете разликите, кога кой метод е подходящ, и митовете около ортодонтското лечение.
            </p>
            
            <Link
              href="/quiz"
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="hero-cta-quiz"
            >
              <Smile className="w-5 h-5" />
              Провери ситуацията си първо
            </Link>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-10 text-center">
            Как работи
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
          
          <div className="text-center mt-10">
            <Link
              href="/quiz"
              className="btn-primary inline-flex items-center justify-center gap-2 h-12 px-6"
              data-testid="how-it-works-cta"
            >
              Провери своя етап
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. ALIGNERS VS BRACES Section */}
      <section id="comparison" className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Алайнери vs Брекети
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Двата основни метода за ортодонтско лечение имат различни характеристики. Изборът зависи от вашия случай и предпочитания.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aligners Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  {ALIGNERS_VS_BRACES.aligners.title}
                </h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-emerald-600 mb-2">Предимства:</p>
                <ul className="space-y-2">
                  {ALIGNERS_VS_BRACES.aligners.pros.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="text-sm font-medium text-red-600 mb-2">Недостатъци:</p>
                <ul className="space-y-2">
                  {ALIGNERS_VS_BRACES.aligners.cons.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Braces Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Smile className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  {ALIGNERS_VS_BRACES.braces.title}
                </h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-emerald-600 mb-2">Предимства:</p>
                <ul className="space-y-2">
                  {ALIGNERS_VS_BRACES.braces.pros.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="text-sm font-medium text-red-600 mb-2">Недостатъци:</p>
                <ul className="space-y-2">
                  {ALIGNERS_VS_BRACES.braces.cons.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-slate-500 mb-4">Не сте сигурни кой метод е за вас?</p>
            <Link
              href="/quiz"
              className="text-teal-600 font-medium hover:text-teal-700 inline-flex items-center gap-2"
            >
              Провери на кой етап си
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. ALIGNER BRANDS Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Марки алайнери
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Invisalign, Spark и Angel Aligner са популярни системи в България. Ето кратко сравнение.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ALIGNER_BRANDS.map((brand) => (
              <div key={brand.slug} className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <h3 className="font-serif text-xl font-semibold text-slate-900 mb-4 text-center">
                  {brand.name}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Подходящи случаи</p>
                    <p className="text-sm text-slate-700">{brand.suitableCases}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Наличност в България</p>
                    <p className="text-sm text-slate-700">{brand.availability}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Цена</p>
                    <p className="font-semibold text-teal-600">{brand.priceRange}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Brand Disclaimer */}
          <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-sm">{BRAND_COMPARISON_DISCLAIMER}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRICES Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Ориентировъчни цени
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aligners Price */}
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-teal-200" />
                <h3 className="font-medium text-lg">Алайнери</h3>
              </div>
              <div className="text-3xl font-bold mb-1">
                €{alignersPrice.minEUR.toLocaleString('bg-BG')} – €{alignersPrice.maxEUR.toLocaleString('bg-BG')}
              </div>
            </div>
            
            {/* Braces Price */}
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Smile className="w-6 h-6 text-slate-300" />
                <h3 className="font-medium text-lg">Брекети</h3>
              </div>
              <div className="text-3xl font-bold mb-1">
                €{bracesPrice.minEUR.toLocaleString('bg-BG')} – €{bracesPrice.maxEUR.toLocaleString('bg-BG')}
              </div>
            </div>
          </div>
          
          <p className="text-sm text-slate-500 text-center mt-6">
            {PRICE_DISCLAIMER} Точната цена се определя след клиничен преглед.
          </p>
        </div>
      </section>

      {/* 6. COMMON ORTHODONTIC PROBLEMS Section (SEO) */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Чести ортодонтски проблеми
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Ортодонтското лечение може да коригира различни проблеми с подреждането на зъбите и захапката.
          </p>
          
          <div className="space-y-4">
            {ORTHO_PROBLEMS.map((problem, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <h3 className="font-medium text-lg text-slate-900 mb-2">{problem.title}</h3>
                <p className="text-slate-600 text-sm mb-3">{problem.description}</p>
                <div className="flex items-center gap-2 text-sm text-teal-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>{problem.treatable}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CHILDREN ORTHODONTICS Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Baby className="w-8 h-8 text-teal-600" />
            </div>
            
            <div className="flex-1">
              <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4">
                Ортодонтия при деца
              </h2>
              <p className="text-slate-600 mb-6">
                Препоръчва се първи преглед при ортодонт около 7-годишна възраст. Ранната оценка позволява навременно лечение, ако е необходимо.
              </p>
              
              <h3 className="font-medium text-slate-900 mb-3">Кога да заведете детето на преглед:</h3>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>Дишане през устата</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>Струпани или криви зъби</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>Проблеми със захапката</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>Затруднения при дъвчене</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>Рано или късно падане на млечни зъби</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>Смучене на палец след 5г.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. DECISION Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 md:p-10 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Какво ще научите от теста
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 text-left">
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-medium mb-2">Подходящо лечение</h3>
                <p className="text-teal-100 text-sm">Дали алайнери или брекети са по-подходящи за вашия случай.</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-medium mb-2">Сложност на случая</h3>
                <p className="text-teal-100 text-sm">Обща оценка на сложността и очаквана продължителност.</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-medium mb-2">Ориентировъчна цена</h3>
                <p className="text-teal-100 text-sm">Какво да очаквате като бюджет за лечението.</p>
              </div>
            </div>
            
            <Link
              href="/quiz"
              className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-teal-600 font-medium hover:bg-teal-50"
              data-testid="decision-cta-quiz"
            >
              Провери на кой етап си
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Често задавани въпроси
          </h2>
          
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      {/* FINAL CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Smile className="w-16 h-16 text-teal-500 mx-auto mb-6" />
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4">
            Не знаеш откъде да започнеш?
          </h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            Провери ситуацията си първо и разбери на какъв етап може да си. След това ще ти помогнем да намериш подходящи опции.
          </p>
          <Link
            href="/quiz"
            className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
            data-testid="final-cta-quiz"
          >
            <Smile className="w-5 h-5" />
            Провери ситуацията си първо
          </Link>
          
          {/* Disclaimer */}
          <p className="text-xs text-slate-400 mt-8">
            {EDUCATIONAL_DISCLAIMER}
          </p>
        </div>
      </section>

      <Footer treatmentSlug="orthodontics" />
    </main>
  )
}
