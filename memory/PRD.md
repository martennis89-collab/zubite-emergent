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
Homepage -> Quiz (10 questions with micro-insights) -> Result Stage -> Soft Commit -> Lead Form (A/B) -> Success Screen
```

---

## Admin Panel
- **URL**: /admin (or zubite.bg/admin in production)
- **Email**: `admin@zubite.bg`
- **Password**: `password`

### Features:
- **Dashboard**: View and manage leads
- **Analytics**: Track quiz funnel metrics
- **Blog Management**: Create, edit, delete blog posts with **direct image upload**
- **Clinic Applications**: View partnership applications from clinics
- **File Upload**: Supports JPEG, PNG, GIF, WebP (max 5MB)

---

## Completed Work

### April 1, 2026 - "For Clinics" Partnership Page
- Created high-conversion B2B page at `/za-kliniki`
- Premium dark/light hybrid design with glassmorphism cards
- **Sections**: Hero, How It Works (3 steps), Differentiators (3 cards), Requirements, Application Form, Trust Positioning
- **Backend**: `POST /api/clinic-applications` (public), `GET /api/admin/clinic-applications` (admin)
- Email notification sent to admin on each new application
- Added "Za kliniki" link to both Footer and AnimatedFooter
- **New files**: `/app/frontend/app/za-kliniki/page.tsx`, `/app/frontend/components/ForClinicsContent.tsx`

### March 28, 2026 - AI Outbound Calling (ElevenLabs)
- Added AI-powered outbound calling functionality for lead follow-up
- Integration with ElevenLabs Conversational AI
- **Features**:
  - "Call Patient" button in lead modal
  - Call status tracking (idle/calling/completed/failed/no_answer)
  - Post-call webhook to receive transcript & AI summary
  - Extracted data: treatment interest, timeline, permission to share
  - Full transcript display with timestamps
  - Call history per lead
- **Backend**:
  - `POST /api/admin/leads/{id}/call` - initiate call
  - `GET /api/admin/leads/{id}/call-logs` - call history
  - `POST /api/webhooks/elevenlabs/post-call` - webhook receiver
- **New files**:
  - `/app/backend/services/elevenlabs_service.py`
  - `/app/backend/services/patient_context_mapper.py`
  - `/app/backend/models/call_models.py`
  - `/app/frontend/components/AICallPanel.tsx`
- **Note**: Requires Twilio phone number configuration in ElevenLabs for real calls

### March 27, 2026 - Blog Traffic Analytics
- Added unique visitor tracking for blog posts
- `BlogViewTracker` component tracks views with visitor fingerprinting
- Admin panel shows unique visitors per post in `/admin/blog`
- Summary stats: total posts, unique visitors, total views
- Backend endpoints: `POST /api/blog/track-view`, `GET /api/admin/blog/analytics`

### March 21, 2026 - Blog Image Upload Feature
- Added direct image upload functionality to blog admin pages
- Files stored in Emergent Object Storage for persistence
- Upload button with drag-and-drop style UI
- Supports JPEG, PNG, GIF, WebP up to 5MB
- Backend endpoints: POST `/api/admin/upload`, GET `/api/files/{file_id}`

### March 21, 2026 - Meta Pixel Integration
- Integrated Meta Pixel (ID: 26074948688761177)
- GDPR-compliant: Only tracks after marketing cookie consent
- Events tracked: QuizStart, QuestionAnswered, QuizComplete, SoftCommit, Lead

### March 21, 2026 - Homepage Animations & Blog Revalidation
- Implemented scroll-triggered animations using IntersectionObserver
- On-demand blog revalidation so posts appear instantly

### Previous Work
- Quiz system with micro-insights, soft-commit, A/B testing
- Admin analytics dashboard
- Blog CMS with Google Drive image support and Cyrillic-to-Latin slug
- GDPR compliance (Privacy, Cookies, Terms pages + cookie consent banner)
- Homepage copy optimization for psychological tension

---

## Architecture

```
/app/frontend/
├── app/
│   ├── page.tsx                    # Homepage (animated)
│   ├── za-kliniki/page.tsx         # NEW: For Clinics B2B page
│   ├── api/revalidate/route.ts     # On-demand ISR revalidation
│   ├── quiz/page.tsx               # Master quiz
│   ├── admin/
│   │   ├── page.tsx                # Login
│   │   ├── dashboard/              # Leads dashboard
│   │   ├── analytics/              # Analytics dashboard
│   │   └── blog/
│   │       ├── new/page.tsx        # With image upload
│   │       └── [id]/page.tsx       # With image upload
│   └── ...
│
├── components/
│   ├── ForClinicsContent.tsx       # NEW: For Clinics page content
│   ├── AICallPanel.tsx             # AI outbound calling UI
│   ├── AnimatedHomeSections.tsx    # Animated homepage sections
│   ├── MasterQuiz.tsx              # Quiz with tracking
│   ├── BlogViewTracker.tsx         # Blog view analytics
│   ├── MetaPixel.tsx               # Meta Pixel component
│   ├── CookieConsent.tsx           # GDPR cookie banner
│   └── ...

/app/backend/
├── server.py                       # FastAPI main server
├── services/
│   ├── elevenlabs_service.py       # ElevenLabs AI calling
│   └── patient_context_mapper.py   # Quiz data to AI context
└── models/
    └── call_models.py              # Call data models
```

---

## Key API Endpoints

### Clinic Applications (NEW)
- `POST /api/clinic-applications` - Submit clinic partnership application (public)
- `GET /api/admin/clinic-applications` - List all applications (auth required)

### File Upload
- `POST /api/admin/upload` - Upload image file (auth required)
- `GET /api/files/{file_id}` - Serve uploaded file (public)
- `GET /api/admin/files` - List all uploaded files (auth required)
- `DELETE /api/admin/files/{file_id}` - Delete file (auth required)

### Blog
- `GET/POST /api/admin/blog/posts` - CRUD operations
- `PUT/DELETE /api/admin/blog/posts/{id}` - Update/delete post
- `POST /api/blog/track-view` - Track unique blog post views
- `GET /api/admin/blog/analytics` - Blog traffic analytics

### AI Outbound Calling
- `POST /api/admin/leads/{id}/call` - Initiate AI call to lead
- `GET /api/admin/leads/{id}/call-logs` - Get call history for lead
- `POST /api/webhooks/elevenlabs/post-call` - Webhook for call results

### Analytics
- `POST /api/analytics/event` - Track quiz events
- `GET /api/admin/analytics` - Dashboard data

---

## Pending/Future Tasks

### P1 - High Priority
- [ ] Create specific quizzes for other dental treatments (cosmetic dentistry, implants)

### P2 - Medium Priority
- [ ] Backend refactoring (split server.py into routers)
- [ ] Frontend API client centralization

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities beyond Sofia and Plovdiv
- [ ] Expand admin panel (homepage text, treatment management)
- [ ] Automated AI calling (X minutes after quiz completion)
- [ ] SMS fallback for unanswered calls

---

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
ELEVENLABS_API_KEY=sk_xxx (configured)
ELEVENLABS_AGENT_ID=agent_xxx (configured)
ELEVENLABS_WEBHOOK_SECRET= (optional, for webhook verification)
ELEVENLABS_TWILIO_PHONE_ID= (required for real calls)
```

---

*Last updated: April 1, 2026*
*Latest changes: "For Clinics" B2B partnership page with application form*
