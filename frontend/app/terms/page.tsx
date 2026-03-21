import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Условия за ползване | Zubite.bg',
  description: 'Условия за ползване на уебсайта Zubite.bg.',
  robots: 'noindex, follow',
}

export default function TermsPage() {
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
            Условия за ползване
          </h1>
          
          <div className="text-sm text-slate-500 mb-8">
            Последна актуализация: {new Date().toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          <div className="prose prose-slate max-w-none">
            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">1. Приемане на условията</h2>
              <p className="text-slate-600 leading-relaxed">
                С използването на уебсайта zubite.bg („Сайта"), вие приемате настоящите Условия за ползване. Ако не сте съгласни с тях, моля не използвайте Сайта.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">2. Описание на услугата</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Zubite.bg е информационна платформа, която:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Предоставя образователно съдържание за дентално здраве</li>
                <li>Предлага тест за самооценка на денталния статус</li>
                <li>Помага на потребителите да намерят подходящи дентални клиники</li>
              </ul>
              
              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-amber-800 text-sm">
                  <strong>Важно:</strong> Zubite.bg НЕ е медицинско заведение и НЕ предоставя медицински диагнози или лечение. Информацията на сайта е само с образователна цел и не замества консултация с квалифициран специалист.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">3. Тест за самооценка</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Тестът на Сайта е предназначен само за информационни цели:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Резултатите НЕ са медицинска диагноза</li>
                <li>Тестът не замества преглед при зъболекар или ортодонт</li>
                <li>Препоръчваме консултация със специалист независимо от резултата</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">4. Препоръки за клиники</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Когато ви препоръчваме клиники:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Препоръките се базират на информацията, която ни предоставяте</li>
                <li>Не гарантираме качеството на услугите на препоръчаните клиники</li>
                <li>Окончателният избор на клиника е ваша отговорност</li>
                <li>Не носим отговорност за резултатите от лечението</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">5. Задължения на потребителя</h2>
              <p className="text-slate-600 leading-relaxed mb-4">Вие се съгласявате:</p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Да предоставяте вярна и актуална информация</li>
                <li>Да не използвате Сайта за незаконни цели</li>
                <li>Да не се опитвате да нарушите сигурността на Сайта</li>
                <li>Да не разпространявате съдържание от Сайта без разрешение</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">6. Интелектуална собственост</h2>
              <p className="text-slate-600 leading-relaxed">
                Цялото съдържание на Сайта (текст, изображения, лого, дизайн) е собственост на Zubite.bg или е използвано с разрешение. Забранява се копирането, разпространението или модифицирането без изрично писмено съгласие.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">7. Ограничаване на отговорността</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                В максималната степен, позволена от закона:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Не гарантираме непрекъснат достъп до Сайта</li>
                <li>Не носим отговорност за грешки в съдържанието</li>
                <li>Не отговаряме за щети от използването на информацията</li>
                <li>Не отговаряме за действията на трети страни (клиники)</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">8. Връзки към други сайтове</h2>
              <p className="text-slate-600 leading-relaxed">
                Сайтът може да съдържа връзки към външни уебсайтове. Не контролираме и не носим отговорност за съдържанието или политиките за поверителност на тези сайтове.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">9. Промени в условията</h2>
              <p className="text-slate-600 leading-relaxed">
                Запазваме правото да променяме тези условия по всяко време. Продължаването на използването на Сайта след публикуване на промени означава приемане на новите условия.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">10. Приложимо право</h2>
              <p className="text-slate-600 leading-relaxed">
                Настоящите условия се уреждат от законодателството на Република България. Всички спорове ще се решават от компетентните български съдилища.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">11. Контакт</h2>
              <p className="text-slate-600 leading-relaxed">
                При въпроси относно тези условия, свържете се с нас:
              </p>
              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <p className="text-slate-700"><strong>Zubite.bg</strong></p>
                <p className="text-slate-600">Имейл: <a href="mailto:info@zubite.bg" className="text-sky-600 hover:underline">info@zubite.bg</a></p>
              </div>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
