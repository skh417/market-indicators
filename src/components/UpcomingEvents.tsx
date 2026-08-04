import Link from 'next/link'
import { getUpcomingEvents } from '@/lib/calendar'
import type { MarketEvent } from '@/lib/types'

const statusLabel = { confirmed: '확정', estimated: '추정', released: '발표 완료' } as const

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value))
}

export default function UpcomingEvents({ events }: { events: MarketEvent[] }) {
  const upcoming = getUpcomingEvents(events)
  return (
    <section style={{ padding: 'var(--card-pad)', background: 'var(--surface-card)', border: 'var(--border-width) solid var(--border)', borderRadius: 'var(--radius-card)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-card)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-12)', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 'var(--fs-card-title)', fontWeight: 'var(--fw-bold)' }}>
            향후 7일 핵심 이벤트 <span style={{ color: 'var(--muted)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-card-title-en)' }}>· Market events</span>
          </h2>
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--faint)', fontSize: 'var(--fs-source)' }}>공식 일정과 주요 기업 실적 일정입니다. 투자 조언이 아닙니다.</p>
        </div>
        <Link href="/calendar" style={{ color: 'var(--accent)', fontSize: 'var(--fs-badge)', fontWeight: 'var(--fw-semibold)' }}>전체 캘린더 →</Link>
      </header>
      {upcoming.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-8)' }}>
          {upcoming.map((event) => (
            <a key={event.id} href={event.sourceUrl} target="_blank" rel="noreferrer" style={{ border: 'var(--border-width) solid var(--border)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-6)', color: 'var(--faint)', fontSize: 'var(--fs-source)' }}>
                <span>{event.market === 'US' ? '미국' : '한국'} · {event.kind === 'macro' ? '거시' : '실적'}</span>
                <span>{statusLabel[event.status]}</span>
              </div>
              <strong style={{ fontSize: 'var(--fs-blurb)', lineHeight: 'var(--lh-title)' }}>{event.title}</strong>
              <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-asof)' }}>{formatDate(event.scheduledAt)}</span>
            </a>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--faint)', fontSize: 'var(--fs-blurb)' }}>현재 표시할 예정 이벤트가 없습니다. 데이터 소스가 갱신되면 자동으로 반영됩니다.</p>
      )}
    </section>
  )
}
