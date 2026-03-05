import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, MapPin, Clock, Shield } from 'lucide-react'

const treatment = TREATMENTS.implants

export const metadata: Metadata = {
  title: `${treatment.fullName} | Трайно решение | Zubite.bg`,
  description: `${treatment.description}. Научете за зъбни импланти в България - цени, марки, възстановяване. Straumann, Nobel Biocare, Osstem.`,
  alternates: {
    canonical: 'https://zubite.bg/implants',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/implants',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    images: [treatment.ogImage],
  },
}

const BENEFITS = [
  'Постоянно решение - траят цял живот',
  'Изглеждат като естествени зъби',
  'Запазват костната структура',
  'Не засягат съседните зъби',
  'Възстановяват пълната функция'
]

const TYPES = [
  { name: 'Единичен имплант', desc: 'За един липсващ зъб', price: '800 - 2,500 лв' },
  { name: 'Мост на импланти', desc: 'За 3+ липсващи зъби', price: '2,500 - 6,000 лв' },
  { name: 'All-on-4', desc: 'Цяла челюст на 4 импланта', price: '8,000 - 15,000 лв' },
  { name: 'All-on-6', desc: 'Максимална стабилност', price: '10,000 - 20,000 лв' }
]

export default function ImplantsPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Зъбни импланти', url: 'https://zubite.bg/implants' }
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
            <span className="text-sky-400">Зъбни импланти</span>
          </nav>
          
          <div className="text-center mb-12">
            <div className="text-5xl mb-4">{treatment.icon}</div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
              {treatment.fullName}
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              {treatment.description}. Възстановете усмивката си с модерна имплантология.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/sofia/implants" className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" />
              Клиники в София
            </Link>
            <Link href="/implants#types" className="btn-secondary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Видове и цени
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Защо зъбни импланти?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BENEFITS.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 glass rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="types" className="section-padding bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Видове и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {TYPES.map((type, index) => (
              <div key={index} className="glass rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-white text-lg">{type.name}</h3>
                  <p className="text-slate-400">{type.desc}</p>
                </div>
                <div className="text-sky-400 font-medium whitespace-nowrap">{type.price}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 text-center mt-6">
            * Цените са ориентировъчни и варират според марката на импланта и клиниката
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Намерете клиника по град
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(CITIES).map((city) => (
              <Link key={city.slug} href={`/${city.slug}/implants`} className="card-hover glass rounded-2xl p-6 text-center group">
                <MapPin className="w-8 h-8 text-sky-400 mx-auto mb-3" />
                <h3 className="font-medium text-white">{city.name}</h3>
                <p className="text-sm text-slate-400 mt-1">Импланти в {city.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Clock className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">3-6</div>
              <div className="text-sm text-slate-400">месеца възстановяване</div>
            </div>
            <div>
              <Shield className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">95%+</div>
              <div className="text-sm text-slate-400">успеваемост</div>
            </div>
            <div>
              <CheckCircle className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">25+</div>
              <div className="text-sm text-slate-400">години гаранция</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
