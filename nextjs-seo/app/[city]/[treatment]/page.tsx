import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CITIES, TREATMENTS, CITY_CLINICS, CITY_FAQS, CITY_PRICING } from '@/lib/data'
import { generateBreadcrumbSchema, generateFAQSchema, generateLocalBusinessSchema } from '@/lib/schema'
import { MapPin, Star, ArrowRight, ArrowLeft, Building, Award } from 'lucide-react'
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
  
  const title = `${treatmentData.name} в ${cityData.name} | Клиники и Цени | Zubite.bg`
  const description = `Намерете най-добрите клиники за ${treatmentData.name.toLowerCase()} в ${cityData.name}. Ориентировъчни цени, FAQ и партньорски клиники.`
  
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
  
  const clinics = CITY_CLINICS[city]?.filter(c => c.specialties.includes(treatment)) || []
  const faqs = CITY_FAQS[city]?.[treatment] || []
  const pricing = CITY_PRICING[city]?.[treatment]
  
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
            <div className="inline-flex items-center gap-2 text-sky-500 mb-4">
              <MapPin className="w-5 h-5" />
              <span className="font-medium">{cityData.name}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight mb-6">
              {treatmentData.name} в {cityData.name}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Намерете най-добрите клиники за {treatmentData.name.toLowerCase()} в {cityData.name}. 
              Проверени специалисти, прозрачни цени и отзиви от пациенти.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${city}/${treatment}/quiz`}
              className="btn-primary inline-flex items-center justify-center gap-2 h-14 px-8"
              data-testid="start-quiz"
            >
              Заяви обаждане
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* City-specific intro */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-sky-50 rounded-2xl border border-sky-200 p-8">
            <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">
              {treatmentData.name} в {cityData.name} - Какво трябва да знаете
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {cityData.name} предлага множество опции за {treatmentData.name.toLowerCase()} с различни ценови категории и специализации. 
              Нашите партньорски клиники в {cityData.name} са внимателно подбрани въз основа на квалификация, опит и отзиви от пациенти.
              {cityData.slug === 'sofia' && ' Като столица, София има най-голямата концентрация на специалисти и най-новите технологии.'}
              {cityData.slug === 'plovdiv' && ' Пловдив предлага отлично съотношение цена-качество с опитни специалисти.'}
              {cityData.slug === 'varna' && ' Варна е известна с добрите условия за медицински туризъм и конкурентни цени.'}
            </p>
          </div>
        </div>
      </section>

      {/* Partner Clinics */}
      {clinics.length > 0 && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
              Партньорски клиники в {cityData.name}
            </h2>
            <div className="space-y-4">
              {clinics.map((clinic, index) => (
                <div key={index} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 card-hover-subtle">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                      <Building className="w-6 h-6 text-sky-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 text-lg">{clinic.name}</h3>
                      <p className="text-slate-500">{clinic.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span className="font-medium">{clinic.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      {pricing && (
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
              Ориентировъчни цени в {cityData.name}
            </h2>
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-8 text-center text-white">
              <div className="text-4xl font-bold mb-2">
                {pricing.min.toLocaleString()} - {pricing.max.toLocaleString()} лв
              </div>
              <p className="text-sky-100">{pricing.note}</p>
              <p className="text-sm text-sky-200/80 mt-4">
                * Цените са ориентировъчни и могат да варират според клиниката и конкретния случай
              </p>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-8 text-center">
              Често задавани въпроси за {treatmentData.name} в {cityData.name}
            </h2>
            <FAQAccordion faqs={faqs} />
          </div>
        </section>
      )}

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
                className="city-card group bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl p-6 text-center"
              >
                <div className="city-icon w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 text-sky-600" />
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
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
              Готови ли сте да започнете?
            </h2>
            <p className="text-sky-100 mb-8 max-w-lg mx-auto">
              Преминете през нашата кратка оценка и се свържете с клиника в {cityData.name}.
            </p>
            <Link 
              href={`/${city}/${treatment}/quiz`}
              className="btn-animate btn-pulse inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-white text-sky-600 font-medium hover:bg-sky-50"
              data-testid="cta-quiz"
            >
              Заяви обаждане
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
