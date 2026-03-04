import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ citySlug: string }>
}

export default async function CityOrthoPage({ params }: PageProps) {
  const { citySlug } = await params
  // Redirect to the main ortho education page
  redirect(`/ortho?city=${citySlug}`)
}
