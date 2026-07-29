type Props = {
  value: number | null
  min: number
  max: number
  ticks?: string[]
}

export default function IndicatorGauge({ value, min, max, ticks }: Props) {
  const pos = value == null ? null : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const labels = ticks ?? [`${min}%`, `${Math.round((min + max) / 2)}%`, `${max}%+`]
  return (
    <div aria-hidden style={{ position: 'relative', marginTop: 'var(--space-4)' }}>
      <div style={{ position: 'relative', height: 'var(--gauge-track-h)', borderRadius: 'var(--radius-pill)', background: 'var(--gauge-track)' }} />
      {pos != null && (
        <div style={{ position: 'absolute', top: -4, left: `${pos}%`, width: 'var(--gauge-marker-w)', height: 'var(--gauge-marker-h)', borderRadius: 'var(--radius-marker)', background: 'var(--fg)', boxShadow: 'var(--ring-marker)', transform: 'translateX(-50%)' }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-6)', fontSize: 'var(--fs-scale)', color: 'var(--faint)', fontVariantNumeric: 'var(--numeric-metric)' }}>
        {labels.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  )
}
