# Zubite.bg - Product Requirements Document

## Project Overview
Zubite.bg is an educational orthodontic platform helping Bulgarian users understand their dental/orthodontic issues and guide them toward professional evaluation. The platform assesses the user's current stage and captures their contact details so Zubite.bg can recommend 3 suitable clinic options.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with white/sky-blue accents
- **Email**: Resend for lead notifications

## Core User Flow
`Homepage → Quiz (10 questions) → Result Stage → Lead Form → Success Screen`

**Important**: The quiz does NOT route users to treatment pages. It:
1. Assesses the user's current stage
2. Shows how serious/urgent the situation may be
3. Educates them briefly based on their result
4. Captures their contact details
5. Allows Zubite.bg to contact them and recommend 3 clinic options

---

## Master Quiz System (Updated December 2025)

### Quiz Purpose
- Assess whether the person has early / progressing / advanced signs
- Determine how quickly they should seek professional help
- **Does NOT decide**: aligners vs braces, implants vs orthodontics, exact treatment type

### Quiz Flow
`Quiz Questions → Result Stage → Lead Form → Success Screen`

### Quiz Questions (10 Questions)
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
- **Ранен етап (0-5)**: Green/Emerald styling
- **Развиващ се етап (6-12)**: Amber styling
- **Напреднал етап (13-20)**: Red styling

### Result Page Content

#### Ранен етап (Early)
- **Headline**: "Вероятно си в ранен етап."
- **Explanation**: "Показваш леки сигнали, които често остават незабелязани в началото..."
- **Urgency**: "Добър момент е да потърсиш оценка навреме — преди ситуацията да стане по-сложна."
- **Education**: "Ранният етап често е най-лесният за корекция..."

#### Развиващ се етап (Progressing)
- **Headline**: "Има признаци, че проблемът се развива."
- **Explanation**: "Отговорите ти показват модел, който често се задълбочава с времето..."
- **Urgency**: "Добре е да потърсиш професионална оценка скоро..."
- **Education**: "Този резултат не определя конкретно лечение..."

#### Напреднал етап (Advanced)
- **Headline**: "Вероятно си в по-напреднал етап."
- **Explanation**: "Отговорите ти показват повече сигнали..."
- **Urgency**: "Добре е да потърсиш професионална помощ възможно най-скоро..."
- **Education**: "Този резултат не е диагноза и не означава автоматично импланти, брекети или алайнери..."

### Lead Form (On Result Page)
**Title**: "Получете 3 препоръчани клиники за вашия случай"
**Subtitle**: "Попълнете данните си и нашият екип ще прегледа резултата ви и ще се свърже с вас с 3 подходящи опции."

**Fields**:
- Име* (required)
- Телефон* (required)
- Имейл (optional)
- Град* (required): София, Пловдив
- Кратко описание или въпрос (optional)

**Submit button**: "Изпрати и получи 3 опции"
**Trust text**: "Без ангажимент. Ние не сме клиника. Ще използваме отговорите ти само за да ти помогнем да намериш подходящ следващ ход."

### Success Screen
- **Headline**: "Получихме твоите данни."
- **Text**: "Ще прегледаме отговорите ти и ще се свържем с теб с 3 подходящи опции за клиники според твоята ситуация и избрания град."
- **Supporting text**: "Този резултат не е диагноза, а насока кога е добре да потърсиш професионална оценка."
- **Button**: "Обратно към началото"

---

## SEO Pages

### /symptoms
- **Title**: "Признаци, че може да имаш проблем със захапката (дори без болка)"
- **Content**: струпани зъби, неравномерна захапка, щракане, напрежение, износване, дишане през устата, задържане на храна
- **CTA**: "Провери на кой етап си" → /quiz

### /orthodontics
- **Title**: "Алайнери или брекети — какво е подходящо за теб?"
- **Content**: разликите, кога кой е подходящ, какво влияе на избора, защо първо трябва добра оценка
- **CTA**: "Провери ситуацията си първо" → /quiz

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
│   ├── page.tsx                    # Homepage
│   ├── quiz/
│   │   └── page.tsx                # Master quiz
│   ├── symptoms/
│   │   └── page.tsx                # SEO symptoms page
│   ├── orthodontics/
│   │   └── page.tsx                # SEO orthodontics page
│   ├── assessment/                 # Legacy (still works)
│   ├── blog/
│   └── admin/
│
├── components/
│   ├── MasterQuiz.tsx              # 10-question quiz with integrated lead form
│   ├── OrthodonticsQuiz.tsx        # Detailed ortho quiz (legacy)
│   ├── Header.tsx
│   └── Footer.tsx
```

---

## Admin Panel
- **URL**: /admin
- **Email**: `admin@zubite.bg`
- **Password**: `password`

---

## Completed Work (December 2025)

### ✅ Master Quiz v2 with Lead Capture
- 10 questions assessing stage (not treatment)
- 3 result states with stage-specific content
- Lead form integrated directly on result page
- Success confirmation screen
- NO automatic routing to treatment pages

### ✅ Homepage Copy Update
- Psychological tension copy
- CTAs link to /quiz

### ✅ SEO Pages
- /symptoms page with comprehensive symptom list
- /orthodontics page with educational content

### ✅ Navigation Update
- Added "Симптоми" link
- CTA "Провери етапа си"

---

## Pending/Future Tasks

### P1 - High Priority
- [ ] Add Meta Pixel ID for tracking (awaiting user input)
- [ ] Add Google Ads Conversion ID (awaiting user input)
- [ ] Blog static generation fix (on-demand revalidation)

### P2 - Medium Priority
- [ ] Replace placeholder OG images

### P3 - Future
- [ ] English translation (`/en/...` routes)
- [ ] More cities beyond София and Пловдив
- [ ] Enhance admin panel (edit homepage content)
- [ ] Backend refactoring (split server.py into routers)

---

*Last updated: December 2025*
*Latest changes: Quiz v2 with stage assessment + lead capture, removed treatment routing*
