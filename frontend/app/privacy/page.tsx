import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Политика за поверителност | Zubite.bg',
  description: 'Научете как Zubite.bg събира, използва и защитава вашите лични данни в съответствие с GDPR.',
  robots: 'noindex, follow',
}

export default function PrivacyPage() {
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
            Политика за поверителност
          </h1>
          
          <div className="text-sm text-slate-500 mb-8">
            Последна актуализация: {new Date().toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          <div className="prose prose-slate max-w-none">
            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">1. Въведение</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Zubite.bg („ние", „нас" или „нашият") се ангажира да защитава вашата поверителност. Тази Политика за поверителност обяснява как събираме, използваме, съхраняваме и защитаваме вашите лични данни, когато използвате нашия уебсайт zubite.bg.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Ние обработваме вашите данни в съответствие с Общия регламент относно защитата на данните (GDPR) на Европейския съюз и българското законодателство за защита на личните данни.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">2. Какви данни събираме</h2>
              <p className="text-slate-600 leading-relaxed mb-4">Ние събираме следните видове лични данни:</p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li><strong>Данни за контакт:</strong> име, телефонен номер, имейл адрес, град</li>
                <li><strong>Данни от теста:</strong> вашите отговори на въпросите в нашия тест за оценка</li>
                <li><strong>Технически данни:</strong> IP адрес, тип браузър, операционна система, време на посещение</li>
                <li><strong>Данни за използване:</strong> как взаимодействате с нашия уебсайт (страници, кликвания)</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">3. Защо събираме вашите данни</h2>
              <p className="text-slate-600 leading-relaxed mb-4">Използваме вашите данни за следните цели:</p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Да ви предоставим препоръки за подходящи дентални клиники</li>
                <li>Да се свържем с вас относно вашите резултати от теста</li>
                <li>Да подобрим нашия уебсайт и услуги</li>
                <li>Да анализираме използването на сайта за оптимизация</li>
                <li>Да спазваме законовите си задължения</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">4. Правно основание за обработка</h2>
              <p className="text-slate-600 leading-relaxed mb-4">Обработваме вашите данни на следните правни основания:</p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li><strong>Съгласие:</strong> когато изпращате формуляр или приемате бисквитки</li>
                <li><strong>Легитимен интерес:</strong> за подобряване на услугите и анализ на използването</li>
                <li><strong>Изпълнение на договор:</strong> за предоставяне на заявените от вас услуги</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">5. Споделяне на данни</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Ние не продаваме вашите лични данни. Можем да споделяме данни със:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li><strong>Дентални клиники:</strong> само когато изрично поискате препоръка</li>
                <li><strong>Доставчици на услуги:</strong> хостинг, имейл услуги, аналитични инструменти</li>
                <li><strong>Държавни органи:</strong> когато се изисква по закон</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">6. Вашите права</h2>
              <p className="text-slate-600 leading-relaxed mb-4">Съгласно GDPR имате следните права:</p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li><strong>Право на достъп:</strong> да получите копие от вашите данни</li>
                <li><strong>Право на коригиране:</strong> да поправите неточни данни</li>
                <li><strong>Право на изтриване:</strong> да поискате изтриване на вашите данни</li>
                <li><strong>Право на ограничаване:</strong> да ограничите обработката на данните</li>
                <li><strong>Право на преносимост:</strong> да получите данните си в машинно четим формат</li>
                <li><strong>Право на възражение:</strong> да възразите срещу обработката</li>
                <li><strong>Право да оттеглите съгласието си:</strong> по всяко време</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-4">
                За да упражните тези права, свържете се с нас на: <a href="mailto:privacy@zubite.bg" className="text-sky-600 hover:underline">privacy@zubite.bg</a>
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">7. Съхранение на данни</h2>
              <p className="text-slate-600 leading-relaxed">
                Съхраняваме вашите лични данни само толкова дълго, колкото е необходимо за целите, за които са събрани. Обикновено това е период от 2 години след последния ви контакт с нас, освен ако законът не изисква по-дълъг период.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">8. Сигурност на данните</h2>
              <p className="text-slate-600 leading-relaxed">
                Прилагаме подходящи технически и организационни мерки за защита на вашите данни срещу неоторизиран достъп, загуба или унищожаване. Използваме криптиране (SSL/TLS) за защита на данните при предаване.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">9. Бисквитки</h2>
              <p className="text-slate-600 leading-relaxed">
                Използваме бисквитки за подобряване на вашето изживяване. За повече информация вижте нашата{' '}
                <Link href="/cookies" className="text-sky-600 hover:underline">Политика за бисквитки</Link>.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">10. Промени в политиката</h2>
              <p className="text-slate-600 leading-relaxed">
                Можем да актуализираме тази политика периодично. При съществени промени ще ви уведомим чрез нашия уебсайт или по имейл.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">11. Контакт</h2>
              <p className="text-slate-600 leading-relaxed">
                При въпроси относно тази политика или обработката на вашите данни, свържете се с нас:
              </p>
              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <p className="text-slate-700"><strong>Zubite.bg</strong></p>
                <p className="text-slate-600">Имейл: <a href="mailto:privacy@zubite.bg" className="text-sky-600 hover:underline">privacy@zubite.bg</a></p>
              </div>
              <p className="text-slate-600 leading-relaxed mt-4">
                Имате право да подадете жалба до Комисията за защита на личните данни (КЗЛД) на адрес: бул. „Проф. Цветан Лазаров" № 2, София 1592, или онлайн на <a href="https://www.cpdp.bg" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">www.cpdp.bg</a>.
              </p>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
