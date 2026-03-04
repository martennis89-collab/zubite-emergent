'use client'

import { useState, use, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { getLead } from '@/lib/api'
import { CheckCircle, Loader2, Home } from 'lucide-react'

interface ResultsPageProps {
  params: Promise<{ leadId: string }>
}

interface Lead {
  id: string
  city_slug: string
  treatment_type: string
  band: string
  score_total: number
  name?: string
  phone?: string
  email?: string
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const { leadId } = use(params)
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  useEffect(() => {
    const fetchLead = async () => {
      try {
        const data = await getLead(leadId)
        setLead(data)
      } catch {
        setError('Възникна грешка при зареждане на резултатите.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchLead()
  }, [leadId])
  
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </main>
    )
  }
  
  if (error || !lead) {
    return (
      <main className="min-h-screen bg-[#0f172a]">
        <Header />
        <section className="pt-32 pb-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p className="text-red-400">{error || 'Резултатите не бяха намерени.'}</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sky-400 hover:text-sky-300">
              <Home className="w-4 h-4" />
              Към началото
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    )
  }
  
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            
            <h1 className="font-serif text-3xl font-semibold text-white mb-4">
              Благодарим ви!
            </h1>
            
            <p className="text-slate-400 mb-8">
              Вашата заявка е получена успешно. Ще се свържем с вас в най-кратък срок, за да обсъдим вашия случай.
            </p>
            
            {lead.name && (
              <div className="bg-slate-800/50 rounded-xl p-4 mb-8 text-left">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Вашите данни:</h3>
                <p className="text-white">{lead.name}</p>
                {lead.phone && <p className="text-slate-300">{lead.phone}</p>}
                {lead.email && <p className="text-slate-300">{lead.email}</p>}
              </div>
            )}
            
            <Link
              href="/"
              className="btn-secondary px-8 py-4 rounded-full text-white font-medium inline-flex items-center gap-2"
              data-testid="home-btn"
            >
              <Home className="w-5 h-5" />
              Към началото
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
