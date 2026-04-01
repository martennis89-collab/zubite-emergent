'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Building2, Lock, Mail } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function ClinicLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/clinic/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()

      if (!res.ok) {
        const detail = data.detail
        setError(typeof detail === 'string' ? detail : 'Невалидни данни за вход')
        return
      }

      localStorage.setItem('clinic_token', data.access_token)
      localStorage.setItem('clinic_user', JSON.stringify(data.user))
      router.push('/clinic/dashboard')
    } catch {
      setError('Грешка при свързване със сървъра')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-sky-500" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Вход за клиники</h1>
          <p className="text-sm text-slate-500 mt-1">Zubite.bg - Партньорски портал</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-8 space-y-5 shadow-sm" data-testid="clinic-login-form">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Имейл</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors"
                placeholder="clinic@example.com"
                data-testid="input-email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Парола</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors"
                placeholder="Въведете парола"
                data-testid="input-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition-all disabled:opacity-50"
            data-testid="login-submit-btn"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Влизане...' : 'Вход'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          <Link href="/" className="hover:text-sky-500 transition-colors">← Обратно към Zubite.bg</Link>
        </p>
      </div>
    </main>
  )
}
