export type HomeTrustSignals = {
  quiz_completions: number
  consultations_booked: number
  community_answers: number
  updated_at: string
}

function apiBase(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8001'
  ).replace(/\/+$/, '')
}

export async function getHomeTrustSignals(): Promise<HomeTrustSignals | null> {
  try {
    const response = await fetch(`${apiBase()}/api/public/trust-signals`, {
      next: { revalidate: 300 },
    })
    if (!response.ok) return null

    const data = (await response.json()) as Partial<HomeTrustSignals>
    if (
      !Number.isFinite(data.quiz_completions) ||
      !Number.isFinite(data.consultations_booked) ||
      !Number.isFinite(data.community_answers) ||
      typeof data.updated_at !== 'string'
    ) {
      return null
    }

    return data as HomeTrustSignals
  } catch {
    return null
  }
}
