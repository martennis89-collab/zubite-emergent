'use client'

/**
 * Care Pass live state badge (Phase F — June 2026).
 *
 * Fetches the lead's current unlock state from /api/leads/{id} and
 * renders one of three lines:
 *   - locked / not-eligible: nothing extra (just the base strip copy)
 *   - eligible but not unlocked: "Care Pass ще се отключи след
 *     потвърдена от клиниката онлайн или присъствена консултация."
 *   - unlocked: "Care Pass е отключен. Вече имаш достъп до партньорски
 *     предложения и отстъпки за продукти за орална хигиена."
 *
 * Refreshes on `visibilitychange` so a patient who left the tab open
 * sees the unlocked state without a manual page reload after the
 * clinic confirms.
 */

import { useEffect, useState, useCallback } from 'react'
import { Lock, Sparkles } from 'lucide-react'

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

  if (lead.care_pass_eligible) {
    return (
      <div
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/10 ring-1 ring-amber-400/30 text-amber-200 text-[11px] font-medium px-3 py-1"
        data-testid="care-pass-eligible-locked"
      >
        <Lock className="w-3.5 h-3.5" />
        Care Pass ще се отключи след потвърдена от клиниката онлайн или
        присъствена консултация.
      </div>
    )
  }

  // care_pass_eligible=false → base strip already explains the rules.
  return null
}
