import type { Metadata } from 'next'
import Link from 'next/link'
import CalendarEvents from '@/components/CalendarEvents'
import { getCalendarData } from '@/lib/calendar'
import styles from './page.module.css'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '이벤트 캘린더',
  description: '미국·한국의 주요 거시 발표와 시장 영향 기업 실적 일정',
  // openGraph/twitter는 부모에서 객체 단위로 상속되므로 여기서 재정의해야 캘린더 메타가 나간다
  openGraph: {
    title: '이벤트 캘린더 · Event calendar',
    description: '미국·한국의 주요 거시 발표와 시장 영향 기업 실적 일정',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이벤트 캘린더 · Event calendar',
    description: 'US & Korea macro and earnings schedule.',
  },
}

export default async function CalendarPage() {
  const { events, now } = await getCalendarData()
  return (
    <main className={styles.main}>
      <header className={styles.top}>
        <Link href="/" className={styles.back}>← 대시보드</Link>
        <h1 className={styles.h1}>이벤트 캘린더 <span>· Event calendar</span></h1>
        <p className={styles.sub}>주요 거시 지표와 실적 발표 일정입니다. <span>Key macro and earnings dates.</span></p>
      </header>
      <CalendarEvents events={events} now={now} />
      <p className={styles.note}>일정은 발표 기관 사정에 따라 변경될 수 있습니다. · Schedules may change without notice. — 투자 조언이 아닙니다. · Not investment advice.</p>
    </main>
  )
}
