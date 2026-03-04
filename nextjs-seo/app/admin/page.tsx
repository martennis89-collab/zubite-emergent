'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Loader2, Lock, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      if (!response.ok) {
        throw new Error('Invalid credentials')
      }
      
      const data = await response.json()
      localStorage.setItem('admin_token', data.token)
      router.push('/admin/dashboard')
    } catch {
      setError('Невалиден имейл или парола')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <main className="min-h-screen bg-[#0f172a]">
      <Header />
      
      <section className="pt-24 pb-12 md:pt-32 md:pb-16 flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md px-4">
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-sky-400" />
              </div>
              <h1 className="font-serif text-2xl font-semibold text-white">Админ панел</h1>
              <p className="text-slate-400 mt-2">Влезте с администраторски акаунт</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Имейл</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="admin@zubite.bg"
                  data-testid="input-email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Парола</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="••••••••"
                  data-testid="input-password"
                  required
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary px-8 py-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="login-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Влизане...
                  </>
                ) : (
                  'Вход'
                )}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-slate-400 hover:text-sky-400 transition-colors">
                Обратно към сайта
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
