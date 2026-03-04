'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Loader2, ArrowLeft, User, Mail, Phone, MapPin, FileText, Calendar } from 'lucide-react'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  city_slug: string
  treatment_type: string
  band: string
  score_total: number
  answers: Record<string, string>
  created_at: string
  source: string
}

interface PageProps {
  params: Promise<{ leadId: string }>
}

export default function AdminLeadDetailPage({ params }: PageProps) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    
    params.then(async ({ leadId }) => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
        const response = await fetch(`${API_URL}/admin/leads/${leadId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        
        const data = await response.json()
        setLead(data)
      } catch {
        router.push('/admin/leads')
      } finally {
        setLoading(false)
      }
    })
  }, [params, router])
  
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </main>
    )
  }
  
  if (!lead) {
    return null
  }
  
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href="/admin/leads"
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Всички лийдове</span>
          </Link>
          
          <h1 className="font-serif text-3xl font-semibold text-white mb-8">
            Детайли за лийд
          </h1>
          
          {/* Contact Info */}
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="font-medium text-white mb-4">Контактна информация</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">{lead.name || 'Не е предоставено'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">{lead.email || 'Не е предоставено'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">{lead.phone || 'Не е предоставено'}</span>
              </div>
            </div>
          </div>
          
          {/* Lead Info */}
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="font-medium text-white mb-4">Информация за заявката</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300 capitalize">{lead.city_slug}</span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">{lead.treatment_type}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">
                  {new Date(lead.created_at).toLocaleString('bg-BG')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Answers */}
          {lead.answers && Object.keys(lead.answers).length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="font-medium text-white mb-4">Отговори от въпросника</h2>
              <div className="space-y-3">
                {Object.entries(lead.answers).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-slate-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
