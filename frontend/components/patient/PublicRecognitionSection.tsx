'use client'

/**
 * Public-facing Wall of Recognition section for the clinic profile page.
 * Deliberately styled distinctly from PublicReviewsSection (Heart icon, no
 * star rating, no "reviewed by Zubite" trust badge) — Recognition entries
 * carry no rating and never affect clinic ranking (see backend/routers/
 * recognition.py's module docstring), so mixing the two visually would
 * blur that distinction for a reader.
 *
 * Fetches `GET /api/public/clinics/{clinicId}/recognition` via
 * lib/recognition.ts's listClinicRecognition, which already fails soft to
 * an empty array — this component never needs its own error state.
 */
import { useEffect, useState } from 'react'
import { ArrowRight, Heart, Sparkles } from 'lucide-react'
import { listClinicRecognition, recognitionPhotoUrl, type RecognitionEntry } from '@/lib/recognition'

interface Props {
  clinicId: string
}

function EntryCard({ entry }: { entry: RecognitionEntry }) {
  const before = entry.photos.find((p) => p.kind === 'before')
  const after = entry.photos.find((p) => p.kind === 'after')
  return (
    <article
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white flex flex-col"
      data-testid={`public-recognition-card-${entry.id}`}
    >
      {(before || after) && (
        <div className={`grid ${before && after ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {before && (
            <figure className="relative">
              <img
                src={recognitionPhotoUrl(entry.id, before.id)}
                alt="Преди — снимка, споделена от пациента"
                className="aspect-square w-full object-cover"
              />
              <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">
                Преди
              </figcaption>
            </figure>
          )}
          {after && (
            <figure className="relative">
              <img
                src={recognitionPhotoUrl(entry.id, after.id)}
                alt="След — снимка, споделена от пациента"
                className="aspect-square w-full object-cover"
              />
              <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">
                След
              </figcaption>
            </figure>
          )}
        </div>
      )}
      <div className="p-5 sm:p-6 flex flex-col gap-3">
        <Heart className="w-4 h-4 fill-orange-500 text-orange-500" aria-hidden />
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          „{entry.message}“
        </p>
        <div className="mt-1 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span className="font-medium text-slate-900">{entry.display_name}</span>
          {entry.treatment_label && <span> · {entry.treatment_label}</span>}
        </div>
      </div>
    </article>
  )
}

export function PublicRecognitionSection({ clinicId }: Props) {
  const [entries, setEntries] = useState<RecognitionEntry[] | null>(null)

  useEffect(() => {
    if (!clinicId) return
    let alive = true
    listClinicRecognition(clinicId).then((rows) => { if (alive) setEntries(rows) })
    return () => { alive = false }
  }, [clinicId])

  if (entries === null) {
    return (
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        data-testid="profile-recognition-section-loading"
        aria-busy="true"
      >
        <div className="h-5 w-56 rounded bg-slate-100 animate-pulse" />
        <div className="mt-3 h-4 w-72 rounded bg-slate-100 animate-pulse" />
      </section>
    )
  }

  const hasEntries = entries.length > 0

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
      data-testid="profile-recognition-section"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
            <Heart className="w-4 h-4 fill-orange-500 text-orange-500" aria-hidden />
            Благодарности от пациенти
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl">
            Лични истории, споделени доброволно — без оценки и без влияние върху класирането на клиниката.
          </p>
        </div>
      </div>

      {hasEntries ? (
        <div className="mt-5 grid gap-3 sm:gap-4 sm:grid-cols-2" data-testid="profile-recognition-list">
          {entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
        </div>
      ) : (
        <div
          className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center"
          data-testid="profile-recognition-empty"
        >
          <Sparkles className="w-5 h-5 text-slate-300 mx-auto mb-1.5" aria-hidden />
          <p className="text-xs sm:text-sm text-slate-500">
            Все още няма публикувани благодарности за тази клиника.
          </p>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[11px] text-slate-400 leading-snug max-w-xl">
          Историите отразяват личен опит и не гарантират еднакъв резултат за друг пациент.
        </p>
        <a
          href="/recognition"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full ring-1 ring-orange-200 text-orange-700 hover:bg-orange-50 px-3 py-1.5 text-xs font-medium transition-colors"
          data-testid="profile-recognition-wall-cta"
        >
          Wall of Recognition <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </section>
  )
}
