'use client'

/**
 * Mandatory first-login step for clinics on an admin-issued password.
 *
 * The backend refuses every clinic endpoint with 403
 * `password_change_required` until /api/clinic/change-password succeeds, so
 * this form is the only way into the portal for such an account.
 *
 * `currentPassword` is passed straight from the login form (kept in memory
 * only, never stored) so the clinic doesn't have to type the temporary
 * password twice. Without it the form asks for it.
 */

import { useState } from 'react'
import { KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const MIN_LENGTH = 8

const inputCls =
  'w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors'

export function ClinicSetPasswordForm({
  currentPassword,
  onDone,
  onSessionExpired,
}: {
  currentPassword?: string
  onDone: () => void
  onSessionExpired?: () => void
}) {
  const [current, setCurrent] = useState(currentPassword || '')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (next.length < MIN_LENGTH) {
      setError(`Новата парола трябва да е поне ${MIN_LENGTH} символа.`)
      return
    }
    if (next !== confirm) {
      setError('Двете полета за нова парола не съвпадат.')
      return
    }
    if (next === current) {
      setError('Новата парола трябва да е различна от временната.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/clinic/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify({ current_password: current, new_password: next }),
      })
      if (res.status === 401) {
        onSessionExpired?.()
        setError('Сесията изтече. Влезте отново с временната парола.')
        return
      }
      if (!res.ok) {
        let message = 'Паролата не беше сменена. Опитайте отново.'
        try {
          const data = await res.json()
          if (typeof data?.detail === 'string') message = data.detail
        } catch { /* keep default */ }
        setError(message)
        return
      }
      onDone()
    } catch {
      setError('Грешка при свързване със сървъра')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-sm"
      data-testid="clinic-set-password-form"
    >
      <div>
        <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 grid place-items-center text-teal-600">
          <KeyRound className="w-5 h-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Задайте своя парола</h2>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          Влязохте с временна парола от Zubite.bg. Изберете своя, за да продължите
          към портала — временната спира да работи веднага след това.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-sm" role="alert" data-testid="set-password-error">
          {error}
        </div>
      )}

      {!currentPassword && (
        <PasswordField
          id="set-current"
          label="Временна парола"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          placeholder="Паролата от имейла"
        />
      )}
      <PasswordField
        id="set-new"
        label="Нова парола"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
        placeholder={`Поне ${MIN_LENGTH} символа`}
      />
      <PasswordField
        id="set-confirm"
        label="Повторете новата парола"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        placeholder="Още веднъж"
      />

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 text-white font-medium rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="set-password-submit"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
        {saving ? 'Запазване…' : 'Запази и продължи'}
      </button>
    </form>
  )
}

function PasswordField({
  id, label, value, onChange, autoComplete, placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor={id}>{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          id={id}
          type="password"
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
          data-testid={`input-${id}`}
        />
      </div>
    </div>
  )
}
