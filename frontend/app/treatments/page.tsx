import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ClientParallaxMount } from '@/components/motion/ClientParallaxMount'
import {
  ArrowRight, CheckCircle2, Smile, Stethoscope, Sparkles,
  Activity, Heart, AlignLeft, Baby, Brush, ShieldCheck, HelpCircle,
} from 'lucide-react'

// /treatments — Treatment-orientation hub.
//
// Purpose: answer "Какъв тип лечение или консултация може да е релевантна за
// мен?" — without diagnosing, without representing Zubite as a clinic, and
// without pushing clinic-directory browsing as the dominant action.
//
// Schema is `CollectionPage` + `BreadcrumbList` + `ItemList` (only live
// categories). We deliberately avoid Service / MedicalProcedure / Dentist /
// Offer schemas so Google never reads Zubite as a treatment provider.

export const metadata: Metadata = {
  title: 'Лечения и категории · Дентална ориентация | Zubite.bg',
  description:
    'Разгледай категории дентално лечение — ортодонтия, алайнери, импланти, естетична стоматология, TMJ и сън. Zubite.bg помага да се ориентираш кой тип специалист или процедура може да е релевантна за теб. Не заменя преглед при лекар.',
  alternates: { canonical: 'https://zubite.bg/treatments' },
  openGraph: {
    title: 'Лечения и категории | Zubite.bg',
    description:
      'Ориентир кой тип дентално лечение може да е релевантен за теб. Не диагноза, а насока за разговор с лекар.',
    url: 'https://zubite.bg/treatments',
    type: 'website',
    locale: 'bg_BG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Лечения и категории | Zubite.bg',
    description:
      'Ориентир кой тип дентално лечение може да е релевантен за теб. Не диагноза.',
  },
  robots: { index: true, follow: true },
}

// ── Categories ──────────────────────────────────────────────────────────
// Live cards have a primary `href`. Soon cards have no primary link and may
// expose ONE small secondary link to an existing safe page.

interface LiveCategory {
  slug: string
  title: string
  short: string
  relevant: string
  href: string
  icon: React.ReactNode
  featured?: boolean
  secondary?: { href: string; label: string }
}
interface SoonCategory {
  slug: string
  title: string
  short: string
  icon: React.ReactNode
  secondary?: { href: string; label: string }
}

const LIVE_CATEGORIES: LiveCategory[] = [
  {
    slug: 'ortodontia',
    title: 'Ортодонтия',
    short:
      'Подредба на зъбите, неправилна захапка, струпване или разстояния — теми, които ортодонт оценява с преглед.',
    relevant:
      'Когато се питаш дали зъбите ти могат да се изправят и какви опции (брекети, алайнери) има за твоя случай.',
    href: '/orthodontics',
    icon: <Smile className="w-4 h-4" />,
    featured: true,
    secondary: { href: '/crooked-teeth', label: 'Криви зъби — въведение' },
  },
  {
    slug: 'alaineri',
    title: 'Алайнери',
    short:
      'Прозрачни шини като Invisalign, Spark, Angel Aligner — възможна алтернатива на брекети при подходящи случаи.',
    relevant:
      'Когато търсиш дискретно ортодонтско решение и искаш да разбереш дали случаят ти позволява алайнери.',
    href: '/aligners-vs-braces',
    icon: <AlignLeft className="w-4 h-4" />,
    featured: true,
    secondary: { href: '/aligners-comparison', label: 'Сравнение на алайнери' },
  },
  {
    slug: 'implanti',
    title: 'Импланти',
    short:
      'Дентални импланти — една от опциите за възстановяване при липсващ зъб или зъби. Точна оценка изисква преглед и образна диагностика.',
    relevant:
      'При липсващ зъб, стар мост, подвижна протеза или нужда от план за възстановяване.',
    href: '/implants',
    icon: <Stethoscope className="w-4 h-4" />,
    secondary: { href: '/implant-price', label: 'Ориентировъчни цени' },
  },
  {
    slug: 'estetichna-stomatologia',
    title: 'Естетична стоматология',
    short:
      'Фасети, бондинг, избелване, корекция на формата — категории, които често се обсъждат на консултация при естетична насока.',
    relevant:
      'Когато искаш ориентир за естетични опции и какво е реалистично за твоята усмивка.',
    href: '/cosmetic-dentistry',
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    slug: 'tmj',
    title: 'Челюстна става / TMJ',
    short:
      'Щракане, пукане, болка в челюстта, скърцане със зъби или сутрешно напрежение — теми, които изискват преглед.',
    relevant:
      'При повтарящи се сигнали от челюстната става или съмнение за бруксизъм.',
    href: '/tmj',
    icon: <Activity className="w-4 h-4" />,
  },
  {
    slug: 'sun-i-dishane',
    title: 'Сън и дишане',
    short:
      'Дентални теми, свързани със сън, дишане през устата, захапка и челюстна позиция. Не заменя оценка от лекар по съня.',
    relevant:
      'При сигнали като хъркане, неспокоен сън или дишане през устата, които искаш да обсъдиш със стоматолог.',
    href: '/sleep-airway',
    icon: <Heart className="w-4 h-4" />,
  },
  {
    slug: 'breketi',
    title: 'Брекети',
    short:
      'Метални, керамични, лингвални или само-лигиращи брекети — фиксирано ортодонтско лечение, което се планира и води от ортодонт.',
    relevant:
      'Когато обмисляш ортодонтско лечение и искаш да разбереш какви типове брекети има и как се сравняват с алайнери.',
    href: '/breketi',
    icon: <AlignLeft className="w-4 h-4" />,
    secondary: { href: '/aligners-vs-braces', label: 'Сравнение с алайнери' },
  },
]

const SOON_CATEGORIES: SoonCategory[] = [
  {
    slug: 'venci-higiena',
    title: 'Венци и орална хигиена',
    short:
      'Кървене, чувствителност, неприятен дъх, плакировка. Самостоятелна категория е в подготовка.',
    icon: <Brush className="w-4 h-4" />,
    secondary: { href: '/symptoms', label: 'Разгледай симптоми' },
  },
  {
    slug: 'detska-stomatologia',
    title: 'Детска стоматология',
    short:
      'Грижа за млечни и постоянни зъби, ранна оценка от детски стоматолог. Самостоятелна страница е в подготовка.',
    icon: <Baby className="w-4 h-4" />,
  },
]

const FAQ = [
  {
    q: 'Zubite.bg поставя ли диагноза?',
    a: 'Не. Zubite.bg не поставя диагноза и не заменя преглед. Платформата помага да се ориентираш каква тема може да е релевантна за теб, за да я обсъдиш с лекар по дентална медицина.',
  },
  {
    q: 'Как да избера между различните категории?',
    a: 'Започни от темата, която най-много съвпада с твоя сигнал — например подредба на зъбите, липсващ зъб, естетика, венци или челюстна функция. Точна оценка кой тип специалист и процедура са релевантни става след преглед.',
  },
  {
    q: 'Каква е разликата между категория лечение и конкретна процедура?',
    a: 'Категорията описва тематичен тип проблем (например „ортодонтия"). Конкретната процедура (например алайнери, метални брекети, керамични брекети) е една от възможните стъпки в тази категория и зависи от случая.',
  },
  {
    q: 'Кога трябва да посетя лекар по дентална медицина?',
    a: 'При болка, кървене, подуване, чувствителност, травма или нов сигнал, който ти прави впечатление — препоръчително е да си насрочиш преглед без отлагане. Zubite.bg е ориентир преди разговора, не заместител на прегледа.',
  },
  {
    q: 'Мога ли да видя клиники по категория?',
    a: 'Да. Публичният каталог на партньорски клиники е достъпен на /kliniki и поддържа филтриране по град и категория. Zubite не подрежда клиниките като „най-добри" — каталогът е информационен.',
  },
] as const

// ── JSON-LD ─────────────────────────────────────────────────────────────
const SITE = 'https://zubite.bg'

const collectionPageLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE}/treatments`,
  url: `${SITE}/treatments`,
  name: 'Лечения и категории · Дентална ориентация',
  inLanguage: 'bg-BG',
  description:
    'Тематичен ориентир по дентални категории — ортодонтия, алайнери, импланти, естетична стоматология, TMJ и сън. Zubite.bg не поставя диагноза и не заменя преглед при стоматолог.',
  isPartOf: { '@type': 'WebSite', name: 'Zubite.bg', url: SITE },
}

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Начало', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Лечения', item: `${SITE}/treatments` },
  ],
}

const itemListLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Дентални категории за ориентация',
  itemListOrder: 'https://schema.org/ItemListOrderAscending',
  numberOfItems: LIVE_CATEGORIES.length,
  itemListElement: LIVE_CATEGORIES.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.title,
    url: `${SITE}${c.href}`,
  })),
}

const safeJsonLd = (node: unknown) =>
  JSON.stringify(node).replace(/</g, '\\u003c')

export default function TreatmentsPage() {
  return (
    <main
      className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden"
      data-testid="treatments-page"
    >
      <ClientParallaxMount />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListLd) }} />

      <Header />

      {/* ─── Hero ─────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-hidden"
        data-testid="treatments-hero"
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
        <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none parallax-bg-slow" />
        <div aria-hidden className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/35 blur-3xl pointer-events-none parallax-bg-medium" />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 backdrop-blur-md ring-1 ring-white/70 text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold px-3 py-1.5">
            <ShieldCheck className="w-3 h-3" /> Лечения и категории
          </span>
          <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 leading-tight">
            Какъв тип лечение или консултация може да е{' '}
            <em className="not-italic text-teal-600">релевантна за теб?</em>
          </h1>
          <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Разгледай основните дентални категории и се ориентирай какъв тип
            специалист, преглед или следваща стъпка може да има смисъл да
            обсъдиш. Zubite.bg не поставя диагноза и не замества преглед.
          </p>

          {/* Trust chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {['Ориентир, не диагноза', 'Категории по теми', 'Следваща стъпка с повече яснота'].map((c) => (
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
              data-testid="treatments-hero-primary-cta"
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
              href="/kliniki"
              data-testid="treatments-hero-secondary-cta"
              className="relative inline-flex items-center gap-1.5 rounded-full bg-white/35 backdrop-blur-2xl text-slate-700 text-sm font-medium px-5 py-3 ring-1 ring-white/60 hover:bg-white/55 hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden"
            >
              <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/2 rounded-full bg-white/65 blur-sm pointer-events-none" />
              <span className="relative">Виж публичния каталог</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Intro micro-section ──────────────────────── */}
      <section
        className="relative -mt-4 pb-10 sm:pb-12"
        data-testid="treatments-intro"
      >
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] p-5 sm:p-6">
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              Категориите по-долу не са диагноза. Те помагат да разбереш какви
              теми може да са свързани със ситуацията ти — например подредба
              на зъбите, липсващ зъб, естетика, венци, челюстна функция или
              сън и дишане.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Categories grid ──────────────────────────── */}
      <section
        className="relative py-12 sm:py-16 overflow-hidden"
        data-testid="treatments-grid"
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 80% 30%, rgba(165,243,252,0.20) 0%, transparent 70%),' +
              'linear-gradient(180deg, #FCFAF8 0%, #F7FBFA 100%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold eyebrow-sparkle">
              Категории
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
              С какви теми може да ти помогне Zubite.bg да се ориентираш?
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Виж кое описание най-много съвпада с твоя сигнал и разгледай съответната категория.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {LIVE_CATEGORIES.map((c) => (
              <article
                key={c.slug}
                data-testid={`treatment-card-${c.slug}`}
                className={
                  'group relative flex flex-col rounded-2xl backdrop-blur-xl p-5 sm:p-6 h-full transition-all hover:-translate-y-1 overflow-hidden ' +
                  (c.featured
                    ? 'bg-gradient-to-br from-white/90 to-teal-50/70 ring-1 ring-teal-200/60 shadow-[0_14px_44px_-22px_rgba(13,148,136,0.35)] hover:shadow-[0_22px_56px_-22px_rgba(13,148,136,0.45)]'
                    : 'bg-white/70 ring-1 ring-white/80 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] hover:bg-white/85 hover:shadow-[0_16px_44px_-22px_rgba(15,23,42,0.22)]')
                }
              >
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 90% 0%, rgba(20,184,166,0.10) 0%, transparent 60%)' }}
                />
                <div
                  className={
                    'relative inline-flex items-center justify-center w-10 h-10 rounded-xl ring-1 ' +
                    (c.featured
                      ? 'bg-teal-500/10 text-teal-700 ring-teal-200/70'
                      : 'bg-teal-50/80 text-teal-700 ring-teal-100/80')
                  }
                >
                  {c.icon}
                </div>
                <h3 className="relative mt-3 font-serif text-lg sm:text-xl font-semibold text-slate-900">
                  {c.title}
                </h3>
                <p className="relative mt-2 text-sm text-slate-600 leading-relaxed">
                  {c.short}
                </p>
                <p className="relative mt-3 text-xs uppercase tracking-[0.14em] text-slate-400 font-semibold">
                  Кога може да е релевантно
                </p>
                <p className="relative mt-1 text-sm text-slate-700 leading-relaxed">
                  {c.relevant}
                </p>
                <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-slate-200/60">
                  <Link
                    href={c.href}
                    data-testid={`treatment-card-${c.slug}-link`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
                  >
                    Виж насоки <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  {c.secondary && (
                    <Link
                      href={c.secondary.href}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      {c.secondary.label}
                    </Link>
                  )}
                </div>
              </article>
            ))}

            {SOON_CATEGORIES.map((c) => (
              <article
                key={c.slug}
                data-testid={`treatment-card-soon-${c.slug}`}
                aria-disabled="true"
                className="relative flex flex-col rounded-2xl bg-white/45 backdrop-blur-xl ring-1 ring-white/70 p-5 sm:p-6 h-full overflow-hidden opacity-90"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50/80 text-slate-400 ring-1 ring-slate-200/70">
                    {c.icon}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100/80 text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold px-2.5 py-1">
                    Скоро
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-lg sm:text-xl font-semibold text-slate-700">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  {c.short}
                </p>
                {c.secondary && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <Link
                      href={c.secondary.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-teal-700 transition-colors"
                    >
                      {c.secondary.label} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── "Не си сигурен/а откъде да започнеш?" ───── */}
      <section
        className="relative py-16 sm:py-20"
        data-testid="treatments-quiz-panel"
      >
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white ring-1 ring-white/10 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.55)] p-7 sm:p-10">
            <div
              aria-hidden
              className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-teal-500/15 blur-3xl pointer-events-none"
            />
            <div
              aria-hidden
              className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none"
            />
            <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-teal-300 font-semibold">
                  Ориентация
                </p>
                <h2 className="mt-3 font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight">
                  Не си сигурен/а откъде да започнеш?
                </h2>
                <p className="mt-4 text-slate-200 text-sm sm:text-base leading-relaxed max-w-xl">
                  Кратката ориентация на Zubite може да ти помогне да стесниш
                  темата и да видиш каква следваща стъпка има смисъл да
                  обсъдиш.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                <Link
                  href="/quiz"
                  data-testid="treatments-quiz-cta"
                  className="group inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-slate-900 text-sm font-medium px-5 py-3 hover:bg-teal-50 transition-colors"
                >
                  Започни ориентация
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/symptoms"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-medium px-5 py-3 ring-1 ring-white/25 hover:bg-white/15 transition-colors"
                >
                  Разгледай симптоми
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────── */}
      <section
        className="relative py-16 sm:py-20"
        data-testid="treatments-faq"
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold eyebrow-sparkle">
              Често задавани въпроси
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">
              Какво да очакваш от категориите?
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQ.map((f, i) => (
              <details
                key={i}
                data-testid={`treatments-faq-${i}`}
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

      {/* ─── Final CTA ────────────────────────────────── */}
      <section
        className="relative pt-8 pb-20 sm:pb-28"
        data-testid="treatments-final-cta"
      >
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
              разговор с лекар.
            </p>
            <div className="relative mt-7 flex justify-center">
              <Link
                href="/quiz"
                data-testid="treatments-final-cta-primary"
                className="group inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-6 py-3 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
              >
                <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
                <span className="relative inline-flex items-center gap-1.5">
                  Започни ориентация
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
