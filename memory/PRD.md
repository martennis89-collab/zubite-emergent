# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is an educational orthodontic platform helping Bulgarian users understand their dental/orthodontic issues and guide them toward professional evaluation. The platform assesses the user's current stage and captures their contact details so Zubite.bg can recommend 3 suitable clinic options.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with white/sky-blue accents
- **Email**: Resend for lead notifications
- **Storage**: Emergent Object Storage for blog images
- **Analytics**: Meta Pixel (ID: 26074948688761177)

## Core User Flow
```
Homepage -> Quiz -> Result Stage -> Soft Commit -> Lead Form (A/B) -> Success Screen
```

---

## Admin Panel
- **URL**: /admin
- **Email**: `admin@zubite.bg`
- **Password**: `password`

### Features:
- Dashboard: View and manage leads
- Analytics: Track quiz funnel metrics
- Blog Management: Create, edit, delete blog posts with image upload
- Clinic Applications: View/manage partnership applications
- File Upload: JPEG, PNG, GIF, WebP (max 5MB)

---

## Completed Work

### April 1, 2026 - Admin Clinic Applications Dashboard
- Created `/admin/clinic-applications` page for managing clinic partnership applications
- **Table view**: clinic_name, city, contact_name, services (as tags), status (as badges), date
- **Status filter cards**: All, Pending, Approved, Rejected, Waiting List with counts
- **Search**: by clinic name, contact, city, or email
- **Detail modal**: Full submitted data in organized sections (Clinic Info, Contact, Services, Qualification, Positioning, Operations)
- **Admin actions**: Approve/Reject/Waiting List status buttons, admin notes field with save
- Added "Клиники" nav link to admin dashboard header

### April 1, 2026 - Structured Clinic Application Form
- Upgraded `/za-kliniki` form with 6 structured sections:
  - **Clinic Info**: clinic_name, city (dropdown: София/Пловдив/Варна/Друг), address, website (optional)
  - **Contact**: contact_name, phone, email
  - **Services**: offers_aligners, offers_braces, offers_implants, treats_adults, treats_children (toggle switches)
  - **Qualification**: years_experience (number), number_of_cases_per_month (range), do_you_use_digital_scans (yes/no)
  - **Positioning**: what_types_of_patients_are_best_for_you (textarea)
  - **Operations**: average_response_time (dropdown: <1h, 1-6h, 24h, >24h)
- System fields: status (default "pending"), created_at, notes (admin only)
- Admin endpoints: GET list, PATCH status/notes
- Email notification on new application

### April 1, 2026 - "For Clinics" Partnership Page
- Created B2B page at `/za-kliniki` with dark/light hybrid design
- Sections: Hero, How It Works, Differentiators, Requirements, Application Form, Trust
- Backend: `POST /api/clinic-applications`, `GET /api/admin/clinic-applications`

### March 28, 2026 - AI Outbound Calling (ElevenLabs)
- AI-powered outbound calling for lead follow-up
- ElevenLabs + Twilio integration with webhook

### March 27, 2026 - Blog Traffic Analytics
- Unique visitor tracking for blog posts

### Previous Work
- Quiz system with micro-insights, soft-commit, A/B testing
- Blog CMS with image upload, Meta Pixel, GDPR compliance
- Homepage animations, admin analytics dashboard

---

## Architecture

```
/app/frontend/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── za-kliniki/page.tsx         # For Clinics B2B page
│   ├── quiz/page.tsx               # Master quiz
│   ├── admin/                      # Admin panel
│   └── blog/                       # Blog pages
├── components/
│   ├── ForClinicsContent.tsx       # For Clinics page (structured form)
│   ├── AICallPanel.tsx             # AI calling UI
│   ├── AnimatedHomeSections.tsx    # Animated homepage
│   └── ...

/app/backend/
├── server.py                       # FastAPI main server
├── services/
│   ├── elevenlabs_service.py
│   └── patient_context_mapper.py
└── models/
    └── call_models.py
```

---

## Key API Endpoints

### Clinic Applications
- `POST /api/clinic-applications` - Submit application (public)
- `GET /api/admin/clinic-applications` - List all (auth)
- `PATCH /api/admin/clinic-applications/{id}` - Update status/notes (auth)

### Blog, Analytics, AI Calling, File Upload
- See previous PRD entries

---

## DB Schema: clinic_applications
```
{
  id, clinic_name, city, address, website,
  contact_name, phone, email,
  offers_aligners, offers_braces, offers_implants,
  treats_adults, treats_children,
  years_experience, number_of_cases_per_month,
  do_you_use_digital_scans,
  what_types_of_patients_are_best_for_you,
  average_response_time,
  status: "pending", notes: "", created_at
}
```

---

## Pending/Future Tasks

### P1 - High Priority
- [ ] Create specific quizzes for other treatments
- [ ] Admin UI for viewing/managing clinic applications

### P2 - Medium Priority
- [ ] Backend refactoring (split server.py into routers)
- [ ] Frontend API client centralization

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities
- [ ] Automated AI calling
- [ ] Expand admin panel

---

*Last updated: April 1, 2026*
