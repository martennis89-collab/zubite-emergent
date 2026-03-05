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
│   ├── orthodontics/
│   │   ├── page.tsx                # Treatment page with Aligners vs Braces Quiz
│   │   └── quiz/page.tsx           # NEW: Treatment-first quiz with city selection
│   ├── implants/
│   │   ├── page.tsx
│   │   └── quiz/page.tsx
│   ├── cosmetic-dentistry/
│   │   ├── page.tsx
│   │   └── quiz/page.tsx
│   ├── sleep-airway/
│   │   ├── page.tsx
│   │   └── quiz/page.tsx
│   ├── tmj/
│   │   ├── page.tsx
│   │   └── quiz/page.tsx
│   │
│   ├── [city]/[treatment]/         # City-specific pages (after user selects city)
│   │   ├── page.tsx                # City landing with FAQs, clinics, pricing
│   │   └── quiz/page.tsx           # Legacy city-specific quiz (still works)
│   │
│   ├── admin/                      # Password-protected admin panel
│   │   ├── page.tsx                # Login page
│   │   ├── dashboard/page.tsx      # Leads dashboard with filters
│   │   └── leads/[id]/page.tsx     # Lead detail page
│   │
│   ├── aligners-vs-braces/         # SEO comparison page ✅
│   ├── invisalign-price/           # SEO pricing page ✅
│   ├── what-is-invisalign/         # SEO educational page ✅
│   ├── implant-price/              # SEO pricing page ✅
│   ├── crooked-teeth/              # SEO symptom page ✅
│   │
│   ├── privacy/, terms/, contact/  # Static pages
│   └── symptoms/                   # Symptoms guide
│
├── components/
│   ├── Header.tsx                  # Nav with treatments dropdown
│   ├── Footer.tsx                  # Footer with treatment links
│   ├── FAQAccordion.tsx            # Reusable FAQ component
│   ├── AlignersVsBracesQuiz.tsx    # Interactive quiz on /orthodontics page
│   └── TreatmentQuiz.tsx           # NEW: Shared quiz component with city selection
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

## Quiz Flow (NEW: Treatment-First)

### Quiz Routes
- `/orthodontics/quiz` - Orthodontics quiz
- `/implants/quiz` - Implants quiz
- `/cosmetic-dentistry/quiz` - Cosmetic dentistry quiz
- `/sleep-airway/quiz` - Sleep apnea quiz
- `/tmj/quiz` - TMJ quiz

### Quiz Flow
1. **Step 1: City Selection** - User sees "В кой град търсите лечение?" (Which city are you looking for treatment?)
   - Options: София (Sofia), Пловдив (Plovdiv), Варна (Varna)
2. **Step 2: Quiz Questions** - 5 questions about seriousness, timing, importance, readiness, etc.
   - City indicator shown at top with "Промени" (Change) button
3. **Step 3: Quiz Result** - Green/Yellow/Red outcome based on score
   - Link to city-specific page (e.g., `/plovdiv/orthodontics`)
4. **Step 4: Contact Form** (optional) - Request a call form
5. **Step 5: Success** - Confirmation with link to city page

### Scoring Logic
- Points calculated based on answers (seriousness, timing, importance, readiness)
- **Green (>=70 pts)**: "Отличен кандидат!" - Highly suitable
- **Yellow (>=40 pts)**: "Необходима е допълнителна информация" - Needs consultation
- **Red (<40 pts)**: "Може да има по-добри опции" - Alternative needed

### Aligners vs Braces Quiz (on /orthodontics page)
- Interactive component embedded on orthodontics page
- 5 questions with weighted scoring for aligners vs braces
- Recommendation: Aligners, Braces, or Either (needs consultation)
- Score visualization showing point comparison

## URL Structure

### Primary Routes (Treatment-First)
- `/` - Homepage with treatment selection
- `/orthodontics` - Orthodontics main page (with embedded Aligners vs Braces Quiz)
- `/implants` - Dental implants main page
- `/cosmetic-dentistry` - Cosmetic dentistry main page
- `/sleep-airway` - Sleep apnea main page
- `/tmj` - TMJ main page

### Quiz Routes (Treatment-First with City Selection)
- `/orthodontics/quiz` → City selection → Quiz questions → Result with city page link
- `/implants/quiz` → Same flow
- etc.

### City-Specific Routes (accessed after quiz completion)
- `/sofia/orthodontics` - City + treatment page
- `/plovdiv/implants` - etc.
- `/varna/cosmetic-dentistry` - etc.

### Supported Cities
- sofia (София)
- plovdiv (Пловдив)
- varna (Варна)
- haskovo (Хасково)

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
2. **Treatment-First Quiz with City Selection** - Users choose city before quiz
3. **5 Treatment Pages** - Orthodontics, Implants, Cosmetic, Sleep, TMJ
4. **15+ City-Treatment Pages** - 3 cities × 5 treatments + Haskovo
5. **SEO Topic Clusters** - All content pages complete
6. **Light Theme UI** - White background, sky-blue accents, serif headings
7. **Quiz with Outcome Colors** - Green/yellow/red suitability indicator
8. **Aligners vs Braces Quiz** - Interactive quiz on /orthodontics page
9. **Request a Call** - Form appears after quiz completion
10. **Admin Dashboard** - Password-protected with lead management
11. **SEO-Optimized** - JSON-LD, OG images, sitemap, robots.txt

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking
- [ ] Add Google Ads Conversion ID

### P2 - Medium Priority
- [ ] Replace placeholder OG images with real designs
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
*Latest change: Implemented treatment-first quiz flow with city selection*
