'use client'

/**
 * Orthodontics-only homepage — a copy of TasteHome.tsx (which stays
 * untouched as the locked-in reference version). Live at `/` for now,
 * until quizzes exist for the other treatment categories: the treatment
 * grid below only lists Ортодонтия, and a scroll-fill statistic section
 * was added between the treatments and clinics sections. Everything else
 * is unchanged from TasteHome.tsx.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  CircleDot,
  Clock3,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { HomeTrustSignals } from '@/components/taste/HomeTrustSignals'
import { ScrollFillQuote } from '@/components/taste/ScrollFillQuote'
import { SymptomAccordion } from '@/components/taste/SymptomAccordion'
import type { HomeTrustSignals as HomeTrustSignalsData } from '@/lib/homeTrust'

// Ortho-only page: every symptom entry point now leads to an
// orthodontics signal, not a different treatment category. Reuses the
// existing /crooked-teeth page (already ortho content); the rest route
// to /orthodontics since there's no dedicated page per bite-symptom yet.
// `image` feeds the SymptomAccordion tiles (Apple-style hover accordion).
const symptoms = [
  {
    label: 'Криви или струпани зъби',
    note: 'Когато зъбите нямат достатъчно място в челюстта, те могат да се засичат, завъртат или подреждат неравномерно. Това променя усмивката, но с времето затруднява и почистването — трудно достъпните места между струпаните зъби събират повече плака и увеличават риска от кариес и възпаление на венците.',
    href: '/crooked-teeth',
    icon: CircleDot,
    image: '/images/1.png',
  },
  {
    label: 'Неравномерна захапка',
    note: 'Ако горните и долните зъби не се допират правилно при захапване, натоварването върху тях се разпределя неравномерно. С годините това може да доведе до по-бързо износване на емайла, повишена чувствителност и допълнително напрежение в челюстните стави.',
    href: '/orthodontics',
    icon: Sparkles,
    image: '/images/2.png',
  },
  {
    label: 'Разстояния между зъбите',
    note: 'Видимите разстояния между зъбите не са само естетически въпрос — те могат да задържат храна и да утежнят ежедневната хигиена. При по-изразени промежутъци понякога има ефект и върху говора, а не само върху външния вид на усмивката.',
    href: '/orthodontics',
    icon: Stethoscope,
    image: '/images/3.png',
  },
  {
    label: 'Изпъкнали предни зъби',
    note: 'Когато предните зъби стърчат напред спрямо останалите, устните трудно ги покриват напълно в спокойно състояние. Освен видимия ефект, това увеличава риска от травма при удар и понякога затруднява пълноценното затваряне на устата.',
    href: '/orthodontics',
    icon: ShieldCheck,
    image: '/images/4.png',
  },
  {
    label: 'Напрежение в челюстта',
    note: 'Пукане, схващане или дискомфорт около ушите и челюстта често са свързани с начина, по който зъбите се допират при захапване. Продължителното неправилно натоварване може да засегне мускулите и ставите, водещо до главоболие или дискомфорт при дъвчене.',
    href: '/orthodontics',
    icon: Clock3,
    image: '/images/5.png',
  },
]

// Only Ортодонтия for now — the other categories stay off the homepage
// grid until their own quizzes exist. See file header.
const treatments = [
  { index: '01', title: 'Ортодонтия', copy: 'Криви зъби, захапка, алайнери и брекети.', href: '/orthodontics' },
]

const faqs = [
  {
    question: 'Zubite.bg клиника ли е?',
    answer: 'Не. Zubite.bg е независима платформа за ориентация и насочване. Помагаме ти да подредиш информацията и да избереш разумна следваща стъпка.',
  },
  {
    question: 'Получавам ли диагноза?',
    answer: 'Не. Резултатът е ориентир според отговорите ти. Диагноза и лечебен план могат да бъдат потвърдени единствено след преглед от стоматолог или ортодонт.',
  },
  {
    question: 'Колко време отнема?',
    answer: 'Обикновено около 60 секунди. Не е нужна регистрация, за да видиш първоначалното обобщение.',
  },
  {
    question: 'Как се избират клиниките?',
    answer: 'Съобразяваме категорията лечение, града, описания случай, наличните услуги и релевантността. Целта е подходяща посока, а не случаен списък.',
  },
  {
    question: 'Какво е Care Pass и кога го получавам?',
    answer: 'След реално посетена консултация чрез Zubite.bg партньорската клиника ти предоставя Care Pass с предложения за продукти за орална хигиена. Не е отстъпка от лечение и не заменя препоръка от стоматолог.',
  },
]

export function TasteHomeOrtho({ trustSignals }: { trustSignals: HomeTrustSignalsData | null }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    // The homepage is an entry surface, so a fresh visit should never inherit
    // a previous scroll position. Preserve intentional deep links such as
    // /#how-it-works.
    if (window.location.hash) return

    const previousRestoration = window.history.scrollRestoration
    const resetToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    window.history.scrollRestoration = 'manual'
    resetToTop()
    const frame = window.requestAnimationFrame(resetToTop)
    window.addEventListener('pageshow', resetToTop)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pageshow', resetToTop)
      window.history.scrollRestoration = previousRestoration
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.add('taste-motion-ready')

    const revealItems = Array.from(root.querySelectorAll<HTMLElement>('.taste-reveal'))
    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    revealItems.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  const startVideo = async () => {
    if (!videoRef.current) return
    setPlaying(true)
    await videoRef.current.play().catch(() => setPlaying(false))
  }

  return (
    <div ref={rootRef} className="taste-site taste-ortho-home">
      <Header home />

      <main className="taste-page" data-testid="taste-home">
        <section className="taste-hero" data-testid="home-hero">
          <div className="taste-paper-texture" aria-hidden />
          <div className="taste-shell taste-hero-grid">
            <div className="taste-hero-copy">
              <p className="taste-hero-label taste-hero-fade taste-delay-1">
                За около 60 секунди
              </p>

              <h1 className="taste-hero-title taste-hero-fade taste-delay-2">
                <span>Виж какво следва</span>
                <span>за <em>твоите зъби.</em></span>
              </h1>

              {/* Extra top margin vs. the shared .taste-hero-body rule (24px)
                  — the title's large scale (up to 68px) made that gap read
                  tight; inline-scoped so TasteHome.tsx's hero is untouched. */}
              <p className="taste-hero-body taste-hero-fade taste-delay-3" style={{ marginTop: 36 }}>
                Отговори на 8–10 кратки въпроса. Получаваш ориентир за симптомите, подходящия специалист и до 3 релевантни клиники — само ако поискаш.
              </p>

              <div className="taste-hero-actions taste-hero-fade taste-delay-4">
                <Link href="/quiz" className="taste-button taste-button-accent" data-testid="hero-primary-cta">
                  Започни краткия тест
                  <ArrowRight aria-hidden className="taste-icon-sm" />
                </Link>
              </div>

              <p className="taste-hero-assurance taste-hero-fade taste-delay-5">
                <ShieldCheck aria-hidden /> Безплатно · без регистрация · не е диагноза
              </p>
            </div>

            <div className="taste-hero-stage taste-hero-fade taste-delay-3" aria-label="Какво ще получиш">
              <div className="taste-outcome-preview">
                <div className="taste-outcome-header">
                  <span>Твоят резултат</span>
                  <span className="taste-mini-badge">веднага</span>
                </div>
                <h2>Какво ще получиш</h2>
                <ul>
                  <li><Check aria-hidden /><span><strong>Кратко обобщение</strong> на вероятната посока</span></li>
                  <li><Check aria-hidden /><span><strong>Ясна следваща стъпка</strong> и подходящ тип специалист</span></li>
                  <li><Check aria-hidden /><span><strong>До 3 релевантни клиники</strong>, ако искаш съдействие</span></li>
                </ul>
                <p><ShieldCheck aria-hidden /> Ориентир, не онлайн диагноза</p>
              </div>
            </div>
          </div>
        </section>

        {trustSignals && <HomeTrustSignals signals={trustSignals} hideAutoUpdateNote />}

        <section className="taste-section taste-symptoms" data-testid="home-symptoms">
          <div className="taste-shell">
            <div className="taste-section-heading taste-reveal">
              <div>
                <p className="taste-eyebrow">Започни от сигнала</p>
                <h2>Какво <em>забелязваш?</em></h2>
              </div>
              <p>Не е нужно да знаеш медицинския термин. Избери това, което виждаш или усещаш, и тръгни оттам.</p>
            </div>

            <SymptomAccordion items={symptoms} />
          </div>
        </section>

        <section className="taste-section taste-treatments" data-testid="home-treatments">
          <div className="taste-shell taste-treatment-layout">
            <div className="taste-treatment-heading taste-reveal">
              <p className="taste-eyebrow">Дентални посоки</p>
              <h2>Разгледай<br />по <em>тема.</em></h2>
              <p>Практични ръководства без сензации, обещания и излишен медицински жаргон.</p>
              <Link href="/orthodontics">Всичко за ортодонтията <ArrowRight aria-hidden /></Link>
            </div>

            {/* Single-item layout: the shared 2-column grid would leave a
                large empty gap next to a lone card, so this is centered
                and width-capped instead of stretched across the grid.
                The card itself uses the consultation photo as a full-bleed
                background with a dark scrim, text overlaid at the bottom —
                `.is-ortho` carries this whole treatment (see globals.css);
                the shared .taste-treatment-card rule is untouched, so
                TasteHome.tsx's plain cards render exactly as before. */}
            <div className="taste-treatment-grid" style={{ gridTemplateColumns: '1fr', maxWidth: 720, margin: '0 auto', width: '100%' }}>
              {treatments.map((item) => (
                <Link href={item.href} className="taste-treatment-card is-ortho taste-reveal" key={item.title}>
                  <Image
                    src="/images/Consultation.png"
                    alt="Ортодонт показва прозрачен алайнер на пациент по време на консултация"
                    fill
                    className="taste-treatment-photo"
                    sizes="(max-width: 768px) 92vw, 720px"
                  />
                  <span aria-hidden className="taste-treatment-scrim" />
                  <span className="taste-treatment-badge">{item.index}</span>
                  <div className="taste-treatment-overlay-content">
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                    <span className="taste-treatment-link">Разгледай <ArrowRight aria-hidden /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <ScrollFillQuote
          text="Около 75% от хората в глобален мащаб имат нужда от зъбно преместване за подобряване на оралното здраве."
          keyPhrases={['75%', 'зъбно преместване']}
        />

        <section className="taste-clinics" data-testid="home-clinics">
          <div className="taste-shell taste-clinics-grid">
            <div className="taste-clinic-board taste-reveal">
              <div className="taste-board-toolbar"><span /><span /><span /><strong>Подходящи клиники</strong></div>
              <div className="taste-board-search"><Search aria-hidden /> София · Ортодонтия</div>
              <article>
                <div className="taste-clinic-avatar">01</div>
                <div><strong>Фокус върху твоя случай</strong><p>Услуги, град и контекст на заявката</p></div>
                <span className="taste-mini-badge">релевантно</span>
              </article>
              <article>
                <div className="taste-clinic-avatar">02</div>
                <div><strong>Проверим профил</strong><p>Информация за екипа и възможностите</p></div>
                <span className="taste-mini-badge">ясно</span>
              </article>
              <article>
                <div className="taste-clinic-avatar">03</div>
                <div><strong>Твое решение</strong><p>Ти избираш дали и как да продължиш</p></div>
                <span className="taste-mini-badge">без натиск</span>
              </article>
            </div>

            <div className="taste-clinic-copy taste-reveal">
              <p className="taste-eyebrow">Насочване, не класация</p>
              <h2>Не търсиш просто клиника.<br /><em>Търсиш правилната за случая.</em></h2>
              <p>Подреждаме възможностите според града, темата и това, което си описал. Не продаваме „най-добрата“ клиника и не обещаваме резултат.</p>
              <ul>
                <li><Check aria-hidden /> Проверима информация</li>
                <li><Check aria-hidden /> Релевантност към случая</li>
                <li><Check aria-hidden /> Решението остава твое</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="taste-section taste-lumi" data-testid="home-lumi">
          <div className="taste-shell taste-lumi-grid">
            <div className="taste-video-wrap taste-reveal">
              <video
                ref={videoRef}
                src="/videos/lumi-homepage-explainer.mp4"
                poster="/images/lumi-homepage-poster.webp"
                controls={playing}
                playsInline
                preload="none"
                onEnded={() => setPlaying(false)}
                data-testid="lumi-video"
              />
              {!playing && (
                <button type="button" onClick={startVideo} aria-label="Пусни видеото с Луми" className="taste-play-button">
                  <Play aria-hidden />
                </button>
              )}
              <div className="taste-video-caption"><Sparkles aria-hidden /> 30 сек · с Луми</div>
            </div>

            <div className="taste-lumi-copy taste-reveal">
              <p className="taste-eyebrow">Запознай се с Луми</p>
              <h2>Ясно обяснение.<br /><em>Без медицински шум.</em></h2>
              <p>Луми показва как Zubite.bg превръща объркването в кратък, спокоен и практичен следващ ход.</p>
              <ul>
                <li><span>01</span> Разбираш какъв може да е проблемът</li>
                <li><span>02</span> Получаваш обобщение на сигналите</li>
                <li><span>03</span> Виждаш към кого да се насочиш</li>
              </ul>
              <Link href="/quiz" className="taste-button taste-button-accent">Провери своя случай <ArrowRight aria-hidden className="taste-icon-sm" /></Link>
            </div>
          </div>
        </section>

        <section className="taste-care" data-testid="home-care-pass">
          <div className="taste-shell taste-care-grid">
            <div className="taste-care-copy taste-reveal">
              <p className="taste-eyebrow">След консултацията</p>
              <h2>Zubite <em>Care Pass.</em></h2>
              <p>Карта с партньорски ползи за продукти за орална хигиена, предоставяна от клиниката след консултация, заявена през Zubite.bg.</p>
              <div className="taste-care-actions">
                <span><ShieldCheck aria-hidden /> Не е отстъпка от лечение</span>
              </div>
            </div>
            <figure className="taste-care-image taste-reveal">
              <Image
                src="/images/stitch/care-pass.webp"
                alt="Zubite Care Pass"
                width={1280}
                height={960}
                sizes="(max-width: 768px) 92vw, 50vw"
              />
            </figure>
          </div>
        </section>

        <section className="taste-section taste-faq" data-testid="home-faq">
          <div className="taste-shell taste-faq-grid">
            <div className="taste-faq-heading taste-reveal">
              <p className="taste-eyebrow">Важното, накратко</p>
              <h2>Чести<br /><em>въпроси.</em></h2>
              <p>Прозрачно за това какво правим, какво не правим и какво получаваш.</p>
            </div>
            <div className="taste-faq-list taste-reveal">
              {faqs.map((item, index) => (
                <details key={item.question} open={index === 0}>
                  <summary><span>0{index + 1}</span>{item.question}<strong>+</strong></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="taste-final" data-testid="home-final-cta">
          <div className="taste-shell taste-final-inner taste-reveal">
            <div>
              <p className="taste-eyebrow">Готов ли си?</p>
              <h2>Разбери следващата<br /><em>разумна стъпка.</em></h2>
            </div>
            <div>
              <p>8–10 кратки въпроса. Ориентир веднага. Без регистрация и без диагноза онлайн.</p>
              <Link href="/quiz" className="taste-button taste-button-accent">Започни за 60 секунди <ArrowRight aria-hidden className="taste-icon-sm" /></Link>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="taste-home-path" data-testid="home-how-it-works">
          <div className="taste-shell taste-home-path-inner">
            <h2>Как го получаваш</h2>
            <ol>
              <li><span>1</span><div><strong>Отговаряш</strong><p>8–10 кратки въпроса</p></div></li>
              <li><span>2</span><div><strong>Виждаш ориентира</strong><p>резултатът е веднага</p></div></li>
              <li><span>3</span><div><strong>Избираш</strong><p>продължаваш по своя начин</p></div></li>
            </ol>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default TasteHomeOrtho
