import type { CSSProperties } from 'react'
import type { Zone } from '@/lib/types'

const pill: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  padding: 'var(--badge-pad)',
  border: 'var(--border-width) solid currentColor',
  borderRadius: 'var(--radius-pill)',
  fontSize: 'var(--fs-badge)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 'var(--lh-badge)',
  whiteSpace: 'nowrap',
  background: 'color-mix(in srgb, currentColor var(--badge-tint), transparent)',
}

export default function StatusBadge({ zone }: { zone: Zone | null }) {
  if (!zone) {
    return <span style={{ ...pill, color: 'var(--badge-na)' }}>데이터 없음 · N/A</span>
  }
  return (
    <span style={{ ...pill, color: zone.color }}>
      {zone.ko} · {zone.en}
    </span>
  )
}
