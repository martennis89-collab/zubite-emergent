import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Get UTM parameters from URL
export function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_adset: params.get('utm_adset') || null,
    utm_ad: params.get('utm_ad') || null,
    gclid: params.get('gclid') || null,
  };
}

// Hash IP for privacy (simple client-side approximation)
export function hashIP() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);
  return canvas.toDataURL().slice(-32);
}

// Format date for display
export function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Get band color class
export function getBandColorClass(band) {
  switch (band) {
    case 'GREEN':
      return 'band-green';
    case 'YELLOW':
      return 'band-yellow';
    case 'RED':
      return 'band-red';
    default:
      return '';
  }
}

// Get status color class
export function getStatusColorClass(status) {
  switch (status) {
    case 'NEW':
      return 'status-new';
    case 'CONTACTED':
      return 'status-contacted';
    case 'SENT_TO_CLINIC':
      return 'status-sent';
    case 'WON':
      return 'status-won';
    case 'LOST':
      return 'status-lost';
    default:
      return '';
  }
}

// Translate status to Bulgarian
export function translateStatus(status) {
  const translations = {
    NEW: 'Нов',
    CONTACTED: 'Свързани',
    SENT_TO_CLINIC: 'Изпратен',
    WON: 'Спечелен',
    LOST: 'Загубен',
  };
  return translations[status] || status;
}

// Translate treatment type to Bulgarian
export function translateTreatment(type) {
  const translations = {
    invisalign: 'Invisalign',
    implants: 'Импланти',
    full_mouth: 'Пълна терапия',
  };
  return translations[type] || type;
}

// Translate band to Bulgarian
export function translateBand(band) {
  const translations = {
    GREEN: 'Одобрен',
    YELLOW: 'Допълнителна оценка',
    RED: 'Неподходящ',
  };
  return translations[band] || band;
}

// Save quiz progress to localStorage
export function saveQuizProgress(quizType, answers, currentStep) {
  const data = { answers, currentStep, timestamp: Date.now() };
  localStorage.setItem(`quiz_progress_${quizType}`, JSON.stringify(data));
}

// Load quiz progress from localStorage
export function loadQuizProgress(quizType) {
  const data = localStorage.getItem(`quiz_progress_${quizType}`);
  if (!data) return null;
  
  const parsed = JSON.parse(data);
  // Check if progress is less than 1 hour old
  if (Date.now() - parsed.timestamp > 3600000) {
    localStorage.removeItem(`quiz_progress_${quizType}`);
    return null;
  }
  return parsed;
}

// Clear quiz progress
export function clearQuizProgress(quizType) {
  localStorage.removeItem(`quiz_progress_${quizType}`);
}
