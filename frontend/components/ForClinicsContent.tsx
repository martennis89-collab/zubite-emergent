'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ArrowRight, 
  ClipboardCheck, 
  Lightbulb, 
  Link2,
  ShieldCheck,
  Target,
  Users,
  Clock,
  MessageSquare,
  Building2,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
} from 'lucide-react'
import { ScrollReveal } from '../hooks/useScrollAnimation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

// ─── Hero ────────────────────────────────────────────────
function HeroSection() {
  return (
    <section 
      className="relative min-h-[90vh] flex items-center bg-slate-950 overflow-hidden"
      data-testid="clinics-hero"
    >
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src="https://static.prod-images.emergentagent.com/jobs/25b55d94-1ed6-49c7-af05-4dd6f19863cf/images/c044576ee418cf96511f2f72dded7b9f2ebc0435096c7b2488cba562a6b989f8.png"
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950" />
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="relative max-w-5xl mx-auto px-6 md:px-12 py-32 md:py-40">
        <ScrollReveal animation="fade-up" duration={900}>
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-400 mb-8">
            Партньорска програма
          </p>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={100} duration={900}>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.1] mb-8 max-w-4xl">
            Получавайте подготвени пациенти, които вече разбират от какво имат нужда
          </h1>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={200} duration={900}>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mb-12">
            Zubite.bg не изпраща случайни запитвания. Пациентите преминават през оценка и образование преди да бъдат свързани с вас.
          </p>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={350} duration={900}>
          <a
            href="#application"
            className="inline-flex items-center gap-3 px-8 py-4 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/20 hover:-translate-y-0.5 active:translate-y-0 group"
            data-testid="hero-apply-btn"
          >
            <span>Кандидатствай за партньорство</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ─── How It Works ────────────────────────────────────────
const steps = [
  {
    icon: ClipboardCheck,
    number: '01',
    title: 'Оценка',
    description: 'Пациентът преминава през кратка оценка, която определя неговия проблем и етап.',
  },
  {
    icon: Lightbulb,
    number: '02',
    title: 'Образование',
    description: 'Получава яснота за проблема и реалните опции за лечение — без манипулация.',
  },
  {
    icon: Link2,
    number: '03',
    title: 'Връзка',
    description: 'Свързваме го с подходящи клиники, които могат да предложат конкретно решение.',
  },
]

function HowItWorksSection() {
  return (
    <section className="py-24 md:py-32 bg-slate-50" data-testid="clinics-how-it-works">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
            Как работи
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-16 max-w-xl">
            Три стъпки до информиран пациент
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {steps.map((step, i) => (
            <ScrollReveal key={step.number} animation="fade-up" delay={i * 120}>
              <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-sky-600" />
                  </div>
                  <span className="font-sans text-sm font-semibold text-slate-300 tracking-wide">{step.number}</span>
                </div>
                <h3 className="font-serif text-xl font-medium text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Differentiators ─────────────────────────────────────
const differentiators = [
  {
    icon: ShieldCheck,
    title: 'Не продаваме трафик',
    description: 'Не генерираме кликове за акаунта ви. Всеки пациент е преминал през реален процес на оценка.',
  },
  {
    icon: Target,
    title: 'Не продаваме формуляри',
    description: 'Не изпращаме списъци с имейли. Свързваме реални хора с конкретна нужда.',
  },
  {
    icon: Users,
    title: 'Изпращаме пациенти с намерение',
    description: 'Пациентите идват при вас с яснота какво им трябва и очакване за конкретен разговор.',
  },
]

function DifferentiatorsSection() {
  return (
    <section className="py-24 md:py-32 bg-slate-950" data-testid="clinics-differentiators">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <ScrollReveal animation="fade-up">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-400 mb-4">
            Какво ни прави различни
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white mb-16 max-w-xl">
            Не сме агенция. Не сме маркетплейс.
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {differentiators.map((item, i) => (
            <ScrollReveal key={item.title} animation="fade-up" delay={i * 120}>
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 hover:border-white/20 transition-all duration-300 h-full group">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-6 group-hover:bg-sky-500/15 transition-colors">
                  <item.icon className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="font-serif text-xl font-medium text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Requirements ────────────────────────────────────────
const requirements = [
  {
    icon: Building2,
    text: 'Ограничен брой клиники на град',
    detail: 'Работим с ограничен брой партньори във всеки град, за да гарантираме качество на услугата.',
  },
  {
    icon: MessageSquare,
    text: 'Приоритет за клиники с добра комуникация',
    detail: 'Ценим клиники, които третират пациентите с внимание и прозрачност.',
  },
  {
    icon: Clock,
    text: 'Изисква се бърза реакция',
    detail: 'Пациентите очакват отговор в рамките на 24 часа. Бързината е ключова.',
  },
]

function RequirementsSection() {
  return (
    <section className="py-24 md:py-32 bg-white" data-testid="clinics-requirements">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
          {/* Left - Sticky heading */}
          <div className="lg:sticky lg:top-32">
            <ScrollReveal animation="fade-right">
              <p className="font-sans text-xs font-semibold tracking-[0.25em] uppercase text-sky-600 mb-4">
                Изисквания
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-6">
                Не приемаме всички клиники
              </h2>
              <p className="text-slate-500 leading-relaxed text-lg">
                Качеството на мрежата зависи от качеството на партньорите. Затова подбираме внимателно.
              </p>
            </ScrollReveal>
          </div>

          {/* Right - Requirements list */}
          <div className="space-y-6">
            {requirements.map((req, i) => (
              <ScrollReveal key={req.text} animation="fade-up" delay={i * 100}>
                <div className="flex gap-5 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all duration-300">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                    <req.icon className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="font-sans font-semibold text-slate-900 mb-1">{req.text}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">{req.detail}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Application Form CTA ────────────────────────────────
function ApplicationSection() {
  const [form, setForm] = useState({
    clinic_name: '',
    contact_name: '',
    city: '',
    phone: '',
    email: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch(`${API_URL}/api/clinic-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section 
      id="application" 
      className="relative py-24 md:py-32 bg-slate-950 overflow-hidden"
      data-testid="clinics-application"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://static.prod-images.emergentagent.com/jobs/25b55d94-1ed6-49c7-af05-4dd6f19863cf/images/2298694c4c9cbbf07d3a89bf22a454c37b902fe002b36762f137545ab69e27f0.png"
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-slate-950/80" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 md:px-12">
        {status === 'success' ? (
          <ScrollReveal animation="zoom">
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="w-10 h-10 text-sky-400" />
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-white mb-4">
                Благодарим за интереса
              </h2>
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                Ще прегледаме вашата кандидатура и ще се свържем с вас в рамките на 48 часа.
              </p>
            </div>
          </ScrollReveal>
        ) : (
          <>
            <ScrollReveal animation="fade-up">
              <div className="text-center mb-12">
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white mb-4">
                  Кандидатствай
                </h2>
                <p className="text-slate-400 text-lg">
                  Попълнете формата и ние ще се свържем с вас.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={150}>
              <form 
                onSubmit={handleSubmit} 
                className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 space-y-6"
                data-testid="clinic-application-form"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Име на клиниката</label>
                    <input
                      type="text"
                      required
                      value={form.clinic_name}
                      onChange={e => setForm(f => ({ ...f, clinic_name: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors outline-none"
                      placeholder="Дентал клиник"
                      data-testid="input-clinic-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Лице за контакт</label>
                    <input
                      type="text"
                      required
                      value={form.contact_name}
                      onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors outline-none"
                      placeholder="Д-р Иванов"
                      data-testid="input-contact-name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Град</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors outline-none"
                    placeholder="София"
                    data-testid="input-city"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Телефон</label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors outline-none"
                      placeholder="+359 888 123 456"
                      data-testid="input-phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Имейл</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors outline-none"
                      placeholder="clinic@example.com"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="footer-apply-btn"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Изпращане...</span>
                    </>
                  ) : (
                    <>
                      <span>Кандидатствай</span>
                      <ArrowUpRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {status === 'error' && (
                  <p className="text-red-400 text-sm text-center" data-testid="form-error">
                    Възникна грешка. Моля, опитайте отново.
                  </p>
                )}
              </form>
            </ScrollReveal>
          </>
        )}
      </div>
    </section>
  )
}

// ─── Trust Positioning ───────────────────────────────────
function TrustSection() {
  return (
    <section className="py-24 md:py-28 bg-slate-50" data-testid="clinics-trust">
      <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
        <ScrollReveal animation="fade-up">
          <div className="w-px h-12 bg-slate-300 mx-auto mb-10" />
          <blockquote className="font-serif text-xl sm:text-2xl md:text-3xl font-normal tracking-tight text-slate-700 italic leading-relaxed">
            &ldquo;Zubite.bg изгражда система за прозрачност и реални резултати, а не просто реклама.&rdquo;
          </blockquote>
          <div className="w-px h-12 bg-slate-300 mx-auto mt-10" />
        </ScrollReveal>
      </div>
    </section>
  )
}

// ─── Navigation (Minimal, dark) ──────────────────────────
function ClinicsHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link 
            href="/" 
            className="font-serif text-2xl font-semibold text-white transition-opacity hover:opacity-80"
            data-testid="clinics-logo"
          >
            Zubite<span className="text-sky-400">.bg</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="hidden md:inline text-sm text-slate-400 hover:text-white transition-colors"
            >
              Начало
            </Link>
            <a
              href="#application"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/25"
              data-testid="nav-apply-btn"
            >
              Кандидатствай
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

// ─── Footer (Minimal, dark) ─────────────────────────────
function ClinicsFooter() {
  return (
    <footer className="bg-slate-950 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-serif text-lg font-semibold text-white">
            Zubite<span className="text-sky-400">.bg</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Поверителност</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Условия</Link>
            <Link href="/contact" className="hover:text-slate-300 transition-colors">Контакти</Link>
          </div>
          <p className="text-sm text-slate-600">
            &copy; {new Date().getFullYear()} Zubite.bg
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Main Export ─────────────────────────────────────────
export function ForClinicsContent() {
  return (
    <main className="min-h-screen bg-white">
      <ClinicsHeader />
      <HeroSection />
      <HowItWorksSection />
      <DifferentiatorsSection />
      <RequirementsSection />
      <ApplicationSection />
      <TrustSection />
      <ClinicsFooter />
    </main>
  )
}
