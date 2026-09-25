'use client'

import { useState } from 'react'
import { Loader2, Plus, CheckCircle, XCircle, Info } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Mirrors the exponent rule in backend/routers/admin.py::admin_record_revenue.
// Kept in step by hand, like the other currency/city lists duplicated across
// this codebase — there are two entries and ISO 4217 has not moved in decades.
const ZERO_DECIMAL = new Set(['JPY', 'ISK'])
const CURRENCIES = ['EUR', 'BGN', 'USD', 'GBP']

export interface RevenueEntry {
  reference: string
  amount_minor: number
  currency: string
  recorded_at: string
}

function formatMinor(minor: number, currency: string): string {
  const major = ZERO_DECIMAL.has(currency) ? minor : minor / 100
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency,
    minimumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
  }).format(major)
}

export function LeadRevenuePanel({
  leadId, revenue, assignedClinicId, clearAdvanceLeadId, onRecorded,
}: {
  leadId: string
  revenue: RevenueEntry[]
  assignedClinicId?: string | null
  clearAdvanceLeadId?: string | null
  onRecorded: () => void | Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null)

  // Totals are per currency. A lead paid partly in BGN and partly in EUR has no
  // single meaningful sum, and inventing one by assuming a rate would be worse
  // than showing two figures.
  const totals = revenue.reduce<Record<string, number>>((acc, r) => {
    acc[r.currency] = (acc[r.currency] || 0) + r.amount_minor
    return acc
  }, {})

  const submit = async () => {
    const value = Number(amount.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setNote({ type: 'err', text: 'Сумата трябва да е положително число.' })
      return
    }
    if (!reference.trim()) {
      setNote({ type: 'err', text: 'Номерът на документа е задължителен.' })
      return
    }

    setSaving(true)
    setNote(null)
    try {
      const r = await fetch(`${API_URL}/api/admin/leads/${leadId}/revenue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify({ amount: value, currency, reference: reference.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        const detail = typeof j.detail === 'string' ? j.detail : 'Грешка при запис.'
        setNote({ type: 'err', text: detail })
        return
      }
      if (j.deduplicated) {
        // Not an error: the same document number is the same payment. Saying so
        // is the point, because otherwise a second click looks like it did nothing.
        setNote({
          type: 'info',
          text: 'Този номер вече е записан. Нищо не е добавено повторно.',
        })
      } else {
        setNote({ type: 'ok', text: 'Плащането е записано.' })
        setAmount('')
        setReference('')
      }
      await onRecorded()
    } catch {
      setNote({ type: 'err', text: 'Грешка при връзка със сървъра.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="lead-revenue-panel">
      <h2 className="font-semibold text-slate-900 mb-1">Приход от пациента</h2>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        Записаният преглед показва, че рекламата е сработила. Сумата показва колко —
        това е единственото място, където Zubite научава какво реално струва един пациент.
      </p>

      {!assignedClinicId && (
        <div
          className="mb-4 rounded-lg bg-amber-50 ring-1 ring-amber-200 px-3 py-2.5 text-[12px] text-amber-800 leading-relaxed"
          data-testid="revenue-unassigned-warning"
        >
          Лийдът няма зачислена клиника. Сумата ще бъде записана в Zubite, но няма
          да бъде отчетена никъде — отчитането минава през клиниката, на която е
          зачислен лийдът.
        </div>
      )}

      {revenue.length > 0 && (
        <div className="mb-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="pb-2 font-medium">Документ</th>
                <th className="pb-2 font-medium">Сума</th>
                <th className="pb-2 font-medium">Записано</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {revenue.map((r) => (
                <tr key={r.reference}>
                  <td className="py-2 pr-3 text-slate-700">{r.reference}</td>
                  <td className="py-2 pr-3 font-medium text-slate-900 whitespace-nowrap">
                    {formatMinor(r.amount_minor, r.currency)}
                  </td>
                  <td className="py-2 text-slate-500 whitespace-nowrap">
                    {new Date(r.recorded_at).toLocaleString('bg-BG')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="pt-2 text-slate-500">Общо</td>
                <td className="pt-2 font-semibold text-slate-900" colSpan={2}>
                  {Object.entries(totals)
                    .map(([c, minor]) => formatMinor(minor, c))
                    .join(' · ')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_1fr] gap-3 items-end">
        <label className="block text-sm text-slate-700">
          <span className="block mb-1">Сума</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="3900.00"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            data-testid="revenue-amount"
          />
        </label>
        <label className="block text-sm text-slate-700">
          <span className="block mb-1">Валута</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            data-testid="revenue-currency"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block text-sm text-slate-700">
          <span className="block mb-1">Номер на документа</span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Фактура 2026-0142"
            maxLength={200}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            data-testid="revenue-reference"
          />
        </label>
      </div>

      <p className="mt-2 text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-px shrink-0" />
        <span>
          Номерът описва <strong>плащането</strong>, не пациента — например номер на
          фактура. Един пациент може да плати на вноски и всяка вноска се записва
          отделно; един и същ номер, изпратен втори път, се разпознава като същото
          плащане и не се удвоява.
        </span>
      </p>

      {note && (
        <div
          className={`mt-3 text-sm inline-flex items-center gap-1.5 ${
            note.type === 'ok' ? 'text-emerald-700'
              : note.type === 'info' ? 'text-amber-700' : 'text-rose-700'
          }`}
          data-testid="revenue-message"
        >
          {note.type === 'ok' ? <CheckCircle className="w-4 h-4" />
            : note.type === 'info' ? <Info className="w-4 h-4" />
            : <XCircle className="w-4 h-4" />}
          {note.text}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="text-[11px] text-slate-400">
          {clearAdvanceLeadId
            ? 'Лийдът е свързан с Clear Advance — плащането се отчита автоматично.'
            : 'Лийдът още не е отчетен в Clear Advance; ще бъде отчетен заедно с плащането.'}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-50 shrink-0"
          data-testid="revenue-submit"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Записване…' : 'Запиши плащане'}
        </button>
      </div>
    </div>
  )
}
