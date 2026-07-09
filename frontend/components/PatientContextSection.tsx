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

import { TREATMENT_LABELS, readinessLabel, urgencyLabel } from '@/lib/consultationLabels'

export interface PatientContextQuizRow {
  question_label: string
  answer_label: string
}

export interface PatientContextSource {
  source_type: 'quiz' | 'article' | 'campaign' | 'direct' | 'unknown'
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
  quiz_summary: PatientContextQuizRow[]
  source_context: PatientContextSource
}

const SOURCE_TYPE_LABELS: Record<PatientContextSource['source_type'], string> = {
  quiz:     'Въпросник',
  article:  'Статия в блога',
  campaign: 'Кампания',
  direct:   'Директно посещение',
  unknown:  'Източникът не е известен',
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

export function PatientContextSection({ ctx }: { ctx: PatientContext }) {
  const hasMainContext = !!(
    ctx.treatment_interest || ctx.city || ctx.readiness || ctx.urgency
  )
  const hasShared = !!(ctx.main_concern || ctx.patient_message)
  const hasQuiz = (ctx.quiz_summary?.length ?? 0) > 0
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
