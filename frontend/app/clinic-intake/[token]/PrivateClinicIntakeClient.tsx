'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock3, Link2Off, Loader2, ShieldCheck } from 'lucide-react'
import { ApplicationSection } from '@/components/ForClinicsContent'

interface IntakeInvite {
  clinic_label?: string | null
  contact_email?: string | null
  status: 'pending' | 'submitted' | 'expired' | 'revoked'
  expires_at?: string | null
}

export function PrivateClinicIntakeClient() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [invite, setInvite] = useState<IntakeInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    const load = async () => {
      try {
        const response = await fetch(`/api/clinic-intake/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          if (active) setNotFound(true)
          return
        }
        const data = await response.json()
        if (active) setInvite(data.invite)
      } catch {
        if (active) setNotFound(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [token])

  if (loading) {
    return (
      <PrivateShell>
        <div className="mx-auto flex min-h-[55vh] max-w-md items-center justify-center text-slate-300">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-teal-300" />
          Проверяваме защитения линк…
        </div>
      </PrivateShell>
    )
  }

  if (notFound || !invite) {
    return (
      <PrivateShell>
        <StateMessage
          icon={Link2Off}
          title="Линкът не е валиден"
          text="Проверете дали е копиран целият линк или поискайте нов от екипа на Zubite.bg."
        />
      </PrivateShell>
    )
  }

  if (invite.status === 'submitted') {
    return (
      <PrivateShell>
        <StateMessage
          icon={CheckCircle2}
          title="Формата вече е изпратена"
          text="Информацията е получена и е налична в админ таблото на Zubite.bg."
          success
        />
      </PrivateShell>
    )
  }

  if (invite.status === 'expired' || invite.status === 'revoked') {
    return (
      <PrivateShell>
        <StateMessage
          icon={Clock3}
          title={invite.status === 'expired' ? 'Линкът е изтекъл' : 'Линкът е деактивиран'}
          text="Свържете се с екипа на Zubite.bg, за да получите нов защитен линк."
        />
      </PrivateShell>
    )
  }

  return (
    <PrivateShell>
      <div className="px-5 py-8 sm:px-8" style={{ background: '#0B1620' }}>
        <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-xl bg-[#102832] px-4 py-3 text-sm text-slate-200 ring-1 ring-teal-200/20">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
          <p className="leading-relaxed">
            Този линк е създаден за <strong className="font-semibold text-white">{invite.clinic_label || 'вашата клиника'}</strong>.
            Той е непубличен и може да бъде използван веднъж. Не го препращайте извън екипа си.
          </p>
        </div>
      </div>
      <ApplicationSection
        privateMode
        submissionEndpoint={`/api/clinic-intake/${encodeURIComponent(token)}`}
        initialClinicName={invite.clinic_label || ''}
        initialEmail={invite.contact_email || ''}
      />
    </PrivateShell>
  )
}

function PrivateShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0B1620] text-white">
      <header className="border-b border-white/10 bg-[#0B1620]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-white">
            Zubite<span className="text-teal-300">.bg</span>
          </Link>
          <span className="inline-flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-teal-300" />
            Защитена форма
          </span>
        </div>
      </header>
      {children}
    </main>
  )
}

function StateMessage({
  icon: Icon,
  title,
  text,
  success = false,
}: {
  icon: React.ElementType
  title: string
  text: string
  success?: boolean
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full ${success ? 'bg-emerald-400/12 text-emerald-300' : 'bg-white/8 text-slate-300'}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h1 className="font-serif text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-slate-300">{text}</p>
    </div>
  )
}
