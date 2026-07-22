'use client'

/**
 * Patient-flow analytics — Batch P6.
 *
 * Fires events through two channels in parallel, fire-and-forget:
 *
 *  1. `POST /api/analytics/events`   — first-party logger.
 *     ⚠ Backend schema (`AnalyticsEvent`, `extra="ignore"`) currently
 *     only persists the declared fields (`event_type`, `session_id`,
 *     `timestamp`, plus a few quiz-specific). Our extra payload keys
 *     (`lead_id`, `clinic_id`, `partner_tier`, …) are dropped on the
 *     server before insert. We still send them — for visibility in
 *     network/devtools and so the call shape is correct the day the
 *     backend schema is extended. Event counts + session funnels work
 *     today.
 *
 *  2. `fbq('trackCustom', eventName, payload)` — Meta Pixel.
 *     Accepts arbitrary payloads and gives us full clinic/tier
 *     attribution, *if* the visitor has granted marketing consent.
 *     MetaPixel.tsx already revokes consent by default and grants only
 *     when CookieConsent saves marketing=true; we ride that flag.
 *
 * Strict privacy rules — must never send:
 *   patient name, phone, email, free-text message, raw quiz answers,
 *   medical detail text, full clinic profile content, consent text,
 *   tokens, cookies.
 */

import type { ReactNode as _ReactNode } from 'react'

/** Union of every analytics event we emit from the patient layer. */
export type PatientAnalyticsEvent =
  | 'quiz_success_viewed'
  | 'recommended_clinics_cta_clicked'
  | 'clinic_recommendations_viewed'
  | 'clinic_profile_clicked'
  | 'clinic_profile_viewed'
  | 'request_call_modal_opened'
  | 'request_call_submitted'
  | 'request_call_failed'
  | 'assisted_choice_modal_opened'
  | 'assisted_choice_submitted'
  | 'assisted_choice_failed'
  | 'matching_choice_blocked'
  // ─── MVP unlock-mechanic events (Phase B/C, June 2026) ─────────
  | 'post_quiz_lead_capture_viewed'
  | 'post_quiz_lead_submitted'
  | 'full_result_unlocked'
  // Step 3 of the funnel — ClinicRecommendationChoice.tsx
  | 'clinic_recommendation_declined'
  | 'clinic_recommendation_accepted'
  | 'clinic_recommendation_city_submitted'
  | 'homepage_unlock_benefits_viewed'
  | 'homepage_unlock_benefits_cta_clicked'
  | 'homepage_care_pass_benefit_clicked'
  | 'homepage_free_orientation_benefit_clicked'
  // ─── Homepage rebuild (July 2026) — canonical CTA + split-path picker ─
  | 'home_cta_clicked'       // any primary quiz CTA; carries cta_location
  | 'home_quiz_start'        // quiz-chip in the symptom picker; carries quiz_start_source
  | 'home_article_route'     // article-routed chip/guide (NOT a quiz start)
  | 'home_lumi_play'         // Lumi explainer play

/** Allowed payload shape. Privacy-safe by construction — no PII. */
export interface PatientAnalyticsPayload {
  lead_id?: string | null
  clinic_id?: string | null
  partner_tier?: 'standard' | 'featured' | 'premium' | string | null
  placement_label?: string | null
  source?: string | null
  rank_position?: number | null
  treatment_type?: string | null
  city?: string | null
  band?: string | null
  segment?: string | null
  has_lead_id?: boolean | null
  lead_id_present?: boolean | null
  clinic_count?: number | null
  has_premium?: boolean | null
  has_featured?: boolean | null
  has_standard?: boolean | null
  success?: boolean | null
  error_code?: string | null
  reason?: 'already_selected_clinic' | 'already_requested_zubite_help' | string | null
  attempted_action?: 'request_call' | 'assisted_choice' | string | null
  // Homepage rebuild (July 2026) — non-PII context for the canonical CTA
  // and the split-path symptom picker.
  cta_location?: 'hero' | 'picker' | 'process' | 'stage_card' | 'final' | 'sticky' | string | null
  quiz_start_source?: string | null
}

interface FbqLike {
  (action: 'trackCustom' | 'track', name: string, params?: Record<string, unknown>): void
}

function getFbq(): FbqLike | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { fbq?: FbqLike }
  return typeof w.fbq === 'function' ? w.fbq : null
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let sid = localStorage.getItem('zubite_session_id') || ''
    if (!sid) {
      sid = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
      localStorage.setItem('zubite_session_id', sid)
    }
    return sid
  } catch {
    return ''
  }
}

/** Drop null/undefined keys so we never send sparse PII placeholders. */
function compact(payload: PatientAnalyticsPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v === null || v === undefined || v === '') continue
    out[k] = v
  }
  return out
}

export function trackPatientEvent(
  event: PatientAnalyticsEvent,
  payload: PatientAnalyticsPayload = {},
): void {
  // Build payload once — both channels see the same data.
  const clean = compact(payload)

  // Channel 1: Meta Pixel (consent-aware; fbq is loaded with `revoke` and
  // only `grant`-ed by CookieConsent when user accepts marketing cookies).
  try {
    getFbq()?.('trackCustom', event, clean)
  } catch {
    // ignore
  }

  // Channel 2: First-party logger — fire-and-forget so it never blocks UI.
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
    if (!API_URL || typeof window === 'undefined') return
    fetch(`${API_URL}/api/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: event,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        ...clean,
      }),
      keepalive: true,
    }).catch(() => { /* never throw */ })
  } catch {
    // ignore
  }
}
