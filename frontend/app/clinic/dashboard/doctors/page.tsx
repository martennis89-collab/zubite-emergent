'use client'

/**
 * Clinic Dashboard · Doctors.
 *
 * Phase 1 of the multi-doctor booking system: lets a clinic register its
 * doctors and their specialties. This page only manages the roster —
 * assigning a doctor to a specific booking, per-doctor availability, and
 * the calendar's doctor-lane view are later phases that build on this
 * entity once it exists.
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, Stethoscope, Globe, Building2, X, Check } from 'lucide-react'
import { ClinicShell } from '@/components/ClinicShell'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

const CATEGORY_LABELS_BG: Record<string, string> = {
  orthodontics: 'Ортодонтия',
  aligners: 'Алайнери',
  implants: 'Импланти',
  cosmetic_dentistry: 'Естетична стоматология',
  general_orientation: 'Обща ориентация',
}

interface Doctor {
  id: string
  name: string
  title?: string | null
  specialties: string[]
  accepts_online: boolean
  accepts_in_person: boolean
  active: boolean
  bio?: string | null
}

interface DoctorFormValues {
  name: string
  title: string
  specialties: string[]
  accepts_online: boolean
  accepts_in_person: boolean
  bio: string
}

const EMPTY_FORM: DoctorFormValues = {
  name: '',
  title: '',
  specialties: [],
  accepts_online: true,
  accepts_in_person: true,
  bio: '',
}

export default function ClinicDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [allowedSpecialties, setAllowedSpecialties] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr('')
    try {
      const r = await fetch(`${API_URL}/api/clinic/doctors`, {
        credentials: 'include' as RequestCredentials,
      })
      if (!r.ok) {
        setErr('Грешка при зареждане на лекарите.')
        return
      }
      const data = await r.json()
      setDoctors(data.doctors || [])
      setAllowedSpecialties(data.allowed_specialties || [])
    } catch {
      setErr('Грешка при зареждане на лекарите.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const activeDoctors = doctors.filter((d) => d.active)
  const inactiveDoctors = doctors.filter((d) => !d.active)

  return (
    <ClinicShell>
      <div className="space-y-6 max-w-3xl" data-testid="clinic-doctors-page">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              Лекари
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Списък с лекарите във вашата клиника и техните специалности.
              Използва се за да разпределяте заявки към подходящия лекар.
            </p>
          </div>
          {!loading && !adding && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setAdding(true) }}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 shrink-0"
              data-testid="doctor-add-btn"
            >
              <Plus className="w-4 h-4" /> Добави лекар
            </button>
          )}
        </header>

        {err && (
          <p
            className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3"
            data-testid="clinic-doctors-error"
          >
            {err}
          </p>
        )}

        {loading ? (
          <div
            className="inline-flex items-center gap-2 text-sm text-slate-500"
            data-testid="clinic-doctors-loading"
          >
            <Loader2 className="w-4 h-4 animate-spin" /> Зареждане…
          </div>
        ) : (
          <div className="space-y-4">
            {adding && (
              <DoctorForm
                allowedSpecialties={allowedSpecialties}
                initial={EMPTY_FORM}
                submitLabel="Добави лекар"
                onCancel={() => setAdding(false)}
                onSubmit={async (values) => {
                  const ok = await createDoctor(values)
                  if (ok) { setAdding(false); await load() }
                  return ok
                }}
              />
            )}

            {activeDoctors.length === 0 && !adding && (
              <p className="text-sm text-slate-400 italic" data-testid="clinic-doctors-empty">
                Все още няма добавени лекари.
              </p>
            )}

            {activeDoctors.map((doc) =>
              editingId === doc.id ? (
                <DoctorForm
                  key={doc.id}
                  allowedSpecialties={allowedSpecialties}
                  initial={{
                    name: doc.name,
                    title: doc.title || '',
                    specialties: doc.specialties,
                    accepts_online: doc.accepts_online,
                    accepts_in_person: doc.accepts_in_person,
                    bio: doc.bio || '',
                  }}
                  submitLabel="Запази промените"
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (values) => {
                    const ok = await updateDoctor(doc.id, values)
                    if (ok) { setEditingId(null); await load() }
                    return ok
                  }}
                />
              ) : (
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  onEdit={() => { setAdding(false); setEditingId(doc.id) }}
                  onDeactivate={async () => {
                    if (!confirm(`Деактивиране на ${doc.name}? Историческите записи ще останат непроменени.`)) return
                    const r = await fetch(`${API_URL}/api/clinic/doctors/${doc.id}`, {
                      method: 'DELETE',
                      credentials: 'include' as RequestCredentials,
                    })
                    if (r.ok) await load()
                    else setErr('Лекарят не бе деактивиран.')
                  }}
                />
              )
            )}

            {inactiveDoctors.length > 0 && (
              <details className="pt-2">
                <summary className="text-sm text-slate-400 cursor-pointer select-none">
                  Деактивирани лекари ({inactiveDoctors.length})
                </summary>
                <div className="space-y-3 mt-3">
                  {inactiveDoctors.map((doc) => (
                    <DoctorCard key={doc.id} doctor={doc} readOnly />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </ClinicShell>
  )

  async function createDoctor(values: DoctorFormValues): Promise<boolean> {
    setErr('')
    const r = await fetch(`${API_URL}/api/clinic/doctors`, {
      method: 'POST',
      credentials: 'include' as RequestCredentials,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(values)),
    })
    if (!r.ok) {
      setErr('Лекарят не бе добавен.')
      return false
    }
    return true
  }

  async function updateDoctor(id: string, values: DoctorFormValues): Promise<boolean> {
    setErr('')
    const r = await fetch(`${API_URL}/api/clinic/doctors/${id}`, {
      method: 'PATCH',
      credentials: 'include' as RequestCredentials,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(values)),
    })
    if (!r.ok) {
      setErr('Промените не бяха запазени.')
      return false
    }
    return true
  }
}

function toPayload(values: DoctorFormValues) {
  return {
    name: values.name.trim(),
    title: values.title.trim() || null,
    specialties: values.specialties,
    accepts_online: values.accepts_online,
    accepts_in_person: values.accepts_in_person,
    bio: values.bio.trim() || null,
  }
}

function DoctorCard({
  doctor,
  onEdit,
  onDeactivate,
  readOnly = false,
}: {
  doctor: Doctor
  onEdit?: () => void
  onDeactivate?: () => void
  readOnly?: boolean
}) {
  return (
    <section
      className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3 ${readOnly ? 'opacity-60' : ''}`}
      data-testid={`doctor-card-${doctor.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 grid place-items-center shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-slate-900 truncate">{doctor.name}</h3>
            {doctor.title && <p className="text-sm text-slate-500 truncate">{doctor.title}</p>}
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-teal-700"
              aria-label={`Редактирай ${doctor.name}`}
              data-testid={`doctor-edit-${doctor.id}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onDeactivate}
              className="p-2 rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700"
              aria-label={`Деактивирай ${doctor.name}`}
              data-testid={`doctor-deactivate-${doctor.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {doctor.specialties.map((s) => (
          <span
            key={s}
            className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1"
          >
            {CATEGORY_LABELS_BG[s] || s}
          </span>
        ))}
        {doctor.specialties.length === 0 && (
          <span className="text-xs text-slate-400 italic">Без зададена специалност</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className={`inline-flex items-center gap-1 ${doctor.accepts_online ? 'text-slate-600' : 'text-slate-300 line-through'}`}>
          <Globe className="w-3.5 h-3.5" /> Онлайн консултации
        </span>
        <span className={`inline-flex items-center gap-1 ${doctor.accepts_in_person ? 'text-slate-600' : 'text-slate-300 line-through'}`}>
          <Building2 className="w-3.5 h-3.5" /> Присъствени консултации
        </span>
      </div>

      {doctor.bio && <p className="text-sm text-slate-500 leading-relaxed">{doctor.bio}</p>}
    </section>
  )
}

function DoctorForm({
  allowedSpecialties,
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  allowedSpecialties: string[]
  initial: DoctorFormValues
  submitLabel: string
  onCancel: () => void
  onSubmit: (values: DoctorFormValues) => Promise<boolean>
}) {
  const [values, setValues] = useState<DoctorFormValues>(initial)
  const [saving, setSaving] = useState(false)

  const toggleSpecialty = (s: string) => {
    setValues((v) => ({
      ...v,
      specialties: v.specialties.includes(s)
        ? v.specialties.filter((x) => x !== s)
        : [...v.specialties, s],
    }))
  }

  const submit = async () => {
    if (!values.name.trim()) return
    setSaving(true)
    try {
      await onSubmit(values)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="bg-white border border-teal-200 rounded-2xl p-4 sm:p-6 space-y-4"
      data-testid="doctor-form"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm text-slate-700" htmlFor="doctor-name">Име</label>
          <input
            id="doctor-name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            placeholder="Д-р Иван Иванов"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            data-testid="doctor-form-name"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm text-slate-700" htmlFor="doctor-title">Длъжност (по избор)</label>
          <input
            id="doctor-title"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder="Ортодонт"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            data-testid="doctor-form-title"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm text-slate-700">Специалности</span>
        <div className="flex flex-wrap gap-2">
          {allowedSpecialties.map((s) => {
            const active = values.specialties.includes(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? 'border-teal-300 bg-teal-50 text-teal-700'
                    : 'border-slate-200 text-slate-500 hover:border-teal-200'
                }`}
                data-testid={`doctor-form-specialty-${s}`}
              >
                {active && <Check className="w-3.5 h-3.5" />}
                {CATEGORY_LABELS_BG[s] || s}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.accepts_online}
            onChange={(e) => setValues((v) => ({ ...v, accepts_online: e.target.checked }))}
            className="h-4 w-4 accent-teal-500"
            data-testid="doctor-form-online"
          />
          Приема онлайн консултации
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.accepts_in_person}
            onChange={(e) => setValues((v) => ({ ...v, accepts_in_person: e.target.checked }))}
            className="h-4 w-4 accent-teal-500"
            data-testid="doctor-form-in-person"
          />
          Приема присъствени консултации
        </label>
      </div>

      <div className="space-y-1">
        <label className="block text-sm text-slate-700" htmlFor="doctor-bio">Кратко описание (по избор)</label>
        <textarea
          id="doctor-bio"
          value={values.bio}
          onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
          data-testid="doctor-form-bio"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving || !values.name.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
          data-testid="doctor-form-submit"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
          data-testid="doctor-form-cancel"
        >
          <X className="w-3.5 h-3.5" /> Отказ
        </button>
      </div>
    </section>
  )
}
