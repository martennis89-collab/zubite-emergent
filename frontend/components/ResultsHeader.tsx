'use client'

import Link from 'next/link'
import { RotateCcw, ShieldCheck } from 'lucide-react'

export function ResultsHeader() {
  return (
    <header className="taste-results-header" data-testid="results-header">
      <div>
        <Link href="/" className="taste-results-logo" data-testid="results-header-logo" aria-label="Zubite.bg — начало">
          Zubite<span>.bg</span>
        </Link>
        <span className="taste-results-trust" data-testid="results-header-trust-pill">
          <ShieldCheck aria-hidden /> Ориентир, не диагноза
        </span>
        <Link href="/quiz" className="taste-results-restart">
          Нов ориентир <RotateCcw aria-hidden />
        </Link>
      </div>
    </header>
  )
}
