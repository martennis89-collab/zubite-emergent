import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ChevronRight, ArrowRight, AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Признаци, че може да имаш проблем със захапката (дори без болка) | Zubite.bg',
  description: 'Струпани зъби, неравномерна захапка, щракане, напрежение, износване — научи какви са ранните признаци и защо да не ги игнорираш.',
  keywords: 'симптоми зъби, криви зъби, захапка, щракане челюст, напрежение челюст, износване зъби, ортодонтия',
  alternates: {
    canonical: 'https://zubite.bg/symptoms',
  },
}

const SYMPTOMS = [
  {
    title: 'Струпани зъби',
    description: 'Когато зъбите се застъпват или са на различни нива, това не е само естетически проблем. Струпаните зъби са по-трудни за почистване и по-често развиват кариеси между тях.',
    warning: 'Проблемът обикновено се влошава с времето, не остава същият.',
  },
  {
    title: 'Неравномерна захапка',
    description: 'Ако усещаш, че някои зъби се докосват първи или по-силно при захапване, това е признак за малоклузия. С времето неравномерното натоварване води до износване и проблеми с челюстната става.',
    warning: 'Повечето хора не осъзнават това, докато не се появи болка.',
  },
  {
    title: 'Щракане при отваряне на устата',
    description: 'Звукът при отваряне или затваряне на устата е сигнал от челюстната става (TMJ). Това може да е свързано с неправилна захапка, стискане или бруксизъм.',
    warning: 'Игнорирането може да доведе до хронична болка и затруднено отваряне.',
  },
  {
    title: 'Напрежение в челюстта или лицето',
    description: 'Събуждаш ли се с болка или скованост? Стискането на зъби през нощта е по-често отколкото повечето хора осъзнават — и често е свързано със захапката.',
    warning: 'Това е един от най-често пренебрегваните симптоми.',
  },
  {
    title: 'Износване на зъбите',
    description: 'Ако зъбите ти изглеждат по-къси или ръбовете им са плоски, това е признак за бруксизъм или неправилна захапка. Емайлът не се възстановява.',
    warning: 'Веднъж загубен, емайлът не се връща.',
  },
  {
    title: 'Дъвчене от едната страна',
    description: 'Ако несъзнателно избягваш да дъвчеш от едната страна, може да има проблем със захапката или чувствителност, която не осъзнаваш напълно.',
    warning: 'Асиметричното натоварване води до асиметрично износване.',
  },
  {
    title: 'Дишане през устата',
    description: 'Дишането през устата, особено през нощта, може да е свързано с проблеми със захапката или позицията на челюстите. Това често води до сухота в устата и увеличен риск от кариеси.',
    warning: 'Хроничното дишане през устата може да повлияе на развитието на лицето.',
  },
  {
    title: 'Задържане на храна между зъбите',
    description: 'Когато храната редовно се задържа на едни и същи места, това показва разстояния или неправилно подреждане, което затруднява хигиената.',
    warning: 'Това създава условия за кариеси и проблеми с венците.',
  },
]

export default function SymptomsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight mb-6">
              Признаци, че може да имаш проблем със захапката
              <span className="block text-slate-500 text-2xl sm:text-3xl lg:text-4xl mt-2">(дори без болка)</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Повечето проблеми със захапката не започват с болка. Започват тихо — и се влошават постепенно.
            </p>
          </div>
          
          {/* Alert Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-12 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-medium mb-1">
                Повечето хора разпознават тези признаци чак когато лечението стане по-сложно.
              </p>
              <p className="text-amber-700 text-sm">
                Ранното откриване прави корекцията по-лесна и по-евтина.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Symptoms List */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="space-y-6">
            {SYMPTOMS.map((symptom, index) => (
              <article
                key={symptom.title}
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 hover:border-slate-300 hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sky-600 font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-3">
                      {symptom.title}
                    </h2>
                    <p className="text-slate-600 mb-4 leading-relaxed">
                      {symptom.description}
                    </p>
                    <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {symptom.warning}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-sky-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-6">
            Разпознаваш ли нещо от тези?
          </h2>
          <p className="text-sky-100 text-lg mb-10 max-w-xl mx-auto">
            Провери на кой етап си с кратък тест. Отнема 60 секунди.
          </p>
          
          <Link
            href="/quiz"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-sky-600 text-lg font-semibold rounded-full hover:shadow-2xl transition-all duration-300 group"
            data-testid="symptoms-quiz-cta"
          >
            <span>Провери къде се намираш</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
      
      {/* Related Links */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Научи повече
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/orthodontics"
              className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-sky-300 hover:shadow-lg transition-all duration-300"
            >
              <h3 className="font-serif text-lg font-semibold text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">
                Алайнери или брекети?
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Разбери кой метод е подходящ за твоя случай.
              </p>
              <span className="text-sky-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Научи повече
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            
            <Link
              href="/blog"
              className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-sky-300 hover:shadow-lg transition-all duration-300"
            >
              <h3 className="font-serif text-lg font-semibold text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">
                Блог
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Статии и съвети за грижа за зъбите.
              </p>
              <span className="text-sky-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Разгледай
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
