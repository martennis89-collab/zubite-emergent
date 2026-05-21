'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, AlertTriangle, TrendingUp, Clock, Target, BookOpen, Calendar, ClipboardList, Eye, MessageSquare, Shield, CheckCircle } from 'lucide-react'
import { ScrollReveal, StaggerChildren } from '../hooks/useScrollAnimation'
import { resolveImageUrl } from '../lib/imageUrl'

// Self-recognition symptoms
const symptoms = [
  'Дъвчеш повече от едната страна',
  'Зъбите ти са леко струпани',
  'Захапката ти не се усеща равномерна',
  'Събуждаш се с напрежение в челюстта',
  'Чуваш щракане при отваряне на устата',
]

// Progression stages
const stages = [
  {
    stage: 'Рано',
    description: 'почти незабележимо',
    color: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  {
    stage: 'Средно',
    description: 'вече се усеща',
    color: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  {
    stage: 'Късно',
    description: 'става сложно и скъпо',
    color: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
    text: 'text-red-700',
  },
]

// Why people miss early stage
const reasons = [
  'Няма болка в началото',
  'Симптомите са леки',
  'Проблемът се развива бавно',
  'Повечето хора не проверяват',
]

// Blog post interface
interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  featured_image: string | null
  published_at: string
}

// Category names in Bulgarian
const CATEGORY_NAMES: Record<string, string> = {
  orthodontics: 'Ортодонтия',
  aligners: 'Алайнери',
  braces: 'Брекети',
  tips: 'Съвети',
  news: 'Новини',
}

// Hero Section — High-converting above-the-fold
export function AnimatedHero() {
  return (
    <section
      className="relative min-h-[100svh] flex items-center overflow-hidden bg-[#fafbfc]"
      aria-labelledby="hero-heading"
      data-testid="hero-section"
    >
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.035]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />

      {/* Accent glow */}
      <div className="absolute top-20 -right-40 w-[600px] h-[600px] rounded-full bg-teal-200/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-teal-100/30 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-28 md:pt-36 pb-16 md:pb-24 w-full">
        <div className="grid lg:grid-cols-[1fr_0.75fr] gap-12 lg:gap-16 items-center">

          {/* Left — Copy */}
          <div className="max-w-2xl">
            <ScrollReveal animation="fade-up" duration={900}>
              <h1
                id="hero-heading"
                className="font-serif text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3.25rem] font-semibold leading-[1.15] tracking-[-0.02em] text-slate-900 mb-5 md:mb-6"
              >
                Около 75% от хората имат проблем със захапката
                <span className="text-slate-400"> — </span>
                <span className="text-teal-600">повечето го разбират твърде късно.</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={120} duration={800}>
              <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-xl mb-8 md:mb-10">
                Това не е само естетика. Може да доведе до износване на зъбите, болки и по-скъпо лечение по-късно.
              </p>
            </ScrollReveal>

            {/* CTA Card */}
            <ScrollReveal animation="fade-up" delay={240} duration={800}>
              <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] p-6 sm:p-7 max-w-lg" data-testid="cta-card">
                <p className="text-[15px] sm:text-base font-medium text-slate-800 mb-4">
                  Отговори на няколко въпроса и виж на кой етап си
                </p>

                {/* Micro details */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    Отнема 60 секунди
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Без регистрация
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Без ангажимент
                  </span>
                </div>

                {/* Primary CTA */}
                <Link
                  href="/quiz"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-teal-500 text-white text-[15px] font-semibold rounded-xl hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-500/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-300"
                  data-testid="hero-cta"
                >
                  Провери своя случай
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                </Link>
              </div>
            </ScrollReveal>

            {/* Trust micro-line */}
            <ScrollReveal animation="fade-up" delay={380} duration={700}>
              <p className="flex items-center gap-1.5 mt-5 text-xs text-slate-400" data-testid="hero-trust">
                <Shield className="w-3.5 h-3.5 text-slate-300" />
                Без регистрация. Без спам. Само ясни отговори.
              </p>
            </ScrollReveal>
          </div>

          {/* Right — Abstract Visual */}
          <ScrollReveal animation="fade-left" delay={300} duration={1000}>
            <div className="hidden lg:flex items-center justify-center" aria-hidden="true">
              <HeroVisual />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

/** Abstract dental alignment visual — pure SVG + CSS, no stock photos */
function HeroVisual() {
  return (
    <div className="relative w-full max-w-[420px] aspect-square">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border border-slate-200/60" />
      <div className="absolute inset-4 rounded-full border border-dashed border-slate-200/40" />

      {/* Center orb */}
      <div className="absolute inset-[28%] rounded-full bg-gradient-to-br from-teal-50 to-teal-100/80 flex items-center justify-center shadow-inner">
        <svg viewBox="0 0 120 120" className="w-3/5 h-3/5" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Stylised jaw arch */}
          <path
            d="M26 52 C26 32, 40 18, 60 18 C80 18, 94 32, 94 52 C94 72, 82 90, 60 92 C38 90, 26 72, 26 52Z"
            stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8"
          />
          {/* Teeth dots – upper arch */}
          {[
            [38, 30], [48, 22], [60, 19.5], [72, 22], [82, 30],
            [88, 42], [90, 54], [87, 66], [80, 76],
            [32, 42], [30, 54], [33, 66], [40, 76],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.2" fill="#0ea5e9" opacity={0.15 + (i % 3) * 0.15}
              className="animate-pulse" style={{ animationDelay: `${i * 220}ms`, animationDuration: '3s' }}
            />
          ))}
          {/* Center crosshair */}
          <circle cx="60" cy="55" r="6" stroke="#0ea5e9" strokeWidth="1.5" fill="none" opacity="0.4" />
          <line x1="60" y1="48" x2="60" y2="62" stroke="#0ea5e9" strokeWidth="1" opacity="0.3" />
          <line x1="53" y1="55" x2="67" y2="55" stroke="#0ea5e9" strokeWidth="1" opacity="0.3" />
        </svg>
      </div>

      {/* Floating data labels */}
      {[
        { top: '8%', left: '50%', label: 'Захапка', ml: '-translate-x-1/2' },
        { top: '44%', right: '0%', label: 'Позиция', ml: '' },
        { bottom: '12%', left: '50%', label: 'Натиск', ml: '-translate-x-1/2' },
      ].map((item, i) => (
        <div
          key={i}
          className={`absolute text-[11px] font-medium text-slate-400 tracking-wide uppercase ${item.ml}`}
          style={{ top: item.top, left: item.left, right: item.right, bottom: item.bottom }}
        >
          <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-100 rounded-full px-3 py-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            {item.label}
          </span>
        </div>
      ))}

      {/* Animated scan line */}
      <div className="absolute left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent animate-hero-scan" />
    </div>
  )
}

// Interrupt Section with Animations
export function AnimatedInterruptSection() {
  return (
    <section className="py-20 md:py-28 bg-white" aria-labelledby="interrupt-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-right" duration={700}>
          <div className="flex items-start gap-4 mb-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center hover:scale-110 transition-transform duration-300" aria-hidden="true">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h2 id="interrupt-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900">
              Ако чакаш да те заболи — вече си закъснял.
            </h2>
          </div>
        </ScrollReveal>
        
        <StaggerChildren staggerDelay={120} animation="fade-left" className="space-y-6 mb-12">
          <p className="text-lg text-slate-700 pl-4 border-l-4 border-slate-200 hover:border-slate-400 hover:pl-6 transition-all duration-300">
            Повечето проблеми със захапката започват тихо.
          </p>
          <p className="text-lg text-slate-700 pl-4 border-l-4 border-slate-200 hover:border-slate-400 hover:pl-6 transition-all duration-300">
            Малките размествания → неравномерно износване.
          </p>
          <p className="text-lg text-slate-900 pl-4 border-l-4 border-teal-500 font-medium hover:border-teal-600 hover:pl-6 transition-all duration-300">
            Ранният етап = най-лесен за корекция.
          </p>
        </StaggerChildren>
        
        <ScrollReveal animation="fade-up" delay={400}>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 text-teal-600 font-medium hover:text-teal-700 hover:gap-3 transition-all duration-300 group"
          >
            <span>Провери своя етап</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  )
}

// Self Recognition Section with Animations
export function AnimatedSelfRecognitionSection() {
  return (
    <section className="py-20 md:py-28 bg-teal-600" aria-labelledby="recognition-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-down" duration={700}>
          <h2 id="recognition-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-4 text-center">
            Звучи ли ти познато?
          </h2>
          <p className="text-teal-100 text-center mb-12 text-lg">
            Повечето хора игнорират тези неща… докато не стане проблем.
          </p>
        </ScrollReveal>
        
        <StaggerChildren staggerDelay={100} animation="fade-up" className="space-y-4 mb-12">
          {symptoms.map((symptom, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-[1.02] hover:border-white/40 transition-all duration-300 cursor-default"
            >
              <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" aria-hidden="true" />
              <span className="text-white/90">{symptom}</span>
            </div>
          ))}
        </StaggerChildren>
        
        <ScrollReveal animation="zoom" delay={600}>
          <div className="text-center">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-teal-600 font-medium rounded-full hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 group"
            >
              <span>Провери своя етап</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// How It Works Section
export function AnimatedHowItWorksSection() {
  const steps = [
    {
      number: '1',
      title: 'Отговаряш на няколко въпроса',
      subtitle: '(60 секунди)',
      description: 'Разбираме дали има признаци, които обикновено се игнорират.',
      icon: ClipboardList,
      color: 'bg-teal-100 text-teal-600'
    },
    {
      number: '2',
      title: 'Виждаш каква е твоята ситуация',
      subtitle: '',
      description: 'Дали всичко е наред или проблемът вече е в ранен или по-напреднал етап. Това показва колко спешно е да обърнеш внимание.',
      icon: Eye,
      color: 'bg-amber-100 text-amber-600'
    },
    {
      number: '3',
      title: 'Получаваш конкретни следващи стъпки',
      subtitle: '',
      description: 'Екипът на Zubite.bg ще прегледа отговорите ти и ще се свърже с теб с подходящи насоки и клиники.',
      icon: MessageSquare,
      color: 'bg-emerald-100 text-emerald-600'
    }
  ]

  return (
    <section className="py-16 md:py-28 bg-white" aria-labelledby="how-it-works-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-up" duration={700}>
          <h2 id="how-it-works-heading" className="font-serif text-xl md:text-3xl lg:text-4xl font-semibold text-slate-900 text-center mb-3 md:mb-4">
            Как работи Zubite.bg
          </h2>
          <p className="text-slate-500 text-center mb-10 md:mb-16 text-base md:text-lg">
            Три прости стъпки до яснота
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <ScrollReveal key={index} animation="fade-up" delay={index * 150} duration={600}>
              <div className="relative">
                {/* Connector arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-12 -right-4 z-10 items-center justify-center w-8 h-8 text-slate-300">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
                
                <article className="text-center p-5 md:p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:shadow-lg transition-all duration-300">
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl ${step.color} mb-4 md:mb-6 hover:scale-110 transition-transform duration-300`}>
                    <step.icon className="w-7 h-7 md:w-8 md:h-8" />
                  </div>
                  
                  {/* Step number */}
                  <div className="text-xs md:text-sm font-bold text-teal-500 mb-2">
                    Стъпка {step.number}
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-serif text-base md:text-lg font-semibold text-slate-900 mb-1">
                    {step.title}
                  </h3>
                  
                  {step.subtitle && (
                    <p className="text-xs md:text-sm text-slate-400 mb-2 md:mb-3">{step.subtitle}</p>
                  )}
                  
                  {/* Description */}
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </article>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal animation="fade-up" delay={500}>
          <div className="text-center mt-10 md:mt-12">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-teal-500 text-white text-base md:text-lg font-medium rounded-full hover:bg-teal-600 hover:shadow-xl hover:shadow-teal-500/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 group"
            >
              <span>Започни сега</span>
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// Progression Section with Animations
export function AnimatedProgressionSection() {
  return (
    <section className="py-20 md:py-28 bg-white" aria-labelledby="progression-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-right" duration={700}>
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center hover:scale-110 transition-transform duration-300" aria-hidden="true">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
            <h2 id="progression-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900">
              Това не остава същото. Влошава се.
            </h2>
          </div>
          <p className="text-slate-600 mb-16 ml-16">
            Проблемът не стои на място.
          </p>
        </ScrollReveal>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list">
          {stages.map((item, index) => (
            <ScrollReveal key={index} animation="fade-up" delay={index * 150} duration={600}>
              <article 
                className={`relative p-6 rounded-2xl border-2 ${item.color} transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default`}
              >
                {/* Connector line */}
                {index < stages.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-slate-300" aria-hidden="true">
                    <ChevronRight className="w-4 h-4 text-slate-400 absolute -right-1 -top-1.5" />
                  </div>
                )}
                
                <div className={`w-3 h-3 rounded-full ${item.dot} mb-4`} aria-hidden="true" />
                <h3 className={`font-serif text-xl font-semibold ${item.text} mb-2`}>{item.stage}</h3>
                <p className="text-slate-600">{item.description}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// Cost Reframe Section with Animations
export function AnimatedCostReframeSection() {
  return (
    <section className="py-16 md:py-28 bg-slate-50 overflow-hidden" aria-labelledby="cost-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-right" duration={700}>
          <div className="flex items-start gap-3 md:gap-4 mb-8 md:mb-12">
            <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-teal-100 flex items-center justify-center hover:scale-110 transition-transform duration-300" aria-hidden="true">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-teal-600" />
            </div>
            <h2 id="cost-heading" className="font-serif text-xl md:text-3xl lg:text-4xl font-semibold text-slate-900">
              Ако хванеш проблема рано обикновено струва по-малко и се разрешава по-лесно.
            </h2>
          </div>
        </ScrollReveal>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <ScrollReveal animation="fade-right" delay={100}>
            <article className="p-4 md:p-6 rounded-2xl bg-white border-2 border-emerald-200 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <span className="w-3 h-3 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="text-emerald-700 font-semibold text-sm md:text-base">Ранен етап</span>
              </div>
              <p className="text-slate-700 text-sm md:text-base">По-лесно, по-бързо, по-предвидимо.</p>
            </article>
          </ScrollReveal>
          <ScrollReveal animation="fade-left" delay={200}>
            <article className="p-4 md:p-6 rounded-2xl bg-white border-2 border-red-200 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <span className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true" />
                <span className="text-red-700 font-semibold text-sm md:text-base">Късен етап</span>
              </div>
              <p className="text-slate-700 text-sm md:text-base">По-сложно, по-скъпо.</p>
            </article>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

// Authority Section with Animations
export function AnimatedAuthoritySection() {
  return (
    <section className="py-20 md:py-28 bg-white" aria-labelledby="authority-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-right" duration={700}>
          <div className="flex items-start gap-4 mb-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center hover:scale-110 transition-transform duration-300" aria-hidden="true">
              <Target className="w-6 h-6 text-slate-600" />
            </div>
            <h2 id="authority-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900">
              Защо повечето хора пропускат ранния етап
            </h2>
          </div>
        </ScrollReveal>
        
        <StaggerChildren staggerDelay={100} animation="fade-up" className="space-y-4 mb-10">
          {reasons.map((reason, index) => (
            <div key={index} className="flex items-center gap-4 hover:translate-x-2 transition-transform duration-300">
              <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0 hover:bg-slate-200 transition-colors duration-300">
                {index + 1}
              </span>
              <span className="text-slate-700">{reason}</span>
            </div>
          ))}
        </StaggerChildren>
        
        <ScrollReveal animation="fade-up" delay={500}>
          <blockquote className="p-6 rounded-xl bg-slate-50 border-l-4 border-teal-500 hover:border-teal-600 hover:bg-slate-100 transition-all duration-300">
            <p className="text-slate-600 italic">
              "Проучвания показват, че повечето възрастни имат признаци — но малък процент действат навреме."
            </p>
          </blockquote>
        </ScrollReveal>
        
        <ScrollReveal animation="fade-up" delay={600}>
          <p className="text-slate-700 mt-8 font-medium text-center">
            И повечето разбират това… твърде късно.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}

// SEO Block Section with Animations
export function AnimatedSeoSection() {
  return (
    <section className="py-20 md:py-28 bg-slate-50" aria-labelledby="seo-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-up" duration={700}>
          <h2 id="seo-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900 mb-8">
            Имаш ли реален проблем със зъбите — или е само естетика?
          </h2>
        </ScrollReveal>
        
        <StaggerChildren staggerDelay={150} animation="fade-up" className="space-y-6 text-slate-600 leading-relaxed">
          <p className="hover:text-slate-800 transition-colors duration-300">
            Кривите или разместени зъби често се възприемат като чисто естетичен проблем, но много нарушения в захапката започват без болка.
          </p>
          <p className="hover:text-slate-800 transition-colors duration-300">
            Ранните признаци могат да включват неравномерно натоварване, напрежение в челюстта или постепенно разместване.
          </p>
          <p className="text-slate-800 font-medium">
            Разбирането на етапа ти навреме може да предотврати по-сложно лечение в бъдеще.
          </p>
        </StaggerChildren>
      </div>
    </section>
  )
}

// Recent Articles Section with Animations
interface RecentArticlesProps {
  posts: BlogPost[]
}

export function AnimatedRecentArticles({ posts }: RecentArticlesProps) {
  if (posts.length === 0) return null
  
  return (
    <section className="py-20 md:py-28 bg-white" aria-labelledby="recent-articles-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-down" duration={700}>
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center hover:scale-110 transition-transform duration-300" aria-hidden="true">
                <BookOpen className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h2 id="recent-articles-heading" className="font-serif text-2xl md:text-3xl font-semibold text-slate-900">
                  Последни статии
                </h2>
                <p className="text-slate-500 mt-1">Научи повече за грижата за зъбите</p>
              </div>
            </div>
            <Link 
              href="/blog" 
              className="hidden md:flex items-center gap-2 text-teal-600 font-medium hover:text-teal-700 hover:gap-3 transition-all duration-300"
            >
              Виж всички
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {posts.map((post, index) => (
            <ScrollReveal key={post.id} animation="fade-up" delay={index * 150} duration={600}>
              <article 
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1 transition-all duration-300"
              >
                <Link href={`/blog/${post.slug}`}>
                  {/* Thumbnail */}
                  {post.featured_image ? (
                    <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
                      <img 
                        src={resolveImageUrl(post.featured_image)} 
                        alt={post.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center group-hover:from-sky-150 group-hover:to-teal-100 transition-colors duration-300">
                      <BookOpen className="w-12 h-12 text-teal-300 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3 text-xs">
                      <span className="px-2 py-1 rounded-full bg-teal-50 text-teal-600 font-medium group-hover:bg-teal-100 transition-colors duration-300">
                        {CATEGORY_NAMES[post.category] || post.category}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.published_at).toLocaleDateString('bg-BG', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                    
                    <h3 className="font-serif text-lg font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-teal-600 transition-colors duration-300">
                      {post.title}
                    </h3>
                    
                    <p className="text-slate-500 text-sm line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              </article>
            </ScrollReveal>
          ))}
        </div>

        {/* Mobile "View All" link */}
        <ScrollReveal animation="fade-up" delay={500}>
          <div className="mt-8 text-center md:hidden">
            <Link 
              href="/blog" 
              className="inline-flex items-center gap-2 text-teal-600 font-medium hover:text-teal-700 hover:gap-3 transition-all duration-300"
            >
              Виж всички статии
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// Final CTA Section with Animations
export function AnimatedFinalCTA() {
  return (
    <section className="py-20 md:py-32 bg-teal-600" aria-labelledby="final-cta-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <ScrollReveal animation="fade-up" duration={700}>
          <h2 id="final-cta-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-10">
            Разбери на кой етап си — преди да стане по-сложно и по-скъпо.
          </h2>
        </ScrollReveal>
        
        <ScrollReveal animation="zoom" delay={200} duration={800}>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-teal-600 text-lg font-semibold rounded-full hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 group"
            data-testid="final-cta"
          >
            <span>Провери къде се намираш</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </ScrollReveal>
        
        <ScrollReveal animation="fade-up" delay={400}>
          <p className="text-sm text-teal-100 mt-6">
            60 секунди. Без регистрация. Без ангажименти.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}

// Animated Footer with hover effects
export function AnimatedFooter() {
  return (
    <footer className="py-12 bg-white border-t border-slate-200" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="font-serif text-xl font-semibold text-slate-900 hover:text-teal-600 transition-colors duration-300" aria-label="Zubite.bg начална страница">
            Zubite<span className="text-teal-500">.bg</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600" aria-label="Допълнителна навигация">
            <Link href="/symptoms" className="hover:text-teal-600 hover:-translate-y-0.5 transition-all duration-300">Симптоми</Link>
            <Link href="/orthodontics" className="hover:text-teal-600 hover:-translate-y-0.5 transition-all duration-300">Ортодонтия</Link>
            <Link href="/blog" className="hover:text-teal-600 hover:-translate-y-0.5 transition-all duration-300">Блог</Link>
            <Link href="/za-kliniki" className="hover:text-teal-600 hover:-translate-y-0.5 transition-all duration-300">За клиники</Link>
            <Link href="/privacy" className="hover:text-teal-600 hover:-translate-y-0.5 transition-all duration-300">Поверителност</Link>
            <Link href="/contact" className="hover:text-teal-600 hover:-translate-y-0.5 transition-all duration-300">Контакти</Link>
          </nav>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Zubite.bg
          </p>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            Zubite.bg не е клиника и не предлага медицински консултации. Платформата е създадена да ви помогне да разберете своите опции за ортодонтско лечение.
          </p>
        </div>
      </div>
    </footer>
  )
}

// Mobile Sticky CTA with pulse animation
export function AnimatedStickyCTA() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[calc(100%-3rem)] max-w-xs">
      <Link
        href="/quiz"
        className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-teal-500 text-white font-medium rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-600 active:scale-95 transition-all duration-300"
        aria-label="Провери етапа си"
      >
        <span className="text-sm">Провери къде се намираш</span>
        <ArrowRight className="w-4 h-4 flex-shrink-0" />
      </Link>
    </div>
  )
}

// Animated Header with hover effects
export function AnimatedHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6" aria-label="Главна навигация">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="font-serif text-2xl font-semibold text-slate-900 hover:text-teal-600 transition-colors duration-300" aria-label="Zubite.bg начална страница">
            Zubite<span className="text-teal-500">.bg</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/symptoms" className="text-sm text-slate-600 hover:text-teal-600 hover:-translate-y-0.5 transition-all duration-300">
              Симптоми
            </Link>
            <Link href="/orthodontics" className="text-sm text-slate-600 hover:text-teal-600 hover:-translate-y-0.5 transition-all duration-300">
              Ортодонтия
            </Link>
            <Link href="/blog" className="text-sm text-slate-600 hover:text-teal-600 hover:-translate-y-0.5 transition-all duration-300">
              Блог
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
