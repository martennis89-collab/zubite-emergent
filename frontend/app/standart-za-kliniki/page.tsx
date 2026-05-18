import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ClinicStandardSection } from '@/components/patient/ClinicStandardSection'
import { ShieldCheck, ArrowRight, AlertTriangle, Gift, RefreshCw, ChevronDown, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Стандарт за партньорски клиники | Zubite.bg',
  description: 'Виж как Zubite.bg подбира партньорските клиники според качество на работа, отношение към пациента и професионализъм. Ориентир, не диагноза.',
  alternates: { canonical: 'https://zubite.bg/standart-za-kliniki' },
  openGraph: {
    title: 'Стандарт за партньорски клиники | Zubite.bg',
    description: 'Как подбираме партньорските клиники: качество на работа, отношение към пациента, професионализъм.',
    url: 'https://zubite.bg/standart-za-kliniki',
    type: 'article',
  },
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Какво означава партньорска клиника в Zubite.bg?',
    a: 'Партньорска клиника е клиника, която покрива Zubite стандарт за участие — качество на работа, отношение към пациента и професионализъм. Това не означава, че Zubite поставя диагноза или гарантира резултат от лечение.',
  },
  {
    q: 'Не всяка клиника ли може да участва?',
    a: 'Не. Работим с ограничен брой партньорски клиники, които покриват критериите ни за участие. Идеята е партньорската мрежа да е подбрана, а не отворен каталог.',
  },
  {
    q: 'Zubite.bg гарантира ли резултат от лечение?',
    a: 'Не. Zubite.bg не поставя диагноза, не гарантира медицински резултат и не заменя преглед при стоматолог. Помагаме ти да започнеш от по-информиран и по-смислен първи разговор.',
  },
  {
    q: 'Какво гледате при подбора на клиники?',
    a: 'Релевантност към типа случай, яснота на услугите, комуникация с пациента, професионализъм и спазване на платформените правила. Не оценяваме медицинско качество — това остава клинична преценка.',
  },
  {
    q: 'Влияе ли платено участие на насочването?',
    a: 'Спонсорираните позиции, когато съществуват, са винаги ясно обозначени. Релевантността към случая, посоката от въпросника и локацията определят кои клиники се показват. Платено участие не купува скрита класация.',
  },
  {
    q: 'Какво е Care Pass?',
    a: 'Zubite Care Pass е допълнителна стойност за пациента, която Zubite.bg организира чрез партньорства с брандове в сферата на оралната хигиена и денталната грижа. Партньорската клиника предоставя Care Pass на пациента след реално посетена консултация чрез Zubite.bg. Care Pass не е отстъпка от лечение, не е застрахователен продукт и не променя медицинската преценка.',
  },
  {
    q: 'Какво се случва, ако клиника не спазва стандарта?',
    a: 'Участието на клиника в Zubite.bg може да бъде преразгледано, ако пациентската комуникация се влоши, ако информацията не се поддържа коректна или ако клиниката не отговаря на платформените правила. Целта е стандартът да остане смислен във времето.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Стандарт за партньорски клиники на Zubite.bg',
  url: 'https://zubite.bg/standart-za-kliniki',
  description:
    'Канонично обяснение на стандарта на Zubite.bg за подбор на партньорски клиники: качество на работа, отношение към пациента, професионализъм.',
  inLanguage: 'bg',
}

interface DefinitionBlock { eyebrow: string; body: string }
const DEFINITIONS: DefinitionBlock[] = [
  {
    eyebrow: 'Партньорска клиника',
    body: 'Партньорска клиника в Zubite.bg е клиника, която покрива Zubite стандарт за участие: качество на работа, отношение към пациента и професионализъм. Това не означава, че Zubite поставя диагноза или гарантира резултат от лечение.',
  },
  {
    eyebrow: 'Как подбираме',
    body: 'Zubite.bg подбира клиники според релевантност към типа случай, яснота на услугите, комуникация с пациента, професионализъм и спазване на платформените правила.',
  },
  {
    eyebrow: 'Какво НЕ означава',
    body: 'Партньорството не означава „най-добра клиника", гарантиран резултат или медицинска диагноза онлайн. То означава участие в по-структуриран пациентски процес с повече контекст и ясна комуникация.',
  },
]

export default function ClinicStandardPage() {
  return (
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden" data-testid="clinic-standard-page">
      <Header />

      {/* JSON-LD: FAQ + WebPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-12">
        <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute top-10 -right-32 w-[30rem] h-[30rem] rounded-full bg-cyan-100/35 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/65 backdrop-blur-md ring-1 ring-white/70 text-teal-700 text-[11px] uppercase tracking-[0.2em] font-semibold px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zubite стандарт
          </span>
          <h1 className="mt-6 font-serif text-4xl sm:text-5xl font-semibold text-slate-900 leading-[1.05] tracking-tight text-balance">
            Стандарт за партньорски клиники на{' '}
            <span className="text-teal-600">Zubite.bg</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Канонично обяснение как подбираме партньорските клиники, какво
            означава партньорството и какво <em>не</em> означава.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            <span>Ориентир, не диагноза</span>
          </div>
        </div>
      </section>

      {/* Quick definitions — visible to humans + answer-style for AI search */}
      <section className="pb-6" aria-label="Бързи определения">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEFINITIONS.map((d) => (
              <div
                key={d.eyebrow}
                className="rounded-2xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.18)] p-5"
                data-testid={`definition-${d.eyebrow}`}
              >
                <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-teal-700 mb-2">
                  {d.eyebrow}
                </p>
                <p className="text-[13.5px] text-slate-700 leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars block — re-uses the same trust component */}
      <ClinicStandardSection showExplainerLink={false} testId="clinic-standard-pillars-block" />

      {/* What partnership does NOT mean */}
      <section className="py-16 md:py-20 bg-[#FCFAF8]" data-testid="what-it-doesnt-mean">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-white/55 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.15)] p-7 md:p-10">
            <p className="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-teal-700 mb-3">
              Какво НЕ означава партньорството
            </p>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 leading-tight">
              Партньорска клиника не е „медицинска сертификация".
            </h2>
            <p className="mt-5 text-[15px] text-slate-700 leading-relaxed">
              Партньорска клиника в Zubite.bg не означава, че Zubite поставя
              диагноза, гарантира резултат или класира клиниката като
              „най-добра". Означава, че клиниката участва в по-структуриран
              процес, при който пациентът идва с повече контекст и по-ясна
              следваща стъпка.
            </p>
            <ul className="mt-6 space-y-2.5 text-[14px] text-slate-600">
              {[
                'Не е класация „най-добри клиники"',
                'Не е гаранция за медицински резултат',
                'Не е заместител на преглед при стоматолог',
                'Не е онлайн диагноза',
                'Не е застрахователен продукт',
              ].map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <span className="text-rose-500 mt-1.5">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Care Pass standard */}
      <section className="py-16 md:py-20 bg-[#FCFAF8]" data-testid="care-pass-standard">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-[1fr_auto] gap-7 items-start">
            <div>
              <p className="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-teal-700 mb-3">
                Care Pass стандарт
              </p>
              <h2 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 leading-tight">
                Care Pass е{' '}
                <span className="text-teal-600">организиран от Zubite</span>{' '}
                и предоставен{' '}
                <span className="text-teal-600">безплатно</span> на
                партньорските клиники.
              </h2>
              <p className="mt-5 text-[15px] text-slate-700 leading-relaxed">
                Zubite Care Pass е допълнителна стойност, която Zubite.bg
                организира чрез партньорства с брандове в сферата на
                оралната хигиена и денталната грижа. След реално посетена
                консултация чрез Zubite.bg, партньорската клиника предоставя
                Care Pass на пациента като част от партньорската екосистема.
              </p>
              <p className="mt-3 text-[13.5px] text-slate-500 leading-relaxed">
                Care Pass не е отстъпка от лечение, не е застрахователен
                продукт, не е абонамент и не променя медицинската преценка.
              </p>
            </div>
            <div className="md:w-56 flex-shrink-0">
              <div className="rounded-2xl bg-gradient-to-br from-teal-50/90 to-white/80 ring-1 ring-teal-200/40 backdrop-blur-md p-5">
                <Gift className="w-5 h-5 text-teal-700 mb-2" />
                <p className="font-serif text-base text-slate-900 leading-snug">
                  Care Pass за пациента
                </p>
                <p className="mt-1 text-[12.5px] text-slate-600 leading-relaxed">
                  Отстъпки за продукти за орална хигиена · след реално посещение
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What happens on standard violation */}
      <section className="py-16 md:py-20 bg-[#FCFAF8]" data-testid="standard-violation">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-white/55 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.15)] p-7 md:p-10">
            <div className="flex items-center gap-2.5 mb-3">
              <RefreshCw className="w-5 h-5 text-teal-700" />
              <p className="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-teal-700">
                При неспазване на стандарта
              </p>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 leading-tight">
              Участието може да бъде преразгледано.
            </h2>
            <p className="mt-5 text-[15px] text-slate-700 leading-relaxed">
              Стандартът има смисъл само ако се поддържа във времето. Ако
              пациентската комуникация се влоши, ако клиниката не поддържа
              коректна информация или ако не отговаря на платформените
              правила, участието в партньорската мрежа може да бъде
              преразгледано.
            </p>
            <p className="mt-3 text-[14px] text-slate-600 leading-relaxed">
              Не публикуваме „класация на най-добрите клиники". Целта е
              партньорската мрежа да остане подбрана, а не отворен каталог.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-[#FCFAF8]" data-testid="clinic-standard-faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <p className="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-teal-700 mb-3 text-center">
            Често задавани въпроси
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-slate-900 leading-tight text-center mb-10">
            За стандарта
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <details
                key={item.q}
                className="group rounded-2xl bg-white/65 backdrop-blur-md ring-1 ring-white/80 p-5 hover:ring-teal-200/60 transition-colors"
                data-testid={`standard-faq-${i}`}
              >
                <summary className="list-none cursor-pointer flex items-start justify-between gap-4">
                  <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 leading-snug pr-2">{item.q}</h3>
                  <ChevronDown className="w-4 h-4 text-teal-700 flex-shrink-0 mt-1 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[14px] text-slate-600 leading-relaxed border-t border-slate-200/50 pt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-[#FCFAF8]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-teal-50/90 to-white/80 backdrop-blur-md ring-1 ring-teal-200/40 shadow-[0_28px_60px_-22px_rgba(13,148,136,0.25)] p-8 md:p-12 text-center">
            <p className="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-teal-700 mb-3">
              Готов/-а ли си?
            </p>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 leading-tight">
              Започни от{' '}
              <span className="text-teal-600">по-смислен първи разговор</span>.
            </h2>
            <p className="mt-4 text-[15px] text-slate-600 max-w-lg mx-auto">
              Първоначален онлайн анализ за 60 секунди. Без диагноза — само
              ясна посока за следваща стъпка.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center gap-1.5 h-12 px-7 rounded-full bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition-all shadow-[0_12px_30px_-12px_rgba(13,148,136,0.6)] hover:shadow-[0_18px_40px_-12px_rgba(13,148,136,0.7)]"
                data-testid="standard-final-quiz-cta"
              >
                Започни анализа
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/care-pass"
                className="inline-flex items-center justify-center gap-1.5 h-12 px-7 rounded-full bg-white/65 backdrop-blur-md ring-1 ring-white/70 text-slate-900 text-sm font-medium hover:bg-white transition-all"
              >
                Какво е Care Pass
              </Link>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-[11px] text-slate-500">
              <AlertTriangle className="w-3 h-3" />
              <span>Zubite.bg не поставя диагноза и не гарантира резултат от лечение.</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
