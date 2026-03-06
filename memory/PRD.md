# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is a dental solutions navigator platform that helps Bulgarian users find the right dental treatment and connect with verified clinics in their city.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with light theme (white/sky-blue accents)
- **Email**: Resend for lead notifications

## Lead Qualification Flow

**Important**: Lead capture form is ONLY shown at the end of quizzes. Treatment pages guide users to quizzes for qualification.

## Orthodontics Quiz System (Updated December 2025)

### Quiz Flow
`Intro → 8 Questions → Result Screen → Lead Form → Success`

### Intro Screen
- Title: "Разберете дали ортодонтско лечение може да е подходящо за вас"
- Disclaimer: "Този въпросник не замества преглед от специалист"
- CTA: "Започнете оценката"
- Info: "8 въпроса • ~60–90 секунди"

### 8 Questions with Scoring

| Q# | Question | Options & Scores |
|----|----------|------------------|
| 1 | Какъв е основният проблем? | crooked(+2), spaces(+2), bite(+3), aesthetic(+1), unsure(0) |
| 2 | За кого е лечението? | adult(+2), child(+2), unsure(0) |
| 3 | Имали ли сте брекети преди? | never(+2), relapse(+4), ongoing(0), unsure(+1) |
| 4 | Захапката ви не е правилна? | yes(+4), sometimes(+2), no(0), unsure(+1) |
| 5 | Проблеми с венците? | no(+2), bleeding(0), periodontal(-2), unsure(0) |
| 6 | Приблизителна цена? | under_1000(-2), 1000-3000(+2), 3000-6000(+3), over_6000(+1), unsure(+1) |
| 7 | Инвестиция от няколко хиляди евро? | yes(+4), maybe(+2), unsure(+1), no(-3) |
| 8 | Кога бихте започнали? | 3_months(+4), 6_months(+3), 1_year(+1), research(0) |

### Result Bands

| Score | Band | Title |
|-------|------|-------|
| ≥16 | Strong | "Добра новина" |
| 10-15 | Possible | "Възможно е ортодонтско лечение да е подходящо" |
| <10 | Needs Evaluation | "Нужна е по-точна оценка" |

### Lead Priority Tags
- **HIGH**: score ≥16 AND timing ≤6 months
- **MEDIUM**: score 10-15
- **LOW**: score <10

### Lead Form Fields
- Име (optional)
- Телефон * (mandatory)
- Град (София, Пловдив, Варна)
- Какъв е вашият основен проблем? (optional)
- Съгласен съм с обработката на лични данни (mandatory)

### Data Stored
- quiz_score, problem_type, previous_ortho, bite_issue, gum_status
- price_awareness, investment_readiness, timing, city, name, phone
- priority, source, timestamp

## Standardized Treatment Page Structure

All treatment pages follow:
1. **HERO**: H1, Single CTA "Направи бърза оценка" → quiz
2. **HOW ZUBITE WORKS**: 3 steps
3. **SYMPTOMS/PROBLEMS**: What the treatment addresses
4. **TREATMENT OPTIONS**: Available methods
5. **COMPARISON SECTION**: Treatment-specific comparison
6. **CONSIDERATIONS**: When other treatment may be needed
7. **INDICATIVE PRICES**: EUR primary, BGN secondary
8. **WHO THIS IS FOR**: Suitable candidates
9. **FAQ**: 6 questions with accordion
10. **FINAL CTA**: Quiz button
11. **DISCLAIMER**
12. **FOOTER**: Dynamic city links

## Architecture

```
/app/nextjs-seo/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── orthodontics/
│   │   ├── page.tsx                # Treatment page
│   │   └── quiz/page.tsx           # Quiz page
│   ├── implants/
│   ├── cosmetic-dentistry/
│   ├── sleep-airway/
│   ├── tmj/
│   └── admin/
│
├── components/
│   ├── OrthodonticsQuiz.tsx        # NEW: Dedicated ortho quiz
│   ├── TreatmentQuiz.tsx           # Generic quiz for other treatments
│   ├── Footer.tsx                  # Dynamic city links
│   └── ...
│
├── lib/
│   ├── pricing.ts                  # Centralized pricing
│   └── api.ts
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
- [ ] Create dedicated quizzes for other treatments (implants, cosmetic, etc.)

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities
- [ ] Enhance admin panel

---
*Last updated: December 2025*
*Latest changes: New orthodontics quiz with 8 questions, scoring system, and priority tagging*
