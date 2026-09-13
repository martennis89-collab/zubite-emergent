'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Heart, ImagePlus, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { OtpLoginModal } from '@/components/OtpLoginModal'
import { ClinicPicker } from '@/components/shared/ClinicPicker'
import { getMe, type PatientMe } from '@/lib/patientAuth'
import {
  createRecognition,
  listRecognition,
  recognitionPhotoUrl,
  uploadRecognitionPhoto,
  type RecognitionEntry,
} from '@/lib/recognition'

const IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif'
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export function RecognitionWall() {
  const [entries, setEntries] = useState<RecognitionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<PatientMe | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [treatment, setTreatment] = useState('')
  const [taggingClinic, setTaggingClinic] = useState(false)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [layout, setLayout] = useState<RecognitionEntry['photo_layout']>('none')
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null)
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.allSettled([listRecognition(), getMe()]).then(([wall, me]) => {
      if (wall.status === 'fulfilled') setEntries(wall.value)
      if (me.status === 'fulfilled') setPatient(me.value)
      setLoading(false)
    })
  }, [])

  const selectPhoto = (file: File | undefined, setter: (file: File | null) => void) => {
    setError('')
    if (!file) return
    if (!IMAGE_TYPES.split(',').includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError('Приемаме JPG, PNG, WEBP или GIF до 8 MB.')
      return
    }
    setter(file)
  }

  const openForm = () => {
    if (!patient) {
      setShowLogin(true)
      return
    }
    setShowForm(true)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await createRecognition({
        message,
        display_name: displayName,
        treatment_label: treatment,
        clinic_id: taggingClinic ? clinicId : null,
        photo_layout: layout,
        consent_public_display: consent,
      })
      const uploads: Promise<void>[] = []
      if (layout === 'before_after' && beforePhoto) uploads.push(uploadRecognitionPhoto(result.id, 'before', beforePhoto))
      if (layout !== 'none' && afterPhoto) uploads.push(uploadRecognitionPhoto(result.id, 'after', afterPhoto))
      const outcomes = await Promise.allSettled(uploads)
      const failed = outcomes.filter((outcome) => outcome.status === 'rejected').length
      setSuccess(failed ? `${result.message} ${failed} снимка/и не се качиха.` : result.message)
      setShowForm(false)
      setMessage('')
      setDisplayName('')
      setTreatment('')
      setTaggingClinic(false)
      setClinicId(null)
      setLayout('none')
      setBeforePhoto(null)
      setAfterPhoto(null)
      setConsent(false)
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'AUTH_REQUIRED') {
        setPatient(null)
        setShowLogin(true)
      } else {
        setError(caught instanceof Error ? caught.message : 'Възникна грешка.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="taste-site min-h-screen bg-[#F5F4F2]">
      <Header />
      <main data-testid="recognition-wall">
        <section className="relative overflow-hidden border-b border-[#E5E5E5] px-4 pb-16 pt-14 sm:pb-20 sm:pt-20">
          <div className="absolute -right-20 top-8 h-64 w-64 rounded-full bg-[#D0FAE5]/70 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-[1180px]">
            <p className="taste-eyebrow">Благодарностите на пациентите</p>
            <div className="mt-5 grid items-end gap-8 lg:grid-cols-[1fr_360px]">
              <div>
                <h1 className="max-w-3xl text-[clamp(42px,7vw,82px)] font-bold leading-[.96] tracking-[-.06em] text-[#0A0A0A]">
                  Истории, които си струва <em className="font-serif font-normal text-[#007956]">да останат.</em>
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-[#525252]">
                  Публично място за човешка благодарност след дентална грижа. Без звезди, без класации и без влияние върху препоръките на Zubite.bg.
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_24px_60px_-48px_rgba(10,10,10,.5)]">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#D0FAE5] text-[#007956]"><ShieldCheck className="h-5 w-5" /></span>
                  <p className="text-sm leading-6 text-[#525252]">Всяка история и снимка се публикува само след изрично съгласие и човешка модерация.</p>
                </div>
                <button onClick={openForm} className="taste-button taste-button-accent mt-5 w-full" data-testid="recognition-share-cta">
                  Сподели благодарност <Heart className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-4 py-14 sm:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div><p className="taste-eyebrow">Wall of Recognition</p><h2 className="mt-3 text-3xl font-bold tracking-[-.04em] sm:text-5xl">Благодарности, не ревюта.</h2></div>
            <p className="max-w-md text-sm leading-6 text-[#6B6B6B]">Тези истории показват личен опит. Те не обещават същия резултат и не са сигнал за „най-добър“ лекар.</p>
          </div>

          {success && <div className="mb-8 flex items-start gap-3 rounded-2xl border border-[#BFE8D5] bg-[#E9FBF2] p-4 text-sm text-[#006A4B]"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />{success}</div>}
          {loading ? (
            <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#007956]" /></div>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#D4D4D4] bg-white px-6 py-16 text-center" data-testid="recognition-empty">
              <Sparkles className="mx-auto h-8 w-8 text-[#FF6B00]" />
              <h3 className="mt-4 text-2xl font-bold tracking-[-.03em]">Първите истории предстоят.</h3>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#6B6B6B]">Ако някой е направил пътя ти по-спокоен и ясен, можеш да оставиш първата благодарност.</p>
              <button onClick={openForm} className="taste-button taste-button-light mt-6 border border-[#E5E5E5]">Сподели история <ArrowRight className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" data-testid="recognition-grid">
              {entries.map((entry) => <RecognitionCard key={entry.id} entry={entry} />)}
            </div>
          )}
        </section>

        {showForm && (
          <section className="mx-auto max-w-3xl px-4 pb-20" data-testid="recognition-form-section">
            <form onSubmit={submit} className="rounded-3xl border border-[#E5E5E5] bg-white p-5 shadow-[0_30px_70px_-52px_rgba(10,10,10,.5)] sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><p className="taste-eyebrow">Твоята история</p><h2 className="mt-2 text-3xl font-bold tracking-[-.04em]">На кого искаш да благодариш?</h2></div><Heart className="h-7 w-7 text-[#FF6B00]" /></div>
              <label className="mt-6 block text-sm font-medium">Благодарност<textarea required minLength={40} maxLength={1200} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-2 w-full rounded-xl border border-[#E5E5E5] p-3 outline-none focus:border-[#007956]" placeholder="Разкажи какво направи преживяването ти по-спокойно, ясно или човешко…" /></label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Публично име (по избор)<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#E5E5E5] p-3 outline-none focus:border-[#007956]" placeholder="Само първото име" /></label><label className="text-sm font-medium">Тема (по избор)<input value={treatment} onChange={(e) => setTreatment(e.target.value)} className="mt-2 w-full rounded-xl border border-[#E5E5E5] p-3 outline-none focus:border-[#007956]" placeholder="напр. ортодонтия" /></label></div>
              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={taggingClinic} onChange={(e) => { setTaggingClinic(e.target.checked); if (!e.target.checked) setClinicId(null) }} className="h-4 w-4 accent-[#007956]" />
                  Историята е за конкретна клиника партньор (по избор)
                </label>
                {taggingClinic && (
                  <div className="mt-2">
                    <ClinicPicker value={clinicId} onChange={(id) => setClinicId(id)} placeholder="Търси клиника по име…" />
                    <p className="mt-1.5 text-xs text-[#6B6B6B]">Ще се появи в профила на клиниката след одобрение.</p>
                  </div>
                )}
              </div>
              <fieldset className="mt-5"><legend className="text-sm font-medium">Снимки (по избор)</legend><div className="mt-2 flex flex-wrap gap-2">{(['none', 'after_only', 'before_after'] as const).map((value) => <button key={value} type="button" onClick={() => { setLayout(value); if (value === 'none') { setBeforePhoto(null); setAfterPhoto(null) } }} className={`rounded-full border px-4 py-2 text-sm ${layout === value ? 'border-[#007956] bg-[#D0FAE5] text-[#006A4B]' : 'border-[#E5E5E5] text-[#525252]'}`}>{value === 'none' ? 'Без снимки' : value === 'after_only' ? 'Само след' : 'Преди и след'}</button>)}</div></fieldset>
              {layout !== 'none' && <div className="mt-4 grid gap-3 sm:grid-cols-2">{layout === 'before_after' && <PhotoField label="Преди" file={beforePhoto} onChange={(file) => selectPhoto(file, setBeforePhoto)} />}<PhotoField label="След" file={afterPhoto} onChange={(file) => selectPhoto(file, setAfterPhoto)} /></div>}
              <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-[#525252]"><input required type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#007956]" />Съгласен/на съм текстът и избраните снимки да бъдат показани публично след модерация. Потвърждавам, че имам право да споделя снимките.</label>
              {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
              <div className="mt-6 flex flex-wrap gap-3"><button disabled={submitting} className="taste-button taste-button-accent">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}{submitting ? 'Изпращане…' : 'Изпрати за преглед'}</button><button type="button" onClick={() => setShowForm(false)} className="taste-button taste-button-light border border-[#E5E5E5]">Отказ</button></div>
            </form>
          </section>
        )}
      </main>
      <Footer />
      <OtpLoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={(me) => { setPatient(me); setShowLogin(false); setShowForm(true) }} reason="за да споделиш благодарност" />
    </div>
  )
}

function PhotoField({ label, file, onChange }: { label: string; file: File | null; onChange: (file?: File) => void }) {
  return <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#D4D4D4] p-4 text-center text-sm text-[#525252] hover:border-[#007956]"><span><ImagePlus className="mx-auto mb-2 h-5 w-5 text-[#007956]" />{file ? file.name : `${label} — добави снимка`}</span><input type="file" accept={IMAGE_TYPES} className="hidden" onChange={(e) => onChange(e.target.files?.[0])} /></label>
}

function RecognitionCard({ entry }: { entry: RecognitionEntry }) {
  const before = entry.photos.find((photo) => photo.kind === 'before')
  const after = entry.photos.find((photo) => photo.kind === 'after')
  return <article className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-[0_24px_60px_-52px_rgba(10,10,10,.5)]">
    {(before || after) && <div className={`grid ${before && after ? 'grid-cols-2' : 'grid-cols-1'}`}>{before && <figure className="relative"><img src={recognitionPhotoUrl(entry.id, before.id)} alt="Преди — снимка, споделена от пациента" className="aspect-square w-full object-cover" /><figcaption className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">Преди</figcaption></figure>}{after && <figure className="relative"><img src={recognitionPhotoUrl(entry.id, after.id)} alt="След — снимка, споделена от пациента" className="aspect-square w-full object-cover" /><figcaption className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">След</figcaption></figure>}</div>}
    <div className="p-5"><Heart className="h-5 w-5 fill-[#FF6B00] text-[#FF6B00]" /><blockquote className="mt-4 text-base leading-7 text-[#171717]">„{entry.message}“</blockquote><div className="mt-5 border-t border-[#E5E5E5] pt-4 text-xs text-[#6B6B6B]"><strong className="text-[#0A0A0A]">{entry.display_name}</strong>{entry.treatment_label && <span> · {entry.treatment_label}</span>}{entry.clinic_name && <p className="mt-1">Благодарност към {entry.clinic_name}</p>}</div></div>
  </article>
}
