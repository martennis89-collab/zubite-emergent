'use client'

/**
 * ClinicRecommendationChoice
 *
 * Step 3 of the quiz funnel, rendered on /results/[leadId] once contact
 * details are unlocked (ResultUnlockGate) and no preference has been
 * recorded yet (`lead.wants_clinic_recommendations == null`).
 *
 *   "Искаш ли Zubite да ти препоръча доверени партньорски клиники?"
 *
 * No  → POST clinic-recommendation-preference with wants_recommendations
 *       =false, then hand control back to the parent (`onDeclined`),
 *       which renders a graceful closing state. No city is ever asked.
 * Yes → reveal the city grid (+ optional "help the clinic prepare"
 *       fields), POST wants_recommendations=true + city, then navigate
 *       straight to /results/[leadId]/clinics — no extra click, no
 *       reload (the same principle behind the earlier ResultUnlockGate
 *       fix: never dead-end the patient on a screen they have to click
 *       through again).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, ShieldCheck, ArrowRight, Loader2, AlertTriangle, MapPin, X } from 'lucide-react'
import { trackPatientEvent } from '@/lib/patientAnalytics'
import { submitClinicRecommendationPreference } from '@/lib/api'
import { CITIES, SOFIA_DISTRICTS, INTAKE_FIELDS } from '@/lib/cityData'

interface ClinicRecommendationChoiceProps {
  leadId: string
  onDeclined: () => void
}

type Mode = 'ask' | 'city' | 'navigating'

export function ClinicRecommendationChoice({ leadId, onDeclined }: ClinicRecommendationChoiceProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('ask')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [intake, setIntake] = useState<Record<string, string | string[]>>({})
  const [submittingNo, setSubmittingNo] = useState(false)
  const [submittingYes, setSubmittingYes] = useState(false)
  const [error, setError] = useState('')

  const handleNo = async () => {
    setSubmittingNo(true)
    setError('')
    try {
      await submitClinicRecommendationPreference(leadId, { wants_recommendations: false })
      try { trackPatientEvent('clinic_recommendation_declined', { lead_id_present: true }) } catch { /* ignore */ }
      onDeclined()
    } catch {
      setError('Възникна грешка. Опитай отново.')
      setSubmittingNo(false)
    }
  }

  const handleYes = () => {
    try { trackPatientEvent('clinic_recommendation_accepted', { lead_id_present: true }) } catch { /* ignore */ }
    setMode('city')
  }

  const handleCitySubmit = async () => {
    if (!city) { setError('Моля, изберете град.'); return }
    setSubmittingYes(true)
    setError('')
    try {
      const intakeBody: Record<string, string | string[]> = {}
      for (const [k, v] of Object.entries(intake)) {
        if (Array.isArray(v) ? v.length > 0 : !!v) intakeBody[k] = v
      }
      await submitClinicRecommendationPreference(leadId, {
        wants_recommendations: true,
        city_slug: city,
        ...(district ? { district_slug: district } : {}),
        ...intakeBody,
      })
      try { trackPatientEvent('clinic_recommendation_city_submitted', { lead_id_present: true }) } catch { /* ignore */ }
      // Transitional state instead of letting the button revert to idle
      // while the destination page's own gate-check + data fetch runs —
      // same reasoning as the ResultUnlockGate → clinics navigation fix.
      setMode('navigating')
      router.push(`/results/${leadId}/clinics`)
    } catch {
      setError('Възникна грешка. Опитай отново.')
      setSubmittingYes(false)
    }
  }

  if (mode === 'navigating') {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-[1.75rem] bg-white/80 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.22)] p-8 text-center"
        data-testid="clinic-recommendation-navigating"
      >
        <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
        <p className="text-sm text-slate-600">Пренасочваме те към подходящите клиники…</p>
      </div>
    )
  }

  if (mode === 'ask') {
    return (
      <div
        className="relative rounded-[1.75rem] bg-white/80 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] p-7 sm:p-9"
        data-testid="clinic-recommendation-ask"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 ring-1 ring-teal-100 text-[11px] uppercase tracking-[0.16em] text-teal-700 font-semibold px-3 py-1">
          <Compass className="w-3 h-3" />
          Следваща стъпка
        </span>
        <h2 className="mt-4 font-serif text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">
          Искаш ли Zubite да ти препоръча доверени партньорски клиники?
        </h2>
        <p className="mt-3 text-slate-600 text-[15px] leading-relaxed">
          Ако да, ще те питаме само за града ти — препоръките са безплатни и без ангажимент.
        </p>

        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-[13px] text-rose-700" data-testid="clinic-recommendation-error">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleYes}
            disabled={submittingNo}
            className="relative flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-white font-semibold shadow-[0_14px_30px_-12px_rgba(13,148,136,0.55)] hover:-translate-y-0.5 transition-transform disabled:opacity-50"
            style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
            data-testid="clinic-recommendation-yes"
          >
            Да, покажи ми клиники <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNo}
            disabled={submittingNo}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-white ring-1 ring-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
            data-testid="clinic-recommendation-no"
          >
            {submittingNo ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Не сега
          </button>
        </div>
      </div>
    )
  }

  // mode === 'city'
  return (
    <div
      className="relative rounded-[1.75rem] bg-white/80 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] p-7 sm:p-9"
      data-testid="clinic-recommendation-city"
    >
      <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">
        Къде търсиш консултация?
      </h2>
      <p className="mt-2 text-slate-600 text-[14px] leading-relaxed">
        Използваме града, за да покажем релевантни клиники близо до теб.
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Избери град</span>
          <span className="text-[11px] text-slate-400">Задължително</span>
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CITIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => { setCity(c.value); setDistrict(''); setError('') }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium ring-1 transition ${
                city === c.value ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
              }`}
              data-testid={`clinic-recommendation-city-${c.value}`}
              aria-pressed={city === c.value}
            >
              <MapPin className="w-3.5 h-3.5" />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {city === 'sofia' && (
        <div className="mt-5" data-testid="clinic-recommendation-district-block">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">В кой квартал?</span>
            <span className="text-[11px] text-slate-400">По избор</span>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SOFIA_DISTRICTS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDistrict((prev) => (prev === d.value ? '' : d.value))}
                className={`rounded-xl px-3 py-2 text-[12.5px] font-medium ring-1 transition ${
                  district === d.value ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                }`}
                data-testid={`clinic-recommendation-district-${d.value}`}
                aria-pressed={district === d.value}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4" data-testid="clinic-recommendation-intake-block">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">По избор — помогни на клиниката да се подготви</p>
        {INTAKE_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-[13px] text-slate-700 font-medium">{f.label}</label>
            {f.hint && <p className="text-[11px] text-slate-400 mt-0.5">{f.hint}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {f.options.map((o) => {
                const cur = intake[f.key]
                const selected = f.multi ? Array.isArray(cur) && cur.includes(o.value) : cur === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() =>
                      setIntake((prev) => {
                        if (!f.multi) {
                          return { ...prev, [f.key]: prev[f.key] === o.value ? '' : o.value }
                        }
                        const list = Array.isArray(prev[f.key]) ? [...(prev[f.key] as string[])] : []
                        if (o.value === 'none') {
                          return { ...prev, [f.key]: list.includes('none') ? [] : ['none'] }
                        }
                        const next = list.filter((v) => v !== 'none')
                        return {
                          ...prev,
                          [f.key]: next.includes(o.value) ? next.filter((v) => v !== o.value) : [...next, o.value],
                        }
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ring-1 transition ${
                      selected ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                    }`}
                    data-testid={`clinic-recommendation-intake-${f.key}-${o.value}`}
                    aria-pressed={selected}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-[13px] text-rose-700" data-testid="clinic-recommendation-error">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleCitySubmit}
        disabled={submittingYes}
        className="relative w-full mt-6 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-white font-semibold shadow-[0_14px_30px_-12px_rgba(13,148,136,0.55)] hover:-translate-y-0.5 transition-transform disabled:opacity-50"
        style={{ backgroundImage: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)' }}
        data-testid="clinic-recommendation-city-submit"
      >
        {submittingYes ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {submittingYes ? 'Изпращаме…' : 'Покажи ми подходящи клиники'}
        {!submittingYes && <ArrowRight className="w-4 h-4" />}
      </button>

      <p className="mt-4 text-center text-[11px] text-slate-500 leading-relaxed">
        <ShieldCheck className="w-3 h-3 inline -mt-0.5 mr-1 text-teal-600" />
        Няма да получаваш диагноза онлайн.
      </p>
    </div>
  )
}
