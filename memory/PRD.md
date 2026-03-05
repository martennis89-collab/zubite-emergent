# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with light theme (white/sky-blue accents)
- **Email**: Resend for lead notifications

## Recent Updates (December 2025)

### Content Restructure
- **Removed fake clinics**: Replaced example clinic lists with "Как подбираме опции за клиники" and "Какво ще получите" sections
- **Brand Comparison**: Added Invisalign vs Spark vs Angel Aligner comparison to orthodontics page
- **New SEO Page**: Created `/aligners-comparison` page with comprehensive brand comparison
- **Updated Trust Statements**: Replaced fake testimonials with genuine trust indicators
- **Homepage Copy**: Added line about comparing aligner brands

### Pricing System (EUR Primary, BGN Secondary)
| Treatment | EUR | BGN |
|-----------|-----|-----|
| Алайнери | €1,500 – €6,000 | ≈ 3,000 – 12,000 лв. |
| Брекети | €1,000 – €4,000 | ≈ 2,000 – 8,000 лв. |
| Имплант (1 зъб) | €800 – €2,000 | ≈ 1,600 – 4,000 лв. |
| All-on-4/6 | €6,000 – €20,000+ | ≈ 12,000 – 40,000+ лв. |
| Фасети (на зъб) | €250 – €900 | ≈ 500 – 1,800 лв. |
| Бондинг (на зъб) | €80 – €250 | ≈ 160 – 500 лв. |
| Избелване | €150 – €400 | ≈ 300 – 800 лв. |
| TMJ терапия | €200 – €1,500 | ≈ 400 – 3,000 лв. |
| Сънна апнея | €500 – €2,500 | ≈ 1,000 – 5,000 лв. |

### Key Disclaimers
- **Price**: "Цените са ориентировъчни и зависят от сложност, план и клиника."
- **Brand**: "Най-важният фактор е опитът на ортодонта и правилната диагноза. Марката сама по себе си не гарантира резултат."
- **Educational**: "Информацията е образователна и не замества преглед."
- **Aligners Complex**: "При много сложни случаи при топ специалисти може да достигне горната граница."

## Current Architecture

```
/app/nextjs-seo/
├── app/
│   ├── page.tsx                    # Homepage with updated trust statements
│   ├── layout.tsx, sitemap.ts
│   │
│   ├── orthodontics/
│   │   ├── page.tsx                # With brand comparison section
│   │   └── quiz/page.tsx
│   ├── implants/, cosmetic-dentistry/, sleep-airway/, tmj/
│   │
│   ├── aligners-comparison/        # NEW: Brand comparison SEO page
│   │   └── page.tsx
│   │
│   ├── [city]/[treatment]/         # Content-rich city+treatment pages
│   │   └── page.tsx                # No fake clinics, has "what you get" section
│   │
│   ├── admin/
│   ├── aligners-vs-braces/, invisalign-price/, etc.
│   └── ...
│
├── components/
│   ├── TreatmentQuiz.tsx, AlignersVsBracesQuiz.tsx
│   └── ...
│
├── lib/
│   ├── pricing.ts                  # Centralized pricing (EUR primary, BGN secondary)
│   │                               # Includes ALIGNER_BRANDS, HOW_WE_SELECT_CLINICS,
│   │                               # WHAT_YOU_GET, and all disclaimers
│   ├── data.ts, api.ts, schema.ts
│
└── public/
```

## Aligner Brands Comparison

### Invisalign
- Suitable cases: Mild to complex (depends on plan and doctor)
- Comfort: High comfort, thin material (may vary)
- Aesthetics: Nearly invisible
- Availability: Widely available in Bulgaria
- Price: €2,000 – €6,000 (≈ 4,000 – 12,000 лв.)

### Spark
- Suitable cases: Mild to moderate (depends on plan and doctor)
- Comfort: High comfort, clearer material (may vary)
- Aesthetics: Nearly invisible
- Availability: Growing availability in Bulgaria
- Price: €1,800 – €5,000 (≈ 3,600 – 10,000 лв.)

### Angel Aligner
- Suitable cases: Mild to moderate (depends on plan and doctor)
- Comfort: Good comfort (may vary)
- Aesthetics: Nearly invisible
- Availability: Available in select clinics
- Price: €1,500 – €4,000 (≈ 3,000 – 8,000 лв.)

## Quiz Flow

### Treatment-First Quiz
1. **City Selection**: User selects their city
2. **Quiz Questions**: 5 questions about intent, timing, priorities
3. **Result**: Green/Yellow/Red outcome
4. **Contact Form**: Request a call

### Aligners vs Braces Quiz
- 5 questions with weighted scoring
- Recommends: Aligners, Braces, or Either

## SEO Strategy

### Content Pages
- **Homepage**: Treatment selection + trust statements + brand mention
- **Treatment Pages**: Overview + brand comparison (orthodontics)
- **City+Treatment Pages**: Explanation, when to seek, pricing (EUR), "what you get", FAQs
- **Topic Clusters**: /aligners-comparison, /aligners-vs-braces, /invisalign-price, etc.

### Metadata
- Unique `<title>` and `<meta description>` per page
- Canonical URLs
- JSON-LD: Organization, WebSite, BreadcrumbList, FAQPage

## Admin Panel

### Credentials
- **Email**: `admin@zubite.bg`
- **Password**: `password`

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking
- [ ] Add Google Ads Conversion ID

### P2 - Medium Priority
- [ ] Replace placeholder OG images
- [ ] Add real clinic partnerships
- [ ] Google Analytics integration

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities
- [ ] Blog/content section

---
*Last updated: December 2025*
*Latest changes: EUR primary pricing, brand comparison, removed fake clinics, added "what you get" sections*
