import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MapPin, ArrowRight, Shield, Clock, Users, ChevronRight, Star, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dental Solutions in Bulgaria | Invisalign, Implants & Aesthetic Dentistry | Zubite.bg',
  description: 'Find the best solution for your teeth. Learn if you need aligners, braces, implants or aesthetic dentistry and connect with verified clinics.',
  alternates: {
    canonical: 'https://zubite.bg/en',
    languages: {
      'bg-BG': 'https://zubite.bg',
      'en-US': 'https://zubite.bg/en',
    },
  },
}

const CITIES = [
  { slug: 'sofia', name: 'Sofia' },
  { slug: 'plovdiv', name: 'Plovdiv' },
  { slug: 'varna', name: 'Varna' }
]

const TREATMENTS = [
  { 
    slug: 'orthodontics', 
    name: 'Orthodontic Treatment', 
    description: 'Aligners and braces',
    icon: '🦷'
  },
  { 
    slug: 'implants', 
    name: 'Dental Implants', 
    description: 'Permanent solution for missing teeth',
    icon: '🔧'
  },
  { 
    slug: 'full-mouth', 
    name: 'Full Mouth Restoration', 
    description: 'Comprehensive restoration',
    icon: '✨'
  },
  { 
    slug: 'bonding', 
    name: 'Smile Aesthetics', 
    description: 'Bonding, shape, length',
    icon: '💎'
  }
]

export default function EnglishHomePage() {
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header lang="en" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sky-400 font-medium text-sm tracking-wider uppercase mb-4 animate-fade-in">
            Navigator for Dental Solutions
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight mb-6 animate-fade-in-up">
            Find the Perfect<br />
            <span className="gradient-text">Dental Solution</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 animate-fade-in-up animate-delay-100">
            Choose your city and discover the best clinics for orthodontics, implants and aesthetic dentistry
          </p>

          {/* City Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-16">
            {CITIES.map((city, index) => (
              <Link
                key={city.slug}
                href={`/en/city/${city.slug}`}
                className="card-hover group glass rounded-2xl p-6 text-center animate-fade-in-up"
                style={{ animationDelay: `${(index + 2) * 100}ms` }}
                data-testid={`city-${city.slug}`}
              >
                <div className="w-14 h-14 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="font-medium text-white text-lg">{city.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Select</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Clock, title: '60-90 seconds', desc: 'Quick assessment' },
              { icon: Shield, title: 'Data Protection', desc: 'GDPR compliant' },
              { icon: Users, title: 'Partner Clinics', desc: 'Verified specialists' }
            ].map((item, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-500/10 mb-4">
                  <item.icon className="w-6 h-6 text-sky-400" />
                </div>
                <h4 className="font-medium text-white mb-1">{item.title}</h4>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Identification Section */}
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
              What problem are you facing?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Choose the category that best describes your situation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TREATMENTS.map((treatment, index) => (
              <Link
                key={treatment.slug}
                href={`/en/city/sofia/${treatment.slug}`}
                className="card-hover group glass rounded-2xl p-6 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`treatment-${treatment.slug}`}
              >
                <div className="text-4xl mb-4">{treatment.icon}</div>
                <h3 className="font-medium text-white text-lg mb-2">{treatment.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{treatment.description}</p>
                <div className="flex items-center text-sky-400 text-sm font-medium group-hover:text-sky-300 transition-colors">
                  <span>Learn more</span>
                  <ChevronRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
              How it works
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Three simple steps to your dental solution
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '1', t: 'Choose a city', d: 'Select your city from the list of available locations' },
              { n: '2', t: 'Choose treatment', d: 'Determine the type of dental treatment you need' },
              { n: '3', t: 'Take assessment', d: 'Answer a short questionnaire and get a personalized recommendation' }
            ].map((step, index) => (
              <div key={step.n} className="text-center animate-fade-in-up" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-sky-500 to-sky-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6 glow">
                  {step.n}
                </div>
                <h3 className="font-medium text-white text-lg mb-3">{step.t}</h3>
                <p className="text-slate-400">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
              Trusted by thousands of patients
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Maria I.', city: 'Sofia', text: 'Thanks to Zubite, I found the perfect clinic for my orthodontic treatment.' },
              { name: 'George P.', city: 'Plovdiv', text: 'Quickly and easily found a specialist for dental implants. Highly recommend!' },
              { name: 'Elena D.', city: 'Varna', text: 'Professional service and excellent results. I am very satisfied!' }
            ].map((testimonial, index) => (
              <div key={index} className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-4">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-medium">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium">{testimonial.name}</p>
                    <p className="text-sm text-slate-400">{testimonial.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass rounded-3xl p-12 glow">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Choose your city and take the first step towards the perfect smile
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/en/city/sofia"
                className="btn-primary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2"
                data-testid="cta-sofia"
              >
                <MapPin className="w-5 h-5" />
                Start in Sofia
              </Link>
              <Link
                href="/en/ortho"
                className="btn-secondary px-8 py-4 rounded-full text-white font-medium inline-flex items-center justify-center gap-2"
                data-testid="cta-ortho"
              >
                <CheckCircle className="w-5 h-5" />
                Take the orthodontic test
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer lang="en" />
    </main>
  )
}
