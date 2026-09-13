'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Send, CheckCircle2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

type Status = 'idle' | 'sending' | 'success' | 'error'

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<Status>('idle')

  const update = (field: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('sending')
    try {
      const response = await fetch(`${API_URL}/api/contact-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      setStatus('success')
      setForm({ name: '', email: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        className="mt-10 rounded-3xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)] p-8 md:p-10 text-center"
        data-testid="contact-form-success"
      >
        <div className="w-14 h-14 rounded-2xl bg-teal-50/80 ring-1 ring-teal-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-7 h-7 text-teal-700" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-slate-900">
          Съобщението е изпратено
        </h2>
        <p className="mt-3 text-sm text-slate-600 max-w-md mx-auto">
          Благодарим ти! Получихме съобщението и ще се свържем с теб възможно най-скоро.
          Изпратихме и потвърждение на посочения имейл.
        </p>
      </div>
    )
  }

  const inputClass =
    'w-full rounded-2xl bg-white/70 ring-1 ring-slate-200 focus:ring-2 focus:ring-teal-400 outline-none px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-shadow'

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 rounded-3xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)] p-7 md:p-9"
      data-testid="contact-form"
    >
      <h2 className="font-serif text-xl font-semibold text-slate-900 mb-1.5">
        Напиши ни съобщение
      </h2>
      <p className="text-sm text-slate-600 mb-6">
        Попълни формата и ще ти отговорим по имейл.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Име
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={form.name}
            onChange={update('name')}
            placeholder="Д-р Иванова"
            className={inputClass}
            data-testid="contact-form-name"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Имейл
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            placeholder="you@example.bg"
            className={inputClass}
            data-testid="contact-form-email"
          />
        </div>
      </div>

      <div className="mb-5">
        <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 mb-1.5">
          Съобщение
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={form.message}
          onChange={update('message')}
          placeholder="Как можем да помогнем?"
          className={`${inputClass} resize-y`}
          data-testid="contact-form-message"
        />
      </div>

      {status === 'error' && (
        <p className="mb-4 text-sm text-red-600" data-testid="contact-form-error">
          Нещо се обърка при изпращането. Опитай отново или ни пиши на info@zubite.bg.
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-12px_rgba(13,148,136,0.6)] transition-colors hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
          data-testid="contact-form-submit"
        >
          <Send className="w-4 h-4" />
          {status === 'sending' ? 'Изпращане…' : 'Изпрати съобщението'}
        </button>
        <p className="text-xs text-slate-500 max-w-xs">
          С изпращането се съгласяваш с нашата{' '}
          <Link href="/privacy" className="underline hover:text-teal-700">
            политика за поверителност
          </Link>
          .
        </p>
      </div>
    </form>
  )
}
