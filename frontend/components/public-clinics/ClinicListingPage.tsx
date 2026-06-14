'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, Building2, AlertCircle, ShieldCheck, Compass } from 'lucide-react'
import {
  listPublicClinics, cityDisplay, treatmentLabel,
  type PublicClinic, type PublicClinicFilters,
} from '@/lib/publicClinics'
import PublicClinicCard from './PublicClinicCard'
import PublicClinicFiltersBar from './PublicClinicFilters'
import CompareTray from './CompareTray'
import PublicContactModal from './PublicContactModal'

const MAX_COMPARE = 3

interface Props {
  // When the route already binds a city, the filter bar shows it as fixed.
  initialCity?: string
  // When the route already binds a specialty (future), pre-apply it.
  initialSpecialty?: string
  // Override the auto-generated heading. Used by `/kliniki/[city]/[specialty]`
  // so the SEO-friendly Bulgarian phrasing wins over the generic fallback.
  headingOverride?: string
  // Pass `{ basePath: '/kliniki' }` so picking a city in the filter
  // rewrites the URL to `/kliniki/[city]`.
  syncToUrl?: { basePath: string }
}

/**
 * The clinic listing experience. Shared by the root `/kliniki` page and
 * `/kliniki/[city]`. The compare tray, contact modal, and source
 * tracking all live here.
 */
export default function ClinicListingPage({
  initialCity,
  initialSpecialty,
  headingOverride,
  syncToUrl,
}: Props) {
  const [filters, setFilters] = useState<PublicClinicFilters>(() => ({
    city: initialCity,
    specialty: initialSpecialty,
  }))
  const [clinics, setClinics] = useState<PublicClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [contactCtx, setContactCtx] = useState<{
    clinics: PublicClinic[]
    source: 'clinic_card' | 'clinic_compare'
    consultationType: 'general' | 'online'
  } | null>(null)

  // Sync `initialCity`/`initialSpecialty` from route — without this,
  // navigating between `/kliniki` and `/kliniki/sofia` doesn't refilter.
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      city: initialCity ?? prev.city,
      specialty: initialSpecialty ?? prev.specialty,
    }))
  }, [initialCity, initialSpecialty])

  const fetchClinics = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await listPublicClinics(filters)
      setClinics(data.clinics)
    } catch (e) {
      setErr('Грешка при зареждане на клиниките.')
      setClinics([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchClinics()
  }, [fetchClinics])

  const inCompareSet = useMemo(() => new Set(compareIds), [compareIds])
  const compareClinics = useMemo(
    () => compareIds
      .map((id) => clinics.find((c) => c.id === id))
      .filter((c): c is PublicClinic => !!c),
    [compareIds, clinics],
  )

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_COMPARE) return prev   // cap silently
      return [...prev, id]
    })
  }

  const heading = useMemo(() => {
    if (headingOverride) return headingOverride
    const city = filters.city ? cityDisplay(filters.city) : null
    const treatment = filters.specialty ? treatmentLabel(filters.specialty) : null
    if (city && treatment) return `${treatment} клиники в ${city}`
    if (city) return `Дентални клиники в ${city}`
    if (treatment) return `${treatment} клиники`
    return 'Намерете подходяща дентална клиника'
  }, [filters.city, filters.specialty, headingOverride])

  return (
    <main
      className="min-h-screen bg-[#FCFAF8] overflow-x-hidden relative pb-24"
      data-testid="kliniki-listing-page"
    >
      {/* Background blobs — mirror existing Zubite premium aesthetic */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.22) 0%, rgba(94,234,212,0) 60%),' +
            'radial-gradient(ellipse 60% 50% at 90% 40%, rgba(165,243,252,0.30) 0%, rgba(165,243,252,0) 60%)',
        }}
      />
      <div aria-hidden className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-40 right-0 w-[40rem] h-[40rem] rounded-full bg-cyan-100/35 blur-3xl pointer-events-none" />

      <section className="relative pt-16 sm:pt-20 pb-8 md:pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title */}
          <div className="mb-7 max-w-3xl">
            <p className="font-sans text-[11px] font-semibold tracking-[0.22em] uppercase text-teal-700 mb-2">
              Публичен каталог
            </p>
            <h1
              className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 leading-tight"
              data-testid="kliniki-heading"
            >
              {heading}
            </h1>
            <p className="text-slate-600 mt-3 text-base leading-relaxed">
              Сравнете клиники според локация, специализация, онлайн консултация,
              профилна информация и Zubite доверителни сигнали.
            </p>

            <div
              className="mt-4 rounded-xl bg-white/55 backdrop-blur-md ring-1 ring-white/70 p-3 text-[12px] text-slate-600 leading-snug flex items-start gap-2"
              data-testid="kliniki-ranking-note"
            >
              <ShieldCheck className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <span>
                Клиниките се подреждат според релевантност към избраната
                категория, локация, профилна пълнота и Zubite доверителни
                сигнали. <strong>Спонсорираното позициониране не влияе на
                органичното подреждане.</strong>
              </span>
            </div>
          </div>

          {/* Filters */}
          <PublicClinicFiltersBar
            value={filters}
            onChange={setFilters}
            syncToUrl={syncToUrl}
          />

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white/65 backdrop-blur-xl ring-1 ring-white/70 rounded-2xl p-7 animate-pulse"
                  data-testid={`kliniki-skel-${i}`}
                >
                  <div className="w-full h-32 rounded-lg bg-slate-100 mb-4" />
                  <div className="h-5 w-3/4 bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded mb-5" />
                  <div className="h-3 w-full bg-slate-100 rounded mb-1.5" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded mb-6" />
                  <div className="h-10 w-full bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : err ? (
            <div
              className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-rose-200 p-6 flex items-start gap-3"
              data-testid="kliniki-error"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">{err}</p>
                <button
                  type="button"
                  onClick={fetchClinics}
                  className="mt-2 text-sm text-teal-700 hover:underline"
                  data-testid="kliniki-error-retry"
                >
                  Опитай отново
                </button>
              </div>
            </div>
          ) : clinics.length === 0 ? (
            <div
              className="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/80 p-8 text-center"
              data-testid="kliniki-empty"
            >
              <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-700 font-medium">
                Няма клиники, които съвпадат с филтрите.
              </p>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Можеш да опиташ с друг град или да попълниш бърза оценка,
                за да получиш персонализирани препоръки.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                <a
                  href="/quiz"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium hover:-translate-y-0.5 transition-all shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50)]"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
                  }}
                  data-testid="kliniki-empty-cta-quiz"
                >
                  <Compass className="w-4 h-4" />
                  Попълни оценка
                </a>
                <a
                  href="/kliniki"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white ring-1 ring-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  data-testid="kliniki-empty-cta-clear"
                >
                  Виж всички клиники
                </a>
              </div>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              data-testid="kliniki-grid"
            >
              {clinics.map((c) => (
                <PublicClinicCard
                  key={c.id}
                  clinic={c}
                  isInCompare={inCompareSet.has(c.id)}
                  onToggleCompare={() => toggleCompare(c.id)}
                  onRequestContact={() =>
                    setContactCtx({
                      clinics: [c],
                      source: 'clinic_card',
                      consultationType: 'general',
                    })
                  }
                  onRequestOnline={() =>
                    setContactCtx({
                      clinics: [c],
                      source: 'clinic_card',
                      consultationType: 'online',
                    })
                  }
                />
              ))}
            </div>
          )}

          {/* Soft trust footnote */}
          <p
            className="mt-12 text-[11px] text-slate-400 text-center leading-snug max-w-2xl mx-auto"
            data-testid="kliniki-footnote"
          >
            Zubite.bg не поставя диагноза, не гарантира резултат и не определя
            „най-добра" клиника. Целта на каталога е по-информирана следваща стъпка.
          </p>
        </div>
      </section>

      {/* Compare tray */}
      <CompareTray
        clinics={compareClinics}
        onRemove={(id) => setCompareIds((p) => p.filter((x) => x !== id))}
        onClear={() => setCompareIds([])}
        onRequestContactAll={() =>
          setContactCtx({
            clinics: compareClinics,
            source: 'clinic_compare',
            consultationType: 'general',
          })
        }
      />

      {/* Contact modal */}
      {contactCtx && (
        <PublicContactModal
          clinics={contactCtx.clinics}
          source={contactCtx.source}
          consultationType={contactCtx.consultationType}
          prefillCity={filters.city}
          prefillTreatment={filters.specialty}
          onClose={() => setContactCtx(null)}
        />
      )}
    </main>
  )
}
