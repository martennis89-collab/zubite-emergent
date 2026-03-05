import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, MapPin, Sparkles } from 'lucide-react'

const treatment = TREATMENTS['cosmetic-dentistry']

export const metadata: Metadata = {
  title: `${treatment.fullName} | Фасети, Избелване | Zubite.bg`,
  description: `${treatment.description}. Избелване, порцеланови фасети, бондинг, Hollywood Smile. Трансформирайте усмивката си.`,
  alternates: {
    canonical: 'https://zubite.bg/cosmetic-dentistry',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/cosmetic-dentistry',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    images: [treatment.ogImage],
  },
}

const SERVICES = [
  { name: 'Професионално избелване', desc: 'Бързи резултати в клиника', price: '200 - 500 лв' },
  { name: 'Порцеланови фасети', desc: 'Трайна промяна на усмивката', price: '400 - 1,200 лв/зъб' },
  { name: 'Композитен бондинг', desc: 'Бърза корекция на форма', price: '150 - 400 лв/зъб' },
  { name: 'Hollywood Smile', desc: 'Пълна трансформация', price: '8,000 - 20,000 лв' }
]

export default function CosmeticDentistryPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Естетична стоматология', url: 'https://zubite.bg/cosmetic-dentistry' }
  ])

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-white">Начало</Link>
            <span className="mx-2">/</span>
            <span className="text-sky-400">Естетична стоматология</span>
          </nav>
          
          <div className="text-center mb-12">
            <div className="text-5xl mb-4">{treatment.icon}</div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
              {treatment.fullName}
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              {treatment.description}. Постигнете усмивката, за която мечтаете.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/sofia/cosmetic-dentistry" className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" />
              Клиники в София
            </Link>
            <Link href="/cosmetic-dentistry#services" className="btn-secondary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Услуги и цени
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Защо естетична стоматология?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['По-бяла и сияйна усмивка', 'Корекция на формата на зъбите', 'Затваряне на празнини', 'Подобрено самочувствие', 'Минимално инвазивни процедури'].map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 glass rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="section-padding bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Услуги и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {SERVICES.map((service, index) => (
              <div key={index} className="glass rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-white text-lg">{service.name}</h3>
                  <p className="text-slate-400">{service.desc}</p>
                </div>
                <div className="text-sky-400 font-medium whitespace-nowrap">{service.price}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 text-center mt-6">* Цените са ориентировъчни</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">Намерете клиника по град</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(CITIES).map((city) => (
              <Link key={city.slug} href={`/${city.slug}/cosmetic-dentistry`} className="card-hover glass rounded-2xl p-6 text-center group">
                <Sparkles className="w-8 h-8 text-sky-400 mx-auto mb-3" />
                <h3 className="font-medium text-white">{city.name}</h3>
                <p className="text-sm text-slate-400 mt-1">Естетика в {city.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
