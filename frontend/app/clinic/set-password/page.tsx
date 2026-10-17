'use client'

/**
 * /clinic/set-password — where the portal sends a signed-in clinic whose API
 * calls come back 403 `password_change_required` (e.g. it opened a dashboard
 * link instead of going through login). The login page shows the same form
 * inline, without asking for the temporary password a second time.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClinicSetPasswordForm } from '@/components/clinic/ClinicSetPasswordForm'

export default function ClinicSetPasswordPage() {
  const router = useRouter()
  return (
    <main className="taste-clinic-login min-h-[100dvh] bg-[#FCFAF8] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <p className="text-center mb-6 font-semibold text-xl tracking-[-0.04em] text-slate-900">
          Zubite<span className="text-[#007956]">.bg</span>
        </p>
        <ClinicSetPasswordForm
          onDone={() => router.push('/clinic/dashboard')}
          onSessionExpired={() => router.replace('/clinic')}
        />
        <p className="text-center text-sm text-slate-400 mt-6">
          <Link href="/clinic" className="hover:text-teal-500 transition-colors">
            ← Към входа
          </Link>
        </p>
      </div>
    </main>
  )
}
