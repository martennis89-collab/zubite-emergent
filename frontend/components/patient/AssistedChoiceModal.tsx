'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { X, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'
import {
  postRequestZubiteHelp,
  PATIENT_ZUBITE_HELP_CONSENT_TEXT,
  type RequestZubiteHelpSuccess,
} from '@/lib/api'

interface Props {
  leadId: string
  source: 'matching_page' | 'clinic_profile'
  initialPhone?: string | null
  onClose: () => void
  // Called after a successful (or duplicate-200) submit. Parent can
  // update its selection state immediately so all clinic CTAs flip
  // to the disabled "Вече поискахте помощ от Zubite" variant.
  onSuccess: (resp: RequestZubiteHelpSuccess) => void
}

type Phase = 'form' | 'submitting' | 'success' | 'error'

type ErrPayload = {
  code?: string
  message?: string
  clinic?: { id?: string; name?: string }
}

/**
 * P5 — real-submit modal for "Помогнете ми да избера".
 *
 * Same UX vocabulary as RequestCallModal (consent + phone + optional
 * note), but the submit goes to `/request-zubite-help` and the lead
 * is never assigned to a clinic. The consent text is sourced from the
 * single shared constant so the on-screen text and the persisted text
 * are guaranteed identical.
 */
export function AssistedChoiceModal({
  leadId,
  source,
  initialPhone,
  onClose,
  onSuccess,
}: Props) {
  const [phone, setPhone] = useState<string>(initialPhone || '')
  const [message, setMessage] = useState<string>('')
  const [consent, setConsent] = useState<boolean>(false)
  const [phase, setPhase] = useState<Phase>('form')
  const [error, setError] = useState<ErrPayload | null>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'submitting') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, onClose])

  const trimmedPhone = phone.trim()
  const digits = (trimmedPhone.match(/\d/g) || []).length
  const phoneOk = digits >= 6
  const canSubmit = phoneOk && consent && phase === 'form'

  const submit = async () => {
    if (!canSubmit) return
    setPhase('submitting')
    setError(null)
    try {
      const r = await postRequestZubiteHelp(leadId, {
        phone: trimmedPhone,
        consent_to_share: true,
        message: message.trim() ? message.trim() : undefined,
        source,
      })
      setPhase('success')
      onSuccess(r)
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data?.detail) {
        const detail = e.response.data.detail as ErrPayload
        setError(detail)
        setPhase('error')
        if (
          detail?.code === 'already_requested_clinic' &&
          detail?.clinic?.id
        ) {
          // Caller can use this to flip the page into "selected clinic"
          // state even if local state was out of date.
          onSuccess({
            success: true,
            request_id: '',
            message: detail.message || '',
            already_requested: true,
          })
        }
      } else {
        setError({ code: 'unknown', message: 'Възникна неочаквана грешка.' })
        setPhase('error')
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assisted-choice-title"
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center px-4 py-6"
      onClick={() => phase !== 'submitting' && onClose()}
      data-testid="assisted-choice-modal"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex items-start gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-sky-50 grid place-items-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-sky-600" />
            </span>
            <div>
              <h3
                id="assisted-choice-title"
                className="font-serif text-xl font-semibold text-slate-900"
              >
                {phase === 'success' ? 'Готово.' : 'Помогнете ми да избера'}
              </h3>
              {phase !== 'success' && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Концерж услуга от екипа на Zubite
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'submitting'}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-40"
            aria-label="Затвори"
            data-testid="assisted-choice-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'success' ? (
          <SuccessBody onClose={onClose} />
        ) : phase === 'error' && error?.code === 'already_requested_clinic' ? (
          <DuplicateClinicBody clinic={error.clinic} onClose={onClose} />
        ) : (
          <FormBody
            phone={phone}
            setPhone={setPhone}
            message={message}
            setMessage={setMessage}
            consent={consent}
            setConsent={setConsent}
            phoneOk={phoneOk}
            canSubmit={canSubmit}
            submitting={phase === 'submitting'}
            error={phase === 'error' ? error : null}
            onSubmit={submit}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

/* ──────────────── Form view ──────────────── */

function FormBody({
  phone, setPhone,
  message, setMessage,
  consent, setConsent,
  phoneOk, canSubmit, submitting,
  error,
  onSubmit, onClose,
}: {
  phone: string
  setPhone: (v: string) => void
  message: string
  setMessage: (v: string) => void
  consent: boolean
  setConsent: (v: boolean) => void
  phoneOk: boolean
  canSubmit: boolean
  submitting: boolean
  error: ErrPayload | null
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <>
      <p className="text-sm text-slate-700 leading-relaxed mb-5">
        Ако не сте сигурни коя клиника да изберете, Zubite може да прегледа
        информацията от оценката ви и да ви помогне с по-ясна следваща стъпка.
      </p>

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
        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 disabled:opacity-60"
        data-testid="assisted-choice-phone-input"
      />
      {phone.length > 0 && !phoneOk && (
        <p className="mt-1.5 text-[11px] text-rose-600">
          Моля, въведете телефон с поне 6 цифри.
        </p>
      )}

      <label className="block mt-4 text-xs font-medium text-slate-700 mb-1.5">
        Допълнително (по избор)
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
        rows={3}
        maxLength={1000}
        placeholder="Може да добавите какво ви притеснява или какво е важно за вас."
        disabled={submitting}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 disabled:opacity-60"
        data-testid="assisted-choice-message-input"
      />
      <p className="text-[10px] text-slate-400 mt-1 text-right tabular-nums">
        {message.length}/1000
      </p>

      <label
        className="mt-3 flex items-start gap-2.5 cursor-pointer"
        data-testid="assisted-choice-consent-label"
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={submitting}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-200"
          data-testid="assisted-choice-consent-checkbox"
        />
        <span className="text-sm text-slate-700 leading-snug">
          {PATIENT_ZUBITE_HELP_CONSENT_TEXT}
        </span>
      </label>

      {error && (
        <div
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-xs text-rose-700"
          data-testid="assisted-choice-inline-error"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error.message || 'Възникна грешка. Опитайте отново.'}</span>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-5 py-2.5 text-sm font-medium text-slate-700 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-40"
          data-testid="assisted-choice-cancel"
        >
          Отказ
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="px-5 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-full hover:bg-sky-600 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          data-testid="assisted-choice-submit"
        >
          {submitting ? 'Изпращане…' : 'Изпрати към Zubite'}
        </button>
      </div>
    </>
  )
}

/* ──────────────── Success view ──────────────── */

function SuccessBody({ onClose }: { onClose: () => void }) {
  return (
    <div data-testid="assisted-choice-success">
      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 mb-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-900">
            Изпратихте заявка към Zubite.
          </p>
          <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
            Ще използваме информацията от оценката ви, за да ви помогнем с
            по-ясна следваща стъпка.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-colors"
        data-testid="assisted-choice-success-close"
      >
        Затвори
      </button>
    </div>
  )
}

/* ──────────────── Duplicate-clinic view ──────────────── */

function DuplicateClinicBody({
  clinic,
  onClose,
}: {
  clinic?: { id?: string; name?: string }
  onClose: () => void
}) {
  return (
    <div data-testid="assisted-choice-duplicate-clinic">
      <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 mb-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            Вече сте изпратили заявка към избрана клиника.
          </p>
          {clinic?.name && (
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
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
