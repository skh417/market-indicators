import type { Zone } from '@/lib/types'
import styles from './StatusBadge.module.css'

export default function StatusBadge({ zone }: { zone: Zone | null }) {
  if (!zone) {
    return (
      <span className={styles.badge} style={{ color: '#94a3b8' }}>
        데이터 없음 · N/A
      </span>
    )
  }
  return (
    <span className={styles.badge} style={{ color: zone.color }}>
      {zone.ko} · {zone.en}
    </span>
  )
}
