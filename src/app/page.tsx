import { getAllIndicators } from '@/lib/indicators'
import { SITE } from '@/constants/labels'
import BuffettHero from '@/components/BuffettHero'
import IndicatorCard from '@/components/IndicatorCard'
import styles from './page.module.css'

// ISR: 정적 프리렌더 후 1시간마다 백그라운드 재검증
export const revalidate = 3600

export default async function Home() {
  const indicators = await getAllIndicators()
  const buffett = indicators.find((i) => i.key === 'buffett')
  const rest = indicators.filter((i) => i.key !== 'buffett')

  return (
    <main className={styles.main}>
      <header className={styles.top}>
        <h1 className={styles.h1}>
          {SITE.titleKo}
          <span className={styles.h1en}> · {SITE.titleEn}</span>
        </h1>
        <p className={styles.sub}>{SITE.descKo}</p>
      </header>

      {buffett && <BuffettHero indicator={buffett} />}

      <div className={styles.grid}>
        {rest.map((ind) => (
          <IndicatorCard key={ind.key} indicator={ind} />
        ))}
      </div>

      <footer className={styles.foot}>
        데이터는 공개 소스(FRED · multpl · Cboe/Yahoo · CNN)에서 수집되며 최대 1시간 캐시됩니다.
        투자 조언이 아닙니다. · Data from public sources, cached up to 1 hour. Not investment advice.
      </footer>
    </main>
  )
}
