import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { LegalShell, LegalSection } from '@/components/static/LegalShell'

export const metadata: Metadata = {
  title: 'Политика за поверителност | Zubite.bg',
  description: 'Научете как Zubite.bg събира, използва и защитава вашите лични данни в съответствие с GDPR.',
  robots: 'noindex, follow',
}

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden" data-testid="privacy-page">
      <Header />

      <LegalShell
        eyebrow="GDPR · Поверителност"
        title={<>Политика за <span className="text-teal-600">поверителност</span></>}
        lastUpdatedLabel={`Последна актуализация: ${lastUpdated}`}
        testId="privacy-article"
      >
        <LegalSection number={1} title="Въведение">
          <p>
            Zubite.bg („ние", „нас" или „нашият") се ангажира да защитава вашата поверителност. Тази Политика за поверителност обяснява как събираме, използваме, съхраняваме и защитаваме вашите лични данни, когато използвате нашия уебсайт zubite.bg.
          </p>
          <p>
            Ние обработваме вашите данни в съответствие с Общия регламент относно защитата на данните (GDPR) на Европейския съюз и българското законодателство за защита на личните данни.
          </p>
        </LegalSection>

        <LegalSection number={2} title="Какви данни събираме">
          <p>Ние събираме следните видове лични данни:</p>
          <ul>
            <li><strong>Данни за контакт:</strong> име, телефонен номер, имейл адрес, град</li>
            <li><strong>Данни от теста:</strong> вашите отговори на въпросите в нашия тест за оценка</li>
            <li><strong>Технически данни:</strong> IP адрес, тип браузър, операционна система, време на посещение</li>
            <li><strong>Данни за използване:</strong> как взаимодействате с нашия уебсайт (страници, кликвания)</li>
          </ul>
        </LegalSection>

        <LegalSection number={3} title="Защо събираме вашите данни">
          <p>Използваме вашите данни за следните цели:</p>
          <ul>
            <li>Да ви предоставим препоръки за подходящи дентални клиники</li>
            <li>Да се свържем с вас относно вашите резултати от теста</li>
            <li>Да подобрим нашия уебсайт и услуги</li>
            <li>Да анализираме използването на сайта за оптимизация</li>
            <li>Да спазваме законовите си задължения</li>
          </ul>
        </LegalSection>

        <LegalSection number={4} title="Правно основание за обработка">
          <p>Обработваме вашите данни на следните правни основания:</p>
          <ul>
            <li><strong>Съгласие:</strong> когато изпращате формуляр или приемате бисквитки</li>
            <li><strong>Легитимен интерес:</strong> за подобряване на услугите и анализ на използването</li>
            <li><strong>Изпълнение на договор:</strong> за предоставяне на заявените от вас услуги</li>
          </ul>
        </LegalSection>

        <LegalSection number={5} title="Споделяне на данни">
          <p>Ние не продаваме вашите лични данни. Можем да споделяме данни със:</p>
          <ul>
            <li><strong>Дентални клиники:</strong> само когато изрично поискате препоръка</li>
            <li><strong>Доставчици на услуги:</strong> хостинг, имейл услуги, аналитични инструменти</li>
            <li><strong>Държавни органи:</strong> когато се изисква по закон</li>
          </ul>
        </LegalSection>

        <LegalSection number={6} title="Вашите права">
          <p>Съгласно GDPR имате следните права:</p>
          <ul>
            <li><strong>Право на достъп:</strong> да получите копие от вашите данни</li>
            <li><strong>Право на коригиране:</strong> да поправите неточни данни</li>
            <li><strong>Право на изтриване:</strong> да поискате изтриване на вашите данни</li>
            <li><strong>Право на ограничаване:</strong> да ограничите обработката на данните</li>
            <li><strong>Право на преносимост:</strong> да получите данните си в машинно четим формат</li>
            <li><strong>Право на възражение:</strong> да възразите срещу обработката</li>
            <li><strong>Право да оттеглите съгласието си:</strong> по всяко време</li>
          </ul>
          <p>
            За да упражните тези права, свържете се с нас на: <a href="mailto:privacy@zubite.bg">privacy@zubite.bg</a>
          </p>
        </LegalSection>

        <LegalSection number={7} title="Съхранение на данни">
          <p>
            Съхраняваме вашите лични данни само толкова дълго, колкото е необходимо за целите, за които са събрани. Обикновено това е период от 2 години след последния ви контакт с нас, освен ако законът не изисква по-дълъг период.
          </p>
        </LegalSection>

        <LegalSection number={8} title="Сигурност на данните">
          <p>
            Прилагаме подходящи технически и организационни мерки за защита на вашите данни срещу неоторизиран достъп, загуба или унищожаване. Използваме криптиране (SSL/TLS) за защита на данните при предаване.
          </p>
        </LegalSection>

        <LegalSection number={9} title="Бисквитки">
          <p>
            Използваме бисквитки за подобряване на вашето изживяване. За повече информация вижте нашата{' '}
            <Link href="/cookies" className="text-teal-700 hover:underline">Политика за бисквитки</Link>.
          </p>
        </LegalSection>

        <LegalSection number={10} title="Промени в политиката">
          <p>
            Можем да актуализираме тази политика периодично. При съществени промени ще ви уведомим чрез нашия уебсайт или по имейл.
          </p>
        </LegalSection>

        <LegalSection number={11} title="Контакт">
          <p>При въпроси относно тази политика или обработката на вашите данни, свържете се с нас:</p>
          <div className="not-prose mt-4 p-4 rounded-xl bg-teal-50/60 ring-1 ring-teal-100">
            <p className="text-slate-800 font-medium">Zubite.bg</p>
            <p className="text-slate-600 text-sm">Имейл: <a href="mailto:privacy@zubite.bg" className="text-teal-700 hover:underline">privacy@zubite.bg</a></p>
          </div>
          <p>
            Имате право да подадете жалба до Комисията за защита на личните данни (КЗЛД) на адрес: бул. „Проф. Цветан Лазаров" № 2, София 1592, или онлайн на <a href="https://www.cpdp.bg" target="_blank" rel="noopener noreferrer">www.cpdp.bg</a>.
          </p>
        </LegalSection>
      </LegalShell>

      <Footer />
    </main>
  )
}
