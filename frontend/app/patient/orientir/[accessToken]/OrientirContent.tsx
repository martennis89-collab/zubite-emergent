'use client'

/**
 * OrientirContent — patient-facing magic-link landing.
 *
 * Resolves an opaque access token via GET /api/patient-orientation/{token}
 * and renders a calm, scannable view of:
 *   1. Risk band (low/moderate/high) — labelled as "ориентир, не диагноза".
 *   2. Next-step guidance (Manual Recommendation Mode).
 *   3. Care Pass eligibility wording (oral hygiene only, AFTER consult).
 *   4. CTAs back to /quiz (retake) or /care-pass (learn more).
 *
 * Hard rules:
 *   - The raw lead_id is NEVER fetched, NEVER displayed, NEVER stored.
 *   - The token is shown in the URL but treated as an opaque secret.
 *   - Invalid / expired tokens get a calm error state with a retake CTA.
 *
 * Backend contract (GET /api/patient-orientation/{token}):
 *   200 → { success, band, city_slug, treatment_type, segment, display_name, created_at }
 *   404 → { detail: { code: 'token_not_found' | 'token_revoked', message } }
 *   410 → { detail: { code: 'token_expired', message } }
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, ShieldCheck, Sparkles, MapPin, Gift, AlertTriangle,
  Loader2, CheckCircle2, Compass,
} from 'lucide-react'

type Band = 'GREEN' | 'YELLOW' | 'RED' | string

interface OrientationData {
  success: true
  band: Band | null
  city_slug: string | null
  treatment_type: string | null
  segment: 'adult' | 'teen' | 'child' | null
  display_name: string | null
  created_at: string | null
}

interface ErrorState {
  code: 'token_not_found' | 'token_revoked' | 'token_expired' | 'network'
  message: string
}

const CITY_NAMES: Record<string, string> = {
  sofia: 'София', plovdiv: 'Пловдив', varna: 'Варна', burgas: 'Бургас',
  ruse: 'Русе', 'stara-zagora': 'Стара Загора', pleven: 'Плевен',
  sliven: 'Сливен', dobrich: 'Добрич', shumen: 'Шумен', haskovo: 'Хасково',
}

const TREATMENT_NAMES: Record<string, string> = {
  invisalign: 'Инвизалайн / алайнери',
  implants: 'Зъбни импланти',
  full_mouth: 'Цялостно възстановяване',
  diagnostic_quiz: 'Дентален ориентир',
  orthodontics: 'Ортодонтия',
}

const BAND_LABELS: Record<string, string> = {
  GREEN: 'Нисък риск',
  YELLOW: 'Умерен риск',
  RED: 'Висок риск',
}

const BAND_SUMMARIES: Record<string, string> = {
  GREEN:
    'Профилактичен преглед при стоматолог остава добра идея, за да поддържаш здравето си.',
  YELLOW:
    'Има признаци, които заслужават внимание от специалист. Препоръчваме консултация при стоматолог или ортодонт.',
  RED:
    'Комбинация от симптоми, които е важно да се оценят от специалист. Препоръчваме да насрочиш консултация.',
}

const BAND_STYLES: Record<string, { ring: string; bg: string; text: string; dot: string }> = {
  GREEN: { ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  YELLOW: { ring: 'ring-amber-200',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  RED:    { ring: 'ring-red-200',    bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
}

export function OrientirContent({ accessToken }: { accessToken: string }) {
  const [data, setData] = useState<OrientationData | null>(null)
  const [error, setError] = useState<ErrorState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
        const res = await fetch(
          `${apiUrl}/api/patient-orientation/${encodeURIComponent(accessToken)}`,
          { method: 'GET', cache: 'no-store' },
        )
        if (cancelled) return
        if (res.ok) {
          const json = (await res.json()) as OrientationData
          setData(json)
        } else {
          let code: ErrorState['code'] = 'token_not_found'
          let message = 'Линкът е невалиден или вече не съществува.'
          try {
            const j = await res.json()
            if (j?.detail?.code) code = j.detail.code
            if (j?.detail?.message) message = j.detail.message
          } catch { /* ignore */ }
          setError({ code, message })
        }
      } catch {
        if (!cancelled) {
          setError({
            code: 'network',
            message: 'Не успяхме да заредим твоя ориентир. Опитай отново след малко.',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [accessToken])

  return (
    <main className="min-h-screen bg-[#FCFAF8] relative overflow-hidden">
      {/* Decorative backdrop matching the rest of the patient funnel. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.25) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 80% 60%, rgba(165,243,252,0.30) 0%, transparent 60%)',
        }}
      />
      <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/40 blur-3xl pointer-events-none" />

      <header className="relative py-5 px-4 border-b border-white/40 backdrop-blur-sm" data-testid="orientir-header">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="font-serif text-xl font-semibold tracking-tight text-slate-900"
            data-testid="orientir-brand"
          >
            Zubite<span className="text-teal-600">.bg</span>
          </Link>
        </div>
      </header>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {loading && <LoadingState />}
        {!loading && error && <ErrorView error={error} />}
        {!loading && data && <ResultView data={data} />}
      </div>

      <footer className="relative py-6 border-t border-white/40 mt-8" data-testid="orientir-footer">
        <div className="max-w-2xl mx-auto px-4 text-center text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} Zubite.bg — Платформа за ориентация в денталното здраве</p>
        </div>
      </footer>
    </main>
  )
}

function LoadingState() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center text-center" data-testid="orientir-loading">
      <Loader2 className="w-7 h-7 text-teal-600 animate-spin mb-3" />
      <p className="text-sm text-slate-500">Зареждаме твоя ориентир…</p>
    </div>
  )
}

function ErrorView({ error }: { error: ErrorState }) {
  // Treat all error codes as calm "your link is no longer active" states.
  // We never blame the user; CTA goes back to the quiz.
  const isExpired = error.code === 'token_expired'
  return (
    <div
      className="relative rounded-2xl bg-white/75 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.85)] p-6 sm:p-8 text-center"
      data-testid="orientir-error"
    >
      <div className="w-12 h-12 rounded-full bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-amber-600" />
      </div>
      <h1 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-2">
        {isExpired ? 'Линкът е изтекъл' : 'Линкът вече не е активен'}
      </h1>
      <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto mb-6">
        {error.message}
      </p>
      <Link
        href="/quiz"
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white font-semibold text-sm shadow-[0_10px_24px_-12px_rgba(13,148,136,0.55)] transition-transform hover:-translate-y-0.5"
        style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
        data-testid="orientir-error-cta"
      >
        Попълни ориентира отново
        <ArrowRight className="w-4 h-4" />
      </Link>
      <p className="mt-5 text-[11px] text-slate-400 leading-relaxed">
        Zubite не поставя диагноза и не замества преглед при лекар.
      </p>
    </div>
  )
}

function ResultView({ data }: { data: OrientationData }) {
  const bandKey = (data.band || '').toUpperCase()
  const bandLabel = BAND_LABELS[bandKey] || 'Резултат от ориентира'
  const bandSummary = BAND_SUMMARIES[bandKey] || 'Препоръчваме консултация при стоматолог за по-добра оценка.'
  const bandStyle = BAND_STYLES[bandKey] || BAND_STYLES.YELLOW
  const cityName = data.city_slug ? CITY_NAMES[data.city_slug] || data.city_slug : null
  const treatmentName = data.treatment_type ? TREATMENT_NAMES[data.treatment_type] || data.treatment_type : null
  const greetingName = data.display_name || null

  return (
    <div className="space-y-5" data-testid="orientir-result">
      {/* Header / greeting */}
      <div className="text-center mb-2" data-testid="orientir-greeting">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-50 ring-1 ring-teal-100 mb-4">
          <Compass className="w-7 h-7 text-teal-600" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mb-1">
          {greetingName ? `Здравей, ${greetingName}` : 'Твоят запазен ориентир'}
        </h1>
        <p className="text-slate-500 text-sm">
          Това е ориентир, не диагноза.
        </p>
      </div>

      {/* Band card */}
      <div
        className={`relative rounded-2xl ring-1 ${bandStyle.ring} ${bandStyle.bg} backdrop-blur-md p-5 sm:p-6 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.15)]`}
        data-testid="orientir-band-card"
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`w-2 h-2 rounded-full ${bandStyle.dot}`} />
          <span className={`text-sm font-semibold ${bandStyle.text}`} data-testid="orientir-band-label">
            {bandLabel}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-teal-50 ring-1 ring-teal-100 text-teal-700 text-[10px] uppercase tracking-[0.16em] font-semibold px-2 py-0.5"
            data-testid="orientir-safety-chip"
          >
            <ShieldCheck className="w-3 h-3" /> Ориентир, не диагноза
          </span>
          {cityName && (
            <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {cityName}
            </span>
          )}
        </div>
        <p className="text-slate-700 text-[15px] leading-relaxed" data-testid="orientir-band-summary">
          {bandSummary}
        </p>
        {treatmentName && (
          <p className="mt-3 text-[13px] text-slate-500" data-testid="orientir-treatment-label">
            Категория: <span className="text-slate-700 font-medium">{treatmentName}</span>
          </p>
        )}
      </div>

      {/* Next-step guidance — Manual Recommendation Mode framing. */}
      <div
        className="rounded-2xl bg-white/75 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.85)] p-5 sm:p-6"
        data-testid="orientir-next-steps"
      >
        <h2 className="font-serif text-lg font-semibold text-slate-900 mb-4">
          Каква следваща стъпка има смисъл?
        </h2>
        <ul className="space-y-3.5">
          {[
            'Запази часа за консултация при стоматолог или ортодонт.',
            'Споделил си отговорите си — екипът на Zubite.bg ги преглежда ръчно.',
            'Свързваме се с теб с подходящи насоки и партньорски клиники.',
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-3" data-testid={`orientir-step-${i}`}>
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold mt-0.5 shadow-[0_6px_16px_-6px_rgba(13,148,136,0.5)]"
                style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
                aria-hidden="true"
              >
                {i + 1}
              </div>
              <p className="text-slate-700 text-[15px] leading-relaxed">{s}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[12px] text-slate-400 leading-relaxed" data-testid="orientir-manual-note">
          В момента изграждаме подбрана партньорска мрежа от клиники, затова
          преглеждаме част от заявките ръчно — за по-смислено насочване според
          твоя случай.
        </p>
      </div>

      {/* Care Pass explanation — premium dark panel matching success page. */}
      <div
        className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.35)]"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 100% 0%, rgba(20,184,166,0.30) 0%, transparent 60%),' +
            'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
        }}
        data-testid="orientir-care-pass"
      >
        <div aria-hidden className="absolute inset-x-4 top-1 h-1/3 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-teal-300/80 font-semibold">Zubite Care Pass</p>
              <h2 className="mt-0.5 font-serif text-base sm:text-lg text-white leading-snug font-semibold">
                След посетена консултация получаваш Care Pass.
              </h2>
            </div>
          </div>
          <p className="mt-4 text-[13px] text-slate-300 leading-relaxed">
            Ако посетиш консултация в партньорска клиника чрез Zubite.bg,
            клиниката ще ти предостави Zubite Care Pass — отстъпки за
            <strong className="text-white"> продукти за орална хигиена</strong>.
          </p>
          <ul className="mt-4 space-y-1.5" data-testid="orientir-care-pass-not">
            {[
              'Не е отстъпка от лечение',
              'Не е застраховка',
              'Не е абонамент',
              'Не замества професионалната дентална препоръка',
            ].map((c) => (
              <li key={c} className="flex items-center gap-2 text-[12.5px] text-slate-300">
                <span className="w-1 h-1 rounded-full bg-teal-300" aria-hidden="true" />
                {c}
              </li>
            ))}
          </ul>
          <Link
            href="/care-pass"
            className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-teal-300 hover:text-teal-200 transition-colors"
            data-testid="orientir-care-pass-learn-more"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Научи повече за Care Pass
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="orientir-ctas">
        <Link
          href="/quiz"
          className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white font-semibold text-sm shadow-[0_10px_24px_-12px_rgba(13,148,136,0.55)] transition-transform hover:-translate-y-0.5"
          style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
          data-testid="orientir-cta-primary"
        >
          <CheckCircle2 className="w-4 h-4" />
          Попълни ориентира отново
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white/70 backdrop-blur-xl ring-1 ring-white/80 text-slate-800 text-sm font-semibold hover:-translate-y-0.5 transition-all"
          data-testid="orientir-cta-secondary"
        >
          Към началната страница
        </Link>
      </div>

      {/* Trust footer */}
      <div className="pt-4 text-center" data-testid="orientir-trust">
        <p className="text-[11px] text-slate-400 leading-relaxed max-w-md mx-auto">
          Zubite не поставя диагноза и не замества преглед при лекар.
          Линкът е личен — не го споделяй публично.
        </p>
      </div>
    </div>
  )
}
