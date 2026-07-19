'use client'

// Passwordless patient login modal (Общност Phase 1).
// Two steps: email → 6-digit code. On success, the server has set the
// httpOnly session cookie and we hand the patient back to the caller.

import { useEffect, useState } from 'react'
import { X, Mail, KeyRound, Loader2, ArrowRight } from 'lucide-react'
import { requestOtp, verifyOtp, type PatientMe } from '@/lib/patientAuth'

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful login with the freshly-authenticated patient. */
  onSuccess: (patient: PatientMe) => void
  /** Optional context line, e.g. "за да зададете въпрос". */
  reason?: string
  /** Link this specific lead to the account on successful login — see
   *  SaveResultBanner / verifyOtp. */
  claimLeadId?: string
}

export function OtpLoginModal({ open, onClose, onSuccess, reason, claimLeadId }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset when the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setStep('email')
      setCode('')
      setError('')
      setLoading(false)
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestOtp(email)
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка')
    } finally {
      setLoading(false)
    }
  }

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const patient = await verifyOtp(email, code, claimLeadId)
      onSuccess(patient)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Вход в Общността"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          aria-label="Затвори"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">Вход в Общността</h2>
          <p className="mt-1 text-sm text-slate-500">
            {reason
              ? `Влезте с имейл ${reason}. Без парола — изпращаме ви код.`
              : 'Влезте с имейл. Без парола — изпращаме ви код за вход.'}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={submitEmail} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Имейл</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ime@primer.bg"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Изпрати код
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4">
            <p className="text-sm text-slate-600">
              Изпратихме 6-цифрен код на <span className="font-medium text-slate-900">{email}</span>.
            </p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Код за вход</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-lg tracking-[0.4em] text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Влез
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email')
                setError('')
              }}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
            >
              Смени имейла
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
