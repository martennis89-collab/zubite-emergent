import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, CircleAlert, Compass, ShieldCheck, Stethoscope } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Какво означава цялостна дентална оценка | Zubite.bg',
  description: 'Практичен ориентир за оценка на захапката, дишането, преглъщането, говора, стойката и лицевата асиметрия — без класации и преувеличени обещания.',
}

const dimensions = [
  ['Дишане', 'Дишане през устата, хъркане, неспокоен сън и усещане за запушен нос могат да са важен контекст.'],
  ['Преглъщане и навици', 'Позицията на езика, продължителната употреба на биберон или смученето на пръст могат да влияят на развитието.'],
  ['Говор и артикулация', 'Определени затруднения в произнасянето понякога заслужават координация с логопед.'],
  ['Стойка и мускулен баланс', 'Напрежение във врата, челюстта и лицето може да се разглежда като част от по-широката картина.'],
  ['Лицева асиметрия', 'Видима асиметрия или едностранно дъвчене може да насочи към допълнителна оценка.'],
  ['Зъби и захапка', 'Подреждането остава важно, но се разглежда заедно с функцията, растежа и ежедневните симптоми.'],
] as const

export default function FullPictureAssessmentPage() {
  return <div className="taste-site min-h-screen bg-[#F5F4F2]">
    <Header />
    <main>
      <section className="border-b border-[#E5E5E5] px-4 pb-16 pt-14 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid max-w-[1180px] items-end gap-10 lg:grid-cols-[1fr_360px]">
          <div><p className="taste-eyebrow">Решение, не класация</p><h1 className="mt-5 max-w-4xl text-[clamp(42px,7vw,82px)] font-bold leading-[.96] tracking-[-.06em]">Когато лекарят гледа <em className="font-serif font-normal text-[#007956]">цялата картина.</em></h1><p className="mt-7 max-w-2xl text-base leading-7 text-[#525252]">„Цялостен подход“ означава по-широк обхват на оценката — не „по-добър лекар“. За някои пациенти това е релевантно; за други стандартната дентална оценка е напълно достатъчна.</p></div>
          <aside className="rounded-2xl border border-[#E5E5E5] bg-white p-5"><ShieldCheck className="h-6 w-6 text-[#007956]" /><h2 className="mt-4 text-lg font-bold">Как Zubite го показва</h2><p className="mt-2 text-sm leading-6 text-[#6B6B6B]">Като атрибут „подход при оценката“, основан на информация от профила. Не променя клиничната компетентност и не е гаранция за резултат.</p></aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]"><div><p className="taste-eyebrow">Какво може да включва</p><h2 className="mt-4 text-4xl font-bold tracking-[-.05em]">Шест части на една оценка.</h2><p className="mt-4 text-sm leading-6 text-[#6B6B6B]">Не всяка клиника оценява всяка област и не всяка област е нужна за всеки случай.</p></div><div className="grid gap-3 sm:grid-cols-2">{dimensions.map(([title, copy], index) => <article key={title} className="rounded-2xl border border-[#E5E5E5] bg-white p-5"><span className="font-mono text-[10px] text-[#B84900]">0{index + 1}</span><h3 className="mt-3 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#6B6B6B]">{copy}</p></article>)}</div></div>
      </section>

      <section className="border-y border-[#E5E5E5] bg-white px-4 py-16 sm:py-20"><div className="mx-auto max-w-[980px]"><div className="grid gap-8 md:grid-cols-2"><div><Compass className="h-7 w-7 text-[#FF6B00]" /><h2 className="mt-4 text-3xl font-bold tracking-[-.04em]">Кога да потърсиш такъв подход?</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-[#525252]">{['Комбинация от проблем със захапката и дишане през устата','Хъркане, неспокоен сън или често отворена уста при дете','Затруднения с преглъщане или артикулация','Едностранно дъвчене, асиметрия или напрежение във врата и челюстта'].map((item) => <li key={item} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#007956]" />{item}</li>)}</ul></div><div className="rounded-2xl bg-[#F5F4F2] p-6"><CircleAlert className="h-6 w-6 text-[#B84900]" /><h2 className="mt-4 text-xl font-bold">Какво да попиташ на консултация</h2><ol className="mt-4 space-y-3 text-sm leading-6 text-[#525252]"><li>1. Кои функционални фактори са релевантни за моя случай?</li><li>2. Как ги оценявате и кога насочвате към УНГ, логопед или друг специалист?</li><li>3. Кое наблюдение е факт и кое е хипотеза, която трябва да се потвърди?</li><li>4. Как това променя — или не променя — плана за лечение?</li></ol></div></div></div></section>

      <section className="mx-auto max-w-[980px] px-4 py-16 text-center sm:py-24"><Stethoscope className="mx-auto h-8 w-8 text-[#007956]" /><h2 className="mt-5 text-4xl font-bold tracking-[-.05em]">Започни от симптомите, не от етикета.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#6B6B6B]">Краткият въпросник използва сигналите за дишане, говор, навици и напрежение като контекст. Ако има връзка с публикуван подход на клиника, ще я покажем като критерий за релевантност.</p><Link href="/quiz" className="taste-button taste-button-accent mt-7">Започни краткия тест <ArrowRight className="h-4 w-4" /></Link></section>
    </main>
    <Footer />
  </div>
}
