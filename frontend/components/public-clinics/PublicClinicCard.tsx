'use client'

import Link from 'next/link'
import { ArrowRight, Check, MapPin, MessageCircle, Plus, Sparkles, Video } from 'lucide-react'
import { CLINIC_CONTACT_ACTION_COPY, cityDisplay, clinicProfileHref, treatmentLabel, type PublicClinic } from '@/lib/publicClinics'

interface Props {
  clinic: PublicClinic
  isInCompare: boolean
  onToggleCompare: () => void
  onRequestContact: () => void
  onRequestOnline: () => void
}

export default function PublicClinicCard({ clinic, isInCompare, onToggleCompare, onRequestContact, onRequestOnline }: Props) {
  const profileHref = clinicProfileHref(clinic)
  const treatments = clinic.treatments.slice(0, 2)

  return (
    <article className="taste-directory-card group flex min-h-[430px] flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white transition-transform duration-300 hover:-translate-y-1" data-testid={`public-clinic-card-${clinic.id}`} data-tier={clinic.partner_tier}>
      <div className="relative h-56 overflow-hidden bg-[#F0FDFA]">
        {clinic.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clinic.hero_image_url} alt={clinic.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="clinical-dots grid h-full w-full place-items-center"><Sparkles className="h-10 w-10 text-[#98D1CA]" /></div>
        )}
        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#006A61] shadow-sm backdrop-blur" data-testid={`card-tier-${clinic.id}`}>
          <Sparkles className="h-3.5 w-3.5" /> Zubite Standard
        </span>
        {clinic.chat_presence === 'online' && (
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-emerald-800" data-testid={`card-chat-presence-${clinic.id}`}>
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Онлайн сега
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap gap-2" data-testid={`card-feature-chips-${clinic.id}`}>
          {treatments.map((treatment) => <span key={treatment} className="rounded-md bg-[#EFEDEC] px-3 py-1 text-xs text-[#45464D]">{treatmentLabel(treatment)}</span>)}
          {(clinic.assessment_approaches || []).length > 0 && <span className="rounded-md border border-[#BFE8D5] bg-[#E9FBF2] px-3 py-1 text-xs text-[#006A4B]">Цялостна оценка</span>}
        </div>

        <h2 className="mt-5 font-display text-2xl font-semibold leading-tight text-black" data-testid={`card-name-${clinic.id}`}>
          <Link href={profileHref} className="hover:text-[#006A61]">{clinic.name}</Link>
        </h2>
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#45464D]"><MapPin className="h-4 w-4" />{clinic.city_name || cityDisplay(clinic.city_slug)}{clinic.area ? `, ${clinic.area}` : ''}</p>

        {(clinic.profile_information_reviewed || clinic.online_consultation) && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#64748B]">
            {clinic.profile_information_reviewed && <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-[#006A61]" />Профилът е прегледан</span>}
            {clinic.online_consultation && <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5 text-[#006A61]" />Онлайн консултация</span>}
          </div>
        )}

        <div className="mt-auto pt-6">
          <button type="button" onClick={onRequestContact} className="flex w-full items-center justify-between gap-3 rounded-lg bg-black px-5 py-3.5 text-white transition-colors hover:bg-[#1B1C1B]" data-testid={`card-request-contact-${clinic.id}`}>
            <span className="text-left">
              <strong className="block text-sm font-semibold">{CLINIC_CONTACT_ACTION_COPY.label}</strong>
              <small className="mt-0.5 block text-[11px] font-normal text-black/65">{CLINIC_CONTACT_ACTION_COPY.description}</small>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href={profileHref} className="flex min-h-11 items-center justify-center rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-xs font-semibold text-[#45464D] hover:border-[#006A61] hover:text-[#006A61]" data-testid={`card-view-profile-${clinic.id}`}>Виж профила</Link>
            <button type="button" onClick={onToggleCompare} className={`flex min-h-11 items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-xs font-semibold ${isInCompare ? 'border-[#6BD8CB] bg-[#F0FDFA] text-[#006A61]' : 'border-[#E2E8F0] text-[#45464D]'}`} data-testid={`card-toggle-compare-${clinic.id}`}>
              {isInCompare ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{isInCompare ? 'В сравнение' : 'Сравни'}
            </button>
          </div>
          {clinic.online_consultation && (
            <button type="button" onClick={onRequestOnline} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#F0FDFA] px-3 py-2.5 text-[#006A61]" data-testid={`card-request-online-${clinic.id}`}>
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-left"><strong className="block text-xs font-semibold">Заяви онлайн консултация</strong><small className="mt-0.5 block text-[10px] font-normal">Клиниката ще предложи възможни часове.</small></span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
