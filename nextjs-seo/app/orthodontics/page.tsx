import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, MapPin, Clock, Shield } from 'lucide-react'

const treatment = TREATMENTS.orthodontics

export const metadata: Metadata = {
  title: `${treatment.fullName} | Брекети и Алайнери | Zubite.bg`,
  description: `${treatment.description}. Научете за ортодонтско лечение в България - цени, методи, продължителност. Invisalign, метални и керамични брекети.`,
  alternates: {
    canonical: 'https://zubite.bg/orthodontics',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/orthodontics',
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
  'Подредени зъби и красива усмивка',
  'Подобрена захапка и функция',
  'По-лесна орална хигиена',
  'Дискретни опции с невидими алайнери',
  'Дългосрочни резултати с ретейнери'
]

const METHODS = [
  { name: 'Invisalign / Прозрачни алайнери', desc: 'Невидими, свалящи се, комфортни', price: '4,000 - 8,000 лв' },
  { name: 'Керамични брекети', desc: 'Дискретни, фиксирани, ефективни', price: '3,000 - 5,000 лв' },
  { name: 'Метални брекети', desc: 'Класически, надеждни, достъпни', price: '2,000 - 3,500 лв' },
  { name: 'Лингвални брекети', desc: 'Поставени отвътре, напълно невидими', price: '5,000 - 10,000 лв' }
]

export default function OrthodonticsPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Ортодонтия', url: 'https://zubite.bg/orthodontics' }
  ])

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Header />
      
      {/* Hero */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-white">Начало</Link>
            <span className="mx-2">/</span>
            <span className="text-sky-400">Ортодонтия</span>
          </nav>
          
          <div className="text-center mb-12">
            <div className="text-5xl mb-4">{treatment.icon}</div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
              {treatment.fullName}
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              {treatment.description}. Изберете най-подходящия метод за вас и намерете клиника.
            </p>
          </div>

          {/* Quick CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/sofia/orthodontics"
              className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2"
              data-testid="cta-sofia"
            >
              <MapPin className="w-5 h-5" />
              Клиники в София
            </Link>
            <Link
              href="/orthodontics#methods"
              className="btn-secondary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              Методи и цени
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Защо ортодонтско лечение?
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

      {/* Methods & Pricing */}
      <section id="methods" className="section-padding bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Методи и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {METHODS.map((method, index) => (
              <div key={index} className="glass rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-white text-lg">{method.name}</h3>
                  <p className="text-slate-400">{method.desc}</p>
                </div>
                <div className="text-sky-400 font-medium whitespace-nowrap">
                  {method.price}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 text-center mt-6">
            * Цените са ориентировъчни и варират според клиниката и сложността на случая
          </p>
        </div>
      </section>

      {/* City Links */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Намерете клиника по град
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(CITIES).map((city) => (
              <Link
                key={city.slug}
                href={`/${city.slug}/orthodontics`}
                className="card-hover glass rounded-2xl p-6 text-center group"
                data-testid={`city-${city.slug}`}
              >
                <MapPin className="w-8 h-8 text-sky-400 mx-auto mb-3" />
                <h3 className="font-medium text-white">{city.name}</h3>
                <p className="text-sm text-slate-400 mt-1">Ортодонтия в {city.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-padding bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Как протича лечението
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Консултация', desc: 'Преглед и 3D сканиране' },
              { step: '2', title: 'План', desc: 'Избор на метод и цена' },
              { step: '3', title: 'Лечение', desc: '6-24 месеца активна фаза' },
              { step: '4', title: 'Ретенция', desc: 'Фиксиране на резултата' }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-medium text-white">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Clock className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">12-24</div>
              <div className="text-sm text-slate-400">месеца лечение</div>
            </div>
            <div>
              <Shield className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">95%+</div>
              <div className="text-sm text-slate-400">успеваемост</div>
            </div>
            <div>
              <CheckCircle className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">3+</div>
              <div className="text-sm text-slate-400">града в България</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
