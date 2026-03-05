import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, ArrowLeft, MapPin, Users, Award, Target } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

const treatment = TREATMENTS.implants

export const metadata: Metadata = {
  title: `${treatment.fullName} | Трайно решение | Zubite.bg`,
  description: `${treatment.description}. Научете за зъбни импланти в България - цени, методи, процес. Straumann, Nobel Biocare и други марки.`,
  alternates: {
    canonical: 'https://zubite.bg/implants',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/implants',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
}

const BENEFITS = [
  { title: 'Изглеждат естествено', description: 'Коронката върху импланта е неразличима от естествените ви зъби.' },
  { title: 'Функционират като истински', description: 'Дъвчете, говорете и се усмихвайте с пълна увереност.' },
  { title: 'Дълготрайни', description: 'При правилна грижа имплантите могат да издържат цял живот.' },
  { title: 'Защитават костта', description: 'Предотвратяват загубата на костна тъкан, която настъпва при липсващи зъби.' }
]

const PROCESS = [
  { step: 1, title: 'Диагностика', description: 'CBCT сканиране и подробна оценка на костната плътност и структура.' },
  { step: 2, title: 'Планиране', description: '3D планиране на позицията на импланта за оптимален резултат.' },
  { step: 3, title: 'Хирургия', description: 'Поставяне на титановия имплант в челюстната кост под местна упойка.' },
  { step: 4, title: 'Остеоинтеграция', description: '3-6 месеца за срастване на импланта с костта.' },
  { step: 5, title: 'Коронка', description: 'Поставяне на индивидуално изработена керамична коронка.' }
]

const IDEAL_FOR = [
  'Хора с един или повече липсващи зъби',
  'Тези, които искат постоянно решение',
  'Хора с достатъчна костна плътност',
  'Некомфортни с подвижни протези',
  'Тези, които искат да запазят здравината на съседните зъби'
]

const FAQS = [
  { q: 'Болезнена ли е процедурата?', a: 'Процедурата се извършва под местна упойка и е безболезнена. След операцията може да има лек дискомфорт за няколко дни, който се контролира с обезболяващи.' },
  { q: 'Колко дълго траят имплантите?', a: 'При правилна хигиена и редовни прегледи, имплантите могат да издържат повече от 25 години или дори цял живот.' },
  { q: 'Какво ако нямам достатъчно кост?', a: 'Възможни са процедури за костна аугментация преди поставяне на импланта. Това добавя 3-6 месеца към общото време за лечение.' },
  { q: 'Мога ли да поставя имплант веднага след изваждане на зъб?', a: 'В някои случаи да - това се нарича "незабавна имплантация" и зависи от състоянието на костта и меките тъкани.' },
  { q: 'Какви марки импланти се използват?', a: 'Клиниките работят с водещи марки като Straumann, Nobel Biocare, Osstem и др. Изборът зависи от вашия случай и бюджет.' }
]

const STATS = [
  { value: '98%', label: 'Успеваемост' },
  { value: '25+', label: 'Години издръжливост' },
  { value: '#1', label: 'Избор на стоматолозите' }
]

export default function ImplantsPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Зъбни импланти', url: 'https://zubite.bg/implants' }
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
              <Target className="w-10 h-10 text-sky-600" />
            </div>
            
            <div className="flex-1">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-2">
                {treatment.fullName}
              </h1>
              <p className="text-lg text-sky-600 font-medium mb-4">Трайно решение за липсващи зъби</p>
              <p className="text-slate-600 leading-relaxed">
                Зъбните импланти са златен стандарт за заместване на липсващи зъби. Титановият имплант се интегрира с костта 
                и служи като здрава основа за коронка, която изглежда и функционира като естествен зъб.
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
              href="/implants/quiz"
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="cta-quiz"
            >
              <Target className="w-5 h-5" />
              Направете безплатна оценка
            </Link>
            <Link
              href="#methods"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              Методи и цени
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Предимства
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFITS.map((benefit, index) => (
              <div 
                key={index}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-200 card-hover-subtle"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-1">{benefit.title}</h3>
                    <p className="text-sm text-slate-500">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Процес на лечение
          </h2>
          
          <div className="relative">
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-sky-200" />
            
            <div className="space-y-6">
              {PROCESS.map((step, index) => (
                <div key={index} className="relative flex gap-6">
                  <div className="hidden md:flex w-16 h-16 rounded-full bg-sky-500 text-white items-center justify-center text-xl font-bold flex-shrink-0 z-10">
                    {step.step}
                  </div>
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 card-hover-subtle">
                    <div className="md:hidden w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center text-lg font-bold mb-3">
                      {step.step}
                    </div>
                    <h3 className="font-medium text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Methods & Pricing */}
      <section id="methods" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Методи и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {[
              { name: 'Единичен имплант + коронка', desc: 'Пълно решение за един липсващ зъб', price: '1,500 - 3,500 лв' },
              { name: 'Мост върху импланти', desc: 'За няколко съседни липсващи зъби', price: '3,000 - 7,000 лв' },
              { name: 'All-on-4', desc: 'Пълна челюст върху 4 импланта', price: '8,000 - 15,000 лв' },
              { name: 'All-on-6', desc: 'Пълна челюст върху 6 импланта', price: '10,000 - 20,000 лв' }
            ].map((method, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-slate-900 text-lg">{method.name}</h3>
                  <p className="text-slate-500">{method.desc}</p>
                </div>
                <div className="text-sky-600 font-semibold whitespace-nowrap">
                  {method.price}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 text-center mt-6">
            * Цените са ориентировъчни и варират според клиниката, марката на импланта и сложността на случая
          </p>
        </div>
      </section>

      {/* Ideal For Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Подходящо за
          </h2>
          
          <div className="bg-sky-50 rounded-2xl border border-sky-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-sky-600" />
              <span className="font-medium text-slate-900">
                Това лечение е идеално за:
              </span>
            </div>
            <ul className="space-y-3">
              {IDEAL_FOR.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* City Links */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Намерете клиника по град
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(CITIES).map((city) => (
              <Link
                key={city.slug}
                href={`/${city.slug}/implants`}
                className="city-card group bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 text-center"
                data-testid={`city-${city.slug}`}
              >
                <div className="city-icon w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-medium text-slate-900">{city.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Импланти в {city.name}</p>
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

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Възстановете усмивката си
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto">
              Преминете през нашата кратка оценка, за да разберете дали зъбните импланти са подходящи за вас.
            </p>
            <Link 
              href="/implants/quiz"
              className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-sky-600 font-medium hover:bg-sky-50"
              data-testid="start-quiz-cta"
            >
              Направете безплатна оценка
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
