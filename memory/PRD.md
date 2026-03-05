# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with custom dark theme
- **Email**: Resend for lead notifications

## Current Architecture

```
/app/
├── backend/
│   ├── .env                # MongoDB, Resend API keys
│   ├── requirements.txt
│   └── server.py           # FastAPI app with all endpoints
├── nextjs-seo/             # NEW: Next.js SEO-optimized frontend
│   ├── app/
│   │   ├── page.tsx        # Homepage (SSR)
│   │   ├── layout.tsx      # Root layout with SEO metadata
│   │   ├── city/[citySlug]/
│   │   │   ├── page.tsx    # City treatment selection
│   │   │   ├── ortho/      # Ortho education redirect
│   │   │   └── [treatmentType]/
│   │   │       ├── page.tsx     # Treatment detail
│   │   │       └── quiz/page.tsx # Quiz flow (client)
│   │   ├── ortho/          # Orthodontic education
│   │   │   ├── page.tsx    # Aligners vs Braces
│   │   │   └── [quizType]/ # Quiz variations
│   │   ├── results/[leadId]/ # Quiz results
│   │   ├── symptoms/       # Symptom pages
│   │   ├── admin/          # Admin panel
│   │   ├── en/             # English version
│   │   ├── privacy/
│   │   ├── terms/
│   │   └── contact/
│   ├── components/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── lib/
│   │   ├── api.ts          # API client
│   │   ├── data.ts         # Cities, treatments, quiz questions
│   │   └── utils.ts
│   └── .env.local
├── frontend/               # DEPRECATED: Old React SPA (kept for reference)
└── memory/
    └── PRD.md
```

## Key Features

### Implemented ✅
1. **SEO-Optimized Homepage** - Server-rendered with full meta tags, hreflang, Open Graph
2. **City Selection** - Sofia, Plovdiv, Varna
3. **Treatment Types** - Orthodontics, Implants, Full-mouth, Bonding
4. **Interactive Quizzes** - Client-side with progress tracking
5. **Contact Form** - At end of each quiz flow
6. **Lead Creation** - Automatic scoring and band assignment
7. **Email Notifications** - Via Resend to admin
8. **Admin Panel** - Login, dashboard, leads management
9. **Bilingual Support** - Bulgarian (default) + English
10. **Responsive Design** - Mobile-first dark theme

### API Endpoints
- `POST /api/leads` - Create lead with contact info
- `GET /api/leads/{id}` - Get lead details
- `PUT /api/leads/{id}/contact` - Update lead contact
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/leads` - List all leads
- `GET /api/admin/leads/{id}` - Lead detail

### Database Schema
**leads collection:**
```json
{
  "id": "string",
  "created_at": "datetime",
  "city_slug": "sofia|plovdiv|varna",
  "treatment_type": "orthodontics|implants|full-mouth|bonding",
  "answers": {},
  "score_total": "number",
  "band": "A|B|C",
  "name": "string",
  "phone": "string",
  "email": "string",
  "consent": "boolean",
  "source": "nextjs_quiz|ortho_quiz"
}
```

## Migration Summary (Dec 2025)
- Migrated entire frontend from React SPA to Next.js 15
- All public pages are now server-side rendered for SEO
- Interactive components (quizzes, admin) remain as client components
- Proper routing with App Router dynamic routes
- Language toggle between BG/EN

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking (user needs to provide)
- [ ] Add Google Ads Conversion ID (user needs to provide)
- [ ] Build production bundle (`next build`) for deployment

### P2 - Medium Priority  
- [ ] Migrate remaining English pages with full i18n
- [ ] Add more symptom detail pages
- [ ] Clinic listing/management in admin

### P3 - Future Enhancements
- [ ] SEO sitemap generation
- [ ] Google Analytics integration
- [ ] SMS notifications via Twilio
- [ ] Multi-clinic assignment logic

## Admin Credentials
- Email: `admin@zubite.bg`
- Password: `password`

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
RESEND_API_KEY=<provided>
SENDER_EMAIL=onboarding@resend.dev
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://zubite-nextjs.preview.emergentagent.com/api
```

---
*Last updated: December 2025*
