import type { HomeTrustSignals as HomeTrustSignalsData } from '@/lib/homeTrust'

function formatCount(value: number): string {
  return String(Math.max(0, Math.trunc(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
}

export function HomeTrustSignals({
  signals,
  hideAutoUpdateNote = false,
}: {
  signals: HomeTrustSignalsData
  /** Ortho homepage opts out of the "Обновяват се автоматично" caption.
   *  Defaults to false so TasteHome.tsx renders exactly as before. */
  hideAutoUpdateNote?: boolean
}) {
  const metrics = [
    {
      value: signals.quiz_completions,
      label: 'завършени въпросника',
    },
    {
      value: signals.consultations_booked,
      label: 'записани консултации',
    },
    {
      value: signals.community_answers,
      label: 'публикувани отговора в общността',
    },
  ]

  return (
    <section
      id="home-live-proof"
      className="taste-live-proof"
      aria-label="Актуални данни от Zubite.bg"
      data-testid="home-trust-signals"
    >
      <div className="taste-shell taste-live-proof-inner">
        <div className="taste-live-proof-intro">
          <p><span aria-hidden /> Актуални данни от платформата</p>
          {!hideAutoUpdateNote && <small>Обновяват се автоматично</small>}
        </div>

        <dl className="taste-live-proof-metrics">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt className="sr-only">{metric.label}</dt>
              <dd>
                <strong>{formatCount(metric.value)}</strong>
                <span>{metric.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
