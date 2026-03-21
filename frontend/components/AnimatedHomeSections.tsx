'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, AlertTriangle, TrendingUp, Clock, Target, BookOpen, Calendar } from 'lucide-react'
import { ScrollReveal, StaggerChildren } from '../hooks/useScrollAnimation'

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

// Hero Section with Animations
export function AnimatedHero() {
  return (
    <section className="relative pt-32 md:pt-44 pb-20 md:pb-32 bg-gradient-to-b from-sky-50 to-white" aria-labelledby="hero-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <ScrollReveal animation="fade-up" duration={800}>
          <h1 id="hero-heading" className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight mb-8">
            <span className="text-slate-900">По-лесно е да оправиш зъбите си навреме.</span>
            <br />
            <span className="text-slate-500">Повечето хора чакат, докато стане скъпо.</span>
            <br />
            <span className="text-sky-600">Ти сигурен ли си, че не си вече в този етап?</span>
          </h1>
        </ScrollReveal>
        
        <ScrollReveal animation="fade-up" delay={150} duration={800}>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Повечето хора вече имат ранни признаци — но ги осъзнават чак когато лечението стане по-сложно.
          </p>
        </ScrollReveal>
        
        <ScrollReveal animation="zoom" delay={300} duration={800}>
          <div>
            <Link
              href="/quiz"
              className="inline-flex items-center gap-3 px-8 py-4 bg-sky-500 text-white text-lg font-medium rounded-full hover:bg-sky-600 hover:shadow-xl hover:shadow-sky-500/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 group"
              data-testid="hero-cta"
            >
              <span>Провери къде се намираш</span>
              <span className="text-sky-200">(60 сек)</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-sm text-slate-500 mt-4">
              Отнема 60 секунди. Повечето хора никога не стигат дотук.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
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
          <p className="text-lg text-slate-900 pl-4 border-l-4 border-sky-500 font-medium hover:border-sky-600 hover:pl-6 transition-all duration-300">
            Ранният етап = най-лесен за корекция.
          </p>
        </StaggerChildren>
        
        <ScrollReveal animation="fade-up" delay={400}>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 text-sky-600 font-medium hover:text-sky-700 hover:gap-3 transition-all duration-300 group"
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
    <section className="py-20 md:py-28 bg-sky-600" aria-labelledby="recognition-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-down" duration={700}>
          <h2 id="recognition-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-4 text-center">
            Звучи ли ти познато?
          </h2>
          <p className="text-sky-100 text-center mb-12 text-lg">
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
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-sky-600 font-medium rounded-full hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 group"
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
    <section className="py-20 md:py-28 bg-slate-50" aria-labelledby="cost-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <ScrollReveal animation="fade-right" duration={700}>
          <div className="flex items-start gap-4 mb-12">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center hover:scale-110 transition-transform duration-300" aria-hidden="true">
              <Clock className="w-6 h-6 text-sky-600" />
            </div>
            <h2 id="cost-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900">
              Това не е един и същ проблем — ако го хванеш навреме или по-късно.
            </h2>
          </div>
        </ScrollReveal>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScrollReveal animation="fade-right" delay={100}>
            <article className="p-6 rounded-2xl bg-white border-2 border-emerald-200 hover:shadow-lg hover:scale-[1.02] hover:border-emerald-300 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="text-emerald-700 font-semibold">Ранен етап</span>
              </div>
              <p className="text-slate-700">По-лесно, по-бързо, по-предвидимо.</p>
            </article>
          </ScrollReveal>
          <ScrollReveal animation="fade-left" delay={200}>
            <article className="p-6 rounded-2xl bg-white border-2 border-red-200 hover:shadow-lg hover:scale-[1.02] hover:border-red-300 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true" />
                <span className="text-red-700 font-semibold">Късен етап</span>
              </div>
              <p className="text-slate-700">По-сложно, по-скъпо.</p>
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
          <blockquote className="p-6 rounded-xl bg-slate-50 border-l-4 border-sky-500 hover:border-sky-600 hover:bg-slate-100 transition-all duration-300">
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
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center hover:scale-110 transition-transform duration-300" aria-hidden="true">
                <BookOpen className="w-6 h-6 text-sky-600" />
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
              className="hidden md:flex items-center gap-2 text-sky-600 font-medium hover:text-sky-700 hover:gap-3 transition-all duration-300"
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
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1 transition-all duration-300"
              >
                <Link href={`/blog/${post.slug}`}>
                  {/* Thumbnail */}
                  {post.featured_image ? (
                    <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
                      <img 
                        src={post.featured_image} 
                        alt={post.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center group-hover:from-sky-150 group-hover:to-sky-100 transition-colors duration-300">
                      <BookOpen className="w-12 h-12 text-sky-300 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3 text-xs">
                      <span className="px-2 py-1 rounded-full bg-sky-50 text-sky-600 font-medium group-hover:bg-sky-100 transition-colors duration-300">
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
                    
                    <h3 className="font-serif text-lg font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-sky-600 transition-colors duration-300">
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
              className="inline-flex items-center gap-2 text-sky-600 font-medium hover:text-sky-700 hover:gap-3 transition-all duration-300"
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
    <section className="py-20 md:py-32 bg-sky-600" aria-labelledby="final-cta-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <ScrollReveal animation="fade-up" duration={700}>
          <h2 id="final-cta-heading" className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-10">
            Разбери на кой етап си — преди да стане по-сложно и по-скъпо.
          </h2>
        </ScrollReveal>
        
        <ScrollReveal animation="zoom" delay={200} duration={800}>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-sky-600 text-lg font-semibold rounded-full hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 group"
            data-testid="final-cta"
          >
            <span>Провери къде се намираш</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </ScrollReveal>
        
        <ScrollReveal animation="fade-up" delay={400}>
          <p className="text-sm text-sky-100 mt-6">
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
          <Link href="/" className="font-serif text-xl font-semibold text-slate-900 hover:text-sky-600 transition-colors duration-300" aria-label="Zubite.bg начална страница">
            Zubite<span className="text-sky-500">.bg</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600" aria-label="Допълнителна навигация">
            <Link href="/symptoms" className="hover:text-sky-600 hover:-translate-y-0.5 transition-all duration-300">Симптоми</Link>
            <Link href="/orthodontics" className="hover:text-sky-600 hover:-translate-y-0.5 transition-all duration-300">Ортодонтия</Link>
            <Link href="/blog" className="hover:text-sky-600 hover:-translate-y-0.5 transition-all duration-300">Блог</Link>
            <Link href="/privacy" className="hover:text-sky-600 hover:-translate-y-0.5 transition-all duration-300">Поверителност</Link>
            <Link href="/contact" className="hover:text-sky-600 hover:-translate-y-0.5 transition-all duration-300">Контакти</Link>
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <Link
        href="/quiz"
        className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white font-medium rounded-full shadow-lg shadow-sky-500/30 hover:bg-sky-600 hover:scale-105 active:scale-100 transition-all duration-300 animate-pulse-soft"
        aria-label="Провери етапа си"
      >
        <span>Провери къде се намираш</span>
        <ArrowRight className="w-4 h-4" />
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
          <Link href="/" className="font-serif text-2xl font-semibold text-slate-900 hover:text-sky-600 transition-colors duration-300" aria-label="Zubite.bg начална страница">
            Zubite<span className="text-sky-500">.bg</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/symptoms" className="text-sm text-slate-600 hover:text-sky-600 hover:-translate-y-0.5 transition-all duration-300">
              Симптоми
            </Link>
            <Link href="/orthodontics" className="text-sm text-slate-600 hover:text-sky-600 hover:-translate-y-0.5 transition-all duration-300">
              Ортодонтия
            </Link>
            <Link href="/blog" className="text-sm text-slate-600 hover:text-sky-600 hover:-translate-y-0.5 transition-all duration-300">
              Блог
            </Link>
            <Link
              href="/quiz"
              className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Провери етапа си
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
