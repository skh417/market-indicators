import { getAllIndicators } from '@/lib/indicators'
import { getMarketEvents } from '@/lib/calendar'
import { SITE } from '@/constants/labels'
import BuffettHero from '@/components/BuffettHero'
import IndicatorCard from '@/components/IndicatorCard'
import ReportSection from '@/components/ReportSection'
import UpcomingEvents from '@/components/UpcomingEvents'
import Link from 'next/link'
import styles from './page.module.css'

// ISR: 정적 프리렌더 후 1시간마다 백그라운드 재검증
export const revalidate = 3600

export default async function Home() {
  const [indicators, events] = await Promise.all([getAllIndicators(), getMarketEvents()])
  const buffett = indicators.find((i) => i.key === 'buffett')
  const rest = indicators.filter((i) => i.key !== 'buffett')

  return (
    <main className={styles.main}>
      <header className={styles.top}>
        <div className={styles.titleRow}>
          <h1 className={styles.h1}>
            {SITE.titleKo}
            <span className={styles.h1en}> · {SITE.titleEn}</span>
          </h1>
          <Link href="/calendar" className={styles.calendarLink}>이벤트 캘린더 →</Link>
        </div>
        <p className={styles.sub}>{SITE.descKo}</p>
      </header>

      {buffett && <BuffettHero indicator={buffett} />}

      <div className={styles.stack}>
        {rest.map((ind) => (
          <IndicatorCard key={ind.key} indicator={ind} />
        ))}
      </div>

      <UpcomingEvents events={events} />
      <ReportSection />

      <footer className={styles.foot}>
        데이터는 공개 소스(FRED · multpl · Cboe/Yahoo · CNN · KRX · 네이버)에서 수집되며 최대 1시간 캐시됩니다.
        투자 조언이 아닙니다. · Data from public sources, cached up to 1 hour. Not investment advice.
      </footer>
    </main>
  )
}
