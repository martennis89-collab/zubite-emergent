import axios from 'axios';

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
  const response = await api.post('/leads', leadData);
  return response.data;
};

export const updateLeadContact = async (leadId: string, contactData: { name: string; phone: string; email: string; consent: boolean }) => {
  const response = await api.put(`/leads/${leadId}/contact`, contactData);
  return response.data;
};

export const getLead = async (leadId: string) => {
  const response = await api.get(`/leads/${leadId}`);
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
