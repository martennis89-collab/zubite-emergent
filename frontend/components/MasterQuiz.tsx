'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, MapPin, X, User, Users, Baby, ShieldCheck } from 'lucide-react'
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
      bandLabel: 'Нисък риск',
      headline: 'Изглежда, че си в добра позиция.',
      explanation: 'Отговорите ти показват малко сигнали. Това не изключва напълно проблем, но е добра новина — нещата изглеждат под контрол.',
      urgency: 'Добра идея е да провериш поне веднъж при ортодонт — дори за спокойствие.',
      education: 'Дори при нисък резултат, някои проблеми се развиват бавно и незабележимо. Ранната оценка е винаги по-добрият избор.',
    },
    moderate: {
      bandLabel: 'Умерен риск',
      headline: 'Има признаци, които заслужават внимание.',
      explanation: 'Отговорите ти показват модел, който често се задълбочава с времето — износване, напрежение или проблем със захапката. Не е спешно, но не е и нещо за игнориране.',
      urgency: 'Добре е да потърсиш професионална оценка скоро, за да разбереш какви са вариантите ти.',
      education: 'Този резултат не е диагноза. Той показва, че има достатъчно сигнали, за да си струва консултация със специалист — преди лечението да стане по-сложно.',
    },
    high: {
      bandLabel: 'Висок риск',
      headline: 'Отговорите ти показват сериозни сигнали.',
      explanation: 'Комбинацията от симптоми — захапка, напрежение, износване — често означава проблем, който се влошава. Колкото по-рано действаш, толкова по-леко и по-евтино е лечението.',
      urgency: 'Препоръчваме ти да потърсиш специалист възможно най-скоро.',
      education: 'Това не е диагноза, но е ясен сигнал, че ситуацията изисква професионална оценка. Не отлагай — разликата може да бъде голяма.',
    },
  },
  teen: {
    low: {
      bandLabel: 'Нисък риск',
      headline: 'Засега нещата изглеждат добре.',
      explanation: 'Отговорите показват малко сигнали за проблем. Тийнейджърските години обаче са ключов период за развитие на захапката.',
      urgency: 'Профилактичен преглед при ортодонт е добра идея — особено в този период на растеж.',
      education: 'Между 12 и 17 години лечението е най-ефективно и най-бързо. Ранната оценка може да спести много време и средства по-късно.',
    },
    moderate: {
      bandLabel: 'Умерен риск',
      headline: 'Има признаци, които заслужават внимание.',
      explanation: 'Отговорите показват няколко сигнала — струпани зъби, захапка или дишане. В тийнейджърска възраст тези проблеми могат да се коригират значително по-лесно.',
      urgency: 'Сега е идеалният момент за консултация — докато растежът все още работи във ваша полза.',
      education: 'Тийнейджърските години са "златният прозорец" за ортодонтска корекция. Костите все още растат, което прави лечението по-бързо и по-ефективно.',
    },
    high: {
      bandLabel: 'Висок риск',
      headline: 'Отговорите показват ясни сигнали за проблем.',
      explanation: 'Комбинацията от струпване, захапка и евентуално дишане показва, че е важно да се действа. В тази възраст корекцията все още е много по-лесна, отколкото при възрастен.',
      urgency: 'Не изпускайте този прозорец — консултацията при ортодонт е важна стъпка сега.',
      education: 'Ранното лечение при тийнейджъри не само подобрява усмивката, но и предотвратява по-сериозни функционални проблеми в бъдеще.',
    },
  },
  child: {
    low: {
      bandLabel: 'Нисък риск',
      headline: 'Засега нещата изглеждат нормално.',
      explanation: 'Отговорите показват малко сигнали. При деца под 12 г. обаче развитието тепърва предстои и е важно да се наблюдава.',
      urgency: 'Първият преглед при ортодонт се препоръчва на 7-годишна възраст — дори без видим проблем.',
      education: 'Много проблеми при деца се развиват тихо. Ранната оценка може да предотврати нуждата от по-сложно лечение по-късно.',
    },
    moderate: {
      bandLabel: 'Умерен риск',
      headline: 'Забелязваме сигнали, които заслужават внимание.',
      explanation: 'Дишането през устата, тесните челюсти или ранното струпване са сигнали, че развитието може да не върви по план. При децата интервенцията е най-проста и най-ефективна.',
      urgency: 'Препоръчваме преглед при ортодонт — ранната намеса може да промени хода на развитие.',
      education: 'При деца целта не е брекети — а насочване на растежа. Малка интервенция сега може да спести голямо лечение по-късно.',
    },
    high: {
      bandLabel: 'Висок риск',
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

const getBandStyles = (band: ResultBand) => {
  switch (band) {
    case 'low': return { bgGradient: 'from-emerald-50 to-emerald-100/30', borderColor: 'border-emerald-200', textColor: 'text-emerald-800', accentBg: 'bg-emerald-100', dotColor: 'bg-emerald-500', labelBg: 'bg-emerald-100', labelText: 'text-emerald-700' }
    case 'moderate': return { bgGradient: 'from-amber-50 to-amber-100/30', borderColor: 'border-amber-200', textColor: 'text-amber-800', accentBg: 'bg-amber-100', dotColor: 'bg-amber-500', labelBg: 'bg-amber-100', labelText: 'text-amber-700' }
    case 'high': return { bgGradient: 'from-red-50 to-red-100/30', borderColor: 'border-red-200', textColor: 'text-red-800', accentBg: 'bg-red-100', dotColor: 'bg-red-500', labelBg: 'bg-red-100', labelText: 'text-red-700' }
  }
}

const generateSessionId = () => `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// ─── Component ────────────────────────────────────────────
export function MasterQuiz() {
  const router = useRouter()
  const [segment, setSegment] = useState<Segment | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ questionId: string; value: string; score: number; tags?: string[] }[]>([])
  const [result, setResult] = useState<{ band: ResultBand; totalScore: number; flags: string[] } | null>(null)
  const [step, setStep] = useState<'segment' | 'quiz' | 'insight' | 'result' | 'soft_commit' | 'form' | 'exit'>('segment')
  const [formVersion, setFormVersion] = useState<'A' | 'B'>('A')
  const [formData, setFormData] = useState({ city: '' })
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

  if (!isClient) {
    return <main className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></main>
  }

  const questions = segment ? QUESTION_SETS[segment] : []
  const totalQ = questions.length
  const progress = result ? 100 : segment ? ((currentQuestion) / totalQ) * 100 : 0

  // ─── Handlers ─────────────────────────────────────────
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
      const leadData = {
        city_slug: formData.city, treatment_type: 'diagnostic_quiz',
        answers: { ...answersObj, quiz_score: result?.totalScore || 0, quiz_band: result?.band || '', quiz_flags: result?.flags || [], segment, form_version: formVersion, session_id: sessionId.current, source: 'diagnostic_quiz_v1' },
        score_total: result?.totalScore || 0,
        band: bandMap[result?.band || 'low'],
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FCFAF8]/80 backdrop-blur-xl border-b border-white/40">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-3">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-slate-900 shrink-0">Zubite<span className="text-teal-600">.bg</span></Link>
          <span
            className="hidden sm:inline-flex items-center gap-1 rounded-full bg-teal-50 ring-1 ring-teal-100 text-teal-700 text-[10px] uppercase tracking-[0.16em] font-semibold px-2.5 py-1"
            data-testid="quiz-safety-chip"
            title="Ориентир, не диагноза"
          >
            <ShieldCheck className="w-3 h-3" /> Ориентир, не диагноза
          </span>
          {showCount && (
            <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-slate-500 shrink-0">
              <span className="font-medium text-slate-700">{currentQuestion + 1}</span>
              <span className="text-slate-400">/</span>
              <span>{totalQ}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  )

  // ─── SEGMENT SELECT ────────────────────────────────────
  if (step === 'segment') {
    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <Header />
        <div className="pt-14 min-h-screen flex items-center justify-center px-4 py-12">
          <div className={`w-full max-w-lg transition-all duration-200 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 ring-1 ring-teal-100 text-teal-700 text-[10px] font-semibold px-3 py-1 uppercase tracking-[0.18em]" data-testid="quiz-intro-eyebrow">
                Първоначален онлайн анализ на зъбите
              </span>
              <p className="mt-4 text-slate-500 text-sm leading-relaxed max-w-sm mx-auto" data-testid="quiz-intro-subhead">
                Отговори спокойно. Това не е диагноза — целта е да получиш
                ориентир дали има нещо, което си струва да провериш със
                специалист.
              </p>
              <h1 className="mt-6 font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-3" data-testid="segment-heading">
                За кого попълваш този тест?
              </h1>
              <p className="text-slate-500 text-sm">Въпросите ще бъдат адаптирани</p>
            </div>
            <div className="space-y-3">
              {([
                { seg: 'adult' as Segment, icon: <User className="w-6 h-6" />, label: 'За мен', sub: 'възрастен' },
                { seg: 'teen' as Segment, icon: <Users className="w-6 h-6" />, label: 'За тийнейджър', sub: '12–17 години' },
                { seg: 'child' as Segment, icon: <Baby className="w-6 h-6" />, label: 'За дете', sub: 'под 12 години' },
              ]).map(({ seg, icon, label, sub }) => (
                <button
                  key={seg}
                  onClick={() => handleSegmentSelect(seg)}
                  className="w-full flex items-center gap-4 p-5 sm:p-6 bg-white/70 backdrop-blur-xl rounded-2xl ring-1 ring-white/80 hover:ring-teal-300/60 hover:bg-white/90 hover:-translate-y-0.5 transition-all duration-200 group text-left shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)] hover:shadow-[0_16px_44px_-22px_rgba(13,148,136,0.30)]"
                  data-testid={`segment-${seg}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-teal-50/80 ring-1 ring-teal-100 group-hover:bg-teal-100 flex items-center justify-center text-teal-700 transition-colors shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-medium text-slate-800">{label}</p>
                    <p className="text-sm text-slate-400">{sub}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-teal-400 ml-auto transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─── INSIGHT SCREEN ────────────────────────────────────
  if (step === 'insight') {
    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <Header />
        <div className="pt-14 min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg animate-fade-in-up">
            <div className="bg-slate-800 rounded-2xl p-8 sm:p-10 text-center shadow-xl">
              <p className="text-white/90 text-lg sm:text-xl leading-relaxed mb-8 font-light">
                „{currentInsight}"
              </p>
              <button onClick={handleInsightContinue} className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 font-medium rounded-full hover:bg-slate-100 transition-all duration-300 group" data-testid="insight-continue-btn">
                <span>Продължи</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─── QUIZ SCREEN ───────────────────────────────────────
  if (step === 'quiz' && !result && segment) {
    const q = questions[currentQuestion]
    const isVisual = q.type === 'visual'

    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <Header showCount />
        <div className="pt-14 min-h-screen flex flex-col">
          {/* Progress */}
          <div className="sticky top-14 z-40 bg-[#FCFAF8]/80 backdrop-blur-xl">
            <div className="relative h-1.5 bg-slate-200/50 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-r-full"
                style={{
                  width: `${progress}%`,
                  backgroundImage: 'linear-gradient(90deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
                  boxShadow: '0 0 12px rgba(20,184,166,0.5)',
                }}
              />
              {/* Glossy shine line on top of progress */}
              <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/40" />
            </div>
            <p className="text-center text-[10.5px] uppercase tracking-[0.18em] text-slate-400 py-2">Проверяваме ситуацията…</p>
          </div>

          <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
            <div className="w-full max-w-xl">
              <div className={`transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
                <div className="relative bg-white/75 backdrop-blur-2xl rounded-2xl ring-1 ring-white/80 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.85)] p-6 sm:p-8">
                  {/* Inner top gloss */}
                  <div aria-hidden className="absolute inset-x-6 top-0.5 h-1/3 rounded-full bg-gradient-to-b from-white/55 to-transparent pointer-events-none opacity-70" />
                  <h1 className="relative font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-6 sm:mb-8 leading-relaxed" data-testid="question-text">
                    {q.question}
                  </h1>

                  {isVisual ? (
                    /* Visual grid */
                    <div className="relative grid grid-cols-3 gap-3 sm:gap-4">
                      {q.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleAnswer(q.id, opt.value, opt.score, opt.tags)}
                          className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 hover:ring-teal-300/70 hover:bg-white/90 hover:-translate-y-0.5 transition-all duration-200 group shadow-[0_6px_24px_-16px_rgba(15,23,42,0.18)]"
                          data-testid={`option-${opt.value}`}
                        >
                          <div className="w-full aspect-square flex items-center justify-center">
                            {opt.visual}
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-slate-700 text-center group-hover:text-teal-700 transition-colors">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* Text options */
                    <div className="relative space-y-3">
                      {q.options.map((opt, idx) => (
                        <button
                          key={opt.value}
                          onClick={() => handleAnswer(q.id, opt.value, opt.score, opt.tags)}
                          className="w-full text-left p-4 sm:p-5 rounded-xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 text-slate-800 hover:ring-teal-300/70 hover:bg-white/95 hover:-translate-y-0.5 transition-all duration-200 group shadow-[0_6px_24px_-16px_rgba(15,23,42,0.18)] hover:shadow-[0_14px_36px_-18px_rgba(13,148,136,0.30)]"
                          data-testid={`option-${opt.value}`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-teal-50 ring-1 ring-teal-200 flex items-center justify-center text-sm font-semibold text-teal-700 group-hover:bg-teal-100 group-hover:ring-teal-300 transition-colors shrink-0">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-base sm:text-lg">{opt.label}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQuestion > 0 && (
                    <button onClick={handleBack} className="mt-6 flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm" data-testid="quiz-back-btn">
                      <ArrowLeft className="w-4 h-4" /> Назад
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─── RESULT SCREEN ─────────────────────────────────────
  if (step === 'result' && result && segment) {
    const content = RESULT_CONTENT[segment][result.band]
    const styles = getBandStyles(result.band)

    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <Header />
        <div className="pt-14 min-h-screen px-4 py-8 sm:py-12">
          <div className="w-full max-w-2xl mx-auto">
            <div className={`bg-gradient-to-br ${styles.bgGradient} rounded-2xl border-2 ${styles.borderColor} p-6 sm:p-8 mb-6 animate-fade-in-up`} data-testid="result-card">
              <div className="flex items-center gap-2 mb-6">
                <span className={`w-2.5 h-2.5 rounded-full ${styles.dotColor}`} />
                <span className={`text-sm font-semibold ${styles.labelText} ${styles.labelBg} px-3 py-1 rounded-full`}>{content.bandLabel}</span>
                <span className="text-xs text-slate-400 ml-auto">Сегмент: {SEGMENT_LABELS[segment]}</span>
              </div>
              <h1 className={`font-serif text-2xl sm:text-3xl font-semibold ${styles.textColor} mb-6 leading-tight`}>{content.headline}</h1>
              <p className="text-slate-700 text-base sm:text-lg leading-relaxed mb-6">{content.explanation}</p>
              <div className={`${styles.accentBg} rounded-xl p-4 mb-6`}>
                <p className={`${styles.textColor} font-medium`}>{content.urgency}</p>
              </div>

              {/* Flags */}
              {result.flags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {result.flags.map(f => (
                    <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-white/60 text-slate-600 border border-slate-200">
                      {{ crowding: 'Струпване', bite_issue: 'Захапка', airway: 'Дишане', tension: 'Напрежение', wear: 'Износване', development: 'Развитие' }[f] || f}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-slate-600 text-sm leading-relaxed border-t border-slate-200/50 pt-6">{content.education}</p>
            </div>

            <div className="text-center animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <button
                onClick={() => { trackEvent('result_to_soft_commit', { band: result.band, segment }); setStep('soft_commit') }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-teal-500 text-white font-medium rounded-full hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300 group"
                data-testid="result-continue-btn"
              >
                <span>Виж какви са опциите {segment === 'adult' ? 'ти' : ''}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─── SOFT COMMIT ───────────────────────────────────────
  if (step === 'soft_commit') {
    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <Header />
        <div className="pt-14 min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg animate-fade-in-up">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 sm:p-10 text-center">
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-4">
                {segment === 'adult' ? 'Искаш ли да видиш какви са опциите ти?' : 'Искате ли да видите подходящите опции?'}
              </h1>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-10">
                {MANUAL_RECOMMENDATION_COPY.shortIntro}
              </p>
              <div className="space-y-4">
                <button onClick={() => { trackEvent('soft_commit', { choice: 'yes' }); trackSoftCommit(true); setStep('form') }} className="w-full px-8 py-4 bg-teal-500 text-white font-medium rounded-full hover:bg-teal-600 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group" data-testid="soft-commit-yes">
                  <span>Да, покажете ми опциите</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => { trackEvent('soft_commit', { choice: 'no' }); trackSoftCommit(false); setStep('exit') }} className="w-full px-8 py-4 text-slate-500 font-medium rounded-full hover:text-slate-700 hover:bg-slate-100 transition-all duration-300" data-testid="soft-commit-no">
                  Не сега
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─── EXIT ──────────────────────────────────────────────
  if (step === 'exit') {
    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <Header />
        <div className="pt-14 min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg animate-fade-in-up">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <X className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                {segment === 'adult' ? 'Можеш да провериш отново по всяко време.' : 'Можете да проверите отново по всяко време.'}
              </p>
              <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-100 text-slate-700 font-medium rounded-full hover:bg-slate-200 transition-all duration-300" data-testid="exit-home-btn">
                Обратно към началото
              </Link>
            </div>
          </div>
        </div>
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
      <main className="min-h-screen bg-[#FCFAF8]">
        <Header />
        <div className="pt-14 min-h-screen px-4 py-8 sm:py-12">
          <div className="w-full max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 animate-fade-in-up">
              <div className="text-center mb-8 pb-6 border-b border-slate-100">
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-3">
                  Последна стъпка преди резултата
                </h2>
                <p className="text-slate-600 text-sm sm:text-base">
                  Избери в кой град си — данните за връзка ще въведеш на
                  следващия екран, заедно с твоя персонален резултат.
                </p>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Град <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {CITIES.map(c => (
                      <button key={c.value} type="button" onClick={() => setFormData(p => ({ ...p, city: c.value }))}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 font-medium ${formData.city === c.value ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        data-testid={`city-${c.value}`}>
                        <MapPin className="w-4 h-4" />{c.label}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-xl">{error}</p>}
                <button onClick={handleSubmit} disabled={isSubmitting}
                  className="w-full mt-4 px-8 py-4 bg-teal-500 text-white font-semibold rounded-full hover:bg-teal-600 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="submit-btn">
                  {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" />Изпращане...</> : <>Виж моя резултат<ArrowRight className="w-5 h-5" /></>}
                </button>
                <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">{MANUAL_RECOMMENDATION_COPY.safetyNote}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return null
}
