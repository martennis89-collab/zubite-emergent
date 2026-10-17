import { notFound, permanentRedirect } from 'next/navigation'
import { getPublicClinic, clinicProfileHref } from '@/lib/publicClinics'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ city: string; specialty: string; clinicSlug: string }>
}

/**
 * Legacy profile URL `/clinics/[city]/[specialty]/[clinicSlug]`. Clinic
 * profiles now live at `/clinics/[city]/[clinicSlug]`; this permanently
 * redirects old links, bookmarks and indexed URLs there.
 */
export default async function LegacyClinicProfileRedirect({ params }: PageProps) {
  const { clinicSlug } = await params
  let target: string | null = null
  try {
    target = clinicProfileHref(await getPublicClinic(clinicSlug))
  } catch {
    target = null
  }
  // Outside the try: Next.js signals redirects by throwing.
  if (!target) notFound()
  permanentRedirect(target)
}
