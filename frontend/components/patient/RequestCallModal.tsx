'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { X, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  postRequestCall,
  PATIENT_CONSENT_TEXT,
  type RequestCallSuccess,
} from '@/lib/api'
import { trackPatientEvent } from '@/lib/patientAnalytics'

interface Props {
  leadId: string
  clinic: { id: string; name: string; city_name?: string }
  source: 'matching_card' | 'clinic_profile'
  initialPhone?: string | null
  // Optional contact prefill — when present, the modal opens with a
  // read-only confirmation block ("Ще се свържем с вас на …") plus a
  // "Промени данните" toggle. Standard behaviour (empty editable phone
  // input) is preserved when the caller doesn't pass `initialContact`.
  initialContact?: {
    name?: string | null
    phone?: string | null
    email?: string | null
  } | null
  // Analytics-only context — passed through unchanged to the
  // request_call_submitted / request_call_failed events. Optional so
  // existing call sites work without modification.
  partnerTier?: string | null
  placementLabel?: string | null
  onClose: () => void
  // Called after a successful (or duplicate-200) submit. Receives the
  // server response so the caller can mark UI as submitted across pages.
  onSuccess: (resp: RequestCallSuccess) => void
}

type Phase = 'form' | 'submitting' | 'success' | 'error'

type ErrPayload = {
  code?: string
  message?: string
  clinic?: { id?: string; name?: string }
}

/**
 * P4 — real-submit modal for "Искам обаждане от тази клиника".
 *
 * Single source of truth for the consent text (must match backend
 * `REQUEST_CALL_CONSENT_TEXT`). The text is stored verbatim on the
 * consultation_request so audit can replay it.
 *
 * Failure handling rules:
 *   - 409 already_requested → show duplicate state with existing clinic info
 *   - 422 consent_required / phone_invalid → inline error, keep form open
 *   - all other 4xx/5xx → generic error with retry, never fake success
 */
export function RequestCallModal({
  leadId,
  clinic,
  source,
  initialPhone,
  initialContact,
  partnerTier,
  placementLabel,
  onClose,
  onSuccess,
}: Props) {
  // Resolved prefill — `initialContact` wins over the legacy
  // `initialPhone` prop so existing call sites stay compatible.
  const prefillName = initialContact?.name?.trim() || ''
  const prefillEmail = initialContact?.email?.trim() || ''
  const prefillPhone = (initialContact?.phone?.trim() || initialPhone || '').trim()

  // We treat the "confirm contact" block as authoritative when ANY of
  // name/phone/email is prefilled. The patient can still tap
  // "Промени данните" to enter edit mode and update the phone (the only
  // editable field — name/email already live on the lead).
  const hasPrefill = !!(prefillName || prefillPhone || prefillEmail)
  const [editing, setEditing] = useState<boolean>(!hasPrefill)
  const [phone, setPhone] = useState<string>(prefillPhone)
  const [consent, setConsent] = useState<boolean>(false)
  const [phase, setPhase] = useState<Phase>('form')
  const [result, setResult] = useState<RequestCallSuccess | null>(null)
  const [error, setError] = useState<ErrPayload | null>(null)

  // Close on Escape — only when not mid-submit.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'submitting') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, onClose])

  const trimmedPhone = phone.trim()
  const digitsCount = (trimmedPhone.match(/\d/g) || []).length
  const phoneOk = digitsCount >= 6
  const canSubmit = phoneOk && consent && phase === 'form'

  const submit = async () => {
    if (!canSubmit) return
    setPhase('submitting')
    setError(null)
    try {
      const r = await postRequestCall(leadId, {
        clinic_id: clinic.id,
        phone: trimmedPhone,
        consent_to_share: true,
        source,
      })
      setResult(r)
      setPhase('success')
      trackPatientEvent('request_call_submitted', {
        lead_id: leadId,
        clinic_id: clinic.id,
        source,
        partner_tier: partnerTier || null,
        placement_label: placementLabel || null,
        success: true,
      })
      onSuccess(r)
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data?.detail) {
        const detail = e.response.data.detail as ErrPayload
        setError(detail)
        // For 409, treat as terminal "already requested" — surface clinic.
        if (e.response.status === 409 && detail?.code === 'already_requested') {
          setPhase('error')
          trackPatientEvent('request_call_failed', {
            lead_id: leadId,
            clinic_id: clinic.id,
            source,
            error_code: detail.code || 'already_requested',
          })
          // Still notify the parent so it can update UI to submitted state
          // pointing at the existing clinic.
          if (detail.clinic?.id) {
            onSuccess({
              success: true,
              request_id: '',
              clinic: {
                id: detail.clinic.id,
                name: detail.clinic.name || '',
                city_name: '',
              },
              message: detail.message || '',
              already_requested: true,
            })
          }
        } else {
          setPhase('error')
          trackPatientEvent('request_call_failed', {
            lead_id: leadId,
            clinic_id: clinic.id,
            source,
            error_code: detail?.code || `http_${e.response.status}`,
          })
        }
      } else {
        setError({ code: 'unknown', message: 'Възникна неочаквана грешка.' })
        setPhase('error')
        trackPatientEvent('request_call_failed', {
          lead_id: leadId,
          clinic_id: clinic.id,
          source,
          error_code: 'unknown',
        })
      }
    }
  }

  return (
    // Render the modal in a portal attached to <body> so its
    // `position: fixed` stays viewport-relative even when the trigger
    // lives inside a transformed/clipped ancestor (e.g. a clinic card
    // with hover:-translate-y, overflow-hidden, or backdrop-blur).
    // The mounted-flag avoids hydration mismatches during SSR.
    typeof document !== 'undefined'
      ? createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-call-title"
      className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center px-4 py-6 overflow-y-auto"
      onClick={() => phase !== 'submitting' && onClose()}
      data-testid="request-call-modal"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3
              id="request-call-title"
              className="font-serif text-xl font-semibold text-slate-900"
            >
              {phase === 'success'
                ? 'Готово.'
                : phase === 'error' && error?.code === 'already_requested'
                  ? 'Вече избра клиника'
                  : 'Потвърди заявката'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 truncate">
              За {clinic.name}
              {clinic.city_name ? ` · ${clinic.city_name}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'submitting'}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-40"
            aria-label="Затвори"
            data-testid="request-call-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'success' && result ? (
          <SuccessBody clinic={result.clinic} onClose={onClose} />
        ) : phase === 'error' && error?.code === 'already_requested' ? (
          <DuplicateBody clinic={error.clinic} message={error.message} onClose={onClose} />
        ) : (
          <FormBody
            phone={phone}
            setPhone={setPhone}
            consent={consent}
            setConsent={setConsent}
            phoneOk={phoneOk}
            canSubmit={canSubmit}
            submitting={phase === 'submitting'}
            error={phase === 'error' ? error : null}
            prefillName={prefillName}
            prefillEmail={prefillEmail}
            prefillPhone={prefillPhone}
            hasPrefill={hasPrefill}
            editing={editing}
            onEdit={() => setEditing(true)}
            onSubmit={submit}
            onClose={onClose}
          />
        )}
      </div>
    </div>,
          document.body,
        )
      : null
  )
}

/* ──────────────── Form view ──────────────── */

function FormBody({
  phone, setPhone,
  consent, setConsent,
  phoneOk, canSubmit, submitting,
  error,
  prefillName, prefillEmail, prefillPhone,
  hasPrefill, editing, onEdit,
  onSubmit, onClose,
}: {
  phone: string
  setPhone: (v: string) => void
  consent: boolean
  setConsent: (v: boolean) => void
  phoneOk: boolean
  canSubmit: boolean
  submitting: boolean
  error: ErrPayload | null
  prefillName: string
  prefillEmail: string
  prefillPhone: string
  hasPrefill: boolean
  editing: boolean
  onEdit: () => void
  onSubmit: () => void
  onClose: () => void
}) {
  // Confirmation mode — show what the patient already shared in a
  // read-only block instead of an empty input. The phone field is
  // hidden until the patient taps "Промени данните".
  const showConfirm = hasPrefill && !editing
  return (
    <>
      <p className="text-sm text-slate-700 leading-relaxed mb-5">
        Ще споделим името ти, телефона ти и информацията от оценката с избраната
        клиника, за да може да се свърже с теб.
      </p>

      {showConfirm ? (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
          data-testid="request-call-contact-confirm"
        >
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Клиниката ще се свърже с теб на:
          </p>
          <ul className="space-y-1.5 text-sm text-slate-800">
            {prefillName && (
              <li data-testid="request-call-confirm-name">
                <span className="text-slate-500">Име:</span>{' '}
                <span className="font-medium">{prefillName}</span>
              </li>
            )}
            {prefillPhone && (
              <li data-testid="request-call-confirm-phone">
                <span className="text-slate-500">Телефон:</span>{' '}
                <span className="font-medium">{prefillPhone}</span>
              </li>
            )}
            {prefillEmail && (
              <li data-testid="request-call-confirm-email">
                <span className="text-slate-500">Email:</span>{' '}
                <span className="font-medium break-all">{prefillEmail}</span>
              </li>
            )}
          </ul>
          <button
            type="button"
            onClick={onEdit}
            disabled={submitting}
            className="mt-3 text-xs font-medium text-teal-600 hover:text-teal-700 underline-offset-2 hover:underline disabled:opacity-40"
            data-testid="request-call-edit-contact-btn"
          >
            Промени данните
          </button>
        </div>
      ) : (
        <>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Телефон
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+359 ..."
            disabled={submitting}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 disabled:opacity-60"
            data-testid="request-call-phone-input"
          />
          {phone.length > 0 && !phoneOk && (
            <p className="mt-1.5 text-[11px] text-rose-600">
              Въведи телефон с поне 6 цифри.
            </p>
          )}
        </>
      )}

      <label
        className="mt-5 flex items-start gap-2.5 cursor-pointer"
        data-testid="request-call-consent-label"
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={submitting}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-200"
          data-testid="request-call-consent-checkbox"
        />
        <span className="text-sm text-slate-700 leading-snug">
          {PATIENT_CONSENT_TEXT}
        </span>
      </label>

      {error && (
        <div
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-xs text-rose-700"
          data-testid="request-call-inline-error"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error.message || 'Не успяхме да изпратим заявката. Опитай отново.'}</span>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-5 py-2.5 text-sm font-medium text-slate-700 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-40"
          data-testid="request-call-cancel"
        >
          Отказ
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="px-5 py-2.5 bg-teal-500 text-white text-sm font-medium rounded-full hover:bg-teal-600 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          data-testid="request-call-submit"
        >
          {submitting ? 'Изпращане…' : 'Изпрати заявка'}
        </button>
      </div>
    </>
  )
}

/* ──────────────── Success view ──────────────── */

function SuccessBody({
  clinic,
  onClose,
}: {
  clinic: { id: string; name: string; city_name: string }
  onClose: () => void
}) {
  return (
    <div data-testid="request-call-success">
      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 mb-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-900">
            Изпратихме заявката към избраната клиника.
          </p>
          <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
            Клиниката ще се свърже с теб според процеса си за обработка на заявки.
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-5 inline-flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
        Избрана клиника: <span className="font-medium text-slate-700">{clinic.name}</span>
      </p>

      <button
        type="button"
        onClick={onClose}
        className="w-full px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-colors"
        data-testid="request-call-success-close"
      >
        Затвори
      </button>
    </div>
  )
}

/* ──────────────── Duplicate view ──────────────── */

function DuplicateBody({
  clinic,
  message,
  onClose,
}: {
  clinic?: { id?: string; name?: string }
  message?: string
  onClose: () => void
}) {
  return (
    <div data-testid="request-call-duplicate">
      <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 mb-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            {message || 'Вече изпрати заявка към клиника за този резултат.'}
          </p>
          {clinic?.name && (
            <p
              className="text-xs text-amber-800 mt-1 leading-relaxed"
              data-testid="request-call-duplicate-clinic"
            >
              Избраната клиника: <strong>{clinic.name}</strong>
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-colors"
      >
        Затвори
      </button>
    </div>
  )
}
