# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with light theme (white/sky-blue accents)
- **Email**: Resend for lead notifications

## Recent Updates (December 2025)

### Orthodontics Page Restructure
New page structure following SEO → Quiz → Request a Call flow:

1. **HERO**: H1 "Алайнери или брекети? Намерете правилното ортодонтско лечение"
   - CTA: "Виж дали си подходящ за алайнери" → /orthodontics/quiz
2. **HOW IT WORKS**: 3 steps (Answer questions → Get recommendation → Help choosing specialist)
3. **ALIGNERS VS BRACES**: Comparison cards with pros/cons
4. **ALIGNER BRANDS**: Invisalign, Spark, Angel Aligner comparison
5. **PRICES**: EUR primary, BGN secondary
6. **COMMON ORTHODONTIC PROBLEMS**: SEO section (криви зъби, струпани зъби, etc.)
7. **CHILDREN ORTHODONTICS**: When to see orthodontist (age ~7)
8. **DECISION SECTION**: Quiz benefits explanation
9. **FAQ**: 6 specified questions
10. **FINAL CTA**: Start quiz

**Removed**: Clinics, rankings, city pages from main content

### Brand Comparison (Subtle Pro-Invisalign)
- Invisalign, Spark, Angel Aligner compared neutrally
- Disclaimer: "Най-важният фактор е опитът на ортодонта и правилната диагноза. Марката сама по себе си не гарантира резултат."
- No claims of brand superiority

### Pricing System (EUR Primary, BGN Secondary)
| Treatment | EUR | BGN |
|-----------|-----|-----|
| Алайнери | €1,500 – €6,000 | ≈ 3,000 – 12,000 лв. |
| Брекети | €1,000 – €4,000 | ≈ 2,000 – 8,000 лв. |
| Имплант (1 зъб) | €800 – €2,000 | ≈ 1,600 – 4,000 лв. |
| All-on-4/6 | €6,000 – €20,000+ | ≈ 12,000 – 40,000+ лв. |

### Key Disclaimers
- **Price**: "Цените са ориентировъчни и зависят от сложност, план и клиника."
- **Brand**: "Най-важният фактор е опитът на ортодонта и правилната диагноза."
- **Educational**: "Информацията е образователна и не замества преглед."

## Target Audience
- Adults considering orthodontic treatment
- Parents of children with orthodontic issues

## Page Goal
SEO → Quiz → Request a Call
- Primary CTA everywhere: Start Quiz
- Do NOT show: clinics, rankings, city pages in main content

## Current Architecture

```
/app/nextjs-seo/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── orthodontics/
│   │   ├── page.tsx                # NEW: Restructured orthodontics page
│   │   └── quiz/page.tsx           # Quiz with city selection
│   ├── aligners-comparison/        # Brand comparison SEO page
│   ├── [city]/[treatment]/         # City+treatment pages
│   └── ...
│
├── components/
│   ├── TreatmentQuiz.tsx
│   ├── FAQAccordion.tsx
│   └── ...
│
├── lib/
│   ├── pricing.ts                  # Centralized pricing (EUR primary)
│   ├── data.ts, api.ts, schema.ts
│
└── public/
```

## SEO Keywords (Natural Usage)
- ортодонт
- брекети
- алайнер
- invisalign
- цена
- криви зъби
- неправилна захапка

## Common Orthodontic Problems (SEO)
1. Криви зъби
2. Струпани зъби (crowding)
3. Неправилна захапка
4. Дълбока захапка (overbite)
5. Кръстосана захапка (crossbite)

## Children Orthodontics
- First visit: ~7 years old
- Symptoms to watch:
  - Mouth breathing
  - Crowding
  - Bite problems
  - Difficulty chewing
  - Early/late loss of baby teeth
  - Thumb sucking after age 5

## Quiz Flow
1. City Selection
2. 5 Quiz Questions
3. Result (Green/Yellow/Red)
4. Contact Form (optional)

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
*Latest changes: Orthodontics page restructure (SEO → Quiz → Request a Call flow)*
