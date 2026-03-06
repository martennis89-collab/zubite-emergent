# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with light theme (white/sky-blue accents)
- **Email**: Resend for lead notifications

## Standardized Page Structure (All Treatment Pages)

All treatment pages follow this consistent structure:
1. **HERO**: H1, Primary CTA "Заяви обаждане" → #lead-form, Secondary CTA "Направи бърза оценка" → quiz, 3 Trust cards
2. **HOW ZUBITE WORKS**: 3 steps (Оценка/обаждане → Разбирате възможностите → Избор на специалист)
3. **SYMPTOMS/PROBLEMS**: What the treatment can address
4. **TREATMENT OPTIONS**: Available treatments/methods
5. **COMPARISON SECTION**: Treatment-specific comparison (e.g., Aligners vs Braces, Oral Appliance vs CPAP)
6. **CONSIDERATIONS**: When other treatment may be needed first
7. **INDICATIVE PRICES**: EUR primary, BGN secondary
8. **WHO THIS IS FOR**: Suitable candidates
9. **FAQ**: 6 questions with accordion
10. **LEAD FORM**: Reusable LeadCaptureForm component
11. **EDUCATIONAL DISCLAIMER**

## Completed Treatment Pages (December 2025)

### ✅ /orthodontics
- H1: "Алайнери или брекети? Разберете кое е подходящо за вас"
- Comparison: Aligners vs Braces
- Brand section: Invisalign, Spark, Angel Aligner
- Tested & verified

### ✅ /implants
- H1: "Зъбни импланти – трайно решение за липсващи зъби"
- Types: Единичен, Мост, All-on-4/6, Стабилизиране
- Systems: Straumann, Nobel Biocare, Osstem, Megagen
- Tested & verified

### ✅ /cosmetic-dentistry
- H1: "Естетична стоматология – бондинг, фасети, избелване и smile design"
- Comparison: Veneers vs Bonding
- Prices: Whitening €100-€250, Veneers €200-€600/tooth, Bonding €75-€200/tooth
- Tested & verified

### ✅ /sleep-airway
- H1: "Сънна апнея и хъркане – орални апарати и дентални решения"
- Comparison: Oral Appliance vs CPAP
- Prices: MAD €500-€2500, TRD €300-€800
- Tested & verified

### ✅ /tmj
- H1: "TMJ дисфункция – болка в челюстта, щракане и лечение"
- Comparison: Stabilizing Splint vs Night Guard
- Prices: Splint €150-€400, Night Guard €100-€250
- Tested & verified

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
- Fields: Име, Телефон*, Град, Какъв проблем имате, Consent checkbox
- Submits to /api/leads endpoint
- Success message: "Благодарим! Нашият екип ще се свърже с вас скоро."

### Centralized Pricing (`/lib/pricing.ts`)
- Single source of truth for all prices
- EUR primary, BGN secondary format
- Price disclaimer constant
- Educational disclaimer constant

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
│   ├── aligners-comparison/        # Brand comparison SEO page
│   ├── [city]/[treatment]/         # City+treatment pages
│   └── admin/                      # Admin dashboard
│
├── components/
│   ├── LeadCaptureForm.tsx         # Reusable lead form
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

## Lead Flow
1. User fills form (Име, Телефон*, Град, Problem, Consent)
2. Form submits to POST /api/leads
3. Lead stored in MongoDB
4. Email notification sent via Resend
5. Visible in admin dashboard at /admin/dashboard

## Admin Panel
- **Email**: `admin@zubite.bg`
- **Password**: `password`

## Pending/Future Tasks

### P0 - Critical
- [x] Update all treatment pages with standardized structure
- [ ] Audit footer city links (ensure correct treatment routing)

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
*Latest changes: All 5 treatment pages (orthodontics, implants, cosmetic-dentistry, sleep-airway, tmj) updated with standardized structure and tested*
