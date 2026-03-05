# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with light theme (white/sky-blue accents)
- **Email**: Resend for lead notifications

## Recent Updates (December 2025)

### SEO & Content Optimization
- **Homepage Copy Update**: New hero subheadline emphasizing recommendations + prices + 2-3 clinic options
- **Trust Statements**: Replaced fake testimonials with genuine trust indicators
- **Centralized Pricing**: Single source of truth in `/app/nextjs-seo/lib/pricing.ts`
- **Content-Rich City Pages**: Added explanation sections, "when to seek specialist" bullets, internal links
- **Price Format**: BGN primary with EUR in parentheses (€1 ≈ 2.00 лв display approximation)

### Pricing Ranges (from centralized config)
| Treatment | BGN | EUR |
|-----------|-----|-----|
| Ортодонтия (Алайнери) | 3,000 – 12,000 лв. | €1,500 – €6,000 |
| Ортодонтия (Брекети) | 2,000 – 8,000 лв. | €1,000 – €4,000 |
| Имплант (1 зъб) | 1,600 – 4,000 лв. | €800 – €2,000 |
| All-on-4/6 (една челюст) | 12,000 – 40,000+ лв. | €6,000 – €20,000+ |
| Фасети (на зъб) | 500 – 1,800 лв. | €250 – €900 |
| Бондинг (на зъб) | 160 – 500 лв. | €80 – €250 |
| Избелване | 300 – 800 лв. | €150 – €400 |
| TMJ терапия | 400 – 3,000 лв. | €200 – €1,500 |
| Сънна апнея | 1,000 – 5,000 лв. | €500 – €2,500 |

## Current Architecture

```
/app/nextjs-seo/
├── app/
│   ├── page.tsx                    # Homepage with updated copy & trust statements
│   ├── layout.tsx                  # Root layout with JSON-LD
│   ├── sitemap.ts                  # Dynamic sitemap
│   │
│   ├── orthodontics/
│   │   ├── page.tsx                # Treatment page with Aligners vs Braces Quiz
│   │   └── quiz/page.tsx           # Treatment-first quiz with city selection
│   ├── implants/, cosmetic-dentistry/, sleep-airway/, tmj/
│   │
│   ├── [city]/[treatment]/         # Content-rich city+treatment pages
│   │   ├── page.tsx                # With explanation, when to seek, pricing, FAQs, internal links
│   │   └── quiz/page.tsx
│   │
│   ├── admin/                      # Password-protected admin panel
│   ├── aligners-vs-braces/, invisalign-price/, etc.  # SEO pages
│   └── ...
│
├── components/
│   ├── TreatmentQuiz.tsx           # Quiz with city selection
│   ├── AlignersVsBracesQuiz.tsx    # Interactive quiz
│   └── ...
│
├── lib/
│   ├── pricing.ts                  # NEW: Centralized pricing config (single source of truth)
│   ├── data.ts                     # Cities, treatments, FAQs
│   ├── api.ts, schema.ts, utils.ts
│
└── public/
```

## Quiz Flow

### Treatment-First Quiz
1. **City Selection**: User selects their city (Sofia, Plovdiv, Varna)
2. **Quiz Questions**: 5 questions about intent, timing, priorities
3. **Result**: Green/Yellow/Red outcome with link to city-specific page
4. **Contact Form**: Request a call (optional)

### Aligners vs Braces Quiz (on /orthodontics)
- 5 questions with weighted scoring
- Recommends: Aligners, Braces, or Either (needs consultation)

## SEO Strategy

### Content Structure
- **Homepage**: Treatment selection + trust statements
- **Treatment Pages**: Overview + Aligners vs Braces quiz (orthodontics)
- **City+Treatment Pages**: Explanation, when to seek, pricing, FAQs, internal links
- **Topic Clusters**: /aligners-vs-braces, /invisalign-price, /crooked-teeth, etc.

### Metadata
- Unique `<title>` and `<meta description>` per page
- Canonical URLs: `https://zubite.bg/...`
- JSON-LD: Organization, WebSite, BreadcrumbList, FAQPage

### Disclaimers
- **Price**: "Цените са ориентировъчни и зависят от сложност, план и клиника."
- **Educational**: "Информацията е образователна и не замества преглед."
- **Orthodontics Complex**: "При много сложни случаи с висока сложност и лечение при топ специалисти, цената може да достигне горната граница."

## Admin Panel

### Credentials
- **Email**: `admin@zubite.bg`
- **Password**: `password`

### Features
- Dashboard with stats
- Lead list with filters
- Lead detail view
- Status management

## API Endpoints
- `POST /api/leads` - Create lead
- `POST /api/admin/login` - Admin auth
- `GET /api/admin/leads` - List leads
- `GET /api/admin/leads/{id}` - Get lead detail

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking
- [ ] Add Google Ads Conversion ID

### P2 - Medium Priority
- [ ] Replace placeholder OG images
- [ ] Add real clinic data (partnerships)
- [ ] Google Analytics integration

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities (Burgas, Stara Zagora, etc.)
- [ ] Blog/content section
- [ ] User reviews system

---
*Last updated: December 2025*
*Latest changes: SEO content optimization, centralized pricing, trust statements, content-rich city pages*
