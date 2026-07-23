'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { AlertCircle, BadgeCheck, Building2, RefreshCw } from 'lucide-react'
import {
  cityDisplay, listPublicClinics, treatmentLabel,
  type PublicClinic, type PublicClinicFilters,
} from '@/lib/publicClinics'
import PublicClinicCard from './PublicClinicCard'
import PublicClinicFiltersBar from './PublicClinicFilters'
import CompareTray from './CompareTray'
import PersonalizedClinicShowcase from './PersonalizedClinicShowcase'

const PublicContactModal = dynamic(() => import('./PublicContactModal'), { ssr: false })

const MAX_COMPARE = 3

interface Props {
  initialCity?: string
  initialSpecialty?: string
  initialFilters?: PublicClinicFilters
  headingOverride?: string
  leadId?: string
  syncToUrl?: {
    basePath: string
    preserve?: Record<string, string>
    keepCityInQuery?: boolean
  }
}

export default function ClinicListingPage({ initialCity, initialSpecialty, initialFilters, headingOverride, leadId, syncToUrl }: Props) {
  const [filters, setFilters] = useState<PublicClinicFilters>({
    ...initialFilters,
    city: initialCity,
    specialty: initialSpecialty ?? initialFilters?.specialty,
  })
  const [clinics, setClinics] = useState<PublicClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [contactCtx, setContactCtx] = useState<{
    clinics: PublicClinic[]
    source: 'clinic_card' | 'clinic_compare'
    consultationType: 'general' | 'online'
  } | null>(null)

  useEffect(() => {
    setFilters({
      ...initialFilters,
      city: initialCity,
      specialty: initialSpecialty ?? initialFilters?.specialty,
    })
  }, [
    initialCity,
    initialSpecialty,
    initialFilters?.specialty,
    initialFilters?.online_consultation,
    initialFilters?.accepts_adults,
    initialFilters?.accepts_children,
  ])

  const fetchClinics = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listPublicClinics(filters)
      setClinics(data.clinics)
    } catch {
      setClinics([])
      setErr('Не успяхме да заредим клиниките. Провери връзката си и опитай отново.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchClinics() }, [fetchClinics])

  const inCompareSet = useMemo(() => new Set(compareIds), [compareIds])
  const compareClinics = useMemo(
    () => compareIds.map((id) => clinics.find((clinic) => clinic.id === id)).filter((clinic): clinic is PublicClinic => Boolean(clinic)),
    [clinics, compareIds],
  )

  const toggleCompare = (id: string) => {
    setCompareIds((previous) => previous.includes(id)
      ? previous.filter((value) => value !== id)
      : previous.length >= MAX_COMPARE ? previous : [...previous, id])
  }

  const heading = useMemo(() => {
    if (headingOverride) return headingOverride
    const city = filters.city ? cityDisplay(filters.city) : null
    const treatment = filters.specialty ? treatmentLabel(filters.specialty) : null
    if (city && treatment) return `${treatment} клиники в ${city}`
    if (city) return `Партньорски клиники в ${city}`
    if (treatment) return `${treatment} клиники`
    return 'Партньорски клиники'
  }, [filters.city, filters.specialty, headingOverride])
  const catalogHeading =
    leadId && !filters.city && !filters.specialty
      ? 'Всички партньорски клиники'
      : heading

  return (
    <main className="taste-directory-page min-h-screen bg-[#FBF9F7] pb-24 text-[#1B1C1B]" data-testid="kliniki-listing-page">
      {leadId && <PersonalizedClinicShowcase leadId={leadId} />}

      <section
        id="all-clinics"
        className={`mx-auto max-w-[1280px] scroll-mt-24 px-5 pb-14 sm:px-6 sm:pb-20 ${
          leadId ? 'pt-14 sm:pt-20' : 'pt-16 sm:pt-20'
        }`}
      >
        {leadId ? (
          <h2 className="max-w-4xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-black sm:text-5xl" data-testid="kliniki-heading">
            {catalogHeading}
          </h2>
        ) : (
          <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-black sm:text-5xl lg:text-6xl" data-testid="kliniki-heading">
            {catalogHeading}
          </h1>
        )}
        <p className="mt-6 max-w-3xl text-base leading-7 text-[#45464D] sm:text-lg sm:leading-8">
          {leadId
            ? 'Разгледай целия каталог и използвай филтрите, ако искаш да сравниш персоналния подбор с други партньорски клиники.'
            : 'Не всяка клиника може да бъде част от Zubite.bg. Работим с ограничен брой партньори, които покриват Zubite стандарт за качество на работата, отношение към пациента и професионализъм.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#6BD8CB] bg-[#F0FDFA] px-4 py-2 text-sm font-semibold text-[#006A61]"><BadgeCheck className="h-4 w-4" /> Zubite Standard</span>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 sm:px-6">
        <div className="grid items-start gap-8 lg:grid-cols-[260px_1fr]">
          <PublicClinicFiltersBar value={filters} onChange={setFilters} syncToUrl={syncToUrl} />

          <div>
            {!loading && !err && clinics.length > 0 && (
              <div className="mb-5 flex items-center justify-between text-sm" data-testid="kliniki-results-summary">
                <p className="text-[#45464D]"><strong className="text-black">{clinics.length} {clinics.length === 1 ? 'клиника' : 'клиники'}</strong> според избраните филтри</p>
                <button type="button" onClick={fetchClinics} className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-xs font-semibold text-[#006A61]" data-testid="kliniki-refresh"><RefreshCw className="h-4 w-4" /> Обнови</button>
              </div>
            )}

            {loading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[0, 1, 2].map((index) => <div key={index} className="h-[460px] animate-pulse rounded-xl border border-[#E2E8F0] bg-white" data-testid={`kliniki-skel-${index}`} />)}
              </div>
            ) : err ? (
              <div className="rounded-xl border border-red-200 bg-white p-6" data-testid="kliniki-error">
                <AlertCircle className="h-5 w-5 text-red-600" /><p className="mt-3 font-medium text-black">{err}</p>
                <button type="button" onClick={fetchClinics} className="mt-3 text-sm font-semibold text-[#006A61]" data-testid="kliniki-error-retry">Опитай отново</button>
              </div>
            ) : clinics.length === 0 ? (
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center" data-testid="kliniki-empty">
                <Building2 className="mx-auto h-10 w-10 text-[#C6C6CD]" />
                <p className="mt-4 font-display text-xl font-semibold text-black">Няма клиники, които съвпадат с филтрите.</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#45464D]">Опитай с друг град или премини през кратката оценка, за да получиш по-точна посока.</p>
                <div className="mt-6 flex justify-center gap-3"><Link href="/quiz" className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white" data-testid="kliniki-empty-cta-quiz">Провери своя случай</Link><Link href="/clinics" className="rounded-full border border-[#C6C6CD] px-5 py-3 text-sm font-semibold text-black" data-testid="kliniki-empty-cta-clear">Всички клиники</Link></div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2" data-testid="kliniki-grid">
                {clinics.map((clinic) => (
                  <PublicClinicCard
                    key={clinic.id}
                    clinic={clinic}
                    isInCompare={inCompareSet.has(clinic.id)}
                    onToggleCompare={() => toggleCompare(clinic.id)}
                    onRequestContact={() => setContactCtx({ clinics: [clinic], source: 'clinic_card', consultationType: 'general' })}
                    onRequestOnline={() => setContactCtx({ clinics: [clinic], source: 'clinic_card', consultationType: 'online' })}
                  />
                ))}
                <article className="clinical-dots flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-[#89F5E7] bg-[#F0FDFA] p-8 text-center" data-testid="kliniki-more-partners-card">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-[#006A61] shadow-sm" aria-hidden="true"><Building2 className="h-6 w-6" /></span>
                  <h2 className="mt-6 max-w-md font-display text-2xl font-semibold text-black">Още партньорски клиники предстоят</h2>
                  <p className="mt-4 max-w-md text-sm leading-6 text-[#45464D]">В момента оценяваме нови партньорски клиники, които да се присъединят към Zubite.bg. Следи платформата — скоро ще имаш повече избор.</p>
                </article>
              </div>
            )}

            <p className="mx-auto mt-12 max-w-2xl text-center text-xs leading-5 text-[#64748B]" data-testid="kliniki-footnote">Zubite.bg не поставя диагноза, не гарантира резултат и не определя „най-добра“ клиника. Целта на каталога е по-информирана следваща стъпка.</p>
          </div>
        </div>
      </section>

      <CompareTray clinics={compareClinics} onRemove={(id) => setCompareIds((previous) => previous.filter((value) => value !== id))} onClear={() => setCompareIds([])} onRequestContactAll={() => setContactCtx({ clinics: compareClinics, source: 'clinic_compare', consultationType: 'general' })} />
      {contactCtx && <PublicContactModal clinics={contactCtx.clinics} source={contactCtx.source} consultationType={contactCtx.consultationType} prefillCity={filters.city} prefillTreatment={filters.specialty} onClose={() => setContactCtx(null)} />}
    </main>
  )
}
