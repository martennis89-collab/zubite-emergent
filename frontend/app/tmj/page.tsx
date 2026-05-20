import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS } from '@/lib/data'
import { PRICE_DISCLAIMER, EDUCATIONAL_DISCLAIMER } from '@/lib/pricing'
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, Info, Users, Bone, AlertCircle, Clock, Banknote, Shield, Zap, Activity, Brain, HeartPulse, Ear } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

const treatment = TREATMENTS.tmj

export const metadata: Metadata = {
  title: 'TMJ дисфункция | Болка в челюстта, шини и цени | Zubite.bg',
  description: 'Научете повече за TMJ дисфункцията – болка в челюстта, щракане, главоболие. Вижте лечения, шини и ориентировъчни цени в България.',
  keywords: 'TMJ, TMJ дисфункция, болка в челюстта, щракане в челюстта, челюстна става, бруксизъм, шина за зъби, оклузална шина, нощна шина',
  alternates: {
    canonical: 'https://zubite.bg/tmj',
  },
  openGraph: {
    title: 'TMJ дисфункция | Болка в челюстта и лечение | Zubite.bg',
    description: 'Научете повече за TMJ дисфункцията – болка в челюстта, щракане, главоболие. Вижте лечения и ориентировъчни цени.',
    url: 'https://zubite.bg/tmj',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

// Trust cards for hero
const TRUST_CARDS = [
  { icon: Info, title: 'Информация за симптоми и лечения' },
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
    description: 'Помагаме ви да разберете кои лечения може да са подходящи.' 
  },
  { 
    step: '3', 
    title: 'Избор на специалист', 
    description: 'По желание: свързваме ви с подходящ специалист.' 
  }
]

// TMJ symptoms
const TMJ_SYMPTOMS = [
  { icon: Activity, title: 'Болка в челюстта', description: 'Болка в областта на челюстната става, особено при дъвчене.' },
  { icon: Zap, title: 'Щракане или скърцане', description: 'Звуци при отваряне и затваряне на устата.' },
  { icon: Brain, title: 'Главоболие', description: 'Чести главоболия, особено сутрин или в края на деня.' },
  { icon: Ear, title: 'Болка в ушите', description: 'Болка в или около ушите без признаци на инфекция.' },
  { icon: AlertCircle, title: 'Затруднено отваряне', description: 'Блокиране или ограничено движение на челюстта.' },
  { icon: HeartPulse, title: 'Напрежение в лицето', description: 'Умора и напрежение в лицевите мускули.' }
]

// Treatment options
const TREATMENT_OPTIONS = [
  { 
    icon: Shield, 
    title: 'Стабилизираща шина (сплинт)', 
    description: 'Апарат за нощно носене, който намалява натиска върху ставата и релаксира мускулите.',
    suitable: 'Основен метод на лечение за повечето случаи'
  },
  { 
    icon: Clock, 
    title: 'Нощна шина при бруксизъм', 
    description: 'Защитава зъбите от износване при скърцане и стискане по време на сън.',
    suitable: 'При диагностициран бруксизъм'
  },
  { 
    icon: Activity, 
    title: 'Физиотерапия', 
    description: 'Упражнения за укрепване и релаксация на челюстните мускули.',
    suitable: 'В комбинация с други методи'
  },
  { 
    icon: Zap, 
    title: 'Медикаментозно лечение', 
    description: 'Противовъзпалителни средства и мускулни релаксанти при остри симптоми.',
    suitable: 'За краткосрочно облекчение'
  }
]

// Splint vs Night guard comparison
const SPLINT_VS_NIGHTGUARD = {
  splint: {
    title: 'Стабилизираща шина',
    price: '€150 – €400',
    purpose: 'Терапевтично лечение на TMJ',
    duration: '3-12 месеца носене',
    fitting: 'Многократни настройки',
    suitable: 'TMJ дисфункция, болка в ставата'
  },
  nightguard: {
    title: 'Нощна шина',
    price: '€100 – €250',
    purpose: 'Защита на зъбите от скърцане',
    duration: 'Постоянно нощно носене',
    fitting: 'Минимални настройки',
    suitable: 'Бруксизъм, защита на емайла'
  }
}

// Causes of TMJ
const TMJ_CAUSES = [
  { title: 'Стрес', description: 'Води до стискане на зъбите и напрежение в мускулите.' },
  { title: 'Бруксизъм', description: 'Скърцане и стискане на зъбите, често несъзнателно.' },
  { title: 'Неправилна захапка', description: 'Може да създава неравномерен натиск върху ставата.' },
  { title: 'Травма', description: 'Удар в челюстта или лицето може да увреди ставата.' }
]

// Prices (EUR primary, BGN secondary)
const TMJ_PRICES = [
  { 
    title: 'Стабилизираща шина (сплинт)', 
    eurMin: 150, 
    eurMax: 400, 
    bgnMin: 300, 
    bgnMax: 800,
    note: null
  },
  { 
    title: 'Нощна шина', 
    eurMin: 100, 
    eurMax: 250, 
    bgnMin: 200, 
    bgnMax: 500,
    note: null
  },
  { 
    title: 'Комплексна TMJ терапия', 
    eurMin: 250, 
    eurMax: 750, 
    bgnMin: 500, 
    bgnMax: 1500,
    note: 'диагностика + лечение + проследяване'
  },
  { 
    title: 'Консултация TMJ специалист', 
    eurMin: 40, 
    eurMax: 100, 
    bgnMin: 80, 
    bgnMax: 200,
    note: null
  }
]

// Who this is suitable for
const SUITABLE_FOR = [
  'Хора с болка в челюстта или лицето',
  'Пациенти със щракане при отваряне на устата',
  'Тези, които скърцат или стискат зъбите си',
  'Хора с чести главоболия, свързани с напрежение'
]

// FAQ
const FAQS = [
  { 
    q: 'Какво представлява TMJ дисфункцията?', 
    a: 'TMJ (темпоромандибуларна) дисфункция засяга ставата, която свързва долната челюст с черепа. Симптомите включват болка в челюстта, щракане, главоболие и затруднено дъвчене. Причините могат да бъдат стрес, бруксизъм, травма или неправилна захапка.' 
  },
  { 
    q: 'Как се лекува TMJ дисфункция?', 
    a: 'Лечението обикновено започва консервативно – шини, физиотерапия, упражнения и промяна в навиците. Стабилизиращата шина (сплинт) е основен метод, който релаксира мускулите и намалява натиска върху ставата. В повечето случаи това е достатъчно.' 
  },
  { 
    q: 'Каква е разликата между шина и сплинт?', 
    a: 'Нощната шина основно защитава зъбите от износване при скърцане. Стабилизиращият сплинт е терапевтично устройство, което цели да промени позицията на челюстта и да релаксира мускулите. Сплинтът изисква по-чести настройки и проследяване.' 
  },
  { 
    q: 'Колко време трае лечението на TMJ?', 
    a: 'Лечението обикновено продължава 3-12 месеца в зависимост от тежестта. Много пациенти усещат подобрение след 2-4 седмици. Някои може да се нуждаят от дългосрочно нощно носене на шина за предотвратяване на рецидиви.' 
  },
  { 
    q: 'Може ли стресът да причини TMJ проблеми?', 
    a: 'Да, стресът е една от основните причини за TMJ дисфункция. Той води до несъзнателно стискане и скърцане на зъбите, особено през нощта. Управлението на стреса е важна част от цялостното лечение.' 
  },
  { 
    q: 'Може ли TMJ дисфункцията да се излекува напълно?', 
    a: 'При повечето пациенти симптомите значително намаляват или изчезват с правилно лечение. Някои може да се нуждаят от поддържащо носене на шина. Важно е да се адресират причините (стрес, бруксизъм), а не само симптомите.' 
  }
]

export default function TMJPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'TMJ / Челюстни стави', url: 'https://zubite.bg/tmj' }
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
              <Bone className="w-10 h-10 text-teal-600" />
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-4">
              TMJ дисфункция – болка в челюстта, щракане и лечение
            </h1>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Разберете какви са причините за болката в челюстта и какви лечения са налични. Вижте ориентировъчни цени в България.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link
                href="/tmj/quiz"
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
            Типични симптоми на TMJ дисфункция
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Ако разпознавате тези симптоми, консултация със специалист може да помогне.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TMJ_SYMPTOMS.map((symptom, index) => (
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
            Методи на лечение
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

      {/* SECTION 5 — SPLINT VS NIGHT GUARD */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Стабилизираща шина или нощна шина?
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            Изборът зависи от вашия проблем. Ето основните разлики:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stabilizing Splint */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-serif text-xl font-semibold text-slate-900 mb-4 text-center">
                {SPLINT_VS_NIGHTGUARD.splint.title}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Цена</p>
                    <p className="text-slate-700">{SPLINT_VS_NIGHTGUARD.splint.price}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Цел</p>
                    <p className="text-slate-700">{SPLINT_VS_NIGHTGUARD.splint.purpose}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Продължителност</p>
                    <p className="text-slate-700">{SPLINT_VS_NIGHTGUARD.splint.duration}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Настройки</p>
                    <p className="text-slate-700">{SPLINT_VS_NIGHTGUARD.splint.fitting}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-teal-600 font-medium">
                    Подходящо за: {SPLINT_VS_NIGHTGUARD.splint.suitable}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Night Guard */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-serif text-xl font-semibold text-slate-900 mb-4 text-center">
                {SPLINT_VS_NIGHTGUARD.nightguard.title}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Цена</p>
                    <p className="text-slate-700">{SPLINT_VS_NIGHTGUARD.nightguard.price}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Цел</p>
                    <p className="text-slate-700">{SPLINT_VS_NIGHTGUARD.nightguard.purpose}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Продължителност</p>
                    <p className="text-slate-700">{SPLINT_VS_NIGHTGUARD.nightguard.duration}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Настройки</p>
                    <p className="text-slate-700">{SPLINT_VS_NIGHTGUARD.nightguard.fitting}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-emerald-600 font-medium">
                    Подходящо за: {SPLINT_VS_NIGHTGUARD.nightguard.suitable}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — CAUSES */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Какво причинява TMJ дисфункция
          </h2>
          <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
            Разбирането на причините помага за по-ефективно лечение:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TMJ_CAUSES.map((item, index) => (
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
            Специалистът ще помогне да се определи причината и подходящия план за лечение.
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
            {TMJ_PRICES.map((price, index) => (
              <div key={index} className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
                <h3 className="font-medium text-lg mb-3 text-teal-100">
                  {price.title}
                  {price.note && <span className="text-teal-200 text-sm block mt-1">{price.note}</span>}
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
            За кого е подходящо TMJ лечение
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
              Резултатът зависи от индивидуалния случай. Повечето пациенти усещат значително подобрение с консервативно лечение.
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
            <Bone className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Облекчете болката в челюстта
            </h2>
            <p className="text-teal-100 mb-8 max-w-lg mx-auto">
              Преминете през нашата кратка оценка, за да разберете кое лечение е подходящо за вас.
            </p>
            <Link 
              href="/tmj/quiz"
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

      <Footer treatmentSlug="tmj" />
    </main>
  )
}
