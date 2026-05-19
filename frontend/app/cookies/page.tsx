import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { LegalShell, LegalSection } from '@/components/static/LegalShell'

export const metadata: Metadata = {
  title: 'Политика за бисквитки | Zubite.bg',
  description: 'Научете какви бисквитки използва Zubite.bg и как да управлявате настройките си.',
  robots: 'noindex, follow',
}

interface CookieRow { name: string; purpose: string; expiry: string }

function CookieTable({ rows }: { rows: CookieRow[] }) {
  return (
    <div className="not-prose mt-3 overflow-x-auto rounded-xl ring-1 ring-slate-200/70 bg-white/70">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/70 bg-teal-50/50">
            <th className="text-left py-2.5 px-3 text-slate-700 font-medium">Име</th>
            <th className="text-left py-2.5 px-3 text-slate-700 font-medium">Цел</th>
            <th className="text-left py-2.5 px-3 text-slate-700 font-medium">Срок</th>
          </tr>
        </thead>
        <tbody className="text-slate-600">
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              <td className="py-2.5 px-3 font-mono text-[13px] text-slate-700">{row.name}</td>
              <td className="py-2.5 px-3">{row.purpose}</td>
              <td className="py-2.5 px-3 whitespace-nowrap">{row.expiry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CookiesPage() {
  const lastUpdated = new Date().toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main className="min-h-screen bg-[#FCFAF8] text-slate-900 overflow-x-hidden" data-testid="cookies-page">
      <Header />

      <LegalShell
        eyebrow="Бисквитки · Прозрачност"
        title={<>Политика за <span className="text-teal-600">бисквитки</span></>}
        lastUpdatedLabel={`Последна актуализация: ${lastUpdated}`}
        testId="cookies-article"
      >
        <LegalSection number={1} title="Какво са бисквитките?">
          <p>
            Бисквитките са малки текстови файлове, които се съхраняват на вашето устройство (компютър, таблет, телефон), когато посещавате уебсайт. Те позволяват на сайта да „запомни" вашите действия и предпочитания за определен период от време.
          </p>
        </LegalSection>

        <LegalSection number={2} title="Какви бисквитки използваме">
          <div className="not-prose space-y-5">
            <div className="rounded-2xl p-5 bg-white/55 ring-1 ring-slate-200/70">
              <h3 className="font-medium text-slate-900 mb-1">Строго необходими бисквитки</h3>
              <p className="text-slate-600 text-sm">
                Тези бисквитки са необходими за правилното функциониране на сайта. Не могат да бъдат изключени.
              </p>
              <CookieTable rows={[
                { name: 'cookie_consent', purpose: 'Запомня вашия избор за бисквитки', expiry: '1 година' },
                { name: 'session_id', purpose: 'Идентифицира вашата сесия', expiry: 'Сесия' },
              ]} />
            </div>

            <div className="rounded-2xl p-5 bg-white/55 ring-1 ring-slate-200/70">
              <h3 className="font-medium text-slate-900 mb-1">Аналитични бисквитки</h3>
              <p className="text-slate-600 text-sm">
                Помагат ни да разберем как посетителите използват сайта, за да го подобрим.
              </p>
              <CookieTable rows={[
                { name: '_ga', purpose: 'Google Analytics — идентификация', expiry: '2 години' },
                { name: '_gid', purpose: 'Google Analytics — сесия', expiry: '24 часа' },
              ]} />
            </div>

            <div className="rounded-2xl p-5 bg-white/55 ring-1 ring-slate-200/70">
              <h3 className="font-medium text-slate-900 mb-1">Маркетингови бисквитки</h3>
              <p className="text-slate-600 text-sm">
                Използват се за показване на релевантни реклами и измерване на ефективността им.
              </p>
              <CookieTable rows={[
                { name: '_fbp', purpose: 'Meta Pixel — рекламно проследяване', expiry: '3 месеца' },
                { name: '_gcl_au', purpose: 'Google Ads — конверсии', expiry: '3 месеца' },
              ]} />
            </div>
          </div>
        </LegalSection>

        <LegalSection number={3} title="Как да управлявате бисквитките">
          <p>Можете да контролирате и/или изтривате бисквитки по няколко начина:</p>
          <ul>
            <li><strong>Чрез нашия банер:</strong> При първото си посещение можете да изберете кои типове бисквитки да приемете.</li>
            <li><strong>Чрез браузъра:</strong> Повечето браузъри позволяват блокиране или изтриване на бисквитки чрез настройките.</li>
            <li><strong>Чрез настройките по-долу:</strong> Можете да промените предпочитанията си по всяко време.</li>
          </ul>
          <div className="not-prose mt-5 p-4 rounded-xl bg-teal-50/70 ring-1 ring-teal-100">
            <p className="text-teal-900 text-sm">
              <strong>Забележка:</strong> Деактивирането на определени бисквитки може да повлияе на функционалността на сайта.
            </p>
          </div>
        </LegalSection>

        <LegalSection number={4} title="Бисквитки от трети страни">
          <p>Използваме услуги от трети страни, които могат да поставят собствени бисквитки:</p>
          <ul>
            <li><strong>Google Analytics 4</strong> — за анализ на трафика (зарежда се само след съгласие за аналитични cookies)</li>
            <li><strong>Meta (Facebook) Pixel</strong> — за рекламни кампании</li>
            <li><strong>Google Ads</strong> — за измерване на конверсии</li>
          </ul>
          <p>Политиките за поверителност на тези услуги можете да намерите на техните уебсайтове.</p>
          <div className="not-prose mt-5 p-4 rounded-xl bg-teal-50/70 ring-1 ring-teal-100">
            <p className="text-teal-900 text-sm leading-relaxed">
              <strong>Google Consent Mode v2:</strong> Zubite.bg използва Google Consent Mode v2. При първо посещение по подразбиране аналитичните и маркетинговите cookies са <strong>отказани</strong>. Google Analytics ще получи данни за посещението <em>само</em> ако приемете аналитичните cookies от банера. Можете да откажете по всяко време, като продължите само с необходимите cookies.
            </p>
          </div>
        </LegalSection>

        <LegalSection number={5} title="Промени в политиката">
          <p>
            Можем да актуализираме тази политика периодично. При съществени промени ще покажем нов банер за съгласие.
          </p>
        </LegalSection>

        <LegalSection number={6} title="Контакт">
          <p>
            При въпроси относно бисквитките, свържете се с нас на:{' '}
            <a href="mailto:privacy@zubite.bg" className="text-teal-700 hover:underline">privacy@zubite.bg</a>
          </p>
        </LegalSection>
      </LegalShell>

      <Footer />
    </main>
  )
}
