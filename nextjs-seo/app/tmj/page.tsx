import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, MapPin } from 'lucide-react'

const treatment = TREATMENTS.tmj

export const metadata: Metadata = {
  title: `${treatment.fullName} | Челюстни дисфункции | Zubite.bg`,
  description: `${treatment.description}. Диагностика и лечение на TMJ дисфункции - шини, терапия, облекчаване на болката.`,
  alternates: {
    canonical: 'https://zubite.bg/tmj',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/tmj',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    images: [treatment.ogImage],
  },
}

const TREATMENTS_LIST = [
  { name: 'Оклузална шина (сплинт)', desc: 'Защита и релаксация на мускулите', price: '300 - 800 лв' },
  { name: 'Нощна шина', desc: 'Предотвратяване на скърцане', price: '200 - 500 лв' },
  { name: 'Комплексна TMJ терапия', desc: 'Диагностика + лечение + проследяване', price: '500 - 1,500 лв' },
  { name: 'Ортодонтска корекция', desc: 'При проблем със захапката', price: 'По индивидуален план' }
]

export default function TMJPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'TMJ', url: 'https://zubite.bg/tmj' }
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
            <span className="text-sky-400">TMJ</span>
          </nav>
          
          <div className="text-center mb-12">
            <div className="text-5xl mb-4">{treatment.icon}</div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
              {treatment.fullName}
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              {treatment.description}. Облекчете болката и възстановете функцията на челюстта.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/sofia/tmj" className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" />
              Специалисти в София
            </Link>
            <Link href="/tmj#treatments" className="btn-secondary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Лечения и цени
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Типични симптоми на TMJ дисфункция
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Болка в челюстта или лицето', 'Щракане при отваряне на устата', 'Главоболие и болки в шията', 'Затруднено отваряне на устата', 'Болка в ушите без инфекция', 'Скърцане със зъби (бруксизъм)'].map((symptom, index) => (
              <div key={index} className="flex items-start gap-3 glass rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{symptom}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="treatments" className="section-padding bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Лечения и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {TREATMENTS_LIST.map((t, index) => (
              <div key={index} className="glass rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-white text-lg">{t.name}</h3>
                  <p className="text-slate-400">{t.desc}</p>
                </div>
                <div className="text-sky-400 font-medium whitespace-nowrap">{t.price}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 text-center mt-6">* Цените са ориентировъчни</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">Намерете специалист по град</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(CITIES).map((city) => (
              <Link key={city.slug} href={`/${city.slug}/tmj`} className="card-hover glass rounded-2xl p-6 text-center group">
                <MapPin className="w-8 h-8 text-sky-400 mx-auto mb-3" />
                <h3 className="font-medium text-white">{city.name}</h3>
                <p className="text-sm text-slate-400 mt-1">TMJ лечение в {city.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
