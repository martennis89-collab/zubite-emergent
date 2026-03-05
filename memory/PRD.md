# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with light theme (white/sky-blue accents)
- **Email**: Resend for lead notifications

## Recent Updates (December 2025)

### Implants Page Restructure
New page structure following Educate → Qualify → Capture Lead flow:

1. **HERO**: H1 "Зъбни импланти – трайно решение за липсващи зъби"
   - Primary CTA: "Заяви обаждане" → #lead-form
   - Secondary CTA: "Направи бърза оценка" → /implants/quiz
   - 3 Trust cards
2. **HOW ZUBITE WORKS**: 3 steps (Оценка/обаждане → Информация/цени → Избор на специалист)
3. **WHEN IMPLANTS ARE USED**: 4 use cases
4. **TYPES OF IMPLANT TREATMENTS**: 4 cards (Единичен, Мост, All-on-4/6, Стабилизиране)
5. **IMPLANT SYSTEMS**: Straumann, Nobel Biocare, Osstem, Megagen + disclaimer
6. **INDICATIVE PRICES**: EUR primary, BGN secondary
7. **BEFORE YOU CHOOSE IMPLANTS**: 4 factors to consider
8. **FAQ**: 6 questions
9. **LEAD FORM**: Full capture form

### Lead Capture Form Component
New reusable component `/app/nextjs-seo/components/LeadCaptureForm.tsx`:
- Fields: Име, Телефон*, Град, Какъв проблем имате, Consent checkbox
- Submits to /api/leads endpoint
- Success message: "Благодарим! Нашият екип ще се свърже с вас скоро."
- Sends email notification + stores in dashboard

### Pricing System (EUR Primary, BGN Secondary)

#### Implants
| Treatment | EUR | BGN |
|-----------|-----|-----|
| Единичен имплант | €700 – €2,000 | ≈ 1,400 – 4,000 лв. |
| Имплант + корона | €1,200 – €3,000 | ≈ 2,400 – 6,000 лв. |
| All-on-4 | €5,000 – €9,000 | ≈ 10,000 – 18,000 лв. |

#### Orthodontics
| Treatment | EUR | BGN |
|-----------|-----|-----|
| Алайнери | €1,500 – €6,000 | ≈ 3,000 – 12,000 лв. |
| Брекети | €1,000 – €4,000 | ≈ 2,000 – 8,000 лв. |

### Tone Guidelines
**Lifestyle premium but medically responsible:**
- ❌ Avoid: "100% безболезнено", "гарантиран резултат"
- ✅ Use: "обикновено", "в повечето случаи", "според случая"

## Page Structures

### /orthodontics (SEO → Quiz → Request a Call)
1. Hero: H1 "Алайнери или брекети?"
2. How It Works (3 steps)
3. Aligners vs Braces (comparison cards)
4. Aligner Brands (Invisalign, Spark, Angel Aligner)
5. Prices (EUR/BGN)
6. Common Orthodontic Problems (SEO)
7. Children Orthodontics
8. Decision Section
9. FAQ
10. Final CTA

### /implants (Educate → Qualify → Capture Lead)
1. Hero: H1 "Зъбни импланти – трайно решение за липсващи зъби"
2. How Zubite Works (3 steps)
3. When Implants Used (4 use cases)
4. Types of Implant Treatments (4 cards)
5. Implant Systems (Straumann, Nobel Biocare, Osstem, Megagen)
6. Indicative Prices (EUR/BGN)
7. Before You Choose Implants (4 factors)
8. FAQ (6 questions)
9. Lead Form

## Current Architecture

```
/app/nextjs-seo/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── orthodontics/
│   │   ├── page.tsx                # Orthodontics page (SEO → Quiz)
│   │   └── quiz/page.tsx
│   ├── implants/
│   │   ├── page.tsx                # Implants page (Educate → Qualify → Lead)
│   │   └── quiz/page.tsx
│   ├── aligners-comparison/        # Brand comparison SEO page
│   ├── [city]/[treatment]/         # City+treatment pages
│   └── ...
│
├── components/
│   ├── TreatmentQuiz.tsx
│   ├── LeadCaptureForm.tsx         # NEW: Reusable lead form
│   ├── FAQAccordion.tsx
│   └── ...
│
├── lib/
│   ├── pricing.ts                  # Centralized pricing (EUR primary)
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

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking
- [ ] Add Google Ads Conversion ID

### P2 - Medium Priority
- [ ] Replace placeholder OG images
- [ ] Add real clinic partnerships

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities

---
*Last updated: December 2025*
*Latest changes: Implants page restructure with lead capture form*
