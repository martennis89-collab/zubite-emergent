import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_campaign: params.get('utm_campaign'),
    utm_adset: params.get('utm_adset'),
    utm_ad: params.get('utm_ad'),
  };
}

export function formatDate(dateString) {
  return new Intl.DateTimeFormat('bg-BG', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateString));
}

export const translateStatus = (s) => ({
  NEW: 'Нов', CONTACTED: 'Свързани', SENT_TO_CLINIC: 'Изпратен', WON: 'Спечелен', LOST: 'Загубен'
})[s] || s;

export const translateBand = (b) => ({
  GREEN: 'Одобрен', YELLOW: 'За оценка', RED: 'Неподходящ'
})[b] || b;

export const translateTreatment = (t) => ({
  invisalign: 'Invisalign', implants: 'Импланти', full_mouth: 'Пълна терапия'
})[t] || t;

export const getStatusClass = (s) => ({
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-yellow-100 text-yellow-800',
  SENT_TO_CLINIC: 'bg-purple-100 text-purple-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800'
})[s] || '';

export const getBandClass = (b) => ({
  GREEN: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  YELLOW: 'bg-amber-100 text-amber-800 border-amber-300',
  RED: 'bg-red-100 text-red-800 border-red-300'
})[b] || '';
