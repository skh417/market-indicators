import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { SITE } from '@/constants/labels'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--layout-pad-top) var(--layout-pad-x) var(--layout-pad-bottom)',
      }}
    >
      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 'var(--stack-page)' }}>
        <div style={{ fontSize: 'var(--fs-asof)', fontWeight: 'var(--fw-medium)', color: 'var(--faint)' }}>
          {SITE.titleKo} · {SITE.titleEn}
        </div>
        <div
          style={{
            fontSize: 'var(--fs-hero-value)',
            fontWeight: 'var(--fw-extrabold)',
            letterSpacing: 'var(--ls-hero-value)',
            lineHeight: 'var(--lh-value)',
            fontVariantNumeric: 'var(--numeric-metric)',
          }}
        >
          404
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--fs-sub)', color: 'var(--muted)' }}>페이지를 찾을 수 없습니다.</div>
          <div style={{ fontSize: 'var(--fs-asof)', color: 'var(--faint)' }}>Page not found.</div>
        </div>
        <StatusBadge zone={{ ko: '데이터 없음', en: 'N/A', color: 'var(--accent)' }} />
        <div
          style={{
            borderTop: 'var(--border-width) solid var(--border)',
            paddingTop: 16,
            fontSize: 'var(--fs-asof)',
            color: 'var(--muted)',
          }}
        >
          <Link href="/">
            대시보드로 돌아가기 ·{' '}
            <span style={{ color: 'var(--faint)', fontSize: 'var(--fs-source)' }}>Back to dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
