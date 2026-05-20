import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS } from '@/lib/data'
import { PRICE_DISCLAIMER, EDUCATIONAL_DISCLAIMER } from '@/lib/pricing'
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, Heart, Info, Users, Sparkles, Palette, Sun, Crown, AlertCircle, Clock, Banknote, Shield, Zap } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

const treatment = TREATMENTS['cosmetic-dentistry']

export const metadata: Metadata = {
  title: 'Естетична стоматология | Фасети, бондинг, избелване и цени | Zubite.bg',
  description: 'Научете повече за фасети, бондинг, избелване и smile design. Вижте ориентировъчни цени и разберете кое е подходящо за вашата усмивка.',
  keywords: 'естетична стоматология, фасети, фасети цена, бондинг, бондинг цена, избелване на зъби, избелване цена, Hollywood Smile, smile design',
  alternates: {
    canonical: 'https://zubite.bg/cosmetic-dentistry',
  },
  openGraph: {
    title: 'Естетична стоматология | Фасети, бондинг, избелване | Zubite.bg',
    description: 'Научете повече за фасети, бондинг, избелване и smile design. Вижте ориентировъчни цени и разберете кое е подходящо за вашата усмивка.',
    url: 'https://zubite.bg/cosmetic-dentistry',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

// Trust cards for hero
const TRUST_CARDS = [
  { icon: Info, title: 'Различни решения според проблема' },
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
    description: 'Помагаме ви да разберете кои процедури може да са подходящи.' 
  },
  { 
    step: '3', 
    title: 'Избор на специалист', 
    description: 'По желание: свързваме ви с подходящ специалист.' 
  }
]

// What cosmetic dentistry can help with
const COSMETIC_CONCERNS = [
  { icon: Sun, title: 'Петна и потъмняване', description: 'Обезцветяване от кафе, чай, тютюн или възрастта.' },
  { icon: Shield, title: 'Малки отчупвания', description: 'Дребни счупвания или неравности по ръба на зъбите.' },
  { icon: Palette, title: 'Неравна форма', description: 'Зъби с асиметрична или неправилна форма.' },
  { icon: Sparkles, title: 'Малки разстояния', description: 'Пространства между зъбите (диастеми).' },
  { icon: Zap, title: 'Визуално къси зъби', description: 'Зъби, които изглеждат прекалено къси.' },
  { icon: Heart, title: 'Желание за хармонична усмивка', description: 'Цялостно подобрение на външния вид на усмивката.' }
]

// Which treatment fits which problem
const TREATMENT_OPTIONS = [
  { 
    icon: Sun, 
    title: 'Избелване', 
    description: 'При петна и потъмняване. Изсветлява зъбите с няколко нюанса.',
    suitable: 'Подходящо при здрави зъби без кариеси'
  },
  { 
    icon: Shield, 
    title: 'Композитен бондинг', 
    description: 'При малки отчупвания, корекции и затваряне на малки пространства.',
    suitable: 'Бързо и минимално инвазивно решение'
  },
  { 
    icon: Crown, 
    title: 'Порцеланови фасети', 
    description: 'При по-голяма промяна във форма, цвят и визия.',
    suitable: 'По-трайно решение за значителни промени'
  },
  { 
    icon: Sparkles, 
    title: 'Smile design / Hollywood Smile', 
    description: 'При цялостна трансформация на усмивката.',
    suitable: 'Комплексно решение с множество фасети или коронки'
  }
]

// Veneers vs Bonding comparison
const VENEERS_VS_BONDING = {
  veneers: {
    title: 'Порцеланови фасети',
    price: '€200 – €600 / зъб',
    invasiveness: 'Изисква подготовка на зъба',
    durability: '10-15+ години',
    speed: '2-3 посещения',
    suitable: 'По-големи промени, трайност'
  },
  bonding: {
    title: 'Композитен бондинг',
    price: '€75 – €200 / зъб',
    invasiveness: 'Минимално инвазивно',
    durability: '5-10 години',
    speed: '1 посещение',
    suitable: 'Малки корекции, бюджет'
  }
}

// When cosmetic dentistry is not the first step
const FIRST_STEPS = [
  { title: 'Ортодонтия', description: 'При криви зъби или проблеми със захапката може първо да е нужно изправяне.' },
  { title: 'Лечение на венци', description: 'Здравите венци са основа за естетичните процедури.' },
  { title: 'Корекция на захапката', description: 'Неправилната захапка може да компрометира естетичните резултати.' },
  { title: 'Възстановително лечение', description: 'Кариеси и пломби трябва да се адресират преди козметика.' }
]

// Prices (EUR primary, BGN secondary)
const COSMETIC_PRICES = [
  { 
    title: 'Професионално избелване', 
    eurMin: 100, 
    eurMax: 250, 
    bgnMin: 200, 
    bgnMax: 500,
    note: null
  },
  { 
    title: 'Порцеланови фасети', 
    eurMin: 200, 
    eurMax: 600, 
    bgnMin: 400, 
    bgnMax: 1200,
    note: '/ зъб'
  },
  { 
    title: 'Композитен бондинг', 
    eurMin: 75, 
    eurMax: 200, 
    bgnMin: 150, 
    bgnMax: 400,
    note: '/ зъб'
  },
  { 
    title: 'Hollywood Smile', 
    eurMin: 4000, 
    eurMax: 10000, 
    bgnMin: 8000, 
    bgnMax: 20000,
    note: null
  }
]

// Who this is suitable for
const SUITABLE_FOR = [
  'Хора, които искат да подобрят цвета на зъбите си',
  'Пациенти с малки естетични несъвършенства',
  'Тези, които търсят бърза визуална промяна',
  'Хора с добро орално здраве и желание за по-уверена усмивка'
]

// FAQ
const FAQS = [
  { 
    q: 'Каква е цената на фасети в България?', 
    a: 'Цената на порцеланови фасети варира между €200 и €600 на зъб, в зависимост от материала, лабораторията и клиниката. Hollywood Smile с 8-10 фасети може да струва €4 000 – €10 000.' 
  },
  { 
    q: 'Колко издържа бондингът?', 
    a: 'Композитният бондинг обикновено издържа 5-10 години при правилна грижа. Издръжливостта зависи от мястото на зъба, хранителните навици и оралната хигиена.' 
  },
  { 
    q: 'Каква е разликата между фасети и бондинг?', 
    a: 'Фасетите са тънки порцеланови пластини, които покриват предната повърхност на зъба. Те са по-трайни (10-15+ години) и по-устойчиви на оцветяване. Бондингът използва композитна смола и е по-бърз и достъпен, но по-малко траен (5-10 години).' 
  },
  { 
    q: 'Болезнени ли са естетичните процедури?', 
    a: 'В много случаи естетичните процедури са минимално или напълно безболезнени. Избелването може да причини временна чувствителност. Бондингът рядко изисква упойка. При фасети може да има лек дискомфорт при подготовката.' 
  },
  { 
    q: 'Може ли избелването да увреди зъбите?', 
    a: 'Професионалното избелване под надзора на зъболекар е безопасно и не уврежда емайла. Възможна е временна чувствителност, която преминава. Избягвайте продукти за самолечение без консултация.' 
  },
  { 
    q: 'Кога първо трябва ортодонтия вместо фасети?', 
    a: 'Ако имате значително криви зъби или проблеми със захапката, ортодонтията може да е по-подходящият първи избор. Фасетите не коригират позицията на зъбите. След преглед специалистът ще препоръча правилната последователност.' 
  }
]

export default function CosmeticDentistryPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Естетична стоматология', url: 'https://zubite.bg/cosmetic-dentistry' }
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
              <Heart className="w-10 h-10 text-teal-600" />
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-4">
              Естетична стоматология – бондинг, фасети, избелване и smile design
            </h1>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Разберете кои естетични процедури са подходящи за вашата усмивка и какви са ориентировъчните цени в България.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link
                href="/cosmetic-dentistry/quiz"
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

      {/* SECTION 3 — WHAT COSMETIC DENTISTRY CAN HELP WITH */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Какво може да подобри естетичната стоматология
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Естетичните процедури адресират разнообразни козметични проблеми с усмивката.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COSMETIC_CONCERNS.map((concern, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <concern.icon className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 mb-1">{concern.title}</h3>
                  <p className="text-sm text-slate-500">{concern.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHICH TREATMENT FITS WHICH PROBLEM */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-10 text-center">
            Кое лечение е подходящо за кой проблем
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

      {/* SECTION 5 — VENEERS VS BONDING */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Фасети или бондинг?
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Изборът зависи от вашите цели, бюджет и състоянието на зъбите. Ето основните разлики:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Veneers */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-serif text-xl font-semibold text-slate-900 mb-4 text-center">
                {VENEERS_VS_BONDING.veneers.title}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Цена</p>
                    <p className="text-slate-700">{VENEERS_VS_BONDING.veneers.price}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Инвазивност</p>
                    <p className="text-slate-700">{VENEERS_VS_BONDING.veneers.invasiveness}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Издръжливост</p>
                    <p className="text-slate-700">{VENEERS_VS_BONDING.veneers.durability}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Скорост</p>
                    <p className="text-slate-700">{VENEERS_VS_BONDING.veneers.speed}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-teal-600 font-medium">
                    Подходящо за: {VENEERS_VS_BONDING.veneers.suitable}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bonding */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-serif text-xl font-semibold text-slate-900 mb-4 text-center">
                {VENEERS_VS_BONDING.bonding.title}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Цена</p>
                    <p className="text-slate-700">{VENEERS_VS_BONDING.bonding.price}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Инвазивност</p>
                    <p className="text-slate-700">{VENEERS_VS_BONDING.bonding.invasiveness}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Издръжливост</p>
                    <p className="text-slate-700">{VENEERS_VS_BONDING.bonding.durability}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Скорост</p>
                    <p className="text-slate-700">{VENEERS_VS_BONDING.bonding.speed}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-emerald-600 font-medium">
                    Подходящо за: {VENEERS_VS_BONDING.bonding.suitable}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — WHEN COSMETIC DENTISTRY IS NOT THE FIRST STEP */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Понякога естетиката не е първата стъпка
          </h2>
          <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
            Преди естетично лечение някои пациенти може първо да се нуждаят от:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIRST_STEPS.map((step, index) => (
              <div key={index} className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800 mb-1">{step.title}</h3>
                  <p className="text-sm text-amber-700">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-slate-500 text-center mt-6">
            След преглед и диагностика специалистът ще препоръча правилната последователност на лечение.
          </p>
        </div>
      </section>

      {/* SECTION 7 — SERVICES AND INDICATIVE PRICES */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Услуги и ориентировъчни цени
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COSMETIC_PRICES.map((price, index) => (
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
            За кого е подходяща естетичната стоматология
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
              Резултатът зависи от началното състояние на зъбите и индивидуалните характеристики. Всяко лечение изисква предварителна оценка.
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
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Направете първата стъпка към по-уверена усмивка
            </h2>
            <p className="text-teal-100 mb-8 max-w-lg mx-auto">
              Преминете през нашата кратка оценка, за да разберете кое лечение е подходящо за вас.
            </p>
            <Link 
              href="/cosmetic-dentistry/quiz"
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

      <Footer treatmentSlug="cosmetic-dentistry" />
    </main>
  )
}
