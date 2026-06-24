'use client'

/**
 * Care Pass live state badge (Phase F — June 2026; updated Feb 2026).
 *
 * Care Pass is now a standard benefit at every partner clinic — every
 * Zubite patient receives Care Pass at their partner clinic visit.
 * We therefore no longer render a "locked" UI ("ще се отключи след…");
 * the `unlocked` flag is kept on the backend purely to mark which
 * patients have already collected their Pass at a partner clinic.
 *
 *   - unlocked: green badge — "Care Pass е отключен. Вече имаш достъп…"
 *   - everything else: positive reassurance — "Care Pass те очаква
 *     при посещението ти в партньорска клиника."
 *
 * Refreshes on `visibilitychange` so a patient who left the tab open
 * sees the unlocked state without a manual page reload after the
 * clinic confirms.
 */

import { useEffect, useState, useCallback } from 'react'
import { Gift, Sparkles } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface LeadState {
  care_pass_eligible?: boolean
  care_pass_unlocked?: boolean
  contact_details_submitted?: boolean
  consultation_booked_through_zubite?: boolean
  clinic_confirmed_consultation?: boolean
}

export function CarePassLiveStatus({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<LeadState | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/leads/${leadId}`)
      if (r.ok) setLead(await r.json())
    } catch { /* silent */ }
  }, [leadId])

  useEffect(() => {
    if (!leadId) return
    load()
    const onVis = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [leadId, load])

  if (!lead) return null

  if (lead.care_pass_unlocked) {
    return (
      <div
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40 text-emerald-200 text-[11px] font-medium px-3 py-1"
        data-testid="care-pass-unlocked"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Zubite Care Pass е отключен. Вече имаш достъп до партньорски предложения
        и отстъпки за продукти за орална хигиена.
      </div>
    )
  }

  // Positive "awaiting your visit" framing — Care Pass is standard for
  // every Zubite patient at every partner clinic, so the previous
  // "locked / will unlock" UI was retired Feb 2026.
  return (
    <div
      className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-500/15 ring-1 ring-teal-400/40 text-teal-200 text-[11px] font-medium px-3 py-1"
      data-testid="care-pass-awaiting-visit"
    >
      <Gift className="w-3.5 h-3.5" />
      Zubite Care Pass те очаква при посещението ти в партньорска клиника.
    </div>
  )
}
