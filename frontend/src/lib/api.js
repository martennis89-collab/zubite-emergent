import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

export const seedDatabase = () => api.post('/seed').then(r => r.data);
export const getCities = () => api.get('/cities').then(r => r.data);
export const getCity = (slug) => api.get(`/cities/${slug}`).then(r => r.data);
export const createLead = (data) => api.post('/leads', data).then(r => r.data);
export const getLead = (id) => api.get(`/leads/${id}`).then(r => r.data);
export const updateLeadContact = (id, data) => api.patch(`/leads/${id}/contact`, data).then(r => r.data);

export const adminLogin = (username, password) => api.post('/admin/login', { username, password }).then(r => r.data);
export const getAdminMe = () => api.get('/admin/me').then(r => r.data);
export const getAdminLeads = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
  return api.get(`/admin/leads?${params}`).then(r => r.data);
};
export const getAdminLead = (id) => api.get(`/admin/leads/${id}`).then(r => r.data);
export const updateAdminLead = (id, data) => api.patch(`/admin/leads/${id}`, data).then(r => r.data);
export const getAdminClinics = () => api.get('/admin/clinics').then(r => r.data);
export const getAdminStats = () => api.get('/admin/stats').then(r => r.data);

export default api;
