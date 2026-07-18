'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function VerifyPage() {
  const params = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const responseParam = searchParams.get('response')
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error' | 'choose'>('loading')
  const [answer, setAnswer] = useState<string | null>(null)

  useEffect(() => {
    if (responseParam === 'yes' || responseParam === 'no') {
      submitResponse(responseParam)
    } else {
      setStatus('choose')
    }
  }, [responseParam])

  const submitResponse = async (response: string) => {
    setStatus('loading')
    setAnswer(response)
    try {
      const res = await fetch(`${API_URL}/api/verify/${params.token}?response=${response}`)
      const data = await res.json()
      if (res.ok) {
        if (data.status === 'already_responded') {
          setAnswer(data.response)
          setStatus('already')
        } else {
          setStatus('success')
        }
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-block font-serif text-2xl font-semibold text-slate-900 mb-8">
          Zubite<span className="text-teal-500">.bg</span>
        </Link>
        <h1 className="sr-only">Потвърждение за контакт с клиника</h1>

        {status === 'loading' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm" data-testid="verify-loading">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Обработка...</p>
          </div>
        )}

        {status === 'choose' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm" data-testid="verify-choose">
            <p className="text-lg font-semibold text-slate-900 mb-6">Свърза ли се клиниката с вас?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => submitResponse('yes')}
                className="px-8 py-3 bg-emerald-500 text-white font-medium rounded-full hover:bg-emerald-600 transition-colors"
                data-testid="btn-yes"
              >
                Да
              </button>
              <button
                onClick={() => submitResponse('no')}
                className="px-8 py-3 bg-red-500 text-white font-medium rounded-full hover:bg-red-600 transition-colors"
                data-testid="btn-no"
              >
                Не
              </button>
            </div>
          </div>
        )}

        {status === 'success' && answer === 'yes' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm" data-testid="verify-success-yes">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Благодарим!</h2>
            <p className="text-slate-500">Радваме се, че клиниката се свърза с вас. Желаем ви успешно лечение!</p>
          </div>
        )}

        {status === 'success' && answer === 'no' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm" data-testid="verify-success-no">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Благодарим за отговора</h2>
            <p className="text-slate-500">Ще се свържем с клиниката и ще се уверим, че ще получите обратна връзка възможно най-скоро.</p>
          </div>
        )}

        {status === 'already' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm" data-testid="verify-already">
            <p className="text-slate-500">Вече сте отговорили на тази проверка. Благодарим!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm" data-testid="verify-error">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Грешка</h2>
            <p className="text-slate-500">Линкът е невалиден или изтекъл.</p>
          </div>
        )}

        <p className="text-sm text-slate-400 mt-8">
          <Link href="/" className="hover:text-teal-500 transition-colors">← Обратно към Zubite.bg</Link>
        </p>
      </div>
    </main>
  )
}
