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
Homepage → Quiz (10 questions with micro-insights) → Result Stage → Soft Commit → Lead Form (A/B) → Success Screen
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
- **File Upload**: Supports JPEG, PNG, GIF, WebP (max 5MB)

---

## Completed Work

### ✅ March 21, 2026 - Blog Image Upload Feature
- Added direct image upload functionality to blog admin pages
- Files stored in Emergent Object Storage for persistence
- Upload button with drag-and-drop style UI
- Supports JPEG, PNG, GIF, WebP up to 5MB
- Backend endpoints: POST `/api/admin/upload`, GET `/api/files/{file_id}`

### ✅ March 21, 2026 - Meta Pixel Integration
- Integrated Meta Pixel (ID: 26074948688761177)
- GDPR-compliant: Only tracks after marketing cookie consent
- Events tracked: QuizStart, QuestionAnswered, QuizComplete, SoftCommit, Lead

### ✅ March 21, 2026 - Homepage Animations & Blog Revalidation
- Implemented scroll-triggered animations using IntersectionObserver
- On-demand blog revalidation so posts appear instantly

### ✅ Previous Work
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
│   ├── api/revalidate/route.ts     # On-demand ISR revalidation
│   ├── quiz/page.tsx               # Master quiz
│   ├── admin/
│   │   ├── page.tsx                # Login
│   │   ├── dashboard/              # Leads dashboard
│   │   ├── analytics/              # Analytics dashboard
│   │   └── blog/
│   │       ├── new/page.tsx        # NEW: With image upload
│   │       └── [id]/page.tsx       # NEW: With image upload
│   └── ...
│
├── components/
│   ├── AnimatedHomeSections.tsx    # Animated homepage sections
│   ├── MasterQuiz.tsx              # Quiz with tracking
│   ├── MetaPixel.tsx               # NEW: Meta Pixel component
│   ├── CookieConsent.tsx           # GDPR cookie banner
│   └── ...

/app/backend/
└── server.py                       # FastAPI with file upload endpoints
```

---

## Key API Endpoints

### File Upload (NEW)
- `POST /api/admin/upload` - Upload image file (auth required)
- `GET /api/files/{file_id}` - Serve uploaded file (public)
- `GET /api/admin/files` - List all uploaded files (auth required)
- `DELETE /api/admin/files/{file_id}` - Delete file (auth required)

### Blog
- `GET/POST /api/admin/blog/posts` - CRUD operations
- `PUT/DELETE /api/admin/blog/posts/{id}` - Update/delete post

### Analytics
- `POST /api/analytics/event` - Track quiz events
- `GET /api/admin/analytics` - Dashboard data

---

## Meta Pixel Events Manager Setup

1. **Verify Installation**: Events Manager → Data Sources → Select pixel
2. **Custom Conversions** (recommended):
   - QuizStart - Track engagement
   - QuizComplete - Track completion
   - Lead - Standard event for optimization
3. **Custom Audiences** (for retargeting):
   - Quiz started but not completed
   - Quiz completed but no lead
   - Leads (for lookalike audiences)

---

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Google Ads Conversion tracking (need Conversion ID)

### P2 - Medium Priority
- [ ] Backend refactoring (split server.py into routers)
- [ ] Frontend API client centralization

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities beyond София and Пловдив
- [ ] Create specific quizzes for other treatments

---

*Last updated: March 21, 2026*
*Latest changes: Blog image upload feature, Meta Pixel integration*
