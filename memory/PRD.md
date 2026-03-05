# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with custom dark theme
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
│   │   └── quiz/page.tsx           # Quiz flow
│   │
│   ├── results/[leadId]/           # Quiz results
│   ├── admin/                      # Admin panel
│   ├── privacy/, terms/, contact/  # Static pages
│   └── symptoms/                   # Symptoms guide
│
├── components/
│   ├── Header.tsx                  # Nav with treatments dropdown
│   └── Footer.tsx                  # Footer with treatment links
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

### City-Specific Routes
- `/sofia/orthodontics` - City + treatment page
- `/plovdiv/implants` - etc.
- `/varna/cosmetic-dentistry` - etc.

Each city page includes:
- City-specific intro paragraph
- Partner clinics list (mock data)
- Local FAQ (5+ questions)
- Pricing ranges (marked "ориентировъчни")
- Link back to canonical treatment page

### Supported Cities
- sofia (София)
- plovdiv (Пловдив)
- varna (Варна)

## SEO Implementation

### JSON-LD Schema
- **Sitewide (layout.tsx)**: Organization, WebSite
- **Per page**: BreadcrumbList, FAQPage (from FAQ data)
- **City pages**: LocalBusiness/Dentist

### OG Images
All OG/Twitter images use production URLs:
- `https://zubite.bg/og/og-home.jpg`
- `https://zubite.bg/og/og-orthodontics.jpg`
- `https://zubite.bg/og/og-implants.jpg`
- `https://zubite.bg/og/og-cosmetic.jpg`
- `https://zubite.bg/og/og-sleep.jpg`
- `https://zubite.bg/og/og-tmj.jpg`

### Sitemap & Robots
- `/sitemap.xml` - Generated dynamically with all routes
- `/robots.txt` - Allows indexing, disallows admin/quiz/results

### Hreflang
- Removed EN hreflang alternates (EN pages not built)

## Key Features

### Implemented ✅
1. **Treatment-First Architecture** - Primary routes are treatments
2. **5 Treatment Pages** - Orthodontics, Implants, Cosmetic, Sleep, TMJ
3. **15 City-Treatment Pages** - 3 cities × 5 treatments
4. **SEO-Optimized** - JSON-LD, OG images, sitemap, robots.txt
5. **City-Specific Content** - FAQs, clinics, pricing per city
6. **Interactive Quizzes** - Client-side with contact forms
7. **Lead Management** - Creation, scoring, email notifications
8. **Admin Panel** - Login, dashboard, leads management

## API Endpoints
- `POST /api/leads` - Create lead
- `GET /api/leads/{id}` - Get lead
- `POST /api/admin/login` - Admin auth
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/leads` - List leads

## Pending/Future Tasks

### P1 - High Priority
- [ ] Replace placeholder OG images with real designs
- [ ] Add Meta Pixel ID for tracking
- [ ] Add Google Ads Conversion ID
- [ ] Build production bundle

### P2 - Medium Priority
- [ ] Add more clinic data (real partnerships)
- [ ] Implement Google Analytics
- [ ] Add appointment scheduling

### P3 - Future
- [ ] English translation
- [ ] More cities
- [ ] Blog/content section

## Admin Credentials
- Email: `admin@zubite.bg`
- Password: `password`

---
*Last updated: December 2025*
