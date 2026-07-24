'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Globe2,
  LayoutDashboard,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Video,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

const CLINIC_SIZES = [
  { value: 'solo', label: '1 лекар', detail: 'Индивидуална практика' },
  { value: 'small', label: '2–4 лекари', detail: 'Малък екип' },
  { value: 'medium', label: '5–9 лекари', detail: 'Развита клиника' },
  { value: 'large', label: '10+ лекари', detail: 'Голям екип' },
] as const

const SERVICES = [
  { value: 'general_dentistry', label: 'Обща стоматология' },
  { value: 'orthodontics', label: 'Ортодонтия' },
  { value: 'implants', label: 'Имплантология' },
  { value: 'cosmetic_dentistry', label: 'Естетична стоматология' },
  { value: 'pediatric_dentistry', label: 'Детска стоматология' },
  { value: 'oral_surgery', label: 'Орална хирургия' },
  { value: 'periodontology', label: 'Пародонтология' },
  { value: 'endodontics', label: 'Ендодонтия' },
] as const

const GOALS = [
  { value: 'qualified_consultations', label: 'Повече подходящи запитвания и консултации' },
  { value: 'trusted_profile', label: 'По-пълен и надежден публичен профил' },
  { value: 'patient_communication', label: 'По-добра комуникация с пациентите' },
  { value: 'market_insight', label: 'Данни за интереса и поведението на пациентите' },
  { value: 'exploring', label: 'Проучваме възможностите за партньорство' },
] as const

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

function PartnerInterestForm() {
  const [status, setStatus] = useState<FormStatus>('idle')
  const [services, setServices] = useState<string[]>([])
  const [form, setForm] = useState({
    clinic_name: '',
    city: '',
    clinic_size: '',
    partnership_goal: '',
    partnership_motivation: '',
    website: '',
    contact_name: '',
    phone: '',
    email: '',
    contact_consent: false,
  })

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const toggleService = (value: string) => {
    setServices((current) =>
      current.includes(value)
        ? current.filter((service) => service !== value)
        : [...current, value],
    )
  }

  const canSubmit =
    form.clinic_name.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
    Boolean(form.clinic_size) &&
    services.length > 0 &&
    Boolean(form.partnership_goal) &&
    form.partnership_motivation.trim().length >= 20 &&
    form.contact_name.trim().length >= 2 &&
    form.phone.trim().length >= 5 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.contact_consent

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    setStatus('loading')
    try {
      const treatmentLabels = services.map(
        (value) => SERVICES.find((service) => service.value === value)?.label || value,
      )
      const response = await fetch(`${API_URL}/api/clinic-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_name: form.clinic_name.trim(),
          city: form.city.trim(),
          address: null,
          website: form.website.trim() || null,
          contact_name: form.contact_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          package_interest: 'unsure',
          clinic_size: form.clinic_size,
          partnership_goal: form.partnership_goal,
          partnership_motivation: form.partnership_motivation.trim(),
          contact_consent: true,
          source: 'public_partner_interest',
          treatments_supported: treatmentLabels,
          offers_implants: services.includes('implants'),
          treats_children: services.includes('pediatric_dentistry'),
        }),
      })

      setStatus(response.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        className="flex min-h-[540px] flex-col items-center justify-center px-6 py-16 text-center sm:px-12"
        data-testid="partner-interest-success"
      >
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[#D0FAE5] text-[#007956]">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 className="mt-7 max-w-lg text-balance text-3xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-4xl">
          Получихме информацията.
        </h2>
        <p className="mt-4 max-w-lg text-pretty text-base leading-7 text-[#525252]">
          Ще прегледаме профила на клиниката и ще се свържем с вас, за да обсъдим дали и как партньорството има смисъл и за двете страни.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#E5E5E5] bg-white px-5 text-sm font-bold text-[#0A0A0A] outline-none transition-colors hover:border-[#007956] focus-visible:ring-2 focus-visible:ring-[#007956] focus-visible:ring-offset-2"
        >
          Към Zubite.bg
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    )
  }

  const inputClass =
    'mt-2 min-h-12 w-full rounded-[9px] border border-[#D4D4D4] bg-white px-3.5 text-[15px] text-[#0A0A0A] outline-none transition-[border-color,box-shadow] placeholder:text-[#6B6B6B] focus:border-[#007956] focus:ring-2 focus:ring-[#D0FAE5]'
  const labelClass = 'block text-sm font-bold text-[#171717]'

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-8 lg:p-10" data-testid="partner-interest-form">
      <div className="flex flex-col gap-3 border-b border-[#E5E5E5] pb-7 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#007956]">Кратка форма за партньорство</p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-[-0.035em] text-[#0A0A0A] sm:text-4xl">
            Разкажете ни за клиниката
          </h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#F5F4F2] px-3 py-2 text-xs font-bold text-[#525252]">
          <Clock3 className="h-4 w-4 text-[#007956]" aria-hidden="true" />
          около 3 минути
        </span>
      </div>

      <div className="space-y-8 pt-8">
        <fieldset>
          <legend className="text-base font-bold text-[#0A0A0A]">Основна информация</legend>
          <p className="mt-1 text-sm leading-6 text-[#525252]">Достатъчно е да знаем коя е клиниката и къде работи.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Име на клиниката
              <input
                required
                minLength={2}
                value={form.clinic_name}
                onChange={(event) => update('clinic_name', event.target.value)}
                className={inputClass}
                placeholder="Дентална клиника…"
                data-testid="partner-clinic-name"
              />
            </label>
            <label className={labelClass}>
              Град
              <span className="relative mt-2 block">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" aria-hidden="true" />
                <input
                  required
                  minLength={2}
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                  className={`${inputClass} mt-0 pl-10`}
                  placeholder="София"
                  data-testid="partner-city"
                />
              </span>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Уебсайт <span className="font-normal text-[#6B6B6B]">(по избор)</span>
              <input
                type="url"
                value={form.website}
                onChange={(event) => update('website', event.target.value)}
                className={inputClass}
                placeholder="https://…"
                data-testid="partner-website"
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold text-[#0A0A0A]">Колко голям е екипът?</legend>
          <p className="mt-1 text-sm leading-6 text-[#525252]">Броят лекари ни помага да разберем капацитета и подходящия начин на работа.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CLINIC_SIZES.map((size) => {
              const checked = form.clinic_size === size.value
              return (
                <label
                  key={size.value}
                  className={
                    'cursor-pointer rounded-xl border p-3 transition-colors ' +
                    (checked
                      ? 'border-[#007956] bg-[#EAF8F2]'
                      : 'border-[#E5E5E5] bg-white hover:border-[#A3A3A3]')
                  }
                >
                  <input
                    type="radio"
                    name="clinic-size"
                    value={size.value}
                    checked={checked}
                    onChange={(event) => update('clinic_size', event.target.value)}
                    className="sr-only"
                    data-testid={`partner-size-${size.value}`}
                  />
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#0A0A0A]">{size.label}</span>
                    <span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? 'border-[#007956] bg-[#007956] text-white' : 'border-[#D4D4D4]'}`}>
                      {checked && <Check className="h-3 w-3" aria-hidden="true" />}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#6B6B6B]">{size.detail}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold text-[#0A0A0A]">Какво предлагате?</legend>
          <p className="mt-1 text-sm leading-6 text-[#525252]">Изберете всички основни направления. Детайлите ще уточним по-късно.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SERVICES.map((service) => {
              const checked = services.includes(service.value)
              return (
                <label
                  key={service.value}
                  className={
                    'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ' +
                    (checked
                      ? 'border-[#007956] bg-[#D0FAE5] text-[#075D45]'
                      : 'border-[#D4D4D4] bg-white text-[#454545] hover:border-[#007956]')
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleService(service.value)}
                    className="sr-only"
                    data-testid={`partner-service-${service.value}`}
                  />
                  <span className={`grid h-4 w-4 place-items-center rounded-full border ${checked ? 'border-[#007956] bg-[#007956] text-white' : 'border-[#A3A3A3]'}`}>
                    {checked && <Check className="h-2.5 w-2.5" aria-hidden="true" />}
                  </span>
                  {service.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold text-[#0A0A0A]">Какво искате да постигнете със Zubite?</legend>
          <p className="mt-1 text-sm leading-6 text-[#525252]">Тук няма „правилен“ отговор — търсим реално съвпадение на очакванията.</p>
          <div className="mt-5 space-y-5">
            <label className={labelClass}>
              Основна цел
              <select
                required
                value={form.partnership_goal}
                onChange={(event) => update('partnership_goal', event.target.value)}
                className={`${inputClass} appearance-none`}
                data-testid="partner-goal"
              >
                <option value="">Изберете най-близкия отговор</option>
                {GOALS.map((goal) => (
                  <option key={goal.value} value={goal.value}>{goal.label}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Защо партньорството е интересно за вас?
              <textarea
                required
                minLength={20}
                maxLength={1000}
                rows={4}
                value={form.partnership_motivation}
                onChange={(event) => update('partnership_motivation', event.target.value)}
                className={`${inputClass} min-h-28 resize-y py-3`}
                placeholder="Разкажете ни накратко какви пациенти искате да достигнете, какво бихте подобрили или как изглежда доброто партньорство за вас."
                data-testid="partner-motivation"
              />
              <span className="mt-1.5 block text-right text-xs font-normal text-[#6B6B6B]">
                {form.partnership_motivation.length}/1000
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold text-[#0A0A0A]">С кого да се свържем?</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Име и роля
              <input
                required
                minLength={2}
                value={form.contact_name}
                onChange={(event) => update('contact_name', event.target.value)}
                className={inputClass}
                placeholder="Д-р Иванова, управител"
                data-testid="partner-contact-name"
              />
            </label>
            <label className={labelClass}>
              Телефон
              <input
                type="tel"
                required
                minLength={5}
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                className={inputClass}
                placeholder="+359…"
                data-testid="partner-phone"
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Служебен имейл
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                className={inputClass}
                placeholder="clinic@example.bg"
                data-testid="partner-email"
              />
            </label>
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#F5F4F2] p-4 text-sm leading-6 text-[#525252]">
          <input
            type="checkbox"
            checked={form.contact_consent}
            onChange={(event) => update('contact_consent', event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#007956]"
            data-testid="partner-consent"
          />
          <span>
            Съгласявам се Zubite.bg да използва тези данни, за да разгледа запитването и да се свърже с мен относно партньорството. Вижте{' '}
            <Link href="/privacy" className="font-bold text-[#007956] underline decoration-[#A7DCCB] underline-offset-2">
              политиката за поверителност
            </Link>.
          </span>
        </label>

        {status === 'error' && (
          <div className="rounded-xl border border-[#F4B4B4] bg-[#FFF1F1] px-4 py-3 text-sm text-[#8A1C1C]" role="alert">
            Формата не беше изпратена. Проверете полетата и опитайте отново.
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || status === 'loading'}
          className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-6 text-[15px] font-bold text-[#0A0A0A] outline-none transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#F06400] focus-visible:ring-2 focus-visible:ring-[#007956] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          data-testid="partner-submit"
        >
          {status === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          {status === 'loading' ? 'Изпращаме…' : 'Изпрати запитването'}
          {status !== 'loading' && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
        </button>
        <p className="text-center text-xs leading-5 text-[#6B6B6B]">
          Изпращането не ви обвързва с договор или платен план.
        </p>
      </div>
    </form>
  )
}

export function ForClinicsLanding() {
  return (
    <main className="overflow-x-clip bg-[#F5F4F2] text-[#0A0A0A]">
      <Header />

      <section className="relative mx-auto grid min-h-[690px] max-w-[1280px] items-center gap-12 px-5 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:pb-28 lg:pt-24" data-testid="clinics-hero">
        <div className="max-w-3xl">
          <div className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#D0FAE5] px-3 text-sm font-bold text-[#075D45]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Партньорство с независима платформа
          </div>
          <h1 className="mt-7 max-w-[760px] text-balance text-[clamp(3rem,5.25vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.04em]">
            Подготвени пациенти.{' '}
            <span className="font-serif font-normal italic tracking-[-0.035em] text-[#007956]">Ясен</span>{' '}
            първи разговор.
          </h1>
          <p className="mt-7 max-w-[680px] text-pretty text-lg leading-8 text-[#454545]">
            Zubite подготвя пациента преди избора и дава на клиниката цялата среда след контакта — отличим профил, квалифицирани запитвания, пациентско табло, онлайн консултации и свързан календар.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="#partnership-form"
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-6 text-sm font-bold text-[#0A0A0A] outline-none transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#F06400] focus-visible:ring-2 focus-visible:ring-[#007956] focus-visible:ring-offset-2"
            >
              Разкажете ни за клиниката
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex min-h-[54px] items-center justify-center rounded-xl border border-[#D4D4D4] bg-white px-6 text-sm font-bold text-[#171717] outline-none transition-colors hover:border-[#007956] focus-visible:ring-2 focus-visible:ring-[#007956]"
            >
              Как работи партньорството
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#525252]">
            {['Без платено класиране', 'Ясни критерии', 'Без договор при запитване'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-[#007956]" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[#FF6B00]/15 blur-2xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[18px] bg-[#073B36] p-6 text-white sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-6">
              <div>
                <p className="text-sm font-bold text-[#7FE5C5]">Контекст преди контакта</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] !text-white">Какво вижда партньорът</h2>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#00D294] text-[#073B36]">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-2">
              {[
                {
                  icon: Stethoscope,
                  label: 'Причина за търсене',
                  value: 'Какво притеснява пациента и от кога',
                },
                {
                  icon: Users,
                  label: 'Подходящ тип специалист',
                  value: 'Посока според отговорите, не онлайн диагноза',
                },
                {
                  icon: MessageSquareText,
                  label: 'Предпочитана следваща стъпка',
                  value: 'Посещение, обратно обаждане или разговор',
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-4 border-b border-white/15 py-5 last:border-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#7FE5C5]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#CFE9E2]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-white/[0.08] px-4 py-3 text-xs leading-5 text-[#CFE9E2]">
              Пациентът сам избира дали да се свърже. Zubite не продава „първо място“ и не представя партньорството като медицинска препоръка.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E5E5E5] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col divide-y divide-[#E5E5E5] px-5 sm:px-6 lg:flex-row lg:divide-x lg:divide-y-0">
          {[
            ['01', 'Пациентът идва с повече яснота'],
            ['02', 'Клиниката получава релевантен контекст'],
            ['03', 'Резултатът се измерва прозрачно'],
          ].map(([number, text]) => (
            <div key={number} className="flex flex-1 items-center gap-4 py-5 lg:px-7 lg:first:pl-0">
              <span className="font-mono text-xs font-bold text-[#B84900]">{number}</span>
              <p className="text-sm font-bold text-[#171717]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1280px] px-5 py-24 sm:px-6 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <div className="max-w-xl">
            <p className="text-sm font-bold text-[#007956]">Практично партньорство</p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              Zubite не е просто още един каталог.
            </h2>
            <p className="mt-6 text-pretty text-base leading-7 text-[#525252]">
              Профилът е само началото. Целта е пациентът да разбере защо дадена клиника е релевантна за неговия случай и какво реално ще се случи след контакта.
            </p>
          </div>

          <div className="divide-y divide-[#D4D4D4] border-y border-[#D4D4D4]">
            {[
              {
                icon: Building2,
                title: 'Профил, който обяснява',
                text: 'Услуги, екип, подход, време за отговор и как протича първата консултация — ясно и без рекламни суперлативи.',
              },
              {
                icon: Users,
                title: 'Пациенти с контекст',
                text: 'Когато човек поиска контакт, клиниката разбира темата и намерението му, без Zubite да поставя диагноза.',
              },
              {
                icon: ShieldCheck,
                title: 'Доверие, което може да се провери',
                text: 'Показваме потвърдена информация и прозрачни критерии. Партньорският статус не е медицински рейтинг.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="grid gap-4 py-7 sm:grid-cols-[52px_1fr] sm:gap-5">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#D0FAE5] text-[#007956]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.025em] text-[#0A0A0A]">{title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#525252]">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="partner-benefits" className="bg-[#073B36] text-white">
        <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-6 lg:py-32">
          <div className="grid gap-8 border-b border-white/15 pb-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-sm font-bold text-[#7FE5C5]">Едно партньорство, целият пациентски път</p>
              <h2 className="mt-3 max-w-2xl text-balance text-4xl font-bold tracking-[-0.04em] !text-white sm:text-5xl">
                Повече от видимост. Система за реални консултации.
              </h2>
            </div>
            <p className="max-w-2xl text-pretty text-base leading-8 text-[#CFE9E2]">
              Много канали приключват с реклама или изпратен контакт. Zubite свързва подготовката на пациента, представянето на клиниката и ежедневната работа на екипа в един последователен процес.
            </p>
          </div>

          <div className="grid gap-12 pt-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-2xl font-bold tracking-[-0.03em] !text-white">Преди пациента да се свърже</h3>
                <span className="rounded-full bg-[#D0FAE5] px-3 py-1.5 text-xs font-bold text-[#075D45]">Откриване и доверие</span>
              </div>
              <div className="mt-6 divide-y divide-white/15 border-y border-white/15">
                {[
                  {
                    icon: Users,
                    title: 'По-подготвени и квалифицирани пациенти',
                    text: 'Човекът вече има ориентир за проблема, подходящия тип специалист и възможната следваща стъпка.',
                  },
                  {
                    icon: Globe2,
                    title: 'Повече релевантна видимост',
                    text: 'Клиниката се показва там, където услугите, локацията и профилът ѝ отговарят на реалното търсене на пациента.',
                  },
                  {
                    icon: Building2,
                    title: 'Пълноценна публична страница',
                    text: 'Красив профил с услуги, екип, подход и ясни действия — достатъчно пълен, за да служи и като основно онлайн представяне на клиниката.',
                  },
                  {
                    icon: Megaphone,
                    title: 'Регулярно съдържание и промотиране',
                    text: 'Zubite включва партньорите в подходящи социални кампании и образователно съдържание, без клиниката да организира всичко сама.',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <article key={title} className="grid gap-4 py-6 sm:grid-cols-[44px_1fr]">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-[#7FE5C5]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h4 className="text-lg font-bold tracking-[-0.02em] !text-white">{title}</h4>
                      <p className="mt-1.5 text-sm leading-6 text-[#CFE9E2]">{text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div id="partner-workspace" className="rounded-[16px] bg-white p-6 text-[#0A0A0A] sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] pb-6">
                <div>
                  <p className="text-sm font-bold text-[#007956]">След първия контакт</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Работната среда е вече готова.</h3>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#D0FAE5] text-[#007956]">
                  <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              <div className="divide-y divide-[#E5E5E5]">
                {[
                  {
                    icon: LayoutDashboard,
                    title: 'Табло за управление на пациенти',
                    text: 'Запитванията, контактите, статусите и следващите действия остават подредени на едно място.',
                  },
                  {
                    icon: Video,
                    title: 'Онлайн консултации',
                    text: 'Екипът може да предлага и управлява дистанционни разговори директно през платформата.',
                  },
                  {
                    icon: CalendarDays,
                    title: 'Календар, който работи с вашия',
                    text: 'Графикът може да се свърже с използвания от клиниката календар, за да няма двойно въвеждане и пропуснати часове.',
                  },
                  {
                    icon: BarChart3,
                    title: 'Ясна картина на резултатите',
                    text: 'Виждате интереса, запитванията и реалните следващи стъпки — не само импресии и кликове.',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <article key={title} className="grid gap-4 py-5 sm:grid-cols-[40px_1fr]">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5F4F2] text-[#007956]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-[#0A0A0A]">{title}</h4>
                      <p className="mt-1 text-sm leading-6 text-[#525252]">{text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-3 border-t border-white/15 pt-8 text-sm font-bold sm:grid-cols-4">
            {[
              'Пациентът разбира',
              'Клиниката е открита',
              'Контактът се управлява',
              'Резултатът се измерва',
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-3 text-[#CFE9E2]">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#00D294] text-xs font-bold text-[#073B36]">
                  {index + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#FF6B00]">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:py-20">
          <div className="max-w-3xl">
            <h2 className="text-balance text-3xl font-bold tracking-[-0.04em] text-[#0A0A0A] sm:text-4xl">
              Подходящо е, ако искате устойчив пациентски канал — не просто повече кликове.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#42200B]">
              Търсим клиники, които отговарят ясно, поддържат точна информация и виждат стойност в по-информирания първи разговор.
            </p>
          </div>
          <Link
            href="#partnership-form"
            className="inline-flex min-h-[54px] w-fit items-center gap-2 rounded-xl bg-[#0A0A0A] px-6 text-sm font-bold text-white outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#FF6B00]"
          >
            Проверете дали си пасваме
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section id="partnership-form" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-6 lg:py-28">
        <div className="grid items-start gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
          <aside className="lg:sticky lg:top-28">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#D0FAE5] px-3 py-2 text-sm font-bold text-[#075D45]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Първо опознавателен разговор
            </span>
            <h2 className="mt-6 text-balance text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              Нека започнем с най-важното.
            </h2>
            <p className="mt-5 text-pretty text-base leading-7 text-[#525252]">
              Формата е кратка, но ни дава достатъчно контекст, за да не започваме разговора от нулата.
            </p>
            <ul className="mt-7 space-y-4 text-sm leading-6 text-[#454545]">
              {[
                'Размер и капацитет на екипа',
                'Основни услуги и направления',
                'Мотивация и очаквания от платформата',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#007956]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-8 rounded-xl border border-[#C9E5DB] bg-white p-4 text-sm leading-6 text-[#454545]">
              След формата екипът ни преглежда информацията и се свързва лично. Няма автоматично одобрение или публично публикуване.
            </p>
          </aside>

          <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_28px_70px_-50px_rgba(10,10,10,0.36)]">
            <PartnerInterestForm />
          </div>
        </div>
      </section>

      <section className="border-t border-[#E5E5E5] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-5 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-bold text-[#0A0A0A]">Имате въпрос преди да изпратите формата?</p>
            <p className="mt-1 text-sm text-[#525252]">Пишете ни и ще отговорим директно.</p>
          </div>
          <Link
            href="/contact"
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-xl border border-[#D4D4D4] px-5 text-sm font-bold text-[#171717] outline-none transition-colors hover:border-[#007956] focus-visible:ring-2 focus-visible:ring-[#007956]"
          >
            Свържете се с екипа
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
