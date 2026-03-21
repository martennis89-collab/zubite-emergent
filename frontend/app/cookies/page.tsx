import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Политика за бисквитки | Zubite.bg',
  description: 'Научете какви бисквитки използва Zubite.bg и как да управлявате настройките си.',
  robots: 'noindex, follow',
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      <article className="pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Към началото
          </Link>

          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-8">
            Политика за бисквитки
          </h1>
          
          <div className="text-sm text-slate-500 mb-8">
            Последна актуализация: {new Date().toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          <div className="prose prose-slate max-w-none">
            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">1. Какво са бисквитките?</h2>
              <p className="text-slate-600 leading-relaxed">
                Бисквитките са малки текстови файлове, които се съхраняват на вашето устройство (компютър, таблет, телефон), когато посещавате уебсайт. Те позволяват на сайта да „запомни" вашите действия и предпочитания за определен период от време.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">2. Какви бисквитки използваме</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h3 className="font-semibold text-slate-900 mb-2">Строго необходими бисквитки</h3>
                  <p className="text-slate-600 text-sm mb-2">
                    Тези бисквитки са необходими за правилното функциониране на сайта. Не могат да бъдат изключени.
                  </p>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-slate-700">Име</th>
                        <th className="text-left py-2 text-slate-700">Цел</th>
                        <th className="text-left py-2 text-slate-700">Срок</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      <tr className="border-b border-slate-100">
                        <td className="py-2">cookie_consent</td>
                        <td className="py-2">Запомня вашия избор за бисквитки</td>
                        <td className="py-2">1 година</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2">session_id</td>
                        <td className="py-2">Идентифицира вашата сесия</td>
                        <td className="py-2">Сесия</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <h3 className="font-semibold text-slate-900 mb-2">Аналитични бисквитки</h3>
                  <p className="text-slate-600 text-sm mb-2">
                    Помагат ни да разберем как посетителите използват сайта, за да го подобрим.
                  </p>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-slate-700">Име</th>
                        <th className="text-left py-2 text-slate-700">Цел</th>
                        <th className="text-left py-2 text-slate-700">Срок</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      <tr className="border-b border-slate-100">
                        <td className="py-2">_ga</td>
                        <td className="py-2">Google Analytics - идентификация</td>
                        <td className="py-2">2 години</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2">_gid</td>
                        <td className="py-2">Google Analytics - сесия</td>
                        <td className="py-2">24 часа</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <h3 className="font-semibold text-slate-900 mb-2">Маркетингови бисквитки</h3>
                  <p className="text-slate-600 text-sm mb-2">
                    Използват се за показване на релевантни реклами и измерване на ефективността им.
                  </p>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-slate-700">Име</th>
                        <th className="text-left py-2 text-slate-700">Цел</th>
                        <th className="text-left py-2 text-slate-700">Срок</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      <tr className="border-b border-slate-100">
                        <td className="py-2">_fbp</td>
                        <td className="py-2">Meta Pixel - рекламно проследяване</td>
                        <td className="py-2">3 месеца</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2">_gcl_au</td>
                        <td className="py-2">Google Ads - конверсии</td>
                        <td className="py-2">3 месеца</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">3. Как да управлявате бисквитките</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Можете да контролирате и/или изтривате бисквитки по няколко начина:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>
                  <strong>Чрез нашия банер:</strong> При първото си посещение можете да изберете кои типове бисквитки да приемете.
                </li>
                <li>
                  <strong>Чрез браузъра:</strong> Повечето браузъри позволяват блокиране или изтриване на бисквитки чрез настройките.
                </li>
                <li>
                  <strong>Чрез настройките по-долу:</strong> Можете да промените предпочитанията си по всяко време.
                </li>
              </ul>
              
              <div className="mt-6 p-4 bg-sky-50 rounded-xl border border-sky-200">
                <p className="text-sky-800 text-sm">
                  <strong>Забележка:</strong> Деактивирането на определени бисквитки може да повлияе на функционалността на сайта.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">4. Бисквитки от трети страни</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Използваме услуги от трети страни, които могат да поставят собствени бисквитки:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li><strong>Google Analytics</strong> - за анализ на трафика</li>
                <li><strong>Meta (Facebook) Pixel</strong> - за рекламни кампании</li>
                <li><strong>Google Ads</strong> - за измерване на конверсии</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-4">
                Политиките за поверителност на тези услуги можете да намерите на техните уебсайтове.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">5. Промени в политиката</h2>
              <p className="text-slate-600 leading-relaxed">
                Можем да актуализираме тази политика периодично. При съществени промени ще покажем нов банер за съгласие.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">6. Контакт</h2>
              <p className="text-slate-600 leading-relaxed">
                При въпроси относно бисквитките, свържете се с нас на:{' '}
                <a href="mailto:privacy@zubite.bg" className="text-sky-600 hover:underline">privacy@zubite.bg</a>
              </p>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
