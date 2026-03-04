import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArrowLeft, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ symptomSlug: string }>
}

const SYMPTOMS_DATA: Record<string, {
  title: string
  description: string
  causes: string[]
  treatments: string[]
  whenToSeek: string[]
  relatedTreatment: { slug: string; name: string }
}> = {
  toothache: {
    title: 'Зъбобол',
    description: 'Зъбоболът може да бъде симптом на различни проблеми - от кариес до инфекция на зъбния корен.',
    causes: [
      'Кариес (зъбен разпад)',
      'Пулпит (възпаление на зъбния нерв)',
      'Абсцес (инфекция)',
      'Напукан или счупен зъб',
      'Проблеми с венците'
    ],
    treatments: [
      'Пломбиране при кариес',
      'Лечение на коренови канали',
      'Екстракция при необходимост',
      'Антибиотици при инфекция'
    ],
    whenToSeek: [
      'Болката продължава повече от 1-2 дни',
      'Има подуване на лицето или венците',
      'Имате температура',
      'Болката е много силна и не се повлиява от обезболяващи'
    ],
    relatedTreatment: { slug: 'implants', name: 'Зъбни импланти' }
  },
  sensitivity: {
    title: 'Чувствителност на зъбите',
    description: 'Чувствителността се проявява като краткотрайна болка при контакт с топло, студено или сладко.',
    causes: [
      'Износен емайл',
      'Оголени зъбни корени',
      'Скорошна дентална процедура',
      'Пукнатина в зъба',
      'Кариес'
    ],
    treatments: [
      'Специални пасти за чувствителни зъби',
      'Флуоридно лечение',
      'Пломбиране',
      'Присаждане на венци при оголени корени'
    ],
    whenToSeek: [
      'Чувствителността е постоянна',
      'Засяга конкретен зъб',
      'Придружена е от болка или подуване'
    ],
    relatedTreatment: { slug: 'bonding', name: 'Естетика на усмивката' }
  },
  'bleeding-gums': {
    title: 'Кървене на венците',
    description: 'Кървенето на венците често е признак на възпаление, причинено от натрупване на плака.',
    causes: [
      'Гингивит (възпаление на венците)',
      'Пародонтит (заболяване на венците)',
      'Неправилна техника на четкане',
      'Хормонални промени',
      'Някои медикаменти'
    ],
    treatments: [
      'Професионално почистване на зъбен камък',
      'Подобрена орална хигиена',
      'Лечение на пародонтит',
      'Антибактериални изплаквания'
    ],
    whenToSeek: [
      'Кървенето е редовно',
      'Венците са подути или болезнени',
      'Има лош дъх',
      'Зъбите изглеждат по-дълги'
    ],
    relatedTreatment: { slug: 'full-mouth', name: 'Пълна възстановителна терапия' }
  },
  aesthetic: {
    title: 'Естетични проблеми',
    description: 'Естетичните проблеми включват петна, пожълтяване, криви или неравни зъби.',
    causes: [
      'Петна от кафе, чай, вино',
      'Пушене',
      'Естествено остаряване на емайла',
      'Генетични фактори',
      'Травма'
    ],
    treatments: [
      'Професионално избелване',
      'Порцеланови фасети',
      'Бондинг',
      'Ортодонтско лечение',
      'Зъбни корони'
    ],
    whenToSeek: [
      'Желаете да подобрите усмивката си',
      'Имате видими счупвания или пукнатини',
      'Зъбите са неравни и затрудняват дъвченето'
    ],
    relatedTreatment: { slug: 'orthodontics', name: 'Ортодонтско лечение' }
  }
}

export async function generateStaticParams() {
  return Object.keys(SYMPTOMS_DATA).map((symptomSlug) => ({ symptomSlug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symptomSlug } = await params
  const symptom = SYMPTOMS_DATA[symptomSlug]
  if (!symptom) return { title: 'Not Found' }
  
  return {
    title: `${symptom.title} | Дентални симптоми | Zubite.bg`,
    description: symptom.description,
  }
}

export default async function SymptomDetailPage({ params }: PageProps) {
  const { symptomSlug } = await params
  const symptom = SYMPTOMS_DATA[symptomSlug]
  
  if (!symptom) {
    notFound()
  }
  
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href="/symptoms"
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Всички симптоми</span>
          </Link>
          
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
            {symptom.title}
          </h1>
          <p className="text-lg text-slate-400 mb-12">
            {symptom.description}
          </p>
          
          {/* Causes */}
          <div className="glass rounded-2xl p-8 mb-6">
            <h2 className="font-serif text-xl font-semibold text-white mb-4">Възможни причини</h2>
            <ul className="space-y-3">
              {symptom.causes.map((cause, index) => (
                <li key={index} className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{cause}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Treatments */}
          <div className="glass rounded-2xl p-8 mb-6">
            <h2 className="font-serif text-xl font-semibold text-white mb-4">Възможни лечения</h2>
            <ul className="space-y-3">
              {symptom.treatments.map((treatment, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{treatment}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* When to Seek Help */}
          <div className="glass rounded-2xl p-8 mb-12 border border-red-500/30">
            <h2 className="font-serif text-xl font-semibold text-white mb-4">Кога да потърсите помощ</h2>
            <ul className="space-y-3">
              {symptom.whenToSeek.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-2" />
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* CTA */}
          <div className="text-center">
            <Link
              href={`/city/sofia/${symptom.relatedTreatment.slug}`}
              className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center gap-2"
            >
              Научете повече за {symptom.relatedTreatment.name}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
