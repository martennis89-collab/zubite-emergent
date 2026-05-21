'use client'

import Link from 'next/link'
import { Compass, ArrowRight } from 'lucide-react'
import {
  MANUAL_RECOMMENDATION_COPY,
  MANUAL_RECOMMENDATION_CTA,
} from '@/lib/manualRecommendationCopy'

interface Props {
  message?: string
  /** Optional lead id — used to remind the team which submission to follow up on. */
  leadId?: string
  testid?: string
}

/**
 * Manual Clinic Recommendation Mode empty state.
 *
 * Rendered when the backend returns `clinic_count === 0` for the lead.
 * Frames the manual follow-up as a higher-care, human-guided step (NOT as
 * "we are not ready yet"). Because the lead was already created when the
 * patient submitted the quiz, the Zubite team has full context — we just
 * need to direct the patient calmly back home and reassure them that
 * follow-up is in progress.
 */
export function ClinicMatchEmptyState({ message, leadId, testid = 'match-empty-state' }: Props) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center max-w-2xl mx-auto"
      data-testid={testid}
    >
      <div className="mx-auto w-14 h-14 rounded-full bg-teal-50 text-teal-600 grid place-items-center mb-5">
        <Compass className="w-6 h-6" />
      </div>
      <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-3">
        {MANUAL_RECOMMENDATION_COPY.submittedTitle}
      </h2>
      <p className="text-slate-600 leading-relaxed max-w-md mx-auto mb-3">
        {message || MANUAL_RECOMMENDATION_COPY.submittedBody}
      </p>
      <p
        className="text-[13px] text-slate-500 leading-relaxed max-w-md mx-auto mb-6"
        data-testid="match-empty-explainer"
      >
        {MANUAL_RECOMMENDATION_COPY.manualMatchingExplainer}
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium shadow-[0_10px_28px_-10px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:-translate-y-0.5"
        style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
        data-testid="match-empty-back-home"
      >
        {MANUAL_RECOMMENDATION_CTA.askForHelp}
        <ArrowRight className="w-4 h-4" />
      </Link>
      <p className="mt-5 text-[11px] text-slate-400 max-w-md mx-auto">
        {MANUAL_RECOMMENDATION_COPY.safetyNote}
        {leadId ? ` · #${leadId.slice(0, 8)}` : ''}
      </p>
    </div>
  )
}
