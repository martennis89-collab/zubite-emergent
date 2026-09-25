'use client'

import Link from 'next/link'
import { Phone, MapPin, Tag, ChevronRight, Clock } from 'lucide-react'
import {
  ConsultationRequest, statusBadge, timeSince,
  TREATMENT_LABELS, readinessLabel, urgencyLabel,
} from '@/lib/consultationLabels'
import { SourceBadge } from '@/components/PatientContextSection'

/** Mobile-first card representation of a consultation request. */
export function RequestCard({ r }: { r: ConsultationRequest }) {
  const sb = statusBadge(r.status)
  return (
    <Link
      href={`/clinic/dashboard/requests/${r.id}`}
      data-testid={`request-card-${r.id}`}
      className="block bg-white border border-slate-200 rounded-2xl p-4 active:bg-slate-50 hover:border-teal-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-slate-900 truncate">{r.patient_name}</div>
          {r.patient_phone && (
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />
              {r.patient_phone}
            </div>
          )}
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${sb.cls}`}>
          {sb.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="truncate">{TREATMENT_LABELS[r.treatment_interest] || r.treatment_interest}</span>
        </div>
        {r.patient_city && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate">{r.patient_city}</span>
          </div>
        )}
      </div>

      {(r.readiness || r.urgency || r.source_badge) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          {r.readiness && (
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{readinessLabel(r.readiness)}</span>
          )}
          {r.urgency && r.urgency !== 'none' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{urgencyLabel(r.urgency)}</span>
          )}
          {r.source_badge && <SourceBadge source={r.source_badge} />}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="text-slate-500 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeSince(r.assigned_at || r.created_at)}
        </div>
        <span className="inline-flex items-center gap-0.5 text-teal-600 font-medium">
          Отвори
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  )
}
