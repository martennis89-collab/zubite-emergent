import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReactNode } from 'react'

interface LegalShellProps {
  eyebrow: string
  title: ReactNode
  lastUpdatedLabel?: string
  children: ReactNode
  testId?: string
}

export function LegalShell({ eyebrow, title, lastUpdatedLabel, children, testId }: LegalShellProps) {
  return (
    <article className="relative pt-28 pb-20 md:pt-36 md:pb-28" data-testid={testId}>
      {/* Decorative orbs */}
      <div aria-hidden className="absolute -top-24 -left-32 w-[30rem] h-[30rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute top-40 -right-32 w-[26rem] h-[26rem] rounded-full bg-cyan-100/40 blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-700 transition-colors mb-8"
          data-testid="legal-back-link"
        >
          <ArrowLeft className="w-4 h-4" />
          Към началото
        </Link>

        {/* Hero */}
        <div className="rounded-3xl bg-white/60 backdrop-blur-md ring-1 ring-white/70 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.12)] p-7 md:p-10 mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50/80 text-teal-700 text-[11px] uppercase tracking-[0.18em] font-semibold px-3 py-1 ring-1 ring-teal-100">
            {eyebrow}
          </span>
          <h1 className="mt-5 font-serif text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">
            {title}
          </h1>
          {lastUpdatedLabel && (
            <div className="mt-4 text-xs text-slate-500">{lastUpdatedLabel}</div>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-5">{children}</div>
      </div>
    </article>
  )
}

interface LegalSectionProps {
  number: number | string
  title: string
  children: ReactNode
}

export function LegalSection({ number, title, children }: LegalSectionProps) {
  return (
    <section className="rounded-2xl bg-white/55 backdrop-blur-md ring-1 ring-white/70 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)] p-6 md:p-8">
      <div className="flex items-start gap-3 mb-4">
        <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50/80 text-teal-700 text-sm font-semibold ring-1 ring-teal-100 font-serif">
          {number}
        </span>
        <h2 className="font-serif text-lg md:text-xl font-semibold text-slate-900 leading-snug pt-1">
          {title}
        </h2>
      </div>
      <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-[15px] prose-li:text-slate-600 prose-li:text-[15px] prose-strong:text-slate-800 prose-a:text-teal-700 prose-a:no-underline hover:prose-a:underline">
        {children}
      </div>
    </section>
  )
}
