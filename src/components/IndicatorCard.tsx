import type { Indicator } from '@/lib/types'
import { LABELS } from '@/constants/labels'
import { zoneThresholds } from '@/constants/zones'
import StatusBadge from './StatusBadge'
import IndicatorChart from './IndicatorChart'
import styles from './IndicatorCard.module.css'

export default function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const L = LABELS[indicator.key]
  const { value, zone, error } = indicator
  const color = zone?.color ?? '#e2e8f0'

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h3 className={styles.title}>
          {L.ko}
          <span className={styles.en}> · {L.en}</span>
        </h3>
        <StatusBadge zone={zone} />
      </header>

      <div className={styles.valueRow}>
        <span className={styles.value} style={{ color }}>
          {value != null ? `${value.toFixed(L.decimals)}${L.unit}` : '—'}
        </span>
        <span className={styles.asOf}>
          {error ? '일시적으로 불러올 수 없음 · Temporarily unavailable' : indicator.asOf}
        </span>
      </div>

      <p className={styles.blurb}>
        {L.blurbKo}
        <span className={styles.blurbEn}>{L.blurbEn}</span>
      </p>

      <div className={styles.chart}>
        <IndicatorChart
          data={indicator.history}
          color={color}
          thresholds={zoneThresholds(indicator.key)}
          unit={L.unit}
          decimals={L.decimals}
        />
      </div>

      <footer className={styles.src}>출처 · Source: {L.source}</footer>
    </section>
  )
}
