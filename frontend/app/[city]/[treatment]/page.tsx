import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CITIES, TREATMENTS, CITY_FAQS } from '@/lib/data'
import { 
  PRICE_DISCLAIMER, 
  ALIGNERS_COMPLEX_NOTE,
  EDUCATIONAL_DISCLAIMER,
  getTreatmentPrices,
  WHEN_TO_SEEK_SPECIALIST,
  TREATMENT_EXPLANATIONS,
  HOW_WE_SELECT_CLINICS,
  WHAT_YOU_GET
} from '@/lib/pricing'
import { generateBreadcrumbSchema, generateFAQSchema, generateLocalBusinessSchema } from '@/lib/schema'
import { MapPin, ArrowRight, ArrowLeft, Award, CheckCircle, AlertCircle, ClipboardCheck, Gift } from 'lucide-react'
import { FAQAccordion } from '@/components/FAQAccordion'

interface PageProps {
  params: Promise<{ city: string; treatment: string }>
}

export async function generateStaticParams() {
  const params = []
  for (const city of Object.keys(CITIES)) {
    for (const treatment of Object.keys(TREATMENTS)) {
      params.push({ city, treatment })
    }
  }
  return params
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, treatment } = await params
  const cityData = CITIES[city as keyof typeof CITIES]
  const treatmentData = TREATMENTS[treatment as keyof typeof TREATMENTS]
  
  if (!cityData || !treatmentData) {
    return { title: 'Not Found' }
  }
  
  const title = `${treatmentData.name} в ${cityData.name} | Цени и Оценка | Zubite.bg`
  const description = `${treatmentData.name} в ${cityData.name}: ориентировъчни цени (EUR), кога да потърсите специалист и безплатна оценка. ${EDUCATIONAL_DISCLAIMER}`
  
  return {
    title,
    description,
    alternates: {
      canonical: `https://zubite.bg/${city}/${treatment}`,
    },
    openGraph: {
      title,
      description,
      url: `https://zubite.bg/${city}/${treatment}`,
      images: [{ url: treatmentData.ogImage, width: 1200, height: 630 }],
    },
  }
}

export default async function CityTreatmentPage({ params }: PageProps) {
  const { city, treatment } = await params
  const cityData = CITIES[city as keyof typeof CITIES]
  const treatmentData = TREATMENTS[treatment as keyof typeof TREATMENTS]
  
  if (!cityData || !treatmentData) {
    notFound()
  }
  
  const faqs = CITY_FAQS[city]?.[treatment] || []
  const prices = getTreatmentPrices(treatment)
  const whenToSeek = WHEN_TO_SEEK_SPECIALIST[treatment] || []
  const explanation = TREATMENT_EXPLANATIONS[treatment]
  
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: treatmentData.name, url: `https://zubite.bg/${treatment}` },
    { name: cityData.name, url: `https://zubite.bg/${city}/${treatment}` }
  ])
  
  const faqSchema = faqs.length > 0 ? generateFAQSchema(faqs) : null
  const localBusinessSchema = generateLocalBusinessSchema(city, cityData.name, treatment, treatmentData.name)
  
  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      
      <Header />
      
      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link 
            href={`/${treatment}`}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-all duration-200 hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Обратно към {treatmentData.name}</span>
          </Link>
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-teal-500 mb-4">
              <MapPin className="w-5 h-5" />
              <span className="font-medium">{cityData.name}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight mb-6">
              {treatmentData.name} в {cityData.name}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Ориентировъчни цени, кога да потърсите специалист и безплатна оценка за {treatmentData.name.toLowerCase()} в {cityData.name}.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${treatment}/quiz`}
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="start-quiz"
            >
              Направете оценка
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Explanation Section */}
      {explanation && (
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-6">
              {treatmentData.name} — Какво трябва да знаете
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-slate-600 mb-4">{explanation.intro}</p>
              {explanation.paragraphs.map((para, idx) => (
                <p key={idx} className="text-slate-600 leading-relaxed mb-4">{para}</p>
              ))}
            </div>
            <p className="text-sm text-slate-400 mt-6 italic">{EDUCATIONAL_DISCLAIMER}</p>
          </div>
        </section>
      )}

      {/* When to Seek Specialist */}
      {whenToSeek.length > 0 && (
        <section className="py-12 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-6">
              Кога да потърсите специалист
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {whenToSeek.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section - EUR primary, BGN secondary */}
      {prices.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
              Ориентировъчни цени
            </h2>
            <div className="space-y-4">
              {prices.map((price, idx) => (
                <div key={idx} className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-teal-100 text-sm mb-1">{price.note}</p>
                      <div className="text-2xl md:text-3xl font-bold">
                        €{price.minEUR.toLocaleString('bg-BG')} – €{price.maxEUR.toLocaleString('bg-BG')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {treatment === 'orthodontics' && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-sm">{ALIGNERS_COMPLEX_NOTE}</p>
                </div>
              </div>
            )}
            
            <p className="text-sm text-slate-500 text-center mt-6">
              {PRICE_DISCLAIMER}
            </p>
          </div>
        </section>
      )}

      {/* How We Select Clinics - replaces fake clinic list */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* How we select */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  {HOW_WE_SELECT_CLINICS.title}
                </h3>
              </div>
              <p className="text-slate-600 text-sm mb-4">
                {HOW_WE_SELECT_CLINICS.description}
              </p>
              <ul className="space-y-2">
                {HOW_WE_SELECT_CLINICS.criteria.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* What you get */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  {WHAT_YOU_GET.title}
                </h3>
              </div>
              <ul className="space-y-2">
                {WHAT_YOU_GET.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
              Често задавани въпроси
            </h2>
            <FAQAccordion faqs={faqs} />
          </div>
        </section>
      )}

      {/* Internal Links */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-xl font-semibold text-slate-900 mb-6">
            Свързани страници
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href={`/${treatment}`}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors flex items-center gap-3"
            >
              <ArrowRight className="w-4 h-4 text-teal-500" />
              <span className="text-slate-700">{treatmentData.name} — основна страница</span>
            </Link>
            {treatment === 'orthodontics' && (
              <>
                <Link
                  href="/aligners-comparison"
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors flex items-center gap-3"
                >
                  <ArrowRight className="w-4 h-4 text-teal-500" />
                  <span className="text-slate-700">Сравнение на марки алайнери</span>
                </Link>
                <Link
                  href="/aligners-vs-braces"
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors flex items-center gap-3"
                >
                  <ArrowRight className="w-4 h-4 text-teal-500" />
                  <span className="text-slate-700">Алайнери vs Брекети — сравнение</span>
                </Link>
                <Link
                  href="/crooked-teeth"
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors flex items-center gap-3"
                >
                  <ArrowRight className="w-4 h-4 text-teal-500" />
                  <span className="text-slate-700">Криви зъби — симптоми и лечение</span>
                </Link>
              </>
            )}
            {treatment === 'implants' && (
              <Link
                href="/implant-price"
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors flex items-center gap-3"
              >
                <ArrowRight className="w-4 h-4 text-teal-500" />
                <span className="text-slate-700">Цени на зъбни импланти в България</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Other Cities */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
            {treatmentData.name} в други градове
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.values(CITIES).filter(c => c.slug !== city).map((otherCity) => (
              <Link
                key={otherCity.slug}
                href={`/${otherCity.slug}/${treatment}`}
                className="city-card group bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-2xl p-6 text-center"
              >
                <div className="city-icon w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-medium text-slate-900">{otherCity.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{treatmentData.name} в {otherCity.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Готови ли сте да започнете?
            </h2>
            <p className="text-teal-100 mb-8 max-w-lg mx-auto">
              Преминете нашата кратка оценка и получете препоръка за подходящи опции в {cityData.name}.
            </p>
            <Link 
              href={`/${treatment}/quiz`}
              className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-teal-600 font-medium hover:bg-teal-50"
              data-testid="cta-quiz"
            >
              Направете оценка
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
