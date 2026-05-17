'use client'

import { Compass, Sparkles } from 'lucide-react'

interface Props {
  message?: string
  testid?: string
}

/** Honest 0-match state. No fake clinic cards. Surfaces the assisted-help nudge. */
export function ClinicMatchEmptyState({ message, testid = 'match-empty-state' }: Props) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center max-w-2xl mx-auto"
      data-testid={testid}
    >
      <div className="mx-auto w-14 h-14 rounded-full bg-teal-50 text-teal-600 grid place-items-center mb-5">
        <Compass className="w-6 h-6" />
      </div>
      <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 mb-3">
        Нямаме готова автоматична препоръка
      </h2>
      <p className="text-slate-600 leading-relaxed max-w-md mx-auto mb-6">
        {message ||
          'В момента нямаме достатъчно партньорски клиники за автоматична препоръка. Zubite може да ви помогне ръчно да изберете следваща стъпка.'}
      </p>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed"
        data-testid="match-empty-assisted-disabled"
      >
        <Sparkles className="w-4 h-4" />
        Помогнете ми да избера · Скоро
      </button>
    </div>
  )
}
