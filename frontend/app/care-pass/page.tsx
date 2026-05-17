import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {
  ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Gift,
  Building2, ClipboardCheck, Stethoscope, Wallet,
  HelpCircle, Brush, Droplets, FlaskConical,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Zubite Care Pass — отстъпки за орална хигиена след консултация | Zubite.bg',
  description:
    'Care Pass е допълнителна полза от партньорските клиники: след като посетиш консултация чрез Zubite.bg, клиниката ще ти предостави карта с отстъпки за продукти за орална хигиена.',
  alternates: { canonical: 'https://zubite.bg/care-pass' },
  openGraph: {
    title: 'Zubite Care Pass — отстъпки за орална хигиена',
    description:
      'След проведена консултация в партньорска клиника чрез Zubite.bg получаваш Care Pass с отстъпки за продукти за орална хигиена.',
    url: 'https://zubite.bg/care-pass',
    siteName: 'Zubite.bg',
    locale: 'bg_BG',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

const ASSET_E_CARE_PASS_CARD =
  'https://customer-assets.emergentagent.com/job_25b55d94-1ed6-49c7-af05-4dd6f19863cf/artifacts/kyba9eaq_ChatGPT%20Image%20May%2017%2C%202026%2C%2010_21_45%20AM.png'

const STEPS = [
  { n: '01', t: 'Провери своя случай',  s: 'Отговори на кратък въпросник и получи разбираем ориентир за твоята ситуация.',                    icon: <ClipboardCheck className="w-5 h-5" /> },
  { n: '02', t: 'Заяви насочване',       s: 'Виж подходящи партньорски клиники според града, типа случай и предпочитанията ти.',              icon: <Building2 className="w-5 h-5" /> },
  { n: '03', t: 'Посети консултация',    s: 'Клиниката ще се свърже с теб, за да насрочите час за първоначална консултация.',                  icon: <Stethoscope className="w-5 h-5" /> },
  { n: '04', t: 'Получаваш Care Pass',   s: 'След проведената консултация клиниката ти предоставя Zubite Care Pass — отстъпки за орална хигиена.', icon: <Gift className="w-5 h-5" />, accent: true },
] as const

const BENEFITS = [
  { t: 'Четки и електрически четки', s: 'Отстъпки за ръчни и електрически четки за зъби от партньорски марки.',     icon: <Brush className="w-5 h-5" /> },
  { t: 'Пасти за зъби',              s: 'Отстъпки за пасти за ежедневна грижа, чувствителни зъби и противокариесна защита.', icon: <Sparkles className="w-5 h-5" /> },
  { t: 'Конец, междузъбни четки',    s: 'Продукти за междузъбна хигиена — конец, между­зъбни четки и сменяеми глави.', icon: <Droplets className="w-5 h-5" /> },
  { t: 'Вода за уста и допълнителни', s: 'Вода за уста, гелове за венци, продукти след процедури и грижа след избелване.', icon: <FlaskConical className="w-5 h-5" /> },
] as const

const FAQ = [
  { q: 'Как получавам Zubite Care Pass?',                        a: 'След като заявиш насочване чрез Zubite.bg и посетиш консултация в партньорска клиника, клиниката ще ти предостави Zubite Care Pass.' },
  { q: 'Какво съдържа Care Pass?',                                a: 'Care Pass включва отстъпки за партньорски продукти за орална хигиена — четки, пасти, конец, междузъбни четки, вода за уста и подобни продукти за ежедневна грижа за зъбите и венците.' },
  { q: 'Care Pass отстъпка от лечение ли е?',                     a: 'Не. Care Pass не намалява цената на лечение или процедури в клиниката. Отстъпките са за партньорски продукти за орална хигиена.' },
  { q: 'Care Pass абонамент или членска такса ли е?',             a: 'Не. Care Pass не е абонамент. Получаваш го еднократно от клиниката след посетена консултация чрез Zubite.bg.' },
  { q: 'Care Pass застраховка ли е?',                             a: 'Не. Care Pass не е застрахователен продукт и не покрива медицински разходи. Това е допълнителна полза за пациенти, които посещават консултация чрез Zubite.bg.' },
  { q: 'Care Pass замества ли препоръка от стоматолог?',          a: 'Не. Care Pass е допълнителна полза. Препоръки за продукти и процедури винаги се правят от стоматолог или ортодонт след преглед.' },
] as const

export default function CarePassPage() {
  return (
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden" data-testid="care-pass-page">
      <Header />

      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-hidden" data-testid="care-pass-hero">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 15% 20%, rgba(94,234,212,0.35) 0%, transparent 60%),' +
              'radial-gradient(ellipse 60% 50% at 85% 60%, rgba(165,243,252,0.45) 0%, transparent 60%),' +
              'linear-gradient(180deg, #FCFAF8 0%, #F4FAF9 100%)',
          }}
        />
        <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/40 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 backdrop-blur-md ring-1 ring-white/70 text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold px-3 py-1.5">
              <Gift className="w-3 h-3" /> Zubite Care Pass
            </span>
            <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 leading-tight">
              Care Pass — допълнителна <em className="not-italic text-teal-600">полза</em> от партньорската клиника.
            </h1>
            <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
              След като посетиш консултация в партньорска клиника чрез Zubite.bg,
              клиниката ще ти предостави Zubite Care Pass — карта с отстъпки
              за продукти за орална хигиена.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/quiz"
                className="group relative inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-5 py-3 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
                data-testid="hero-primary-cta"
              >
                <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
                <span className="relative inline-flex items-center gap-1.5">
                  Провери своя случай
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link
                href="#how"
                className="relative inline-flex items-center gap-1.5 rounded-full bg-white/35 backdrop-blur-2xl text-slate-900 text-sm font-medium px-5 py-3 ring-1 ring-white/60 hover:bg-white/55 hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden"
              >
                <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/2 rounded-full bg-white/65 blur-sm pointer-events-none" />
                <span className="relative">Виж как работи</span>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Без задължение', 'След проведена консултация', 'Не е отстъпка от лечение'].map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/50 backdrop-blur-md ring-1 ring-white/70 text-[11px] text-slate-700 font-medium px-3 py-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 text-teal-500" />
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Care Pass card visual */}
          <div className="relative w-full max-w-md mx-auto lg:ml-auto">
            <div aria-hidden className="absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-teal-200/40 to-cyan-100/30 blur-3xl pointer-events-none" />
            <Image
              src={ASSET_E_CARE_PASS_CARD}
              alt="Zubite Care Pass — карта с отстъпки за продукти за орална хигиена"
              width={900}
              height={900}
              className="relative w-full h-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.35)]"
              unoptimized
              priority
            />
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────── */}
      <section id="how" className="relative py-20 sm:py-28" data-testid="care-pass-how">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Как работи</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
              4 стъпки от въпросник до Care Pass.
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
              Care Pass се предоставя от клиниката след посетена консултация чрез Zubite.bg.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {STEPS.map((s, i) => {
              const accent = (s as { accent?: boolean }).accent
              return (
                <div
                  key={s.n}
                  className={
                    'relative rounded-2xl backdrop-blur-xl p-6 h-full transition-all hover:-translate-y-1 ' +
                    (accent
                      ? 'bg-gradient-to-br from-teal-50/90 to-white/80 ring-1 ring-teal-300/50 shadow-[0_18px_40px_-22px_rgba(13,148,136,0.4)]'
                      : 'bg-white/70 ring-1 ring-white/80 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)]')
                  }
                  data-testid={`care-pass-step-${i}`}
                >
                  <span className={'font-serif text-3xl font-bold ' + (accent ? 'text-teal-500/70' : 'text-teal-600/30')}>
                    {s.n}
                  </span>
                  <div className={'mt-3 inline-flex items-center justify-center w-10 h-10 rounded-xl ring-1 ' + (accent ? 'bg-teal-500/10 text-teal-700 ring-teal-200' : 'bg-teal-50/80 text-teal-700 ring-teal-100')}>
                    {s.icon}
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-semibold text-slate-900 leading-tight">{s.t}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.s}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── What's inside (benefits) ─────────────────── */}
      <section className="relative py-20 sm:py-28 overflow-hidden" data-testid="care-pass-benefits">
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 30% 40%, rgba(94,234,212,0.18) 0%, transparent 70%),' +
              'linear-gradient(180deg, #F4FAF9 0%, #FCFAF8 100%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1.3fr] gap-12 items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Какво включва</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
              Отстъпки за партньорски продукти за орална хигиена.
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-md">
              Care Pass събира отстъпки за продукти, които поддържат
              ежедневната грижа за зъбите и венците — независимо дали
              продължаваш с лечение или просто се грижиш редовно.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {BENEFITS.map((b, i) => (
              <div
                key={b.t}
                className="group rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 p-5 hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_16px_44px_-22px_rgba(13,148,136,0.25)] transition-all shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)]"
                data-testid={`care-pass-benefit-${i}`}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50/80 text-teal-700 ring-1 ring-teal-100 group-hover:bg-teal-100 transition-colors">
                  {b.icon}
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-slate-900">{b.t}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{b.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What Care Pass is NOT ────────────────────── */}
      <section className="relative py-16 sm:py-20" data-testid="care-pass-not">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative rounded-3xl bg-white/65 backdrop-blur-2xl ring-1 ring-white/75 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] p-8 sm:p-10">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
                  Care Pass <em className="not-italic text-amber-700">не е</em>:
                </h2>
                <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700">
                  {[
                    'отстъпка от лечение',
                    'застрахователен продукт',
                    'абонамент или членска такса',
                    'безплатно лечение',
                    'гаранция за резултат от лечение',
                    'замяна на медицинска препоръка',
                  ].map((n) => (
                    <li key={n} className="flex items-start gap-2">
                      <Wallet aria-hidden className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                  Care Pass е допълнителна полза за пациенти, които посещават
                  консултация в партньорска клиника чрез Zubite.bg. Препоръки
                  за лечение и продукти винаги се правят от стоматолог или
                  ортодонт след преглед.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────── */}
      <section className="relative py-20 sm:py-28" data-testid="care-pass-faq">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-700 font-semibold">Често задавани въпроси</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
              Кратки отговори за Care Pass.
            </h2>
          </div>
          <div className="mt-10 rounded-3xl bg-white/65 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_12px_50px_-20px_rgba(15,23,42,0.18)] px-5 sm:px-7 py-2">
            {FAQ.map((it, i) => (
              <details key={it.q} className="group/faq border-b border-slate-200/60 last:border-b-0" data-testid={`care-pass-faq-${i}`}>
                <summary className="list-none flex items-start sm:items-center justify-between gap-4 py-5 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded-lg">
                  <span className="font-serif text-base sm:text-lg text-slate-900 leading-snug">{it.q}</span>
                  <HelpCircle className="w-4 h-4 text-slate-400 group-open/faq:text-teal-600 transition-colors shrink-0 mt-1 sm:mt-0" />
                </summary>
                <p className="pb-5 pr-8 text-sm text-slate-600 leading-relaxed">{it.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 overflow-hidden" data-testid="care-pass-final-cta">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-teal-50 to-white" />
        <div aria-hidden className="absolute -top-40 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-cyan-100/40 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative rounded-[2rem] bg-white/55 backdrop-blur-2xl ring-1 ring-white/70 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] px-6 sm:px-12 py-12 sm:py-16 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-teal-100 text-teal-700 text-[11px] font-medium px-3 py-1">
              <Sparkles className="w-3 h-3" /> ~60 секунди
            </span>
            <h2 className="mt-5 font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
              Първо яснота. <br />После — подходяща следваща стъпка.
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Провери своя случай, заяви насочване и след посетена консултация
              ще получиш Zubite Care Pass от клиниката.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/quiz"
                className="group relative inline-flex items-center gap-1.5 rounded-full text-white text-sm font-medium px-5 py-3 transition-all hover:-translate-y-0.5 shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.20)] overflow-hidden"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
                data-testid="final-primary-cta"
              >
                <span aria-hidden className="absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-white/25 blur-sm pointer-events-none" />
                <span className="relative inline-flex items-center gap-1.5">
                  Провери своя случай за 60 секунди
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
            <p className="mt-7 text-[11px] text-slate-400 leading-snug max-w-lg mx-auto">
              Care Pass се предоставя от клиниката след проведена консултация чрез Zubite.bg.
              Zubite.bg не поставя диагноза и не заменя професионален стоматологичен преглед.
            </p>
          </div>
        </div>
      </section>

      <Footer />

      {/* JSON-LD FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((it) => ({
              '@type': 'Question',
              name: it.q,
              acceptedAnswer: { '@type': 'Answer', text: it.a },
            })),
          }),
        }}
      />
    </main>
  )
}
