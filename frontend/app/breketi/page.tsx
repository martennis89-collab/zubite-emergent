import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENT_PRICES } from '@/lib/pricing'
import {
  ArrowRight, CheckCircle2, ShieldCheck, HelpCircle, Stethoscope,
  Smile, Sparkles, Layers, Eye, Activity, GraduationCap,
} from 'lucide-react'

// /breketi — Bulgarian patient-facing orientation page about braces.
//
// Purpose: help patients understand what braces are, when they MAY be
// relevant, how they compare to aligners, what types exist, what
// influences price, and what to ask an orthodontist — without
// diagnosing and without representing Zubite as a clinic.
//
// Schema is MedicalWebPage + BreadcrumbList + FAQPage only.
// Explicitly NO Service / MedicalProcedure / Offer / Dentist / Product
// / PriceSpecification so Google never reads Zubite as a treatment
// provider or vendor.

export const metadata: Metadata = {
  title: 'Брекети — ориентир за пациента: видове, цени, консултация | Zubite.bg',
  description:
    'Какво представляват брекетите, кога могат да са подходящи, какви видове има, ориентировъчни цени в България и какви въпроси да зададеш на ортодонт. Zubite.bg е ориентир, не диагноза.',
  alternates: { canonical: 'https://zubite.bg/breketi' },
  openGraph: {
    title: 'Брекети — ориентир преди консултация | Zubite.bg',
    description:
      'Видове брекети, ориентировъчни цени, сравнение с алайнери. Не диагноза, а насока за разговор с ортодонт.',
    url: 'https://zubite.bg/breketi',
    type: 'website',
    locale: 'bg_BG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Брекети — ориентир преди консултация | Zubite.bg',
    description:
      'Видове брекети, ориентировъчни цени, сравнение с алайнери. Не диагноза.',
  },
  robots: { index: true, follow: true },
}

const SITE = 'https://zubite.bg'
const braces = TREATMENT_PRICES['orthodontics-braces']
const aligners = TREATMENT_PRICES['orthodontics-aligners']

// ─── Data ───────────────────────────────────────────────────────────────

const WHEN_RELEVANT = [
  'Струпани или криви зъби',
  'Разстояния между зъбите',
  'Неправилна захапка',
  'По-сложни ортодонтски случаи',
  'Когато алайнерите не са достатъчно подходящи според ортодонт',
  'При деца или тийнейджъри след препоръка за ортодонтска оценка',
] as const

const DECISION_ROWS: { criterion: string; braces: string; aligners: string }[] = [
  {
    criterion: 'Видимост',
    braces:
      'Видими; керамичните са по-дискретни; лингвалните не се виждат отвън',
    aligners: 'Прозрачни шини, минимално видими',
  },
  {
    criterion: 'Дисциплина',
    braces: 'Носят се постоянно; не зависят от пациента',
    aligners: '20–22 часа дневно; зависят от дисциплината на пациента',
  },
  {
    criterion: 'Сложни случаи',
    braces:
      'Често по-предвидими при по-сложни ортодонтски случаи; финална преценка прави ортодонт',
    aligners:
      'Подходящи за леки до средни случаи; по-сложните могат да изискват комбиниран подход',
  },
  {
    criterion: 'Хигиена',
    braces: 'Изисква специални четки и нишки; по-старателна грижа',
    aligners: 'По-лесна хигиена — шината се сваля',
  },
  {
    criterion: 'Ограничения в храната',
    braces: 'Да — твърди и лепкави храни',
    aligners: 'Не — шината се сваля при хранене',
  },
  {
    criterion: 'Ориентировъчна цена',
    braces: `€${braces.minEUR.toLocaleString('bg-BG')} – €${braces.maxEUR.toLocaleString('bg-BG')}`,
    aligners: `€${aligners.minEUR.toLocaleString('bg-BG')} – €${aligners.maxEUR.toLocaleString('bg-BG')}`,
  },
  {
    criterion: 'Брой посещения',
    braces: 'Редовни корекции при ортодонт',
    aligners: 'По-малко, ако планът върви по график',
  },
]

const TYPES = [
  {
    slug: 'metalni',
    title: 'Метални брекети',
    icon: <Layers className="w-4 h-4" />,
    short:
      'Класически вариант от неръждаема стомана. Често с най-достъпна начална цена и широка приложимост — включително при по-сложни случаи.',
  },
  {
    slug: 'keramichni',
    title: 'Керамични брекети',
    icon: <Sparkles className="w-4 h-4" />,
    short:
      'По-дискретни — близки до цвета на зъба. Подходящи когато визуалният елемент е важен. Изискват по-внимателна грижа.',
  },
  {
    slug: 'lingvalni',
    title: 'Лингвални брекети',
    icon: <Eye className="w-4 h-4" />,
    short:
      'Поставят се от вътрешната страна на зъбите. Невидими отпред, но изискват по-дълга адаптация и специфичен опит на лекаря.',
  },
  {
    slug: 'samo-ligirashti',
    title: 'Само-лигиращи (self-ligating) брекети',
    icon: <Activity className="w-4 h-4" />,
    short:
      'Не използват ластичета за фиксиране на дъгата. По някои данни — по-малко триене, при подходящ план могат да изискват по-малко чести корекции. Решение взема ортодонт.',
  },
] as const

const PRICE_FACTORS: { title: string; body: string }[] = [
  {
    title: 'Тип брекети',
    body: 'Метални, керамични, лингвални или само-лигиращи. Цената може да се различава според вида система, плана и опита на ортодонта.',
  },
  {
    title: 'Сложност на случая',
    body: 'Лек, среден или по-сложен ортодонтски проблем — определя плана и продължителността.',
  },
  {
    title: 'Продължителност',
    body: 'Типично 12–36 месеца. По-дългото лечение обикновено означава повече корекции.',
  },
  {
    title: 'Брой и тип корекции',
    body: 'Редовни посещения при ортодонт, евентуални допълнителни процедури.',
  },
  {
    title: 'Допълнителни ортодонтски елементи',
    body: 'Миниимпланти, апликации, ретейнер след лечение и др.',
  },
  {
    title: 'Опит и специализация на ортодонта',
    body: 'Част от ценообразуването; опитът в по-сложни случаи може да повлияе.',
  },
]

const WHEN_TO_TALK = [
  'Криви или струпани зъби, които те притесняват визуално или функционално',
  'Неправилна захапка (overbite, underbite, crossbite, open bite)',
  'Затруднения при хапане, дъвчене или дишане през устата',
  'Препоръка от твоя стоматолог за ортодонтска оценка',
  'Дете в подходяща възраст за първична ортодонтска консултация (обикновено около 7–9 год.)',
] as const

const QUESTIONS = [
  {
    q: 'Подходящ ли е моят случай за брекети или препоръчваш друг подход?',
    why: 'Помага да разбереш дали брекетите са релевантни, или ортодонтът би препоръчал алайнери или комбиниран план.',
  },
  {
    q: 'Какъв тип брекети препоръчваш и защо точно този за моя случай?',
    why: 'Конкретният тип (метални, керамични, лингвални, само-лигиращи) се избира спрямо плана и приоритетите ти.',
  },
  {
    q: 'Колко време ще продължи лечението в твоята оценка?',
    why: 'Оценка на продължителността помага да планираш и сравниш с други опции.',
  },
  {
    q: 'Колко често ще се налагат корекции и колко продължава всяко посещение?',
    why: 'Реална представа за времето, което ще отделиш по време на лечението.',
  },
  {
    q: 'Какви ограничения в храненето и хигиената трябва да очаквам?',
    why: 'Има практически детайли (твърди храни, специални четки), които ще променят ежедневието ти.',
  },
  {
    q: 'Какъв ретейнер ще се ползва след лечението и за колко време?',
    why: 'Ретенцията е важна част от резултата; различните практики имат различни протоколи.',
  },
  {
    q: 'Каква е общата цена и какво включва тя (брекети, корекции, ретейнер, рентген)?',
    why: 'Финална оферта зависи от плана; добре е да разбираш какво влиза в нея и какво е допълнително.',
  },
  {
    q: 'Какъв е планът, ако нещо се счупи или се наложи допълнителна процедура?',
    why: 'Често дребни инциденти се случват; добре е да знаеш предварително как се процедира.',
  },
] as const

const FAQ = [
  {
    q: 'От каква възраст се поставят брекети?',
    a: 'Брекети могат да се поставят при деца, тийнейджъри и възрастни. Първата ортодонтска оценка обикновено се препоръчва около 7–9-годишна възраст; конкретното време зависи от развитието и плана на ортодонта.',
  },
  {
    q: 'Колко продължава лечението с брекети?',
    a: 'Типично между 12 и 36 месеца, в зависимост от сложността на случая и плана. Точната оценка прави ортодонт след преглед.',
  },
  {
    q: 'Боли ли поставянето или адаптацията?',
    a: 'Самото поставяне обикновено не е болезнено. След първите няколко дни е възможен дискомфорт или чувствителност при дъвчене, който отзвучава. Усещанията зависят от случая.',
  },
  {
    q: 'Мога ли да си сменя брекетите от един тип на друг по средата на лечението?',
    a: 'Зависи от плана и преценката на ортодонта. Това не е стандартен ход и обикновено се обсъжда индивидуално.',
  },
  {
    q: 'Брекети или алайнери — кое е по-добро?',
    a: 'Няма универсален отговор. Двата подхода имат различни силни страни. Подходящият избор зависи от случая, дисциплината и предпочитанията. Точно сравнение прави ортодонт след преглед. Виж детайлното сравнение на /aligners-vs-braces.',
  },
  {
    q: 'Какво е ретейнер и защо е важен?',
    a: 'Ретейнерът е приспособление, което се носи след активното ортодонтско лечение, за да задържи новата позиция на зъбите. Без ретенция е възможна частична загуба на резултата.',
  },
  {
    q: 'Zubite.bg поставя ли диагноза?',
    a: 'Не. Zubite.bg е ориентир и не замества преглед при лекар по дентална медицина или ортодонт. Платформата помага да си подготвен/а за разговора, не да го заместиш.',
  },
] as const

const RELATED = [
  {
    href: '/aligners-vs-braces',
    title: 'Алайнери vs брекети — пълно сравнение',
    desc: 'Детайлно сравнение по критерии, цени и ситуации.',
  },
  {
    href: '/orthodontics',
    title: 'Ортодонтия — общ ориентир',
    desc: 'Какво включва ортодонтското лечение, видове подходи и марки алайнери.',
  },
  {
    href: '/crooked-teeth',
    title: 'Криви зъби — въведение',
    desc: 'Какво означава „струпване" и кога може да си струва преглед при ортодонт.',
  },
  {
    href: '/treatments',
    title: 'Всички категории лечение',
    desc: 'Ориентир по дентални теми — ортодонтия, импланти, естетика, TMJ и др.',
  },
] as const

// ─── JSON-LD ────────────────────────────────────────────────────────────

const medicalWebPageLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  '@id': `${SITE}/breketi`,
  url: `${SITE}/breketi`,
  name: 'Брекети — ориентир за пациента',
  inLanguage: 'bg-BG',
  description:
    'Информацията е ориентировъчна и не замества преглед при ортодонт. Страницата помага да се ориентираш какви видове брекети има, как се сравняват с алайнери и какви въпроси да зададеш.',
  audience: { '@type': 'Patient' },
  lastReviewed: new Date().toISOString().split('T')[0],
  isPartOf: { '@type': 'WebSite', name: 'Zubite.bg', url: SITE },
}

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Начало', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Лечения', item: `${SITE}/treatments` },
    { '@type': 'ListItem', position: 3, name: 'Брекети', item: `${SITE}/breketi` },
  ],
}

const faqPageLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const safeJsonLd = (node: unknown) =>
  JSON.stringify(node).replace(/</g, '\\u003c')

// ─── Page ───────────────────────────────────────────────────────────────

export default function BreketiPage() {
  return (
    <main
      className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden"
      data-testid="breketi-page"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(medicalWebPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqPageLd) }} />

      <Header />

      {/* ─── Hero ──────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-hidden"
        data-testid="breketi-hero"
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 15% 20%, rgba(94,234,212,0.30) 0%, transparent 60%),' +
              'radial-gradient(ellipse 60% 50% at 85% 60%, rgba(165,243,252,0.40) 0%, transparent 60%),' +
              'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
          }}
        />
        <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/35 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5">
            <Link href="/" className="hover:text-teal-700">Начало</Link>
            <span className="mx-1.5 text-slate-400">/</span>
            <Link href="/treatments" className="hover:text-teal-700">Лечения</Link>
            <span className="mx-1.5 text-slate-400">/</span>
            <span className="text-slate-700">Брекети</span>
          </nav>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 backdrop-blur-md ring-1 ring-white/70 text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold px-3 py-1.5">
            <Smile className="w-3 h-3" /> Ортодонтия · Брекети
          </span>
          <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 leading-tight">
            Брекети — кога могат да са подходящи и{' '}
            <em className="not-italic text-teal-600">какво да обмислиш</em>
          </h1>
          <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Ориентир за пациента: какво представляват брекетите, кога могат да
            са подходящи, как се сравняват с алайнери и какви въпроси да зададеш
            на ортодонт. Zubite.bg не поставя диагноза и не замества преглед.
          </p>

          {/* Trust chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {['Ориентир, не диагноза', 'Точна оценка изисква преглед', 'Сравнение с алайнери включено'].map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/55 backdrop-blur-md ring-1 ring-white/70 text-[11px] text-slate-700 font-medium px-3 py-1.5"
              >
                <CheckCircle2 className="w-3 h-3 text-teal-500" />
                {c}
              </span>
            ))}
          </div>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/quiz"
              data-testid="breketi-hero-primary-cta"
              className="group relative inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-5 py-3 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
              style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            >
              <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
              <span className="relative inline-flex items-center gap-1.5">
                Започни ориентация
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="/aligners-vs-braces"
              data-testid="breketi-hero-secondary-cta"
              className="relative inline-flex items-center gap-1.5 rounded-full bg-white/35 backdrop-blur-2xl text-slate-700 text-sm font-medium px-5 py-3 ring-1 ring-white/60 hover:bg-white/55 hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden"
            >
              <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/2 rounded-full bg-white/65 blur-sm pointer-events-none" />
              <span className="relative">Сравни с алайнери</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── What ──────────────────────────────────────── */}
      <section className="relative pb-12 sm:pb-16" data-testid="breketi-what">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
              Какво представляват брекетите?
            </p>
            <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
              Фиксиран ортодонтски апарат, който движи зъбите постепенно
            </h2>
            <p className="mt-4 text-slate-700 text-sm sm:text-base leading-relaxed">
              Брекетите са фиксирани ортодонтски апарати — малки брекети,
              залепени за зъбите, и ортодонтска дъга, която ги свързва.
              Поставят се от ортодонт и работят постепенно, в продължение на
              месеци, за да придвижат зъбите към планираната позиция.
            </p>
            <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
              Подходящият тип брекети, продължителността и планът зависят от
              случая и се определят след преглед при ортодонт.
            </p>
          </div>
        </div>
      </section>

      {/* ─── When relevant ─────────────────────────────── */}
      <section className="relative py-12 sm:py-16 overflow-hidden" data-testid="breketi-when">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 80% 30%, rgba(165,243,252,0.20) 0%, transparent 70%),linear-gradient(180deg, #FCFAF8 0%, #F7FBFA 100%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
            Кога могат да са подходящи
          </p>
          <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
            Темите, при които брекетите често се обсъждат
          </h2>
          <ul className="mt-8 grid sm:grid-cols-2 gap-3">
            {WHEN_RELEVANT.map((item, i) => (
              <li
                key={i}
                className="relative rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_6px_22px_-18px_rgba(15,23,42,0.18)] p-4 sm:p-5 flex gap-3 items-start"
              >
                <span className="inline-flex w-7 h-7 rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100 items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm sm:text-[15px] font-medium text-slate-900 leading-snug">
                    {item}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Може да е тема за разговор с ортодонт.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Decision table: braces vs aligners ─────────── */}
      <section
        className="relative py-12 sm:py-16"
        data-testid="breketi-decision-table"
      >
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
              Брекети vs алайнери
            </p>
            <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
              Кратко сравнение по основни критерии
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Таблицата е ориентир. Точно сравнение за твоя случай прави ортодонт след преглед.
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block mt-8 rounded-2xl bg-white/75 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600">
                  <th className="text-left font-semibold px-5 py-3 w-1/4">Критерий</th>
                  <th className="text-left font-semibold px-5 py-3">Брекети</th>
                  <th className="text-left font-semibold px-5 py-3">Алайнери</th>
                </tr>
              </thead>
              <tbody>
                {DECISION_ROWS.map((r, i) => (
                  <tr key={r.criterion} className={i % 2 ? 'bg-white/40' : ''}>
                    <td className="align-top px-5 py-4 text-slate-700 font-medium">{r.criterion}</td>
                    <td className="align-top px-5 py-4 text-slate-600 leading-relaxed">{r.braces}</td>
                    <td className="align-top px-5 py-4 text-slate-600 leading-relaxed">{r.aligners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="md:hidden mt-8 space-y-3">
            {DECISION_ROWS.map((r) => (
              <div
                key={r.criterion}
                className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_6px_22px_-18px_rgba(15,23,42,0.18)] p-4"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold">
                  {r.criterion}
                </p>
                <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">Брекети</span>
                  <span className="text-slate-600">{r.braces}</span>
                  <span className="font-medium text-slate-700">Алайнери</span>
                  <span className="text-slate-600">{r.aligners}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Link
              href="/aligners-vs-braces"
              data-testid="breketi-decision-table-cta"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
            >
              Виж пълното сравнение <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Types of braces ───────────────────────────── */}
      <section className="relative py-12 sm:py-16 overflow-hidden" data-testid="breketi-types">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, #F7FBFA 0%, #FCFAF8 100%)' }}
        />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
              Видове брекети
            </p>
            <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
              Основните типове, които може да обсъдиш с ортодонт
            </h2>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 gap-3 sm:gap-4">
            {TYPES.map((t) => (
              <article
                key={t.slug}
                data-testid={`breketi-type-${t.slug}`}
                className="relative flex flex-col rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] p-5 sm:p-6 transition-all hover:-translate-y-1 hover:bg-white/85"
              >
                <div className="inline-flex w-10 h-10 rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 items-center justify-center">
                  {t.icon}
                </div>
                <h3 className="mt-3 font-serif text-lg sm:text-xl font-semibold text-slate-900">
                  {t.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {t.short}
                </p>
                <p className="mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-500 leading-relaxed">
                  Какъв тип е подходящ за случая ти зависи от преглед и план на ортодонт.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Price factors + strip ─────────────────────── */}
      <section className="relative py-12 sm:py-16" data-testid="breketi-price-factors">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
              Какво влияе на цената
            </p>
            <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
              Цената зависи от плана и спецификата на случая
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              По-долу са основните фактори. Финална оферта се формира след преглед при ортодонт.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {PRICE_FACTORS.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_6px_22px_-18px_rgba(15,23,42,0.18)] p-5"
              >
                <p className="font-serif text-base font-semibold text-slate-900">
                  {f.title}
                </p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>

          {/* Price strip — uses ONLY TREATMENT_PRICES['orthodontics-braces'] */}
          <div
            data-testid="breketi-price-strip"
            className="mt-10 relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-50/80 via-white/85 to-white/85 ring-1 ring-teal-200/50 shadow-[0_14px_44px_-22px_rgba(13,148,136,0.30)] p-6 sm:p-8"
          >
            <div className="grid sm:grid-cols-[1fr_auto] gap-5 sm:items-center">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
                  Ориентировъчна цена
                </p>
                <p className="mt-2 font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
                  €{braces.minEUR.toLocaleString('bg-BG')} – €{braces.maxEUR.toLocaleString('bg-BG')}
                  <span className="text-base sm:text-lg font-normal text-slate-500"> · {braces.minBGN.toLocaleString('bg-BG')} – {braces.maxBGN.toLocaleString('bg-BG')} лв.</span>
                </p>
                <p className="mt-1 text-sm text-slate-500">{braces.note}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-white/80 text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold px-3 py-1.5 self-start sm:self-center">
                <ShieldCheck className="w-3 h-3" /> Ориентир
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500 leading-relaxed">
              Ориентир за лечение в България. Финална оферта зависи от индивидуален план след преглед.
            </p>
          </div>
        </div>
      </section>

      {/* ─── When to talk to orthodontist ──────────────── */}
      <section className="relative py-12 sm:py-16 overflow-hidden" data-testid="breketi-when-to-talk">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 40% at 20% 70%, rgba(94,234,212,0.18) 0%, transparent 70%),linear-gradient(180deg, #FCFAF8 0%, #F7FBFA 100%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
            Кога да говориш с ортодонт
          </p>
          <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
            Сигналите, при които ортодонтска оценка обикновено има смисъл
          </h2>
          <ul className="mt-8 space-y-3">
            {WHEN_TO_TALK.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 items-start rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_6px_22px_-18px_rgba(15,23,42,0.18)] p-4 sm:p-5"
              >
                <span className="inline-flex w-7 h-7 rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100 items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </span>
                <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                  {item}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-500 leading-relaxed">
            Точна оценка изисква преглед и при нужда образна диагностика. Zubite.bg помага само да се ориентираш преди разговора.
          </p>
        </div>
      </section>

      {/* ─── Questions to ask ─────────────────────────── */}
      <section className="relative py-12 sm:py-16" data-testid="breketi-questions">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
            Какви въпроси да зададеш
          </p>
          <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
            8 въпроса, които си струва да обмислиш
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            Тези въпроси не са медицински отговори от Zubite — те са насоки за разговора ти с ортодонт.
          </p>

          <div className="mt-10 space-y-3">
            {QUESTIONS.map((it, i) => (
              <details
                key={i}
                className="group rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_6px_22px_-18px_rgba(15,23,42,0.18)] p-5 sm:p-6 transition-colors hover:bg-white/85"
              >
                <summary className="list-none flex items-start justify-between gap-4 cursor-pointer">
                  <span className="font-serif text-base sm:text-lg font-semibold text-slate-900 leading-snug">
                    {it.q}
                  </span>
                  <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 transition-transform group-open:rotate-45">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </summary>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">
                  Защо този въпрос е важен
                </p>
                <p className="mt-1 text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                  {it.why}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Care Pass strip ──────────────────────────── */}
      <section className="relative py-10 sm:py-14" data-testid="breketi-care-pass-strip">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="flex-1 text-sm sm:text-[15px] text-slate-700 leading-relaxed">
              <span className="font-medium text-slate-900">Care Pass</span>{' '}
              може да се отключи след физическа консултация в участваща
              партньорска клиника, когато условията са изпълнени. Не е
              застраховка и не е автоматична отстъпка от лечение.
            </p>
            <Link
              href="/care-pass"
              data-testid="breketi-care-pass-link"
              className="inline-flex items-center justify-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors whitespace-nowrap"
            >
              Виж как работи Care Pass
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────── */}
      <section className="relative py-16 sm:py-20" data-testid="breketi-faq">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
              Често задавани въпроси
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">
              Кратки, безопасни отговори
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQ.map((f, i) => (
              <details
                key={i}
                className="group rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_6px_22px_-18px_rgba(15,23,42,0.18)] p-5 sm:p-6 transition-colors hover:bg-white/85"
              >
                <summary className="list-none flex items-start justify-between gap-4 cursor-pointer">
                  <span className="font-serif text-base sm:text-lg font-semibold text-slate-900 leading-snug">
                    {f.q}
                  </span>
                  <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 transition-transform group-open:rotate-45">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </summary>
                <p className="mt-3 text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Related ──────────────────────────────────── */}
      <section className="relative py-12 sm:py-16" data-testid="breketi-related">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">
            Свързани материали
          </p>
          <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
            Прочети още
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {RELATED.map((r, i) => (
              <Link
                key={i}
                href={r.href}
                className="group rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_6px_22px_-18px_rgba(15,23,42,0.18)] p-5 transition-all hover:-translate-y-1 hover:bg-white/85 flex flex-col"
              >
                <div className="inline-flex w-9 h-9 rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <p className="mt-3 font-serif text-base font-semibold text-slate-900 leading-snug">
                  {r.title}
                </p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed flex-1">
                  {r.desc}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 group-hover:text-teal-800 transition-colors">
                  Прочети <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────── */}
      <section className="relative pt-8 pb-20 sm:pb-28" data-testid="breketi-final-cta">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-50/80 via-white/85 to-white/85 ring-1 ring-teal-200/50 shadow-[0_18px_48px_-22px_rgba(13,148,136,0.35)] p-7 sm:p-10 text-center">
            <div
              aria-hidden
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-teal-200/35 blur-3xl pointer-events-none"
            />
            <h2 className="relative font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 leading-tight">
              Направи следващата стъпка с повече яснота.
            </h2>
            <p className="relative mt-4 text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
              Отговори на няколко въпроса и ще получиш ориентир каква тема
              може да е релевантна за теб. Това не е диагноза, а насока за
              разговор с ортодонт.
            </p>
            <div className="relative mt-7 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/quiz"
                data-testid="breketi-final-cta-primary"
                className="group inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-6 py-3 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
              >
                <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
                <span className="relative inline-flex items-center gap-1.5">
                  Започни ориентация
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link
                href="/kliniki/sofia/ortodontia"
                data-testid="breketi-final-cta-secondary"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/55 backdrop-blur-md text-slate-700 text-sm font-medium px-5 py-3 ring-1 ring-white/70 hover:bg-white/75 transition-colors"
              >
                Виж партньорски клиники за ортодонтия в София
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
