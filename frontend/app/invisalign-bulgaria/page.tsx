import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { FAQAccordion } from '@/components/FAQAccordion'
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Compass,
  ScanLine,
  ClipboardList,
  Truck,
  Stethoscope,
  Repeat,
  Smile,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  Activity,
  Coffee,
} from 'lucide-react'

// ─── SEO METADATA ────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'Invisalign България: цена, лечение, сложни случаи | Zubite.bg',
  description:
    'Invisalign в България: как работи, цени (Lite / Moderate / Comprehensive), SmartTrack материал, сложни случаи, доставка около 5 работни дни и какво да очакваш преди, по време и след лечението.',
  keywords:
    'Invisalign България, Invisalign цена, Invisalign цени България, Invisalign Lite цена, Invisalign Moderate цена, Invisalign Comprehensive цена, Invisalign сложни случаи, алайнери Invisalign, Invisalign или брекети, прозрачни алайнери, лечение с Invisalign, Invisalign София, Invisalign Пловдив, колко струва Invisalign, SmartTrack Invisalign, ClinCheck',
  alternates: { canonical: 'https://zubite.bg/invisalign-bulgaria' },
  openGraph: {
    title: 'Invisalign България: цена, лечение, сложни случаи',
    description:
      'Пълно ръководство за пациенти: как работи Invisalign, защо SmartTrack материалът има значение, какви са реалните цени в България и кога алайнерите могат да бъдат подходящи дори при по-сложни случаи.',
    url: 'https://zubite.bg/invisalign-bulgaria',
    type: 'article',
    locale: 'bg_BG',
    siteName: 'Zubite.bg',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Invisalign България: цена, лечение, сложни случаи',
    description:
      'Как работи Invisalign в България, какво прави SmartTrack материала различен и какви са реалните цени за Lite / Moderate / Comprehensive.',
  },
}

// ─── DATA ────────────────────────────────────────────────────────
const QUICK_FACTS: Array<{ q: string; a: string }> = [
  { q: 'Какво е Invisalign?', a: 'Ортодонтска система с прозрачни, свалящи се алайнери.' },
  { q: 'Какво я отличава?', a: 'SmartTrack материал, ClinCheck планиране, SmartForce attachments и iTero workflow.' },
  { q: 'Работи ли при сложни случаи?', a: 'Да — при правилен случай, опитен лекар и добра дисциплина.' },
  { q: 'Колко часа се носи?', a: 'Обикновено 20–22 часа дневно.' },
  { q: 'Колко струва?', a: 'Lite ~1 500–2 500 €, Moderate ~2 500–3 500 €, Comprehensive ~4 000–5 000 €.' },
  { q: 'Колко бързо пристигат?', a: 'Често около 5 работни дни след финализирана поръчка — по обратна връзка от лекари в България.' },
  { q: 'Има ли локално присъствие?', a: 'Да — реална българска клинична и търговска екосистема, не само дистанционна доставка.' },
  { q: 'Нормално ли е refinements?', a: 'Да — refinements са нормална част от финното довършване, особено при по-сложни случаи.' },
  { q: 'Ретайнери след лечението?', a: 'Да — почти винаги. Без ретенция зъбите могат да се върнат назад.' },
]

const AEO_ANSWERS: Array<{ q: string; a: string }> = [
  {
    q: 'Работи ли Invisalign при сложни случаи?',
    a: 'Да — Invisalign може да работи и при много сложни ортодонтски случаи. Резултатът зависи от правилната диагноза, опита на ортодонта, ClinCheck планирането, SmartTrack материала, attachments, ластици, IPR, refinements и дисциплината на пациента.',
  },
  {
    q: 'Колко струва Invisalign в България?',
    a: 'Ориентировъчно: Invisalign Lite около 1 500–2 500 €, Moderate около 2 500–3 500 €, Comprehensive около 4 000–5 000 €. Финалната цена зависи от сложността на случая, броя алайнери, refinements, ретайнери и клиниката.',
  },
  {
    q: 'Колко време отнема лечението?',
    a: 'Обикновено между 6 и 18 месеца според сложността. Леките случаи често приключват за 6–9 месеца, а Comprehensive планове могат да продължат над една година, особено със заложени refinements.',
  },
  {
    q: 'Какво прави SmartTrack различен?',
    a: 'SmartTrack е собствен многослоен материал на Align Technology, разработен за ортодонтски движения. Подобрява прилягането, разпределя силата по-равномерно и запазва формата си между смените — част от клиничната предвидимост на Invisalign.',
  },
  {
    q: 'Колко бързо пристигат алайнерите в България?',
    a: 'По обратна връзка от лекари, работещи със системата в България, след финализиран ClinCheck план и поръчка алайнерите често пристигат около 5 работни дни. Срокът може да варира според логистиката и производствения график.',
  },
]

const TIMELINE: Array<{ icon: typeof ScanLine; title: string; desc: string }> = [
  { icon: Stethoscope, title: '01 · Консултация и преглед', desc: 'Оценка на зъби, венци, захапка и общо състояние. Активни кариеси или пародонтит се овладяват преди ортодонтско лечение.' },
  { icon: ScanLine, title: '02 · Снимки, рентген, iTero скен', desc: '3D дигитален модел на зъбите чрез iTero. Рентгеновите снимки показват корени, кост и скелетни отношения.' },
  { icon: ClipboardList, title: '03 · ClinCheck план', desc: 'Дигиталният план на лечението по етапи. Лекарят контролира движенията, attachments, IPR, ластици и bite ramps.' },
  { icon: Truck, title: '04 · Одобрение и производство', desc: 'След финализиране на плана алайнерите се произвеждат. В България често пристигат около 5 работни дни.' },
  { icon: Layers, title: '05 · Поставяне на attachments', desc: 'Малки релефни точки от композит в цвета на зъба, които помагат на алайнера да предаде по-точна сила.' },
  { icon: Clock, title: '06 · Носене и смяна', desc: '20–22 часа дневно. Смяна на алайнери на всеки 7, 10 или 14 дни според плана и проследяването.' },
  { icon: Repeat, title: '07 · Контроли и refinements', desc: 'Редовни прегледи. Ако зъб не се движи точно, се прави нов скен и допълнителна серия алайнери — нормално, не провал.' },
  { icon: ShieldCheck, title: '08 · Ретайнери', desc: 'След активното лечение задължително — без ретенция зъбите могат да се върнат. Поддръжката е част от резултата.' },
]

const PRICE_TIERS: Array<{
  name: string
  price: string
  range: string
  desc: string
  features: string[]
  featured?: boolean
}> = [
  {
    name: 'Invisalign Lite',
    price: '€1 500 – 2 500',
    range: 'lite',
    desc: 'По-леки случаи с ограничен брой движения и по-малко алайнери.',
    features: ['до ~14 двойки алайнери', 'кратък план', 'ограничени refinements', 'подходящ за лека кривина'],
  },
  {
    name: 'Invisalign Moderate',
    price: '€2 500 – 3 500',
    range: 'moderate',
    desc: 'Средни случаи с повече движения и по-дълъг план.',
    features: ['до ~26 двойки алайнери', 'по-дълъг план', 'attachments + IPR при нужда', 'умерена сложност'],
    featured: true,
  },
  {
    name: 'Invisalign Comprehensive',
    price: '€4 000 – 5 000',
    range: 'comprehensive',
    desc: 'Цялостно лечение, по-сложни случаи и пълен контрол.',
    features: ['неограничени алайнери в срок', 'включени refinements', 'комбинирани механики', 'сложна биомеханика'],
  },
]

const COMPLEX_CASES = [
  { title: 'Струпване', desc: 'Лечими случаи дори при умерено и по-голямо струпване, със или без IPR.' },
  { title: 'Разстояния', desc: 'Затваряне на интердентални пространства с прецизен план.' },
  { title: 'Дълбока захапка', desc: 'С bite ramps и контролирана интрузия в избрани случаи.' },
  { title: 'Отворена захапка', desc: 'Чрез прецизна вертикална корекция и контрол на молари.' },
  { title: 'Кръстосана захапка', desc: 'С разширяване на дъгата и контролиран торк.' },
  { title: 'Class II случаи', desc: 'Включително Mandibular Advancement при растящи пациенти.' },
  { title: 'Екстракционни случаи', desc: 'При избрани сценарии с опитен Invisalign provider.' },
  { title: 'Хибридни механики', desc: 'Комбинация с ластици, мини-винтове или временни брекети при нужда.' },
]

const COMPARISON: Array<{ aspect: string; invisalign: string; braces: string }> = [
  { aspect: 'Видимост', invisalign: 'Почти невидими', braces: 'Видими (метални/керамични)' },
  { aspect: 'Хранене', invisalign: 'Свалят се — без ограничения', braces: 'Ограничения за твърди/лепкави храни' },
  { aspect: 'Хигиена', invisalign: 'По-лесна — премахваш ги', braces: 'По-сложна около brackets и телчета' },
  { aspect: 'Зависи от дисциплина', invisalign: 'Да — 20–22 ч. дневно', braces: 'Не — работят 24/7' },
  { aspect: 'Спешни посещения', invisalign: 'По-малко', braces: 'Повече (счупени brackets/телове)' },
  { aspect: 'Контрол при сложни ротации', invisalign: 'Силен при опитен provider', braces: 'Понякога по-предвидим' },
  { aspect: 'Време на лечение', invisalign: 'Често сравнимо', braces: 'Често сравнимо' },
]

const LIVING_WITH = [
  { icon: Coffee, title: 'Хранене и напитки', desc: 'Свалят се при хранене и при всичко различно от вода. Бързо изплакване на зъбите и поставяне обратно.' },
  { icon: Activity, title: 'Натиск и адаптация', desc: 'Първите 1–3 дни след нов алайнер усещаш натиск. Обикновено по-лек от стягане при брекети.' },
  { icon: Smile, title: 'Говор', desc: 'Леко фъфлене в първите дни. Адаптацията е бърза, особено ако говориш с алайнерите.' },
  { icon: Sparkles, title: 'Хигиена', desc: 'Миене сутрин/вечер, почистване след хранене когато е възможно, специални таблетки за алайнерите. Без гореща вода.' },
  { icon: AlertCircle, title: 'Загубен алайнер', desc: 'Свържи се с клиниката бързо. Лекарят ще каже дали да носиш предишен, следващ или заместващ.' },
  { icon: Clock, title: 'Дисциплина', desc: 'Под нужните часове = зъбите не следват плана, gaps, забавяне, нов скен.' },
]

const FAQS = [
  { q: 'Invisalign работи ли наистина?', a: 'Да. Invisalign работи при леки, умерени и избрани сложни ортодонтски случаи. Най-добри резултати идват от правилен план, опит на лекаря, достатъчно часове носене и редовен контрол.' },
  { q: 'Може ли Invisalign да лекува сложни случаи?', a: 'Да, в много случаи. Съвременният Invisalign разполага със SmartTrack, SmartForce attachments, ластици, bite ramps, precision cuts и ClinCheck планиране. При някои много сложни случаи брекети или комбиниран подход може да са по-предвидими.' },
  { q: 'Всички алайнери ли са еднакви?', a: 'Не. Материалът, софтуерът, производството, лекарският контрол, attachments и протоколите имат значение. Invisalign използва SmartTrack материал и по-голяма клинична база от повечето генерични системи.' },
  { q: 'Колко струва Invisalign в България?', a: 'Ориентировъчно: Lite ~1 500–2 500 €, Moderate ~2 500–3 500 €, Comprehensive ~4 000–5 000 €. Цената зависи от сложността, клиниката, включените refinements и ретайнерите.' },
  { q: 'За колко време пристигат алайнерите в България?', a: 'По обратна връзка от лекари в България, след финализирана поръчка често около 5 работни дни. Срокът може да варира според логистиката и производствения график.' },
  { q: 'Има ли официално Invisalign присъствие в България?', a: 'Да. Има реална локална клинична и търговска екосистема: българско юридическо/търговско представителство, сертифицирани Invisalign лекари, официален doctor locator и providers с различни нива на опит.' },
  { q: 'Колко часа на ден трябва да се носи Invisalign?', a: 'Обикновено 20–22 часа дневно. Свалят се при хранене, пиене на всичко различно от вода и при миене на зъби.' },
  { q: 'Боли ли Invisalign?', a: 'Обикновено се усеща натиск или чувствителност в първите дни след нов алайнер. При повечето пациенти дискомфортът е по-лек от стягане при брекети.' },
  { q: 'Мога ли да пия кафе с Invisalign?', a: 'По-добре не с алайнерите в устата — кафе, чай и вино могат да ги оцветят. Сладки напитки могат да задържат захар под алайнера.' },
  { q: 'Какво става, ако загубя алайнер?', a: 'Свържи се с клиниката бързо. Лекарят ще каже дали да носиш предишен, следващ или да се поръча заместващ. Не продължавай самостоятелно без указания.' },
  { q: 'Трябва ли да нося ретайнери след Invisalign?', a: 'Да. След ортодонтско лечение почти винаги се носят ретайнери. Без ретенция зъбите могат да се върнат назад.' },
  { q: 'Invisalign подходящ ли е за тийнейджъри?', a: 'Да — има Invisalign Teen и Invisalign First за деца в смесено съзъбие. Изборът зависи от дисциплината на детето и конкретния случай.' },
  { q: 'Invisalign по-добър ли е от брекетите?', a: 'Не винаги. Invisalign е по-дискретен и удобен за много пациенти, но брекетите могат да са по-подходящи при определени движения. Най-добрият избор зависи от случая.' },
  { q: 'Какво прави Invisalign различен от по-евтини алайнери?', a: 'Не плащаш само за прозрачна шина — а за цяла система: SmartTrack материал, ClinCheck планиране, attachments, обучени лекари, проследяване и възможност за refinements.' },
]

const TOC = [
  { id: 'aeo', label: 'Кратки отговори' },
  { id: 'quick-facts', label: 'Основни факти' },
  { id: 'what-is', label: 'Какво е Invisalign?' },
  { id: 'smarttrack', label: 'SmartTrack материал' },
  { id: 'complex', label: 'Сложни случаи' },
  { id: 'how', label: 'Как протича лечението' },
  { id: 'bulgaria', label: 'Invisalign в България' },
  { id: 'pricing', label: 'Цени' },
  { id: 'living', label: 'Ежедневие' },
  { id: 'vs-braces', label: 'Invisalign или брекети' },
  { id: 'faq', label: 'FAQ' },
]

// ─── JSON-LD ─────────────────────────────────────────────────────
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Invisalign в България: цена, лечение, сложни случаи и какво да очакваш',
  description:
    'Invisalign в България: как работи, цени, SmartTrack материал, сложни случаи, доставка около 5 работни дни и какво да очакваш преди, по време и след лечението.',
  inLanguage: 'bg-BG',
  author: { '@type': 'Organization', name: 'Zubite.bg' },
  publisher: { '@type': 'Organization', name: 'Zubite.bg' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://zubite.bg/invisalign-bulgaria' },
  url: 'https://zubite.bg/invisalign-bulgaria',
  articleSection: 'Ортодонтия',
  keywords: [
    'Invisalign България',
    'Invisalign цена',
    'Invisalign Lite',
    'Invisalign Moderate',
    'Invisalign Comprehensive',
    'SmartTrack',
    'ClinCheck',
    'алайнери',
    'прозрачни шини',
    'брекети или Invisalign',
  ],
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Начало', item: 'https://zubite.bg/' },
    { '@type': 'ListItem', position: 2, name: 'Ортодонтия', item: 'https://zubite.bg/orthodontics' },
    { '@type': 'ListItem', position: 3, name: 'Invisalign България', item: 'https://zubite.bg/invisalign-bulgaria' },
  ],
}

// ─── PAGE ────────────────────────────────────────────────────────
export default function InvisalignBulgariaPage() {
  return (
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden" data-testid="invisalign-bulgaria-page">
      <Header />

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24" data-testid="invisalign-hero">
        {/* Soft radial backdrop */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-20 right-[8%] w-[28rem] h-[28rem] rounded-full bg-teal-200/35 blur-3xl" />
          <div aria-hidden className="absolute top-40 left-[10%] w-72 h-72 rounded-full bg-cyan-200/30 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-500">
              <ol className="flex flex-wrap gap-1.5">
                <li><Link href="/" className="hover:text-teal-700">Начало</Link></li>
                <li aria-hidden>›</li>
                <li><Link href="/orthodontics" className="hover:text-teal-700">Ортодонтия</Link></li>
                <li aria-hidden>›</li>
                <li className="text-slate-700">Invisalign България</li>
              </ol>
            </nav>

            <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 ring-1 ring-slate-200/70 text-[12px] font-medium text-teal-700 uppercase tracking-wider mb-5">
              <ShieldCheck className="w-3.5 h-3.5" /> Пълно ръководство · Ориентир, не диагноза
            </p>

            <h1 className="font-serif text-[2.25rem] sm:text-5xl lg:text-[3.5rem] font-semibold text-slate-900 leading-[1.08] tracking-tight mb-5">
              Invisalign в <span className="text-teal-600">България</span>:
              <br />цена, лечение и сложни случаи
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mb-7">
              Пълно ръководство за пациенти: как работи Invisalign, защо <strong>SmartTrack</strong> материалът има значение,
              какви са реалните цени в България и кога алайнерите могат да бъдат подходящи дори при по-сложни случаи.
            </p>

            <div className="flex flex-wrap gap-3 mb-7">
              <Link
                href="/quiz"
                data-testid="hero-primary-cta"
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-white text-sm font-medium shadow-[0_10px_28px_-10px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:-translate-y-0.5"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
              >
                Провери дали Invisalign е подходящ за твоя случай
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#pricing"
                data-testid="hero-secondary-cta"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/80 backdrop-blur ring-1 ring-slate-200/80 text-sm font-medium text-slate-800 hover:bg-white transition-colors"
              >
                Виж цените и видовете Invisalign
              </Link>
            </div>

            <ul className="flex flex-wrap gap-2 text-[12.5px]">
              {[
                { label: 'SmartTrack материал' },
                { label: 'Официална Invisalign екосистема в България' },
                { label: '~5 работни дни доставка в много случаи' },
                { label: 'Lite / Moderate / Comprehensive' },
              ].map((chip, i) => (
                <li key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 ring-1 ring-slate-200/60 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  {chip.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-400">
              * По обратна връзка от лекари, работещи със системата в България. Срокът може да варира.
            </p>
          </div>

          {/* Hero visual placeholder — premium glass card */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div aria-hidden className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-teal-100/60 via-cyan-50/40 to-white blur-2xl opacity-70" />
              <div className="relative rounded-3xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] p-6">
                <div aria-hidden className="absolute inset-x-6 top-px h-1/3 rounded-t-3xl bg-gradient-to-b from-white/85 to-transparent pointer-events-none" />
                <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-teal-50 via-white to-cyan-50 ring-1 ring-slate-100 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-teal-600" />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">Дигитален план</p>
                  <p className="font-serif text-lg text-slate-800 leading-snug">
                    Прозрачен алайнер върху iTero 3D модел
                  </p>
                  <p className="text-[12.5px] text-slate-500 mt-2">SmartTrack · ClinCheck · Attachments</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/80 ring-1 ring-slate-100 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Lite</p>
                    <p className="text-[13px] font-semibold text-slate-800">1.5–2.5k €</p>
                  </div>
                  <div className="rounded-xl bg-teal-50/80 ring-1 ring-teal-100 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-teal-700">Moderate</p>
                    <p className="text-[13px] font-semibold text-teal-800">2.5–3.5k €</p>
                  </div>
                  <div className="rounded-xl bg-white/80 ring-1 ring-slate-100 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Compr.</p>
                    <p className="text-[13px] font-semibold text-slate-800">4–5k €</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TABLE OF CONTENTS — mobile collapsible, desktop sticky sidebar wrapped via flex ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-4 mb-10" data-testid="invisalign-toc">
        <details className="rounded-2xl bg-white/70 backdrop-blur ring-1 ring-slate-200/70 p-4 sm:p-5 lg:hidden">
          <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-medium text-slate-800">
            В тази статия
            <span className="text-slate-400 text-xs">11 секции →</span>
          </summary>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
            {TOC.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="block py-1.5 text-slate-600 hover:text-teal-700">{t.label}</a>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* ─── AI-ANSWER / DIRECT ANSWER CARD ─── */}
      <section id="aeo" className="max-w-6xl mx-auto px-4 sm:px-6 mb-16" data-testid="invisalign-aeo">
        <div className="rounded-3xl bg-gradient-to-br from-teal-50/80 via-white to-cyan-50/40 ring-1 ring-teal-100/70 p-6 sm:p-10 shadow-[0_20px_60px_-30px_rgba(13,148,136,0.25)]">
          <p className="text-[12px] uppercase tracking-[0.18em] text-teal-700 font-medium mb-3">Най-краткият отговор</p>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
            Работи ли Invisalign при сложни случаи?
          </h2>
          <p className="text-slate-700 text-base sm:text-lg leading-relaxed max-w-3xl">
            <strong>Да</strong> — Invisalign може да работи и при много сложни ортодонтски случаи, но резултатът зависи от
            правилната диагноза, опита на ортодонта, ClinCheck планирането, SmartTrack материала, attachments, ластици, IPR,
            refinements и дисциплината на пациента.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {AEO_ANSWERS.slice(1).map((ans, i) => (
              <div key={i} className="rounded-2xl bg-white/80 ring-1 ring-slate-200/70 p-5" data-testid={`aeo-card-${i}`}>
                <p className="font-medium text-slate-900 text-[15px] mb-1.5">{ans.q}</p>
                <p className="text-[14px] text-slate-600 leading-relaxed">{ans.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUICK FACTS TABLE ─── */}
      <section id="quick-facts" className="max-w-6xl mx-auto px-4 sm:px-6 mb-20" data-testid="invisalign-quick-facts">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">Основни факти за Invisalign в България</h2>
        <p className="text-slate-600 text-sm mb-6">Сканируем преглед — детайлите следват по-долу.</p>
        <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200/70 bg-white/70 backdrop-blur">
          <table className="w-full text-sm">
            <tbody>
              {QUICK_FACTS.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white/50' : 'bg-teal-50/30'}>
                  <td className="py-3 px-4 sm:px-5 font-medium text-slate-800 w-[42%] sm:w-1/3">{row.q}</td>
                  <td className="py-3 px-4 sm:px-5 text-slate-600">{row.a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── WHAT IS INVISALIGN ─── */}
      <section id="what-is" className="max-w-4xl mx-auto px-4 sm:px-6 mb-20" data-testid="invisalign-what-is">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-5">Какво е Invisalign?</h2>
        <div className="prose prose-slate max-w-none prose-p:text-slate-700 prose-p:leading-relaxed">
          <p>
            Invisalign е ортодонтска система, при която зъбите се подреждат чрез серия прозрачни алайнери. Всеки алайнер прави
            малка част от движението, а след това се преминава към следващия. Така зъбите постепенно се преместват към
            предварително планираната позиция.
          </p>
          <p>
            За разлика от фиксираните брекети, Invisalign алайнерите се свалят при хранене, пиене на всичко различно от вода и
            миене на зъби. Това е голямо предимство за хора, които искат по-дискретно лечение, по-лесна хигиена и по-малко
            ограничения в храненето.
          </p>
          <p>
            Но Invisalign не трябва да се възприема като козметичен аксесоар. Това е медицинско ортодонтско лечение. То трябва
            да се планира и контролира от зъболекар или ортодонт, който разбира не само как да „подреди предните зъби“, а как
            да управлява захапка, корени, контакти, средна линия, дъвкателна функция и стабилност след лечението.
          </p>
        </div>

        {/* "Не е просто пластмаса" call-out */}
        <div className="mt-8 rounded-2xl bg-slate-900 text-white p-6 sm:p-8 ring-1 ring-slate-800 shadow-[0_30px_70px_-30px_rgba(15,23,42,0.5)]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300/90 mb-2">Не е просто „прозрачна пластмаса“</p>
          <p className="text-white/90 text-base leading-relaxed">
            Invisalign е цяла дигитална ортодонтска система — със собствен SmartTrack материал, 3D сканиране, ClinCheck
            планиране, SmartForce attachments, лекарски контрол и глобална база от милиони лекувани случаи.
          </p>
        </div>
      </section>

      {/* ─── SMARTTRACK MATERIAL ─── */}
      <section id="smarttrack" className="relative py-20 bg-white/70 ring-y ring-slate-200/60" data-testid="invisalign-smarttrack">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-10 right-[5%] w-72 h-72 rounded-full bg-teal-100/40 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <p className="text-[12px] uppercase tracking-[0.18em] text-teal-700 font-medium mb-3">Материалът има значение</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-5">
              SmartTrack не е обикновена пластмаса
            </h2>
            <div className="prose prose-slate max-w-none prose-p:text-slate-700 prose-p:leading-relaxed">
              <p>
                Една от най-големите грешки в публичното разбиране е идеята, че „всички прозрачни шини са еднакви“. Не са.
                Алайнерът не просто стои върху зъбите. Той трябва да предава контролирана сила, да приляга точно, да запазва
                формата си през целия период на носене и да работи заедно с attachments, софтуерното планиране и биомеханиката
                на случая.
              </p>
              <p>
                Invisalign използва <strong>SmartTrack</strong> — собствен многослоен материал на Align Technology, разработен
                специално за ортодонтски движения. Това не е дребна техническа подробност. При алайнерите материалът е част
                от механиката: той влияе върху прилягането, начина на предаване на силата, стабилността между смените и това
                доколко планът може да се изпълни в реална уста.
              </p>
            </div>

            <ul className="mt-6 space-y-2.5 text-[14px] text-slate-700">
              {[
                'Алайнерът „щрака“ по-добре върху зъбите',
                'Силата се разпределя по-равномерно',
                'Запазва формата си между смените',
                'Движението е по-предвидимо',
                'Без остри ръбове, телчета или рани като при брекети',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[13.5px] text-slate-500 italic max-w-2xl">
              Това не означава, че материалът сам лекува. Най-добрата пластмаса в ръцете на слаб план няма да даде добър
              резултат. Но при равни други условия — добър лекар, план и дисциплиниран пациент — материалът е реална част от
              резултата.
            </p>
          </div>

          {/* Visual comparison card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">SmartTrack vs обикновени алайнери</p>
              <div className="space-y-3">
                <div className="rounded-2xl bg-teal-50/60 ring-1 ring-teal-100 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-teal-700 mb-1">SmartTrack</p>
                  <p className="text-[13.5px] text-slate-700 leading-relaxed">
                    Многослоен медицински полимер, проектиран за ортодонтска сила. Прецизно прилягане, постоянна сила, стабилност между смените.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Генеричен PETG</p>
                  <p className="text-[13.5px] text-slate-600 leading-relaxed">
                    Изглежда подобно за пациента, но не дава същото ниво на контрол, стабилност и предвидимост в клиничната система.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPLEX CASES ─── */}
      <section id="complex" className="max-w-6xl mx-auto px-4 sm:px-6 py-20" data-testid="invisalign-complex">
        <p className="text-[12px] uppercase tracking-[0.18em] text-teal-700 font-medium mb-3">Сложни случаи</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-5 max-w-3xl">
          Работи ли Invisalign при сложни случаи? <span className="text-teal-600">Често — да.</span>
        </h2>

        <div className="rounded-2xl bg-white/80 ring-1 ring-slate-200/70 p-6 sm:p-8 max-w-3xl mb-10">
          <p className="text-slate-700 leading-relaxed">
            Правилната позиция не е „Invisalign може всичко без ограничения“. Правилната позиция е:
          </p>
          <p className="mt-3 font-serif text-lg sm:text-xl text-slate-900 leading-snug">
            „Invisalign може да лекува много сложни ортодонтски случаи, когато случаят е правилно подбран, планиран от опитен
            Invisalign лекар и пациентът е достатъчно дисциплиниран.“
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPLEX_CASES.map((c, i) => (
            <div key={i} className="rounded-2xl bg-white ring-1 ring-slate-200/70 p-5 hover:ring-teal-200 hover:-translate-y-0.5 transition-all" data-testid={`complex-card-${i}`}>
              <div className="w-9 h-9 rounded-xl bg-teal-50 ring-1 ring-teal-100 flex items-center justify-center mb-3">
                <Compass className="w-4.5 h-4.5 text-teal-600" />
              </div>
              <h3 className="font-medium text-slate-900 text-[15px] mb-1">{c.title}</h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[13.5px] text-slate-500 italic max-w-3xl">
          При много тежки скелетни несъответствия, определени екстракционни случаи, много големи ротации или ако пациентът няма
          да носи алайнерите достатъчно — брекети или комбиниран подход могат да са по-предвидимият избор. Силният лекар не
          продава система на всяка цена — избира подходящата механика за конкретния случай.
        </p>
      </section>

      {/* ─── HOW IT WORKS — TIMELINE ─── */}
      <section id="how" className="relative py-20 bg-gradient-to-b from-white/60 to-[#FCFAF8]" data-testid="invisalign-how">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-[12px] uppercase tracking-[0.18em] text-teal-700 font-medium mb-3">Процес</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-10 max-w-3xl">
            Как протича лечението с Invisalign?
          </h2>

          <ol className="grid md:grid-cols-2 gap-4">
            {TIMELINE.map((step, i) => {
              const Icon = step.icon
              return (
                <li key={i} className="rounded-2xl bg-white ring-1 ring-slate-200/70 p-5 sm:p-6" data-testid={`timeline-${i}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 ring-1 ring-teal-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 mb-1">{step.title}</h3>
                      <p className="text-[14px] text-slate-600 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* ─── BULGARIA PRESENCE ─── */}
      <section id="bulgaria" className="max-w-6xl mx-auto px-4 sm:px-6 py-20" data-testid="invisalign-bulgaria-section">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 sm:p-12 ring-1 ring-slate-700 relative overflow-hidden">
          <div aria-hidden className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-teal-500/15 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative max-w-3xl">
            <p className="text-[12px] uppercase tracking-[0.2em] text-teal-300 font-medium mb-3">Реален достъп</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold mb-5 leading-tight">
              Invisalign в България: представителство, доставка и реален достъп
            </h2>
            <p className="text-white/85 leading-relaxed mb-5">
              В България Invisalign има реално локално присъствие — включително <strong>българско юридическо/търговско
              представителство</strong>, сертифицирани Invisalign лекари, официален doctor locator, обучения и providers с
              различни нива на опит. Това означава, че лечението не е просто поръчка на шини от чужбина — то е част от
              система с локално обучени лекари, поддръжка и реална клинична екосистема.
            </p>
            <p className="text-white/75 leading-relaxed text-[14.5px]">
              По обратна връзка от практикуващи лекари в България, след финализиране на ClinCheck плана и поръчката,
              алайнерите често пристигат <strong>около 5 работни дни</strong>. Срокът може да варира според логистиката,
              клиниката, графика на производство или допълнителни корекции в плана.
            </p>
          </div>

          <div className="relative mt-8 grid sm:grid-cols-3 gap-3 max-w-3xl">
            {[
              { k: 'Локално представителство', v: 'Българско юридическо/търговско присъствие' },
              { k: 'Сертифицирани лекари', v: 'Doctor locator + различни нива на опит' },
              { k: 'Доставка', v: 'Около 5 работни дни в много случаи*' },
            ].map((b, i) => (
              <div key={i} className="rounded-2xl bg-white/8 backdrop-blur ring-1 ring-white/15 p-4">
                <p className="text-[11px] uppercase tracking-wider text-teal-300/90 mb-1">{b.k}</p>
                <p className="text-[13.5px] text-white/85 leading-snug">{b.v}</p>
              </div>
            ))}
          </div>
          <p className="relative mt-4 text-[11px] text-white/50">* Според актуална обратна връзка от лекари. Не е законова гаранция.</p>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="invisalign-pricing">
        <p className="text-[12px] uppercase tracking-[0.18em] text-teal-700 font-medium mb-3">Цени в България</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-3 max-w-3xl">
          Колко струва Invisalign в България?
        </h2>
        <p className="text-slate-600 max-w-2xl mb-10">
          Ориентировъчни диапазони, не фиксирана оферта. Финалната цена зависи от случая, броя алайнери, refinements, ретайнери
          и клиниката.
        </p>

        <div className="grid md:grid-cols-3 gap-5">
          {PRICE_TIERS.map((t) => (
            <div
              key={t.range}
              data-testid={`price-${t.range}`}
              className={
                'relative rounded-3xl p-6 sm:p-7 ring-1 transition-all hover:-translate-y-1 ' +
                (t.featured
                  ? 'bg-gradient-to-br from-teal-50 via-white to-cyan-50 ring-teal-200 shadow-[0_30px_70px_-30px_rgba(13,148,136,0.35)]'
                  : 'bg-white ring-slate-200/70 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.15)]')
              }
            >
              {t.featured && (
                <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-teal-600 text-white text-[11px] font-semibold uppercase tracking-wider">
                  Най-чест избор
                </span>
              )}
              <h3 className="font-serif text-xl text-slate-900 mb-1">{t.name}</h3>
              <p className="text-[12.5px] text-slate-500 mb-4">{t.desc}</p>
              <p className="text-3xl font-semibold text-slate-900 mb-1 tabular-nums">{t.price}</p>
              <p className="text-[12px] text-slate-400 mb-5">ориентировъчен диапазон</p>
              <ul className="space-y-2 text-[13.5px] text-slate-700">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-white/70 ring-1 ring-slate-200/70 p-6">
          <h3 className="font-medium text-slate-900 mb-3">Финалната цена зависи от:</h3>
          <ul className="grid sm:grid-cols-2 gap-2 text-[13.5px] text-slate-700">
            {[
              'Сложността на случая',
              'Броя алайнери',
              'Refinements (включени или допълнителни)',
              'Клиниката и опита на лекаря',
              'Дали ретайнерите са включени',
              'Диагностиката (рентген, скен)',
              'Дали се лекуват и двете челюсти',
              'Включените контролни прегледи',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-teal-600 mt-1 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── LIVING WITH INVISALIGN ─── */}
      <section id="living" className="max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="invisalign-living">
        <p className="text-[12px] uppercase tracking-[0.18em] text-teal-700 font-medium mb-3">Ежедневие</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-10 max-w-3xl">
          Как изглежда ежедневието с Invisalign?
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {LIVING_WITH.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="rounded-2xl bg-white ring-1 ring-slate-200/70 p-5" data-testid={`living-${i}`}>
                <div className="w-9 h-9 rounded-xl bg-teal-50 ring-1 ring-teal-100 flex items-center justify-center mb-3">
                  <Icon className="w-4.5 h-4.5 text-teal-600" />
                </div>
                <h3 className="font-medium text-slate-900 mb-1">{item.title}</h3>
                <p className="text-[13.5px] text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── INVISALIGN VS BRACES ─── */}
      <section id="vs-braces" className="max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="invisalign-vs-braces">
        <p className="text-[12px] uppercase tracking-[0.18em] text-teal-700 font-medium mb-3">Сравнение</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-3 max-w-3xl">
          Invisalign или брекети — кое е по-добро?
        </h2>
        <p className="text-slate-600 max-w-2xl mb-8">
          Няма универсален победител — има по-подходящ избор за конкретния случай. Брекетите запазват силните си страни в
          определени ситуации; Invisalign има сериозни предимства в лайфстайл, хигиена и естетика.
        </p>

        <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200/70 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-50/60 border-b border-slate-200/70">
                <th className="text-left py-3 px-4 sm:px-5 font-medium text-slate-700 w-1/3">Аспект</th>
                <th className="text-left py-3 px-4 sm:px-5 font-medium text-teal-800">Invisalign</th>
                <th className="text-left py-3 px-4 sm:px-5 font-medium text-slate-700">Брекети</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 px-4 sm:px-5 font-medium text-slate-800">{row.aspect}</td>
                  <td className="py-3 px-4 sm:px-5 text-slate-700">{row.invisalign}</td>
                  <td className="py-3 px-4 sm:px-5 text-slate-600">{row.braces}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-[13.5px] text-slate-500 italic max-w-3xl">
          За леки до умерени случаи Invisalign често е напълно равностоен, а понякога и по-удобен. За сложни случаи Invisalign
          може да бъде много силен избор — но изборът на лекар става още по-важен.
        </p>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 py-16" data-testid="invisalign-faq">
        <p className="text-[12px] uppercase tracking-[0.18em] text-teal-700 font-medium mb-3">Често задавани въпроси</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-8">
          Често задавани въпроси за Invisalign
        </h2>
        <FAQAccordion faqs={FAQS} />
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24" data-testid="invisalign-final-cta">
        <div className="rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-slate-200/70 p-8 sm:p-12 text-center relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-teal-100/40 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-cyan-100/30 blur-3xl" />
          </div>
          <div className="relative">
            <p className="text-[12px] uppercase tracking-[0.2em] text-teal-700 font-medium mb-3">Zubite.bg</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-4 max-w-2xl mx-auto leading-tight">
              Не си сигурен дали твоят случай е за Invisalign, брекети или друг подход?
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto mb-7">
              Zubite.bg не поставя диагноза. Кратък ориентир, който може да помогне да разбереш с какъв тип специалист има
              смисъл да говориш.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/quiz"
                data-testid="final-primary-cta"
                className="group inline-flex items-center gap-2 px-7 py-4 rounded-full text-white text-sm font-medium shadow-[0_12px_30px_-10px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:-translate-y-0.5"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
              >
                Провери своя случай за 60 секунди
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/"
                data-testid="final-secondary-cta"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white ring-1 ring-slate-200/80 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Разгледай как работи Zubite.bg
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-2 text-[12.5px]">
              {['60 секунди', 'Без регистрация', 'Ориентир, не диагноза'].map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 ring-1 ring-slate-200/60 text-slate-600">
                  <CheckCircle2 className="w-3 h-3 text-teal-600" /> {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Internal links footer */}
        <div className="mt-10 rounded-2xl bg-white/50 ring-1 ring-slate-200/60 p-6">
          <p className="text-[12px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-3">Свързано четене</p>
          <ul className="grid sm:grid-cols-2 gap-2 text-[14px]">
            {[
              { href: '/what-is-invisalign', label: 'Какво е Invisalign — основен гид' },
              { href: '/invisalign-price', label: 'Invisalign цени — детайлен преглед' },
              { href: '/aligners-vs-braces', label: 'Алайнери срещу брекети' },
              { href: '/aligners-comparison', label: 'Сравнение на алайнери' },
              { href: '/crooked-teeth', label: 'Криви зъби — какво да очакваш' },
              { href: '/orthodontics', label: 'Ортодонтия — общ преглед' },
            ].map((l, i) => (
              <li key={i}>
                <Link href={l.href} className="inline-flex items-center gap-1.5 text-slate-700 hover:text-teal-700 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  )
}
