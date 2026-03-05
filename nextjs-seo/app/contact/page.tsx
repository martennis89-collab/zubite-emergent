import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Контакти | Zubite.bg',
  description: 'Свържете се с Zubite.bg. Имате въпроси? Ние сме тук да помогнем.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sky-500 font-medium text-sm tracking-wide uppercase mb-4">
              Контакти
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-4">
              Свържете се с нас
            </h1>
            <p className="text-lg text-slate-600">
              Имате въпроси? Ние сме тук да помогнем.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center card-hover-subtle">
              <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Имейл</h3>
              <a href="mailto:info@zubite.bg" className="text-slate-500 hover:text-sky-500 transition-colors">
                info@zubite.bg
              </a>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center card-hover-subtle">
              <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Телефон</h3>
              <a href="tel:+359888123456" className="text-slate-500 hover:text-sky-500 transition-colors">
                +359 888 123 456
              </a>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center card-hover-subtle">
              <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Локация</h3>
              <p className="text-slate-500">
                София, България
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-sky-600" />
              <h2 className="font-serif text-xl font-semibold text-slate-900">
                Работно време
              </h2>
            </div>
            <div className="space-y-4 text-slate-600">
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span>Понеделник - Петък</span>
                <span className="text-slate-900 font-medium">09:00 - 18:00</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span>Събота</span>
                <span className="text-slate-900 font-medium">10:00 - 14:00</span>
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
