'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, Building2, Lock, Mail, ShieldCheck, Sparkles, BarChart3,
} from 'lucide-react'

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
        credentials: 'include' as RequestCredentials,
      })
      const data = await res.json()

      if (!res.ok) {
        const detail = data.detail
        setError(typeof detail === 'string' ? detail : 'Невалидни данни за вход')
        return
      }

      // E3: cookie is set by the server. We deliberately ignore access_token
      // in the response body and do NOT persist any auth data to localStorage.
      // Cleanup any stale tokens from a prior version.
      try { localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_user') } catch { /* noop */ }
      router.push('/clinic/dashboard')
    } catch {
      setError('Грешка при свързване със сървъра')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left: brand + value props (hidden on mobile, shown on lg+) */}
        <section className="hidden lg:flex flex-col gap-8" data-testid="clinic-login-brand">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-full">
              <Building2 className="w-4 h-4" />
              Партньорски портал
            </div>
            <h1 className="font-serif text-4xl font-semibold text-slate-900 mt-5 leading-tight">
              Zubite<span className="text-sky-500">.bg</span> за клиники
            </h1>
            <p className="text-slate-600 mt-3 leading-relaxed">
              Управлявайте заявките от пациенти, резервациите и резултатите на
              клиниката си на едно място.
            </p>
          </div>

          <ul className="space-y-3.5">
            <ValueProp
              icon={<Sparkles className="w-4 h-4" />}
              title="Реални пациенти, готови за консултация"
              body="Заявките идват от квалифицирани заявители от Zubite.bg."
            />
            <ValueProp
              icon={<BarChart3 className="w-4 h-4" />}
              title="Ясни резултати"
              body="Виждате конверсията си в реално време — без догадки."
            />
            <ValueProp
              icon={<ShieldCheck className="w-4 h-4" />}
              title="Защитен достъп"
              body="Данните на пациентите се пазят според стандартите на платформата."
            />
          </ul>

          <p className="text-xs text-slate-400">
            Партньорството в Zubite.bg е по покана. Ако още не сте партньор,
            кандидатствайте на{' '}
            <Link href="/za-kliniki" className="underline hover:text-slate-600">
              /za-kliniki
            </Link>
            .
          </p>
        </section>

        {/* Right: login card */}
        <section>
          <div className="text-center mb-6 lg:hidden">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-7 h-7 text-sky-500" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Вход за клиники</h1>
            <p className="text-sm text-slate-500 mt-1">Партньорски портал на Zubite.bg</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-sm"
            data-testid="clinic-login-form"
          >
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-slate-900">Вход</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Влезте с имейла на клиниката си.
              </p>
            </div>

            {error && (
              <div
                className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-sm"
                data-testid="login-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="clinic-email">
                Имейл
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="clinic-email"
                  type="email"
                  autoComplete="email"
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="clinic-password">
                  Парола
                </label>
                <a
                  href="mailto:partners@zubite.bg?subject=Забравена%20парола%20—%20Zubite%20партньор"
                  className="text-xs text-sky-600 hover:text-sky-700 underline-offset-2 hover:underline"
                  data-testid="forgot-password-link"
                >
                  Забравена парола?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="clinic-password"
                  type="password"
                  autoComplete="current-password"
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
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-submit-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Влизане…' : 'Вход'}
            </button>

            <p className="text-xs text-slate-400 text-center pt-1">
              Имате нужда от помощ?{' '}
              <a
                href="mailto:partners@zubite.bg"
                className="text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
              >
                partners@zubite.bg
              </a>
            </p>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            <Link href="/" className="hover:text-sky-500 transition-colors">
              ← Обратно към Zubite.bg
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}

function ValueProp({
  icon, title, body,
}: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 grid place-items-center text-sky-600 flex-shrink-0">
        {icon}
      </span>
      <div>
        <div className="font-medium text-slate-900 text-sm">{title}</div>
        <div className="text-sm text-slate-500 leading-snug">{body}</div>
      </div>
    </li>
  )
}
