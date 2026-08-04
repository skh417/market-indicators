'use client'

import { useMemo, useState } from 'react'
import type { EventKind, EventMarket, MarketEvent } from '@/lib/types'

type WindowKey = 'week' | 'nextWeek' | 'month'
type Filter = 'all' | EventMarket | EventKind

const statusLabel = { confirmed: '확정', estimated: '추정', released: '발표 완료' } as const
const statusColor = { confirmed: 'var(--accent)', estimated: 'var(--zone-yellow)', released: 'var(--zone-teal)' } as const

function dayStart(value: number) {
  const d = new Date(value)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value))
}

export default function CalendarEvents({ events, now }: { events: MarketEvent[]; now: number }) {
  const [windowKey, setWindowKey] = useState<WindowKey>('week')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const start = dayStart(now)
    const day = 86_400_000
    const range = windowKey === 'week' ? [start, start + 7 * day] : windowKey === 'nextWeek' ? [start + 7 * day, start + 14 * day] : [start, start + 30 * day]
    return events.filter((event) => {
      const t = Date.parse(event.scheduledAt)
      const inRange = t >= range[0] && t < range[1]
      const matches = filter === 'all' || event.market === filter || event.kind === filter
      return inRange && matches
    })
  }, [events, filter, now, windowKey])

  const buttonStyle = (active: boolean) => ({
    font: 'inherit', cursor: 'pointer', padding: '5px 11px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-badge)',
    color: active ? 'var(--accent)' : 'var(--faint)', border: `var(--border-width) solid ${active ? 'currentColor' : 'var(--border)'}`,
    background: active ? 'color-mix(in srgb, currentColor var(--badge-tint), transparent)' : 'transparent',
  })

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        {([{ key: 'week', label: '이번 주' }, { key: 'nextWeek', label: '다음 주' }, { key: 'month', label: '다음 30일' }] as const).map((item) => (
          <button key={item.key} onClick={() => setWindowKey(item.key)} style={buttonStyle(windowKey === item.key)}>{item.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        {([{ key: 'all', label: '전체' }, { key: 'US', label: '미국' }, { key: 'KR', label: '한국' }, { key: 'macro', label: '거시' }, { key: 'earnings', label: '실적' }] as const).map((item) => (
          <button key={item.key} onClick={() => setFilter(item.key)} style={buttonStyle(filter === item.key)}>{item.label}</button>
        ))}
      </div>
      {filtered.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {filtered.map((event) => (
            <article key={event.id} style={{ padding: '16px', border: 'var(--border-width) solid var(--border)', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'minmax(100px, 0.35fr) minmax(0, 1fr) auto', gap: 'var(--space-12)', alignItems: 'center' }}>
              <time dateTime={event.scheduledAt} style={{ color: 'var(--muted)', fontSize: 'var(--fs-asof)', fontVariantNumeric: 'var(--numeric-metric)' }}>{formatDate(event.scheduledAt)}</time>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'var(--faint)', fontSize: 'var(--fs-source)', marginBottom: 'var(--space-3)' }}>{event.market === 'US' ? '미국' : '한국'} · {event.kind === 'macro' ? '거시 이벤트' : '기업 실적'}</div>
                <strong style={{ fontSize: 'var(--fs-blurb)' }}>{event.title}</strong>
                {(event.actual || event.previous) && <p style={{ color: 'var(--muted)', fontSize: 'var(--fs-source)', marginTop: 'var(--space-3)' }}>{[event.actual, event.previous].filter(Boolean).join(' · ')}</p>}
              </div>
              <a href={event.sourceUrl} target="_blank" rel="noreferrer" style={{ color: statusColor[event.status], fontSize: 'var(--fs-badge)', whiteSpace: 'nowrap' }}>{statusLabel[event.status]} · 원문 ↗</a>
            </article>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--faint)', fontSize: 'var(--fs-blurb)', padding: 'var(--space-12) 0' }}>선택한 기간과 필터에 맞는 이벤트가 없습니다.</p>
      )}
    </>
  )
}
