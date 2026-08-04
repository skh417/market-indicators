'use client'

import { useMemo, useState } from 'react'
import type { EventKind, EventMarket, EventStatus, MarketEvent } from '@/lib/types'
import styles from './CalendarEvents.module.css'

type WindowKey = 'week' | 'nextWeek' | 'month'

const DAY = 86_400_000
const statusLabel: Record<EventStatus, string> = { confirmed: '확정 · Confirmed', estimated: '추정 · Estimated', released: '발표 완료 · Released' }
const marketLabel: Record<EventMarket, string> = { US: '미국 · US', KR: '한국 · KR' }

function dayStart(value: number) {
  const d = new Date(value)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value))
}

function TabGroup<T extends string>({ value, onChange, options }: { value: T; onChange: (next: T) => void; options: ReadonlyArray<readonly [T, string]> }) {
  return (
    <>
      {options.map(([key, label]) => (
        <button key={key} type="button" aria-pressed={key === value} onClick={() => onChange(key)} className={key === value ? `${styles.tab} ${styles.tabActive}` : styles.tab}>
          {label}
        </button>
      ))}
    </>
  )
}

function Dday({ diff }: { diff: number }) {
  if (diff === 0) return <span className={`${styles.pill} ${styles.ddayToday}`}>오늘 · Today</span>
  if (diff === 1) return <span className={`${styles.pill} ${styles.ddayTomorrow}`}>내일 · D-1</span>
  return <span className={styles.ddaySoon}>D-{diff}</span>
}

const statusClass: Record<EventStatus, string> = { confirmed: styles.stConfirmed, estimated: styles.stEstimated, released: styles.stReleased }

export default function CalendarEvents({ events, now }: { events: MarketEvent[]; now: number }) {
  const [win, setWin] = useState<WindowKey>('week')
  const [mkt, setMkt] = useState<'all' | EventMarket>('all')
  const [kind, setKind] = useState<'all' | EventKind>('all')

  const groups = useMemo(() => {
    const start = dayStart(now)
    const range = win === 'week' ? [start, start + 7 * DAY] : win === 'nextWeek' ? [start + 7 * DAY, start + 14 * DAY] : [start, start + 30 * DAY]
    const byDay = new Map<string, MarketEvent[]>()
    for (const event of events) {
      const t = Date.parse(event.scheduledAt)
      if (t < range[0] || t >= range[1]) continue
      if (mkt !== 'all' && event.market !== mkt) continue
      if (kind !== 'all' && event.kind !== kind) continue
      const day = event.scheduledAt.slice(0, 10)
      byDay.set(day, [...(byDay.get(day) ?? []), event])
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, dayEvents]) => ({ day, diff: Math.round((Date.parse(day) - start) / DAY), events: dayEvents }))
  }, [events, kind, mkt, now, win])

  return (
    <>
      <div className={styles.tabs}>
        <TabGroup value={win} onChange={setWin} options={[['week', '이번 주'], ['nextWeek', '다음 주'], ['month', '다음 30일']]} />
        <span className={styles.divider} aria-hidden />
        <TabGroup value={mkt} onChange={setMkt} options={[['all', '전체'], ['US', '미국'], ['KR', '한국']]} />
        <span className={styles.divider} aria-hidden />
        <TabGroup value={kind} onChange={setKind} options={[['all', '전체'], ['macro', '거시'], ['earnings', '실적']]} />
      </div>
      {groups.length ? (
        <div className={styles.list}>
          {groups.map((group) => (
            <section key={group.day} className={styles.group}>
              <header className={styles.groupHead}>
                <h2 className={styles.dayLabel}>
                  <time dateTime={group.day}>{formatDate(group.day)}</time>
                </h2>
                <Dday diff={group.diff} />
              </header>
              {group.events.map((event) => (
                <article key={event.id} className={styles.row}>
                  <span className={styles.marketPill}>{marketLabel[event.market]}</span>
                  <div className={styles.body}>
                    <div className={styles.title}>{event.title}</div>
                    {(event.actual || event.previous) && <div className={styles.vals}>{[event.actual, event.previous].filter(Boolean).join(' · ')}</div>}
                  </div>
                  <div className={styles.statusCol}>
                    <span className={`${styles.pill} ${statusClass[event.status]}`}>{statusLabel[event.status]}</span>
                    <a href={event.sourceUrl} target="_blank" rel="noreferrer" className={styles.sourceLink}>원문 · Source</a>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyKo}>선택한 기간과 필터에 맞는 이벤트가 없습니다.</p>
          <p className={styles.emptyEn}>No events match the selected window and filters.</p>
        </div>
      )}
    </>
  )
}
