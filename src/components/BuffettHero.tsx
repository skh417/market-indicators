import type { Indicator } from '@/lib/types'
import { LABELS } from '@/constants/labels'
import { zoneThresholds } from '@/constants/zones'
import StatusBadge from './StatusBadge'
import IndicatorChart from './IndicatorChart'
import styles from './BuffettHero.module.css'

// 게이지 스케일: 50% ~ 250% (현재 ~218%를 담기 위해)
const GAUGE_MIN = 50
const GAUGE_MAX = 250
const gaugePos = (v: number) =>
  Math.max(0, Math.min(100, ((v - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100))

export default function BuffettHero({ indicator }: { indicator: Indicator }) {
  const L = LABELS.buffett
  const { value, zone, error } = indicator
  const color = zone?.color ?? '#f97316'

  return (
    <section className={styles.hero}>
      <div className={styles.left}>
        <p className={styles.eyebrow}>
          {L.ko} <span>· {L.en}</span>
        </p>

        <div className={styles.big} style={{ color }}>
          {value != null ? `${value.toFixed(L.decimals)}${L.unit}` : '—'}
        </div>

        <StatusBadge zone={zone} />

        <p className={styles.blurb}>
          {L.blurbKo}
          <span className={styles.blurbEn}>{L.blurbEn}</span>
        </p>

        <div className={styles.gauge} aria-hidden>
          <div className={styles.track} />
          {value != null && (
            <div className={styles.marker} style={{ left: `${gaugePos(value)}%` }} />
          )}
          <div className={styles.scale}>
            <span>{GAUGE_MIN}%</span>
            <span>150%</span>
            <span>{GAUGE_MAX}%+</span>
          </div>
        </div>

        <p className={styles.asOf}>
          {error ? '일시적으로 불러올 수 없음 · Temporarily unavailable' : indicator.asOf}
          {' · '}
          {L.source}
        </p>
      </div>

      <div className={styles.right}>
        <IndicatorChart
          data={indicator.history}
          color={color}
          thresholds={zoneThresholds('buffett')}
          unit="%"
          decimals={0}
          height={280}
        />
      </div>
    </section>
  )
}
