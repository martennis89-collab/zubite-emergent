'use client'

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

const symptoms = [
  { label: 'Криви или струпани зъби', note: 'Захапка и подреждане', href: '/crooked-teeth', icon: CircleDot },
  { label: 'Кървящи венци', note: 'Хигиена и профилактика', href: '/symptoms', icon: Sparkles },
  { label: 'Липсващ зъб', note: 'Импланти и възстановяване', href: '/implants', icon: Stethoscope },
  { label: 'Щракане в челюстта', note: 'TMJ и напрежение', href: '/tmj', icon: ShieldCheck },
  { label: 'Хъркане и лош сън', note: 'Сън и дишане', href: '/sleep-airway', icon: Clock3 },
]

const treatments = [
  { index: '01', title: 'Ортодонтия', copy: 'Криви зъби, захапка, алайнери и брекети.', href: '/orthodontics' },
  { index: '02', title: 'Импланти', copy: 'Ясна посока при липсващ зъб и варианти за възстановяване.', href: '/implants' },
  { index: '03', title: 'Естетика', copy: 'Форма, цвят и усмивка с реалистични очаквания.', href: '/cosmetic-dentistry' },
  { index: '04', title: 'TMJ', copy: 'Щракане, напрежение и дискомфорт в челюстта.', href: '/tmj' },
  { index: '05', title: 'Сън и дишане', copy: 'Хъркане, сънна апнея и връзката с денталното здраве.', href: '/sleep-airway' },
  { index: '06', title: 'Симптоми', copy: 'Започни от това, което виждаш или усещаш.', href: '/symptoms' },
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

export function TasteHome() {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

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
    <div ref={rootRef} className="taste-site">
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
                <span>Ясен ориентир</span>
                <span>за <em>твоите зъби.</em></span>
              </h1>

              <p className="taste-hero-body taste-hero-fade taste-delay-3">
                Отговори на 8–10 кратки въпроса. За около 60 секунди ще видиш какво може да означават симптомите ти и към какъв специалист да се насочиш.
              </p>

              <div className="taste-hero-actions taste-hero-fade taste-delay-4">
                <Link href="/quiz" className="taste-button taste-button-accent" data-testid="hero-primary-cta">
                  Получи своя ориентир
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

        <section className="taste-section taste-symptoms" data-testid="home-symptoms">
          <div className="taste-shell">
            <div className="taste-section-heading taste-reveal">
              <div>
                <p className="taste-eyebrow">Започни от сигнала</p>
                <h2>Какво <em>забелязваш?</em></h2>
              </div>
              <p>Не е нужно да знаеш медицинския термин. Избери това, което виждаш или усещаш, и тръгни оттам.</p>
            </div>

            <div className="taste-symptom-grid">
              {symptoms.map(({ label, note, href, icon: Icon }, index) => (
                <Link href={href} className="taste-symptom-card taste-reveal" key={label} data-testid={`symptom-card-${index}`}>
                  <span className="taste-card-index">0{index + 1}</span>
                  <span className="taste-symptom-icon"><Icon aria-hidden /></span>
                  <strong>{label}</strong>
                  <span>{note}</span>
                  <ArrowRight aria-hidden className="taste-card-arrow" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="taste-section taste-treatments" data-testid="home-treatments">
          <div className="taste-shell taste-treatment-layout">
            <div className="taste-treatment-heading taste-reveal">
              <p className="taste-eyebrow">Дентални посоки</p>
              <h2>Разгледай<br />по <em>тема.</em></h2>
              <p>Практични ръководства без сензации, обещания и излишен медицински жаргон.</p>
              <Link href="/treatments">Всички лечения <ArrowRight aria-hidden /></Link>
            </div>

            <div className="taste-treatment-grid">
              {treatments.map((item) => (
                <Link href={item.href} className="taste-treatment-card taste-reveal" key={item.title}>
                  <span>{item.index}</span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <span className="taste-treatment-link">Разгледай <ArrowRight aria-hidden /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

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
              <Link href="/clinics" className="taste-button taste-button-light">Разгледай клиники <ArrowRight aria-hidden className="taste-icon-sm" /></Link>
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
                <Link href="/care-pass" className="taste-button taste-button-accent">Как работи Care Pass <ArrowRight aria-hidden className="taste-icon-sm" /></Link>
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
      </main>

      <Footer />
    </div>
  )
}

export default TasteHome
