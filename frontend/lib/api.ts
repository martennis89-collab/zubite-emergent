import axios from 'axios';
import { attachAttributionToLead } from './attribution';
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Lead {
  id?: string;
  city_slug: string;
  treatment_type: string;
  answers: Record<string, string | number>;
  score_total?: number;
  band?: string;
  name?: string;
  phone?: string;
  email?: string;
  consent?: boolean;
  source?: string;
}

export const createLead = async (leadData: Lead) => {
  // Attach the captured first/latest-touch attribution. The helper is safe and
  // returns an empty object if storage is blocked.
  let attribution = {} as Record<string, unknown>;
  try {
    if (typeof window !== 'undefined') attribution = attachAttributionToLead();
  } catch { /* never block lead submission */ }
  const response = await api.post('/leads', { ...leadData, ...attribution });
  return response.data;
};

export const updateLeadContact = async (leadId: string, contactData: { name: string; phone: string; email: string; consent: boolean }) => {
  const response = await api.put(`/leads/${leadId}/contact`, contactData);
  return response.data;
};

export const getLead = async (leadId: string) => {
  // NOTE: bypass the shared axios `api` baseURL, which drops the `/api`
  // prefix when NEXT_PUBLIC_API_URL is set to a full domain in preview.
  // Same pattern as getRecommendedClinics below.
  const base = process.env.NEXT_PUBLIC_API_URL || ''
  const response = await axios.get(`${base}/api/leads/${leadId}`);
  return response.data;
};

// ── Patient layer P3 ─────────────────────────────────────────
// GET /api/leads/{leadId}/recommended-clinics?limit=N
// Response is fully whitelisted server-side; see backend P2 contract.
export interface RecommendedClinic {
  id: string;
  name: string;
  city_name: string;
  city_slug: string;
  treatments: string[];
  // Canonical going forward (Feb 2026 cleanup). When present, frontend
  // consumers should prefer this over `treatments` (which is kept as a
  // legacy alias for backwards compatibility).
  treatments_supported?: string[];
  reason: string;
  response_expectation: string;
  partner_since_year: number | null;
  // Partner placement (transparent demo support).
  // Backend returns "standard" | "featured" | "premium"; labels/disclosure
  // are null for standard so the card can simply guard on truthiness.
  partner_tier?: 'standard' | 'featured' | 'premium';
  is_featured?: boolean;
  placement_label?: string | null;
  placement_disclosure?: string | null;
  // Same-city flag — backend already filters every recommended clinic to
  // the lead's city (out-of-city clinics are excluded with score=-1),
  // so this is always `true` on the recommendation page. Surfaced so the
  // card can render the "В твоя град" chip without re-deriving on client.
  same_city?: boolean;
  // Care Pass participation. Chip renders ONLY when true. Care Pass copy
  // rule: benefits unlock after a physical consultation at a participating
  // clinic. Never on every clinic, never automatically.
  care_pass_partner?: boolean;
  // External review signals (R1 — display-only, admin-gated).
  // Omitted entirely by backend when no source is publishable, so consumers
  // must `if (clinic.review_signals)` before rendering.
  review_signals?: {
    sources: Array<{
      platform: 'google' | 'facebook' | 'superdoc' | string;
      rating: number;
      review_count: number;
      url?: string | null;
    }>;
    last_checked_at: string | null;
    disclaimer: string;
  };
  // Aligner brand / provider tags (Feb 2026). Public projection only —
  // backend already strips visibility-false entries and downgrades any
  // unverified "official_provider" claim to "offered" before surfacing.
  // Omitted entirely when the clinic has no visible brand entries, so
  // consumers must guard on truthiness.
  aligner_brands_supported?: Array<{
    brand: string
    label: string
    relationship: 'offered' | 'official_provider'
    verified_official: boolean
  }>;
  // Rich Profile (R1) — admin-managed. Only present when
  // `profile_status === "published"` and only the tier-allowed slice.
  // Standard: short_description + treatment_focus.
  // Featured: + patient_intro.
  // Premium:  + hero/video/team/story/environment/process + case_library.
  clinic_profile?: {
    profile_status: 'published'
    short_description?: string | null
    patient_intro?: string | null
    treatment_focus?: string[] | null
    hero_image_url?: string | null
    clinic_video_url?: string | null
    doctor_video_url?: string | null
    doctor_spotlight_name?: string | null
    doctor_spotlight_role?: string | null
    doctor_spotlight_bio?: string | null
    team_note?: string | null
    clinic_story?: string | null
    environment_description?: string | null
    consultation_process?: string | null
    case_library?: Array<{
      id?: string
      title: string
      category: string
      summary: string
    }> | null
  };
}

export interface RecommendedClinicsResponse {
  lead_id: string;
  city_slug: string;
  treatment_type: string;
  clinic_count: number;
  fallback_used: boolean;
  assisted_help_available: boolean;
  selection_rule: {
    can_view_clinics: number;
    can_request_call_from_clinics: number;
    assisted_choice_available: boolean;
  };
  clinics: RecommendedClinic[];
  message?: string;
}

export const getRecommendedClinics = async (
  leadId: string,
  limit = 3,
): Promise<RecommendedClinicsResponse> => {
  // NOTE: Use absolute URL because the global axios `api` instance is
  // configured with NEXT_PUBLIC_API_URL as baseURL but without the `/api`
  // prefix; relying on it would hit the Next.js 404 handler in preview.
  // We construct the absolute path explicitly here to avoid that pitfall
  // without changing the global axios contract used by older helpers.
  const base = process.env.NEXT_PUBLIC_API_URL || ''
  const response = await axios.get<RecommendedClinicsResponse>(
    `${base}/api/leads/${leadId}/recommended-clinics?limit=${limit}`,
  );
  return response.data;
};

// ── Patient layer P4 ─────────────────────────────────────────
// POST /api/leads/{leadId}/request-call
// Patient selects ONE recommended clinic and consents to share their
// request. The endpoint is single-clinic-only and idempotent on retry
// of the SAME clinic; choosing a different clinic returns 409.

export interface RequestCallBody {
  clinic_id: string;
  phone: string;
  consent_to_share: boolean;
  source: 'matching_card' | 'clinic_profile';
}

export interface RequestCallSuccess {
  success: true;
  request_id: string;
  clinic: { id: string; name: string; city_name: string };
  message: string;
  already_requested?: boolean;
}

export interface SelectionState {
  lead_id: string;
  has_request: boolean;
  selected_clinic_id: string | null;
  selected_clinic_request_id: string | null;
  clinic_selection_source: 'matching_card' | 'clinic_profile' | null;
  request_call_status: 'requested' | null;
  selected_clinic_requested_at: string | null;
  clinic?: { id: string; name: string; city_name: string };
  // P5 — assisted-choice fields. `has_selected_clinic` mirrors
  // `has_request` for clarity; new UI should prefer the explicit pair.
  has_selected_clinic?: boolean;
  selected_clinic?: { id: string; name: string; city_name: string } | null;
  has_requested_zubite_help?: boolean;
  assisted_choice_request_id?: string | null;
  assisted_choice_status?: 'requested' | null;
  assisted_choice_requested_at?: string | null;
  assisted_choice_source?: 'matching_page' | 'clinic_profile' | null;
}

export const postRequestCall = async (
  leadId: string,
  body: RequestCallBody,
): Promise<RequestCallSuccess> => {
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await axios.post<RequestCallSuccess>(
    `${base}/api/leads/${leadId}/request-call`,
    body,
  );
  return response.data;
};

export const getSelectionState = async (leadId: string): Promise<SelectionState> => {
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await axios.get<SelectionState>(
    `${base}/api/leads/${leadId}/selection-state`,
  );
  return response.data;
};

// ── Patient layer P5 ─────────────────────────────────────────
export interface RequestZubiteHelpBody {
  phone: string;
  consent_to_share: boolean;
  message?: string;
  source: 'matching_page' | 'clinic_profile';
}

export interface RequestZubiteHelpSuccess {
  success: true;
  request_id: string;
  message: string;
  already_requested?: boolean;
}

export const postRequestZubiteHelp = async (
  leadId: string,
  body: RequestZubiteHelpBody,
): Promise<RequestZubiteHelpSuccess> => {
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await axios.post<RequestZubiteHelpSuccess>(
    `${base}/api/leads/${leadId}/request-zubite-help`,
    body,
  );
  return response.data;
};

export const PATIENT_CONSENT_TEXT =
  'Съгласен/съгласна съм Zubite да сподели заявката ми с избраната клиника.';

export const PATIENT_ZUBITE_HELP_CONSENT_TEXT =
  'Съгласен/съгласна съм Zubite да използва информацията от оценката ми, ' +
  'за да ми помогне да избера подходяща следваща стъпка.';

export const seedDatabase = async () => {
  try {
    const response = await api.post('/seed');
    return response.data;
  } catch {
    return null;
  }
};
