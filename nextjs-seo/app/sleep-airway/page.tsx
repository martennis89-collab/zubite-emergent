import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { TREATMENTS, CITIES } from '@/lib/data'
import { generateBreadcrumbSchema } from '@/lib/schema'
import { CheckCircle, ArrowRight, MapPin, Moon } from 'lucide-react'

const treatment = TREATMENTS['sleep-airway']

export const metadata: Metadata = {
  title: `${treatment.fullName} | Дентални решения | Zubite.bg`,
  description: `${treatment.description}. Орални апарати за сънна апнея и хъркане. Алтернатива на CPAP.`,
  alternates: {
    canonical: 'https://zubite.bg/sleep-airway',
  },
  openGraph: {
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    url: 'https://zubite.bg/sleep-airway',
    images: [{ url: treatment.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${treatment.fullName} | Zubite.bg`,
    description: treatment.description,
    images: [treatment.ogImage],
  },
}

const SOLUTIONS = [
  { name: 'Mandibular Advancement Device (MAD)', desc: 'Най-често използван тип', price: '800 - 2,000 лв' },
  { name: 'Tongue Retaining Device', desc: 'За специфични случаи', price: '600 - 1,500 лв' },
  { name: 'Комбинирана терапия', desc: 'MAD + допълнителни мерки', price: '1,000 - 2,500 лв' }
]

export default function SleepAirwayPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Начало', url: 'https://zubite.bg' },
    { name: 'Сънна апнея', url: 'https://zubite.bg/sleep-airway' }
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
            <span className="text-sky-400">Сънна апнея</span>
          </nav>
          
          <div className="text-center mb-12">
            <div className="text-5xl mb-4">{treatment.icon}</div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
              {treatment.fullName}
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              {treatment.description}. Подобрете качеството на съня с дентални решения.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/sofia/sleep-airway" className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" />
              Специалисти в София
            </Link>
            <Link href="/sleep-airway#solutions" className="btn-secondary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Решения и цени
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Симптоми, които можем да адресираме
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Хъркане', 'Прекъсвания на дишането по време на сън', 'Сънливост през деня', 'Главоболие сутрин', 'Суха уста при събуждане'].map((symptom, index) => (
              <div key={index} className="flex items-start gap-3 glass rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{symptom}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="section-padding bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-semibold text-white mb-8 text-center">
            Дентални решения и ориентировъчни цени
          </h2>
          <div className="space-y-4">
            {SOLUTIONS.map((solution, index) => (
              <div key={index} className="glass rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-white text-lg">{solution.name}</h3>
                  <p className="text-slate-400">{solution.desc}</p>
                </div>
                <div className="text-sky-400 font-medium whitespace-nowrap">{solution.price}</div>
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
              <Link key={city.slug} href={`/${city.slug}/sleep-airway`} className="card-hover glass rounded-2xl p-6 text-center group">
                <Moon className="w-8 h-8 text-sky-400 mx-auto mb-3" />
                <h3 className="font-medium text-white">{city.name}</h3>
                <p className="text-sm text-slate-400 mt-1">Апнея лечение в {city.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
