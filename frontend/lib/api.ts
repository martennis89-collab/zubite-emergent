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

export const seedDatabase = async () => {
  try {
    const response = await api.post('/seed');
    return response.data;
  } catch {
    return null;
  }
};
