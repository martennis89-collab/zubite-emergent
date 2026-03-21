# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is an educational orthodontic platform helping Bulgarian users understand their dental/orthodontic issues and guide them toward the correct treatment path. Focus is on conversion optimization - getting users to start the assessment quiz.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with white/sky-blue accents
- **Email**: Resend for lead notifications

## Core User Flow
`Homepage → Quiz (10 questions) → Result → Treatment Page or Lead Form`

---

## Master Quiz System (NEW - December 2025)

### Overview
New 10-question quiz at `/quiz` with psychological tension. One question per screen, minimal design, mobile-first.

### Quiz Questions (Exact Bulgarian Copy)
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

### Scoring Logic
- **Max score**: 20 points (10 questions × 2 points)
- **Early (0-6)**: "Вероятно си в ранен етап — но не всичко е толкова безобидно." → /orthodontics
- **Progression (7-12)**: "Не си в безопасната зона — но все още е лесно да се коригира." → /orthodontics  
- **Advanced (13-20)**: "Вероятно вече си в етап, в който проблемът се развива." → /implants

### Quiz UX
- Progress bar with text: "Проверяваме твоята ситуация..."
- 3 answer buttons per question (A, B, C labels)
- Fast transitions between questions
- Back button to previous question
- Minimal header (logo + question counter)

---

## Homepage Copy (Updated December 2025)

### Hero Section
- **Headline**: "По-лесно е да оправиш зъбите си навреме. / Повечето хора чакат, докато стане скъпо. / Ти сигурен ли си, че не си вече в този етап?"
- **Subheadline**: "Повечето хора вече имат ранни признаци — но ги осъзнават чак когато лечението стане по-сложно."
- **CTA**: "Провери къде се намираш (60 сек)"
- **Micro**: "Отнема 60 секунди. Повечето хора никога не стигат дотук."

### Interrupt Section
- **Title**: "Ако чакаш да те заболи — вече си закъснял."

### Self Recognition Section
- **Tension line**: "Повечето хора игнорират тези неща… докато не стане проблем."

### Progression Section
- **Micro copy**: "Проблемът не стои на място."

### Cost Section
- **Title**: "Това не е един и същ проблем — ако го хванеш навреме или по-късно."

### Authority Section
- **Close**: "И повечето разбират това… твърде късно."

### Final CTA
- **Text**: "Разбери на кой етап си — преди да стане по-сложно и по-скъпо."

---

## SEO Pages

### /symptoms
- **Title**: "Признаци, че може да имаш проблем със захапката (дори без болка)"
- **Content**: струпани зъби, неравномерна захапка, щракане, напрежение, износване
- **Internal links**: → /quiz

### /orthodontics
- **Title**: "Алайнери или брекети — какво е подходящо за теб?"
- **Content**: разлики, кога кой е подходящ, митове
- **CTA**: → /quiz

---

## Navigation Structure
- Начало
- Симптоми (/symptoms)
- Ортодонтия (/orthodontics)
- Блог (/blog)
- CTA: "Провери етапа си" → /quiz

---

## Architecture

```
/app/frontend/
├── app/
│   ├── page.tsx                    # Homepage (updated copy)
│   ├── quiz/
│   │   └── page.tsx                # NEW: Master quiz
│   ├── symptoms/
│   │   └── page.tsx                # SEO symptoms page
│   ├── orthodontics/
│   │   └── page.tsx                # Updated with quiz links
│   ├── assessment/                 # Legacy (still works)
│   ├── blog/
│   └── admin/
│
├── components/
│   ├── MasterQuiz.tsx              # NEW: 10-question quiz
│   ├── OrthodonticsQuiz.tsx        # Detailed ortho quiz (8 questions)
│   ├── Header.tsx                  # Updated nav
│   └── Footer.tsx
```

---

## Admin Panel
- **URL**: /admin
- **Email**: `admin@zubite.bg`
- **Password**: `password`

---

## Completed Work (December 2025)

### ✅ Homepage Copy Update
- Updated all section copy with psychological tension
- CTAs now link to /quiz

### ✅ Master Quiz Implementation
- 10 questions at /quiz
- Scoring: Да=2, Понякога=1, Не=0
- 3 result states with appropriate routing

### ✅ SEO Pages
- /symptoms page with new content
- /orthodontics updated with quiz links

### ✅ Navigation Update
- Added "Симптоми" link
- CTA changed to "Провери етапа си"

---

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking (awaiting user input)
- [ ] Add Google Ads Conversion ID (awaiting user input)
- [ ] Blog static generation fix (on-demand revalidation)

### P2 - Medium Priority
- [ ] Create specific quizzes for other treatments (implants, cosmetic)
- [ ] Replace placeholder OG images
- [ ] Create /implants placeholder page for advanced quiz results

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities
- [ ] Enhance admin panel (edit homepage content)
- [ ] Backend refactoring (split server.py into routers)

---

*Last updated: December 2025*
*Latest changes: Master quiz with 10 questions, homepage copy update, SEO pages, navigation update*
