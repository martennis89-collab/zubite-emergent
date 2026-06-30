'use client'

/**
 * Lumi explainer video section — sits between Hero and Trust strip.
 * Extracted from HomeContent.tsx in Feb 2026. Behaviour preserved:
 *   • preload="none" — the MP4 is NOT fetched until the user opts in.
 *   • playsInline + native controls; no autoplay; no surprise sound.
 *   • Section content (video DOM) only mounts when within ~200px of
 *     the viewport (IntersectionObserver gate).
 *   • Mobile order: headline → video → bullets → CTA.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import { Reveal, QUIZ_URL } from './_shared'

export function LumiVideoSection() {
  const [videoActive, setVideoActive] = useState(false)
  const [mounted, setMounted] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!wrapRef.current || typeof IntersectionObserver === 'undefined') {
      setMounted(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px 0px' },
    )
    io.observe(wrapRef.current)
    return () => io.disconnect()
  }, [])

  function handlePlay() {
    setVideoActive(true)
    setTimeout(() => {
      const v = videoRef.current
      if (v) {
        v.play().catch(() => { /* user can hit native control */ })
      }
    }, 30)
  }

  const bullets = [
    'Разбираш какъв може да е проблемът.',
    'Минаваш през кратка оценка.',
    'Получаваш по-ясна посока към подходящ специалист или клиника.',
  ]

  return (
    <section
      ref={wrapRef}
      className="relative py-16 sm:py-24 overflow-hidden"
      data-testid="homepage-lumi-video-section"
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 80% 25%, rgba(94,234,212,0.18) 0%, transparent 65%),' +
            'radial-gradient(ellipse 50% 40% at 15% 75%, rgba(165,243,252,0.22) 0%, transparent 65%),' +
            'linear-gradient(180deg, #FCFAF8 0%, #F7FAF9 100%)',
        }}
      />
      <div aria-hidden className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-teal-100/30 blur-3xl pointer-events-none" />

      <div className="relative max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

          <Reveal>
            <div className="order-1 md:order-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/65 backdrop-blur-md ring-1 ring-white/80 text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Запознай се с Луми
              </span>
              <h2 className="mt-5 font-serif text-[1.85rem] sm:text-4xl lg:text-[2.6rem] font-semibold text-slate-900 leading-[1.1]">
                Виж как работи <span className="text-teal-700">zubite.bg</span> за по-малко от минута
              </h2>
              <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
                Луми обяснява как платформата ти помага да се ориентираш,
                когато не си сигурен откъде да започнеш.
              </p>

              <div className="hidden md:block mt-7">
                <LumiBullets bullets={bullets} />
                <LumiCta />
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="order-2 md:order-2" data-testid="homepage-lumi-video-card">
              <div className="relative mx-auto max-w-sm md:max-w-md">
                <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-teal-200/20 via-transparent to-cyan-100/30 blur-2xl pointer-events-none" />

                <div
                  className="relative rounded-[1.75rem] overflow-hidden bg-white/70 backdrop-blur-xl ring-1 ring-white/80 shadow-[0_30px_70px_-30px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.9)]"
                  style={{ aspectRatio: '9 / 16' }}
                >
                  {!videoActive && (
                    <button
                      type="button"
                      onClick={handlePlay}
                      className="group absolute inset-0 w-full h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/60"
                      aria-label="Пусни видеото с Луми"
                      data-testid="homepage-lumi-video-play"
                    >
                      <img
                        src="/images/lumi-homepage-poster.webp"
                        alt="Луми — обяснява как работи Зъбите.bg"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        loading="lazy"
                        decoding="async"
                      />
                      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/15" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 ring-1 ring-white shadow-[0_18px_40px_-10px_rgba(13,148,136,0.55)] group-hover:scale-105 transition-transform">
                          <span aria-hidden className="absolute inset-1 rounded-full bg-gradient-to-br from-white to-teal-50/70" />
                          <svg
                            viewBox="0 0 24 24"
                            className="relative w-7 h-7 sm:w-8 sm:h-8 text-teal-700 ml-1"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5Z" />
                          </svg>
                        </span>
                      </div>
                      <span className="absolute left-4 bottom-4 right-4 text-left">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur ring-1 ring-white text-[11px] font-semibold text-teal-800 px-2.5 py-1 shadow-sm">
                          <Sparkles className="w-3 h-3" />
                          30 сек · с Луми
                        </span>
                      </span>
                    </button>
                  )}

                  {videoActive && mounted && (
                    <video
                      ref={videoRef}
                      src="/videos/lumi-homepage-explainer.mp4"
                      poster="/images/lumi-homepage-poster.webp"
                      controls
                      playsInline
                      preload="none"
                      className="absolute inset-0 w-full h-full object-cover bg-slate-900"
                      data-testid="homepage-lumi-video"
                    >
                      Браузърът ти не поддържа видео.
                    </video>
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          <div className="order-3 md:hidden">
            <LumiBullets bullets={bullets} />
            <LumiCta />
          </div>
        </div>
      </div>
    </section>
  )
}

function LumiBullets({ bullets }: { bullets: string[] }) {
  return (
    <ul className="space-y-3 mb-7" data-testid="homepage-lumi-bullets">
      {bullets.map((b, i) => (
        <li key={b} className="flex items-start gap-3" data-testid={`homepage-lumi-bullet-${i}`}>
          <span
            aria-hidden
            className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-teal-50 ring-1 ring-teal-200 flex items-center justify-center"
          >
            <CheckCircle2 className="w-3 h-3 text-teal-700" />
          </span>
          <span className="text-slate-700 text-[15px] sm:text-base leading-relaxed">{b}</span>
        </li>
      ))}
    </ul>
  )
}

function LumiCta() {
  return (
    <Link
      href={QUIZ_URL}
      className="group relative inline-flex items-center justify-center gap-2 rounded-full text-white font-medium px-6 py-3.5 text-sm sm:text-[15px] shadow-[0_14px_30px_-12px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] hover:-translate-y-0.5 transition-transform overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
      data-testid="homepage-lumi-video-cta"
    >
      <span aria-hidden className="absolute inset-x-3 top-0.5 h-1/3 rounded-full bg-white/20 blur-sm pointer-events-none" />
      <span className="relative inline-flex items-center gap-2">
        Провери своя случай за 60 секунди
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

export default LumiVideoSection
