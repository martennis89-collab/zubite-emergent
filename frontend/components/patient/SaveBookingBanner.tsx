'use client'

// Post-booking persistent access — prompts a patient who booked without
// logging in to finish creating their account, reusing the same OTP/
// password login system. Once they log in (matching email, or via
// claimLeadId), the existing retroactive-linking sweep in
// patient_verify_otp claims the booking automatically — no separate
// "claim this booking" call needed.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { getMe, type PatientMe } from '@/lib/patientAuth'
import { OtpLoginModal } from '@/components/OtpLoginModal'

interface Props {
  /** Pre-fills the login modal's email field — pass the email the patient
   *  just typed into the booking form, so it matches the booking's
   *  patient_email and the retroactive sweep links it immediately. */
  initialEmail?: string
  /** For the online-orientation flow: claims the underlying lead, whose
   *  email is what the booking's patient_email was copied from. */
  claimLeadId?: string
  reason?: string
}

export function SaveBookingBanner({ initialEmail, claimLeadId, reason }: Props) {
  const [patient, setPatient] = useState<PatientMe | null>(null)
  const [checked, setChecked] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    getMe()
      .then(setPatient)
      .catch(() => setPatient(null))
      .finally(() => setChecked(true))
  }, [])

  if (!checked) return null

  if (patient) {
    return (
      <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#006A61]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Резервацията е свързана с профила ви —{' '}
        <Link href="/profile" className="underline">вижте я в „Моите резервации“</Link>
      </p>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-[#B3EEE6] bg-[#F0FDFA] p-4 text-sm">
      <p className="text-[#006A61]">
        Довършете създаването на профила си, за да проследявате и управлявате тази резервация по-късно.
      </p>
      <button
        onClick={() => setShowLogin(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#006A61] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Довърши профила
      </button>

      <OtpLoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        reason={reason || 'за да управлявате резервацията си'}
        initialEmail={initialEmail}
        claimLeadId={claimLeadId}
        onSuccess={(me) => {
          setPatient(me)
          setShowLogin(false)
        }}
      />
    </div>
  )
}
