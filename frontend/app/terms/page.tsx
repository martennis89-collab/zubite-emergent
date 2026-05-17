import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { LegalShell, LegalSection } from '@/components/static/LegalShell'

export const metadata: Metadata = {
  title: 'Условия за ползване | Zubite.bg',
  description: 'Условия за ползване на уебсайта Zubite.bg.',
  robots: 'noindex, follow',
}

export default function TermsPage() {
  const lastUpdated = new Date().toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden" data-testid="terms-page">
      <Header />

      <LegalShell
        eyebrow="Правила · Ползване"
        title={<>Условия за <span className="text-teal-600">ползване</span></>}
        lastUpdatedLabel={`Последна актуализация: ${lastUpdated}`}
        testId="terms-article"
      >
        <LegalSection number={1} title="Приемане на условията">
          <p>
            С използването на уебсайта zubite.bg („Сайта"), вие приемате настоящите Условия за ползване. Ако не сте съгласни с тях, моля не използвайте Сайта.
          </p>
        </LegalSection>

        <LegalSection number={2} title="Описание на услугата">
          <p>Zubite.bg е информационна платформа, която:</p>
          <ul>
            <li>Предоставя образователно съдържание за дентално здраве</li>
            <li>Предлага тест за самооценка на денталния статус</li>
            <li>Помага на потребителите да намерят подходящи дентални клиники</li>
          </ul>
          <div className="not-prose mt-6 p-4 rounded-xl bg-amber-50/70 ring-1 ring-amber-200">
            <p className="text-amber-900 text-sm">
              <strong>Важно:</strong> Zubite.bg НЕ е медицинско заведение и НЕ предоставя медицински диагнози или лечение. Информацията на сайта е само с образователна цел и не замества консултация с квалифициран специалист.
            </p>
          </div>
        </LegalSection>

        <LegalSection number={3} title="Тест за самооценка">
          <p>Тестът на Сайта е предназначен само за информационни цели:</p>
          <ul>
            <li>Резултатите НЕ са медицинска диагноза</li>
            <li>Тестът не замества преглед при зъболекар или ортодонт</li>
            <li>Препоръчваме консултация със специалист независимо от резултата</li>
          </ul>
        </LegalSection>

        <LegalSection number={4} title="Препоръки за клиники">
          <p>Когато ви препоръчваме клиники:</p>
          <ul>
            <li>Препоръките се базират на информацията, която ни предоставяте</li>
            <li>Не гарантираме качеството на услугите на препоръчаните клиники</li>
            <li>Окончателният избор на клиника е ваша отговорност</li>
            <li>Не носим отговорност за резултатите от лечението</li>
          </ul>
        </LegalSection>

        <LegalSection number={5} title="Задължения на потребителя">
          <p>Вие се съгласявате:</p>
          <ul>
            <li>Да предоставяте вярна и актуална информация</li>
            <li>Да не използвате Сайта за незаконни цели</li>
            <li>Да не се опитвате да нарушите сигурността на Сайта</li>
            <li>Да не разпространявате съдържание от Сайта без разрешение</li>
          </ul>
        </LegalSection>

        <LegalSection number={6} title="Интелектуална собственост">
          <p>
            Цялото съдържание на Сайта (текст, изображения, лого, дизайн) е собственост на Zubite.bg или е използвано с разрешение. Забранява се копирането, разпространението или модифицирането без изрично писмено съгласие.
          </p>
        </LegalSection>

        <LegalSection number={7} title="Ограничаване на отговорността">
          <p>В максималната степен, позволена от закона:</p>
          <ul>
            <li>Не гарантираме непрекъснат достъп до Сайта</li>
            <li>Не носим отговорност за грешки в съдържанието</li>
            <li>Не отговаряме за щети от използването на информацията</li>
            <li>Не отговаряме за действията на трети страни (клиники)</li>
          </ul>
        </LegalSection>

        <LegalSection number={8} title="Връзки към други сайтове">
          <p>
            Сайтът може да съдържа връзки към външни уебсайтове. Не контролираме и не носим отговорност за съдържанието или политиките за поверителност на тези сайтове.
          </p>
        </LegalSection>

        <LegalSection number={9} title="Промени в условията">
          <p>
            Запазваме правото да променяме тези условия по всяко време. Продължаването на използването на Сайта след публикуване на промени означава приемане на новите условия.
          </p>
        </LegalSection>

        <LegalSection number={10} title="Приложимо право">
          <p>
            Настоящите условия се уреждат от законодателството на Република България. Всички спорове ще се решават от компетентните български съдилища.
          </p>
        </LegalSection>

        <LegalSection number={11} title="Контакт">
          <p>При въпроси относно тези условия, свържете се с нас:</p>
          <div className="not-prose mt-4 p-4 rounded-xl bg-teal-50/60 ring-1 ring-teal-100">
            <p className="text-slate-800 font-medium">Zubite.bg</p>
            <p className="text-slate-600 text-sm">Имейл: <a href="mailto:info@zubite.bg" className="text-teal-700 hover:underline">info@zubite.bg</a></p>
          </div>
        </LegalSection>
      </LegalShell>

      <Footer />
    </main>
  )
}
