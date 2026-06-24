'use client'

import Link from 'next/link'
import { Compass, ArrowRight, Phone, Sparkles } from 'lucide-react'
import {
  MANUAL_RECOMMENDATION_COPY,
  MANUAL_RECOMMENDATION_CTA,
} from '@/lib/manualRecommendationCopy'

interface Props {
  message?: string
  /** Optional lead id — used to remind the team which submission to follow up on. */
  leadId?: string
  /** Optional city slug — surfaced inline so the patient sees which city had no match. */
  citySlug?: string
  testid?: string
}

/**
 * Empty state for the personalised clinic recommendation page.
 *
 * Rendered when the backend returns `clinic_count === 0` for the lead.
 * Per the Feb 2026 brief:
 *   • do not pretend there are matches
 *   • offer fallback paths: nearby/cross-city via public catalog, manual
 *     human follow-up, no Care Pass forced message
 *   • optional helper line: "Care Pass се показва само при участващи
 *     партньорски клиники."
 */
export function ClinicMatchEmptyState({
  message,
  leadId,
  citySlug,
  testid = 'match-empty-state',
}: Props) {
  return (
    <div
      className="bg-white/80 backdrop-blur-xl ring-1 ring-white/80 rounded-2xl p-8 sm:p-10 text-center max-w-2xl mx-auto shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)]"
      data-testid={testid}
    >
      <div className="mx-auto w-14 h-14 rounded-full bg-teal-50 text-teal-600 grid place-items-center mb-5">
        <Compass className="w-6 h-6" />
      </div>
      <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-3" data-testid="match-empty-title">
        В момента нямаме активна партньорска клиника {citySlug ? <>за <span className="text-teal-700">избрания град</span></> : 'за тази заявка'} в тази категория.
      </h2>
      <p className="text-slate-600 leading-relaxed max-w-md mx-auto mb-4 text-[14.5px]">
        {message || MANUAL_RECOMMENDATION_COPY.submittedBody}
      </p>

      {/* Care Pass helper — Feb 2026 wording: Care Pass is now universal
          in our partner network, so we simply remind the patient that
          it lives inside every partner clinic, without conditional
          framing. */}
      <p
        className="text-[11.5px] text-slate-500 leading-relaxed max-w-md mx-auto mb-6 bg-slate-50/80 ring-1 ring-slate-200/60 rounded-lg px-3 py-2"
        data-testid="match-empty-care-pass-helper"
      >
        Care Pass е включен в партньорската ни мрежа. Получаваш го при посещение в партньорска клиника.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium shadow-[0_10px_28px_-10px_rgba(13,148,136,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:-translate-y-0.5"
          style={{ backgroundImage: 'linear-gradient(135deg,#5eead4 0%,#2dd4bf 60%,#14b8a6 100%)' }}
          data-testid="match-empty-manual-cta"
        >
          <Sparkles className="w-4 h-4" />
          {MANUAL_RECOMMENDATION_CTA.askForHelp}
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/kliniki"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/65 backdrop-blur-xl ring-1 ring-white/80 text-slate-700 text-sm font-medium hover:bg-white transition-all shadow-[0_8px_24px_-14px_rgba(15,23,42,0.18)]"
          data-testid="match-empty-public-catalog"
        >
          <Phone className="w-4 h-4 text-teal-600" />
          Виж публичния каталог
        </Link>
      </div>

      <p className="mt-6 text-[11px] text-slate-400 max-w-md mx-auto">
        {MANUAL_RECOMMENDATION_COPY.safetyNote}
        {leadId ? ` · #${leadId.slice(0, 8)}` : ''}
      </p>
    </div>
  )
}
