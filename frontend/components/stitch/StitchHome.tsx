'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, CircleDot,
  Clock3, Droplets, Ear, LayoutList, MessageSquare, Play, ShieldCheck,
  Sparkles, Zap,
} from 'lucide-react'
import { Nav } from '@/components/home/Nav'
import { Footer } from '@/components/Footer'

const symptoms = [
  { label: 'Кървящи венци', icon: Droplets, tone: 'bg-rose-50 text-rose-700' },
  { label: 'Криви зъби', icon: LayoutList, tone: 'bg-teal-50 text-teal-800' },
  { label: 'Щракане в челюстта', icon: Ear, tone: 'bg-stone-100 text-stone-700' },
  { label: 'Болка или напрежение', icon: Zap, tone: 'bg-rose-50 text-rose-700' },
  { label: 'Липсващ зъб', icon: CircleDot, tone: 'bg-blue-50 text-blue-800' },
]

const journey = [
  { title: 'Отговаряш', copy: 'На кратки въпроси за това, което забелязваш.', icon: MessageSquare },
  { title: 'Ориентир', copy: 'Виждаш дали има смисъл наблюдение или консултация.', icon: LayoutList },
  { title: 'Клиника', copy: 'Избираш следващата стъпка и посещаваш консултация.', icon: CalendarDays },
]

export function StitchHome() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  const startVideo = async () => {
    if (!videoRef.current) return
    setPlaying(true)
    await videoRef.current.play().catch(() => setPlaying(false))
  }

  return (
    <div className="clinical-page min-h-screen" data-testid="stitch-home">
      <Nav />

      <section className="relative overflow-hidden px-5 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24" data-testid="home-hero">
        <div aria-hidden className="absolute right-0 top-0 -z-10 h-full w-3/4 rounded-bl-[100px] bg-gradient-to-bl from-[#F0FDFA]/80 to-transparent" />
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#006A61]">Какво е Zubite.bg</p>
            <h1 className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-[-0.035em] text-black sm:text-5xl lg:text-[4.25rem]">
              Първо яснота.<br />
              <span className="bg-gradient-to-r from-[#006A61] to-[#6BD8CB] bg-clip-text text-transparent">После избор.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#45464D] sm:text-lg sm:leading-8">
              Спри да питаш случайни хора в социалните мрежи за дентални съвети. Zubite.bg ти помага да се ориентираш дали симптомите ти може да са сигнал за дентален проблем, какви решения съществуват и към какъв тип специалист има смисъл да се насочиш.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/quiz" className="clinical-button px-7 py-3.5" data-testid="hero-primary-cta">
                Провери своя случай <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#how-it-works" className="inline-flex items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-7 py-3.5 text-sm font-semibold text-black transition-colors hover:border-[#006A61] hover:text-[#006A61]">
                Виж как работи
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-5 text-xs text-[#45464D]">
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#006A61]" />60 секунди</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#006A61]" />Без регистрация</span>
            </div>
          </div>

          <div className="clinical-card clinical-dots relative min-h-[460px] overflow-hidden p-4 sm:p-6">
            <div className="relative z-10 flex h-full flex-col gap-4">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#FBF9F7] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#64748B]">Примерен ориентир</p>
                    <h2 className="mt-1 font-display text-xl font-semibold text-black sm:text-2xl">Възможно леко разместване</h2>
                    <p className="font-medium text-[#006A61]">на предни зъби</p>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F0FDFA] text-[#006A61]"><Sparkles className="h-5 w-5" /></span>
                </div>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#FBF9F7] p-5">
                  <LayoutList className="h-5 w-5 text-[#006A61]" />
                  <h3 className="mt-4 font-display text-sm font-semibold text-black">Прозрачни алайнери</h3>
                  <p className="mt-2 text-xs leading-5 text-[#45464D]">Изискват дисциплина (20–22 ч. дневно).</p>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#FBF9F7] p-5">
                  <ShieldCheck className="h-5 w-5 text-[#006A61]" />
                  <h3 className="mt-4 font-display text-sm font-semibold text-black">Метални брекети</h3>
                  <p className="mt-2 text-xs leading-5 text-[#45464D]">Често по-достъпна опция при сложни движения.</p>
                </div>
              </div>
              <Link href="/quiz" className="flex items-center justify-between rounded-xl bg-black px-5 py-4 text-white">
                <span><span className="block text-[10px] text-white/65">Следваща стъпка</span><strong className="text-sm">Консултация с ортодонт</strong></span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E2E8F0] bg-[#F5F3F1] px-5 py-14 sm:px-6 sm:py-16" data-testid="home-noticing">
        <div className="mx-auto max-w-[1280px] text-center">
          <h2 className="font-display text-2xl font-semibold text-black sm:text-3xl">Какво може да си забелязал?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#45464D]">Ако не си сигурен дали е дребно, нормално или нещо за проверка — започни с кратък ориентир.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="symptom-chips">
            {symptoms.map(({ label, icon: Icon, tone }, index) => (
              <li key={label}>
                <Link href="/quiz" className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-[#E2E8F0] bg-white px-4 py-4 transition-transform hover:-translate-y-1" data-testid={`symptom-chip-${index}`}>
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${tone}`}><Icon className="h-4 w-4" /></span>
                  <span className="mt-3 text-xs font-medium text-black">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/symptoms" className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-[#006A61]">Виж всички симптоми <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6 sm:py-28" data-testid="home-lumi">
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 md:grid-cols-[0.85fr_1.15fr] lg:gap-24">
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-[#E4E2E0] shadow-[0_25px_50px_-24px_rgba(0,32,29,0.35)]" style={{ aspectRatio: '3 / 4' }}>
            <video
              ref={videoRef}
              src="/videos/lumi-homepage-explainer.mp4"
              poster="/images/lumi-homepage-poster.webp"
              controls={playing}
              onEnded={() => setPlaying(false)}
              className="h-full w-full object-cover"
              playsInline
              data-testid="lumi-video"
            />
            {!playing && (
              <button type="button" onClick={startVideo} className="absolute inset-0 grid place-items-center" aria-label="Пусни видеото за Луми">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-black shadow-lg"><Play className="ml-1 h-6 w-6 fill-current" /></span>
              </button>
            )}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-white/90 px-4 py-3 text-xs font-medium text-black backdrop-blur-md">
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#006A61]" />30 сек · с Луми</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#006A61]">Запознай се с Луми</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold leading-tight text-black sm:text-4xl">Виж как работи Zubite.bg за по-малко от минута</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#45464D]">Луми обяснява как платформата ти помага да се ориентираш, когато не си сигурен откъде да започнеш.</p>
            <ul className="mt-6 space-y-4">
              {['Разбираш какъв може да е проблемът.', 'Минаваш през кратка оценка.', 'Получаваш по-ясна посока към подходящ специалист или клиника.'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[#45464D]"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#F0FDFA] text-[#006A61]"><Check className="h-3 w-3" /></span>{item}</li>
              ))}
            </ul>
            <Link href="/quiz" className="clinical-button mt-8 px-7 py-3.5">Провери своя случай за 60 секунди</Link>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="clinical-dots border-t border-[#E2E8F0] bg-[#F5F3F1] px-5 py-20 sm:px-6 sm:py-24" data-testid="home-how">
        <div className="mx-auto max-w-[1280px]">
          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold text-black sm:text-3xl">Какво се случва след като започнеш?</h2>
            <p className="mt-3 text-sm text-[#45464D]">Скролни надолу, за да преминеш през стъпките една по една.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {journey.map(({ title, copy, icon: Icon }) => (
              <article key={title} className="clinical-card min-h-56 bg-[#FBF9F7] p-7">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#006A61] text-white"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-8 font-display text-xl font-semibold text-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#45464D]">{copy}</p>
              </article>
            ))}
            <article className="relative min-h-56 overflow-hidden rounded-xl border border-black bg-[#00201D] p-7 text-white shadow-[0_20px_35px_-20px_rgba(0,32,29,0.55)]">
              <span aria-hidden className="absolute -right-3 -top-8 text-[9rem] font-bold text-white/[0.035]">+</span>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#00201D]"><BadgeCheck className="h-5 w-5" /></span>
              <h3 className="mt-8 font-display text-xl font-semibold">Care Pass</h3>
              <p className="mt-3 text-sm leading-6 text-white/75">Карта с отстъпки за продукти за орална хигиена след прегледа.</p>
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
