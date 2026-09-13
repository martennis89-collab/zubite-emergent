// ─── Patient Context Section ──────────────────────────────────────
//
// Operational context shown after a request is assigned — the
// existing "Clinical Brief" equivalent, sourced from the backend's
// `patient_context` field. Patient-reported only. Never diagnostic.
// No raw JSON, no raw UTM dump, no internal scoring breakdown.
//
// Shared by both the clinic-facing request detail page
// (app/clinic/dashboard/requests/[id]/page.tsx) and the admin-facing
// request detail page (app/admin/consultation-requests/[id]/page.tsx)
// so the two surfaces never carry two copies of the same rendering
// logic.
//
// `sourceBadgeLabel` / `SourceBadge` below extend that same principle to
// the LIST views (Заявки, Пациенти) — a compact one-line version of the
// same source_context, so a clinic sees one consistent answer to "where
// did this patient come from" everywhere it appears, not slightly
// different wording on the list versus the detail page.

import { TREATMENT_LABELS, readinessLabel, urgencyLabel } from '@/lib/consultationLabels'

export interface PatientContextQuizRow {
  question_label: string
  answer_label: string
}

export interface PatientContextSource {
  // `not_tracked` is distinct from `unknown`: `unknown` means the
  // classifier looked at a real lead and could not place it; `not_tracked`
  // means this row predates ATTRIBUTION_LIST_VISIBLE_SINCE on the backend
  // and the real answer -- knowable, and shown on the lead's own detail
  // page -- is deliberately withheld here. Only ever set by the list
  // endpoints, never by `_safe_source_context` itself.
  source_type: 'quiz' | 'article' | 'campaign' | 'direct' | 'unknown' | 'not_tracked'
  article_title: string | null
  article_slug: string | null
  utm_source: string | null
  utm_campaign: string | null
  utm_ad: string | null
  content_path_summary: string | null
}

export interface PatientContext {
  label: string
  treatment_interest: string | null
  city: string | null
  readiness: string | null
  urgency: string | null
  main_concern: string | null
  patient_message: string | null
  /** Orientation stage the patient was shown on their result screen
   *  ("Ранен / Развиващ се / Напреднал етап"). Null for leads that
   *  never completed a quiz. */
  stage_label?: string | null
  /** Clinical flags derived by the quiz scorer (Струпване, Захапка…). */
  signal_flags?: string[]
  quiz_summary: PatientContextQuizRow[]
  source_context: PatientContextSource
}

const SOURCE_TYPE_LABELS: Record<PatientContextSource['source_type'], string> = {
  quiz:        'Въпросник',
  article:     'Статия в блога',
  campaign:    'Кампания',
  direct:      'Директно посещение',
  unknown:     'Източникът не е известен',
  not_tracked: 'Няма данни отпреди въвеждането',
}

function utmCampaignLabel(src: PatientContextSource): string {
  const parts: string[] = []
  if (src.utm_source) {
    const s = src.utm_source.toLowerCase()
    if (s === 'meta' || s === 'fb' || s === 'facebook') parts.push('Meta')
    else if (s === 'ig' || s === 'instagram') parts.push('Instagram')
    else if (s === 'google' || s === 'googleads' || s === 'google_ads') parts.push('Google')
    else parts.push(src.utm_source)
  }
  if (src.utm_campaign) parts.push(src.utm_campaign)
  return parts.join(' / ')
}

function articleFallbackLabel(src: PatientContextSource): string | null {
  if (src.article_title) return src.article_title
  if (src.article_slug) {
    return src.article_slug.replace(/[-_]+/g, ' ').trim()
  }
  return null
}

/** One line + a colour, for a list row. The full block below (with the
 * journey summary and orientation) belongs on a detail page; a list row
 * only has room for the answer to "where from", not the whole story. */
export function sourceBadgeLabel(src: PatientContextSource): { label: string; cls: string } {
  switch (src.source_type) {
    case 'campaign':
      return { label: utmCampaignLabel(src) || SOURCE_TYPE_LABELS.campaign, cls: 'bg-violet-50 text-violet-700' }
    case 'article':
      return { label: articleFallbackLabel(src) || SOURCE_TYPE_LABELS.article, cls: 'bg-sky-50 text-sky-700' }
    case 'quiz':
      return { label: SOURCE_TYPE_LABELS.quiz, cls: 'bg-teal-50 text-teal-700' }
    case 'direct':
      return { label: SOURCE_TYPE_LABELS.direct, cls: 'bg-slate-100 text-slate-600' }
    case 'not_tracked':
      return { label: SOURCE_TYPE_LABELS.not_tracked, cls: 'bg-slate-50 text-slate-400 italic' }
    default:
      return { label: SOURCE_TYPE_LABELS.unknown, cls: 'bg-slate-100 text-slate-500' }
  }
}

export function SourceBadge({ source }: { source: PatientContextSource }) {
  const { label, cls } = sourceBadgeLabel(source)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

export function PatientContextSection({ ctx }: { ctx: PatientContext }) {
  const hasMainContext = !!(
    ctx.treatment_interest || ctx.city || ctx.readiness || ctx.urgency
  )
  const hasShared = !!(ctx.main_concern || ctx.patient_message)
  const hasQuiz = (ctx.quiz_summary?.length ?? 0) > 0
  const stageLabel = ctx.stage_label ?? null
  const hasFlags = (ctx.signal_flags?.length ?? 0) > 0
  const article = articleFallbackLabel(ctx.source_context)
  const campaignLabel = utmCampaignLabel(ctx.source_context)
  const hasSource = !!(article || campaignLabel || ctx.source_context.content_path_summary)

  return (
    <section
      data-testid="patient-context-section"
      className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
    >
      <header className="space-y-1">
        <h2 className="font-serif text-lg font-semibold text-slate-900">
          Информация от пациента
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Това са отговори и контекст, споделени от пациента във въпросника.
          Не представляват диагноза и не заменят клиничен преглед.
        </p>
      </header>

      {/* Orientation the patient was actually shown. Leads the brief on
          purpose: it is what the patient already believes about their own
          case, so the clinic opens the conversation from the same page.
          Stays explicitly non-diagnostic — it is the quiz's orientation,
          not a clinical finding. */}
      {(stageLabel || hasFlags) && (
        <div
          data-testid="patient-context-orientation"
          className="rounded-xl border border-teal-100 bg-teal-50/50 p-4"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-teal-800/70">
            Ориентир, показан на пациента
          </div>
          {stageLabel && (
            <p className="mt-1.5 font-serif text-xl text-slate-900 leading-snug">
              {stageLabel}
            </p>
          )}
          {hasFlags && (
            <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="patient-context-flags">
              {ctx.signal_flags!.map((f) => (
                <li
                  key={f}
                  className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] text-slate-700 ring-1 ring-teal-100"
                >
                  {f}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-slate-500 leading-snug">
            Ориентировъчен резултат от въпросника — не е диагноза.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hasMainContext && (
          <article
            data-testid="patient-context-main"
            className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Пациентски контекст
            </div>
            <dl className="text-sm space-y-1.5">
              {ctx.treatment_interest && (
                <ContextRow label="Лечение" value={TREATMENT_LABELS[ctx.treatment_interest] || ctx.treatment_interest} />
              )}
              {ctx.city && <ContextRow label="Град" value={ctx.city} />}
              {ctx.readiness && (
                <ContextRow label="Готовност" value={readinessLabel(ctx.readiness)} />
              )}
              {ctx.urgency && (
                <ContextRow label="Спешност" value={urgencyLabel(ctx.urgency)} />
              )}
            </dl>
          </article>
        )}

        {hasShared && (
          <article
            data-testid="patient-context-shared"
            className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Какво споделя пациентът
            </div>
            {ctx.main_concern && (
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                {ctx.main_concern}
              </p>
            )}
            {ctx.patient_message && (
              <p
                className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words"
                data-testid="patient-context-message"
              >
                {ctx.patient_message}
              </p>
            )}
          </article>
        )}
      </div>

      <article
        data-testid="patient-context-quiz"
        className="rounded-xl border border-slate-100 p-4 space-y-2"
      >
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Отговори от въпросника
        </div>
        {hasQuiz ? (
          <ul className="divide-y divide-slate-100">
            {ctx.quiz_summary.map((row, i) => (
              <li
                key={`${row.question_label}-${i}`}
                className="py-2 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1 sm:gap-3 text-sm"
              >
                <span className="text-slate-500">{row.question_label}</span>
                <span className="text-slate-900 break-words">{row.answer_label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 py-1">
            Няма налични допълнителни отговори от въпросника.
          </p>
        )}
      </article>

      <article
        data-testid="patient-context-source"
        className="rounded-xl border border-slate-100 p-4 space-y-2"
      >
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Откъде дойде заявката
        </div>
        {hasSource ? (
          <div className="text-sm text-slate-800 space-y-1.5">
            <div>
              <span className="text-slate-500">Източник: </span>
              <span className="font-medium">
                {SOURCE_TYPE_LABELS[ctx.source_context.source_type]}
              </span>
            </div>
            {article && (
              <div>
                <span className="text-slate-500">Съдържание: </span>
                <span className="break-words">
                  Пациентът е дошъл след съдържание: {article}
                </span>
              </div>
            )}
            {!article && campaignLabel && (
              <div>
                <span className="text-slate-500">Кампания: </span>
                <span className="break-words">{campaignLabel}</span>
              </div>
            )}
            {ctx.source_context.content_path_summary && (
              <p className="text-xs text-slate-500 leading-relaxed">
                {ctx.source_context.content_path_summary}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-1">
            Източникът на заявката не е известен.
          </p>
        )}
      </article>
    </section>
  )
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="text-slate-500 w-28 shrink-0">{label}:</dt>
      <dd className="text-slate-900 break-words flex-1 min-w-0">{value}</dd>
    </div>
  )
}
