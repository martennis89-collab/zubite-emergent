'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, X, Loader2, Save } from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'
import { PatientContextSection } from '@/components/PatientContextSection'
import { statusBadge, formatDate, TREATMENT_LABELS } from '@/lib/consultationLabels'
import {
  getClinicPatient, updateClinicPatientNote,
  ClinicPatientProfile, CarePassStatus,
} from '@/lib/patients'

const CARE_PASS_BADGE: Record<CarePassStatus, { label: string; cls: string }> = {
  unlocked: { label: 'Care Pass отключен', cls: 'bg-emerald-100 text-emerald-700' },
  eligible: { label: 'Допустим за Care Pass', cls: 'bg-amber-100 text-amber-800' },
  none: { label: 'Без Care Pass', cls: 'bg-slate-100 text-slate-500' },
}

export default function ClinicPatientDetailPage() {
  const params = useParams()
  const patientNumber = Number(params?.patientNumber)
  const router = useRouter()

  const [data, setData] = useState<ClinicPatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSavedAt, setNoteSavedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const profile = await getClinicPatient(patientNumber)
      setData(profile)
      setNote(profile.clinic_internal_note || '')
    } catch (err: unknown) {
      const e = err as { status?: number }
      if (e?.status === 401 || e?.status === 403) {
        try { localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_user') } catch { /* noop */ }
        router.replace('/clinic')
        return
      }
      if (e?.status === 404) {
        setNotFound(true)
      }
    } finally {
      setLoading(false)
    }
  }, [patientNumber, router])

  useEffect(() => {
    if (Number.isFinite(patientNumber)) load()
  }, [patientNumber, load])

  const saveNote = async () => {
    setSavingNote(true)
    try {
      const res = await updateClinicPatientNote(patientNumber, note)
      setNoteSavedAt(res.clinic_internal_note_updated_at)
    } finally {
      setSavingNote(false)
    }
  }

  const cp = data ? CARE_PASS_BADGE[data.care_pass.status] : null

  return (
    <ClinicShell>
      <div className="space-y-5">
        <Link
          href="/clinic/dashboard/patients"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Всички пациенти
        </Link>

        {loading ? (
          <PatientDetailSkeleton />
        ) : notFound || !data ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center" data-testid="patient-not-found">
            <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-slate-100 text-slate-500 mb-3">
              <X className="w-5 h-5" />
            </div>
            <div className="text-base font-medium text-slate-700">Пациентът не е намерен</div>
            <p className="mt-1 text-sm text-slate-500">
              Възможно е номерът да е грешен или пациентът да принадлежи на друга клиника.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="font-mono text-xs text-slate-500">Пациент №{data.patient_number}</div>
                  <h1 className="font-serif text-2xl font-semibold text-slate-900">
                    {data.contact.name || '—'}
                  </h1>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${cp!.cls}`} data-testid="patient-care-pass-status">
                      {cp!.label}
                    </span>
                  </div>
                </div>
                {data.contact.phone && (
                  <a
                    href={`tel:${data.contact.phone}`}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium"
                    data-testid="patient-call-link"
                  >
                    <Phone className="w-4 h-4" />
                    Обади се
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 text-sm">
                <DetailRow icon={<Phone className="w-4 h-4" />} label="Телефон" value={data.contact.phone} />
                <DetailRow icon={<Mail className="w-4 h-4" />} label="Имейл" value={data.contact.email} />
                <DetailRow icon={<MapPin className="w-4 h-4" />} label="Град" value={data.contact.city} />
              </div>
            </div>

            {/* Quiz / source context — read-only, patient-reported. */}
            <PatientContextSection ctx={data.quiz_context} />

            {/* History */}
            <HistorySection title="Заявки за консултация" testid="patient-consultations">
              {data.consultations.length === 0 ? (
                <EmptyRow label="Няма заявки за консултация." />
              ) : (
                data.consultations.map((c) => {
                  const sb = statusBadge(c.status)
                  return (
                    <Link
                      key={c.id}
                      href={`/clinic/dashboard/requests/${c.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60"
                    >
                      <div>
                        <div className="text-sm text-slate-700">
                          {TREATMENT_LABELS[c.treatment_interest || ''] || c.treatment_interest || '—'}
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(c.created_at)}</div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${sb.cls}`}>
                        {sb.label}
                      </span>
                    </Link>
                  )
                })
              )}
            </HistorySection>

            <HistorySection title="Резервации" testid="patient-bookings">
              {data.bookings.length === 0 ? (
                <EmptyRow label="Няма резервации." />
              ) : (
                data.bookings.map((b) => {
                  const sb = statusBadge(b.status)
                  return (
                    <div key={b.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="text-sm text-slate-700">
                          {TREATMENT_LABELS[b.treatment_category || ''] || b.treatment_category || '—'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {b.selected_slot_start_display || formatDate(b.selected_slot_start)}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${sb.cls}`}>
                        {sb.label}
                      </span>
                    </div>
                  )
                })
              )}
            </HistorySection>

            <HistorySection title="Онлайн ориентации" testid="patient-orientation-bookings">
              {data.orientation_bookings.length === 0 ? (
                <EmptyRow label="Няма заявки за онлайн ориентация." />
              ) : (
                data.orientation_bookings.map((o) => {
                  const sb = statusBadge(o.status)
                  return (
                    <div key={o.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="text-sm text-slate-700">{o.topic_label_bg || o.topic || '—'}</div>
                        <div className="text-xs text-slate-500">{formatDate(o.scheduled_at)}</div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${sb.cls}`}>
                        {sb.label}
                      </span>
                    </div>
                  )
                })
              )}
            </HistorySection>

            {/* Internal note — the only editable field on this page. */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Вътрешна бележка</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Видима само за вашата клиника.
              </p>
              <textarea
                data-testid="patient-note-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={5000}
                rows={4}
                placeholder="Добавете бележка за този пациент…"
                className="w-full mt-3 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 placeholder-slate-400"
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  {noteSavedAt ? `Запазено: ${formatDate(noteSavedAt)}` : (data.clinic_internal_note_updated_at ? `Последна промяна: ${formatDate(data.clinic_internal_note_updated_at)}` : null)}
                </div>
                <button
                  type="button"
                  data-testid="patient-note-save"
                  onClick={saveNote}
                  disabled={savingNote}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white text-sm font-medium"
                >
                  {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Запази
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ClinicShell>
  )
}

function HistorySection({ title, testid, children }: { title: string; testid: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden" data-testid={testid}>
      <div className="px-4 py-3 bg-slate-50 text-sm font-medium text-slate-700">{title}</div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <div className="px-4 py-4 text-sm text-slate-400">{label}</div>
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-400 mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-slate-700">{value || '—'}</div>
      </div>
    </div>
  )
}

function PatientDetailSkeleton() {
  return (
    <div className="space-y-5" data-testid="patient-detail-skeleton">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
        <div className="h-3 w-20 bg-slate-100 rounded" />
        <div className="mt-2 h-6 w-48 bg-slate-200 rounded" />
        <div className="mt-3 h-4 w-32 bg-slate-100 rounded-full" />
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse h-16" />
      ))}
    </div>
  )
}
