'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQ {
  q: string
  a: string
}

interface FAQAccordionProps {
  faqs: FAQ[]
}

export function FAQAccordion({ faqs }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div 
          key={index} 
          className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300 hover:border-slate-300"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-5 text-left"
            data-testid={`faq-${index}`}
          >
            <span className="font-medium text-slate-900 pr-4">{faq.q}</span>
            <div className={`transition-transform duration-300 flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </div>
          </button>
          <div 
            className={`overflow-hidden transition-all duration-300 ${
              openIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-5 pb-5 text-slate-600">
              {faq.a}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
