'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ResultUnlockGate } from '@/components/patient/ResultUnlockGate'
import { getLead } from '@/lib/api'
import { CheckCircle2, Loader2, Home, ShieldCheck, ArrowRight, Gift, Sparkles } from 'lucide-react'

interface Lead {
  id: string
  city_slug: string
  treatment_type: string
  band: string
  score_total: number
  name?: string
  answers?: Record<string, unknown>
  // MVP unlock-mechanic flags (Phase A) — returned by GET /api/leads/{id}
  contact_details_submitted?: boolean
  full_result_unlocked?: boolean
  care_pass_eligible?: boolean
  care_pass_unlocked?: boolean
  consultation_booked_through_zubite?: boolean
  clinic_confirmed_consultation?: boolean
}

// Map backend bands (RED/YELLOW/GREEN) → frontend stage param
// (high/moderate/low) used by /quiz/success.
const BAND_TO_STAGE: Record<string, string> = {
  RED: 'high',
  YELLOW: 'moderate',
  GREEN: 'low',
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const data = await getLead(leadId)
        setLead(data)
      } catch {
        setError('Възникна грешка при зареждане на резултатите.')
      } finally {
        setLoading(false)
      }
    }
    fetchLead()
  }, [leadId])

  // After the unlock gate successfully submits, redirect to
  // /quiz/success?leadId=... to preserve Manual Recommendation Mode.
  // The success page reads stage/city/segment/leadId from query
  // params and shows the segment-aware "thanks + manual review" UI.
  // PRIVACY (June 2026): `name` is NOT passed in the URL — neither as a
  // first-word nor full string. The success page either uses a generic
  // greeting or, if a personalised one is needed, fetches the
  // display-safe first-word name from GET /api/leads/{id}.
  const handleUnlocked = (_updated: { name: string }) => {
    const stage = BAND_TO_STAGE[lead?.band || 'GREEN'] || 'low'
    const city = lead?.city_slug || ''
    const rawSegment = (lead?.answers as Record<string, unknown> | undefined)?.['segment']
    const segment = typeof rawSegment === 'string' && rawSegment ? rawSegment : 'adult'
    const params = new URLSearchParams({
      leadId: leadId,
      stage,
      city,
      segment,
    })
    router.push(`/quiz/success?${params.toString()}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FCFAF8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </main>
    )
  }

  if (error || !lead) {
    return (
      <main className="min-h-screen bg-[#FCFAF8]">
        <Header />
        <section className="pt-32 pb-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p className="text-rose-700">{error || 'Резултатите не бяха намерени.'}</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 text-teal-700 hover:text-teal-800 font-medium">
              <Home className="w-4 h-4" />
              Към началото
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FCFAF8] relative overflow-hidden" data-testid="results-page">
      {/* Soft warm gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.25) 0%, rgba(94,234,212,0) 60%),' +
            'radial-gradient(ellipse 60% 50% at 80% 60%, rgba(165,243,252,0.30) 0%, rgba(165,243,252,0) 60%)',
        }}
      />
      <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/40 blur-3xl pointer-events-none" />

      <Header />

      <section className="relative pt-28 pb-12 md:pt-36 md:pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* MVP unlock gate — if contact details aren't recorded yet,
              show the lead-capture screen instead of the full result. */}
          {!lead.full_result_unlocked && (
            <ResultUnlockGate
              leadId={lead.id}
              defaultName={lead.name}
              onUnlocked={(d) => handleUnlocked({ name: d.name })}
            />
          )}

          {/* Primary result glass panel */}
          {lead.full_result_unlocked && (
          <>
          <div className="relative rounded-[1.75rem] bg-white/75 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] p-8 sm:p-10 text-center">
            {/* Inner top gloss */}
            <div aria-hidden className="absolute inset-x-8 top-0.5 h-1/3 rounded-full bg-gradient-to-b from-white/55 to-transparent pointer-events-none opacity-70" />

            <div className="relative inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 ring-1 ring-teal-100 rounded-full px-3 py-1 mb-6">
              <ShieldCheck className="w-3 h-3" /> Ориентир, не диагноза
            </div>

            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-50 to-emerald-50 ring-1 ring-teal-100 flex items-center justify-center mx-auto mb-6 shadow-[0_10px_30px_-12px_rgba(13,148,136,0.4)]">
              <CheckCircle2 className="w-10 h-10 text-teal-600" />
            </div>

            <h1 className="relative font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mb-3 leading-tight">
              Благодарим ти!
            </h1>

            <p className="relative text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
              Заявката ти е получена. В най-кратък срок ще се свържем с теб, за да обсъдим заедно
              следващата стъпка спрямо описания случай.
            </p>

            {lead.name && (
              <div className="relative bg-slate-50/80 ring-1 ring-slate-200/50 rounded-xl p-4 mb-8 text-left max-w-sm mx-auto">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 font-semibold mb-2">Твоите данни</p>
                <p className="text-slate-900 font-medium">{lead.name}</p>
              </div>
            )}

            <div className="relative flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-center">
              <Link
                href="/"
                className="relative inline-flex items-center justify-center gap-2 rounded-full bg-white/55 backdrop-blur-xl text-slate-900 text-sm font-medium px-6 py-3.5 ring-1 ring-white/80 hover:bg-white/80 hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.85)] overflow-hidden"
                data-testid="home-btn"
              >
                <Home className="w-4 h-4" />
                Към началото
              </Link>
            </div>
          </div>

          {/* Care Pass reminder card */}
          <div className="relative mt-6 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.40)]"
            style={{
              background:
                'radial-gradient(ellipse 60% 60% at 100% 0%, rgba(20,184,166,0.30) 0%, transparent 60%),' +
                'linear-gradient(135deg, #0E1A24 0%, #112832 100%)',
            }}
          >
            <div aria-hidden className="absolute inset-x-4 top-1 h-1/3 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative p-6 sm:p-7 flex items-center gap-5">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-white/10 ring-1 ring-white/25 flex items-center justify-center">
                <Gift className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-teal-300/80 font-semibold">Zubite Care Pass</p>
                <p className="mt-1 font-serif text-base sm:text-lg text-white leading-snug">
                  След проведена консултация чрез Zubite.bg ще получиш Care Pass от клиниката.
                </p>
                <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                  Отстъпки за продукти за орална хигиена. Не е отстъпка от лечение.
                </p>
              </div>
            </div>
          </div>

          {/* Next steps strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3 text-teal-500" /> Без задължение</span>
            <span aria-hidden>·</span>
            <span>Личен ориентир според отговорите ти</span>
            <span aria-hidden>·</span>
            <span>Не заменя професионален преглед</span>
          </div>
          </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
