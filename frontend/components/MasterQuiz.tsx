'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft, Bot, Loader2, User, Users, Baby, ShieldCheck } from 'lucide-react'
import {
  trackQuizStart,
  trackQuestionAnswered,
  trackQuizComplete
} from './MetaPixel'
import { trackEvent as gaTrackEvent } from '@/lib/analytics/gtag'
import { getStoredAttribution } from '@/lib/attribution'

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
      { label: 'Да', value: 'yes', score: 2, tags: ['airway', 'approach_airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['airway', 'approach_airway'] },
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
      { label: 'Да', value: 'yes', score: 2, tags: ['tension', 'approach_posture'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['approach_posture'] },
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
      { label: 'Да', value: 'yes', score: 2, tags: ['airway', 'approach_airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['airway', 'approach_airway'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 't7', type: 'text',
    question: 'Има ли затруднения с говор или произнасяне на определени звуци?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['development', 'approach_speech'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['approach_speech'] },
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
      { label: 'Да', value: 'yes', score: 2, tags: ['airway', 'approach_airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['airway', 'approach_airway'] },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'c3', type: 'text',
    question: 'Хърка ли или има неспокоен сън?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['airway', 'approach_airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1 },
      { label: 'Не', value: 'no', score: 0 },
    ]
  },
  {
    id: 'c4', type: 'text',
    question: 'Смуче ли пръст или използва ли биберон дълго време?',
    options: [
      { label: 'Да', value: 'yes', score: 2, tags: ['development', 'approach_swallowing'] },
      { label: 'Преди да, вече не', value: 'past', score: 1, tags: ['development', 'approach_swallowing'] },
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
      { label: 'Да', value: 'yes', score: 2, tags: ['airway', 'approach_airway'] },
      { label: 'Понякога', value: 'sometimes', score: 1, tags: ['airway', 'approach_airway'] },
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

// ─── Intake questions (Phase 1 Smart Consultation Flow) ────
// Non-diagnostic — every option scores 0, so they cannot influence
// `calculateResult`'s totalScore/band. Appended after the diagnostic
// questions in every segment so existing MICRO_INSIGHTS indices (keyed
// to the original per-segment question order) stay unaffected. Answers
// ride the existing generic `answersObj[questionId] = value` path in
// `handleSubmit` — no submit-flow changes needed.
const INTAKE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'treatment_interest', type: 'text',
    question: 'Какво лечение обмисляш в момента?',
    options: [
      { label: 'Алайнери / Invisalign', value: 'aligners', score: 0 },
      { label: 'Брекети', value: 'braces', score: 0 },
      { label: 'И двете', value: 'both', score: 0 },
      { label: 'Не съм сигурен/сигурна', value: 'unsure', score: 0 },
      { label: 'Искам лекар да ми каже', value: 'ask_doctor', score: 0 },
    ]
  },
  {
    id: 'readiness_timeline', type: 'text',
    question: 'Кога искаш да направиш следваща стъпка?',
    options: [
      { label: 'Възможно най-скоро', value: 'asap', score: 0 },
      { label: 'До 1 месец', value: 'within_1_month', score: 0 },
      { label: 'След 1–3 месеца', value: 'in_1_3_months', score: 0 },
      { label: 'Само проучвам', value: 'just_researching', score: 0 },
    ]
  },
  {
    id: 'budget_mindset', type: 'text',
    question: 'Как мислиш за бюджета?',
    options: [
      { label: 'Търся най-достъпен вариант', value: 'affordable', score: 0 },
      { label: 'Искам баланс цена/качество', value: 'balanced', score: 0 },
      { label: 'Готов/а съм за премиум решение, ако има смисъл', value: 'premium_if_justified', score: 0 },
      { label: 'Не знам какви са реалните цени', value: 'unknown_pricing', score: 0 },
    ]
  },
  {
    id: 'second_opinion', type: 'text',
    question: 'Искаш ли да сравниш повече от едно мнение?',
    options: [
      { label: 'Да, искам да сравня до 3 опции', value: 'compare_up_to_3', score: 0 },
      { label: 'Не, искам да избера една клиника', value: 'single_clinic', score: 0 },
      { label: 'Първо искам Zubite да ми помогне', value: 'zubite_help_first', score: 0 },
    ]
  },
  {
    id: 'has_files', type: 'text',
    question: 'Имаш ли снимка, план или оферта от клиника?',
    options: [
      { label: 'Да, имам OPG / панорамна снимка', value: 'has_opg', score: 0 },
      { label: 'Да, имам план или оферта', value: 'has_plan_or_offer', score: 0 },
      { label: 'Да, имам снимки на усмивката/зъбите', value: 'has_smile_photos', score: 0 },
      { label: 'Не', value: 'none', score: 0 },
      { label: 'Не съм сигурен/сигурна', value: 'unsure', score: 0 },
    ]
  },
]

const QUESTION_SETS: Record<Segment, QuizQuestion[]> = {
  adult: [...ADULT_QUESTIONS, ...INTAKE_QUESTIONS],
  teen: [...TEEN_QUESTIONS, ...INTAKE_QUESTIONS],
  child: [...CHILD_QUESTIONS, ...INTAKE_QUESTIONS],
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

// ─── Scoring ──────────────────────────────────────────────
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

const generateSessionId = () => `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// ─── Component ────────────────────────────────────────────
export function MasterQuiz() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [segment, setSegment] = useState<Segment | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ questionId: string; value: string; score: number; tags?: string[] }[]>([])
  const [result, setResult] = useState<{ band: ResultBand; totalScore: number; flags: string[] } | null>(null)
  const [step, setStep] = useState<'segment' | 'quiz' | 'insight' | 'result'>('segment')
  const [formVersion, setFormVersion] = useState<'A' | 'B'>('A')
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

        // The canonical result lives only at /results/[leadId]. Create
        // the answer-only lead now and hand off automatically instead of
        // rendering a second result screen inside the quiz.
        setStep('result')
        void handleSubmit(res, newAnswers)
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

  const handleSubmit = async (
    resultOverride = result,
    answersOverride = answers,
  ) => {
    // This POST is answers-only. The canonical result page then asks for
    // the delivery email and city in one concise form; the city lets the
    // following recommendation prompt stay a simple yes/no choice.
    setIsSubmitting(true); setError('')

    try {
      const answersObj: Record<string, string> = {}
      answersOverride.forEach(a => { answersObj[a.questionId] = a.value })
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const bandMap: Record<ResultBand, string> = { low: 'GREEN', moderate: 'YELLOW', high: 'RED' }

      const leadData = {
        treatment_type: 'diagnostic_quiz',
        answers: { ...answersObj, quiz_score: resultOverride?.totalScore || 0, quiz_band: resultOverride?.band || '', quiz_flags: resultOverride?.flags || [], segment, form_version: formVersion, session_id: sessionId.current, source: 'diagnostic_quiz_v1' },
        score_total: resultOverride?.totalScore || 0,
        band: bandMap[resultOverride?.band || 'low'],
        // No city/contact fields here — they arrive through unlock-result
        // after the full result is already visible.
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

      trackEvent('locked_lead_created', { form_version: formVersion, segment })
      // This answer-only record is not yet an acquisition conversion.
      // Lead events fire after a patient unlocks the result with contact data.

      if (!createdLeadId) {
        // Backend accepted the lead but we couldn't read the id — fall
        // back to the legacy success page so the patient still lands
        // somewhere coherent.
        const successParams = new URLSearchParams({ stage: resultOverride?.band || 'low', segment: segment || 'adult' })
        router.push(`/quiz/success?${successParams.toString()}`)
        return
      }
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
      <main className="taste-site taste-quiz-page taste-quiz-viewport">
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
      <main className="taste-site taste-quiz-page taste-quiz-viewport">
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
      <main className="taste-site taste-quiz-page taste-quiz-viewport">
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

  // ─── RESULT HANDOFF ────────────────────────────────────
  if (step === 'result' && result && segment) {
    return (
      <main className="taste-site taste-quiz-page taste-quiz-viewport">
        <Header />
        <section className="taste-quiz-centered">
          <div className="taste-quiz-insight-card animate-fade-in-up" data-testid="result-handoff">
            <span className="taste-quiz-insight-index">Въпросникът е завършен</span>
            <p>{error ? 'Не успяхме да отворим резултата ти.' : 'Подготвяме пълния ти резултат…'}</p>
            <div>
              <span>
                {error
                  ? 'Отговорите ти са запазени в този екран. Опитай отново.'
                  : 'Ще те прехвърлим автоматично — не е нужно да натискаш нищо.'}
              </span>
              {error ? (
                <button
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="taste-quiz-primary"
                  data-testid="result-retry-btn"
                >
                  {isSubmitting ? <><Loader2 className="animate-spin" />Зареждаме…</> : <>Опитай отново<ArrowRight aria-hidden /></>}
                </button>
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" aria-label="Зареждане" />
              )}
            </div>
          </div>
        </section>
      </main>
    )
  }

  return null
}
