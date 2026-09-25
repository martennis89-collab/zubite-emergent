import { redirect } from 'next/navigation'

export default async function LegacyClinicRecommendationsPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params
  redirect(`/clinics?leadId=${encodeURIComponent(leadId)}`)
}
