# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is an educational orthodontic platform helping Bulgarian users understand their dental/orthodontic issues and guide them toward professional evaluation.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB (Motor async)
- **Styling**: Tailwind CSS
- **Email**: Resend
- **Storage**: Emergent Object Storage
- **Analytics**: Meta Pixel

---

## User Flows

### Patient Flow
```
Homepage -> Quiz -> Result -> Lead Form -> Success
```

### Clinic Flow
```
/za-kliniki (Apply) -> Admin Approves -> /clinic (Login) -> /clinic/dashboard (Manage Leads)
```

### Admin Flow
```
/admin (Login) -> Dashboard (Leads, Analytics, Blog, Clinic Applications)
```

---

## Completed Work

### April 2, 2026 - Verification Button in Admin Leads Dashboard
- Added "Клиника & Верификация" panel to lead detail modal
- **Clinic assignment**: Dropdown with all clinic accounts + "Насочи" button
- **Verification trigger**: "Изпрати верификация" button (disabled if no clinic or no email)
- **Status badge**: Shows pending (amber) / verified (green) / flagged (red)

### April 2, 2026 - Lead Verification System
- **Verification flow**: Admin triggers or auto-send 24h after lead assignment → email with "Свърза ли се клиниката с вас?" (Да/Не buttons) → patient clicks → response stored
- **DB**: `lead_verifications` collection with lead_id, clinic_id, token, response, timestamps
- **Status updates**: Yes → `verification_status: "verified"`, No → `verification_status: "flagged"`
- **Auto-send**: Background loop checks every hour for leads assigned 24h+ ago without verification
- **Admin endpoints**: `POST /api/admin/leads/{id}/send-verification`, `GET /api/admin/verifications`, `GET /api/admin/verifications/flagged`
- **Public page**: `/verify/[token]` with Да/Не buttons, success messages, error handling
- **Note**: Email delivery works in production with verified Resend domain

### April 2, 2026 - Clinic Enhancements (Email, Password, Company Details)
- **Welcome email**: Auto-sent to clinic on approval with login credentials and portal link
- **Password change**: `POST /api/clinic/change-password` with current/new password validation (min 6 chars)
- **Company details in profile**: address, website, company_name, EIK, MOL, description — all editable from Profile tab
- Frontend: Expanded ProfileTab with "Основна информация" + "Фирмени данни" sections + password change form with visibility toggles

### April 1, 2026 - Clinic User Accounts & Dashboard
- **Clinic Auth**: email + password login at `/clinic` with JWT tokens (role="clinic")
- **DB table `clinics`**: id, clinic_name, city, email, phone, password_hash, status (active/probation/paused), created_at
- **Dashboard tabs**:
  - **Overview**: total leads, contacted, pending, no_response stat cards
  - **Leads**: table with patient_name, phone, treatment_type, status (new/contacted/no_response), actions (mark contacted/no response)
  - **Profile**: editable clinic info (name, city, phone; email read-only)
- **Auto-creation on approve**: Admin approves clinic application → account auto-created with temp password shown in admin UI
- **Lead assignment**: Admin endpoint `PATCH /api/admin/leads/{id}/assign-clinic`
- **Bug fixes**: DuplicateKeyError on clinics collection, role-based 403 for admin endpoints

### April 1, 2026 - Admin Clinic Applications Dashboard
- `/admin/clinic-applications` page with table, status filters, search, detail modal with status buttons and admin notes

### April 1, 2026 - Structured Clinic Application Form
- `/za-kliniki` form with 6 sections: Clinic Info, Contact, Services (toggles), Qualification, Positioning, Operations

### March 28, 2026 - AI Outbound Calling (ElevenLabs)
- AI-powered outbound calling for lead follow-up

### March 27, 2026 - Blog Traffic Analytics
- Unique visitor tracking for blog posts

### Previous Work
- Quiz system, Blog CMS, Meta Pixel, GDPR compliance, Homepage animations

---

## Architecture

```
/app/frontend/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── za-kliniki/page.tsx         # For Clinics B2B page
│   ├── clinic/
│   │   ├── page.tsx                # Clinic login
│   │   └── dashboard/page.tsx      # Clinic dashboard
│   ├── admin/
│   │   ├── page.tsx                # Admin login
│   │   ├── dashboard/              # Leads management
│   │   ├── analytics/              # Analytics
│   │   ├── blog/                   # Blog management
│   │   └── clinic-applications/    # Clinic apps management
│   └── ...

/app/backend/
├── server.py                       # All API logic
├── services/
│   ├── elevenlabs_service.py
│   └── patient_context_mapper.py
└── models/
    └── call_models.py
```

---

## Key API Endpoints

### Clinic Auth & Dashboard
- `POST /api/clinic/login` - Clinic email+password login
- `GET /api/clinic/dashboard` - Overview stats
- `GET /api/clinic/leads` - Assigned leads list
- `PATCH /api/clinic/leads/{id}/status` - Update lead status (new/contacted/no_response)
- `GET /api/clinic/profile` - Get profile
- `PATCH /api/clinic/profile` - Update profile

### Admin Clinic Management
- `PATCH /api/admin/leads/{id}/assign-clinic` - Assign lead to clinic
- `GET /api/admin/clinic-accounts` - List clinic accounts
- `POST/GET/PATCH /api/admin/clinic-applications/*` - Manage applications

### Other
- Blog, Analytics, AI Calling, File Upload endpoints (see earlier PRD entries)

---

## DB Collections

### clinics (clinic accounts)
```
{id, clinic_name, city, email, phone, password_hash, status, application_id, created_at}
```

### clinic_applications
```
{id, clinic_name, city, address, website, contact_name, phone, email,
 offers_aligners, offers_braces, offers_implants, treats_adults, treats_children,
 years_experience, number_of_cases_per_month, do_you_use_digital_scans,
 what_types_of_patients_are_best_for_you, average_response_time,
 status, notes, created_at}
```

### leads (extended)
```
{..., assigned_clinic_id, clinic_lead_status (new/contacted/no_response)}
```

---

## Pending/Future Tasks

### P1 - High Priority
- [ ] Create specific quizzes for other treatments (cosmetic, implants)

### P2 - Medium Priority
- [ ] Backend refactoring (split server.py ~2000 lines into routers)
- [ ] Frontend API client centralization

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities in lead form
- [ ] Automated AI calling (X minutes after quiz)
- [ ] Expand admin panel (homepage text, treatment management)
- [ ] Clinic password reset flow

---

*Last updated: April 1, 2026*
