import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CITIES, TREATMENTS } from '@/lib/data'
import { ArrowLeft, CheckCircle, ArrowRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ citySlug: string; treatmentType: string }>
}

export async function generateStaticParams() {
  const params = []
  for (const citySlug of Object.keys(CITIES)) {
    for (const treatmentType of Object.keys(TREATMENTS)) {
      params.push({ citySlug, treatmentType })
    }
  }
  return params
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { citySlug, treatmentType } = await params
  const city = CITIES[citySlug as keyof typeof CITIES]
  const treatment = TREATMENTS[treatmentType as keyof typeof TREATMENTS]
  if (!city || !treatment) return { title: 'Not Found' }
  
  return {
    title: `${treatment.name} в ${city.name} | Zubite.bg`,
    description: `${treatment.description}. Научете повече за ${treatment.name.toLowerCase()} и направете безплатна оценка.`,
    openGraph: {
      title: `${treatment.name} в ${city.name} | Zubite.bg`,
      description: `${treatment.description}`,
    },
  }
}

const TREATMENT_INFO: Record<string, { benefits: string[]; process: string[]; pricing: string }> = {
  implants: {
    benefits: [
      'Постоянно решение - траят цял живот при правилна грижа',
      'Запазват костната структура на челюстта',
      'Изглеждат и функционират като естествени зъби',
      'Не изискват подготовка на съседни зъби'
    ],
    process: [
      'Консултация и план за лечение',
      'Поставяне на импланта',
      'Период на заздравяване (3-6 месеца)',
      'Поставяне на коронката'
    ],
    pricing: 'Цените варират от 800 до 2500 лв за единичен имплант, в зависимост от марката и сложността на случая.'
  },
  'full-mouth': {
    benefits: [
      'Пълно възстановяване на функцията за дъвчене',
      'Драматично подобрение на естетиката',
      'Повишено самочувствие',
      'Дългосрочна инвестиция в здравето'
    ],
    process: [
      'Пълна диагностика и план',
      'Подготвителни процедури (ако е необходимо)',
      'Етапно изпълнение на плана',
      'Финални корекции и поддръжка'
    ],
    pricing: 'Комплексните планове за пълна възстановителна терапия започват от 5000 лв и могат да достигнат 30000+ лв в зависимост от необходимите процедури.'
  },
  bonding: {
    benefits: [
      'Минимално инвазивна процедура',
      'Бързи резултати - обикновено в едно посещение',
      'По-достъпно от порцелановите фасети',
      'Лесно поправимо при нужда'
    ],
    process: [
      'Избор на цвят и форма',
      'Подготовка на зъбната повърхност',
      'Нанасяне и оформяне на композита',
      'Финално полиране'
    ],
    pricing: 'Бондингът на един зъб струва между 150 и 400 лв. За пълно преобразяване на усмивката цените започват от 1500 лв.'
  },
  orthodontics: {
    benefits: [
      'Подредени зъби и красива усмивка',
      'Подобрена захапка и функция',
      'По-лесно поддържане на оралната хигиена',
      'Дискретни опции с невидими алайнери'
    ],
    process: [
      'Диагностика и 3D сканиране',
      'Избор на метод - алайнери или брекети',
      'Активно лечение (12-24 месеца)',
      'Ретенционна фаза'
    ],
    pricing: 'Ортодонтското лечение с алайнери струва между 4000 и 8000 лв. Металните брекети започват от 2500 лв.'
  }
}

export default async function TreatmentDetailPage({ params }: PageProps) {
  const { citySlug, treatmentType } = await params
  const city = CITIES[citySlug as keyof typeof CITIES]
  const treatment = TREATMENTS[treatmentType as keyof typeof TREATMENTS]
  
  if (!city || !treatment) {
    notFound()
  }
  
  const info = TREATMENT_INFO[treatmentType] || TREATMENT_INFO.implants
  
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href={`/city/${citySlug}`}
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors mb-8"
            data-testid="back-link"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад към избор на лечение</span>
          </Link>
          
          <div className="mb-12">
            <p className="text-sky-400 font-medium text-sm tracking-wider uppercase mb-4">
              {city.name} • {treatment.name}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
              {treatment.name}
            </h1>
            <p className="text-xl text-slate-400">
              {treatment.description}
            </p>
          </div>
          
          {/* Benefits */}
          <div className="glass rounded-2xl p-8 mb-8">
            <h2 className="font-serif text-2xl font-semibold text-white mb-6">Предимства</h2>
            <ul className="space-y-4">
              {info.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Process */}
          <div className="glass rounded-2xl p-8 mb-8">
            <h2 className="font-serif text-2xl font-semibold text-white mb-6">Процес на лечение</h2>
            <div className="space-y-4">
              {info.process.map((step, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-slate-300">{step}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Pricing */}
          <div className="glass rounded-2xl p-8 mb-12">
            <h2 className="font-serif text-2xl font-semibold text-white mb-4">Прозрачност на цените</h2>
            <p className="text-slate-300">{info.pricing}</p>
            <p className="text-sm text-slate-500 mt-4">
              * Цените са ориентировъчни и могат да варират според клиниката и конкретния случай.
            </p>
          </div>
          
          {/* CTA */}
          <div className="text-center">
            <Link
              href={`/city/${citySlug}/${treatmentType}/quiz`}
              className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center gap-2"
              data-testid="start-quiz-btn"
            >
              Започни оценката
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
