'use client'

// Passwordless patient login modal (Общност Phase 1).
// Two steps: email → 6-digit code. On success, the server has set the
// httpOnly session cookie and we hand the patient back to the caller.

import { useEffect, useState } from 'react'
import { User, X, Mail, KeyRound, Lock, Loader2, ArrowRight } from 'lucide-react'
import { requestOtp, verifyOtp, loginWithPassword, updateMe, setPassword as setPatientPassword, type PatientMe } from '@/lib/patientAuth'

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
  /** Pre-fill the email field, e.g. with the email a patient just typed
   *  into a booking form — see SaveBookingBanner. */
  initialEmail?: string
}

export function OtpLoginModal({ open, onClose, onSuccess, reason, claimLeadId, initialEmail }: Props) {
  const [mode, setMode] = useState<'otp' | 'password'>('otp')
  const [step, setStep] = useState<'email' | 'code' | 'setup'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Set by submitCode when the freshly-logged-in account has no password
  // yet — held until the 'setup' step resolves (save or skip), then handed
  // to onSuccess.
  const [pendingPatient, setPendingPatient] = useState<PatientMe | null>(null)
  const [setupDisplayName, setSetupDisplayName] = useState('')
  const [setupPassword, setSetupPassword] = useState('')
  const [setupSaving, setSetupSaving] = useState(false)
  const [setupError, setSetupError] = useState('')

  // Reset when the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setMode('otp')
      setStep('email')
      setEmail(initialEmail || '')
      setCode('')
      setPassword('')
      setPendingPatient(null)
      setSetupDisplayName('')
      setSetupPassword('')
      setSetupError('')
      setError('')
      setLoading(false)
    }
  }, [open, initialEmail])

  // Closing mid-setup must still hand the already-authenticated patient
  // back to the caller — verify-otp already set the session cookie
  // server-side, so silently dropping the modal here would leave the
  // calling page's local state out of sync with the real logged-in session.
  const handleClose = () => {
    if (step === 'setup' && pendingPatient) {
      onSuccess(pendingPatient)
    } else {
      onClose()
    }
  }

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

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
      if (!patient.has_password) {
        setPendingPatient(patient)
        setSetupDisplayName(patient.display_name || '')
        setStep('setup')
      } else {
        onSuccess(patient)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка')
    } finally {
      setLoading(false)
    }
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const patient = await loginWithPassword(email, password)
      onSuccess(patient)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка')
    } finally {
      setLoading(false)
    }
  }

  const submitSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingPatient) return
    setSetupError('')
    setSetupSaving(true)
    try {
      let updated = pendingPatient
      const trimmedName = setupDisplayName.trim()
      if (trimmedName && trimmedName !== (pendingPatient.display_name || '')) {
        updated = await updateMe({ display_name: trimmedName })
      }
      updated = await setPatientPassword(setupPassword)
      onSuccess(updated)
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Възникна грешка')
    } finally {
      setSetupSaving(false)
    }
  }

  const skipSetup = () => {
    if (pendingPatient) onSuccess(pendingPatient)
  }

  const switchMode = (next: 'otp' | 'password') => {
    setMode(next)
    setStep('email')
    setError('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={handleClose}
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
          onClick={handleClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          aria-label="Затвори"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">
            {step === 'setup' ? 'Довършете профила си' : 'Вход в Общността'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {step === 'setup'
              ? 'По желание — задайте потребителско име и парола, за да влизате по-бързо следващия път.'
              : reason
                ? `Влезте с имейл ${reason}. Без парола — изпращаме ви код.`
                : 'Влезте с имейл. Без парола — изпращаме ви код за вход.'}
          </p>
        </div>

        {mode === 'otp' ? (
          step === 'setup' ? (
            <form onSubmit={submitSetup} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Потребителско име (по избор)</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={setupDisplayName}
                    onChange={(e) => setSetupDisplayName(e.target.value)}
                    placeholder="Как да ви наричаме"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Парола</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="Поне 8 символа"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </label>

              {setupError && <p className="text-sm text-red-600">{setupError}</p>}

              <button
                type="submit"
                disabled={setupSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {setupSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Запази и продължи
              </button>

              <button
                type="button"
                onClick={skipSetup}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                Пропусни — винаги можете да влезете отново с код по имейл
              </button>
            </form>
          ) : step === 'email' ? (
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

              <button
                type="button"
                onClick={() => switchMode('password')}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                Имате парола? Влезте с парола
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
          )
        ) : (
          <form onSubmit={submitPassword} className="space-y-4">
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

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Парола</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Влез
            </button>

            <button
              type="button"
              onClick={() => switchMode('otp')}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
            >
              Нямате парола? Влезте с код
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
