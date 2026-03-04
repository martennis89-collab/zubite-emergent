import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Условия за ползване | Zubite.bg',
  description: 'Условия за ползване на Zubite.bg. Прочетете условията преди да използвате нашите услуги.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-8">
            Условия за ползване
          </h1>
          
          <div className="prose prose-invert prose-slate max-w-none">
            <div className="glass rounded-2xl p-8 space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">1. Общи условия</h2>
                <p className="text-slate-300">
                  С използването на Zubite.bg, вие приемате тези условия за ползване. Ако не сте съгласни с някое от условията, моля не използвайте нашите услуги.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">2. Описание на услугите</h2>
                <p className="text-slate-300">
                  Zubite.bg предоставя платформа за свързване на потребители с дентални клиники. Ние не предоставяме медицински услуги директно, а действаме като посредник.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">3. Отговорност</h2>
                <p className="text-slate-300">
                  Информацията на сайта е с образователна цел и не заменя професионална медицинска консултация. Препоръчваме консултация с квалифициран специалист за всички медицински решения.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">4. Интелектуална собственост</h2>
                <p className="text-slate-300">
                  Цялото съдържание на сайта, включително текст, графики и дизайн, е собственост на Zubite.bg и е защитено от авторски права.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">5. Промени в условията</h2>
                <p className="text-slate-300">
                  Запазваме правото да променяме тези условия по всяко време. Промените влизат в сила от момента на публикуването им на сайта.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">6. Контакт</h2>
                <p className="text-slate-300">
                  За въпроси относно условията за ползване, моля свържете се с нас на: info@zubite.bg
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
