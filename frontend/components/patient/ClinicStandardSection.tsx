import Link from 'next/link'
import { ShieldCheck, Heart, Award, Eye, ArrowRight, AlertTriangle, Gift, RefreshCw } from 'lucide-react'

interface PillarCard {
  icon: React.ReactNode
  title: string
  text: string
}

const PILLARS: PillarCard[] = [
  {
    icon: <Award className="w-4 h-4" />,
    title: 'Качество на работа',
    text: 'Гледаме дали клиниката има реален фокус в съответната категория, ясен подход към случаите и отговорна комуникация за възможности, срокове и ограничения.',
  },
  {
    icon: <Heart className="w-4 h-4" />,
    title: 'Отношение към пациента',
    text: 'Търсим клиники, които обясняват спокойно, не притискат пациента и уважават факта, че човек често започва от несигурност, страх или объркване.',
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    title: 'Професионализъм',
    text: 'Партньорската клиника трябва да комуникира навреме, да поддържа коректна информация и да използва отговорите от въпросника като пациентски контекст — не като диагноза.',
  },
  {
    icon: <Eye className="w-4 h-4" />,
    title: 'Прозрачност',
    text: 'Показваме клиники според посоката на случая, локацията и релевантността — не като скрита класация „най-добри клиники".',
  },
]

interface Props {
  /** Hide the explainer link if you're already on the standard page. */
  showExplainerLink?: boolean
  /** Slightly tighter on results page. */
  compact?: boolean
  /** Override testid. */
  testId?: string
}

/**
 * Patient-facing reusable trust block explaining the Zubite Clinic Standard.
 * Used on homepage, /clinic-standard, and other patient surfaces. Style
 * stays inside the existing premium glass aesthetic (ivory bg, teal accents,
 * deep navy serif). NO new design primitives.
 */
export function ClinicStandardSection({ showExplainerLink = true, compact = false, testId = 'clinic-standard-section' }: Props) {
  return (
    <section
      className={'relative ' + (compact ? 'py-14 md:py-16' : 'py-20 md:py-24') + ' bg-[#FCFAF8] overflow-hidden'}
      data-testid={testId}
    >
      <div aria-hidden className="absolute -top-24 -left-32 w-[28rem] h-[28rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute top-32 -right-24 w-[24rem] h-[24rem] rounded-full bg-cyan-100/35 blur-3xl pointer-events-none" />

      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="max-w-3xl mb-10">
          <p className="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-teal-700 mb-3">
            Zubite стандарт
          </p>
          <h2 className="font-serif text-[2rem] sm:text-[2.5rem] lg:text-[2.75rem] font-semibold text-slate-900 leading-[1.08] tracking-tight text-balance">
            Не всяка клиника може да бъде част от{' '}
            <span className="text-teal-600">Zubite.bg</span>.
          </h2>
          <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Работим с ограничен брой партньорски клиники, които покриват
            Zubite стандарт за качество на работа, отношение към пациента и
            професионализъм.
          </p>
        </div>

        {!compact && (
          <div className="mb-10 rounded-2xl bg-white/55 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)] p-6 md:p-7 max-w-3xl">
            <p className="text-[15px] text-slate-700 leading-relaxed">
              Когато видиш клиника в Zubite.bg, това не е случаен профил от
              отворен каталог. Клиниката е включена, защото покрива нашите
              критерии за участие и има релевантност към определени типове
              случаи. Целта не е да ти кажем коя клиника е „най-добра", а да
              ти помогнем да започнеш от <span className="text-slate-900 font-medium">по-подходящ и по-информиран първи разговор</span>.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="group rounded-2xl bg-white/70 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.18)] p-6 hover:ring-teal-200/70 hover:shadow-[0_22px_48px_-24px_rgba(13,148,136,0.25)] transition-all"
              data-testid={`clinic-standard-pillar-${p.title}`}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-teal-50/80 text-teal-700 ring-1 ring-teal-100">
                  {p.icon}
                </span>
                <h3 className="font-serif text-lg text-slate-900 leading-snug">
                  {p.title}
                </h3>
              </div>
              <p className="text-[14px] text-slate-600 leading-relaxed">
                {p.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 max-w-3xl">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50/60 ring-1 ring-amber-200/50 p-4">
            <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-amber-900 leading-relaxed">
              Zubite.bg не поставя диагноза, не гарантира медицински резултат
              и не заменя преглед при стоматолог. Помагаме ти да се
              ориентираш и да започнеш по-смислен разговор с подходяща
              партньорска клиника.
            </p>
          </div>

          {showExplainerLink && (
            <div className="mt-6">
              <Link
                href="/clinic-standard"
                className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-800 text-sm font-medium transition-colors"
                data-testid="clinic-standard-explainer-link"
              >
                Виж Zubite стандарт
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Compact glass card variant for embedding on clinic profile / list pages.
 * Renders the same trust pillars more tightly.
 */
export function ClinicStandardMiniNote({ testId = 'clinic-standard-mini' }: { testId?: string }) {
  return (
    <div
      className="rounded-2xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.18)] p-5"
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-teal-50/80 text-teal-700 ring-1 ring-teal-100 flex-shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </span>
        <div>
          <h3 className="font-serif text-base sm:text-lg text-slate-900 leading-snug">
            Партньорска клиника в Zubite.bg
          </h3>
          <p className="mt-1.5 text-[13.5px] text-slate-600 leading-relaxed">
            Тази клиника е част от Zubite.bg, защото покрива нашия стандарт
            за качество на работа, отношение към пациента и професионализъм.
          </p>
          <details className="mt-3 group">
            <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 text-xs text-teal-700 font-medium hover:text-teal-800 select-none">
              Какво означава това?
              <ArrowRight className="w-3 h-3 transition-transform group-open:rotate-90" />
            </summary>
            <ul className="mt-3 space-y-1.5 text-[13px] text-slate-600 leading-relaxed">
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1.5">•</span><span>Клиниката не е случаен профил от отворен каталог.</span></li>
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1.5">•</span><span>Показва се за категории, в които има релевантност.</span></li>
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1.5">•</span><span>Получава пациентски контекст само ако заявиш контакт.</span></li>
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1.5">•</span><span>Отговорите от въпросника са ориентир, не диагноза.</span></li>
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1.5">•</span><span>Zubite.bg не гарантира резултат от лечение.</span></li>
              <li className="flex items-start gap-1.5"><span className="text-teal-500 mt-1.5">•</span><span>Care Pass е стандартна полза в партньорската ни мрежа — всеки наш пациент го получава при посещение в партньорска клиника.</span></li>
            </ul>
            <Link
              href="/clinic-standard"
              className="inline-flex items-center gap-1.5 mt-4 text-xs text-teal-700 hover:text-teal-800 font-medium"
            >
              Виж пълния Zubite стандарт
              <ArrowRight className="w-3 h-3" />
            </Link>
          </details>
        </div>
      </div>
    </div>
  )
}

export { PILLARS as CLINIC_STANDARD_PILLARS }

/** Helper export: full Care-Pass icon for usage in static explainer page. */
export const StandardIcons = { Gift, RefreshCw }
