# Zubite.bg - Dental Lead Qualification Platform

## Overview
Independent patient qualification and navigation platform for premium dental treatments in Bulgaria. Now with bilingual support (Bulgarian/English).

**Tagline**: "Навигатор за дентални решения" / "Navigator for dental solutions"

## Architecture

### Routes (Bilingual)
**Bulgarian (default)**:
- `/` - Home page with 3 city cards (Sofia, Plovdiv, Varna)
- `/city/{citySlug}` - Condition selection page (6 options)
- `/city/{citySlug}/ortho` - Orthodontic treatment educational guide
- `/city/{citySlug}/ortho/smile-classification` - "Кое лечение пасва повече на моя начин на живот?" quiz (8 questions)
- `/city/{citySlug}/ortho/treatment-match` - "Може ли моят случай да се лекува със сваляеми алайнери?" quiz (6 questions)
- `/city/{citySlug}/{treatmentType}` - Treatment detail and Quiz page
- `/results/{leadId}` - Results and contact form
- `/symptoms` - Symptoms index page
- `/symptoms/{symptomSlug}` - Symptom detail page
- `/privacy`, `/terms`, `/contact` - Static pages

**English** (prefix `/en`):
- `/en` - English home page
- `/en/city/{citySlug}` - English condition selection
- `/en/city/{citySlug}/ortho` - English Orthodontic guide
- `/en/city/{citySlug}/ortho/smile-classification` - English "Which treatment fits my lifestyle better?" quiz
- `/en/city/{citySlug}/ortho/treatment-match` - English "Can my case be treated with removable aligners?" quiz
- `/en/city/{citySlug}/{treatmentType}` - English treatment detail and quiz
- `/en/results/{leadId}` - English results page
- `/en/symptoms` - English symptoms index
- `/en/symptoms/{symptomSlug}` - English symptom detail
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
- [x] City-first flow (3 cities: София, Пловдив, Варна)
- [x] Condition-based selection (6 options: Криви зъби, Липсващи зъби, Износени или счупени зъби, Разстояния между зъбите, Естетика на усмивката, Пълна рехабилитация)
- [x] Treatment pages: Orthodontics, Implants, Full-Mouth, Bonding
- [x] Quiz with scoring and band assignment
- [x] Results page with unified outcome message: "Благодарим. Ще се свържем с вас, за да обсъдим вашия случай."
- [x] Contact form with GDPR consent and "Заяви обаждане" CTA
- [x] Admin authentication (JWT)
- [x] Admin dashboard with stats by city/band
- [x] Admin lead management with filters
- [x] Lead detail with status updates
- [x] CSV export functionality

### Major Update (Mar 2025)
- [x] **City Restriction** - Only 3 cities: София, Пловдив, Варна
- [x] **Condition-Based Selection** - 6 initial condition options replacing treatment types
- [x] **"Ортодонтско лечение" Label** - Replaced "Invisalign" throughout
- [x] **Orthodontic Pricing Section** - Transparent pricing:
  - Прозрачни алайнери: България 3000–6000€, Европа 3500–7000€
  - Брекети: България 1500–3500€, Европа 2000–5000€
- [x] **Professional Note** - About who performs orthodontic treatment
- [x] **Orthodontic Foundation Education** - Added to Bonding, Implants, and Full-Mouth pages
- [x] **Updated Quiz Titles**:
  - "Кое лечение пасва повече на моя начин на живот?" (lifestyle quiz)
  - "Може ли моят случай да се лекува със сваляеми алайнери?" (eligibility quiz)
- [x] **Unified Quiz Outcomes** - All quizzes lead to same message: "Благодарим. Ще се свържем с вас, за да обсъдим вашия случай."
- [x] **CTA Update** - All CTAs now use "Заяви обаждане"
- [x] **Weighted Quiz Scoring** - Internal bias favoring aligners when:
  - High aesthetics importance
  - High compliance
  - Rarely visible lifestyle
  - Comfort/flexible preference
- [x] **Balanced Education Content** - Neutral, clinical tone for both aligners and braces

### Previous Features (Feb 2025)
- [x] **Bilingual Support (BG/EN)** - URL-based routing with `/en/` prefix
- [x] **Language Toggle** - BG | EN toggle in header
- [x] **Email Notifications** - Sends email to admin via Resend
- [x] **Symptoms Section** - 6 educational pages
- [x] **Animation System** - Premium micro-interactions
- [x] **Treatment Education Pages** - Detailed information for each treatment

## 3rd Party Integrations
- **Resend** - Email notifications on lead submission
- **Meta Pixel** - Lead conversion tracking (placeholder ID - replace for production)
- **Google Ads** - Conversion tracking (placeholder ID - replace for production)

## Seeded Data
3 Premium Clinics (one per city):
- Sofia Premium Clinic
- Plovdiv Premium Clinic
- Varna Premium Clinic

Admin: admin@zubite.bg / password

## Next Actions (P1)
- [ ] Replace tracking placeholder IDs with real Meta Pixel ID and Google Ads Conversion ID
- [ ] Translate Privacy/Terms/Contact pages to English

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
- `/app/frontend/src/lib/quizData.js` - CITIES and TREATMENTS definitions
- `/app/frontend/src/lib/translations.js` - BG/EN translations
- `/app/frontend/src/lib/orthoData.js` - Orthodontic content + pricing + quiz data
- `/app/frontend/src/lib/treatmentData.js` - Treatment education content (incl. orthoFoundation sections)
- `/app/frontend/src/pages/TreatmentSelectPage.jsx` - Condition selection page
- `/app/frontend/src/pages/OrthoEducationPage.jsx` - Orthodontic guide with pricing
- `/app/frontend/src/pages/OrthoQuizPage.jsx` - Quiz with weighted scoring
- `/app/frontend/src/pages/TreatmentDetailPage.jsx` - Treatment pages with orthoFoundation
- `/app/frontend/src/components/Layout.jsx` - Header/Footer with city restriction
- `/app/backend/server.py` - API + email notification logic
