import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Mail, MapPin, Clock, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Контакти | Zubite.bg',
  description: 'Свържете се с Zubite.bg. Имате въпроси? Ние сме тук да помогнем.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden" data-testid="contact-page">
      <Header />

      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28">
        {/* Decorative orbs */}
        <div aria-hidden className="absolute -top-24 -left-32 w-[34rem] h-[34rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-cyan-100/40 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-white/70 text-[11px] uppercase tracking-[0.18em] text-teal-700 font-semibold px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Контакти
            </span>
            <h1 className="mt-6 font-serif text-4xl sm:text-5xl font-semibold text-slate-900 leading-tight">
              Свържете се <span className="text-teal-600">с нас</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl mx-auto">
              Имате въпроси? Ние сме тук да помогнем.
            </p>
          </div>

          {/* Contact channels — phone card intentionally hidden until a
              real, verified Zubite.bg phone line is provided. The previous
              "+359 888 123 456" was a placeholder; we don't ship dead tel:
              links. Email + location remain as primary channels. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mb-10">
            <a
              href="mailto:info@zubite.bg"
              className="group rounded-3xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)] hover:shadow-[0_28px_60px_-22px_rgba(13,148,136,0.25)] hover:ring-teal-200/60 transition-all duration-300 p-7 text-center"
              data-testid="contact-email-card"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-50/80 ring-1 ring-teal-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-100 transition-colors">
                <Mail className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="font-medium text-slate-900 mb-1.5">Имейл</h3>
              <p className="text-sm text-slate-600 group-hover:text-teal-700 transition-colors">
                info@zubite.bg
              </p>
            </a>

            <div className="rounded-3xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)] p-7 text-center" data-testid="contact-location-card">
              <div className="w-12 h-12 rounded-2xl bg-teal-50/80 ring-1 ring-teal-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="font-medium text-slate-900 mb-1.5">Локация</h3>
              <p className="text-sm text-slate-600">
                София, България
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)] p-7 md:p-9" data-testid="contact-hours-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-teal-50/80 ring-1 ring-teal-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-700" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-slate-900">
                Работно време
              </h2>
            </div>
            <div className="space-y-1 text-slate-600 text-sm">
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span>Понеделник — Петък</span>
                <span className="text-slate-900 font-medium">09:00 — 18:00</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span>Събота</span>
                <span className="text-slate-900 font-medium">10:00 — 14:00</span>
              </div>
              <div className="flex justify-between py-3">
                <span>Неделя</span>
                <span className="text-slate-400">Затворено</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
