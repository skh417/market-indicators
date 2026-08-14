'use client'

import { useState, type ReactNode } from 'react'
import styles from './MarketTabs.module.css'

type TabKey = 'all' | 'US' | 'KR'

const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['all', '전체'],
  ['US', '미국'],
  ['KR', '한국'],
]

// 서버 렌더된 지표 카드를 미국/한국 그룹으로 받아 탭으로 노출을 전환한다
export default function MarketTabs({ us, kr }: { us: ReactNode; kr: ReactNode }) {
  const [tab, setTab] = useState<TabKey>('all')
  return (
    <>
      <div className={styles.tabs} aria-label="시장 선택 · Market">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={key === tab} onClick={() => setTab(key)} className={key === tab ? `${styles.tab} ${styles.tabActive}` : styles.tab}>
            {label}
          </button>
        ))}
      </div>
      <div className={styles.panes}>
        {tab !== 'KR' && us}
        {tab !== 'US' && kr}
      </div>
    </>
  )
}
