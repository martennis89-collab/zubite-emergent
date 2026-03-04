import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CITIES, TREATMENTS } from '@/lib/data'
import { ArrowLeft, ChevronRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ citySlug: string }>
}

export async function generateStaticParams() {
  return Object.keys(CITIES).map((citySlug) => ({ citySlug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { citySlug } = await params
  const city = CITIES[citySlug as keyof typeof CITIES]
  if (!city) return { title: 'Not Found' }
  
  return {
    title: `Дентални лечения в ${city.name} | Zubite.bg`,
    description: `Изберете типа дентално лечение в ${city.name}. Ортодонтия, импланти, пълна реставрация и естетична стоматология.`,
    openGraph: {
      title: `Дентални лечения в ${city.name} | Zubite.bg`,
      description: `Изберете типа дентално лечение в ${city.name}`,
    },
  }
}

export default async function CityPage({ params }: PageProps) {
  const { citySlug } = await params
  const city = CITIES[citySlug as keyof typeof CITIES]
  
  if (!city) {
    notFound()
  }
  
  const treatments = Object.values(TREATMENTS)
  
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors mb-8"
            data-testid="back-link"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад</span>
          </Link>
          
          <div className="text-center mb-12">
            <p className="text-sky-400 font-medium text-sm tracking-wider uppercase mb-4">
              {city.name}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
              Изберете лечение
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Изберете типа дентално лечение, от което се нуждаете
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {treatments.map((treatment, index) => (
              <Link
                key={treatment.slug}
                href={treatment.slug === 'orthodontics' ? `/city/${citySlug}/ortho` : `/city/${citySlug}/${treatment.slug}`}
                className="card-hover group glass rounded-2xl p-6 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`treatment-${treatment.slug}`}
              >
                <h3 className="font-medium text-white text-xl mb-2">{treatment.name}</h3>
                <p className="text-slate-400 mb-4">{treatment.description}</p>
                <div className="flex items-center text-sky-400 text-sm font-medium group-hover:text-sky-300 transition-colors">
                  <span>Продължи</span>
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
