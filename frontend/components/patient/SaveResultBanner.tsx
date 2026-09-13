'use client'

// Persistent patient access — lets a patient save a lead/result to their
// account (reusing the existing OTP patient-account system) so they can
// find it again later from /profile, instead of losing it once the
// /results/[leadId] URL is gone.

import { useEffect, useState } from 'react'
import { BookmarkPlus, CheckCircle2, Loader2 } from 'lucide-react'
import { getMe, type PatientMe } from '@/lib/patientAuth'
import { claimLead } from '@/lib/api'
import { OtpLoginModal } from '@/components/OtpLoginModal'

interface Props {
  leadId: string
  isClaimedByMe: boolean
  /** Called after a successful save/claim so the parent can refetch. */
  onSaved: () => void
}

export function SaveResultBanner({ leadId, isClaimedByMe, onSaved }: Props) {
  const [patient, setPatient] = useState<PatientMe | null>(null)
  const [checked, setChecked] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMe()
      .then(setPatient)
      .catch(() => setPatient(null))
      .finally(() => setChecked(true))
  }, [])

  if (isClaimedByMe) {
    return (
      <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#006A61]">
        <CheckCircle2 className="h-3.5 w-3.5" /> Резултатът е запазен във вашия профил
      </p>
    )
  }

  if (!checked) return null

  const saveNow = async () => {
    setError('')
    setSaving(true)
    try {
      await claimLead(leadId)
      onSaved()
    } catch {
      setError('Възникна грешка. Опитайте отново.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[#B3EEE6] bg-[#F0FDFA] p-4 text-sm">
      <p className="text-[#006A61]">
        Запазете достъп до този резултат във вашия профил — ще го виждате от всяко устройство, по всяко време.
      </p>
      {error && <p className="mt-1 text-xs text-[#93000A]">{error}</p>}
      <button
        onClick={() => (patient ? saveNow() : setShowLogin(true))}
        disabled={saving}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#006A61] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
        Запази резултата
      </button>

      <OtpLoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        reason="за да запазите резултата"
        claimLeadId={leadId}
        onSuccess={() => {
          setShowLogin(false)
          onSaved()
        }}
      />
    </div>
  )
}
