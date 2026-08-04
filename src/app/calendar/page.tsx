import type { Metadata } from 'next'
import Link from 'next/link'
import CalendarEvents from '@/components/CalendarEvents'
import { getCalendarData } from '@/lib/calendar'
import styles from './page.module.css'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '시장 이벤트 캘린더',
  description: '미국·한국의 주요 거시 발표와 시장 영향 기업 실적 일정',
}

export default async function CalendarPage() {
  const { events, now } = await getCalendarData()
  return (
    <main className={styles.main}>
      <header className={styles.top}>
        <Link href="/" className={styles.back}>← 대시보드</Link>
        <h1 className={styles.h1}>시장 이벤트 캘린더 <span>· Market Calendar</span></h1>
        <p className={styles.sub}>미국·한국의 주요 거시 발표와 시장 영향 기업의 실적 일정을 모았습니다. 예정 실적은 변경될 수 있으므로 상태와 원문 출처를 함께 확인하세요.</p>
      </header>
      <section className={styles.card}>
        <CalendarEvents events={events} now={now} />
      </section>
      <p className={styles.note}>일정과 수치는 정보 제공 목적이며 투자 조언이 아닙니다. 무료 공개 데이터의 지연·변경 가능성이 있습니다.</p>
    </main>
  )
}
