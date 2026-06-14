'use client'

import { useState } from 'react'
import {
  X, Scale, Phone, ShieldCheck, Video, Heart, Check,
} from 'lucide-react'
import {
  type PublicClinic, treatmentLabel,
} from '@/lib/publicClinics'

interface Props {
  clinics: PublicClinic[]              // currently selected (≤3)
  onRemove: (id: string) => void
  onClear: () => void
  onRequestContactAll: () => void
}

const MAX_COMPARE = 3

/**
 * Sticky compare tray + modal. Cap of 3 is enforced by the parent listing
 * page (toggle is no-op past 3). The tray itself just renders + lets the
 * user remove selections.
 */
export default function CompareTray({
  clinics,
  onRemove,
  onClear,
  onRequestContactAll,
}: Props) {
  const [open, setOpen] = useState(false)
  if (clinics.length === 0) return null

  return (
    <>
      {/* Sticky tray */}
      <div
        className="fixed bottom-4 inset-x-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-6 sm:w-auto z-30"
        data-testid="compare-tray"
      >
        <div className="rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-slate-200 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.30)] p-3 flex items-center gap-3">
          <Scale className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <div className="text-[13px] text-slate-800 min-w-0">
            <span className="font-medium">{clinics.length}/{MAX_COMPARE}</span>{' '}
            <span className="text-slate-500">избрани за сравнение</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={clinics.length < 2}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[12px] font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            data-testid="compare-open"
          >
            Сравни
          </button>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
            data-testid="compare-clear"
          >
            Изчисти
          </button>
        </div>
      </div>

      {/* Comparison modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          data-testid="compare-modal"
        >
          <div
            className="bg-white w-full sm:max-w-4xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                Сравнение на клиники
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                data-testid="compare-modal-close"
                aria-label="Затвори"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinics.map((c) => (
                <ClinicCompareColumn
                  key={c.id}
                  clinic={c}
                  onRemove={() => onRemove(c.id)}
                />
              ))}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onRequestContactAll()
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-medium hover:-translate-y-0.5 transition-all shadow-[0_14px_30px_-12px_rgba(13,148,136,0.50)]"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg,#14b8a6 0%,#0d9488 60%,#0f766e 100%)',
                }}
                data-testid="compare-contact-all"
              >
                <Phone className="w-4 h-4" />
                Заяви контакт от избраните
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 sm:flex-none px-5 py-3 rounded-full bg-white ring-1 ring-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ClinicCompareColumn({
  clinic: c,
  onRemove,
}: {
  clinic: PublicClinic
  onRemove: () => void
}) {
  return (
    <div
      className="rounded-xl ring-1 ring-slate-200 p-4 bg-slate-50/50"
      data-testid={`compare-column-${c.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-serif text-base font-semibold text-slate-900 leading-snug">
          {c.name}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Премахни"
          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
          data-testid={`compare-remove-${c.id}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {c.city_name || c.city_slug || '—'}
        {c.area && ` · ${c.area}`}
      </p>

      <CompareRow label="Партньорски статус">
        {c.partner_tier !== 'standard' ? c.public_status_label : '—'}
      </CompareRow>
      <CompareRow label="Направления">
        {c.treatments.length > 0
          ? c.treatments.map(treatmentLabel).join(', ')
          : '—'}
      </CompareRow>
      <CompareRow label="Подходяща за">
        {c.best_for.length > 0 ? c.best_for.join(' · ') : '—'}
      </CompareRow>
      <CompareRow
        label="Онлайн консултация"
        icon={c.online_consultation ? <Video className="w-3 h-3 text-teal-600" /> : null}
      >
        {c.online_consultation
          ? c.online_consultation_label || 'Налична'
          : 'Не е отбелязана'}
      </CompareRow>
      <CompareRow
        label="Care Pass"
        icon={c.care_pass_partner ? <Heart className="w-3 h-3 text-rose-500" /> : null}
      >
        {c.care_pass_partner ? 'Партньор' : '—'}
      </CompareRow>
      <CompareRow
        label="Профил прегледан"
        icon={
          c.profile_information_reviewed ? (
            <ShieldCheck className="w-3 h-3 text-teal-600" />
          ) : null
        }
      >
        {c.profile_information_reviewed ? 'Да' : '—'}
      </CompareRow>
      {c.review && (
        <CompareRow label="Отзиви">
          ★ {c.review.rating.toFixed(1)} · {c.review.count} ({c.review.source})
        </CompareRow>
      )}
    </div>
  )
}

function CompareRow({
  label,
  children,
  icon,
}: {
  label: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="text-[12px] text-slate-700 leading-snug border-t border-slate-200/70 py-1.5 first:border-t-0">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="inline-flex items-center gap-1">
        {icon}
        {children}
      </div>
    </div>
  )
}
