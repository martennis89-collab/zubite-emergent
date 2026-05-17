import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { 
  ALIGNER_BRANDS, 
  ALIGNERS_VS_BRACES, 
  ALIGNERS_FAQS,
  BRAND_COMPARISON_DISCLAIMER,
  PRICE_DISCLAIMER,
  EDUCATIONAL_DISCLAIMER,
  TREATMENT_PRICES
} from '@/lib/pricing'
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schema'
import { ArrowRight, ArrowLeft, CheckCircle, XCircle, AlertCircle, Smile, Eye } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

export const metadata: Metadata = {
  title: 'Invisalign vs Spark vs Angel Aligner: Сравнение на алайнери | Zubite.bg',
  description: 'Сравнение на популярните марки алайнери в България: Invisalign, Spark, Angel Aligner. Цени, подходящи случаи, комфорт и наличност. Образователна информация.',
  alternates: {
    canonical: 'https://zubite.bg/aligners-comparison',
  },
  openGraph: {
    title: 'Invisalign vs Spark vs Angel Aligner: Сравнение',
    description: 'Обективно сравнение на марки алайнери в България. Цени, характеристики и какво да очаквате.',
    url: 'https://zubite.bg/aligners-comparison',
  },
}

export default function AlignersComparisonPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Ортодонтия', url: 'https://zubite.bg/orthodontics' },
    { name: 'Сравнение на алайнери', url: 'https://zubite.bg/aligners-comparison' }
  ])
  
  const faqSchema = generateFAQSchema(ALIGNERS_FAQS)
  
  const alignersPrice = TREATMENT_PRICES['orthodontics-aligners']
  const bracesPrice = TREATMENT_PRICES['orthodontics-braces']
  
  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      <Header />
      
      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link 
            href="/orthodontics"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-all duration-200 hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Обратно към Ортодонтия</span>
          </Link>
          
          <div className="text-center mb-10">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight mb-6">
              Invisalign vs Spark vs Angel Aligner: сравнение на алайнери
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Обективно сравнение на популярните марки прозрачни алайнери в България. Цени, характеристики и какво да очаквате.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/orthodontics/quiz"
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="start-quiz"
            >
              Направете оценка
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How Aligners Work */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-6">
            Как работят алайнерите
          </h2>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed mb-4">
              Прозрачните алайнери са серия от индивидуално изработени прозрачни пластини, които постепенно преместват зъбите в желаната позиция. Всеки алайнер се носи около 1-2 седмици, след което се сменя със следващия от серията.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Лечението се планира дигитално — ортодонтът създава 3D симулация на движението на зъбите и крайния резултат. Алайнерите се изработват по този план и се носят 20-22 часа дневно, като се свалят само при хранене и хигиена.
            </p>
          </div>
        </div>
      </section>

      {/* Aligners vs Braces */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Алайнери vs Брекети
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aligners Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  {ALIGNERS_VS_BRACES.aligners.title}
                </h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-emerald-600 mb-2">Предимства:</p>
                <ul className="space-y-2">
                  {ALIGNERS_VS_BRACES.aligners.pros.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="text-sm font-medium text-red-600 mb-2">Недостатъци:</p>
                <ul className="space-y-2">
                  {ALIGNERS_VS_BRACES.aligners.cons.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">Цена:</p>
                <p className="font-semibold text-slate-900">
                  €{alignersPrice.minEUR.toLocaleString('bg-BG')} – €{alignersPrice.maxEUR.toLocaleString('bg-BG')}
                </p>
                <p className="text-xs text-slate-400">
                  (≈ {alignersPrice.minBGN.toLocaleString('bg-BG')} – {alignersPrice.maxBGN.toLocaleString('bg-BG')} лв.)
                </p>
              </div>
            </div>
            
            {/* Braces Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Smile className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  {ALIGNERS_VS_BRACES.braces.title}
                </h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-emerald-600 mb-2">Предимства:</p>
                <ul className="space-y-2">
                  {ALIGNERS_VS_BRACES.braces.pros.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="text-sm font-medium text-red-600 mb-2">Недостатъци:</p>
                <ul className="space-y-2">
                  {ALIGNERS_VS_BRACES.braces.cons.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">Цена:</p>
                <p className="font-semibold text-slate-900">
                  €{bracesPrice.minEUR.toLocaleString('bg-BG')} – €{bracesPrice.maxEUR.toLocaleString('bg-BG')}
                </p>
                <p className="text-xs text-slate-400">
                  (≈ {bracesPrice.minBGN.toLocaleString('bg-BG')} – {bracesPrice.maxBGN.toLocaleString('bg-BG')} лв.)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Comparison */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4 text-center">
            Сравнение на основните марки алайнери
          </h2>
          <p className="text-slate-500 text-center mb-8 max-w-2xl mx-auto">
            Invisalign, Spark и Angel Aligner са популярни системи в България. Ето обективно сравнение по ключови критерии.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ALIGNER_BRANDS.map((brand) => (
              <div key={brand.slug} className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <h3 className="font-serif text-xl font-semibold text-slate-900 mb-4 text-center">
                  {brand.name}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Подходящи случаи</p>
                    <p className="text-sm text-slate-700">{brand.suitableCases}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Типичен комфорт</p>
                    <p className="text-sm text-slate-700">{brand.comfort}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Естетика</p>
                    <p className="text-sm text-slate-700">{brand.aesthetics}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Наличност в България</p>
                    <p className="text-sm text-slate-700">{brand.availability}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Ортодонтски контрол</p>
                    <p className="text-sm text-slate-700">{brand.orthodontistControl}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Цена</p>
                    <p className="font-semibold text-teal-600">{brand.priceRange}</p>
                    <p className="text-xs text-slate-400">{brand.priceBGN}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Brand Comparison Disclaimer */}
          <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-sm">{BRAND_COMPARISON_DISCLAIMER}</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-500 text-center mt-4">
            {PRICE_DISCLAIMER}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            Често задавани въпроси
          </h2>
          <FAQAccordion faqs={ALIGNERS_FAQS} />
        </div>
      </section>

      {/* Internal Links */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-xl font-semibold text-slate-900 mb-6">
            Свързани страници
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/orthodontics"
              className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors flex items-center gap-3"
            >
              <ArrowRight className="w-4 h-4 text-teal-500" />
              <span className="text-slate-700">Ортодонтия — основна страница</span>
            </Link>
            <Link
              href="/aligners-vs-braces"
              className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors flex items-center gap-3"
            >
              <ArrowRight className="w-4 h-4 text-teal-500" />
              <span className="text-slate-700">Алайнери vs Брекети — подробно</span>
            </Link>
            <Link
              href="/invisalign-price"
              className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors flex items-center gap-3"
            >
              <ArrowRight className="w-4 h-4 text-teal-500" />
              <span className="text-slate-700">Invisalign цена в България</span>
            </Link>
            <Link
              href="/crooked-teeth"
              className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors flex items-center gap-3"
            >
              <ArrowRight className="w-4 h-4 text-teal-500" />
              <span className="text-slate-700">Криви зъби — симптоми и лечение</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Не сте сигурни коя система е за вас?
            </h2>
            <p className="text-teal-100 mb-8 max-w-lg mx-auto">
              Преминете нашата кратка оценка и получете препоръка за подходящо лечение.
            </p>
            <Link 
              href="/orthodontics/quiz"
              className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-teal-600 font-medium hover:bg-teal-50"
              data-testid="cta-quiz"
            >
              Направете оценка
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <p className="text-center text-sm text-slate-400 py-4">{EDUCATIONAL_DISCLAIMER}</p>

      <Footer />
    </main>
  )
}
