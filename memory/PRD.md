# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with light theme (white/sky-blue accents)
- **Email**: Resend for lead notifications

## Current Architecture (Treatment-First)

```
/app/nextjs-seo/
├── app/
│   ├── page.tsx                    # Homepage (treatment-first)
│   ├── layout.tsx                  # Root layout with JSON-LD
│   ├── sitemap.ts                  # Dynamic sitemap
│   │
│   ├── orthodontics/page.tsx       # Treatment pages (canonical)
│   ├── implants/page.tsx
│   ├── cosmetic-dentistry/page.tsx
│   ├── sleep-airway/page.tsx
│   ├── tmj/page.tsx
│   │
│   ├── [city]/[treatment]/         # City-specific pages
│   │   ├── page.tsx                # City landing with FAQs, clinics, pricing
│   │   └── quiz/page.tsx           # Quiz flow with outcome display
│   │
│   ├── admin/                      # Password-protected admin panel
│   │   ├── page.tsx                # Login page
│   │   ├── dashboard/page.tsx      # Leads dashboard with filters
│   │   └── leads/[id]/page.tsx     # Lead detail page
│   │
│   ├── aligners-vs-braces/         # SEO comparison page
│   ├── invisalign-price/           # SEO pricing page
│   ├── what-is-invisalign/         # SEO educational page
│   ├── implant-price/              # SEO pricing page
│   ├── crooked-teeth/              # SEO symptom page
│   │
│   ├── privacy/, terms/, contact/  # Static pages
│   └── symptoms/                   # Symptoms guide
│
├── components/
│   ├── Header.tsx                  # Nav with treatments dropdown
│   ├── Footer.tsx                  # Footer with treatment links
│   └── FAQAccordion.tsx            # Reusable FAQ component
│
├── lib/
│   ├── api.ts                      # API client
│   ├── data.ts                     # Cities, treatments, FAQs, pricing
│   ├── schema.ts                   # JSON-LD generators
│   └── utils.ts
│
└── public/
    ├── og/                         # OG images for social sharing
    └── robots.txt
```

## URL Structure

### Primary Routes (Treatment-First)
- `/` - Homepage with treatment selection
- `/orthodontics` - Orthodontics main page (canonical)
- `/implants` - Dental implants main page (canonical)
- `/cosmetic-dentistry` - Cosmetic dentistry main page (canonical)
- `/sleep-airway` - Sleep apnea main page (canonical)
- `/tmj` - TMJ main page (canonical)

### SEO Content Pages (Topic Clusters)
- `/aligners-vs-braces` - Comparison page (high-intent)
- `/invisalign-price` - Price guide page (very high-intent)
- `/what-is-invisalign` - Educational page
- `/implant-price` - Implant pricing guide
- `/crooked-teeth` - Symptom/problem page

### City-Specific Routes
- `/sofia/orthodontics` - City + treatment page
- `/plovdiv/implants` - etc.
- `/varna/cosmetic-dentistry` - etc.

Each city page includes:
- City-specific intro paragraph
- Partner clinics list
- Local FAQ (5+ questions)
- Pricing ranges
- Quiz link

### Supported Cities
- sofia (София)
- plovdiv (Пловдив)
- varna (Варна)
- haskovo (Хасково)

## Quiz System

### Scoring Logic
- Points calculated based on answers (seriousness, timing, importance, readiness)
- **Green (>=70 pts)**: "Отличен кандидат!" - Highly suitable
- **Yellow (>=40 pts)**: "Необходима е допълнителна информация" - Needs consultation
- **Red (<40 pts)**: "Може да има по-добри опции" - Alternative needed

### Quiz Flow
1. User completes 5 questions
2. Score calculated automatically
3. Colored outcome displayed (green/yellow/red)
4. "Request a Call" option appears
5. Contact form submission creates lead in database

## Admin Panel

### Features
- Password-protected login (`/admin`)
- Dashboard with stats cards (`/admin/dashboard`)
- Lead filtering by band/city/treatment
- Search functionality
- CSV export
- Lead detail view with status management

### Credentials
- **Username**: `admin@zubite.bg`
- **Password**: `password`

## API Endpoints
- `POST /api/leads` - Create lead
- `GET /api/leads/{id}` - Get lead
- `POST /api/admin/login` - Admin auth
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/leads` - List leads with filters
- `GET /api/admin/leads/{id}` - Get lead detail
- `PATCH /api/admin/leads/{id}` - Update lead status/notes
- `GET /api/admin/leads/export/csv` - Export leads

## Key Features

### Implemented ✅
1. **Treatment-First Architecture** - Primary routes are treatments
2. **5 Treatment Pages** - Orthodontics, Implants, Cosmetic, Sleep, TMJ
3. **15+ City-Treatment Pages** - 3 cities × 5 treatments + Haskovo
4. **SEO Topic Clusters** - Comparison, pricing, educational pages
5. **Light Theme UI** - White background, sky-blue accents, serif headings
6. **Quiz with Outcome Colors** - Green/yellow/red suitability indicator
7. **Request a Call** - Form appears after quiz completion
8. **Admin Dashboard** - Password-protected with lead management
9. **SEO-Optimized** - JSON-LD, OG images, sitemap, robots.txt
10. **City-Specific Content** - FAQs, clinics, pricing per city

## Target SEO Keywords

### Orthodontics Cluster
- ортодонт София
- Invisalign цена
- алайнери цена
- брекети цена
- алайнери vs брекети

### Implants Cluster
- зъбни импланти цена
- импланти София
- All on 4 импланти
- колко струва зъбен имплант

### Problem/Symptom Keywords
- криви зъби лечение
- криви зъби

## Pending/Future Tasks

### P0 - In Progress
- [ ] More SEO content pages (bonding-vs-veneers, hollywood-smile)
- [ ] Additional symptom pages

### P1 - High Priority
- [ ] Replace placeholder OG images with real designs
- [ ] Add Meta Pixel ID for tracking
- [ ] Add Google Ads Conversion ID

### P2 - Medium Priority
- [ ] Add real clinic data (partnerships)
- [ ] Implement Google Analytics
- [ ] Add appointment scheduling

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities
- [ ] Blog/content section
- [ ] User reviews system

---
*Last updated: December 2025*
