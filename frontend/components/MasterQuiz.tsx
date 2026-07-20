'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft, Bot, Loader2, CheckCircle, MapPin, X, User, Users, Baby, ShieldCheck } from 'lucide-react'
import {
  trackQuizStart,
  trackQuestionAnswered,
  trackQuizComplete,
  trackSoftCommit,
  trackLeadSubmit
} from './MetaPixel'
import { trackEvent as gaTrackEvent } from '@/lib/analytics/gtag'
import { getStoredAttribution } from '@/lib/attribution'
import { MANUAL_RECOMMENDATION_COPY } from '@/lib/manualRecommendationCopy'
import {
  TREATMENT_PRICES,
  ORTHO_DURATION,
  PRICE_DISCLAIMER,
  PRICE_NOT_PERSONAL_NOTE,
  formatPrice,
} from '@/lib/pricing'

// ─── Types ────────────────────────────────────────────────
type Segment = 'adult' | 'teen' | 'child'
type ResultBand = 'low' | 'moderate' | 'high'

interface QuizOption {
  label: string
  value: string
  score: number
  tags?: string[]
  visual?: ReactNode
}

interface QuizQuestion {
  id: string
  question: string
  type: 'text' | 'visual'
  options: QuizOption[]
}

interface ResultContent {
  bandLabel: string
  headline: string
  explanation: string
  urgency: string
  education: string
}

// ─── SVG Visuals ──────────────────────────────────────────
function TeethCrowded() {
  return (
    <svg viewBox="0 0 100 80" fill="none" className="w-full h-full">
      <path d="M20 60 Q20 20 50 15 Q80 20 80 60" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
      {/* overlapping, rotated teeth */}
      <rect x="30" y="28" width="8" height="14" rx="3" fill="#94a3b8" transform="rotate(-15 34 35)" />
      <rect x="38" y="25" width="8" height="15" rx="3" fill="#94a3b8" transform="rotate(10 42 32)" />
      <rect x="46" y="24" width="8" height="14" rx="3" fill="#94a3b8" transform="rotate(-8 50 31)" />
      <rect x="54" y="25" width="8" height="15" rx="3" fill="#94a3b8" transform="rotate(12 58 32)" />
      <rect x="62" y="28" width="8" height="14" rx="3" fill="#94a3b8" transform="rotate(15 66 35)" />
    </svg>
  )
}

function TeethMild() {
  return (
    <svg viewBox="0 0 100 80" fill="none" className="w-full h-full">
      <path d="M20 60 Q20 20 50 15 Q80 20 80 60" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
      <rect x="30" y="28" width="8" height="14" rx="3" fill="#94a3b8" transform="rotate(-5 34 35)" />
      <rect x="39" y="26" width="8" height="14" rx="3" fill="#94a3b8" transform="rotate(3 43 33)" />
      <rect x="48" y="25" width="8" height="14" rx="3" fill="#94a3b8" />
      <rect x="57" y="26" width="8" height="14" rx="3" fill="#94a3b8" transform="rotate(-4 61 33)" />
      <rect x="65" y="28" width="8" height="14" rx="3" fill="#94a3b8" transform="rotate(5 69 35)" />
    </svg>
  )
}

function TeethAligned() {
  return (
    <svg viewBox="0 0 100 80" fill="none" className="w-full h-full">
      <path d="M20 60 Q20 20 50 15 Q80 20 80 60" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
      <rect x="30" y="28" width="8" height="14" rx="3" fill="#0ea5e9" opacity="0.5" />
      <rect x="40" y="26" width="8" height="14" rx="3" fill="#0ea5e9" opacity="0.5" />
      <rect x="49" y="25" width="8" height="14" rx="3" fill="#0ea5e9" opacity="0.5" />
      <rect x="58" y="26" width="8" height="14" rx="3" fill="#0ea5e9" opacity="0.5" />
      <rect x="67" y="28" width="8" height="14" rx="3" fill="#0ea5e9" opacity="0.5" />
    </svg>
  )
}

function ToothWear() {
  return (
    <svg viewBox="0 0 120 70" fill="none" className="w-full h-full">
      {/* Healthy tooth */}
      <rect x="15" y="15" width="16" height="28" rx="4" fill="#94a3b8" opacity="0.4" />
      <rect x="15" y="15" width="16" height="28" rx="4" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      <text x="23" y="55" textAnchor="middle" className="fill-slate-400" style={{ fontSize: '7px' }}>преди</text>
      {/* Arrow */}
      <path d="M45 30 L55 30" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arr)" />
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#cbd5e1" strokeWidth="1" /></marker></defs>
      {/* Worn tooth */}
      <rect x="68" y="20" width="16" height="22" rx="4" fill="#ef4444" opacity="0.15" />
      <rect x="68" y="20" width="16" height="22" rx="4" stroke="#ef4444" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M68 20 Q76 18 84 20" stroke="#ef4444" strokeWidth="1" opacity="0.4" strokeDasharray="2 2" />
      <text x="76" y="55" textAnchor="middle" className="fill-slate-400" style={{ fontSize: '7px' }}>сега</text>
    </svg>
  )
}

// ─── Question Sets ────────────────────────────────────────

const ADULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'a1', type: 'visual',
    question: 'Коя от тези усмивки е най-близка до твоята?',
    options: [
      { label: 'Видимо струпани', value: 'crowded', score: 2, tags: ['crowding'], visual: <TeethCrowded /> },
      { label: 'Леко струпани', value: 'mild', score: 1, tags: ['crowding'], visual: <TeethMild /> },
      { label: 'Подредени', value: 'aligned', score: 0, visual: <TeethAligned /> },
    ]
  },
  {
    id: 'a2', type: 'text',
    question: 'Когато се усмихваш, криеш ли зъбите си?',
    options: [
      { label: 'Да, често', value: 'yes', score: 2 },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'a3', type: 'text',
    question: 'Когато захапеш, усещаш ли зъбите си напълно равномерно?',
    options: [
      { label: 'Не, усещам разлика', value: 'no', score: 2, tags: ['bite_issue'] },
      { label: 'Не съм сигурен', value: 'unsure', score: 1, tags: ['bite_issue'] },
      { label: 'Да, изглежда нормално', value: 'yes', score: 0 },
    ]
  },
  {
    id: 'a4', type: 'text',
    question: 'Дъвчеш ли повече от едната страна, без да се замисляш?',
    options: [
      { label: 'Да, често', value: 'yes', score: 2, tags: ['bite_issue'] },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'a5', type: 'text',
    question: 'Случва ли се да дишаш през устата (особено нощем)?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['airway'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'a6', type: 'text',
    question: 'Чуваш ли щракане или пукане при отваряне на устата?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['tension'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['tension'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'a7', type: 'text',
    question: 'Събуждаш ли се с напрежение в челюстта или лицето?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['tension'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['tension'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'a8', type: 'visual',
    question: 'Забелязал/а ли си зъбите ти да изглеждат по-износени с времето?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['wear'], visual: <ToothWear /> },
      { label: 'Не съм сигурен/а', value: 'unsure', score: 1, tags: ['wear'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'a9', type: 'text',
    question: 'Имаш ли главоболие, напрежение във врата или ушите без ясна причина?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['tension'] },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'a10', type: 'text',
    question: 'Преди този тест мислеше ли, че имаш проблем със зъбите?',
    options: [
      { label: 'Не', value: 'no', score: 2 },
      { label: 'Не бях сигурен/а', value: 'unsure', score: 1 },
      { label: 'Да', value: 'yes', score: 0 },
    ]
  },
]

const TEEN_QUESTIONS: QuizQuestion[] = [
  {
    id: 't1', type: 'visual',
    question: 'Коя от тези усмивки е най-близка до тази на детето?',
    options: [
      { label: 'Видимо струпани', value: 'crowded', score: 2, tags: ['crowding'], visual: <TeethCrowded /> },
      { label: 'Леко струпани', value: 'mild', score: 1, tags: ['crowding'], visual: <TeethMild /> },
      { label: 'Подредени', value: 'aligned', score: 0, visual: <TeethAligned /> },
    ]
  },
  {
    id: 't2', type: 'text',
    question: 'Притеснява ли се детето от усмивката си?',
    options: [
      { label: 'Да, видимо', value: 'yes', score: 2 },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 't3', type: 'text',
    question: 'Изглежда ли захапката му/ѝ неравномерна?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['bite_issue'] },
      { label: 'Не съм сигурен/а', value: 'unsure', score: 1, tags: ['bite_issue'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 't4', type: 'text',
    question: 'Дъвче ли повече от едната страна?',
    options: [
      { label: 'Да, често', value: 'yes', score: 2, tags: ['bite_issue'] },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 't5', type: 'text',
    question: 'Има ли вече постоянни зъби, които са струпани или нямат място?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['development', 'crowding'] },
      { label: 'Не съм сигурен/а', value: 'unsure', score: 1, tags: ['development'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 't6', type: 'text',
    question: 'Диша ли често през устата?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['airway'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 't7', type: 'text',
    question: 'Има ли затруднения с говор или произнасяне на определени звуци?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['development'] },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 't8', type: 'text',
    question: 'Мислиш ли, че ще има нужда от ортодонтско лечение?',
    options: [
      { label: 'Да', value: 'yes', score: 0 },
      { label: 'Не съм сигурен/а', value: 'unsure', score: 1 },
      { label: 'Не', value: 'no', score: 2 },
    ]
  },
]

const CHILD_QUESTIONS: QuizQuestion[] = [
  {
    id: 'c1', type: 'visual',
    question: 'Как изглеждат зъбите на детето?',
    options: [
      { label: 'Видимо струпани', value: 'crowded', score: 2, tags: ['crowding'], visual: <TeethCrowded /> },
      { label: 'Леко струпани', value: 'mild', score: 1, tags: ['crowding'], visual: <TeethMild /> },
      { label: 'Подредени', value: 'aligned', score: 0, visual: <TeethAligned /> },
    ]
  },
  {
    id: 'c2', type: 'text',
    question: 'Диша ли често през устата (особено нощем)?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['airway'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'c3', type: 'text',
    question: 'Хърка ли или има неспокоен сън?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'c4', type: 'text',
    question: 'Смуче ли пръст или използва ли биберон дълго време?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['development'] },
      { label: 'Преди да, вече не', value: 'past', score: 1, tags: ['development'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'c5', type: 'text',
    question: 'Изглежда ли челюстта тясна или зъбите нямат достатъчно място?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['development', 'crowding'] },
      { label: 'Не съм сигурен/а', value: 'unsure', score: 1, tags: ['development'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'c6', type: 'text',
    question: 'Има ли видима разлика в захапката (горни/долни зъби)?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['bite_issue'] },
      { label: 'Не съм сигурен/а', value: 'unsure', score: 1, tags: ['bite_issue'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'c7', type: 'text',
    question: 'Държи ли устата си често отворена през деня?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['airway'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'c8', type: 'text',
    question: 'Мислиш ли, че има нужда от преглед при ортодонт?',
    options: [
      { label: 'Да', value: 'yes', score: 0 },
      { label: 'Не съм сигурен/а', value: 'unsure', score: 1 },
      { label: 'Не', value: 'no', score: 2 },
    ]
  },
]

const QUESTION_SETS: Record<Segment, QuizQuestion[]> = {
  adult: ADULT_QUESTIONS,
  teen: TEEN_QUESTIONS,
  child: CHILD_QUESTIONS,
}

// ─── Micro Insights ───────────────────────────────────────
const MICRO_INSIGHTS: Record<Segment, Record<number, string>> = {
  adult: {
    3: 'Над 60% от хората с подобни отговори имат начален проблем със захапката.',
    7: 'Вече виждаме ясен модел при твоите отговори…',
  },
  teen: {
    3: 'Много тийнейджъри с подобни признаци имат начален проблем, който може да се коригира навреме.',
    6: 'Вече се очертава ясен модел при отговорите…',
  },
  child: {
    3: 'Много деца с подобни признаци имат начален проблем с развитието на захапката.',
    6: 'Вече се очертава ясен модел при отговорите…',
  },
}

// ─── Result Content ───────────────────────────────────────
const RESULT_CONTENT: Record<Segment, Record<ResultBand, ResultContent>> = {
  adult: {
    low: {
      bandLabel: 'Нисък приоритет',
      headline: 'Изглежда, че си в добра позиция.',
      explanation: 'Отговорите ти показват малко сигнали. Това не изключва напълно проблем, но е добра новина — нещата изглеждат под контрол.',
      urgency: 'Добра идея е да провериш поне веднъж при ортодонт — дори за спокойствие.',
      education: 'Дори при нисък резултат, някои проблеми се развиват бавно и незабележимо. Ранната оценка е винаги по-добрият избор.',
    },
    moderate: {
      bandLabel: 'Има сигнали за внимание',
      headline: 'Има признаци, които заслужават внимание.',
      explanation: 'Отговорите ти показват модел, който често се задълбочава с времето — износване, напрежение или проблем със захапката. Не е спешно, но не е и нещо за игнориране.',
      urgency: 'Добре е да потърсиш професионална оценка скоро, за да разбереш какви са вариантите ти.',
      education: 'Този резултат не е диагноза. Той показва, че има достатъчно сигнали, за да си струва консултация със специалист — преди лечението да стане по-сложно.',
    },
    high: {
      bandLabel: 'Висок приоритет',
      headline: 'Отговорите ти показват сериозни сигнали.',
      explanation: 'Комбинацията от симптоми — захапка, напрежение, износване — често означава проблем, който се влошава. Колкото по-рано действаш, толкова по-леко и по-евтино е лечението.',
      urgency: 'Препоръчваме ти да потърсиш специалист възможно най-скоро.',
      education: 'Това не е диагноза, но е ясен сигнал, че ситуацията изисква професионална оценка. Не отлагай — разликата може да бъде голяма.',
    },
  },
  teen: {
    low: {
      bandLabel: 'Нисък приоритет',
      headline: 'Засега нещата изглеждат добре.',
      explanation: 'Отговорите показват малко сигнали за проблем. Тийнейджърските години обаче са ключов период за развитие на захапката.',
      urgency: 'Профилактичен преглед при ортодонт е добра идея — особено в този период на растеж.',
      education: 'Между 12 и 17 години лечението е най-ефективно и най-бързо. Ранната оценка може да спести много време и средства по-късно.',
    },
    moderate: {
      bandLabel: 'Има сигнали за внимание',
      headline: 'Има признаци, които заслужават внимание.',
      explanation: 'Отговорите показват няколко сигнала — струпани зъби, захапка или дишане. В тийнейджърска възраст тези проблеми могат да се коригират значително по-лесно.',
      urgency: 'Сега е идеалният момент за консултация — докато растежът все още работи във ваша полза.',
      education: 'Тийнейджърските години са "златният прозорец" за ортодонтска корекция. Костите все още растат, което прави лечението по-бързо и по-ефективно.',
    },
    high: {
      bandLabel: 'Висок приоритет',
      headline: 'Отговорите показват ясни сигнали за проблем.',
      explanation: 'Комбинацията от струпване, захапка и евентуално дишане показва, че е важно да се действа. В тази възраст корекцията все още е много по-лесна, отколкото при възрастен.',
      urgency: 'Не изпускайте този прозорец — консултацията при ортодонт е важна стъпка сега.',
      education: 'Ранното лечение при тийнейджъри не само подобрява усмивката, но и предотвратява по-сериозни функционални проблеми в бъдеще.',
    },
  },
  child: {
    low: {
      bandLabel: 'Нисък приоритет',
      headline: 'Засега нещата изглеждат нормално.',
      explanation: 'Отговорите показват малко сигнали. При деца под 12 г. обаче развитието тепърва предстои и е важно да се наблюдава.',
      urgency: 'Първият преглед при ортодонт се препоръчва на 7-годишна възраст — дори без видим проблем.',
      education: 'Много проблеми при деца се развиват тихо. Ранната оценка може да предотврати нуждата от по-сложно лечение по-късно.',
    },
    moderate: {
      bandLabel: 'Има сигнали за внимание',
      headline: 'Забелязваме сигнали, които заслужават внимание.',
      explanation: 'Дишането през устата, тесните челюсти или ранното струпване са сигнали, че развитието може да не върви по план. При децата интервенцията е най-проста и най-ефективна.',
      urgency: 'Препоръчваме преглед при ортодонт — ранната намеса може да промени хода на развитие.',
      education: 'При деца целта не е брекети — а насочване на растежа. Малка интервенция сега може да спести голямо лечение по-късно.',
    },
    high: {
      bandLabel: 'Висок приоритет',
      headline: 'Отговорите показват няколко важни сигнала.',
      explanation: 'Комбинацията от дишане, навици, тясна челюст и захапка показва, че е важно да се действа навреме. При деца ранната намеса е най-ефективна.',
      urgency: 'Моля, не отлагайте — преглед при ортодонт е важна стъпка.',
      education: 'Ранната интервенция при деца (interceptive orthodontics) може да коригира проблеми с растежа преди те да станат постоянни. Това е инвестиция в бъдещето.',
    },
  },
}

// ─── Scoring ──────────────────────────────────────────────
const CITIES = [
  { value: 'sofia', label: 'София' },
  { value: 'plovdiv', label: 'Пловдив' },
  { value: 'varna', label: 'Варна' },
  { value: 'burgas', label: 'Бургас' },
  { value: 'ruse', label: 'Русе' },
  { value: 'stara-zagora', label: 'Стара Загора' },
  { value: 'pleven', label: 'Плевен' },
  { value: 'sliven', label: 'Сливен' },
  { value: 'dobrich', label: 'Добрич' },
  { value: 'shumen', label: 'Шумен' },
  { value: 'haskovo', label: 'Хасково' },
]

// Sofia neighbourhoods only — no other city on the platform is large
// enough to have meaningful sub-city districts. Kept in sync manually
// with SOFIA_DISTRICTS in backend/config.py (same existing convention
// as CITIES above, which also has no shared source of truth with the
// backend copy).
const SOFIA_DISTRICTS = [
  { value: 'lozenets', label: 'Лозенец' },
  { value: 'mladost', label: 'Младост' },
  { value: 'lyulin', label: 'Люлин' },
  { value: 'druzhba', label: 'Дружба' },
  { value: 'iztok', label: 'Изток' },
  { value: 'izgrev', label: 'Изгрев' },
  { value: 'studentski-grad', label: 'Студентски град' },
  { value: 'vitosha', label: 'Витоша' },
  { value: 'boyana', label: 'Бояна' },
  { value: 'center', label: 'Център' },
  { value: 'krasno-selo', label: 'Красно село' },
  { value: 'ovcha-kupel', label: 'Овча купел' },
  { value: 'nadezhda', label: 'Надежда' },
  { value: 'poduyane', label: 'Подуяне' },
]

function calculateResult(answers: { value: string; score: number; tags?: string[] }[], segment: Segment) {
  const totalScore = answers.reduce((s, a) => s + a.score, 0)
  const tagCounts: Record<string, number> = {}
  answers.forEach(a => {
    (a.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 })
  })
  const flags = Object.entries(tagCounts).filter(([, c]) => c >= 1).map(([t]) => t)

  let band: ResultBand
  if (segment === 'child') {
    band = totalScore <= 4 ? 'low' : totalScore <= 10 ? 'moderate' : 'high'
  } else {
    band = totalScore <= 5 ? 'low' : totalScore <= 12 ? 'moderate' : 'high'
  }

  return { band, totalScore, flags, tagCounts }
}

const SEGMENT_LABELS: Record<Segment, string> = { adult: 'възрастен', teen: 'тийнейджър', child: 'дете' }

// Named orientation stage — the primary output of the result screen
// (July 2026). Mapped from the existing severity band; it is an
// orientation label, NOT a diagnosis (the badge below says so and the
// existing band/explanation remain as supporting severity detail).
const STAGE_BY_BAND: Record<ResultBand, string> = {
  low: 'Ранен етап',
  moderate: 'Развиващ се етап',
  high: 'Напреднал етап',
}

const generateSessionId = () => `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// ─── Intake context (Clinical Brief) ──────────────────────────────
// Routing/logistics context, deliberately NOT part of the clinical
// question set: these don't affect scoring or the patient's orientation,
// they only help the clinic prepare. They live on the city step (after
// the result, once the patient has chosen to see options) so the "60
// seconds / 8–10 questions" promise on the symptom quiz stays true.
//
// All optional by design — a skipped answer is honest missing data; a
// forced answer is noise in the brief.
//
// `importance` and `can_travel` reuse keys that already exist in the
// backend's label vocabulary (_QUIZ_QUESTION_LABELS/_QUIZ_VALUE_LABELS),
// so they surface in the Clinical Brief with no backend change.
const INTAKE_FIELDS: Array<{
  key: 'importance' | 'can_travel' | 'has_files' | 'preferred_channel'
  label: string
  hint?: string
  multi?: boolean
  options: Array<{ value: string; label: string }>
}> = [
  {
    key: 'importance',
    label: 'Какво тежи най-много при избора?',
    options: [
      { value: 'quality', label: 'Качество и опит' },
      { value: 'comfort', label: 'Баланс цена / качество' },
      { value: 'price', label: 'Цената' },
    ],
  },
  {
    key: 'has_files',
    label: 'Имаш ли вече нещо от предишен преглед?',
    hint: 'Ако имаш, клиниката може да го прегледа предварително.',
    multi: true,
    options: [
      { value: 'photos', label: 'Снимки на зъбите' },
      { value: 'opg', label: 'OPG / скенер' },
      { value: 'plan', label: 'План или оферта' },
      { value: 'none', label: 'Нямам' },
    ],
  },
  {
    key: 'preferred_channel',
    label: 'Как предпочиташ да се свържат с теб?',
    options: [
      { value: 'call', label: 'Обаждане' },
      { value: 'message', label: 'Съобщение' },
      { value: 'any', label: 'Няма значение' },
    ],
  },
  {
    key: 'can_travel',
    label: 'Би ли пътувал/а до друг град за лечение?',
    options: [
      { value: 'no', label: 'Само в моя град' },
      { value: 'yes', label: 'Да, ако си струва' },
    ],
  },
]

// ─── Component ────────────────────────────────────────────
export function MasterQuiz() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [segment, setSegment] = useState<Segment | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ questionId: string; value: string; score: number; tags?: string[] }[]>([])
  const [result, setResult] = useState<{ band: ResultBand; totalScore: number; flags: string[] } | null>(null)
  const [step, setStep] = useState<'segment' | 'quiz' | 'insight' | 'result' | 'soft_commit' | 'form' | 'exit'>('segment')
  const [formVersion, setFormVersion] = useState<'A' | 'B'>('A')
  const [formData, setFormData] = useState({ city: '', district: '' })
  // Optional intake answers (see INTAKE_FIELDS). Single-select fields hold
  // a string; `has_files` holds a string[].
  const [intake, setIntake] = useState<Record<string, string | string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentInsight, setCurrentInsight] = useState('')
  const sessionId = useRef('')
  const startTime = useRef(0)
  const questionStartTime = useRef(0)
  // GA4 funnel-event dedupe (each fires at most once per quiz session).
  const gaQuizStartFiredRef = useRef(false)
  const gaQuizCompleteFiredRef = useRef(false)
  // gaLeadSubmitFiredRef removed in Phase B — lead_submit GA event now
  // fires on /results/[leadId] after the unlock gate succeeds (where
  // PII is actually collected).

  useEffect(() => {
    setIsClient(true)
    setFormVersion(Math.random() > 0.5 ? 'A' : 'B')
    sessionId.current = generateSessionId()
    startTime.current = Date.now()
    trackQuizStart()
  }, [])

  const trackEvent = async (eventType: string, data: Record<string, unknown>) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      await fetch(`${API_URL}/api/analytics/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, session_id: sessionId.current, timestamp: new Date().toISOString(), ...data })
      })
    } catch { /* silent */ }
  }

  // ─── Handlers ─────────────────────────────────────────
  // Declared before the isClient early-return (not a hook, so this is
  // safe) so the URL-segment auto-select effect below can call it.
  const handleSegmentSelect = (seg: Segment) => {
    setIsTransitioning(true)
    trackEvent('segment_selected', { segment: seg })
    trackEvent('quiz_start', { session_id: sessionId.current, segment: seg })

    // GA4 — fire quiz_start exactly once per session (Consent Mode v2
    // gates the network hit at the Google tag level; no need to check
    // consent here). Only category-level metadata — no PII.
    if (!gaQuizStartFiredRef.current) {
      gaQuizStartFiredRef.current = true
      const utm = getStoredAttribution().latest
      gaTrackEvent('quiz_start', {
        quiz_type: 'master',
        entry_path: typeof window !== 'undefined' ? window.location.pathname : '/quiz',
        source_context: utm?.utm_source || utm?.utm_medium || 'unknown',
        utm_source: utm?.utm_source || undefined,
        utm_campaign: utm?.utm_campaign || undefined,
      })
    }

    setTimeout(() => {
      setSegment(seg)
      setStep('quiz')
      questionStartTime.current = Date.now()
      setIsTransitioning(false)
    }, 200)
  }

  // Homepage entry points (e.g. "Детето диша през устата") can pass
  // ?segment=child|teen|adult to skip the segment picker and land the
  // visitor directly in the right question set, instead of dropping a
  // parent into the generic/adult flow. Runs once, only on the segment
  // step, only for a valid value.
  const autoSegmentAppliedRef = useRef(false)
  useEffect(() => {
    if (!isClient || autoSegmentAppliedRef.current || step !== 'segment') return
    const requested = searchParams?.get('segment')
    if (requested === 'adult' || requested === 'teen' || requested === 'child') {
      autoSegmentAppliedRef.current = true
      handleSegmentSelect(requested)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, step, searchParams])

  if (!isClient) {
    return <main className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></main>
  }

  const questions = segment ? QUESTION_SETS[segment] : []
  const totalQ = questions.length
  const progress = result ? 100 : segment ? ((currentQuestion + 1) / totalQ) * 100 : 0

  const handleAnswer = (questionId: string, value: string, score: number, tags?: string[]) => {
    const timeSpent = Date.now() - questionStartTime.current
    trackEvent('question_answered', { question_id: questionId, question_index: currentQuestion + 1, answer: value, score, time_spent_ms: timeSpent })
    trackQuestionAnswered(currentQuestion + 1, value)

    setIsTransitioning(true)
    const newAnswers = [...answers, { questionId, value, score, tags }]
    setAnswers(newAnswers)
    const nextIdx = currentQuestion + 1

    setTimeout(() => {
      const insights = segment ? MICRO_INSIGHTS[segment] : {}
      if (insights[nextIdx] && nextIdx <= totalQ) {
        setCurrentInsight(insights[nextIdx])
        setStep('insight')
      } else if (nextIdx < totalQ) {
        setCurrentQuestion(nextIdx)
        questionStartTime.current = Date.now()
      } else {
        const res = calculateResult(newAnswers, segment!)
        setResult(res)
        const totalTime = Date.now() - startTime.current
        trackEvent('quiz_completed', { total_score: res.totalScore, band: res.band, flags: res.flags, segment, total_time_ms: totalTime, answers: newAnswers.map(a => ({ q: a.questionId, v: a.value, s: a.score })) })
        trackQuizComplete(res.band, res.totalScore)

        // GA4 — fire quiz_complete once per completed session. Only
        // category-level metadata (band, segment, count) — no PII / no
        // free-text answers / no per-question payload.
        if (!gaQuizCompleteFiredRef.current) {
          gaQuizCompleteFiredRef.current = true
          gaTrackEvent('quiz_complete', {
            quiz_type: 'master',
            result_category: res.band,
            soonness_band: res.band,
            questions_answered: newAnswers.length,
          })
        }

        setStep('result')
      }
      setIsTransitioning(false)
    }, 200)
  }

  const handleInsightContinue = () => {
    setStep('quiz')
    setCurrentQuestion(prev => prev + 1)
    questionStartTime.current = Date.now()
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setAnswers(prev => prev.slice(0, -1))
      setCurrentQuestion(prev => prev - 1)
      questionStartTime.current = Date.now()
    }
  }

  const handleSubmit = async () => {
    // Phase B (June 2026): the MasterQuiz no longer collects name / phone /
    // email here. We POST an ANSWER-ONLY lead and let the
    // `ResultUnlockGate` on /results/[leadId] collect contact details.
    // This prevents asking the patient for contacts twice and keeps
    // Manual Recommendation Mode intact (post-unlock redirect goes to
    // /quiz/success?leadId=...).
    if (!formData.city) { setError('Моля, изберете град.'); return }
    setIsSubmitting(true); setError('')

    try {
      const answersObj: Record<string, string> = {}
      answers.forEach(a => { answersObj[a.questionId] = a.value })
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const bandMap: Record<ResultBand, string> = { low: 'GREEN', moderate: 'YELLOW', high: 'RED' }

      // Optional intake answers → `answers`, where the Clinical Brief
      // reads them. Empty/skipped fields are omitted entirely rather than
      // sent as "" — a blank row in the brief is worse than no row.
      const intakeAnswers: Record<string, string | string[]> = {}
      for (const [k, v] of Object.entries(intake)) {
        if (Array.isArray(v) ? v.length > 0 : !!v) intakeAnswers[k] = v
      }

      const leadData = {
        city_slug: formData.city,
        ...(formData.district ? { district_slug: formData.district } : {}),
        treatment_type: 'diagnostic_quiz',
        answers: { ...answersObj, ...intakeAnswers, quiz_score: result?.totalScore || 0, quiz_band: result?.band || '', quiz_flags: result?.flags || [], segment, form_version: formVersion, session_id: sessionId.current, source: 'diagnostic_quiz_v1' },
        score_total: result?.totalScore || 0,
        band: bandMap[result?.band || 'low'],
        // `can_travel` is also a first-class Lead field used by clinic
        // matching, so mirror the intake answer onto it. Previously it
        // silently defaulted to `true` for every homepage lead — an
        // assumption the patient was never asked to make.
        ...(intake.can_travel ? { can_travel: intake.can_travel === 'yes' } : {}),
        // No name/phone/email/consent here — backend creates a locked
        // lead (contact_details_submitted=false). Contact is gathered on
        // /results/[leadId] via ResultUnlockGate → POST /unlock-result.
        source: 'diagnostic_quiz_v1', form_version: formVersion,
        // ─── Attribution data — never throws (returns {} if storage blocked) ───
        ...(typeof window !== 'undefined'
          ? (await import('@/lib/attribution')).attachAttributionToLead()
          : {}),
      }
      const response = await fetch(`${API_URL}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(leadData) })
      if (!response.ok) {
        // Try to surface the backend's friendly Bulgarian message when present.
        let backendMsg = ''
        try {
          const j = await response.json()
          if (j?.detail && typeof j.detail === 'object' && typeof j.detail.message === 'string') {
            backendMsg = j.detail.message
          } else if (typeof j?.detail === 'string') {
            backendMsg = j.detail
          }
        } catch { /* ignore */ }
        throw new Error(backendMsg || 'Failed')
      }
      // Capture leadId from the created (locked) lead so we can redirect
      // the patient to the unlock gate on /results/[leadId].
      let createdLeadId = ''
      try {
        const created = await response.json()
        if (created && typeof created.id === 'string') createdLeadId = created.id
      } catch { /* parsing failure handled below */ }

      trackEvent('locked_lead_created', { form_version: formVersion, city: formData.city, segment })
      trackLeadSubmit(formData.city, formVersion)

      if (!createdLeadId) {
        // Backend accepted the lead but we couldn't read the id — fall
        // back to the legacy success page so the patient still lands
        // somewhere coherent.
        const successParams = new URLSearchParams({ stage: result?.band || 'low', city: formData.city, segment: segment || 'adult' })
        router.push(`/quiz/success?${successParams.toString()}`)
        return
      }
      // Phase B redirect: send the patient to the unlock gate. The
      // ResultUnlockGate POSTs to /unlock-result and then this app
      // redirects again to /quiz/success?leadId=... (see
      // /app/frontend/app/results/[leadId]/page.tsx).
      router.push(`/results/${createdLeadId}`)
    } catch (e) {
      const msg = e instanceof Error && e.message && e.message !== 'Failed'
        ? e.message
        : 'Възникна грешка. Моля, опитайте отново.'
      setError(msg)
    } finally { setIsSubmitting(false) }
  }

  // ─── Header ────────────────────────────────────────────
  const Header = ({ showCount }: { showCount?: boolean }) => (
    <header className="taste-quiz-header">
      <div className="taste-quiz-header-inner">
        <Link href="/" className="taste-quiz-back" aria-label="Назад към началната страница">
          <ArrowLeft aria-hidden /> <span>Назад</span>
        </Link>
        <Link href="/" className="taste-quiz-logo" aria-label="Zubite.bg — начало">Zubite<span>.bg</span></Link>
        {showCount ? (
          <span className="taste-quiz-count"><strong>{currentQuestion + 1}</strong> / {totalQ}</span>
        ) : (
          <span className="taste-quiz-safety"><ShieldCheck aria-hidden /> Ориентир, не диагноза</span>
        )}
      </div>
    </header>
  )

  // ─── SEGMENT SELECT ────────────────────────────────────
  if (step === 'segment') {
    return (
      <main className="taste-site taste-quiz-page">
        <Header />
        <section className={`taste-quiz-intro ${isTransitioning ? 'is-leaving' : ''}`}>
          <div className="taste-quiz-intro-copy">
            <span className="taste-quiz-kicker" data-testid="quiz-intro-eyebrow"><i /> Кратък здравен ориентир</span>
            <h1 data-testid="segment-heading">Нека започнем от <em>правилното място.</em></h1>
            <p data-testid="quiz-intro-subhead">
              Отговори спокойно. За няколко минути ще подредим това, което
              забелязваш, и ще ти покажем коя следваща стъпка има смисъл.
            </p>
            <div className="taste-quiz-intro-notes" aria-label="Информация за теста">
              <span><strong>2–3 мин</strong> средно време</span>
              <span><strong>Безплатно</strong> без ангажимент</span>
              <span><strong>Поверително</strong> и недиагностично</span>
            </div>
          </div>

          <div className="taste-quiz-segment-panel">
            <div className="taste-quiz-panel-heading">
              <span>01 / 03</span>
              <div>
                <p>Първо уточнение</p>
                <h2>За кого попълваш теста?</h2>
              </div>
            </div>
            <div className="taste-quiz-segment-list">
              {([
                { seg: 'adult' as Segment, icon: <User />, label: 'За мен', sub: 'Възрастен' },
                { seg: 'teen' as Segment, icon: <Users />, label: 'За тийнейджър', sub: '12–17 години' },
                { seg: 'child' as Segment, icon: <Baby />, label: 'За дете', sub: 'Под 12 години' },
              ]).map(({ seg, icon, label, sub }) => (
                <button
                  key={seg}
                  onClick={() => handleSegmentSelect(seg)}
                  className="taste-quiz-segment-option"
                  data-testid={`segment-${seg}`}
                >
                  <span className="taste-quiz-segment-icon">{icon}</span>
                  <div>
                    <strong>{label}</strong>
                    <small>{sub}</small>
                  </div>
                  <ArrowRight aria-hidden />
                </button>
              ))}
            </div>
            <p className="taste-quiz-panel-note"><ShieldCheck aria-hidden /> Въпросите се адаптират към избрания възрастов профил.</p>
          </div>
        </section>
      </main>
    )
  }

  // ─── INSIGHT SCREEN ────────────────────────────────────
  if (step === 'insight') {
    return (
      <main className="taste-site taste-quiz-page">
        <Header />
        <section className="taste-quiz-centered">
          <div className="taste-quiz-insight-card animate-fade-in-up">
            <span className="taste-quiz-insight-index">Добре е да знаеш</span>
            <p>„{currentInsight}&quot;</p>
            <div>
              <span>Луми подрежда отговорите ти постепенно.</span>
              <button onClick={handleInsightContinue} className="taste-quiz-primary" data-testid="insight-continue-btn">
                Продължи <ArrowRight aria-hidden />
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  // ─── QUIZ SCREEN ───────────────────────────────────────
  if (step === 'quiz' && !result && segment) {
    const q = questions[currentQuestion]
    const isVisual = q.type === 'visual'

    return (
      <main className="taste-site taste-quiz-page">
        <Header showCount />
        <section className="taste-quiz-question-wrap">
          <div className="taste-quiz-progress-row">
            <span>Твоят ориентир</span>
            <div className="taste-quiz-progress-track" aria-label={`${Math.round(progress)}% завършено`}>
              <i style={{ width: `${progress}%` }} />
            </div>
            <strong>{Math.round(progress)}%</strong>
          </div>

          <div className={`taste-quiz-question-card ${isTransitioning ? 'is-leaving' : ''}`}>
            <aside className="taste-quiz-question-rail" aria-hidden>
              <span className="taste-quiz-question-number">{String(currentQuestion + 1).padStart(2, '0')}</span>
              <div>
                <Bot />
                <p><strong>Луми</strong> подрежда отговорите ти, за да изведе ясен следващ ход.</p>
              </div>
              <span className="taste-quiz-question-note">Няма грешен отговор</span>
            </aside>

            <div className="taste-quiz-question-content">
              <span className="taste-quiz-mobile-step">Въпрос {currentQuestion + 1} от {totalQ}</span>
              <h1 data-testid="question-text">{q.question}</h1>
              <p>Избери отговора, който най-точно описва ситуацията в момента.</p>

              {isVisual ? (
                <div className="taste-quiz-visual-options">
                  {q.options.map((opt, idx) => (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswer(q.id, opt.value, opt.score, opt.tags)}
                      className="taste-quiz-visual-option"
                      data-testid={`option-${opt.value}`}
                    >
                      <span className="taste-quiz-option-letter">{String.fromCharCode(65 + idx)}</span>
                      <span className="taste-quiz-visual-art">{opt.visual}</span>
                      <strong>{opt.label}</strong>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="taste-quiz-text-options">
                  {q.options.map((opt, idx) => (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswer(q.id, opt.value, opt.score, opt.tags)}
                      className="taste-quiz-text-option"
                      data-testid={`option-${opt.value}`}
                    >
                      <span>{String.fromCharCode(65 + idx)}</span>
                      <strong>{opt.label}</strong>
                      <ArrowRight aria-hidden />
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion > 0 && (
                <button onClick={handleBack} className="taste-quiz-question-back" data-testid="quiz-back-btn">
                  <ArrowLeft aria-hidden /> Предишен въпрос
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    )
  }

  // ─── RESULT SCREEN ─────────────────────────────────────
  if (step === 'result' && result && segment) {
    const content = RESULT_CONTENT[segment][result.band]

    return (
      <main className="taste-site taste-quiz-page">
        <Header />
        <section className="taste-quiz-result-wrap">
          <div className="taste-quiz-result-shell animate-fade-in-up">
            <article className={`taste-quiz-result-card taste-quiz-band-${result.band}`} data-testid="result-card">
              {/* Primary output — named orientation stage (July 2026).
                  Leads the card; severity band + explanation remain below as
                  supporting detail. The badge keeps it explicitly non-diagnostic. */}
              <div className="taste-quiz-result-topline">
                <span data-testid="result-stage-badge"><ShieldCheck aria-hidden /> Ориентир, не диагноза</span>
                <span>Резултат за: {SEGMENT_LABELS[segment]}</span>
              </div>

              <div className="taste-quiz-result-heading">
                <div>
                  <p>Твоят ориентир</p>
                  <h1 data-testid="result-stage-title">
                  {STAGE_BY_BAND[result.band]}
                  </h1>
                </div>
                <span className="taste-quiz-band-label"><i /> {content.bandLabel}</span>
              </div>

              <div className="taste-quiz-result-summary">
                <h2>{content.headline}</h2>
                <p>{content.explanation}</p>
              </div>

              <div className="taste-quiz-urgency">
                <span>Следващ ход</span>
                <p>{content.urgency}</p>
              </div>

              {/* Flags */}
              {result.flags.length > 0 && (
                <div className="taste-quiz-flags" aria-label="Забелязани сигнали">
                  {result.flags.map(f => (
                    <span key={f}>
                      {{ crowding: 'Струпване', bite_issue: 'Захапка', airway: 'Дишане', tension: 'Напрежение', wear: 'Износване', development: 'Развитие' }[f] || f}
                    </span>
                  ))}
                </div>
              )}

              {/* Price + duration orientation.
                  Deliberately NOT derived from the band: the quiz reads
                  reported symptoms and cannot forecast a given patient's
                  cost or treatment length. These are the general Bulgarian
                  market ranges from lib/pricing.ts (single source of truth,
                  shared with the price-guide pages), labelled as such. The
                  only band-dependent line is the mild-case duration hint,
                  which mirrors existing approved copy and is phrased as a
                  general statement about mild cases, not about this user.

                  Adult/teen ONLY. For under-12s this screen's own education
                  copy says "целта не е брекети — а насочване на растежа",
                  so quoting aligner/braces ranges to a parent would
                  contradict the advice sitting right above it. There is no
                  approved pricing for interceptive treatment, so the child
                  segment gets an honest qualitative note instead of numbers. */}
              <div className="taste-quiz-market-orientation">
                {segment === 'child' ? (
                  <div className="taste-quiz-child-price-note">
                    <span>За цената</span>
                    <p>
                      При деца под 12 г. лечението често не е брекети, а
                      насочване на растежа. Затова цената и срокът зависят
                      силно от подхода и се определят след преглед.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="taste-quiz-market-heading">
                      <span>Пазарен ориентир</span>
                      <p>Общи диапазони за България, не персонална оферта.</p>
                    </div>
                    <div className="taste-quiz-price-grid">
                      <div>
                        <span>Прозрачни алайнери</span>
                        <strong>
                          {formatPrice(TREATMENT_PRICES['orthodontics-aligners'])}
                        </strong>
                      </div>
                      <div>
                        <span>Брекети</span>
                        <strong>
                          {formatPrice(TREATMENT_PRICES['orthodontics-braces'])}
                        </strong>
                      </div>
                      <div>
                        <span>Обичайна продължителност</span>
                        <strong>{result.band === 'low' ? ORTHO_DURATION.mild : ORTHO_DURATION.typical}</strong>
                        <small>
                          {result.band === 'low'
                            ? 'Леките случаи обикновено се коригират по-бързо. ' + ORTHO_DURATION.note
                            : ORTHO_DURATION.note}
                        </small>
                      </div>
                    </div>
                    <p className="taste-quiz-price-disclaimer">
                      {PRICE_NOT_PERSONAL_NOTE} {PRICE_DISCLAIMER}
                    </p>
                  </>
                )}
              </div>

              <p className="taste-quiz-result-education">{content.education}</p>
            </article>

            <div className="taste-quiz-result-action animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <p>Следващата стъпка е да избереш град. Контакт се иска едва когато решиш да отключиш препоръките.</p>
              <button
                onClick={() => {
                  // Bypass the redundant "Искаш ли да видиш опциите?" soft-commit
                  // screen — the patient already clicked to see options on the
                  // result screen. We log the same `result_to_soft_commit`
                  // analytics event (for funnel continuity), but jump straight
                  // to the form (city + lead creation). The `soft_commit` step
                  // remains in the state machine for backward compatibility
                  // and is no longer reachable in normal flow (Feb 2026 brief).
                  trackEvent('result_to_soft_commit', { band: result.band, segment, skip_soft_commit: true })
                  trackSoftCommit(true)
                  setStep('form')
                }}
                className="taste-quiz-primary"
                data-testid="result-continue-btn"
              >
                Продължи към опциите <ArrowRight aria-hidden />
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  // ─── SOFT COMMIT ───────────────────────────────────────
  if (step === 'soft_commit') {
    return (
      <main className="taste-site taste-quiz-page">
        <Header />
        <section className="taste-quiz-centered">
          <div className="taste-quiz-decision-card animate-fade-in-up">
            <span className="taste-quiz-kicker"><i /> Следваща стъпка</span>
            <h1>{segment === 'adult' ? 'Искаш ли да видиш какви са опциите ти?' : 'Искате ли да видите подходящите опции?'}</h1>
            <p>{MANUAL_RECOMMENDATION_COPY.shortIntro}</p>
            <div className="taste-quiz-decision-actions">
              <button onClick={() => { trackEvent('soft_commit', { choice: 'yes' }); trackSoftCommit(true); setStep('form') }} className="taste-quiz-primary" data-testid="soft-commit-yes">
                Да, покажете ми опциите <ArrowRight aria-hidden />
              </button>
              <button onClick={() => { trackEvent('soft_commit', { choice: 'no' }); trackSoftCommit(false); setStep('exit') }} className="taste-quiz-secondary" data-testid="soft-commit-no">
                Не сега
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  // ─── EXIT ──────────────────────────────────────────────
  if (step === 'exit') {
    return (
      <main className="taste-site taste-quiz-page">
        <Header />
        <section className="taste-quiz-centered">
          <div className="taste-quiz-decision-card taste-quiz-exit-card animate-fade-in-up">
            <span className="taste-quiz-exit-icon"><X aria-hidden /></span>
            <h1>Ориентирът ти остава достъпен.</h1>
            <p>{segment === 'adult' ? 'Можеш да провериш отново по всяко време.' : 'Можете да проверите отново по всяко време.'}</p>
            <Link href="/" className="taste-quiz-secondary" data-testid="exit-home-btn">
              <ArrowLeft aria-hidden /> Обратно към началото
            </Link>
          </div>
        </section>
      </main>
    )
  }

  // ─── FORM (city-only, Phase B) ─────────────────────────
  // Contact details are intentionally NOT collected here anymore — they
  // are gathered by the ResultUnlockGate on /results/[leadId] after the
  // patient sees that their result is ready. This avoids asking for
  // name/phone/email twice and keeps Manual Recommendation Mode intact.
  if (step === 'form') {
    return (
      <main className="taste-site taste-quiz-page">
        <Header />
        <section className="taste-quiz-form-wrap">
          <div className="taste-quiz-form-card animate-fade-in-up">
            <div className="taste-quiz-form-heading">
              <span>Последна стъпка</span>
              <h1>Къде търсиш <em>консултация?</em></h1>
              <p>Използваме града, за да покажем първо релевантни клиники близо до теб.</p>
            </div>
            <div className="taste-quiz-form-body">
              <div className="taste-quiz-city-block">
                <div className="taste-quiz-field-heading">
                  <label>Избери град <span>*</span></label>
                  <small>Задължително</small>
                </div>
                <div className="taste-quiz-city-grid">
                  {CITIES.map(c => (
                    <button key={c.value} type="button" onClick={() => { setFormData(p => ({ ...p, city: c.value })); setError('') }}
                      className={`taste-quiz-city-option ${formData.city === c.value ? 'is-selected' : ''}`}
                      data-testid={`city-${c.value}`}
                      aria-pressed={formData.city === c.value}>
                      <MapPin aria-hidden />{c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sofia-only follow-up — a first-class top-level field
                  (like city), NOT part of the `intake`/INTAKE_FIELDS
                  mechanism, since _score_clinic needs to read it directly
                  off the lead, not from inside `answers`. */}
              {formData.city === 'sofia' && (
                <div className="taste-quiz-city-block" data-testid="district-block">
                  <div className="taste-quiz-field-heading">
                    <label>В кой квартал на София?</label>
                    <small>По избор</small>
                  </div>
                  <div className="taste-quiz-city-grid">
                    {SOFIA_DISTRICTS.map(d => (
                      <button key={d.value} type="button"
                        onClick={() => setFormData(p => ({ ...p, district: p.district === d.value ? '' : d.value }))}
                        className={`taste-quiz-city-option ${formData.district === d.value ? 'is-selected' : ''}`}
                        data-testid={`district-${d.value}`}
                        aria-pressed={formData.district === d.value}>
                        <MapPin aria-hidden />{d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

                {/* Optional intake — helps the clinic prepare. Explicitly
                    marked optional and visually secondary to the city step
                    so it never reads as a wall of required questions. */}
                <div className="taste-quiz-intake-block" data-testid="intake-block">
                  <div className="taste-quiz-intake-heading">
                    <div>
                      <span>По избор</span>
                      <h2>Помогни на клиниката да се подготви</h2>
                    </div>
                    <p>
                    Помагат на клиниката да се подготви, преди да се свърже с теб.
                    Можеш да ги пропуснеш.
                    </p>
                  </div>

                  <div className="taste-quiz-intake-fields">
                    {INTAKE_FIELDS.map((f) => (
                      <div className="taste-quiz-intake-field" key={f.key}>
                        <label>{f.label}</label>
                        {f.hint && (
                          <p>{f.hint}</p>
                        )}
                        <div>
                          {f.options.map((o) => {
                            const cur = intake[f.key]
                            const selected = f.multi
                              ? Array.isArray(cur) && cur.includes(o.value)
                              : cur === o.value
                            return (
                              <button
                                key={o.value}
                                type="button"
                                onClick={() =>
                                  setIntake((prev) => {
                                    if (!f.multi) {
                                      // Tapping the selected chip clears it —
                                      // the field must stay skippable.
                                      return { ...prev, [f.key]: prev[f.key] === o.value ? '' : o.value }
                                    }
                                    const list = Array.isArray(prev[f.key]) ? [...(prev[f.key] as string[])] : []
                                    // "Нямам" is exclusive of the others.
                                    if (o.value === 'none') {
                                      return { ...prev, [f.key]: list.includes('none') ? [] : ['none'] }
                                    }
                                    const next = list.filter((v) => v !== 'none')
                                    return {
                                      ...prev,
                                      [f.key]: next.includes(o.value)
                                        ? next.filter((v) => v !== o.value)
                                        : [...next, o.value],
                                    }
                                  })
                                }
                                className={`taste-quiz-intake-option ${selected ? 'is-selected' : ''}`}
                                data-testid={`intake-${f.key}-${o.value}`}
                                aria-pressed={selected}
                              >
                                {o.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {error && <p className="taste-quiz-error" role="alert">{error}</p>}
                <button onClick={handleSubmit} disabled={isSubmitting}
                  className="taste-quiz-primary taste-quiz-submit"
                  data-testid="submit-btn">
                  {isSubmitting ? <><Loader2 className="animate-spin" />Изпращане...</> : <>Продължи към резултата<ArrowRight aria-hidden /></>}
                </button>
                <p className="taste-quiz-form-safety"><ShieldCheck aria-hidden /> {MANUAL_RECOMMENDATION_COPY.safetyNote}</p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return null
}
