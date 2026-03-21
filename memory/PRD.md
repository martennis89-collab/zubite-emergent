# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is an educational orthodontic platform helping Bulgarian users understand their dental/orthodontic issues and guide them toward professional evaluation. The platform assesses the user's current stage and captures their contact details so Zubite.bg can recommend 3 suitable clinic options.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with white/sky-blue accents
- **Email**: Resend for lead notifications

## Core User Flow (Updated December 2025)
```
Homepage → Quiz (10 questions with micro-insights) → Result Stage → Soft Commit → Lead Form (A/B) → Success Screen
```

---

## Master Quiz System v3 (Updated December 2025)

### New Features

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
**Version A (Full)**:
- Име*
- Телефон*
- Имейл
- Град*

**Version B (Simplified)**:
- Телефон*
- Град*

Form value prop above: „Ще получиш 3 реални препоръки според твоя случай — не просто списък с клиники."

#### 5. Analytics Tracking
Every interaction is tracked:
- `quiz_start` - Session begins
- `question_answered` - Each question with answer, score, time
- `quiz_completed` - Final score, band, total time
- `soft_commit` - Yes/No choice
- `form_submitted` - Form version, city, has_name, has_email

---

## Admin Analytics Dashboard (/admin/analytics)

### Metrics Tracked

#### Quiz Metrics
- Total quiz starts
- Completion rate (%)
- Drop-off per question
- Average time to complete

#### Question Analytics
For each question:
- % "Да"
- % "Понякога" / "Не съм сигурен"
- % "Не"

#### Result Distribution
- % early (Ранен етап)
- % progressing (Развиващ се етап)
- % advanced (Напреднал етап)

#### Funnel Metrics
- Quiz start → Quiz completed
- Quiz completed → Soft commit YES
- Soft commit YES → Form submitted
- Soft commit NO tracked separately

#### Form Analytics
- Leads per day (30 day chart)
- Leads by city (Sofia vs Plovdiv)
- Form Version A vs B conversion comparison

---

## Quiz Questions (10 Questions)
| Q# | Question | Options (Score) |
|----|----------|-----------------|
| 1 | Имаш ли усещане, че някои зъби са леко струпани или застъпени? | Да(2), Понякога(1), Не(0) |
| 2 | Когато захапеш, усещаш ли зъбите си напълно равномерно? | Не(2), Не съм сигурен(1), Да(0) |
| 3 | Дъвчеш ли повече от едната страна, без да се замисляш? | Да(2), Понякога(1), Не(0) |
| 4 | Случва ли се да дишаш през устата (особено нощем)? | Да(2), Понякога(1), Не(0) |
| 5 | Чуваш ли щракане или пукане при отваряне на устата? | Да(2), Понякога(1), Не(0) |
| 6 | Събуждаш ли се с напрежение в челюстта или лицето? | Да(2), Понякога(1), Не(0) |
| 7 | Задържа ли се храна на едни и същи места между зъбите? | Да(2), Понякога(1), Не(0) |
| 8 | Забелязал ли си зъбите ти да изглеждат по-износени с времето? | Да(2), Не съм сигурен(1), Не(0) |
| 9 | Имаш ли главоболие, напрежение във врата или ушите без ясна причина? | Да(2), Понякога(1), Не(0) |
| 10 | Преди този тест мислеше ли, че имаш проблем със зъбите? | Не(2), Не бях сигурен(1), Да(0) |

### Scoring
- **0-5**: Ранен етап (Green)
- **6-12**: Развиващ се етап (Amber)
- **13-20**: Напреднал етап (Red)

---

## Architecture

```
/app/frontend/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── quiz/
│   │   └── page.tsx                # Master quiz
│   ├── admin/
│   │   ├── page.tsx                # Login
│   │   ├── dashboard/              # Leads dashboard
│   │   ├── analytics/              # NEW: Analytics dashboard
│   │   ├── blog/                   # Blog management
│   │   └── leads/                  # Lead details
│   ├── symptoms/
│   ├── orthodontics/
│   └── blog/
│
├── components/
│   └── MasterQuiz.tsx              # v3: Micro-insights, soft commit, A/B form

/app/backend/
└── server.py                       # NEW: /api/analytics/events, /api/admin/analytics
```

---

## Admin Panel
- **URL**: /admin
- **Email**: `admin@zubite.bg`
- **Password**: `password`

**Pages**:
- /admin/dashboard - Leads management
- /admin/analytics - Quiz analytics (NEW)
- /admin/blog - Blog management

---

## Completed Work (December 2025)

### ✅ Quiz Enhancements v3
- Micro-insights after Q2, Q5, Q6, Q8
- Soft commit screen before lead form
- Exit screen for "Not now" users
- A/B testing on lead form (Version A: full, Version B: simplified)
- Full analytics tracking on all interactions

### ✅ Admin Analytics Dashboard
- Quiz completion metrics
- Question-by-question answer distribution
- Conversion funnel visualization
- Form A/B test results
- Leads per day chart
- Leads by city breakdown

### ✅ Previous Work
- Homepage copy update with psychological tension
- 10-question assessment quiz
- 3 result states with stage-specific content
- Lead capture system
- Blog CMS

---

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking (awaiting user input)
- [ ] Add Google Ads Conversion ID (awaiting user input)

### P2 - Medium Priority
- [ ] Blog static generation fix (on-demand revalidation)
- [ ] Replace placeholder OG images

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities beyond София and Пловдив
- [ ] Backend refactoring (split server.py into routers)

---

*Last updated: December 2025*
*Latest changes: Quiz v3 with micro-insights, soft commit, A/B form testing, and admin analytics dashboard*
