import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Mail, Phone, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Контакти | Zubite.bg',
  description: 'Свържете се с Zubite.bg. Имате въпроси? Ние сме тук да помогнем.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
              Свържете се с нас
            </h1>
            <p className="text-lg text-slate-400">
              Имате въпроси? Ние сме тук да помогнем.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="glass rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="font-medium text-white mb-2">Имейл</h3>
              <a href="mailto:info@zubite.bg" className="text-slate-400 hover:text-sky-400 transition-colors">
                info@zubite.bg
              </a>
            </div>
            
            <div className="glass rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="font-medium text-white mb-2">Телефон</h3>
              <a href="tel:+359888123456" className="text-slate-400 hover:text-sky-400 transition-colors">
                +359 888 123 456
              </a>
            </div>
            
            <div className="glass rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="font-medium text-white mb-2">Локация</h3>
              <p className="text-slate-400">
                София, България
              </p>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-8">
            <h2 className="font-serif text-2xl font-semibold text-white mb-6">
              Работно време
            </h2>
            <div className="space-y-3 text-slate-300">
              <div className="flex justify-between">
                <span>Понеделник - Петък</span>
                <span className="text-white">09:00 - 18:00</span>
              </div>
              <div className="flex justify-between">
                <span>Събота</span>
                <span className="text-white">10:00 - 14:00</span>
              </div>
              <div className="flex justify-between">
                <span>Неделя</span>
                <span className="text-slate-500">Затворено</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
