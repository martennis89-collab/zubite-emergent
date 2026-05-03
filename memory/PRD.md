# Zubite.bg - Product Requirements Document

## Problem Statement
Educational platform for orthodontic awareness in Bulgaria. Guides users through quizzes, captures leads, connects them with dental clinics, and provides an admin dashboard for lead and clinic management.

## Core Features
1. **Master Quiz** - Multi-step quiz assessing orthodontic needs with scoring & lead capture
2. **Blog with SSR** - Server-side rendered blog with Object Storage image uploads
3. **Admin Dashboard** - Lead management, analytics, blog management, clinic management
4. **AI Outbound Calling** - ElevenLabs + Twilio integration for patient follow-up calls
5. **B2B Clinic Onboarding** - Application form, admin approval, clinic dashboard, lead distribution
6. **Lead Verification** - Automated 24h email verification to check if clinics contacted leads

## Architecture (Post-Refactoring April 2, 2026)
```
/app/backend/
├── server.py          # Thin FastAPI app shell (~130 lines)
├── config.py          # Environment variables and constants
├── database.py        # MongoDB connection (Motor async)
├── auth.py            # JWT, password utils, auth dependencies
├── schemas.py         # All Pydantic models
├── storage.py         # Object storage helpers
├── scoring.py         # Lead score calculator
├── emails.py          # Email sending helpers (Resend)
├── routers/
│   ├── public.py      # /, /cities, /leads, /seed
│   ├── admin.py       # Admin login, leads CRUD, stats, CSV export
│   ├── blog.py        # Blog: public + admin + file uploads + analytics
│   ├── analytics.py   # Quiz funnel analytics
│   ├── clinics.py     # Clinic apps, auth, dashboard, password mgmt
│   ├── calls.py       # AI calling + ElevenLabs webhook
│   ├── verification.py # Lead verification system
│   └── seo.py         # SEO HTML pages
├── models/
│   └── call_models.py # ElevenLabs call models
├── services/
│   ├── elevenlabs_service.py
│   └── patient_context_mapper.py
└── tests/
    └── test_refactored_api.py

/app/frontend/
├── app/
│   ├── (main)/        # Public pages, /za-kliniki, /verify/[token]
│   ├── admin/         # Admin dashboards (Leads, Analytics, Clinics)
│   └── clinic/        # Clinic authentication & dashboard
├── components/        # React components
```

## Completed Work
- Master Quiz with Meta Pixel tracking
- Blog with SSR and Object Storage image uploads
- Admin Dashboard (leads, analytics, blog management)
- AI Outbound Calling (ElevenLabs + Twilio)
- B2B Clinic Onboarding (application, admin approval, clinic dashboard)
- Lead Verification System (auto-email + manual trigger)
- Regenerate Clinic Password (admin panel button)
- **Backend Refactoring** (April 2, 2026) - Split 2500+ line monolithic server.py into 16 modular files
- **Hero Section Redesign** (May 3, 2026) - Premium above-the-fold hero with CTA card, micro-details, trust element, and abstract dental visual
- **Multi-Path Diagnostic Quiz** (May 3, 2026) - 3-segment quiz (Adult 10Q / Teen 8Q / Child 8Q) with branching logic, visual SVG teeth questions, micro-progressions, segment-specific results with severity scoring and flag tags
- **Segment-Specific Success Pages** (May 3, 2026) - Thank you pages adapt per segment (adult/teen/child) and result band (low/moderate/high) with unique messaging, urgency levels, and next steps

## Remaining Backlog
### P1
- [ ] Create specific quizzes (cosmetic dentistry, implants)

### P2
- [ ] Frontend data fetching refactor (centralized API helper)

### P3 - Future
- [ ] English translation (/en/... routes)
- [ ] More cities in lead form
- [ ] Automated AI calling (X minutes after quiz)
- [ ] Expand admin panel (homepage text, treatment management)

## 3rd Party Integrations
- **Meta Pixel** - Analytics tracking
- **Resend** - Email delivery
- **Emergent Object Storage** - File uploads
- **ElevenLabs** - Conversational AI / Outbound Calling
- **Twilio** - Phone numbers for ElevenLabs

## Key DB Collections
- `leads` - Quiz results, contact info, call status, verification status
- `clinics` - Seed clinics + partner clinic accounts
- `clinic_applications` - Partnership applications
- `lead_verifications` - Verification tokens and responses
- `blog_posts` - Blog content
- `analytics_events` - Quiz funnel tracking
- `blog_views` - Blog traffic tracking
- `lead_call_logs` - AI call history
- `admin_users` - Admin accounts
- `uploaded_files` - Object storage references

---
*Last updated: April 2, 2026*
