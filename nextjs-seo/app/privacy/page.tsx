import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Политика за поверителност | Zubite.bg',
  description: 'Политика за поверителност на Zubite.bg. Научете как обработваме и защитаваме вашите лични данни.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-8">
            Политика за поверителност
          </h1>
          
          <div className="prose prose-invert prose-slate max-w-none">
            <div className="glass rounded-2xl p-8 space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">1. Обща информация</h2>
                <p className="text-slate-300">
                  Zubite.bg се ангажира да защитава вашата поверителност. Тази политика описва как събираме, използваме и защитаваме вашата лична информация.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">2. Събирана информация</h2>
                <p className="text-slate-300 mb-4">Ние събираме следната информация:</p>
                <ul className="list-disc list-inside text-slate-300 space-y-2">
                  <li>Име и контактна информация (телефон, имейл)</li>
                  <li>Отговори от въпросници за оценка на денталните нужди</li>
                  <li>Предпочитания за лечение и град</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">3. Използване на информацията</h2>
                <p className="text-slate-300 mb-4">Вашата информация се използва за:</p>
                <ul className="list-disc list-inside text-slate-300 space-y-2">
                  <li>Свързване с подходящи дентални клиники</li>
                  <li>Предоставяне на персонализирани препоръки</li>
                  <li>Подобряване на нашите услуги</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">4. Защита на данните</h2>
                <p className="text-slate-300">
                  Прилагаме технически и организационни мерки за защита на вашите данни в съответствие с GDPR. Вашите данни се съхраняват сигурно и се споделят само с партньорски клиники, след вашето изрично съгласие.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">5. Вашите права</h2>
                <p className="text-slate-300 mb-4">Имате право да:</p>
                <ul className="list-disc list-inside text-slate-300 space-y-2">
                  <li>Поискате достъп до вашите данни</li>
                  <li>Поискате корекция или изтриване</li>
                  <li>Оттеглите съгласието си</li>
                  <li>Подадете жалба до надзорния орган</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">6. Контакт</h2>
                <p className="text-slate-300">
                  За въпроси относно поверителността, моля свържете се с нас на: privacy@zubite.bg
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
