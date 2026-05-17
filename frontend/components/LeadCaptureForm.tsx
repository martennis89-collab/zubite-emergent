'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ALL_CITIES } from '@/lib/data'
import { createLead } from '@/lib/api'
import { Phone, CheckCircle, Loader2, ArrowRight } from 'lucide-react'

interface LeadCaptureFormProps {
  treatmentType: string
  source?: string
  variant?: 'default' | 'compact'
  onSuccess?: () => void
}

export function LeadCaptureForm({ treatmentType, source = 'treatment_page', variant = 'default', onSuccess }: LeadCaptureFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    problem: '',
    consent: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.phone) {
      setError('Телефонът е задължителен')
      return
    }
    if (!formData.consent) {
      setError('Моля, дайте съгласие за обработка на данни')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const leadData = {
        city_slug: formData.city || 'sofia',
        treatment_type: treatmentType,
        answers: {
          problem: formData.problem
        },
        name: formData.name,
        phone: formData.phone,
        consent: formData.consent,
        source: source,
        band: 'yellow'
      }
      
      await createLead(leadData)
      setSubmitted(true)
      onSuccess?.()
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div
        className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center"
        data-testid="lead-form-success"
      >
        <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="font-serif text-xl font-semibold text-emerald-900 mb-2">
          Заявката е получена
        </h3>
        <p className="text-emerald-800 text-[15px] leading-relaxed max-w-md mx-auto">
          Получихме информацията ви. За по-точна следваща стъпка можете да
          попълните кратката оценка на Zubite.
        </p>
        <Link
          href="/quiz"
          className="inline-flex items-center gap-2 mt-5 h-11 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          data-testid="lead-form-success-cta"
        >
          Попълни 60-секундната оценка
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="mt-5 text-xs text-emerald-700/80 leading-relaxed">
          Zubite не поставя диагноза и не заменя преглед при лекар.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${variant === 'compact' ? '' : 'bg-white rounded-2xl border border-slate-200 p-6'}`}>
      {variant === 'default' && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <Phone className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Заявете обаждане</h3>
            <p className="text-sm text-slate-500">Ще получите кратка следваща стъпка от Zubite</p>
          </div>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Име</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          placeholder="Вашето име"
          data-testid="lead-form-name"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Телефон *</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          placeholder="+359 888 123 456"
          required
          data-testid="lead-form-phone"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Град</label>
        <select
          value={formData.city}
          onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          data-testid="lead-form-city"
        >
          <option value="">Изберете град</option>
          {ALL_CITIES.map((city) => (
            <option key={city.slug} value={city.slug}>{city.name}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Какъв проблем имате?</label>
        <textarea
          value={formData.problem}
          onChange={e => setFormData(prev => ({ ...prev, problem: e.target.value }))}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors resize-none"
          placeholder="Опишете накратко вашата ситуация..."
          rows={3}
          data-testid="lead-form-problem"
        />
      </div>
      
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="lead-consent"
          checked={formData.consent}
          onChange={e => setFormData(prev => ({ ...prev, consent: e.target.checked }))}
          className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
          data-testid="lead-form-consent"
        />
        <label htmlFor="lead-consent" className="text-sm text-slate-600">
          Съгласен/а съм с{' '}
          <Link href="/privacy" className="text-teal-500 hover:underline">Политиката за поверителност</Link>
          {' '}и обработката на личните ми данни. *
        </label>
      </div>
      
      {error && (
        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
      )}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full px-6 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="lead-form-submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Изпращане...
          </>
        ) : (
          <>
            Заяви обаждане
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  )
}
