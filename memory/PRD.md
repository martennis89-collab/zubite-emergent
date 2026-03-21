# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is an educational orthodontic platform helping Bulgarian users understand their dental/orthodontic issues and guide them toward professional evaluation. The platform assesses the user's current stage and captures their contact details so Zubite.bg can recommend 3 suitable clinic options.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with white/sky-blue accents
- **Email**: Resend for lead notifications

## Core User Flow
```
Homepage → Quiz (10 questions with micro-insights) → Result Stage → Soft Commit → Lead Form (A/B) → Success Screen
```

---

## Master Quiz System v3 (December 2025)

### Features

#### 1. Micro-Insights Between Questions
Psychological triggers inserted AFTER specific questions:

| After Q# | Insight Text |
|----------|--------------|
| Q2 | „Повечето хора с такива усещания нямат болка… но това често е началото." |
| Q5 | „Около 60% от хората имат подобни признаци — но малко от тях действат навреме." |
| Q6 | „Остава малко — почти си готов." |
| Q8 | „Когато се стигне до износване, решението рядко остава толкова лесно, колкото в началото." |

#### 2. Soft Commit Screen (After Result, Before Form)
- **Headline**: „Искаш ли да видиш какви са опциите ти оттук нататък?"
- **Subtext**: „Можем да ти препоръчаме 3 подходящи клиники според твоя резултат и град."
- **Primary CTA**: „Да, покажете ми опциите" → Form
- **Secondary**: „Не сега" → Exit Screen

#### 3. Exit Screen (For "Not Now" Users)
- **Text**: „Разбираемо. Ако решиш по-късно, винаги можеш да провериш отново."
- **Button**: „Обратно към началото"

#### 4. Lead Form A/B Testing
**Version A (Full)**: Име*, Телефон*, Имейл, Град*
**Version B (Simplified)**: Телефон*, Град*

#### 5. Analytics Tracking
Every interaction is tracked: quiz_start, question_answered, quiz_completed, soft_commit, form_submitted

---

## Admin Analytics Dashboard (/admin/analytics)

### Metrics Tracked
- Quiz start/completion rates
- Drop-off per question
- Question-by-question answer distribution
- Result stage distribution
- Form A/B test conversion comparison
- Leads per day (30 day chart)
- Leads by city breakdown

---

## Architecture

```
/app/frontend/
├── app/
│   ├── page.tsx                    # Homepage (uses AnimatedHomeSections)
│   ├── api/revalidate/route.ts     # NEW: On-demand ISR revalidation
│   ├── quiz/page.tsx               # Master quiz
│   ├── admin/
│   │   ├── page.tsx                # Login
│   │   ├── dashboard/              # Leads dashboard
│   │   ├── analytics/              # Analytics dashboard
│   │   └── blog/                   # Blog management
│   ├── blog/                       # Public blog pages
│   ├── privacy/cookies/terms/      # GDPR pages
│   └── ...
│
├── components/
│   ├── AnimatedHomeSections.tsx    # NEW: Animated homepage sections
│   ├── MasterQuiz.tsx              # Quiz with micro-insights, A/B form
│   ├── CookieConsent.tsx           # GDPR cookie banner
│   └── ...
│
├── hooks/
│   └── useScrollAnimation.tsx      # Scroll animation hook with effects

/app/backend/
└── server.py                       # FastAPI with revalidation integration
```

---

## Admin Panel
- **URL**: /admin
- **Email**: `admin@zubite.bg`
- **Password**: `password`

---

## Completed Work

### ✅ March 21, 2026 - Homepage Animations & Blog Revalidation
- **Homepage Scroll Animations**: Implemented scroll-triggered animations using IntersectionObserver
  - ScrollReveal component with fade-up, fade-down, fade-left, fade-right, zoom, flip effects
  - StaggerChildren for staggered reveal of list items
  - Hover effects on all interactive elements (buttons, cards, links)
  - Soft pulse animation on mobile CTA
- **On-Demand Blog Revalidation**: Blog posts now appear instantly after creation/update/deletion
  - Created `/api/revalidate` API route in Next.js
  - Backend triggers revalidation via `asyncio.create_task` after blog CRUD
  - Revalidates `/`, `/blog`, and `/blog/[slug]` paths

### ✅ Previous Work
- Quiz system with micro-insights, soft-commit, A/B testing
- Admin analytics dashboard
- Blog CMS with Google Drive image support and Cyrillic-to-Latin slug
- GDPR compliance (Privacy, Cookies, Terms pages + cookie consent banner)
- Homepage copy optimization for psychological tension

---

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking (awaiting user input)
- [ ] Add Google Ads Conversion ID (awaiting user input)

### P2 - Medium Priority
- [ ] Backend refactoring (split server.py into routers)
- [ ] Frontend API client centralization
- [ ] Replace placeholder OG images

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities beyond София and Пловдив
- [ ] Create specific quizzes for other treatments

---

## Technical Notes

### On-Demand Revalidation
- **Endpoint**: `/api/revalidate` (POST/GET)
- **Secret**: Set via `REVALIDATE_SECRET` env var (default: `zubite-revalidate-secret-2024`)
- **Trigger**: Backend calls after blog post create/update/delete
- **Paths revalidated**: `/`, `/blog`, `/blog/[slug]`

### Scroll Animation System
- **Hook**: `useScrollAnimation` in `/app/frontend/hooks/useScrollAnimation.tsx`
- **Components**: `ScrollReveal`, `StaggerChildren`, `useParallax`, `useCountUp`
- **Usage**: Client-side components in `AnimatedHomeSections.tsx`

---

*Last updated: March 21, 2026*
*Latest changes: Homepage scroll animations and on-demand blog revalidation*
