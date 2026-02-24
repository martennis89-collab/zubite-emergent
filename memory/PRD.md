# Zubite.bg - Dental Lead Qualification Platform

## Overview
Independent patient qualification and navigation platform for premium dental treatments in Bulgaria.

**Tagline**: "Навигатор за дентални решения"

## Architecture

### Routes
- `/` - Home page with 4 city cards (София, Пловдив, Варна, Хасково)
- `/city/{citySlug}` - Treatment selection page
- `/city/{citySlug}/{treatmentType}` - Quiz page
- `/results/{leadId}` - Results and contact form
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
- [x] City-first flow (4 cities)
- [x] Treatment selection (Invisalign, Implants, Full-Mouth)
- [x] Quiz with 7 questions per treatment
- [x] Score calculation and band assignment
- [x] Results page with dynamic messaging
- [x] Contact form with GDPR consent
- [x] Admin authentication (JWT)
- [x] Admin dashboard with stats by city/band
- [x] Admin lead management with filters
- [x] Lead detail with status updates

## Seeded Data
4 Premium Clinics (one per city):
- Sofia Premium Clinic
- Plovdiv Premium Clinic
- Varna Premium Clinic
- Haskovo Premium Clinic

Admin: admin / admin123

## Next Actions
- [ ] Email notifications on new leads
- [ ] CSV export functionality
- [ ] Subdomain routing (production)
- [ ] Analytics integration
- [ ] Multi-admin support

## Tech Stack
- Frontend: React 18, TailwindCSS, shadcn/ui
- Backend: FastAPI, Motor (async MongoDB)
- Auth: JWT
- Database: MongoDB
