'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Loader2, Building2, AlertCircle, ShieldCheck, Compass,
  Sparkles, Stethoscope, Heart, Activity, RefreshCw, MessagesSquare,
} from 'lucide-react'
import {
  listPublicClinics, cityDisplay, treatmentLabel,
  type PublicClinic, type PublicClinicFilters,
} from '@/lib/publicClinics'
import PublicClinicCard from './PublicClinicCard'
import PublicClinicFiltersBar from './PublicClinicFilters'
import CompareTray from './CompareTray'
import PublicContactModal from './PublicContactModal'

const MAX_COMPARE = 3

/** Premium-but-calm treatment discovery tiles shown above the filters.
 *  Each tile links to either the city-scoped listing (when a city filter
 *  is active) or a treatment-prefiltered listing. Order is intentional —
 *  Invisalign/aligners get visual priority since orthodontic exploration
 *  is the strongest patient-decision entry point on Zubite. */
const TREATMENT_TILES: Array<{
  slug: string
  label: string
  helper: string
  Icon: React.ComponentType<{ className?: string }>
}> = [
  { slug: 'invisalign', label: 'Invisalign / алайнери',
    helper: 'Изправяне на захапката със снемащи се алайнери', Icon: Sparkles },
  { slug: 'ortodontia', label: 'Брекети', helper: 'Класически и съвременни брекети', Icon: Activity },
  { slug: 'implantologia', label: 'Импланти', helper: 'Възстановяване на липсващи зъби', Icon: Stethoscope },
  { slug: 'estetichna-stomatologia', label: 'Естетична стоматология',
    helper: 'Фасети, бондинг, избелване', Icon: Sparkles },
  { slug: 'aligners', label: 'Орална хигиена',
    helper: 'Профилактика и здраве на венците', Icon: Heart },
  { slug: 'full_mouth', label: 'Второ мнение',
    helper: 'Сравни план на лечение от друга клиника', Icon: MessagesSquare },
]

// Note: backend treatment vocabulary currently covers ortho/aligners/implants/
// full_mouth. Tiles like "Орална хигиена" or "Второ мнение" may resolve to an
// empty result set on the linked page — the listing already handles that
// with a friendly empty state + CTAs, so this is acceptable for V1.

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

      <section className="relative pt-24 sm:pt-28 pb-10 md:pb-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ── Hero ─────────────────────────────────────────────── */}
          <div className="mb-10 sm:mb-12 max-w-3xl">
            <p className="font-sans text-[11px] font-semibold tracking-[0.22em] uppercase text-teal-700 mb-3">
              Публичен каталог
            </p>
            <h1
              className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-900 leading-[1.1] tracking-tight"
              data-testid="kliniki-heading"
            >
              {heading}
            </h1>
            <p className="text-slate-600 mt-5 text-base sm:text-lg leading-relaxed max-w-2xl">
              Сравнете клиники според локация, специализация, онлайн
              консултация, профилна информация и Zubite доверителни сигнали.
            </p>

            <div
              className="mt-6 inline-flex items-start gap-2.5 rounded-xl bg-white/55 backdrop-blur-md ring-1 ring-white/70 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.20)] px-3.5 py-2.5 text-[12.5px] text-slate-600 leading-relaxed max-w-2xl"
              data-testid="kliniki-ranking-note"
            >
              <ShieldCheck className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <span>
                Клиниките се подреждат според релевантност към избраната
                категория, локация, профилна пълнота и Zubite доверителни
                сигнали. <strong className="text-slate-700">Спонсорираното
                позициониране не влияе на органичното подреждане.</strong>
              </span>
            </div>
          </div>

          {/* ── Treatment discovery (above filters) ──────────────── */}
          <section className="mb-10" data-testid="treatment-discovery">
            <div className="mb-4">
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900">
                Популярни дентални направления
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Започни от лечението, което обмисляш, и сравни клиники според
                релевантност, локация и Zubite доверителни сигнали.
              </p>
            </div>
            <ul
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3"
              data-testid="treatment-tiles"
            >
              {TREATMENT_TILES.map(({ slug, label, helper, Icon }) => {
                const href = filters.city
                  ? `/kliniki/${filters.city}/${slug}`
                  : `/kliniki?specialty=${slug}`
                return (
                  <li key={slug}>
                    <Link
                      href={href}
                      className="group flex flex-col h-full p-3.5 rounded-xl bg-white/65 backdrop-blur-md ring-1 ring-white/70 hover:ring-teal-200 hover:bg-white/85 transition-all"
                      data-testid={`treatment-tile-${slug}`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-teal-50 ring-1 ring-teal-100 grid place-items-center mb-2 group-hover:bg-teal-100 transition-colors">
                        <Icon className="w-4 h-4 text-teal-700" />
                      </span>
                      <p className="text-[13px] font-semibold text-slate-900 leading-tight">
                        {label}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {helper}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* ── Filters ──────────────────────────────────────────── */}
          <PublicClinicFiltersBar
            value={filters}
            onChange={setFilters}
            syncToUrl={syncToUrl}
          />

          {/* ── Results summary ─────────────────────────────────── */}
          {!loading && !err && clinics.length > 0 && (
            <div
              className="mt-1 mb-5 flex items-center justify-between text-sm"
              data-testid="kliniki-results-summary"
            >
              <p className="text-slate-700">
                <span className="font-semibold">
                  Показани {clinics.length}{' '}
                  {clinics.length === 1 ? 'клиника' : 'клиники'}
                </span>{' '}
                <span className="text-slate-500 hidden sm:inline">
                  · подредени според релевантност и Zubite доверителни сигнали
                </span>
              </p>
              <button
                type="button"
                onClick={fetchClinics}
                className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 transition-colors"
                data-testid="kliniki-refresh"
                aria-label="Обнови списъка"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Обнови
              </button>
            </div>
          )}

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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
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
