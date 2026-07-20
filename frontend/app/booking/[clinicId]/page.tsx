'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { CalendarDays, Clock, Loader2, CheckCircle2, AlertTriangle, ChevronLeft } from 'lucide-react'
import type { PublicClinic } from '@/lib/publicClinics'
import { SaveBookingBanner } from '@/components/patient/SaveBookingBanner'
import { getStoredLeadContact } from '@/lib/leadContact'

const PublicContactModal = dynamic(
  () => import('@/components/public-clinics/PublicContactModal'),
  { ssr: false },
)

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Slot { start: string; end: string; consultation_type: string; doctor_id?: string | null }

const CONSULT_LABELS: Record<string, string> = {
  initial_consultation: 'Първична консултация',
  orthodontic_consultation: 'Ортодонтска консултация',
  implant_consultation: 'Имплантологична консултация',
  hygiene_consultation: 'Хигиенна консултация',
  aesthetic_consultation: 'Естетична консултация',
  other: 'Консултация',
}

function fmtDateBg(iso: string): string {
  try { return new Date(iso).toLocaleDateString('bg-BG', { weekday: 'short', day: '2-digit', month: 'long' }) }
  catch { return iso }
}
function fmtTimeBg(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

export default function BookingPage() {
  const params = useParams<{ clinicId: string; leadId?: string }>()
  const searchParams = useSearchParams()
  const clinicId = params.clinicId as string
  const leadId = (params.leadId as string) || searchParams.get('leadId') || null
  const source = leadId ? 'quiz_result' : 'clinic_profile'

  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [clinicName, setClinicName] = useState('')
  const [address, setAddress] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [step, setStep] = useState<'calendar' | 'form' | 'success' | 'slot_taken'>('calendar')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [publicClinic, setPublicClinic] = useState<PublicClinic | null>(null)
  const [contactOpen, setContactOpen] = useState(false)

  const [form, setForm] = useState({
    patient_name: '', patient_email: '', patient_phone: '',
    patient_city: '',
    treatment_category: '',
    patient_concern_summary: '',
    consent_confirmed: false, not_emergency_confirmed: false,
  })
  const [confirmed, setConfirmed] = useState<{ start: string; clinic: string; email: string; name: string } | null>(null)

  // Prefill from what the patient already gave at the /results contact-
  // capture step (ResultUnlockGate), cached client-side in leadContact.ts.
  // Only fills fields still blank — never clobbers in-progress typing.
  useEffect(() => {
    if (!leadId) return
    const cached = getStoredLeadContact(leadId)
    if (!cached) return
    setForm((f) => ({
      ...f,
      patient_name: f.patient_name || cached.name || '',
      patient_email: f.patient_email || cached.email || '',
      patient_phone: f.patient_phone || cached.phone || '',
    }))
  }, [leadId])

  const requestedReturnTo = searchParams.get('returnTo')
  const backHref = useMemo(() => {
    if (leadId) return `/results/${leadId}/clinics/${clinicId}`
    if (
      requestedReturnTo &&
      requestedReturnTo.startsWith('/clinics/') &&
      !requestedReturnTo.startsWith('//')
    ) return requestedReturnTo
    return '/clinics'
  }, [clinicId, leadId, requestedReturnTo])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [r, profileResponse] = await Promise.all([
        fetch(`${API_URL}/api/public/clinics/${clinicId}/booking-slots?days=30`, { cache: 'no-store' }),
        fetch(`${API_URL}/api/public/clinics/${clinicId}`, { cache: 'no-store' }),
      ])
      if (r.ok) {
        const d = await r.json()
        setEnabled(!!d.booking_enabled)
        setClinicName(d.clinic_name || '')
        setAddress(d.address || '')
        setSlots(d.slots || [])
      } else {
        setLoadError('Не успяхме да заредим календара на клиниката.')
      }
      if (profileResponse.ok) setPublicClinic(await profileResponse.json())
    } catch {
      setLoadError('Не успяхме да заредим календара. Провери връзката си и опитай отново.')
    } finally { setLoading(false) }
  }, [clinicId])

  useEffect(() => { load() }, [load])

  // Group slots by date.
  const grouped = useMemo(() => {
    const groups: Record<string, Slot[]> = {}
    for (const s of slots) {
      const day = s.start.slice(0, 10)
      ;(groups[day] ||= []).push(s)
    }
    return groups
  }, [slots])
  const dates = useMemo(() => Object.keys(grouped).sort(), [grouped])
  const [activeDate, setActiveDate] = useState<string | null>(null)
  useEffect(() => { if (dates.length && !activeDate) setActiveDate(dates[0]) }, [dates, activeDate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true); setError(null)
    try {
      const r = await fetch(`${API_URL}/api/public/clinics/${clinicId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_slot_start: selected.start,
          selected_slot_end: selected.end,
          ...form,
          lead_id: leadId,
          source,
        }),
      })
      if (r.ok) {
        setConfirmed({ start: selected.start, clinic: clinicName, email: form.patient_email, name: form.patient_name })
        setStep('success')
      } else if (r.status === 409) {
        setStep('slot_taken')
        await load()
      } else {
        const j = await r.json().catch(() => ({}))
        setError(typeof j.detail === 'string' ? j.detail : 'Възникна грешка при заявката.')
      }
    } finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FCFAF8]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (loadError) {
    return (
      <BookingShell title={clinicName || 'Клиника'} backHref={backHref}>
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center" role="alert" data-testid="booking-load-error">
          <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-3" aria-hidden="true" />
          <h2 className="font-serif text-xl font-semibold text-slate-900 mb-1">Календарът не се зареди</h2>
          <p className="text-sm text-slate-600 mb-4">{loadError}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white">
              Опитай отново
            </button>
            <Link href={backHref} className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-medium text-slate-900">
              Към профила
            </Link>
          </div>
        </div>
      </BookingShell>
    )
  }

  if (!enabled) {
    return (
      <BookingShell title={clinicName || 'Клиника'} backHref={backHref}>
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center" data-testid="booking-disabled">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-3" />
          <h2 className="font-serif text-xl font-semibold text-slate-900 mb-1">Клиниката няма онлайн календар</h2>
          <p className="text-sm text-slate-600 mb-4">Тази клиника не приема онлайн заявки за час. Можеш да се свържеш директно с нея.</p>
          <Link href={backHref} className="inline-flex items-center gap-1.5 px-4 min-h-11 rounded-full bg-slate-900 text-white text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Обратно към профила
          </Link>
        </div>
      </BookingShell>
    )
  }

  if (step === 'success' && confirmed) {
    return (
      <BookingShell title={confirmed.clinic} backHref="/">
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center max-w-lg mx-auto" data-testid="booking-success">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-2">Консултацията е заявена успешно</h2>
          <p className="text-sm text-slate-600 mb-4">
            Изпратихме потвърждение на <b>{confirmed.email}</b> и уведомихме клиниката. Ще получиш напомняне 1 ден преди часа.
          </p>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-left text-sm space-y-1 mb-4">
            <div><b>Клиника:</b> {confirmed.clinic}</div>
            <div><b>Дата и час:</b> {fmtDateBg(confirmed.start)}, {fmtTimeBg(confirmed.start)}</div>
            <div><b>Пациент:</b> {confirmed.name}</div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Zubite.bg не е клиника и не поставя диагноза. Информацията служи за ориентация и подготовка за консултация.
          </p>
          <SaveBookingBanner initialEmail={confirmed.email} />
        </div>
      </BookingShell>
    )
  }

  if (step === 'slot_taken') {
    return (
      <BookingShell title={clinicName} backHref={backHref}>
        <div className="rounded-2xl bg-white border border-amber-200 p-6 text-center" data-testid="booking-slot-taken">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-700">Този час вече не е свободен. Моля, избери друг.</p>
          <button type="button" onClick={() => { setStep('calendar'); setSelected(null) }} className="mt-3 inline-flex min-h-11 items-center gap-1 px-4 rounded-full bg-slate-900 text-white text-sm">
            Обратно към календара
          </button>
        </div>
      </BookingShell>
    )
  }

  return (
    <>
    <BookingShell title={clinicName} backHref={backHref}>
      {step === 'calendar' && (
        <div className="space-y-4" data-testid="booking-calendar">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Избери свободен час от календара на клиниката. Zubite.bg не е клиника и не поставя диагноза —
            информацията от въпросника помага на клиниката да разбере по-добре повода за консултация.
          </p>
          <p className="text-[11px] text-slate-500">Всички часове са в българско време (Europe/Sofia).</p>

          {dates.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-600 text-sm" data-testid="booking-no-slots">
              <p>Клиниката няма свободни часове в момента. Можеш да заявиш контакт или да провериш по-късно.</p>
              {publicClinic ? (
                <button type="button" onClick={() => setContactOpen(true)} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 font-medium text-white" data-testid="booking-no-slots-contact">
                  Заяви контакт
                </button>
              ) : (
                <Link href={backHref} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 font-medium text-white">
                  Към профила на клиниката
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Date rail */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" data-testid="booking-date-rail">
                {dates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setActiveDate(d)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition ${
                      activeDate === d
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                    }`}
                    data-testid={`booking-date-${d}`}
                  >
                    <div className="opacity-70">{fmtDateBg(d).split(',')[0]}</div>
                    <div className="text-sm font-semibold">{d.slice(8, 10)}</div>
                  </button>
                ))}
              </div>

              {/* Slots grid */}
              {activeDate && grouped[activeDate] && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2" data-testid="booking-slots-grid">
                  {grouped[activeDate].map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => { setSelected(s); setStep('form') }}
                      className="min-h-[48px] px-2 rounded-xl border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-400 text-sm font-medium text-slate-800 transition"
                      data-testid={`booking-slot-${s.start}`}
                    >
                      {fmtTimeBg(s.start)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 'form' && selected && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white border border-slate-200 p-5 max-w-lg mx-auto" data-testid="booking-form">
          <button type="button" onClick={() => { setSelected(null); setStep('calendar') }} className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-xs text-slate-500 hover:text-slate-800">
            <ChevronLeft className="w-3.5 h-3.5" /> Обратно към календара
          </button>
          <div className="rounded-lg bg-teal-50/70 border border-teal-200 p-3 text-sm">
            <div className="font-semibold text-slate-900">{CONSULT_LABELS[selected.consultation_type] || 'Консултация'}</div>
            <div className="text-slate-700">{fmtDateBg(selected.start)}, {fmtTimeBg(selected.start)} — {fmtTimeBg(selected.end)}</div>
            <div className="text-xs text-slate-500">{clinicName}{address ? ` · ${address}` : ''}</div>
          </div>

          <TextField label="Име и фамилия" required value={form.patient_name}
            onChange={(v) => setForm({ ...form, patient_name: v })} testid="booking-name" />
          <TextField label="Телефон" required type="tel" value={form.patient_phone}
            onChange={(v) => setForm({ ...form, patient_phone: v })} testid="booking-phone" />
          <TextField label="Имейл" required type="email" value={form.patient_email}
            onChange={(v) => setForm({ ...form, patient_email: v })} testid="booking-email" />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Град (по избор)" value={form.patient_city}
              onChange={(v) => setForm({ ...form, patient_city: v })} testid="booking-city" />
            <label className="block text-xs text-slate-600">
              <span>Тип консултация (по избор)</span>
              <select value={form.treatment_category}
                onChange={(e) => setForm({ ...form, treatment_category: e.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white"
                data-testid="booking-treatment-category">
                <option value="">— избери —</option>
                <option value="orthodontics">Ортодонтия / алайнери / брекети</option>
                <option value="implants">Импланти</option>
                <option value="aesthetics">Естетика / фасети / избелване</option>
                <option value="hygiene">Хигиена / профилактика</option>
                <option value="endodontics">Ендодонтия</option>
                <option value="surgery">Хирургия</option>
                <option value="other">Друго</option>
              </select>
            </label>
          </div>

          <label className="block text-xs text-slate-600">
            <span>Кратко описание (по избор)</span>
            <textarea value={form.patient_concern_summary}
              onChange={(e) => setForm({ ...form, patient_concern_summary: e.target.value })}
              rows={2} maxLength={1000}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              data-testid="booking-note" />
          </label>

          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={form.consent_confirmed}
              onChange={(e) => setForm({ ...form, consent_confirmed: e.target.checked })}
              required
              className="mt-1"
              data-testid="booking-consent" />
            Съгласен/на съм Zubite.bg да изпрати данните от заявката и избрания час към избраната клиника с цел организиране на консултация.
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={form.not_emergency_confirmed}
              onChange={(e) => setForm({ ...form, not_emergency_confirmed: e.target.checked })}
              required
              className="mt-1"
              data-testid="booking-not-emergency" />
            Потвърждавам, че това не е спешна медицинска нужда и че Zubite.bg не поставя диагноза.
          </label>

          {error && <div className="text-sm text-rose-600" data-testid="booking-error">{error}</div>}

          <button type="submit" disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm disabled:opacity-50"
            data-testid="booking-submit">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Запази час
          </button>

          <p className="text-[10px] text-slate-500 italic leading-relaxed">
            Zubite.bg не е клиника и не поставя диагноза. Информацията служи за ориентация и подготовка за консултация.
          </p>
        </form>
      )}
    </BookingShell>
    {contactOpen && publicClinic && (
      <PublicContactModal
        clinics={[publicClinic]}
        source="clinic_profile"
        consultationType="general"
        prefillCity={publicClinic.city_slug}
        prefillTreatment={publicClinic.treatments[0]}
        hasQuizContext={!!leadId}
        onClose={() => setContactOpen(false)}
      />
    )}
    </>
  )
}

function BookingShell({ title, backHref, children }: { title: string; backHref: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FCFAF8] pb-24">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={backHref} aria-label="Обратно към профила на клиниката" className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-slate-100 text-slate-600">
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-teal-700">Запази консултация</p>
            <h1 className="font-serif text-lg font-semibold text-slate-900 truncate">{title}</h1>
          </div>
          <CalendarDays className="w-5 h-5 text-slate-300" />
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
    </main>
  )
}

function TextField({ label, value, onChange, required, type = 'text', testid }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; testid?: string
}) {
  return (
    <label className="block text-xs text-slate-600">
      <span>{label}{required && <span className="text-rose-500"> *</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
        data-testid={testid} />
    </label>
  )
}
