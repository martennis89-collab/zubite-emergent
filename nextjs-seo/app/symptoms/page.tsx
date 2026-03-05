import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ChevronRight, AlertCircle, Thermometer, Droplets, Eye } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Дентални симптоми | Zubite.bg',
  description: 'Разпознайте денталните симптоми и научете какво може да ги причинява. Намерете правилното лечение за вашите проблеми.',
}

const SYMPTOMS = [
  {
    slug: 'toothache',
    title: 'Зъбобол',
    description: 'Постоянна или периодична болка в зъбите',
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100'
  },
  {
    slug: 'sensitivity',
    title: 'Чувствителност',
    description: 'Болка при топло, студено или сладко',
    icon: Thermometer,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100'
  },
  {
    slug: 'bleeding-gums',
    title: 'Кървене на венците',
    description: 'Кървене при четкане или самостоятелно',
    icon: Droplets,
    color: 'text-rose-500',
    bgColor: 'bg-rose-100'
  },
  {
    slug: 'aesthetic',
    title: 'Естетични проблеми',
    description: 'Петна, пожълтяване, криви зъби',
    icon: Eye,
    color: 'text-sky-500',
    bgColor: 'bg-sky-100'
  }
]

export default function SymptomsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sky-500 font-medium text-sm tracking-wide uppercase mb-4">
              Симптоми
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight mb-6">
              Дентални симптоми
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Изберете симптом, за да научите повече за възможните причини и лечения
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SYMPTOMS.map((symptom, index) => (
              <Link
                key={symptom.slug}
                href={`/symptoms/${symptom.slug}`}
                className="symptom-card group bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl p-6 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`symptom-${symptom.slug}`}
              >
                <div className={`symptom-icon w-12 h-12 rounded-full ${symptom.bgColor} flex items-center justify-center mb-4`}>
                  <symptom.icon className={`w-6 h-6 ${symptom.color}`} />
                </div>
                <h3 className="font-medium text-slate-900 text-xl mb-2">{symptom.title}</h3>
                <p className="text-slate-500 mb-4">{symptom.description}</p>
                <div className="flex items-center text-sky-500 text-sm font-medium group-hover:text-sky-600 transition-colors">
                  <span>Научи повече</span>
                  <ChevronRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
