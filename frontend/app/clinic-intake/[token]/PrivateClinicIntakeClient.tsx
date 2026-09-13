'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Link2Off,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
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
        <div className="taste-private-intake-loading">
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
      <section className="taste-private-intake-hero">
        <div className="taste-private-intake-texture" aria-hidden />
        <div className="taste-shell taste-private-intake-hero-grid">
          <div className="taste-private-intake-copy">
            <span className="taste-private-intake-kicker">
              <FileCheck2 aria-hidden />
              Профил на партньорска клиника
            </span>
            <h1>
              Представете клиниката си <em>ясно и достоверно.</em>
            </h1>
            <p>
              Информацията от тази форма ни помага да изградим точен профил,
              който пациентите могат лесно да разберат и на който могат да се доверят.
            </p>
          </div>

          <aside className="taste-private-intake-prep" aria-label="Преди да започнете">
            <h2>Преди да започнете</h2>
            <ul>
              <li><Check aria-hidden /> Попълнете първо основните данни и услугите</li>
              <li><Check aria-hidden /> Добавете линкове и материали, с които разполагате</li>
              <li><Check aria-hidden /> Нищо не се публикува без преглед от Zubite.bg</li>
            </ul>
          </aside>
        </div>

        <div className="taste-shell">
          <div className="taste-private-intake-notice">
            <ShieldCheck aria-hidden />
            <p>
              Защитена покана за <strong>{invite.clinic_label || 'вашата клиника'}</strong>.
              Линкът е непубличен, еднократен и не трябва да бъде препращан извън екипа ви.
            </p>
          </div>
        </div>
      </section>
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
    <main className="taste-site taste-route-scope taste-private-intake">
      <header className="taste-private-intake-header">
        <div className="taste-shell taste-private-intake-header-inner">
          <Link href="/" className="taste-private-intake-logo" aria-label="Zubite.bg начало">
            Zubite<span>.bg</span>
          </Link>
          <span className="taste-private-intake-security">
            <ShieldCheck aria-hidden />
            Защитена покана
          </span>
        </div>
      </header>
      {children}
      <footer className="taste-private-intake-footer">
        <div className="taste-shell">
          <span>Zubite.bg · Независима дентална ориентация</span>
          <nav aria-label="Правна информация">
            <Link href="/privacy">Поверителност</Link>
            <Link href="/contact">Контакт</Link>
          </nav>
        </div>
      </footer>
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
    <div className="taste-private-intake-state">
      <div className={success ? 'is-success' : undefined}>
        <Icon className="h-6 w-6" />
      </div>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  )
}
