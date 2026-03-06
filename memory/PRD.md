# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with light theme (white/sky-blue accents)
- **Email**: Resend for lead notifications

## Lead Qualification Flow (Updated December 2025)

**Important**: The lead capture form is ONLY shown at the end of the quiz, not on treatment pages. This ensures patient qualification before capturing leads.

**Flow:**
1. User visits treatment page (e.g., `/cosmetic-dentistry`)
2. User clicks "Направи бърза оценка" (single CTA)
3. User goes through quiz questions
4. At end of quiz, user sees lead capture form ("Заяви обаждане")
5. Lead is submitted and stored

## Standardized Page Structure (All Treatment Pages)

All treatment pages follow this consistent structure:
1. **HERO**: H1, Single CTA "Направи бърза оценка" → quiz, 3 Trust cards
2. **HOW ZUBITE WORKS**: 3 steps (Оценка → Разбирате възможностите → Избор на специалист)
3. **SYMPTOMS/PROBLEMS**: What the treatment can address
4. **TREATMENT OPTIONS**: Available treatments/methods
5. **COMPARISON SECTION**: Treatment-specific comparison
6. **CONSIDERATIONS**: When other treatment may be needed first
7. **INDICATIVE PRICES**: EUR primary, BGN secondary
8. **WHO THIS IS FOR**: Suitable candidates
9. **FAQ**: 6 questions with accordion
10. **FINAL CTA**: "Направи бърза оценка" button to quiz
11. **EDUCATIONAL DISCLAIMER**
12. **FOOTER**: Dynamic city links based on current treatment

**NO lead form on treatment pages** - only at end of quiz.

## Completed Treatment Pages (December 2025)

All pages tested and verified ✅:
- `/orthodontics`
- `/implants`
- `/cosmetic-dentistry`
- `/sleep-airway`
- `/tmj`

## Footer City Links (Dynamic)

Footer component accepts `treatmentSlug` prop and generates correct city links:
- From `/cosmetic-dentistry` → Sofia link points to `/sofia/cosmetic-dentistry`
- From `/implants` → Sofia link points to `/sofia/implants`
- etc.

## Pricing System (EUR Primary, BGN Secondary)

### Orthodontics
| Treatment | EUR | BGN |
|-----------|-----|-----|
| Алайнери | €1,500 – €6,000 | ≈ 3,000 – 12,000 лв. |
| Брекети | €1,000 – €4,000 | ≈ 2,000 – 8,000 лв. |

### Implants
| Treatment | EUR | BGN |
|-----------|-----|-----|
| Единичен имплант | €800 – €2,000 | ≈ 1,600 – 4,000 лв. |
| All-on-4 | €6,000 – €20,000 | ≈ 12,000 – 40,000 лв. |

### Cosmetic Dentistry
| Treatment | EUR | BGN |
|-----------|-----|-----|
| Избелване | €100 – €250 | ≈ 200 – 500 лв. |
| Фасети | €200 – €600/зъб | ≈ 400 – 1,200 лв. |
| Бондинг | €75 – €200/зъб | ≈ 150 – 400 лв. |

### Sleep Apnea
| Treatment | EUR | BGN |
|-----------|-----|-----|
| MAD апарат | €500 – €2,500 | ≈ 1,000 – 5,000 лв. |

### TMJ
| Treatment | EUR | BGN |
|-----------|-----|-----|
| Стабилизираща шина | €150 – €400 | ≈ 300 – 800 лв. |
| Нощна шина | €100 – €250 | ≈ 200 – 500 лв. |

## Key Components

### LeadCaptureForm (`/components/LeadCaptureForm.tsx`)
- Used ONLY at end of quiz
- Fields: Име, Телефон*, Град, Какъв проблем имате, Consent checkbox
- Submits to /api/leads endpoint

### Footer (`/components/Footer.tsx`)
- Props: `treatmentSlug?: string` (defaults to 'orthodontics')
- Generates dynamic city links based on current treatment

### TreatmentQuiz (`/components/TreatmentQuiz.tsx`)
- Generic quiz component
- Shows lead form at end after qualification

### Centralized Pricing (`/lib/pricing.ts`)
- Single source of truth for all prices
- EUR primary, BGN secondary format

## Current Architecture

```
/app/nextjs-seo/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── orthodontics/page.tsx       # ✅ Updated
│   ├── implants/page.tsx           # ✅ Updated
│   ├── cosmetic-dentistry/page.tsx # ✅ Updated
│   ├── sleep-airway/page.tsx       # ✅ Updated
│   ├── tmj/page.tsx                # ✅ Updated
│   ├── [treatment]/quiz/page.tsx   # Quiz pages with lead form
│   ├── aligners-comparison/        # Brand comparison SEO page
│   ├── [city]/[treatment]/         # City+treatment pages
│   └── admin/                      # Admin dashboard
│
├── components/
│   ├── Footer.tsx                  # Updated with treatmentSlug prop
│   ├── LeadCaptureForm.tsx         # Used in quiz only
│   ├── TreatmentQuiz.tsx           # Quiz component
│   ├── FAQAccordion.tsx
│   └── ...
│
├── lib/
│   ├── pricing.ts                  # Centralized pricing
│   ├── data.ts, api.ts, schema.ts
│
└── public/
```

## Admin Panel
- **Email**: `admin@zubite.bg`
- **Password**: `password`

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking (awaiting user input)
- [ ] Add Google Ads Conversion ID (awaiting user input)

### P2 - Medium Priority
- [ ] Replace placeholder OG images
- [ ] Enhance admin panel for content management

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities
- [ ] Delete obsolete `/app/frontend` directory

---
*Last updated: December 2025*
*Latest changes: Removed lead form from treatment pages (only at end of quiz), fixed footer city links to be dynamic per treatment*
