# Zubite.bg - Dental Lead Qualification Platform

## Overview
Independent patient qualification and navigation platform for premium dental treatments in Bulgaria. Now with bilingual support (Bulgarian/English).

**Tagline**: "Навигатор за дентални решения" / "Navigator for dental solutions"

## Architecture

### Routes (Bilingual)
**Bulgarian (default)**:
- `/` - Home page with 4 city cards
- `/city/{citySlug}` - Treatment selection page
- `/city/{citySlug}/{treatmentType}` - Quiz page
- `/results/{leadId}` - Results and contact form
- `/privacy`, `/terms`, `/contact` - Static pages

**English** (prefix `/en`):
- `/en` - English home page
- `/en/city/{citySlug}` - English treatment selection
- `/en/city/{citySlug}/{treatmentType}` - English quiz
- `/en/results/{leadId}` - English results page
- `/en/privacy`, `/en/terms`, `/en/contact` - English static pages

**Admin** (no translation):
- `/admin` - Admin login
- `/admin/dashboard` - Admin stats dashboard
- `/admin/leads` - Lead management with filters
- `/admin/leads/{leadId}` - Lead detail page

### Database (MongoDB)
- **clinics**: id, name, city_slug, city_name, treatments_supported, is_active
- **leads**: id, city_slug, treatment_type, score_total, band, status, assigned_clinic_id, name, phone, email, consent, answers (jsonb), score_breakdown (jsonb)
- **admin_users**: id, username, password_hash

### Scoring System
- Score range: 0-100
- GREEN: ≥75 (auto-assign clinic)
- YELLOW: 50-74
- RED: <50
- can_travel=false caps to YELLOW

## What's Implemented

### Core Features
- [x] City-first flow (4 cities: София/Sofia, Пловдив/Plovdiv, Варна/Varna, Хасково/Haskovo)
- [x] Treatment selection (Invisalign, Implants, Full-Mouth)
- [x] Quiz with 7 questions per treatment
- [x] Score calculation and band assignment
- [x] Results page with dynamic messaging
- [x] Contact form with GDPR consent
- [x] Admin authentication (JWT)
- [x] Admin dashboard with stats by city/band
- [x] Admin lead management with filters
- [x] Lead detail with status updates
- [x] CSV export functionality

### New Features (Feb 2026)
- [x] **Bilingual Support (BG/EN)** - URL-based routing with `/en/` prefix
- [x] **Language Toggle** - BG | EN toggle in header (desktop & mobile)
- [x] **Email Notifications** - Sends email to admin (martennis89@gmail.com) via Resend when leads submit contact info
- [x] **Premium Wording** - Updated "investment readiness" question to be more premium

## 3rd Party Integrations
- **Resend** - Email notifications on lead submission
  - API Key configured in backend/.env
  - Recipient: martennis89@gmail.com
  - Sender: onboarding@resend.dev

## Seeded Data
4 Premium Clinics (one per city):
- Sofia Premium Clinic
- Plovdiv Premium Clinic
- Varna Premium Clinic
- Haskovo Premium Clinic

Admin: admin / admin123

## Next Actions (P1)
- [ ] Add "Симптоми" (Symptoms) section with educational pages
- [ ] Expand treatment education content
- [ ] Validate Meta Pixel & Google Ads tracking
- [ ] Update privacy/contact pages with translations

## Backlog (P2)
- [ ] Subdomain routing (production)
- [ ] Analytics integration
- [ ] Multi-admin support
- [ ] Lead assignment rules customization

## Tech Stack
- Frontend: React 18, TailwindCSS, shadcn/ui
- Backend: FastAPI, Motor (async MongoDB)
- Auth: JWT
- Database: MongoDB
- Email: Resend

## Key Files
- `/app/frontend/src/context/LanguageContext.jsx` - Language state management
- `/app/frontend/src/lib/translations.js` - BG/EN translations
- `/app/backend/server.py` - API + email notification logic
