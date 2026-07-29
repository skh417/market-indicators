import type { Indicator } from '@/lib/types'
import { LABELS } from '@/constants/labels'
import { zoneThresholds } from '@/constants/zones'
import StatusBadge from './StatusBadge'
import IndicatorChart from './IndicatorChart'

export default function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const L = LABELS[indicator.key]
  const { value, zone, error } = indicator
  const color = zone?.color ?? 'var(--value-neutral)'

  return (
    <section className="rowGrid" style={{ padding: 'var(--card-pad)', background: 'var(--surface-card)', border: 'var(--border-width) solid var(--border)', borderRadius: 'var(--radius-card)', minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-card)', minWidth: 0 }}>
        <header>
          <h3 style={{ fontSize: 'var(--fs-card-title)', fontWeight: 'var(--fw-bold)', color: 'var(--fg)', lineHeight: 'var(--lh-title)' }}>
            {L.ko}
            <span style={{ fontWeight: 'var(--fw-medium)', color: 'var(--muted)', fontSize: 'var(--fs-card-title-en)' }}> · {L.en}</span>
          </h3>
        </header>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-12)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--fs-card-value)', fontWeight: 'var(--fw-extrabold)', fontVariantNumeric: 'var(--numeric-metric)', letterSpacing: 'var(--ls-card-value)', color }}>
            {value != null ? `${value.toFixed(L.decimals)}${L.unit}` : '—'}
          </span>
          {(indicator.key === 'vix' || indicator.key === 'vkospi') && value != null && (
            // 16의 법칙: 연율화 변동성 ÷ 16(≈√252) ≒ 일일 기대 변동폭(%)
            <span style={{ fontSize: 'var(--fs-asof)', color: 'var(--faint)', fontVariantNumeric: 'var(--numeric-metric)' }}>
              ≈ 일일 ±{(value / 16).toFixed(2)}%
            </span>
          )}
          <span style={{ fontSize: 'var(--fs-asof)', color: 'var(--muted)' }}>
            {error ? '일시적으로 불러올 수 없음 · Temporarily unavailable' : indicator.asOf}
          </span>
        </div>

        <StatusBadge zone={zone} />

        <p style={{ fontSize: 'var(--fs-blurb)', lineHeight: 'var(--lh-blurb)', color: 'var(--muted)', maxWidth: 'var(--measure-blurb)' }}>
          {L.blurbKo}
          <span style={{ display: 'block', color: 'var(--faint)', fontSize: 'var(--fs-blurb-en)', marginTop: 'var(--space-2)' }}>{L.blurbEn}</span>
        </p>

        <footer style={{ fontSize: 'var(--fs-source)', color: 'var(--faint)', marginTop: 'auto' }}>출처 · Source: {L.source}</footer>
      </div>

      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>
        <IndicatorChart data={indicator.history} color={color} thresholds={zoneThresholds(indicator.key)} unit={L.unit} decimals={L.decimals} height={240} />
      </div>
    </section>
  )
}
