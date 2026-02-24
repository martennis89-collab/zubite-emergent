import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin') {
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  }
);

// ============== PUBLIC APIs ==============

export const seedDatabase = async () => {
  const response = await api.post('/seed');
  return response.data;
};

export const getClinics = async () => {
  const response = await api.get('/clinics');
  return response.data;
};

export const createLead = async (leadData) => {
  const response = await api.post('/leads', leadData);
  return response.data;
};

export const getLead = async (leadId) => {
  const response = await api.get(`/leads/${leadId}`);
  return response.data;
};

export const updateLeadContact = async (leadId, contactData) => {
  const response = await api.patch(`/leads/${leadId}/contact`, contactData);
  return response.data;
};

export const createEvent = async (eventData) => {
  const response = await api.post('/events', eventData);
  return response.data;
};

// ============== ADMIN APIs ==============

export const adminLogin = async (username, password) => {
  const response = await api.post('/admin/login', { username, password });
  return response.data;
};

export const getAdminMe = async () => {
  const response = await api.get('/admin/me');
  return response.data;
};

export const getAdminLeads = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.treatment_type) params.append('treatment_type', filters.treatment_type);
  if (filters.band) params.append('band', filters.band);
  if (filters.status) params.append('status', filters.status);
  if (filters.city) params.append('city', filters.city);
  
  const response = await api.get(`/admin/leads?${params.toString()}`);
  return response.data;
};

export const getAdminLead = async (leadId) => {
  const response = await api.get(`/admin/leads/${leadId}`);
  return response.data;
};

export const updateAdminLead = async (leadId, updateData) => {
  const response = await api.patch(`/admin/leads/${leadId}`, updateData);
  return response.data;
};

export const getAdminClinics = async () => {
  const response = await api.get('/admin/clinics');
  return response.data;
};

export const getAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const exportLeadsCSV = () => {
  const token = localStorage.getItem('admin_token');
  window.open(`${API}/admin/leads/export/csv?token=${token}`, '_blank');
};

export default api;
